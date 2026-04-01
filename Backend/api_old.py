from __future__ import annotations

import json
import re
import sys
import time
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF
import requests
import uvicorn
from fastapi import Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from langdetect import detect
from langdetect.lang_detect_exception import LangDetectException
from loguru import logger
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field, ValidationError
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address


def _configure_logger() -> None:
    """Configure Loguru to log to file and console."""
    logger.remove()
    log_format: str = "{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}"
    logger.add(
        sys.stdout,
        colorize=True,
        level="INFO",
        enqueue=True,
        backtrace=False,
        diagnose=False,
        format=log_format,
    )
    logger.add(
        "neurix.log",
        rotation="10 MB",
        retention="10 days",
        encoding="utf-8",
        enqueue=True,
        backtrace=False,
        diagnose=False,
        level="INFO",
        format=log_format,
    )


_configure_logger()


app = FastAPI(
    title="NEURIX API",
    description="Offline AI Disaster Response Engine for NDRF India",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev mode
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


SECRET_KEY: str = "neurix-offline-ai-ndrf-2024-secure-key"
ALGORITHM: str = "HS256"
TOKEN_EXPIRE_HOURS: int = 24

OLLAMA_URL: str = "http://localhost:11434/api/generate"
OLLAMA_HEALTH_URL: str = "http://localhost:11434/api/tags"
OLLAMA_MODEL: str = "phi3:mini"
OLLAMA_TIMEOUT: int = 90

MAX_INPUT_CHARS: int = 5000
MAX_PDF_CHARS: int = 4000
MAX_HISTORY_ITEMS: int = 100
MAX_USER_HISTORY: int = 20

APP_START_TIME: datetime = datetime.utcnow()


pwd_context: CryptContext = CryptContext(schemes=["bcrypt"], deprecated="auto")
security: HTTPBearer = HTTPBearer(auto_error=True)


def _utc_now_iso() -> str:
    """Return current UTC timestamp as ISO string."""
    return datetime.utcnow().isoformat()


def get_password_hash(password: str) -> str:
    """Hash password using bcrypt (passlib)."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify bcrypt password."""
    try:
        return bool(pwd_context.verify(plain, hashed))
    except Exception:
        return False


def create_token(data: Dict[str, Any]) -> str:
    """Create JWT token with 24hr expiry (HS256)."""
    issued_at: datetime = datetime.utcnow()
    exp: datetime = issued_at + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload: Dict[str, Any] = {
        "sub": str(data.get("sub", "")),
        "role": str(data.get("role", "")),
        "name": str(data.get("name", "")),
        "badge": str(data.get("badge", "")),
        "iat": int(issued_at.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Verify JWT token, raise 401 if invalid/expired."""
    token: str = credentials.credentials
    try:
        payload: Dict[str, Any] = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub: str = str(payload.get("sub", ""))
        if sub not in USERS:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed")
        return payload
    except JWTError as exc:
        logger.warning(f"JWT decode failed: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed")


USERS: Dict[str, Dict[str, Any]] = {
    "cmd123": {
        "username": "cmd123",
        "name": "Commander Singh",
        "password": [get_password_hash("cmd123")],
        "role": "commander",
        "badge": "IPS-NDRF-001",
        "created_at": "2024-01-01T00:00:00",
    },
    "lead123": {
        "username": "lead123",
        "name": "Team Lead Sharma",
        "password": [get_password_hash("lead123")],
        "role": "team_lead",
        "badge": "NDRF-TL-042",
        "created_at": "2024-01-01T00:00:00",
    },
    "vol123": {
        "username": "vol123",
        "name": "Volunteer Riya",
        "password": [get_password_hash("vol123")],
        "role": "volunteer",
        "badge": "VOL-2024-108",
        "created_at": "2024-01-01T00:00:00",
    },
}


HISTORY: List[Dict[str, Any]] = []
ACTIVE_SESSIONS: Dict[str, datetime] = {}


def add_to_history(record: Dict[str, Any]) -> None:
    """Add analysis to history, remove oldest if over limit."""
    global HISTORY
    HISTORY.append(record)

    # Global cap
    if len(HISTORY) > MAX_HISTORY_ITEMS:
        HISTORY = HISTORY[-MAX_HISTORY_ITEMS:]

    # Per-user cap
    username: str = str(record.get("user", ""))
    if not username:
        return
    user_items: List[Dict[str, Any]] = [r for r in HISTORY if str(r.get("user", "")) == username]
    if len(user_items) <= MAX_USER_HISTORY:
        return
    # Remove oldest user records using timestamp strings (ISO sortable)
    user_items_sorted: List[Dict[str, Any]] = sorted(user_items, key=lambda r: str(r.get("timestamp", "")))
    to_remove_ids: set[str] = {str(r.get("id")) for r in user_items_sorted[: (len(user_items_sorted) - MAX_USER_HISTORY)]}
    HISTORY = [r for r in HISTORY if str(r.get("id")) not in to_remove_ids]


def _sanitize_text(text: str, max_chars: int) -> str:
    """Sanitize and normalize user input."""
    cleaned: str = (text or "").strip()
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid input diya hai")
    if len(cleaned) > max_chars:
        cleaned = cleaned[:max_chars]
    return cleaned


def detect_language_simple(text: str) -> str:
    """Detect approximate language using langdetect (best-effort)."""
    try:
        lang: str = detect(text)
        if lang.startswith("hi"):
            return "hi"
        return "en"
    except LangDetectException:
        return "en"
    except Exception:
        return "en"


def normalize_to_english_like(text: str) -> str:
    """Convert common Hinglish/Hindi disaster terms to English keywords (offline)."""
    lowered: str = (text or "").lower()
    mapping: Dict[str, str] = {
        "paani": "water",
        "bachao": "rescue",
        "madad": "help",
        "aag": "fire",
        "badh": "flood",
        "baadh": "flood",
        "barish": "rain",
        "baarish": "rain",
        "bhukamp": "earthquake",
        "tremor": "earthquake",
        "toofan": "cyclone",
        "hurricane": "cyclone",
        "rasta": "road",
        "blocked": "blocked",
        "road block": "road blocked",
        "nh": "nh",
        "jakhmi": "injured",
        "ghayal": "injured",
        "lapata": "missing",
        "collapse": "collapse",
        "critical": "critical",
        "danger mark": "danger mark",
    }
    for k, v in mapping.items():
        lowered = re.sub(rf"\b{re.escape(k)}\b", v, lowered, flags=re.IGNORECASE)
    return lowered


def sanitize_risk_level(severity: str) -> str:
    """Normalize severity to one of LOW|MEDIUM|HIGH|CRITICAL."""
    s: str = str(severity).strip().upper()
    if s in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}:
        return s
    if "CRIT" in s or "MAJOR" in s:
        return "CRITICAL"
    if "HIGH" in s:
        return "HIGH"
    if "MED" in s:
        return "MEDIUM"
    return "LOW"


def clamp_int(value: Any, min_value: int, max_value: int) -> int:
    """Clamp value to int range safely."""
    try:
        v: int = int(value)
        return max(min_value, min(max_value, v))
    except Exception:
        return min_value


def truncate_words(text: str, max_words: int = 10) -> str:
    """Truncate a text to at most `max_words` words (best-effort)."""
    words: List[str] = str(text).strip().split()
    if len(words) <= max_words:
        return " ".join(words)
    return " ".join(words[:max_words])


def compute_confidence_from_components(data_completeness: int, rule_certainty: int, ai_confidence: int) -> int:
    """Compute confidence = (d*0.4) + (r*0.3) + (a*0.3)."""
    d: int = clamp_int(data_completeness, 0, 100)
    r: int = clamp_int(rule_certainty, 0, 100)
    a: int = clamp_int(ai_confidence, 0, 100)
    final: float = (d * 0.4) + (r * 0.3) + (a * 0.3)
    return int(round(final))


NEURIX_SYSTEM_PROMPT: str = (
    "You are NEURIX — an elite offline AI disaster response \n"
    "engine deployed by NDRF (National Disaster Response Force) India.\n\n"
    "Your job: Analyze disaster situation reports and generate \n"
    "structured emergency response plans.\n\n"
    "CRITICAL RULES:\n"
    "1. Return ONLY valid JSON — no markdown, no explanation\n"
    "2. Be specific — vague answers cost lives  \n"
    "3. Prioritize human safety above all\n"
    "4. Use Indian context — NDRF, SDRF, district administration\n"
    "5. Action cards must be immediately executable\n"
    "6. Timeline must be realistic for Indian field conditions\n\n"
    "OUTPUT FORMAT (strict JSON):\n"
    "{\n"
    '  "disaster_type": "specific type e.g. Flash Flood/Earthquake/Landslide",\n'
    '  "severity": "CRITICAL|HIGH|MEDIUM|LOW",\n'
    '  "affected_people": <integer>,\n'
    '  "injured": <integer>,\n'
    '  "missing": <integer>,\n'
    '  "location": "specific location name",\n'
    '  "coordinates": "lat,lng if mentioned else null",\n'
    '  "confidence": <integer 0-100>,\n'
    '  "summary": "2 sentence situation summary in simple English",\n'
    '  "immediate_action": "Single most urgent action in 10 words",\n'
    '  "action_cards": [\n'
    "    {\n"
    '      "priority": "CRITICAL|HIGH|MEDIUM|LOW",\n'
    '      "title": "Clear action title in 5-8 words",\n'
    '      "detail": "Specific steps, numbers, locations — 2-3 sentences",\n'
    '      "time": "0-1 hr|1-3 hr|3-6 hr|6-24 hr",\n'
    '      "color": "#FF3B3B|#FF6F00|#00D4FF|#30D158",\n'
    '      "confidence": <integer>,\n'
    '      "category": "evacuation|medical|logistics|communication|relief"\n'
    "    }\n"
    "  ],\n"
    '  "timeline": [\n'
    "    {\n"
    '      "time": "0-1 hr",\n'
    '      "label": "Phase name",\n'
    '      "active": true,\n'
    '      "tasks": ["task1", "task2", "task3"]\n'
    "    }\n"
    "  ],\n"
    '  "resources": [\n'
    "    {\n"
    '      "label": "Resource name",\n'
    '      "value": "<number>",\n'
    '      "unit": "personnel|units|tonnes|liters",\n'
    '      "urgency": "immediate|within_1hr|within_3hr"\n'
    "    }\n"
    "  ],\n"
    '  "risk_zones": ["Zone description with specific location"],\n'
    '  "replan_triggers": ["Condition that would change this plan"]\n'
    "}"
)


class LoginRequest(BaseModel):
    """Login request model for /auth/login."""

    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=100)


class LoginResponse(BaseModel):
    """Login response model for /auth/login."""

    token: str
    role: str
    name: str
    badge: str
    expires_in: str
    message: str


class ActionCard(BaseModel):
    """Action card item for emergency response plan."""

    priority: str
    title: str
    detail: str
    time: str
    color: str
    confidence: int = Field(ge=0, le=100)
    category: str


class TimelineItem(BaseModel):
    """Timeline phase item with tasks."""

    time: str
    label: str
    active: bool
    tasks: List[str]


class Resource(BaseModel):
    """Resource estimate item for operations execution."""

    label: str
    value: str
    unit: str
    urgency: str


class AnalysisResult(BaseModel):
    """Structured emergency response plan output."""

    disaster_type: str
    severity: str
    affected_people: int
    injured: int
    missing: int
    location: str
    coordinates: Optional[str]
    confidence: int
    ai_powered: bool
    summary: str
    immediate_action: str
    action_cards: List[ActionCard]
    timeline: List[TimelineItem]
    resources: List[Resource]
    risk_zones: List[str]
    replan_triggers: List[str]
    generated_at: str
    processing_time_ms: int


class AnalysisResponse(BaseModel):
    """Standard wrapper response for analysis endpoints."""

    success: bool
    data: AnalysisResult
    id: str
    analysis_type: str


class ReplanResponse(BaseModel):
    """Standard wrapper response for /replan endpoint."""

    success: bool
    data: AnalysisResult
    id: str
    changes: List[str]
    delta_summary: str


def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract text from PDF using PyMuPDF. Raises ValueError if no text."""
    doc: Optional[fitz.Document] = None
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        full_text_parts: List[str] = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            full_text_parts.append(page.get_text())
        full_text: str = " ".join(full_text_parts)
        cleaned: str = " ".join(full_text.split())
        if not cleaned.strip():
            raise ValueError("PDF mein readable text nahi mila")
        return cleaned[:MAX_PDF_CHARS]
    finally:
        try:
            if doc is not None:
                doc.close()
        except Exception:
            pass


def _extract_json_obj(raw_text: str) -> Optional[Dict[str, Any]]:
    """Extract JSON object from raw LLM text (handles code fences)."""
    patterns: List[str] = [
        r"```json\s*(\{.*?\})\s*```",
        r"```\s*(\{.*?\})\s*```",
        r"(\{.*\})",
    ]
    for pattern in patterns:
        match = re.search(pattern, raw_text, flags=re.DOTALL)
        if not match:
            continue
        candidate: str = match.group(1) if match.groups() else match.group(0)
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue

    start: int = raw_text.find("{")
    end: int = raw_text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(raw_text[start : end + 1])
        except json.JSONDecodeError:
            return None
    return None


def _priority_color(priority: str) -> str:
    """Map priority to hex color."""
    p = str(priority).strip().upper()
    return {
        "CRITICAL": "#FF3B3B",
        "HIGH": "#FF6F00",
        "MEDIUM": "#00D4FF",
        "LOW": "#30D158",
    }.get(p, "#00D4FF")


def _card_confidence(priority: str) -> int:
    """Best-effort card confidence based on priority level."""
    p: str = str(priority).strip().upper()
    if p == "CRITICAL":
        return 92
    if p == "HIGH":
        return 85
    if p == "MEDIUM":
        return 78
    return 70


def build_fallback_response(text: str) -> Dict[str, Any]:
    """Rule-based disaster analysis engine. Works offline without any AI model."""
    start = time.time()
    t: str = str(text or "")
    text_lower: str = t.lower()

    affected_people: int = 100
    people_patterns: List[str] = [
        r"(\d+)\s*(?:log|logon|people|persons|individuals|residents)",
        r"(\d+)\s*(?:affected|trapped|stranded|missing|injured)",
        r"population\s*(?:of)?\s*(\d+)",
    ]
    for pattern in people_patterns:
        match = re.search(pattern, text_lower)
        if match:
            affected_people = int(match.group(1))
            break

    injured: int = 0
    injured_match = re.search(r"(\d+)\s*(?:injured|hurt|wounded|casualties|ghayal|jakhmi)", text_lower)
    injured = int(injured_match.group(1)) if injured_match else max(5, affected_people // 8)

    missing: int = max(0, affected_people // 15)
    if re.search(r"missing|lapata|lapat[a-z]*", text_lower):
        missing = max(missing, affected_people // 20)

    disaster_map: Dict[str, List[str]] = {
        "Flash Flood": ["flash flood", "cloudburst", "inundation", "flood", "paani", "river", "water level"],
        "Earthquake": ["earthquake", "bhukamp", "tremor", "richter", "seismic"],
        "Landslide": ["landslide", "mudslide", "bhookhalan", "slope failure"],
        "Cyclone": ["cyclone", "toofan", "hurricane", "storm surge"],
        "Fire": ["fire", "aag", "blaze", "wildfire", "burning"],
    }
    disaster_type: str = "Natural Disaster"
    for dtype, keywords in disaster_map.items():
        if any(kw in text_lower for kw in keywords):
            disaster_type = dtype
            break

    road_blocked: bool = any(w in text_lower for w in ["road block", "highway block", "rasta band", "route cut", "nh-21", "blocked", "nh-"])

    score: int = 0
    if affected_people > 500:
        score += 3
    elif affected_people > 100:
        score += 2
    elif affected_people > 50:
        score += 1

    if injured > 50:
        score += 3
    elif injured > 20:
        score += 2
    elif injured > 5:
        score += 1

    critical_words: List[str] = ["critical", "mass casualty", "mass", "death", "fatality", "collapse", "dam break"]
    if any(w in text_lower for w in critical_words):
        score += 3

    if score >= 7:
        severity: str = "CRITICAL"
    elif score >= 5:
        severity = "HIGH"
    elif score >= 3:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    location: str = "Field Location"
    location_match = re.search(r"(?:in|at|near|location:|district|tehsil|village)\s+([A-Za-z][A-Za-z\s\-\']{3,60})", t)
    if location_match:
        location = location_match.group(1).strip()

    coordinates: Optional[str] = None
    coord_match = re.search(r"(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)", t)
    if coord_match:
        coordinates = f"{coord_match.group(1)},{coord_match.group(2)}"

    # Confidence engine
    data_completeness: int = 10
    data_completeness += 40 if affected_people > 0 else 0
    data_completeness += 20 if injured >= 0 else 0
    data_completeness += 20 if missing >= 0 else 0
    data_completeness += 10 if location != "Field Location" else 0
    data_completeness += 10 if disaster_type != "Natural Disaster" else 0

    rule_certainty: int = 10
    rule_certainty += 30 if affected_people > 100 else 0
    rule_certainty += 30 if injured > 20 else 0
    rule_certainty += 20 if road_blocked else 0
    rule_certainty += 20 if severity == "CRITICAL" else 0

    ai_confidence: int = 0
    confidence: int = compute_confidence_from_components(data_completeness, rule_certainty, ai_confidence)

    action_cards: List[Dict[str, Any]] = []

    def add_card(
        priority: str,
        title: str,
        detail: str,
        time_label: str,
        color: Optional[str],
        category: str,
    ) -> None:
        """Append a standardized action card to action_cards."""
        action_cards.append(
            {
                "priority": priority,
                "title": title,
                "detail": detail,
                "time": time_label,
                "color": color or _priority_color(priority),
                "confidence": _card_confidence(priority),
                "category": category,
            }
        )

    # Spec rules
    if affected_people > 100:
        add_card(
            "CRITICAL",
            f"{affected_people} logon ko turant evacuate karo",
            "Zone mapping banao aur Zone A se evacuation start karo. Elderly and critical medical cases ko priority rakhke movement plan follow karo.",
            "0-1 hr",
            "#FF3B3B",
            "evacuation",
        )

    if injured > 20:
        add_card(
            "HIGH",
            f"{injured} injured ke liye high medical priority",
            "Medical teams triage tent (red/yellow/green) set karein. Severe cases ko nearest referral/AIIMS channel via ambulance/helicopter coordinate karo.",
            "0-1 hr",
            "#FF6F00",
            "medical",
        )

    if road_blocked:
        add_card(
            "HIGH",
            "Logistics delay mitigate: alternate routes",
            "Main road blocked hai—alternate routes (nh/bridge alternatives/temporary access) identify karo. Convoys ko time-window me dispatch karo aur PWD/traffic control ko update do.",
            "1-3 hr",
            "#FF6F00",
            "logistics",
        )

    # Always add coordination + communication + relief (best-effort)
    add_card(
        "MEDIUM" if severity != "CRITICAL" else "CRITICAL",
        "NDRF-SDRF incident command activate karo",
        "District EOC aur State disaster authority ko SITREP cycle me update do. Incident command with asset tracking follow karo.",
        "0-1 hr" if severity == "CRITICAL" else "1-3 hr",
        None,
        "communication",
    )
    add_card(
        "MEDIUM",
        "Emergency communication hub operationalize",
        "Satellite phone + radio relay points set karo (3 relay points). Media briefing schedule aur helpline numbers district admin ke saath finalize karo.",
        "1-3 hr",
        None,
        "communication",
    )
    add_card(
        "MEDIUM" if severity != "CRITICAL" else "LOW",
        "Relief camp setup with registration counters",
        f"Nearest safe school/community hall choose karo. Capacity {affected_people + 50} log ke liye plan karo; food, water, blankets 72hr ke liye arrange karo.",
        "3-6 hr",
        None,
        "relief",
    )

    if severity == "CRITICAL" and len(action_cards) < 5:
        add_card(
            "HIGH",
            "Mass casualty coordination with HQ",
            "HQ ko IMMEDIATELY notify karo aur additional teams/resources request channel activate karo. Evacuation progress aur casualty register tracking ke liye SOP follow karo.",
            "0-1 hr",
            None,
            "communication",
        )

    if len(action_cards) < 3:
        add_card(
            "MEDIUM",
            "Rapid damage assessment & routing",
            "Local patrolling se safety map banao. Safe routes identify karo aur triage point location finalize karo.",
            "1-3 hr",
            None,
            "logistics",
        )

    # Timeline phases (4 items)
    timeline: List[Dict[str, Any]] = [
        {
            "time": "0-1 hr",
            "label": "Rescue & Immediate Triage",
            "active": True,
            "tasks": ["Search & rescue deploy", "Evacuation routes secure", "Medical triage start"],
        },
        {
            "time": "1-3 hr",
            "label": "Medical & Logistics Stabilization",
            "active": False,
            "tasks": ["Field hospital stabilize", "Supply routes confirm", "Communication hub operational"],
        },
        {
            "time": "3-6 hr",
            "label": "Relief Operations Expansion",
            "active": False,
            "tasks": ["Relief camp operational", "Food & water distribution", "Registration & reunification"],
        },
        {
            "time": "6-24 hr",
            "label": "Recovery & Situation Reporting",
            "active": False,
            "tasks": ["Infrastructure assessment", "Restoration begin", "SITREP to HQ"],
        },
    ]

    # Resources (4-6 items)
    resources: List[Dict[str, Any]] = [
        {"label": "Rescue Personnel", "value": str(max(8, affected_people // 15)), "unit": "personnel", "urgency": "immediate"},
        {"label": "Rescue Boats", "value": str(max(2, affected_people // 50)), "unit": "units", "urgency": "within_1hr"},
        {"label": "Medical Staff", "value": str(max(6, injured // 3)), "unit": "personnel", "urgency": "immediate"},
        {"label": "Vehicles", "value": str(max(4, affected_people // 30)), "unit": "units", "urgency": "within_1hr"},
        {"label": "Food Packets", "value": str(max(100, affected_people * 3)), "unit": "tonnes", "urgency": "within_3hr"},
        {"label": "Water (liters)", "value": str(max(1000, affected_people * 10)), "unit": "liters", "urgency": "within_1hr"},
    ]

    risk_zones: List[str] = [
        f"Zone A — {location} main hazard area (highest risk)",
        f"Zone B — proximity risk around {disaster_type.lower()} site",
        "Zone C — blocked road / supply chokepoints",
    ]
    if not road_blocked:
        risk_zones[2] = f"Zone C — safe access corridors near {location}"

    replan_triggers: List[str] = [
        "New casualties or missing reports",
        "Road access loss / route blockage changes",
        "Weather conditions worsening",
        "Additional villages affected",
        "Infrastructure collapse or dam breach",
    ]

    elapsed_ms: int = int((time.time() - start) * 1000)
    summary: str = (
        f"{disaster_type} disaster situation reported at {location}. "
        f"Approx {affected_people} people affected, {injured} injured, and {missing} missing need rapid response."
    )
    immediate_action: str = truncate_words(f"Evacuate {affected_people} affected people from {location} immediately", max_words=10)

    return {
        "disaster_type": disaster_type,
        "severity": severity,
        "affected_people": int(affected_people),
        "injured": int(injured),
        "missing": int(missing),
        "location": location,
        "coordinates": coordinates,
        "confidence": int(confidence),
        "ai_powered": False,
        "summary": summary,
        "immediate_action": immediate_action,
        "action_cards": action_cards[: max(12, len(action_cards))],
        "timeline": timeline,
        "resources": resources,
        "risk_zones": risk_zones,
        "replan_triggers": replan_triggers,
        "generated_at": _utc_now_iso(),
        "processing_time_ms": elapsed_ms,
    }


def call_ollama(prompt: str, retry: int = 2) -> Tuple[Dict[str, Any], bool]:
    """Call Ollama API with retry logic + strict JSON extraction + fallback.

    Returns (result_dict, is_ai_powered).
    """
    last_error: Optional[str] = None
    for attempt in range(retry + 1):
        try:
            start = time.time()
            response = requests.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": f"{NEURIX_SYSTEM_PROMPT}\n\nDISASTER REPORT:\n{prompt}",
                    "stream": False,
                    "options": {"temperature": 0.1, "num_predict": 2000, "top_p": 0.9},
                },
                timeout=OLLAMA_TIMEOUT,
            )
            response.raise_for_status()
            elapsed_ms: int = int((time.time() - start) * 1000)

            raw_text: str = str(response.json().get("response", ""))

            parsed: Optional[Dict[str, Any]] = _extract_json_obj(raw_text)
            if parsed is None:
                cleaned: str = raw_text
                cleaned = re.sub(r"```(?:json)?", "", cleaned, flags=re.IGNORECASE)
                cleaned = cleaned.replace("```", "")
                parsed = _extract_json_obj(cleaned)

            if parsed is None:
                raise ValueError("AI response samajh nahi aaya")

            parsed["processing_time_ms"] = elapsed_ms
            parsed["generated_at"] = _utc_now_iso()
            parsed["ai_powered"] = True
            return parsed, True
        except requests.exceptions.Timeout as exc:
            last_error = str(exc)
            logger.warning(f"Ollama timeout attempt {attempt + 1}/{retry + 1}")
        except requests.exceptions.ConnectionError as exc:
            last_error = str(exc)
            logger.warning("Ollama not running — using fallback")
            break
        except (json.JSONDecodeError, ValueError) as exc:
            last_error = str(exc)
            logger.warning(f"Ollama parse failed attempt {attempt + 1}: {str(exc)}")
        except requests.exceptions.RequestException as exc:
            last_error = str(exc)
            logger.warning(f"Ollama request error attempt {attempt + 1}: {str(exc)}")
        except Exception as exc:
            last_error = str(exc)
            logger.error(f"Ollama unexpected error attempt {attempt + 1}: {str(exc)}")

    if last_error:
        logger.info(f"Using rule-based fallback engine. Last error: {last_error}")
    else:
        logger.info("Using rule-based fallback engine")
    return build_fallback_response(prompt), False


def build_history_record(
    analysis_id: str,
    analysis_type: str,
    result: Dict[str, Any],
    username: str,
    filename: Optional[str] = None,
) -> Dict[str, Any]:
    """Build standardized history record."""
    return {
        "id": analysis_id,
        "type": analysis_type,
        "filename": filename,
        "timestamp": _utc_now_iso(),
        "user": username,
        "disaster_type": result.get("disaster_type"),
        "severity": result.get("severity"),
        "location": result.get("location"),
        "affected_people": result.get("affected_people"),
        "confidence": result.get("confidence"),
        "ai_powered": result.get("ai_powered", False),
        "result": result,
    }


def _build_analysis_response(analysis_id: str, analysis_type: str, result: AnalysisResult) -> AnalysisResponse:
    """Build AnalysisResponse wrapper."""
    return AnalysisResponse(success=True, data=result, id=analysis_id, analysis_type=analysis_type)


def _build_history_response(username: str) -> Dict[str, Any]:
    """Build /history response wrapper."""
    user_items: List[Dict[str, Any]] = [r for r in HISTORY if str(r.get("user", "")) == username]
    user_items_sorted: List[Dict[str, Any]] = sorted(user_items, key=lambda r: str(r.get("timestamp", "")), reverse=True)
    recent: List[Dict[str, Any]] = user_items_sorted[:20]
    return {"success": True, "user": username, "total": len(user_items), "data": recent}


@app.middleware("http")
async def log_requests_and_responses(request: Request, call_next: Any) -> JSONResponse:
    """Log every HTTP request and response via Loguru."""
    start = time.time()
    try:
        response = await call_next(request)
        elapsed_ms: int = int((time.time() - start) * 1000)

        auth_header: str = request.headers.get("authorization", "")
        user_hint: str = "anonymous"
        if auth_header.lower().startswith("bearer "):
            user_hint = "bearer_present"

        body_preview: str = ""
        try:
            body = getattr(response, "body", b"")  # type: ignore[attr-defined]
            if isinstance(body, (bytes, bytearray)) and body:
                body_preview = body[:2000].decode("utf-8", errors="replace")
        except Exception:
            body_preview = ""

        logger.info(
            f"{request.method} {request.url.path} | user={user_hint} | status={response.status_code} | {elapsed_ms}ms | response={body_preview}"
        )
        return response  # type: ignore[return-value]
    except Exception as exc:
        elapsed_ms = int((time.time() - start) * 1000)
        logger.error(f"Request failed: {request.method} {request.url.path} | {elapsed_ms}ms | err={str(exc)}")
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"success": False, "detail": "Internal error ho gaya"})


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(_: Request, __: RateLimitExceeded) -> JSONResponse:
    """Handle slowapi rate limit errors consistently."""
    return JSONResponse(status_code=status.HTTP_429_TOO_MANY_REQUESTS, content={"detail": "Request limit exceeded. 1 minute baad try karo."})


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    """Handle HTTPException with consistent JSON response."""
    logger.warning(f"HTTP error {exc.status_code}: {exc.detail}")
    return JSONResponse(status_code=exc.status_code, content={"success": False, "detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions without leaking internal details."""
    logger.exception(f"Unhandled exception: {str(exc)}")
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"success": False, "detail": "Server internal error. Contact support."})


def _health_check_ollama() -> Tuple[str, Optional[str]]:
    """Check Ollama health; return ('running'|'not reachable', model)."""
    try:
        resp = requests.get(OLLAMA_HEALTH_URL, timeout=3)
        if resp.status_code != 200:
            return "not reachable", None
        payload: Any = resp.json()
        models: List[str] = []
        if isinstance(payload, dict):
            raw_models = payload.get("models", [])
            if isinstance(raw_models, list):
                for m in raw_models:
                    if isinstance(m, dict) and isinstance(m.get("name"), str):
                        models.append(str(m.get("name")))
        if OLLAMA_MODEL in models:
            return "running", OLLAMA_MODEL
        return "running", OLLAMA_MODEL
    except Exception:
        return "not reachable", None


@app.on_event("startup")
async def startup_event() -> None:
    """Log system readiness and Ollama connectivity."""
    global APP_START_TIME
    APP_START_TIME = datetime.utcnow()
    logger.info("NEURIX API v2.0 starting...")
    logger.info("Checking Ollama connection...")
    ollama_state, _ = _health_check_ollama()
    if ollama_state == "running":
        logger.info("Ollama online — AI mode active")
    else:
        logger.info("Ollama offline — Fallback engine active")
    logger.info("NEURIX ready to serve NDRF field teams")


@app.get("/")
@limiter.limit("10/minute")
def root_info() -> Dict[str, Any]:
    """Root endpoint — API info (no auth)."""
    try:
        endpoints: List[str] = [
            "/auth/login",
            "/auth/me",
            "/analyze/text",
            "/analyze/pdf",
            "/analyze/voice",
            "/analyze/manual",
            "/replan",
            "/history",
            "/history/{item_id}",
            "/health",
        ]
        return {
            "success": True,
            "data": {
                "name": "NEURIX",
                "version": "2.0.0",
                "tagline": "Offline AI Disaster Decision Engine",
                "endpoints": endpoints,
                "status": "operational",
            },
        }
    except Exception as exc:
        logger.error(f"Root endpoint error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Server internal error. Contact support.")


@app.get("/health")
@limiter.limit("10/minute")
def health_check() -> Dict[str, Any]:
    """System health check — Ollama availability + uptime."""
    ollama_state, ollama_model = _health_check_ollama()
    uptime_seconds: int = int((datetime.utcnow() - APP_START_TIME).total_seconds())
    return {
        "success": True,
        "status": "ok",
        "ollama_status": "running" if ollama_state == "running" else "not reachable",
        "version": "2.0",
        "ollama": "online" if ollama_state == "running" else "offline",
        "ollama_model": ollama_model,
        "fallback_engine": "active",
        "total_analyses": len(HISTORY),
        "timestamp": _utc_now_iso(),
        "uptime": f"{uptime_seconds}s",
    }


@app.post("/auth/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def login(req: LoginRequest) -> LoginResponse:
    """Login endpoint — returns JWT token."""
    try:
        user: Optional[Dict[str, Any]] = USERS.get(req.username)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Username ya password galat hai")

        stored_hashes: List[str] = user.get("password", [])
        ok: bool = any(verify_password(req.password, h) for h in stored_hashes)
        if not ok:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Username ya password galat hai")

        token: str = create_token(
            {
                "sub": user["username"],
                "role": user["role"],
                "name": user["name"],
                "badge": user["badge"],
            }
        )
        expires_in: str = f"{TOKEN_EXPIRE_HOURS}h"
        logger.info(f"Login success | user={req.username} role={user['role']}")
        return LoginResponse(
            token=token,
            role=user["role"],
            name=user["name"],
            badge=user["badge"],
            expires_in=expires_in,
            message="Login successful",
        )
    except HTTPException:
        logger.warning("Login failed")
        raise
    except Exception as exc:
        logger.error(f"Login error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication error ho gaya")


@app.get("/auth/me")
@limiter.limit("10/minute")
def get_me(user_payload: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
    """Get current user info from token."""
    try:
        username: str = str(user_payload.get("sub", ""))
        user: Optional[Dict[str, Any]] = USERS.get(username)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication fail hua")

        return {
            "success": True,
            "data": {
                "username": username,
                "name": user["name"],
                "role": user["role"],
                "badge": user["badge"],
                "created_at": user["created_at"],
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/auth/me error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication me error ho gaya")


@app.post("/analyze/text", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def analyze_text(
    text: str = Form(...),
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> AnalysisResponse:
    """Analyze text disaster report."""
    try:
        username: str = str(user_payload.get("sub", ""))
        safe_text: str = _sanitize_text(text, MAX_INPUT_CHARS)
        lang: str = detect_language_simple(safe_text)
        normalized: str = normalize_to_english_like(safe_text) if lang == "hi" else safe_text

        analysis_id: str = str(uuid.uuid4())[:8]
        started = time.time()

        raw_result, ai_powered = call_ollama(normalized)
        elapsed_ms: int = int((time.time() - started) * 1000)

        try:
            if ai_powered:
                raw_result["ai_powered"] = True
                raw_result["processing_time_ms"] = int(raw_result.get("processing_time_ms", elapsed_ms))
            else:
                raw_result["ai_powered"] = False
                raw_result["processing_time_ms"] = int(raw_result.get("processing_time_ms", elapsed_ms))

            raw_result["generated_at"] = str(raw_result.get("generated_at") or _utc_now_iso())
            analysis_result: AnalysisResult = AnalysisResult.model_validate(raw_result)
        except ValidationError as exc:
            logger.warning(f"AnalysisResult validation failed; fallback used: {str(exc)}")
            analysis_result = AnalysisResult.model_validate(build_fallback_response(normalized))

        record: Dict[str, Any] = build_history_record(
            analysis_id=analysis_id,
            analysis_type="text",
            result=analysis_result.model_dump(),
            username=username,
        )
        record["input"] = safe_text
        add_to_history(record)

        logger.info(
            f"Text analysis complete | user={username} severity={analysis_result.severity} confidence={analysis_result.confidence}"
        )
        return _build_analysis_response(analysis_id, "text", analysis_result)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/analyze/text error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI response samajh nahi aaya, fallback use kiya")


@app.post("/analyze/pdf", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def analyze_pdf(
    file: UploadFile = File(...),
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> AnalysisResponse:
    """Analyze PDF disaster report."""
    try:
        username: str = str(user_payload.get("sub", ""))
        content_type: str = str(file.content_type or "")
        filename: str = str(file.filename or "")

        if "pdf" not in filename.lower() and "application/pdf" not in content_type.lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PDF file diya hai nahi")

        content: bytes = await file.read()
        if not content:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PDF empty hai")
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PDF size limit se zyada hai")

        extracted_text: str = extract_pdf_text(content)

        analysis_id: str = str(uuid.uuid4())[:8]
        started = time.time()
        raw_result, ai_powered = call_ollama(extracted_text)
        elapsed_ms: int = int((time.time() - started) * 1000)

        try:
            raw_result["ai_powered"] = ai_powered
            raw_result["processing_time_ms"] = int(raw_result.get("processing_time_ms", elapsed_ms))
            raw_result["generated_at"] = str(raw_result.get("generated_at") or _utc_now_iso())
            analysis_result: AnalysisResult = AnalysisResult.model_validate(raw_result)
        except ValidationError as exc:
            logger.warning(f"AI/normalized PDF output invalid; fallback used: {str(exc)}")
            analysis_result = AnalysisResult.model_validate(build_fallback_response(extracted_text))

        record = build_history_record(
            analysis_id=analysis_id,
            analysis_type="pdf",
            result=analysis_result.model_dump(),
            username=username,
            filename=filename,
        )
        record["input"] = filename
        add_to_history(record)
        logger.info(f"PDF analysis complete | user={username} file={filename} severity={analysis_result.severity}")
        return _build_analysis_response(analysis_id, "pdf", analysis_result)
    except HTTPException:
        raise
    except ValueError as exc:
        logger.warning(f"PDF extraction failed: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.error(f"/analyze/pdf error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="PDF analysis internal error ho gaya")


@app.post("/analyze/voice", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def analyze_voice(
    text: str = Form(...),
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> AnalysisResponse:
    """Analyze voice transcription."""
    try:
        username: str = str(user_payload.get("sub", ""))
        safe_text: str = _sanitize_text(text, MAX_INPUT_CHARS)
        lang: str = detect_language_simple(safe_text)
        normalized: str = normalize_to_english_like(safe_text) if lang == "hi" else safe_text

        analysis_id: str = str(uuid.uuid4())[:8]
        started = time.time()
        prompt: str = f"Voice input from field officer: {normalized}"

        raw_result, ai_powered = call_ollama(prompt)
        elapsed_ms: int = int((time.time() - started) * 1000)

        try:
            raw_result["ai_powered"] = ai_powered
            raw_result["processing_time_ms"] = int(raw_result.get("processing_time_ms", elapsed_ms))
            raw_result["generated_at"] = str(raw_result.get("generated_at") or _utc_now_iso())
            analysis_result = AnalysisResult.model_validate(raw_result)
        except ValidationError as exc:
            logger.warning(f"AI voice output invalid; fallback used: {str(exc)}")
            analysis_result = AnalysisResult.model_validate(build_fallback_response(prompt))

        record = build_history_record(
            analysis_id=analysis_id,
            analysis_type="voice",
            result=analysis_result.model_dump(),
            username=username,
        )
        record["input"] = safe_text
        add_to_history(record)
        logger.info(f"Voice analysis complete | user={username} severity={analysis_result.severity}")
        return _build_analysis_response(analysis_id, "voice", analysis_result)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/analyze/voice error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Voice analysis internal error ho gaya")


@app.post("/analyze/manual", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def analyze_manual(
    disaster_type: str = Form(...),
    location: str = Form(...),
    people: str = Form(...),
    severity: str = Form(...),
    details: str = Form(""),
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> AnalysisResponse:
    """Analyze manual form input."""
    try:
        username: str = str(user_payload.get("sub", ""))
        safe_disaster_type: str = _sanitize_text(disaster_type, MAX_INPUT_CHARS)
        safe_location: str = _sanitize_text(location, MAX_INPUT_CHARS)
        safe_details: str = _sanitize_text(details, MAX_INPUT_CHARS) if str(details).strip() else ""
        safe_severity: str = sanitize_risk_level(severity)

        people_clean: str = str(people).strip()
        if not people_clean.isdigit():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="People number galat diya hai")
        people_int: int = int(people_clean)

        analysis_id: str = str(uuid.uuid4())[:8]
        started = time.time()
        prompt: str = (
            "NDRF Field Report:\n"
            f"Disaster Type: {safe_disaster_type}\n"
            f"Location: {safe_location}\n"
            f"Estimated Affected: {people_int} people\n"
            f"Reported Severity: {safe_severity}\n"
            f"Field Officer Notes: {safe_details}\n"
            "Generate complete emergency response plan."
        )

        raw_result, ai_powered = call_ollama(prompt)
        elapsed_ms: int = int((time.time() - started) * 1000)

        try:
            raw_result["ai_powered"] = ai_powered
            raw_result["processing_time_ms"] = int(raw_result.get("processing_time_ms", elapsed_ms))
            raw_result["generated_at"] = str(raw_result.get("generated_at") or _utc_now_iso())
            analysis_result = AnalysisResult.model_validate(raw_result)
        except ValidationError as exc:
            logger.warning(f"AI manual output invalid; fallback used: {str(exc)}")
            analysis_result = AnalysisResult.model_validate(build_fallback_response(prompt))

        record = build_history_record(
            analysis_id=analysis_id,
            analysis_type="manual",
            result=analysis_result.model_dump(),
            username=username,
        )
        record["input"] = {"disaster_type": safe_disaster_type, "location": safe_location, "people": people_int, "severity": safe_severity}
        add_to_history(record)
        logger.info(f"Manual analysis complete | user={username} severity={analysis_result.severity}")
        return _build_analysis_response(analysis_id, "manual", analysis_result)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/analyze/manual error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Manual analysis internal error ho gaya")


@app.post("/replan", response_model=ReplanResponse)
@limiter.limit("10/minute")
async def replan(
    original_id: str = Form(...),
    update_text: str = Form(...),
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> ReplanResponse:
    """Dynamic replanning — update existing plan."""
    try:
        username: str = str(user_payload.get("sub", ""))
        safe_update: str = _sanitize_text(update_text, MAX_INPUT_CHARS)
        safe_original_id: str = str(original_id).strip()

        original: Optional[Dict[str, Any]] = None
        for r in reversed(HISTORY):
            if str(r.get("id")) == safe_original_id and str(r.get("user", "")) == username:
                original = r
                break
        if original is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Previous analysis nahi mila")

        original_result: Dict[str, Any] = original.get("result", {})
        original_summary: str = str(original_result.get("summary", "N/A"))
        original_severity: str = sanitize_risk_level(str(original_result.get("severity", "MEDIUM")))
        original_location: str = str(original_result.get("location", "Field Location"))

        update_prompt: str = (
            "SITUATION UPDATE for existing disaster response:\n\n"
            f"Original Situation: {original_summary}\n"
            f"Original Severity: {original_severity}\n"
            f"Location: {original_location}\n\n"
            f"NEW UPDATE FROM FIELD:\n{safe_update}\n\n"
            "Generate UPDATED emergency response plan.\n"
            "Mark which actions are NEW vs UNCHANGED.\n"
            "Reassess severity based on new information."
        )

        analysis_id: str = str(uuid.uuid4())[:8]
        started = time.time()
        raw_result, ai_powered = call_ollama(update_prompt)
        elapsed_ms: int = int((time.time() - started) * 1000)

        try:
            raw_result["ai_powered"] = ai_powered
            raw_result["processing_time_ms"] = int(raw_result.get("processing_time_ms", elapsed_ms))
            raw_result["generated_at"] = str(raw_result.get("generated_at") or _utc_now_iso())
            analysis_result = AnalysisResult.model_validate(raw_result)
        except ValidationError as exc:
            logger.warning(f"AI replan output invalid; fallback used: {str(exc)}")
            analysis_result = AnalysisResult.model_validate(build_fallback_response(update_prompt))

        old_cards: List[Dict[str, Any]] = []
        new_cards: List[Dict[str, Any]] = []
        try:
            old_cards_raw = original_result.get("action_cards", [])
            if isinstance(old_cards_raw, list):
                old_cards = [c for c in old_cards_raw if isinstance(c, dict)]
            new_cards_raw = analysis_result.model_dump().get("action_cards", [])
            if isinstance(new_cards_raw, list):
                new_cards = [c for c in new_cards_raw if isinstance(c, dict)]
        except Exception:
            old_cards = []
            new_cards = []

        old_by_title: Dict[str, Dict[str, Any]] = {str(c.get("title", "")).strip(): c for c in old_cards if str(c.get("title", "")).strip()}
        new_by_title: Dict[str, Dict[str, Any]] = {str(c.get("title", "")).strip(): c for c in new_cards if str(c.get("title", "")).strip()}

        changes: List[str] = []
        new_count: int = 0
        for title, card in new_by_title.items():
            if title not in old_by_title:
                changes.append(f"New: {title}")
                new_count += 1
            else:
                if card != old_by_title[title]:
                    changes.append(f"Updated: {title}")
        for title in old_by_title.keys():
            if title not in new_by_title:
                changes.append(f"Removed: {title}")
        if not changes:
            changes = ["No action card changes detected"]

        delta_summary: str = f"{new_count} new actions added, severity changed from {original_severity} to {analysis_result.severity}"

        record = build_history_record(
            analysis_id=analysis_id,
            analysis_type="replan",
            result=analysis_result.model_dump(),
            username=username,
        )
        record["input"] = {"original_id": safe_original_id, "update_text": safe_update}
        add_to_history(record)

        logger.info(f"Replan complete | user={username} changes={len(changes)}")
        return ReplanResponse(success=True, data=analysis_result, id=analysis_id, changes=changes, delta_summary=delta_summary)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/replan error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Replan internal error ho gaya")


@app.get("/history")
@limiter.limit("10/minute")
async def get_history(user_payload: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
    """Get analysis history for current user."""
    try:
        username: str = str(user_payload.get("sub", ""))
        return _build_history_response(username)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/history error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="History error ho gaya")


@app.get("/history/{item_id}")
@limiter.limit("10/minute")
async def get_history_item(item_id: str, user_payload: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
    """Get single history item."""
    try:
        username: str = str(user_payload.get("sub", ""))
        safe_item_id: str = str(item_id).strip()
        for r in reversed(HISTORY):
            if str(r.get("id")) == safe_item_id and str(r.get("user", "")) == username:
                return {"success": True, "data": r}
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record nahi mila")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/history/{item_id} error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="History item error ho gaya")


@app.delete("/history/{item_id}")
@limiter.limit("10/minute")
async def delete_history_item(item_id: str, user_payload: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
    """Delete history item."""
    try:
        username: str = str(user_payload.get("sub", ""))
        safe_item_id: str = str(item_id).strip()
        global HISTORY
        before: int = len(HISTORY)
        HISTORY = [r for r in HISTORY if not (str(r.get("id")) == safe_item_id and str(r.get("user", "")) == username)]
        after: int = len(HISTORY)
        if after == before:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record nahi mila")
        return {"success": True, "message": "Record deleted"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/history/{item_id} delete error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Delete error ho gaya")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True, log_level="info")

# from __future__ import annotations (duplicate copy appended accidentally)

import json
import os
import re
import sys
import time
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF
import requests
import uvicorn
from fastapi import Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi import FastAPI
from loguru import logger
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field, ValidationError
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from langdetect import detect
from langdetect.lang_detect_exception import LangDetectException


app = FastAPI(
    title="NEURIX API",
    description="Offline AI Disaster Response Engine for NDRF India",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev mode
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _configure_logger() -> None:
    """Configure Loguru to log to file and console."""
    logger.remove()
    log_format: str = "{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}"
    logger.add(
        sys.stdout,
        colorize=True,
        level="INFO",
        enqueue=True,
        backtrace=False,
        diagnose=False,
        format=log_format,
    )
    logger.add(
        "neurix.log",
        rotation="10 MB",
        retention="10 days",
        encoding="utf-8",
        enqueue=True,
        backtrace=False,
        diagnose=False,
        format=log_format,
        level="INFO",
    )


_configure_logger()


SECRET_KEY: str = "neurix-offline-ai-ndrf-2024-secure-key"
ALGORITHM: str = "HS256"
TOKEN_EXPIRE_HOURS: int = 24

OLLAMA_URL: str = "http://localhost:11434/api/generate"
OLLAMA_HEALTH_URL: str = "http://localhost:11434/api/tags"
OLLAMA_MODEL: str = "phi3:mini"
OLLAMA_TIMEOUT: int = 90

MAX_INPUT_CHARS: int = 5000
MAX_PDF_CHARS: int = 4000
MAX_HISTORY_ITEMS: int = 100
MAX_USER_HISTORY: int = 20

APP_START_TIME: datetime = datetime.utcnow()


def _utc_now_iso() -> str:
    """Return current UTC timestamp as ISO string."""
    return datetime.utcnow().isoformat()


pwd_context: CryptContext = CryptContext(schemes=["bcrypt"], deprecated="auto")
security: HTTPBearer = HTTPBearer(auto_error=True)


def get_password_hash(password: str) -> str:
    """Hash password using bcrypt (passlib)."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify bcrypt password."""
    try:
        return bool(pwd_context.verify(plain, hashed))
    except Exception:
        return False


def create_token(data: Dict[str, Any]) -> str:
    """Create JWT token with 24hr expiry (HS256).

    Includes: sub, role, name, badge, exp, iat
    """
    issued_at: datetime = datetime.utcnow()
    exp: datetime = issued_at + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload: Dict[str, Any] = {
        "sub": str(data.get("sub", "")),
        "role": str(data.get("role", "")),
        "name": str(data.get("name", "")),
        "badge": str(data.get("badge", "")),
        "iat": int(issued_at.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    """Verify JWT token, raise 401 if invalid/expired."""
    token: str = credentials.credentials
    try:
        payload: Dict[str, Any] = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub: str = str(payload.get("sub", ""))
        if sub not in USERS:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed")
        return payload
    except JWTError as exc:
        logger.warning(f"JWT decode failed: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed")


USERS: Dict[str, Dict[str, Any]] = {
    "cmd123": {
        "username": "cmd123",
        "name": "Commander Singh",
        "password": [get_password_hash("cmd123")],
        "role": "commander",
        "badge": "IPS-NDRF-001",
        "created_at": "2024-01-01T00:00:00",
    },
    "lead123": {
        "username": "lead123",
        "name": "Team Lead Sharma",
        "password": [get_password_hash("lead123")],
        "role": "team_lead",
        "badge": "NDRF-TL-042",
        "created_at": "2024-01-01T00:00:00",
    },
    "vol123": {
        "username": "vol123",
        "name": "Volunteer Riya",
        "password": [get_password_hash("vol123")],
        "role": "volunteer",
        "badge": "VOL-2024-108",
        "created_at": "2024-01-01T00:00:00",
    },
}


HISTORY: List[Dict[str, Any]] = []
ACTIVE_SESSIONS: Dict[str, datetime] = {}


def add_to_history(record: Dict[str, Any]) -> None:
    """Add analysis to history, remove oldest if over limit."""
    global HISTORY
    HISTORY.append(record)

    if len(HISTORY) > MAX_HISTORY_ITEMS:
        HISTORY = HISTORY[-MAX_HISTORY_ITEMS:]

    user: str = str(record.get("user", ""))
    if not user:
        return

    user_items: List[Dict[str, Any]] = [r for r in HISTORY if str(r.get("user", "")) == user]
    if len(user_items) <= MAX_USER_HISTORY:
        return

    user_items_sorted: List[Dict[str, Any]] = sorted(
        user_items, key=lambda r: str(r.get("timestamp", ""))  # ISO strings sort lexicographically
    )
    to_remove_ids: set[str] = {str(r.get("id")) for r in user_items_sorted[: (len(user_items_sorted) - MAX_USER_HISTORY)]}
    HISTORY = [r for r in HISTORY if str(r.get("id")) not in to_remove_ids]


def _sanitize_text(text: str, max_chars: int) -> str:
    """Sanitize and normalize user input (basic control-char + whitespace + length)."""
    cleaned: str = (text or "").strip()
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid input diya hai")
    if len(cleaned) > max_chars:
        cleaned = cleaned[:max_chars]
    return cleaned


def detect_language_simple(text: str) -> str:
    """Detect language using langdetect; returns 'en' or 'hi' (best-effort)."""
    try:
        lang: str = detect(text)
        if lang.startswith("en"):
            return "en"
        if lang.startswith("hi") or lang.startswith("mr") or lang.startswith("ne") or lang.startswith("bn"):
            return "hi"
        return "en"
    except LangDetectException:
        return "en"
    except Exception:
        return "en"


def normalize_to_english_like(text: str) -> str:
    """Convert common Hinglish/Hindi disaster terms to English keywords (offline best-effort)."""
    lowered: str = (text or "").lower()
    mapping: Dict[str, str] = {
        "paani": "water",
        "paani level": "water level",
        "bachao": "rescue",
        "madad": "help",
        "aag": "fire",
        "badh": "flood",
        "baadh": "flood",
        "barish": "rain",
        "baarish": "rain",
        "bhukamp": "earthquake",
        "bhukamp": "earthquake",
        "tremor": "earthquake",
        "toofan": "cyclone",
        "hurricane": "cyclone",
        "rasta": "road",
        "blocked": "blocked",
        "road block": "road blocked",
        "nh": "nh",
        "jakhmi": "injured",
        "ghayal": "injured",
        "lapata": "missing",
        "lapata log": "missing people",
        "collapse": "collapse",
        "critical": "critical",
        "danger mark": "danger mark",
    }
    for k, v in mapping.items():
        lowered = re.sub(rf"\b{re.escape(k)}\b", v, lowered, flags=re.IGNORECASE)
    return lowered


def sanitize_risk_level(severity: str) -> str:
    """Normalize severity to one of LOW|MEDIUM|HIGH|CRITICAL."""
    s: str = str(severity).strip().upper()
    if s in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}:
        return s
    if "CRIT" in s:
        return "CRITICAL"
    if "HIGH" in s:
        return "HIGH"
    if "MED" in s:
        return "MEDIUM"
    return "LOW"


def clamp_int(value: Any, min_value: int, max_value: int) -> int:
    """Clamp value to int range safely."""
    try:
        v: int = int(value)
        return max(min_value, min(max_value, v))
    except Exception:
        return min_value


def truncate_words(text: str, max_words: int = 10) -> str:
    """Truncate a text to at most `max_words` words (best-effort)."""
    words: List[str] = str(text).strip().split()
    if len(words) <= max_words:
        return " ".join(words)
    return " ".join(words[:max_words])


def compute_confidence_from_components(data_completeness: int, rule_certainty: int, ai_confidence: int) -> int:
    """Compute confidence score per spec using weighted components."""
    d: int = clamp_int(data_completeness, 0, 100)
    r: int = clamp_int(rule_certainty, 0, 100)
    a: int = clamp_int(ai_confidence, 0, 100)
    final: float = (d * 0.4) + (r * 0.3) + (a * 0.3)
    return int(round(final))


NEURIX_SYSTEM_PROMPT: str = (
    "You are NEURIX — an elite offline AI disaster response \n"
    "engine deployed by NDRF (National Disaster Response Force) India.\n\n"
    "Your job: Analyze disaster situation reports and generate \n"
    "structured emergency response plans.\n\n"
    "CRITICAL RULES:\n"
    "1. Return ONLY valid JSON — no markdown, no explanation\n"
    "2. Be specific — vague answers cost lives  \n"
    "3. Prioritize human safety above all\n"
    "4. Use Indian context — NDRF, SDRF, district administration\n"
    "5. Action cards must be immediately executable\n"
    "6. Timeline must be realistic for Indian field conditions\n\n"
    "OUTPUT FORMAT (strict JSON):\n"
    "{\n"
    '  "disaster_type": "specific type e.g. Flash Flood/Earthquake/Landslide",\n'
    '  "severity": "CRITICAL|HIGH|MEDIUM|LOW",\n'
    '  "affected_people": <integer>,\n'
    '  "injured": <integer>,\n'
    '  "missing": <integer>,\n'
    '  "location": "specific location name",\n'
    '  "coordinates": "lat,lng if mentioned else null",\n'
    '  "confidence": <integer 0-100>,\n'
    '  "summary": "2 sentence situation summary in simple English",\n'
    '  "immediate_action": "Single most urgent action in 10 words",\n'
    '  "action_cards": [\n'
    "    {\n"
    '      "priority": "CRITICAL|HIGH|MEDIUM|LOW",\n'
    '      "title": "Clear action title in 5-8 words",\n'
    '      "detail": "Specific steps, numbers, locations — 2-3 sentences",\n'
    '      "time": "0-1 hr|1-3 hr|3-6 hr|6-24 hr",\n'
    '      "color": "#FF3B3B|#FF6F00|#00D4FF|#30D158",\n'
    '      "confidence": <integer>,\n'
    '      "category": "evacuation|medical|logistics|communication|relief"\n'
    "    }\n"
    "  ],\n"
    '  "timeline": [\n'
    "    {\n"
    '      "time": "0-1 hr",\n'
    '      "label": "Phase name",\n'
    '      "active": true,\n'
    '      "tasks": ["task1", "task2", "task3"]\n'
    "    }\n"
    "  ],\n"
    '  "resources": [\n'
    "    {\n"
    '      "label": "Resource name",\n'
    '      "value": "<number>",\n'
    '      "unit": "personnel|units|tonnes|liters",\n'
    '      "urgency": "immediate|within_1hr|within_3hr"\n'
    "    }\n"
    "  ],\n"
    '  "risk_zones": ["Zone description with specific location"],\n'
    '  "replan_triggers": ["Condition that would change this plan"]\n'
    "}"
)


class LoginRequest(BaseModel):
    """Login request model for /auth/login."""

    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=100)


class LoginResponse(BaseModel):
    """Login response model for /auth/login."""

    token: str
    role: str
    name: str
    badge: str
    expires_in: str
    message: str


class ActionCard(BaseModel):
    """Action card for field execution."""

    priority: str
    title: str
    detail: str
    time: str
    color: str
    confidence: int = Field(ge=0, le=100)
    category: str


class TimelineItem(BaseModel):
    """Timeline phase item with tasks."""

    time: str
    label: str
    active: bool
    tasks: List[str]


class Resource(BaseModel):
    """Resource estimate item for operations execution."""

    label: str
    value: str
    unit: str
    urgency: str


class AnalysisResult(BaseModel):
    """Structured emergency response plan output."""

    disaster_type: str
    severity: str
    affected_people: int
    injured: int
    missing: int
    location: str
    coordinates: Optional[str]
    confidence: int
    ai_powered: bool
    summary: str
    immediate_action: str
    action_cards: List[ActionCard]
    timeline: List[TimelineItem]
    resources: List[Resource]
    risk_zones: List[str]
    replan_triggers: List[str]
    generated_at: str
    processing_time_ms: int


class AnalysisResponse(BaseModel):
    """Standard wrapper response for analysis endpoints."""

    success: bool
    data: AnalysisResult
    id: str
    analysis_type: str


class ReplanResponse(BaseModel):
    """Standard wrapper response for /replan endpoint."""

    success: bool
    data: AnalysisResult
    id: str
    changes: List[str]
    delta_summary: str


def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract text from PDF using PyMuPDF; returns first MAX_PDF_CHARS chars.

    Raises ValueError if no text found.
    """
    doc: Optional[fitz.Document] = None
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        full_text_parts: List[str] = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            full_text_parts.append(page.get_text())
        full_text = " ".join(full_text_parts)
        cleaned = " ".join(full_text.split())
        if not cleaned.strip():
            raise ValueError("PDF mein readable text nahi mila")
        return cleaned[:MAX_PDF_CHARS]
    finally:
        try:
            if doc is not None:
                doc.close()
        except Exception:
            # Best-effort cleanup
            pass


def _extract_json_obj(raw_text: str) -> Optional[Dict[str, Any]]:
    """Extract JSON object from LLM raw text (handles markdown fences)."""
    patterns: List[str] = [
        r"```json\s*(\{.*?\})\s*```",
        r"```\s*(\{.*?\})\s*```",
        r"(\{.*\})",
    ]
    for pattern in patterns:
        match = re.search(pattern, raw_text, flags=re.DOTALL)
        if not match:
            continue
        candidate: str = match.group(1) if match.groups() else match.group(0)
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue

    start: int = raw_text.find("{")
    end: int = raw_text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(raw_text[start : end + 1])
        except json.JSONDecodeError:
            return None
    return None


def _priority_color(priority: str) -> str:
    """Map priority to hex color."""
    p = str(priority).strip().upper()
    return {
        "CRITICAL": "#FF3B3B",
        "HIGH": "#FF6F00",
        "MEDIUM": "#00D4FF",
        "LOW": "#30D158",
    }.get(p, "#00D4FF")


def _card_confidence(priority: str) -> int:
    """Best-effort card confidence based on priority level."""
    p = str(priority).strip().upper()
    return {"CRITICAL": 92, "HIGH": 85, "MEDIUM": 78}.get(p, 70)


def build_fallback_response(text: str) -> Dict[str, Any]:
    """Rule-based disaster analysis engine (offline, deterministic best-effort)."""
    start = time.time()
    t: str = str(text or "")
    text_lower: str = t.lower()

    # People / injury / missing extraction
    affected_people: int = 100
    people_patterns: List[str] = [
        r"(\d+)\s*(?:log|logon|people|persons|individuals|residents)",
        r"(\d+)\s*(?:affected|trapped|stranded|missing|injured)",
        r"population\s*(?:of)?\s*(\d+)",
    ]
    for pattern in people_patterns:
        match = re.search(pattern, text_lower)
        if match:
            affected_people = int(match.group(1))
            break

    injured: int = 0
    injured_match = re.search(r"(\d+)\s*(?:injured|hurt|wounded|casualties|ghayal|jakhmi)", text_lower)
    if injured_match:
        injured = int(injured_match.group(1))
    else:
        injured = max(5, affected_people // 8)

    missing: int = max(0, affected_people // 15)
    if re.search(r"missing|lapata|lapat[a-z]*", text_lower):
        missing = max(missing, affected_people // 20)

    # Disaster type
    disaster_map: Dict[str, List[str]] = {
        "Flash Flood": ["flash flood", "cloudburst", "inundation", "flood", "paani", "river", "water level"],
        "Earthquake": ["earthquake", "bhukamp", "tremor", "richter", "seismic"],
        "Landslide": ["landslide", "mudslide", "bhookhalan", "slope failure"],
        "Cyclone": ["cyclone", "toofan", "hurricane", "storm surge"],
        "Fire": ["fire", "aag", "blaze", "wildfire", "burning"],
    }
    disaster_type: str = "Natural Disaster"
    for dtype, keywords in disaster_map.items():
        if any(kw in text_lower for kw in keywords):
            disaster_type = dtype
            break

    # Road blockage
    road_blocked: bool = any(
        w in text_lower for w in ["road block", "highway block", "rasta band", "route cut", "nh-21", "blocked", "nh-"]
    )

    # Severity scoring
    score: int = 0
    if affected_people > 500:
        score += 3
    elif affected_people > 100:
        score += 2
    elif affected_people > 50:
        score += 1

    if injured > 50:
        score += 3
    elif injured > 20:
        score += 2
    elif injured > 5:
        score += 1

    critical_words: List[str] = ["critical", "mass casualty", "mass", "death", "fatality", "collapse", "dam break"]
    if any(w in text_lower for w in critical_words):
        score += 3

    if score >= 7:
        severity: str = "CRITICAL"
    elif score >= 5:
        severity = "HIGH"
    elif score >= 3:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    # Location extraction
    location: str = "Field Location"
    location_match = re.search(
        r"(?:in|at|near|location:|village|district|tehsil)\s+([A-Za-z][A-Za-z\s\-\']{3,60})",
        t,
    )
    if location_match:
        location = location_match.group(1).strip()

    coordinates: Optional[str] = None
    coord_match = re.search(r"(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)", t)
    if coord_match:
        coordinates = f"{coord_match.group(1)},{coord_match.group(2)}"

    # Confidence engine
    data_completeness: int = 10
    data_completeness += 40 if affected_people > 0 else 0
    data_completeness += 20 if injured >= 0 else 0
    data_completeness += 20 if missing >= 0 else 0
    data_completeness += 10 if location != "Field Location" else 0
    data_completeness += 10 if disaster_type != "Natural Disaster" else 0
    rule_certainty: int = 0
    rule_certainty += 30 if affected_people > 100 else 10
    rule_certainty += 30 if injured > 20 else 10
    rule_certainty += 20 if road_blocked else 10
    rule_certainty += 20 if severity == "CRITICAL" else 10
    ai_confidence: int = 0
    confidence: int = compute_confidence_from_components(data_completeness, rule_certainty, ai_confidence)

    # Action cards (immediately executable)
    action_cards: List[Dict[str, Any]] = []

    def add_card(
        priority: str,
        title: str,
        detail: str,
        time_label: str,
        category: str,
        confidence_value: Optional[int] = None,
    ) -> None:
        """Append a standardized action card to action_cards."""
        card_conf: int = _card_confidence(priority) if confidence_value is None else clamp_int(confidence_value, 0, 100)
        action_cards.append(
            {
                "priority": priority,
                "title": title,
                "detail": detail,
                "time": time_label,
                "color": _priority_color(priority),
                "confidence": card_conf,
                "category": category,
            }
        )

    # Mandatory rules from spec
    if affected_people > 100:
        add_card(
            "CRITICAL",
            f"{affected_people} logon ko turant evacuate karo",
            "Zone mapping banao aur Zone A se evacuation start karo. Elderly, children, and critical medical cases ko priority rakhke movement define karo.",
            "0-1 hr",
            "evacuation",
        )

    if injured > 20:
        add_card(
            "HIGH",
            f"{injured} injured ke liye high medical priority",
            "Rapid triage tent setup karo (red/yellow/green). Severe cases ko referral/AIIMS channel se route karo using ambulance/rotary support if available.",
            "0-1 hr",
            "medical",
        )

    if road_blocked:
        add_card(
            "HIGH",
            "Logistics delay mitigate: alternate routes",
            "Main road blocked hai—alternative routes (nh/bridge alternatives/temporary access) identify karo. Convoys ko time-window me dispatch karo and PWD/traffic control ko update do.",
            "1-3 hr",
            "logistics",
        )

    # Always include coordination + communication + relief (best-effort)
    add_card(
        "MEDIUM" if severity != "CRITICAL" else "CRITICAL",
        "NDRF-SDRF command coordination on karo",
        "Incident command establish karo. District EOC aur State disaster authority ko SITREP cycle me update do (30-60 min cadence).",
        "0-1 hr" if severity == "CRITICAL" else "1-3 hr",
        "communication" if severity != "CRITICAL" else "evacuation",
    )
    add_card(
        "MEDIUM",
        "Emergency communication hub operationalize",
        "Satellite phone + radio relay points set karo (3 relay points). Media briefing schedule aur helpline numbering district admin ke saath finalize karo.",
        "1-3 hr",
        "communication",
    )
    add_card(
        "MEDIUM" if severity != "CRITICAL" else "LOW",
        "Relief camp setup with registration counters",
        f"Nearest safe school/community hall choose karo. Capacity {affected_people + 50} log ke liye plan karo; food, water, blankets 72hr ke liye arrange karo.",
        "3-6 hr",
        "relief",
    )

    if severity == "CRITICAL" and len(action_cards) < 5:
        add_card(
            "HIGH",
            "Mass casualty coordination with HQ",
            "HQ ko IMMEDIATELY notify karo aur additional teams/resources request karo. Evacuation progress aur casualty register tracking ke liye SOP follow karo.",
            "0-1 hr",
            "communication",
        )

    # Timeline (4 phases)
    timeline: List[Dict[str, Any]] = [
        {
            "time": "0-1 hr",
            "label": "Rescue, Triage, and Evacuation Start",
            "active": True,
            "tasks": ["Search & rescue deploy", "Evacuation routes secure", "Medical triage start"],
        },
        {
            "time": "1-3 hr",
            "label": "Medical Stabilization and Supply Movement",
            "active": False,
            "tasks": ["Field hospital stabilize", "Alternate logistics activate", "Communication hub operational"],
        },
        {
            "time": "3-6 hr",
            "label": "Relief Camp Operations Expansion",
            "active": False,
            "tasks": ["Relief camp operational", "Food & water distribution", "Registration & reunification"],
        },
        {
            "time": "6-24 hr",
            "label": "Recovery, Damage Assessment, HQ Reporting",
            "active": False,
            "tasks": ["Infrastructure damage survey", "Restoration begin", "SITREP to HQ"],
        },
    ]

    # Resources (best-effort)
    resources: List[Dict[str, Any]] = [
        {"label": "Rescue Personnel", "value": str(max(8, affected_people // 15)), "unit": "personnel", "urgency": "immediate"},
        {"label": "Rescue Boats", "value": str(max(2, affected_people // 50)), "unit": "units", "urgency": "within_1hr"},
        {"label": "Medical Staff", "value": str(max(6, injured // 3)), "unit": "personnel", "urgency": "immediate"},
        {"label": "Vehicles", "value": str(max(4, affected_people // 30)), "unit": "units", "urgency": "within_1hr"},
        {"label": "Food Packets", "value": str(max(100, affected_people * 3)), "unit": "tonnes", "urgency": "within_3hr"},
        {"label": "Water (liters)", "value": str(max(1000, affected_people * 10)), "unit": "liters", "urgency": "within_1hr"},
    ]

    # Risk zones and replan triggers
    risk_zones: List[str] = [
        f"Zone A — {location} main hazard area (highest risk)",
        f"Zone B — proximity risk around {disaster_type.lower()} site",
        "Zone C — blocked road / supply chokepoints",
    ]
    if not road_blocked:
        risk_zones[2] = f"Zone C — safe access corridors near {location}"

    replan_triggers: List[str] = [
        "New casualties or missing reports",
        "Road access loss / route blockage changes",
        "Weather conditions worsening",
        "Additional villages affected",
        "Infrastructure collapse or dam breach",
    ]

    elapsed_ms: int = int((time.time() - start) * 1000)
    summary: str = (
        f"{disaster_type} disaster situation reported at {location}. "
        f"Approx {affected_people} people affected, {injured} injured, and {missing} missing need rapid response."
    )
    immediate_action: str = truncate_words(f"Evacuate {affected_people} affected people from {location} now", max_words=10)

    return {
        "disaster_type": disaster_type,
        "severity": severity,
        "affected_people": int(affected_people),
        "injured": int(injured),
        "missing": int(missing),
        "location": location,
        "coordinates": coordinates,
        "confidence": int(confidence),
        "ai_powered": False,
        "summary": summary,
        "immediate_action": immediate_action,
        "action_cards": action_cards[: max(12, len(action_cards))],
        "timeline": timeline,
        "resources": resources,
        "risk_zones": risk_zones,
        "replan_triggers": replan_triggers,
        "generated_at": _utc_now_iso(),
        "processing_time_ms": elapsed_ms,
    }


def call_ollama(prompt: str, retry: int = 2) -> Tuple[Dict[str, Any], bool]:
    """Call Ollama API with retry logic.

    Returns (result_dict, is_ai_powered). On failure, returns fallback response with is_ai_powered=False.
    """
    for attempt in range(retry + 1):
        try:
            started = time.time()
            response = requests.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": f"{NEURIX_SYSTEM_PROMPT}\n\nDISASTER REPORT:\n{prompt}",
                    "stream": False,
                    "options": {"temperature": 0.1, "num_predict": 2000, "top_p": 0.9},
                },
                timeout=OLLAMA_TIMEOUT,
            )
            response.raise_for_status()
            elapsed_ms: int = int((time.time() - started) * 1000)

            raw_text: str = str(response.json().get("response", ""))

            parsed: Optional[Dict[str, Any]] = _extract_json_obj(raw_text)
            if parsed is None:
                cleaned: str = raw_text
                cleaned = re.sub(r"```(?:json)?", "", cleaned, flags=re.IGNORECASE)
                cleaned = cleaned.replace("```", "")
                parsed = _extract_json_obj(cleaned)

            if parsed is None:
                raise ValueError("AI response samajh nahi aaya")

            parsed["processing_time_ms"] = elapsed_ms
            parsed["generated_at"] = _utc_now_iso()
            parsed["ai_powered"] = True

            return parsed, True
        except requests.exceptions.Timeout:
            logger.warning(f"Ollama timeout attempt {attempt + 1}/{retry + 1}")
        except requests.exceptions.ConnectionError:
            logger.warning("Ollama not running — using fallback")
            break
        except (json.JSONDecodeError, ValueError) as exc:
            logger.warning(f"Ollama parse failed attempt {attempt + 1}: {str(exc)}")
        except requests.exceptions.RequestException as exc:
            logger.warning(f"Ollama request error attempt {attempt + 1}: {str(exc)}")
        except Exception as exc:
            logger.error(f"Ollama unexpected error attempt {attempt + 1}: {str(exc)}")

    logger.info("Using rule-based fallback engine")
    return build_fallback_response(prompt), False


def build_history_record(
    analysis_id: str,
    analysis_type: str,
    result: Dict[str, Any],
    username: str,
    filename: Optional[str] = None,
) -> Dict[str, Any]:
    """Build standardized history record."""
    return {
        "id": analysis_id,
        "type": analysis_type,
        "filename": filename,
        "timestamp": _utc_now_iso(),
        "user": username,
        "disaster_type": result.get("disaster_type"),
        "severity": result.get("severity"),
        "location": result.get("location"),
        "affected_people": result.get("affected_people"),
        "confidence": result.get("confidence"),
        "ai_powered": result.get("ai_powered", False),
        "result": result,
    }


def _try_build_analysis_result(raw: Dict[str, Any], ai_powered: bool) -> AnalysisResult:
    """Validate/construct AnalysisResult or fallback safely."""
    try:
        raw_copy: Dict[str, Any] = dict(raw)
        raw_copy["ai_powered"] = ai_powered
        raw_copy["generated_at"] = str(raw_copy.get("generated_at") or _utc_now_iso())
        if "processing_time_ms" not in raw_copy:
            raw_copy["processing_time_ms"] = 0
        return AnalysisResult.model_validate(raw_copy)
    except ValidationError as exc:
        logger.warning(f"AI output schema invalid; fallback used. Err={str(exc)}")
        fallback_dict: Dict[str, Any] = build_fallback_response(str(raw.get("prompt", "")))
        return AnalysisResult.model_validate(fallback_dict)
    except Exception as exc:
        logger.error(f"AI output normalization failed; fallback used. Err={str(exc)}")
        fallback_dict = build_fallback_response(str(raw.get("prompt", "")))
        return AnalysisResult.model_validate(fallback_dict)


@app.middleware("http")
async def log_requests_and_responses(request: Request, call_next: Any) -> JSONResponse:
    """Log every HTTP request and response via Loguru."""
    start = time.time()
    try:
        response = await call_next(request)
        elapsed_ms: int = int((time.time() - start) * 1000)

        auth_header: str = request.headers.get("authorization", "")
        user_hint: str = "anonymous"
        if auth_header.lower().startswith("bearer "):
            user_hint = "bearer_present"

        body_preview: str = ""
        try:
            if hasattr(response, "body") and response.body:
                body_bytes = response.body
                body_preview = body_bytes[:2000].decode("utf-8", errors="replace")
        except Exception:
            body_preview = ""

        logger.info(
            f"{request.method} {request.url.path} | user={user_hint} | status={response.status_code} | {elapsed_ms}ms | response={body_preview}"
        )
        return response  # type: ignore[return-value]
    except Exception as exc:
        elapsed_ms = int((time.time() - start) * 1000)
        logger.error(f"Request failed: {request.method} {request.url.path} | {elapsed_ms}ms | err={str(exc)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "detail": "Internal error ho gaya"},
        )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(_: Request, __: RateLimitExceeded) -> JSONResponse:
    """Handle slowapi rate limit errors consistently."""
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Request limit exceeded. 1 minute baad try karo."},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    """Handle HTTPException with consistent JSON response."""
    logger.warning(f"HTTP error {exc.status_code}: {exc.detail}")
    return JSONResponse(status_code=exc.status_code, content={"success": False, "detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions without leaking internal details."""
    logger.exception(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "detail": "Server internal error. Contact support."},
    )


def _health_check_ollama() -> Tuple[str, Optional[str], List[str]]:
    """Check Ollama health and available models."""
    try:
        resp = requests.get(OLLAMA_HEALTH_URL, timeout=3)
        if resp.status_code != 200:
            return "not reachable", None, []
        payload = resp.json()
        models: List[str] = []
        if isinstance(payload, dict):
            raw_models = payload.get("models", [])
            if isinstance(raw_models, list):
                for m in raw_models:
                    if isinstance(m, dict) and isinstance(m.get("name"), str):
                        models.append(str(m.get("name")))
        if OLLAMA_MODEL in models:
            return "running", OLLAMA_MODEL, models
        return "running", OLLAMA_MODEL, models
    except Exception:
        return "not reachable", None, []


@app.on_event("startup")
async def startup_event() -> None:
    """FastAPI startup hook to log system readiness."""
    global APP_START_TIME
    APP_START_TIME = datetime.utcnow()
    logger.info("NEURIX API v2.0 starting...")
    logger.info("Checking Ollama connection...")
    ollama_state, _, _ = _health_check_ollama()
    if ollama_state == "running":
        logger.info("Ollama online — AI mode active")
    else:
        logger.info("Ollama offline — Fallback engine active")
    logger.info("NEURIX ready to serve NDRF field teams")


def _build_analysis_response(analysis_id: str, analysis_type: str, result: AnalysisResult) -> AnalysisResponse:
    """Build AnalysisResponse wrapper."""
    return AnalysisResponse(success=True, data=result, id=analysis_id, analysis_type=analysis_type)


def _build_history_response(username: str) -> Dict[str, Any]:
    """Build /history response wrapper for a user."""
    user_records: List[Dict[str, Any]] = [r for r in HISTORY if str(r.get("user", "")) == username]
    user_records_sorted: List[Dict[str, Any]] = sorted(user_records, key=lambda r: str(r.get("timestamp", "")), reverse=True)
    recent: List[Dict[str, Any]] = user_records_sorted[:20]
    return {"success": True, "user": username, "total": len(user_records), "data": recent}


@app.get("/", response_class=JSONResponse)
@limiter.limit("10/minute")
def root_info() -> Dict[str, Any]:
    """Root endpoint — API info (no auth)."""
    try:
        endpoints: List[str] = [
            "/auth/login",
            "/auth/me",
            "/analyze/text",
            "/analyze/pdf",
            "/analyze/voice",
            "/analyze/manual",
            "/replan",
            "/history",
            "/history/{id}",
            "/health",
        ]
        return {
            "success": True,
            "data": {
                "name": "NEURIX",
                "version": "2.0.0",
                "tagline": "Offline AI Disaster Decision Engine",
                "endpoints": endpoints,
                "status": "operational",
            },
        }
    except Exception as exc:
        logger.error(f"Root endpoint error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Server internal error. Contact support.")


@app.get("/health", response_class=JSONResponse)
@limiter.limit("10/minute")
def health_check() -> Dict[str, Any]:
    """System health check — Ollama availability + uptime."""
    ollama_state, ollama_model, _ = _health_check_ollama()
    uptime_seconds: int = int((datetime.utcnow() - APP_START_TIME).total_seconds())
    uptime: str = f"{uptime_seconds}s"
    return {
        "success": True,
        "status": "ok",
        "ollama_status": "running" if ollama_state == "running" else "not reachable",
        "version": "2.0",
        "ollama": "online" if ollama_state == "running" else "offline",
        "ollama_model": OLLAMA_MODEL,
        "fallback_engine": "active",
        "total_analyses": len(HISTORY),
        "timestamp": _utc_now_iso(),
        "uptime": uptime,
    }


@app.post("/auth/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def login(req: LoginRequest) -> LoginResponse:
    """Login endpoint — returns JWT token."""
    try:
        username: str = req.username
        user: Optional[Dict[str, Any]] = USERS.get(username)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Username ya password galat hai")

        stored_hashes: List[str] = user.get("password", [])
        if not stored_hashes:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Username ya password galat hai")

        ok: bool = any(verify_password(req.password, h) for h in stored_hashes)
        if not ok:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Username ya password galat hai")

        token: str = create_token(
            {
                "sub": user["username"],
                "role": user["role"],
                "name": user["name"],
                "badge": user["badge"],
            }
        )
        expires_in: str = f"{TOKEN_EXPIRE_HOURS}h"
        logger.info(f"Login success | user={username} role={user['role']}")
        return LoginResponse(
            token=token,
            role=user["role"],
            name=user["name"],
            badge=user["badge"],
            expires_in=expires_in,
            message="Login successful",
        )
    except HTTPException:
        logger.warning("Login failed")
        raise
    except Exception as exc:
        logger.error(f"Login error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication error ho gaya")


@app.get("/auth/me")
@limiter.limit("10/minute")
def get_me(user_payload: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
    """Get current user info from token."""
    try:
        username: str = str(user_payload.get("sub", ""))
        user: Optional[Dict[str, Any]] = USERS.get(username)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication fail hua")

        return {
            "success": True,
            "data": {
                "username": username,
                "name": user["name"],
                "role": user["role"],
                "badge": user["badge"],
                "created_at": user["created_at"],
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/auth/me error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication me error ho gaya")


@app.post("/analyze/text", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def analyze_text(
    text: str = Form(...),
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> AnalysisResponse:
    """Analyze text disaster report."""
    try:
        username: str = str(user_payload.get("sub", ""))
        safe_text: str = _sanitize_text(text, MAX_INPUT_CHARS)
        lang: str = detect_language_simple(safe_text)
        normalized: str = normalize_to_english_like(safe_text) if lang == "hi" else safe_text

        analysis_id: str = str(uuid.uuid4())[:8]
        raw_start = time.time()

        raw_result, is_ai = call_ollama(normalized)
        processing_time_ms: int = int((time.time() - raw_start) * 1000)

        # Ensure strict schema; fallback inside normalize if AI schema fails.
        if is_ai:
            try:
                analysis_result = AnalysisResult.model_validate(raw_result)
                analysis_result.ai_powered = True
                analysis_result.processing_time_ms = int(raw_result.get("processing_time_ms", processing_time_ms))
            except ValidationError as exc:
                logger.warning(f"AI result invalid, fallback used: {str(exc)}")
                analysis_result = AnalysisResult.model_validate(build_fallback_response(normalized))
        else:
            analysis_result = AnalysisResult.model_validate(raw_result)

        record: Dict[str, Any] = build_history_record(
            analysis_id=analysis_id,
            analysis_type="text",
            result=analysis_result.model_dump(),
            username=username,
        )
        record["input"] = safe_text
        record["output"] = analysis_result.model_dump()
        add_to_history(record)
        logger.info(
            f"Text analysis complete | user={username} severity={analysis_result.severity} confidence={analysis_result.confidence}"
        )
        return _build_analysis_response(analysis_id, "text", analysis_result)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/analyze/text error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI response samajh nahi aaya, fallback use kiya")


@app.post("/analyze/pdf", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def analyze_pdf(
    file: UploadFile = File(...),
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> AnalysisResponse:
    """Analyze PDF disaster report."""
    try:
        username: str = str(user_payload.get("sub", ""))
        content_type: str = str(file.content_type or "")
        filename: str = str(file.filename or "")

        if "pdf" not in filename.lower() and "application/pdf" not in content_type.lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PDF file diya hai nahi")

        content: bytes = await file.read()
        if not content:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PDF empty hai")
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PDF size limit se zyada hai")

        extracted_text: str = extract_pdf_text(content)

        analysis_id: str = str(uuid.uuid4())[:8]
        raw_start = time.time()
        raw_result, is_ai = call_ollama(extracted_text)
        processing_time_ms: int = int((time.time() - raw_start) * 1000)

        if is_ai:
            try:
                analysis_result = AnalysisResult.model_validate(raw_result)
                analysis_result.ai_powered = True
                analysis_result.processing_time_ms = int(raw_result.get("processing_time_ms", processing_time_ms))
            except ValidationError as exc:
                logger.warning(f"AI result invalid, fallback used: {str(exc)}")
                analysis_result = AnalysisResult.model_validate(build_fallback_response(extracted_text))
        else:
            analysis_result = AnalysisResult.model_validate(raw_result)

        record = build_history_record(
            analysis_id=analysis_id,
            analysis_type="pdf",
            result=analysis_result.model_dump(),
            username=username,
            filename=filename,
        )
        record["input"] = extracted_text
        record["output"] = analysis_result.model_dump()
        add_to_history(record)
        logger.info(f"PDF analysis complete | user={username} file={filename} severity={analysis_result.severity}")
        return _build_analysis_response(analysis_id, "pdf", analysis_result)
    except HTTPException:
        raise
    except ValueError as exc:
        logger.warning(f"PDF extraction failed: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.error(f"/analyze/pdf error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="PDF analysis internal error ho gaya")


@app.post("/analyze/voice", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def analyze_voice(
    text: str = Form(...),
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> AnalysisResponse:
    """Analyze voice transcription."""
    try:
        username: str = str(user_payload.get("sub", ""))
        safe_text: str = _sanitize_text(text, MAX_INPUT_CHARS)
        lang: str = detect_language_simple(safe_text)
        normalized: str = normalize_to_english_like(safe_text) if lang == "hi" else safe_text

        context_prompt: str = f"Voice input from field officer: {normalized}"
        analysis_id: str = str(uuid.uuid4())[:8]
        raw_start = time.time()

        raw_result, is_ai = call_ollama(context_prompt)
        processing_time_ms: int = int((time.time() - raw_start) * 1000)

        if is_ai:
            try:
                analysis_result = AnalysisResult.model_validate(raw_result)
                analysis_result.ai_powered = True
                analysis_result.processing_time_ms = int(raw_result.get("processing_time_ms", processing_time_ms))
            except ValidationError as exc:
                logger.warning(f"AI result invalid, fallback used: {str(exc)}")
                analysis_result = AnalysisResult.model_validate(build_fallback_response(context_prompt))
        else:
            analysis_result = AnalysisResult.model_validate(raw_result)

        record = build_history_record(
            analysis_id=analysis_id,
            analysis_type="voice",
            result=analysis_result.model_dump(),
            username=username,
        )
        record["input"] = safe_text
        record["output"] = analysis_result.model_dump()
        add_to_history(record)
        logger.info(f"Voice analysis complete | user={username} severity={analysis_result.severity}")
        return _build_analysis_response(analysis_id, "voice", analysis_result)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/analyze/voice error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Voice analysis internal error ho gaya")


@app.post("/analyze/manual", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def analyze_manual(
    disaster_type: str = Form(...),
    location: str = Form(...),
    people: str = Form(...),
    severity: str = Form(...),
    details: str = Form(""),
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> AnalysisResponse:
    """Analyze manual form input (field report with structured inputs)."""
    try:
        username: str = str(user_payload.get("sub", ""))
        safe_disaster_type: str = _sanitize_text(disaster_type, MAX_INPUT_CHARS)
        safe_location: str = _sanitize_text(location, MAX_INPUT_CHARS)
        safe_details: str = _sanitize_text(details, MAX_INPUT_CHARS) if str(details).strip() else ""
        safe_severity: str = sanitize_risk_level(severity)

        people_clean: str = str(people).strip()
        if not people_clean.isdigit():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="People number galat diya hai")
        people_int: int = int(people_clean)

        prompt: str = (
            "NDRF Field Report:\n"
            f"Disaster Type: {safe_disaster_type}\n"
            f"Location: {safe_location}\n"
            f"Estimated Affected: {people_int} people\n"
            f"Reported Severity: {safe_severity}\n"
            f"Field Officer Notes: {safe_details}\n"
            "Generate complete emergency response plan."
        )

        analysis_id: str = str(uuid.uuid4())[:8]
        raw_start = time.time()
        raw_result, is_ai = call_ollama(prompt)
        processing_time_ms: int = int((time.time() - raw_start) * 1000)

        if is_ai:
            try:
                analysis_result = AnalysisResult.model_validate(raw_result)
                analysis_result.ai_powered = True
                analysis_result.processing_time_ms = int(raw_result.get("processing_time_ms", processing_time_ms))
            except ValidationError as exc:
                logger.warning(f"AI result invalid, fallback used: {str(exc)}")
                analysis_result = AnalysisResult.model_validate(build_fallback_response(prompt))
        else:
            analysis_result = AnalysisResult.model_validate(raw_result)

        record = build_history_record(
            analysis_id=analysis_id,
            analysis_type="manual",
            result=analysis_result.model_dump(),
            username=username,
        )
        record["input"] = {
            "disaster_type": safe_disaster_type,
            "location": safe_location,
            "people": people_int,
            "severity": safe_severity,
            "details": safe_details,
        }
        record["output"] = analysis_result.model_dump()
        add_to_history(record)
        logger.info(f"Manual analysis complete | user={username} severity={analysis_result.severity}")
        return _build_analysis_response(analysis_id, "manual", analysis_result)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/analyze/manual error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Manual analysis internal error ho gaya")


@app.post("/replan", response_model=ReplanResponse)
@limiter.limit("10/minute")
async def replan(
    original_id: str = Form(...),
    update_text: str = Form(...),
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> ReplanResponse:
    """Dynamic replanning — update existing plan."""
    try:
        username: str = str(user_payload.get("sub", ""))
        safe_update: str = _sanitize_text(update_text, MAX_INPUT_CHARS)
        safe_original_id: str = str(original_id).strip()

        original: Optional[Dict[str, Any]] = None
        for r in reversed(HISTORY):
            if str(r.get("id")) == safe_original_id and str(r.get("user", "")) == username:
                original = r
                break
        if original is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Previous analysis nahi mila")

        original_result: Dict[str, Any] = original.get("result", {})
        original_summary: str = str(original_result.get("summary", "N/A"))
        original_severity: str = sanitize_risk_level(str(original_result.get("severity", "MEDIUM")))
        original_location: str = str(original_result.get("location", "Field Location"))

        update_prompt: str = (
            "SITUATION UPDATE for existing disaster response:\n\n"
            f"Original Situation: {original_summary}\n"
            f"Original Severity: {original_severity}\n"
            f"Location: {original_location}\n\n"
            f"NEW UPDATE FROM FIELD:\n{safe_update}\n\n"
            "Generate UPDATED emergency response plan.\n"
            "Mark which actions are NEW vs UNCHANGED.\n"
            "Reassess severity based on new information."
        )

        analysis_id: str = str(uuid.uuid4())[:8]
        raw_start = time.time()
        raw_result, is_ai = call_ollama(update_prompt)
        processing_time_ms: int = int((time.time() - raw_start) * 1000)

        if is_ai:
            try:
                analysis_result = AnalysisResult.model_validate(raw_result)
                analysis_result.ai_powered = True
                analysis_result.processing_time_ms = int(raw_result.get("processing_time_ms", processing_time_ms))
            except ValidationError as exc:
                logger.warning(f"AI result invalid, fallback used: {str(exc)}")
                analysis_result = AnalysisResult.model_validate(build_fallback_response(update_prompt))
        else:
            analysis_result = AnalysisResult.model_validate(raw_result)

        old_cards: List[Dict[str, Any]] = []
        new_cards: List[Dict[str, Any]] = []
        try:
            old_cards_raw = original_result.get("action_cards", [])
            if isinstance(old_cards_raw, list):
                old_cards = [c for c in old_cards_raw if isinstance(c, dict)]
            new_cards_raw = analysis_result.model_dump().get("action_cards", [])
            if isinstance(new_cards_raw, list):
                new_cards = [c for c in new_cards_raw if isinstance(c, dict)]
        except Exception:
            old_cards = []
            new_cards = []

        old_by_title: Dict[str, Dict[str, Any]] = {str(c.get("title", "")).strip(): c for c in old_cards if str(c.get("title", "")).strip()}
        new_by_title: Dict[str, Dict[str, Any]] = {str(c.get("title", "")).strip(): c for c in new_cards if str(c.get("title", "")).strip()}

        changes: List[str] = []
        new_count: int = 0
        for title, card in new_by_title.items():
            if title not in old_by_title:
                changes.append(f"New: {title}")
                new_count += 1
            else:
                if card != old_by_title[title]:
                    changes.append(f"Updated: {title}")
        for title in old_by_title.keys():
            if title not in new_by_title:
                changes.append(f"Removed: {title}")
        if not changes:
            changes = ["No action card changes detected"]

        delta_summary: str = (
            f"{new_count} new actions added, severity changed from {original_severity} to {analysis_result.severity}"
        )

        record = build_history_record(
            analysis_id=analysis_id,
            analysis_type="replan",
            result=analysis_result.model_dump(),
            username=username,
        )
        record["input"] = {"original_id": safe_original_id, "update_text": safe_update}
        record["output"] = analysis_result.model_dump()
        add_to_history(record)
        logger.info(f"Replan complete | user={username} changes={len(changes)}")

        return ReplanResponse(
            success=True,
            data=analysis_result,
            id=analysis_id,
            changes=changes,
            delta_summary=delta_summary,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/replan error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Replan internal error ho gaya")


@app.get("/history", response_class=JSONResponse)
@limiter.limit("10/minute")
async def get_history(user_payload: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
    """Get analysis history for current user."""
    try:
        username: str = str(user_payload.get("sub", ""))
        return _build_history_response(username)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/history error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="History error ho gaya")


@app.get("/history/{item_id}", response_class=JSONResponse)
@limiter.limit("10/minute")
async def get_history_item(item_id: str, user_payload: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
    """Get single history item."""
    try:
        username: str = str(user_payload.get("sub", ""))
        safe_item_id: str = str(item_id).strip()
        for r in reversed(HISTORY):
            if str(r.get("id")) == safe_item_id and str(r.get("user", "")) == username:
                return {"success": True, "data": r}
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record nahi mila")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/history/{item_id} error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="History item error ho gaya")


@app.delete("/history/{item_id}", response_class=JSONResponse)
@limiter.limit("10/minute")
async def delete_history_item(item_id: str, user_payload: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
    """Delete history item."""
    try:
        username: str = str(user_payload.get("sub", ""))
        safe_item_id: str = str(item_id).strip()
        global HISTORY
        before: int = len(HISTORY)
        HISTORY = [r for r in HISTORY if not (str(r.get("id")) == safe_item_id and str(r.get("user", "")) == username)]
        after: int = len(HISTORY)
        if after == before:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record nahi mila")
        return {"success": True, "message": "Record deleted"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/history/{item_id} delete error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Delete error ho gaya")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True, log_level="info")

# from __future__ import annotations (duplicate copy appended accidentally)

import json
import os
import re
import sys
import time
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF
import requests
import uvicorn
from fastapi import Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from loguru import logger
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from fastapi import FastAPI

NEURIX_SYSTEM_PROMPT: str = """You are NEURIX — an elite offline AI disaster response 
engine deployed by NDRF (National Disaster Response Force) India.

Your job: Analyze disaster situation reports and generate 
structured emergency response plans.

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no explanation
2. Be specific — vague answers cost lives  
3. Prioritize human safety above all
4. Use Indian context — NDRF, SDRF, district administration
5. Action cards must be immediately executable
6. Timeline must be realistic for Indian field conditions

OUTPUT FORMAT (strict JSON):
{
  "disaster_type": "specific type e.g. Flash Flood/Earthquake/Landslide",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "affected_people": <integer>,
  "injured": <integer>,
  "missing": <integer>,
  "location": "specific location name",
  "coordinates": "lat,lng if mentioned else null",
  "confidence": <integer 0-100>,
  "summary": "2 sentence situation summary in simple English",
  "immediate_action": "Single most urgent action in 10 words",
  "action_cards": [
    {
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "title": "Clear action title in 5-8 words",
      "detail": "Specific steps, numbers, locations — 2-3 sentences",
      "time": "0-1 hr|1-3 hr|3-6 hr|6-24 hr",
      "color": "#FF3B3B|#FF6F00|#00D4FF|#30D158",
      "confidence": <integer>,
      "category": "evacuation|medical|logistics|communication|relief"
    }
  ],
  "timeline": [
    {
      "time": "0-1 hr",
      "label": "Phase name",
      "active": true,
      "tasks": ["task1", "task2", "task3"]
    }
  ],
  "resources": [
    {
      "label": "Resource name",
      "value": "<number>",
      "unit": "personnel|units|tonnes|liters",
      "urgency": "immediate|within_1hr|within_3hr"
    }
  ],
  "risk_zones": ["Zone description with specific location"],
  "replan_triggers": ["Condition that would change this plan"]
}
"""

APP = FastAPI(
    title="NEURIX API",
    description="Offline AI Disaster Response Engine for NDRF India",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)
app: FastAPI = APP  # keep canonical name for uvicorn "api:app"

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _configure_logger() -> None:
    """Configure Loguru logger to file + console."""
    logger.remove()
    logger.add(
        sys.stdout,
        colorize=True,
        level="INFO",
        enqueue=True,
        backtrace=False,
        diagnose=False,
    )
    logger.add(
        "neurix.log",
        rotation="10 MB",
        retention="10 days",
        encoding="utf-8",
        enqueue=True,
        backtrace=False,
        diagnose=False,
    )


_configure_logger()

SECRET_KEY: str = "neurix-offline-ai-ndrf-2024-secure-key"
ALGORITHM: str = "HS256"
TOKEN_EXPIRE_HOURS: int = 24
OLLAMA_URL: str = "http://localhost:11434/api/generate"
OLLAMA_HEALTH_URL: str = "http://localhost:11434/api/tags"
OLLAMA_MODEL: str = "phi3:mini"

MAX_INPUT_CHARS: int = 5000
MAX_PDF_CHARS: int = 4000
MAX_HISTORY_ITEMS: int = 100
MAX_USER_HISTORY: int = 20

OLLAMA_TIMEOUT: int = 90

APP_START_TIME: datetime = datetime.utcnow()

pwd_context: CryptContext = CryptContext(schemes=["bcrypt"], deprecated="auto")
security: HTTPBearer = HTTPBearer(auto_error=True)


def get_password_hash(password: str) -> str:
    """Hash password using bcrypt (passlib)."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify bcrypt password."""
    try:
        return bool(pwd_context.verify(plain, hashed))
    except Exception:
        return False


def create_token(data: Dict[str, Any]) -> str:
    """Create JWT token with 24hr expiry (HS256)."""
    issued_at: datetime = datetime.utcnow()
    exp: datetime = issued_at + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload: Dict[str, Any] = {
        "sub": str(data.get("sub", "")),
        "role": str(data.get("role", "")),
        "name": str(data.get("name", "")),
        "badge": str(data.get("badge", "")),
        "iat": int(issued_at.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


USERS: Dict[str, Dict[str, Any]] = {
    "cmd123": {
        "username": "cmd123",
        "name": "Commander Singh",
        "password_hash": get_password_hash("cmd123"),
        "role": "commander",
        "badge": "IPS-NDRF-001",
        "created_at": "2024-01-01T00:00:00",
    },
    "lead123": {
        "username": "lead123",
        "name": "Team Lead Sharma",
        "password_hash": get_password_hash("lead123"),
        "role": "team_lead",
        "badge": "NDRF-TL-042",
        "created_at": "2024-01-01T00:00:00",
    },
    "vol123": {
        "username": "vol123",
        "name": "Volunteer Riya",
        "password_hash": get_password_hash("vol123"),
        "role": "volunteer",
        "badge": "VOL-2024-108",
        "created_at": "2024-01-01T00:00:00",
    },
}


def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    """Verify JWT token, raise 401 if invalid/expired."""
    token: str = credentials.credentials
    try:
        payload: Dict[str, Any] = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub: str = str(payload.get("sub", ""))
        if sub not in USERS:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication fail hua")
        return payload
    except JWTError as exc:
        logger.warning(f"JWT decode failed: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication fail hua")


HISTORY: List[Dict[str, Any]] = []


def iso_now_utc() -> str:
    """Return current UTC time as ISO-8601 string."""
    return datetime.utcnow().isoformat()


def _truncate_history_for_user(username: str) -> None:
    """Trim history to at most MAX_USER_HISTORY items for a user."""
    global HISTORY
    user_items: List[Dict[str, Any]] = [r for r in HISTORY if r.get("user") == username]
    if len(user_items) <= MAX_USER_HISTORY:
        return
    # Remove oldest by timestamp
    user_items_sorted: List[Dict[str, Any]] = sorted(
        user_items,
        key=lambda r: r.get("timestamp", ""),
    )
    to_remove: set[str] = {str(r.get("id")) for r in user_items_sorted[: len(user_items) - MAX_USER_HISTORY]}
    HISTORY = [r for r in HISTORY if str(r.get("id")) not in to_remove]


def add_to_history(record: Dict[str, Any]) -> None:
    """Add analysis to history, remove oldest if global history is full."""
    global HISTORY
    HISTORY.append(record)
    # Per-user cap
    _truncate_history_for_user(str(record.get("user", "")))
    # Global cap
    if len(HISTORY) > MAX_HISTORY_ITEMS:
        HISTORY = sorted(HISTORY, key=lambda r: r.get("timestamp", ""))[-MAX_HISTORY_ITEMS:]


def sanitize_input(text: str) -> str:
    """Sanitize and normalize user input (basic control-char stripping + length limit)."""
    cleaned: str = text.strip()
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid input diya hai")
    if len(cleaned) > MAX_INPUT_CHARS:
        cleaned = cleaned[:MAX_INPUT_CHARS]
    return cleaned


def detect_language_simple(text: str) -> str:
    """Detect approximate language using Unicode heuristics (no external dependency)."""
    # Devanagari block present -> treat as Hindi/Hinglish
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"
    return "en"


def normalize_to_english_like(text: str) -> str:
    """Convert common Hinglish/Hindi disaster terms to English keywords (best-effort)."""
    mapping: Dict[str, str] = {
        "paani": "water",
        "paani level": "water level",
        "bachao": "rescue",
        "madad": "help",
        "aag": "fire",
        "badh": "flood",
        "baadh": "flood",
        "bariish": "rain",
        "bhukamp": "earthquake",
        "bhukamp": "earthquake",
        "toofan": "cyclone",
        "hurricane": "cyclone",
        "rasta": "road",
        "blocked": "blocked",
        "road block": "road blocked",
        "sarkar": "administration",
        "jakhmi": "injured",
        "ghayal": "injured",
        "lapata": "missing",
        "lapata log": "missing people",
        "collapse": "collapse",
        "critical": "critical",
    }
    lowered: str = text.lower()
    for k, v in mapping.items():
        lowered = re.sub(rf"\b{re.escape(k)}\b", v, lowered, flags=re.IGNORECASE)
    return lowered


def sanitize_risk_level(severity: str) -> str:
    """Normalize severity to one of LOW|MEDIUM|HIGH|CRITICAL."""
    s: str = str(severity).strip().upper()
    if s in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}:
        return s
    # Best-effort mapping
    if "CRIT" in s or "MAJOR" in s:
        return "CRITICAL"
    if "HIGH" in s:
        return "HIGH"
    if "MED" in s:
        return "MEDIUM"
    return "LOW"


def clamp_int(value: Any, min_value: int, max_value: int) -> int:
    """Clamp value to int range safely."""
    try:
        v = int(value)
        return max(min_value, min(max_value, v))
    except Exception:
        return min_value


def truncate_words(text: str, max_words: int = 10) -> str:
    """Truncate a text to at most `max_words` words (best-effort)."""
    words: List[str] = str(text).strip().split()
    if not words:
        return ""
    if len(words) <= max_words:
        return " ".join(words)
    return " ".join(words[:max_words])


class LoginRequest(BaseModel):
    """Login request model for /auth/login."""

    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=100)


class LoginResponse(BaseModel):
    """Login response model for /auth/login."""

    token: str
    role: str
    name: str
    badge: str
    expires_in: str
    message: str


class ActionCard(BaseModel):
    """Action card item for emergency response plan."""

    priority: str
    title: str
    detail: str
    time: str
    color: str
    confidence: int = Field(ge=0, le=100)
    category: str


class TimelineItem(BaseModel):
    """Timeline phase item with tasks for field execution."""

    time: str
    label: str
    active: bool
    tasks: List[str]


class Resource(BaseModel):
    """Resource estimate item for operations execution."""

    label: str
    value: str
    unit: str
    urgency: str


class AnalysisResult(BaseModel):
    """Structured emergency response plan output."""

    disaster_type: str
    severity: str
    affected_people: int
    injured: int
    missing: int
    location: str
    coordinates: Optional[str] = None
    confidence: int
    ai_powered: bool
    summary: str
    immediate_action: str
    action_cards: List[ActionCard]
    timeline: List[TimelineItem]
    resources: List[Resource]
    risk_zones: List[str]
    replan_triggers: List[str]
    generated_at: str
    processing_time_ms: int


class AnalysisResponse(BaseModel):
    """Standard wrapper response for analysis endpoints."""

    success: bool
    data: AnalysisResult
    id: str
    analysis_type: str


class ReplanResponse(BaseModel):
    """Standard wrapper response for /replan endpoint."""

    success: bool
    data: AnalysisResult
    id: str
    changes: List[str]
    delta_summary: str


class ReplanRequestForm(BaseModel):
    """Form-parsed request fields for /replan."""

    original_id: str
    update_text: str


def _extract_json_candidate(raw_text: str) -> Optional[Dict[str, Any]]:
    """Extract and parse a JSON object from Ollama raw text."""
    patterns: List[str] = [
        r"```json\s*(\{.*?\})\s*```",
        r"```\s*(\{.*?\})\s*```",
        r"(\{.*\})",
    ]
    for pattern in patterns:
        match = re.search(pattern, raw_text, flags=re.DOTALL)
        if not match:
            continue
        candidate: str = match.group(1) if match.groups() else match.group(0)
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            # Try last resort cleanup: remove trailing commas before } or ]
            cleaned: str = re.sub(r",(\s*[}\]])", r"\1", candidate)
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError:
                continue
    # Final attempt: first '{' to last '}'
    start: int = raw_text.find("{")
    end: int = raw_text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(raw_text[start : end + 1])
        except json.JSONDecodeError:
            return None
    return None


def compute_confidence_from_components(
    data_completeness: int,
    rule_certainty: int,
    ai_confidence: int,
) -> int:
    """Compute confidence score per spec using weighted components."""
    d = clamp_int(data_completeness, 0, 100)
    r = clamp_int(rule_certainty, 0, 100)
    a = clamp_int(ai_confidence, 0, 100)
    final = (d * 0.4) + (r * 0.3) + (a * 0.3)
    return int(round(final))


def _confidence_for_action_card(priority: str) -> int:
    """Best-effort card confidence based on priority level."""
    p: str = str(priority).strip().upper()
    if p == "CRITICAL":
        return 92
    if p == "HIGH":
        return 85
    if p == "MEDIUM":
        return 78
    return 70


def build_fallback_response(prompt: str, analysis_id: str, analysis_type: str, processing_time_ms: int) -> Dict[str, Any]:
    """Rule-based fallback engine (offline) returning strict schema dict."""
    start = time.time()
    text: str = str(prompt)
    text_lower: str = text.lower()

    # Extract numbers for people count
    affected: int = 100
    people_patterns: List[str] = [
        r"(\d+)\s*(?:log|people|persons|individuals|residents)",
        r"population\s*(?:of)?\s*(\d+)",
        r"(\d+)\s*(?:affected|trapped|stranded|missing)",
    ]
    for pattern in people_patterns:
        match = re.search(pattern, text_lower)
        if match:
            affected = int(match.group(1))
            break

    injured: int = 0
    injured_match = re.search(r"(\d+)\s*(?:injured|hurt|wounded|casualties|ghayal|jakhmi)", text_lower)
    if injured_match:
        injured = int(injured_match.group(1))
    else:
        injured = max(5, affected // 8)

    missing: int = max(0, affected // 15)
    if re.search(r"missing|lapata|lapat[a-z]*", text_lower):
        missing = max(missing, affected // 20)

    # Detect disaster type (keyword mapping)
    disaster_map: List[Tuple[str, List[str]]] = [
        ("Flash Flood", ["flash flood", "cloudburst", "inundation", "flood", "paani", "river"]),
        ("Earthquake", ["earthquake", "bhukamp", "tremor", "richter", "seismic"]),
        ("Landslide", ["landslide", "mudslide", "slope failure", "bhookhalan"]),
        ("Cyclone", ["cyclone", "toofan", "hurricane", "storm surge"]),
        ("Wildfire/Fire", ["fire", "aag", "blaze", "wildfire", "burning"]),
    ]
    disaster_type: str = "Natural Disaster"
    for dtype, keywords in disaster_map:
        if any(kw in text_lower for kw in keywords):
            disaster_type = dtype
            break

    # Detect road blockage
    road_blocked: bool = any(
        w in text_lower for w in ["road block", "highway block", "rasta band", "route cut", "nh-21", "blocked"]
    )

    # Determine severity with simple scoring
    score = 0
    if affected > 500:
        score += 3
    elif affected > 100:
        score += 2
    elif affected > 50:
        score += 1

    if injured > 50:
        score += 3
    elif injured > 20:
        score += 2
    elif injured > 5:
        score += 1

    critical_words: List[str] = ["critical", "mass casualty", "mass", "collapse", "death", "fatality", "dam break"]
    if any(w in text_lower for w in critical_words):
        score += 3

    if score >= 7:
        severity: str = "CRITICAL"
    elif score >= 5:
        severity = "HIGH"
    elif score >= 3:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    location: str = "Field Location"
    # Best-effort location extraction
    loc_match = re.search(r"(?:in|at|near|location:|district|tehsil)\s+([A-Za-z][A-Za-z\s\-]{3,60})", prompt)
    if loc_match:
        location = loc_match.group(1).strip()

    # Color mapping
    color_by_priority: Dict[str, str] = {
        "CRITICAL": "#FF3B3B",
        "HIGH": "#FF6F00",
        "MEDIUM": "#00D4FF",
        "LOW": "#30D158",
    }

    # Build action cards (minimum 5 for CRITICAL)
    action_cards: List[Dict[str, Any]] = []

    def add_card(
        priority: str,
        title: str,
        detail: str,
        time_label: str,
        category: str,
    ) -> None:
        """Append a standardized action card to the `action_cards` list."""
        action_cards.append(
            {
                "priority": priority,
                "title": title,
                "detail": detail,
                "time": time_label,
                "color": color_by_priority.get(priority, "#00D4FF"),
                "confidence": _confidence_for_action_card(priority),
                "category": category,
            }
        )

    # CRITICAL pre-card
    if severity == "CRITICAL" or affected > 100:
        add_card(
            "CRITICAL",
            "MAYDAY — State disaster alert",
            "NDRF HQ, District EOC, aur State Disaster Authority ko turant notify karo. Additional battalions/MEDEVAC request channel on karo.",
            "0-1 hr",
            "evacuation",
        )

    if affected > 100:
        add_card(
            "CRITICAL" if severity == "CRITICAL" else "HIGH",
            "Clear evacuation of affected zones",
            "Zone mapping banao (Zone A priority). Elderly/children ko first evacuation route se shift karo; on-ground medical triage ke saath movement plan follow karo.",
            "0-1 hr",
            "evacuation",
        )

    # Medical
    if injured > 20:
        add_card(
            "HIGH" if severity != "CRITICAL" else "CRITICAL",
            "HIGH medical priority triage",
            "Medical teams set up karo: triage tent + stabilization area. Severe cases ko nearest referral/AIIMS channel via helicopter/ambulance arrange karo.",
            "0-1 hr",
            "medical",
        )
    else:
        add_card(
            "MEDIUM",
            "Rapid medical response deployment",
            "Basic first aid + on-site triage start karo. Monitoring for dehydration/infection; referral criteria establish karo.",
            "1-3 hr",
            "medical",
        )

    # Logistics
    if road_blocked:
        add_card(
            "HIGH",
            "Alternate logistics route activation",
            "Main road blocked hai—alternate routes identify karo. Supply ko boat/air/temporary access se move karke PWD aur traffic control ko update do.",
            "1-3 hr",
            "logistics",
        )
    else:
        add_card(
            "MEDIUM",
            "Establish supply logistics chain",
            "Warehousing + distribution points finalize karo. Inventory tracking start karo for food, water, medicines, and rescue equipment.",
            "1-3 hr",
            "logistics",
        )

    # Communication
    add_card(
        "MEDIUM",
        "Emergency communication hub setup",
        "Satellite phones + radio relay points on karo. DM office, SDRF, aur media briefing schedule coordinate karo.",
        "1-3 hr",
        "communication",
    )

    # Relief camp
    add_card(
        "MEDIUM" if severity != "CRITICAL" else "LOW",
        "Relief camp & registration counters",
        "Nearest safe school/community hall choose karo. Food, water, blankets 72hr ke liye arrange, registration counter open, family reunification process start.",
        "3-6 hr",
        "relief",
    )

    # Ensure at least 5 action cards for CRITICAL
    if severity == "CRITICAL" and len(action_cards) < 5:
        add_card(
            "HIGH",
            "Mass casualty coordination with HQ",
            "Incident command establish karo. Command staff district HQ se regular SITREP update schedule karein.",
            "0-1 hr",
            "communication",
        )

    # Timeline phases (4 items)
    timeline: List[Dict[str, Any]] = [
        {
            "time": "0-1 hr",
            "label": "Rescue & Immediate Triage",
            "active": True,
            "tasks": ["Search & rescue deploy", "Evacuation routes secure", "Medical triage start"],
        },
        {
            "time": "1-3 hr",
            "label": "Medical & Logistics Stabilization",
            "active": False,
            "tasks": ["Field hospital stabilize", "Supply routes confirm", "Communication hub operational"],
        },
        {
            "time": "3-6 hr",
            "label": "Relief Operations Expansion",
            "active": False,
            "tasks": ["Relief camp operational", "Food & water distribution", "Registration & reunification"],
        },
        {
            "time": "6-24 hr",
            "label": "Recovery & Situation Reporting",
            "active": False,
            "tasks": ["Infrastructure assessment", "Recovery begin", "HQ situation report"],
        },
    ]

    # Resources (4-6 items)
    rescue_personnel = max(8, affected // 15)
    boats_units = max(2, affected // 50)
    medical_staff = max(6, injured // 3)
    vehicles_units = max(4, affected // 30)

    resources: List[Dict[str, Any]] = [
        {"label": "Rescue Personnel", "value": str(rescue_personnel), "unit": "personnel", "urgency": "immediate"},
        {"label": "Rescue Boats", "value": str(boats_units), "unit": "units", "urgency": "within_1hr"},
        {"label": "Medical Staff", "value": str(medical_staff), "unit": "personnel", "urgency": "immediate"},
        {"label": "Vehicles", "value": str(vehicles_units), "unit": "units", "urgency": "within_1hr"},
        {
            "label": "Water (liters)",
            "value": str(max(1000, affected * 10)),
            "unit": "liters",
            "urgency": "within_1hr",
        },
        {
            "label": "Relief Supplies",
            "value": str(max(5, affected // 40)),
            "unit": "tonnes",
            "urgency": "within_3hr",
        },
    ]

    risk_zones: List[str] = [
        f"Zone A — {location} main hazard area",
        f"Zone B — proximity risk around {disaster_type.lower()} site",
        "Zone C — blocked road/supply chokepoints",
    ]
    if road_blocked:
        risk_zones[2] = "Zone C — blocked road supply chokepoints"

    replan_triggers: List[str] = [
        "New casualties or missing reports",
        "Road access loss / route blockage changes",
        "Weather conditions worsening",
        "Additional villages affected",
        "Infrastructure collapse or dam breach",
    ]

    # Compute confidence components
    data_completeness = 0
    data_completeness += 30 if affected is not None else 0
    data_completeness += 25 if injured is not None else 0
    data_completeness += 20 if location != "Field Location" else 10
    data_completeness += 25 if disaster_type != "Natural Disaster" else 15
    rule_certainty = 80 if severity in {"HIGH", "CRITICAL"} else 65
    ai_confidence = 0
    confidence = compute_confidence_from_components(data_completeness, rule_certainty, ai_confidence)

    # Immediate action must be <=10 words best-effort
    immediate_action: str = truncate_words(f"Evacuate affected people from {location} now", max_words=10)

    generated_at: str = datetime.utcnow().isoformat()
    elapsed_override = processing_time_ms if processing_time_ms >= 0 else int((time.time() - start) * 1000)

    summary: str = (
        f"{disaster_type} situation for {location} detected. "
        f"Approx {affected} affected, {injured} injured, and {missing} missing people need rapid response."
    )

    result: Dict[str, Any] = {
        "disaster_type": disaster_type,
        "severity": severity,
        "affected_people": affected,
        "injured": injured,
        "missing": missing,
        "location": location,
        "coordinates": None,
        "confidence": confidence,
        "ai_powered": False,
        "summary": summary,
        "immediate_action": immediate_action,
        "action_cards": action_cards[: max(5, len(action_cards))],
        "timeline": timeline,
        "resources": resources,
        "risk_zones": risk_zones,
        "replan_triggers": replan_triggers,
        "generated_at": generated_at,
        "processing_time_ms": int(elapsed_override),
    }

    # Ensure schema minimums
    for card in result["action_cards"]:
        card["priority"] = sanitize_risk_level(card.get("priority", severity))
        card["confidence"] = clamp_int(card.get("confidence", 80), 0, 100)
    result["confidence"] = clamp_int(result.get("confidence", 60), 0, 100)
    if severity == "CRITICAL" and len(result["action_cards"]) < 5:
        # Final guarantee
        result["action_cards"] = result["action_cards"] + [
            {
                "priority": "HIGH",
                "title": "Additional district coordination",
                "detail": "District HQ ko situation report bhejo aur additional teams request karo.",
                "time": "0-1 hr",
                "color": "#FF6F00",
                "confidence": 80,
                "category": "communication",
            }
        ]

    return result


def normalize_analysis_output(raw: Dict[str, Any], analysis_id: str, analysis_type: str, prompt_text: str, processing_time_ms: int, ai_powered: bool) -> AnalysisResult:
    """Normalize any dict (LLM or fallback) into strict AnalysisResult."""
    try:
        severity: str = sanitize_risk_level(raw.get("severity", "MEDIUM"))
        affected_people: int = clamp_int(raw.get("affected_people", 0), 0, 100000000)
        injured: int = clamp_int(raw.get("injured", 0), 0, 100000000)
        missing: int = clamp_int(raw.get("missing", 0), 0, 100000000)
        location: str = str(raw.get("location") or "Field Location")
        coordinates_val: Optional[str] = raw.get("coordinates", None)
        if coordinates_val in ("", "null"):
            coordinates_val = None

        confidence_val: int = clamp_int(raw.get("confidence", 60), 0, 100)

        # Compute confidence matrix per spec using components
        data_completeness = 0
        data_completeness += 35 if affected_people > 0 else 10
        data_completeness += 25 if injured >= 0 else 10
        data_completeness += 20 if missing >= 0 else 10
        data_completeness += 20 if location != "Field Location" else 10
        rule_certainty = 75 if severity in {"HIGH", "CRITICAL"} else 60
        ai_confidence = clamp_int(confidence_val if ai_powered else 0, 0, 100)
        final_confidence = compute_confidence_from_components(data_completeness, rule_certainty, ai_confidence)

        summary: str = str(raw.get("summary") or "").strip()
        if not summary:
            summary = f"{raw.get('disaster_type', 'Disaster')} situation reported for {location}. Rapid action required."
        immediate_action: str = str(raw.get("immediate_action") or f"Act immediately in {location}").strip()
        immediate_action = truncate_words(immediate_action, max_words=10)

        # Normalize action cards
        raw_cards: Any = raw.get("action_cards", [])
        action_cards: List[ActionCard] = []
        if isinstance(raw_cards, list):
            for c in raw_cards:
                if not isinstance(c, dict):
                    continue
                priority = sanitize_risk_level(c.get("priority", severity))
                action_cards.append(
                    ActionCard(
                        priority=priority,
                        title=str(c.get("title", "Immediate action")).strip(),
                        detail=str(c.get("detail", "Implement required steps.")).strip(),
                        time=str(c.get("time", "0-1 hr")).strip(),
                        color=str(c.get("color") or "#FF6F00").strip(),
                        confidence=clamp_int(c.get("confidence", _confidence_for_action_card(priority)), 0, 100),
                        category=str(c.get("category", "logistics")).strip(),
                    )
                )

        # Fallback card set guarantee
        if severity == "CRITICAL" and len(action_cards) < 5:
            action_cards = action_cards[:]
            while len(action_cards) < 5:
                action_cards.append(
                    ActionCard(
                        priority="HIGH",
                        title="Reinforce incident command",
                        detail="Incident command operational karo. Additional teams request aur resource tracking update karo.",
                        time="0-1 hr",
                        color="#FF6F00",
                        confidence=80,
                        category="communication",
                    )
                )

        if not action_cards:
            # Last resort fallback
            fallback = build_fallback_response(prompt_text, analysis_id, analysis_type, processing_time_ms)
            return normalize_analysis_output(fallback, analysis_id, analysis_type, prompt_text, processing_time_ms, False)

        # Normalize timeline
        raw_timeline: Any = raw.get("timeline", [])
        timeline: List[TimelineItem] = []
        if isinstance(raw_timeline, list):
            for t in raw_timeline:
                if not isinstance(t, dict):
                    continue
                tasks_any = t.get("tasks", [])
                tasks: List[str] = tasks_any if isinstance(tasks_any, list) else [str(tasks_any)]
                timeline.append(
                    TimelineItem(
                        time=str(t.get("time", "0-1 hr")),
                        label=str(t.get("label", "Phase")).strip(),
                        active=bool(t.get("active", False)),
                        tasks=[str(x).strip() for x in tasks if str(x).strip()],
                    )
                )

        if len(timeline) != 4:
            # Enforce 4 phases
            fallback = build_fallback_response(prompt_text, analysis_id, analysis_type, processing_time_ms)
            timeline = [TimelineItem(**x) for x in fallback["timeline"]]

        # Normalize resources
        raw_resources: Any = raw.get("resources", [])
        resources: List[Resource] = []
        if isinstance(raw_resources, list):
            for r in raw_resources:
                if not isinstance(r, dict):
                    continue
                resources.append(
                    Resource(
                        label=str(r.get("label", "Resource")).strip(),
                        value=str(r.get("value", "0")).strip(),
                        unit=str(r.get("unit", "units")).strip(),
                        urgency=str(r.get("urgency", "within_3hr")).strip(),
                    )
                )

        if not resources:
            fallback = build_fallback_response(prompt_text, analysis_id, analysis_type, processing_time_ms)
            resources = [Resource(**x) for x in fallback["resources"]]

        risk_zones: List[str] = []
        raw_risk = raw.get("risk_zones", [])
        if isinstance(raw_risk, list):
            risk_zones = [str(x).strip() for x in raw_risk if str(x).strip()]
        if not risk_zones:
            risk_zones = [f"Zone — {location} hazard"]

        replan_triggers: List[str] = []
        raw_triggers = raw.get("replan_triggers", [])
        if isinstance(raw_triggers, list):
            replan_triggers = [str(x).strip() for x in raw_triggers if str(x).strip()]
        if not replan_triggers:
            replan_triggers = ["New casualty reports", "Route blockage update", "Weather worsening"]

        generated_at: str = str(raw.get("generated_at") or datetime.utcnow().isoformat())
        result = AnalysisResult(
            disaster_type=str(raw.get("disaster_type", "Natural Disaster")).strip(),
            severity=severity,
            affected_people=affected_people,
            injured=injured,
            missing=missing,
            location=location,
            coordinates=coordinates_val,
            confidence=final_confidence,
            ai_powered=bool(ai_powered),
            summary=summary,
            immediate_action=immediate_action,
            action_cards=action_cards,
            timeline=timeline,
            resources=resources,
            risk_zones=risk_zones,
            replan_triggers=replan_triggers,
            generated_at=generated_at,
            processing_time_ms=int(processing_time_ms),
        )
        return result
    except HTTPException:
        raise
    except Exception:
        # Never crash: fallback normalization
        fallback = build_fallback_response(prompt_text, analysis_id, analysis_type, processing_time_ms)
        return AnalysisResult(**fallback)


def call_ollama(prompt: str, retry: int = 2) -> Tuple[Dict[str, Any], bool]:
    """Call Ollama API with retry and strict JSON extraction + fallback."""
    last_exc: Optional[Exception] = None
    # Total attempts = retry + 1
    for attempt in range(retry + 1):
        try:
            started = time.time()
            response = requests.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": f"{NEURIX_SYSTEM_PROMPT}\n\nDISASTER REPORT:\n{prompt}",
                    "stream": False,
                    "options": {"temperature": 0.1, "num_predict": 2000, "top_p": 0.9},
                },
                timeout=OLLAMA_TIMEOUT,
            )
            response.raise_for_status()
            elapsed_ms: int = int((time.time() - started) * 1000)
            raw_text: str = str(response.json().get("response", ""))

            # Parse and validate
            parsed: Optional[Dict[str, Any]] = None
            # Attempt 1: direct extraction
            parsed = _extract_json_candidate(raw_text)
            if not parsed:
                # Attempt 2: clean markdown fences and retry parse
                cleaned: str = re.sub(r"```(?:json)?", "", raw_text, flags=re.IGNORECASE).replace("```", "")
                parsed = _extract_json_candidate(cleaned)

            if not parsed:
                raise ValueError("AI response samajh nahi aaya")

            parsed["processing_time_ms"] = elapsed_ms
            parsed["generated_at"] = datetime.utcnow().isoformat()
            return parsed, True
        except requests.exceptions.Timeout as exc:
            last_exc = exc
            logger.warning(f"Ollama timeout attempt {attempt + 1}/{retry + 1}")
        except requests.exceptions.ConnectionError as exc:
            last_exc = exc
            logger.warning("Ollama not running — using fallback")
            break
        except (json.JSONDecodeError, ValueError) as exc:
            last_exc = exc
            logger.warning(f"Ollama JSON parse failed attempt {attempt + 1}: {str(exc)}")
        except requests.exceptions.RequestException as exc:
            last_exc = exc
            logger.warning(f"Ollama request error attempt {attempt + 1}: {str(exc)}")
        except Exception as exc:
            last_exc = exc
            logger.error(f"Ollama unexpected error attempt {attempt + 1}: {str(exc)}")

    # Fallback
    # Endpoints will build the rule-based fallback using build_fallback_response(...).
    return {}, False


def _build_fallback_if_needed(raw: Dict[str, Any], prompt: str, analysis_id: str, analysis_type: str, processing_time_ms: int, ai_powered: bool) -> Dict[str, Any]:
    """Wrap fallback dict into strict response format."""
    if ai_powered:
        return raw
    return build_fallback_response(prompt, analysis_id=analysis_id, analysis_type=analysis_type, processing_time_ms=processing_time_ms)


def _action_diff_changes(old_cards: List[Dict[str, Any]], new_cards: List[Dict[str, Any]]) -> List[str]:
    """Compute simple diff of action cards by title and content."""
    old_by_title: Dict[str, Dict[str, Any]] = {}
    new_by_title: Dict[str, Dict[str, Any]] = {}
    for c in old_cards:
        if isinstance(c, dict):
            title = str(c.get("title", "")).strip()
            if title:
                old_by_title[title] = c
    for c in new_cards:
        if isinstance(c, dict):
            title = str(c.get("title", "")).strip()
            if title:
                new_by_title[title] = c
    changes: List[str] = []
    for title, card in new_by_title.items():
        if title not in old_by_title:
            changes.append(f"New: {title}")
        elif card != old_by_title[title]:
            changes.append(f"Modified: {title}")
    for title in old_by_title.keys():
        if title not in new_by_title:
            changes.append(f"Removed: {title}")
    if not changes:
        changes.append("No action card changes detected")
    return changes


@app.middleware("http")
async def log_requests_and_responses(request: Request, call_next: Any) -> JSONResponse:
    """Log every HTTP request and response via Loguru."""
    start = time.time()
    try:
        response = await call_next(request)
        elapsed_ms = int((time.time() - start) * 1000)
        # Best-effort user extraction (do not verify here)
        auth_header = request.headers.get("authorization", "")
        user_hint = "anonymous"
        if auth_header.lower().startswith("bearer "):
            user_hint = "bearer_present"
        logger.info(
            f"{request.method} {request.url.path} | user={user_hint} | status={response.status_code} | {elapsed_ms}ms"
        )
        return response  # type: ignore[return-value]
    except Exception as exc:
        elapsed_ms = int((time.time() - start) * 1000)
        logger.error(f"Request failed: {request.method} {request.url.path} | {elapsed_ms}ms | err={str(exc)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "detail": "Internal error ho gaya"},
        )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(_: Request, __: RateLimitExceeded) -> JSONResponse:
    """Handle slowapi rate limit errors consistently."""
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"success": False, "detail": "Request limit exceeded. 1 minute baad try karo."},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    """Handle HTTPException with consistent JSON response."""
    logger.warning(f"HTTP error {exc.status_code}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "detail": exc.detail},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions without leaking internal details."""
    logger.exception(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "detail": "Server internal error. Contact support."},
    )


def _health_check_ollama() -> Tuple[str, Optional[str]]:
    """Ping Ollama tags endpoint to check whether it is reachable."""
    try:
        resp = requests.get(OLLAMA_HEALTH_URL, timeout=3)
        if resp.status_code != 200:
            return "offline", None
        # Response includes models list; try to locate requested model
        payload = resp.json()
        models = payload.get("models", []) if isinstance(payload, dict) else []
        if isinstance(models, list):
            for m in models:
                name = None
                if isinstance(m, dict):
                    name = m.get("name")
                if name == OLLAMA_MODEL:
                    return "online", OLLAMA_MODEL
        return "online", OLLAMA_MODEL
    except Exception:
        return "offline", None


@app.on_event("startup")
async def startup_event() -> None:
    """FastAPI startup hook to log system readiness."""
    global APP_START_TIME
    APP_START_TIME = datetime.utcnow()
    logger.info("NEURIX API v2.0 starting...")
    logger.info("Checking Ollama connection...")
    ollama_status, _ = _health_check_ollama()
    if ollama_status == "online":
        logger.info("Ollama online — AI mode active")
    else:
        logger.info("Ollama offline — Fallback engine active")
    logger.info("NEURIX ready to serve NDRF field teams")


@app.get("/")
@limiter.limit("10/minute")
def root_info() -> Dict[str, Any]:
    """Root endpoint returning API info (no auth)."""
    try:
        endpoints: List[str] = [
            "/auth/login",
            "/auth/me",
            "/analyze/text",
            "/analyze/pdf",
            "/analyze/voice",
            "/analyze/manual",
            "/replan",
            "/history",
            "/history/{id}",
            "/health",
        ]
        return {
            "success": True,
            "data": {
                "name": "NEURIX",
                "version": "2.0.0",
                "tagline": "Offline AI Disaster Decision Engine",
                "endpoints": endpoints,
                "status": "operational",
            },
        }
    except Exception as exc:
        logger.error(f"Root endpoint error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Server internal error ho gaya")


@app.get("/health")
@limiter.limit("10/minute")
def health_check() -> Dict[str, Any]:
    """System health check — Ollama status + uptime."""
    try:
        ollama_state, ollama_model = _health_check_ollama()
        uptime_seconds: int = int((datetime.utcnow() - APP_START_TIME).total_seconds())
        uptime: str = f"{uptime_seconds}s"
        return {
            "success": True,
            "status": "ok",
            "ollama": ollama_state,
            "ollama_status": "online" if ollama_state == "online" else "offline",
            "model": OLLAMA_MODEL,
            "version": "2.0.0",
            "timestamp": datetime.utcnow().isoformat(),
            "uptime": uptime,
            "fallback_engine": "active",
            "total_analyses": len(HISTORY),
        }
    except Exception as exc:
        logger.error(f"/health error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Health check error ho gaya")


@app.post("/auth/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def login(req: LoginRequest) -> LoginResponse:
    """Login endpoint returning JWT token (no auth required)."""
    try:
        user = USERS.get(req.username)
        if not user or not verify_password(req.password, str(user.get("password_hash", ""))):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Username ya password galat hai")
        token = create_token(
            {
                "sub": user["username"],
                "role": user["role"],
                "name": user["name"],
                "badge": user["badge"],
            }
        )
        expires_in = f"{TOKEN_EXPIRE_HOURS}h"
        logger.info(f"Login success | user={req.username} role={user['role']}")
        return LoginResponse(
            token=token,
            role=user["role"],
            name=user["name"],
            badge=user["badge"],
            expires_in=expires_in,
            message="Login successful",
        )
    except HTTPException:
        logger.warning("Login failed")
        raise
    except Exception as exc:
        logger.error(f"Login error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication error ho gaya")


@app.get("/auth/me")
@limiter.limit("10/minute")
def get_me(user_payload: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
    """Get current user info from token."""
    try:
        username = str(user_payload.get("sub", ""))
        user = USERS.get(username)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication fail hua")
        return {
            "success": True,
            "data": {
                "username": username,
                "name": user["name"],
                "role": user["role"],
                "badge": user["badge"],
                "created_at": user["created_at"],
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/auth/me error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication me error ho gaya")


def _build_analysis_response(
    analysis_id: str,
    analysis_type: str,
    result: AnalysisResult,
) -> AnalysisResponse:
    """Build AnalysisResponse wrapper."""
    return AnalysisResponse(success=True, data=result, id=analysis_id, analysis_type=analysis_type)


@app.post("/analyze/text", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def analyze_text(
    request: Request,
    text: str = Form(...),
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> AnalysisResponse:
    """Analyze text disaster report."""
    try:
        username = str(user_payload.get("sub", ""))
        safe_text = sanitize_input(text)
        language = detect_language_simple(safe_text)
        normalized = normalize_to_english_like(safe_text) if language == "hi" else safe_text

        analysis_id = str(uuid.uuid4())
        started = time.time()

        raw, ai_powered = call_ollama(normalized)
        elapsed_ms = int((time.time() - started) * 1000)
        if ai_powered:
            result = normalize_analysis_output(raw, analysis_id, "text", safe_text, elapsed_ms, True)
        else:
            prompt_used = normalized
            fallback_raw = build_fallback_response(prompt_used, analysis_id=analysis_id, analysis_type="text", processing_time_ms=elapsed_ms)
            result = AnalysisResult(**fallback_raw)

        # Ensure strict timestamps and processing time
        result.generated_at = result.generated_at or datetime.utcnow().isoformat()
        result.processing_time_ms = elapsed_ms

        record: Dict[str, Any] = {
            "id": analysis_id,
            "type": "text",
            "input": safe_text,
            "output": result.model_dump(),
            "timestamp": datetime.utcnow().isoformat(),
            "user": username,
        }
        add_to_history(record)
        logger.info(
            f"Text analysis complete | user={username} severity={result.severity} confidence={result.confidence}"
        )
        return _build_analysis_response(analysis_id, "text", result)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/analyze/text error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI response samajh nahi aaya, fallback fail ho gaya")


def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract text from PDF using PyMuPDF; raise ValueError if no text."""
    doc = None
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        full_text_parts: List[str] = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            full_text_parts.append(page.get_text())
        full_text = " ".join(full_text_parts)
        cleaned = " ".join(full_text.split())
        if not cleaned.strip():
            raise ValueError("PDF mein readable text nahi mila")
        return cleaned[:MAX_PDF_CHARS]
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"PDF parse error: {str(exc)}")
    finally:
        try:
            if doc is not None:
                doc.close()
        except Exception:
            pass


@app.post("/analyze/pdf", response_model=AnalysisResponse)
@limiter.limit("5/minute")
async def analyze_pdf(
    request: Request,
    file: UploadFile = File(...),
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> AnalysisResponse:
    """Analyze PDF disaster report."""
    try:
        username = str(user_payload.get("sub", ""))
        content_type = str(file.content_type or "")
        filename = str(file.filename or "")
        if "pdf" not in filename.lower() and "application/pdf" not in content_type.lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PDF file diya hai nahi")

        content = await file.read()
        if not content:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PDF empty hai")

        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PDF size limit se zyada hai")

        extracted_text = extract_pdf_text(content)
        if not extracted_text.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PDF me text nahi mila")

        analysis_id = str(uuid.uuid4())
        started = time.time()
        raw, ai_powered = call_ollama(extracted_text)
        elapsed_ms = int((time.time() - started) * 1000)

        if ai_powered:
            result = normalize_analysis_output(raw, analysis_id, "pdf", extracted_text, elapsed_ms, True)
        else:
            fallback_raw = build_fallback_response(extracted_text, analysis_id=analysis_id, analysis_type="pdf", processing_time_ms=elapsed_ms)
            result = AnalysisResult(**fallback_raw)

        result.generated_at = result.generated_at or datetime.utcnow().isoformat()
        result.processing_time_ms = elapsed_ms

        record = {
            "id": analysis_id,
            "type": "pdf",
            "filename": filename,
            "input": filename,
            "output": result.model_dump(),
            "timestamp": datetime.utcnow().isoformat(),
            "user": username,
        }
        add_to_history(record)
        logger.info(f"PDF analysis complete | user={username} file={filename} severity={result.severity}")
        return _build_analysis_response(analysis_id, "pdf", result)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.error(f"/analyze/pdf error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="PDF analysis internal error ho gaya")


@app.post("/analyze/voice", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def analyze_voice(
    request: Request,
    text: str = Form(...),
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> AnalysisResponse:
    """Analyze voice transcription (offline: treat provided text as transcript)."""
    try:
        username = str(user_payload.get("sub", ""))
        safe_text = sanitize_input(text)
        normalized = normalize_to_english_like(safe_text) if detect_language_simple(safe_text) == "hi" else safe_text

        analysis_id = str(uuid.uuid4())
        started = time.time()

        # Add voice context
        prompt = f"Voice input from field officer: {normalized}"
        raw, ai_powered = call_ollama(prompt)
        elapsed_ms = int((time.time() - started) * 1000)
        if ai_powered:
            result = normalize_analysis_output(raw, analysis_id, "voice", safe_text, elapsed_ms, True)
        else:
            fallback_raw = build_fallback_response(prompt, analysis_id=analysis_id, analysis_type="voice", processing_time_ms=elapsed_ms)
            result = AnalysisResult(**fallback_raw)

        result.generated_at = result.generated_at or datetime.utcnow().isoformat()
        result.processing_time_ms = elapsed_ms

        record = {
            "id": analysis_id,
            "type": "voice",
            "input": safe_text,
            "output": result.model_dump(),
            "timestamp": datetime.utcnow().isoformat(),
            "user": username,
        }
        add_to_history(record)
        logger.info(f"Voice analysis complete | user={username} severity={result.severity}")
        return _build_analysis_response(analysis_id, "voice", result)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/analyze/voice error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Voice analysis internal error ho gaya")


@app.post("/analyze/manual", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def analyze_manual(
    request: Request,
    disaster_type: str = Form(...),
    location: str = Form(...),
    people: str = Form(...),
    severity: str = Form(...),
    details: str = Form(""),
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> AnalysisResponse:
    """Analyze manual form input (field report with structured inputs)."""
    try:
        username = str(user_payload.get("sub", ""))
        safe_disaster_type = sanitize_input(disaster_type)
        safe_location = sanitize_input(location)
        safe_details = sanitize_input(details) if str(details).strip() else ""
        safe_severity = sanitize_risk_level(severity)

        people_str = str(people).strip()
        people_int = int(people_str) if people_str.isdigit() else None
        if people_int is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="People number galat diya hai")

        prompt = (
            "NDRF Field Report:\n"
            f"Disaster Type: {safe_disaster_type}\n"
            f"Location: {safe_location}\n"
            f"Estimated Affected: {people_int} people\n"
            f"Reported Severity: {safe_severity}\n"
            f"Field Officer Notes: {safe_details}\n"
            "Generate complete emergency response plan."
        )

        analysis_id = str(uuid.uuid4())
        started = time.time()
        raw, ai_powered = call_ollama(prompt)
        elapsed_ms = int((time.time() - started) * 1000)
        if ai_powered:
            result = normalize_analysis_output(raw, analysis_id, "manual", prompt, elapsed_ms, True)
        else:
            fallback_raw = build_fallback_response(prompt, analysis_id=analysis_id, analysis_type="manual", processing_time_ms=elapsed_ms)
            result = AnalysisResult(**fallback_raw)

        result.generated_at = result.generated_at or datetime.utcnow().isoformat()
        result.processing_time_ms = elapsed_ms

        record = {
            "id": analysis_id,
            "type": "manual",
            "input": {"disaster_type": safe_disaster_type, "location": safe_location, "people": people_int, "severity": safe_severity},
            "output": result.model_dump(),
            "timestamp": datetime.utcnow().isoformat(),
            "user": username,
        }
        add_to_history(record)
        logger.info(f"Manual analysis complete | user={username} severity={result.severity}")
        return _build_analysis_response(analysis_id, "manual", result)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/analyze/manual error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Manual analysis internal error ho gaya")


@app.post("/replan", response_model=ReplanResponse)
@limiter.limit("10/minute")
async def replan(
    request: Request,
    original_id: str = Form(...),
    update_text: str = Form(...),
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> ReplanResponse:
    """Dynamic replanning — update existing plan."""
    try:
        username = str(user_payload.get("sub", ""))
        safe_update = sanitize_input(update_text)
        safe_original_id = str(original_id).strip()

        original_record: Optional[Dict[str, Any]] = None
        for r in reversed(HISTORY):
            if str(r.get("id")) == safe_original_id and r.get("user") == username:
                original_record = r
                break

        if not original_record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Previous analysis nahi mila")

        original_output: Dict[str, Any] = original_record.get("output", {})
        original_summary: str = str(original_output.get("summary", "N/A"))
        original_severity: str = sanitize_risk_level(str(original_output.get("severity", "MEDIUM")))
        original_location: str = str(original_output.get("location", "Field Location"))

        update_prompt = (
            "SITUATION UPDATE for existing disaster response:\n\n"
            f"Original Situation: {original_summary}\n"
            f"Original Severity: {original_severity}\n"
            f"Location: {original_location}\n\n"
            "NEW UPDATE FROM FIELD:\n"
            f"{safe_update}\n\n"
            "Generate UPDATED emergency response plan.\n"
            "Mark which actions are NEW vs UNCHANGED.\n"
            "Reassess severity based on new information."
        )

        analysis_id = str(uuid.uuid4())
        started = time.time()
        raw, ai_powered = call_ollama(update_prompt)
        elapsed_ms = int((time.time() - started) * 1000)

        if ai_powered:
            new_result = normalize_analysis_output(raw, analysis_id, "replan", update_prompt, elapsed_ms, True)
        else:
            fallback_raw = build_fallback_response(update_prompt, analysis_id=analysis_id, analysis_type="replan", processing_time_ms=elapsed_ms)
            new_result = AnalysisResult(**fallback_raw)

        new_result.processing_time_ms = elapsed_ms
        changes = _action_diff_changes(
            old_cards=original_output.get("action_cards", []),
            new_cards=new_result.model_dump().get("action_cards", []),
        )
        delta_summary = (
            f"Replan done: {len(changes)} change(s) detected. "
            f"New severity: {new_result.severity}."
        )

        record = {
            "id": analysis_id,
            "type": "replan",
            "input": {"original_id": safe_original_id, "update_text": safe_update},
            "output": new_result.model_dump(),
            "timestamp": datetime.utcnow().isoformat(),
            "user": username,
        }
        add_to_history(record)
        logger.info(f"Replan complete | user={username} changes={len(changes)}")

        return ReplanResponse(success=True, data=new_result, id=analysis_id, changes=changes, delta_summary=delta_summary)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/replan error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Replan internal error ho gaya")


@app.get("/history", response_model=Dict[str, Any])
@limiter.limit("10/minute")
def get_history(user_payload: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
    """Get analysis history for current user."""
    try:
        username = str(user_payload.get("sub", ""))
        user_records: List[Dict[str, Any]] = [r for r in HISTORY if r.get("user") == username]
        user_records_sorted: List[Dict[str, Any]] = sorted(user_records, key=lambda r: r.get("timestamp", ""), reverse=True)
        recent = user_records_sorted[:20]
        data = [
            {
                "id": r.get("id"),
                "type": r.get("type"),
                "timestamp": r.get("timestamp"),
                "input": r.get("input"),
                "output": (r.get("output") or {}),
            }
            for r in recent
        ]
        return {"success": True, "user": username, "total": len(user_records), "data": data}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/history error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="History error ho gaya")


@app.get("/history/{item_id}", response_model=Dict[str, Any])
@limiter.limit("10/minute")
def get_history_item(
    item_id: str,
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> Dict[str, Any]:
    """Get single history item by id for current user."""
    try:
        username = str(user_payload.get("sub", ""))
        safe_item_id = str(item_id).strip()
        for r in reversed(HISTORY):
            if str(r.get("id")) == safe_item_id and r.get("user") == username:
                return {"success": True, "data": r}
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record nahi mila")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/history/{item_id} error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="History item error ho gaya")


@app.delete("/history/{item_id}", response_model=Dict[str, Any])
@limiter.limit("10/minute")
def delete_history_item(
    item_id: str,
    user_payload: Dict[str, Any] = Depends(verify_token),
) -> Dict[str, Any]:
    """Delete a history record for the current user."""
    try:
        username = str(user_payload.get("sub", ""))
        safe_item_id = str(item_id).strip()
        global HISTORY
        before = len(HISTORY)
        HISTORY = [r for r in HISTORY if not (str(r.get("id")) == safe_item_id and r.get("user") == username)]
        after = len(HISTORY)
        if after == before:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record nahi mila")
        return {"success": True, "message": "Record deleted"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"/history/{item_id} delete error: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Delete error ho gaya")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True, log_level="info")

