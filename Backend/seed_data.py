import sys
import os
import uuid
import json
from datetime import datetime
sys.path.append(os.getcwd())
from db.database import SessionLocal, init_db
from db import models
from core.offline_intel import MASTER_PLAYBOOKS

def seed_real_data():
    init_db()
    db = SessionLocal()
    
    # Real-world historical scenarios for "Real Data" feel
    historical_cases = [
        {
            "id": "HST_KDR_2013",
            "user_id": "SYSTEM_ARCHIVE",
            "source": "SATELLITE",
            "disaster_type": "flood",
            "severity": "critical",
            "location": "Kedarnath, Uttarakhand",
            "latitude": 30.7346,
            "longitude": 79.0669,
            "summary": "Flash flood and glacial lake outburst. Massive structural damage to temple town. 5000+ casualties estimated in valley."
        },
        {
            "id": "HST_KRL_2018",
            "user_id": "SYSTEM_ARCHIVE",
            "source": "SATELLITE",
            "disaster_type": "flood",
            "severity": "high",
            "location": "Idukki, Kerala",
            "latitude": 9.8500,
            "longitude": 76.9700,
            "summary": "Abnormal monsoon rainfall. All 35 dams opened. Massive landslides initiated in hilly districts."
        },
        {
            "id": "HST_BHJ_2001",
            "user_id": "SYSTEM_ARCHIVE",
            "source": "SATELLITE",
            "disaster_type": "earthquake",
            "severity": "critical",
            "location": "Bhuj, Gujarat",
            "latitude": 23.2500,
            "longitude": 69.6600,
            "summary": "7.7 Magnitude quake. 20,000 deaths. Total infrastructure collapse in Kutch region."
        }
    ]

    for case in historical_cases:
        existing = db.query(models.DisasterReport).filter(models.DisasterReport.id == case["id"]).first()
        if not existing:
            # Generate tactical playbooks for these
            dtype = case["disaster_type"]
            playbook = MASTER_PLAYBOOKS.get(dtype, MASTER_PLAYBOOKS["default"])
            
            report = models.DisasterReport(
                id=case["id"],
                user_id=case["user_id"],
                source=case["source"],
                disaster_type=dtype,
                severity=case["severity"],
                location=case["location"],
                latitude=case["latitude"],
                longitude=case["longitude"],
                raw_summary=case["summary"],
                sop_action_json=playbook.get("action_cards", []),
                data_json={
                    "success": True,
                    "situation": {
                        "title": case["location"],
                        "severity": case["severity"].upper(),
                        "description": case["summary"],
                        "stats": {"affected": 15000, "injured": 5000, "villages": 45, "confidence": 100}
                    },
                    "action_cards": playbook.get("action_cards", []),
                    "timeline": playbook.get("timeline", []),
                    "resources": playbook.get("resources", [])
                }
            )
            db.add(report)
            print(f"Archived {case['id']} into Tactical Ledger.")
    
    db.commit()
    db.close()

if __name__ == "__main__":
    seed_real_data()
