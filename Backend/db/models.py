from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from datetime import datetime
from db.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String)
    role = Column(String, default="volunteer")
    badge = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    
    # [MISSION_UPGRADE] Geospatial Tracking
    last_latitude = Column(Float, nullable=True)
    last_longitude = Column(Float, nullable=True)
    last_active_at = Column(DateTime, default=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class DisasterReport(Base):
    __tablename__ = "disaster_reports"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    source = Column(String, default="USER") # USER or SATELLITE
    disaster_type = Column(String)
    severity = Column(String)
    location = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    encrypted_data = Column(Text)
    raw_summary = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    data_json = Column(JSON) # Extended dynamic data
    sop_action_json = Column(JSON) # [NEW] Auto-suggested mission steps

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String)
    operator = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    prev_hash = Column(String)
    current_hash = Column(String)
    metadata_json = Column(JSON)

class VictimTriage(Base):
    __tablename__ = "victim_triage"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    age = Column(String)
    score = Column(Integer)
    tag = Column(String) # RED, YELLOW, GREEN
    label = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    details_json = Column(JSON)
    notes = Column(Text)

class ResourceInventory(Base):
    __tablename__ = "resource_inventory"
    id = Column(Integer, primary_key=True, index=True)
    item = Column(String, unique=True)
    available = Column(Integer, default=0)
    needed = Column(Integer, default=0)
    unit = Column(String, default="units")
    location = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String) # OK, LOW, CRITICAL
    updated_at = Column(DateTime, default=datetime.utcnow)

class ReliefLog(Base):
    __tablename__ = "relief_log"
    id = Column(String, primary_key=True, index=True)
    beneficiary_name = Column(String)
    village = Column(String)
    items_given = Column(String)
    quantity = Column(String)
    id_type = Column(String)
    id_number = Column(String)
    distributed_by = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

class RouteStatus(Base):
    __tablename__ = "route_status"
    id = Column(String, primary_key=True, index=True)
    route_name = Column(String)
    status = Column(String) # CLEAR, BLOCKED
    blocked_reason = Column(Text)
    alternative = Column(Text)
    reporter = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)


class HospitalStatus(Base):
    __tablename__ = "hospital_status"
    id = Column(String, primary_key=True, index=True)  # external id/place id
    name = Column(String, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    address = Column(String, nullable=True)
    beds_available = Column(Integer, default=0)
    icu_available = Column(Integer, default=0)
    doctors_available = Column(Integer, default=0)
    specialization = Column(String, default="general")
    updated_at = Column(DateTime, default=datetime.utcnow)


class AmbulanceUnit(Base):
    __tablename__ = "ambulance_units"
    id = Column(String, primary_key=True, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    status = Column(String, default="available")  # available/dispatched/offline
    crew = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)


class FieldUnit(Base):
    __tablename__ = "field_units"
    id = Column(String, primary_key=True, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    battery = Column(Integer, default=100)
    status = Column(String, default="active")
    unit_type = Column(String, default="FIELD_UNIT")  # FIELD_UNIT/RECON_DRONE/ANOMALY
    label = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)


class BlockedRoad(Base):
    __tablename__ = "blocked_roads"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=True)
    latitude = Column(Float)
    longitude = Column(Float)
    radius_m = Column(Integer, default=120)
    reason = Column(String, default="flood")
    severity = Column(String, default="high")
    reporter = Column(String, default="field")
    updated_at = Column(DateTime, default=datetime.utcnow)
class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    name = Column(String)
    relationship = Column(String)
    contact = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class CommunityPin(Base):
    __tablename__ = "community_pins"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    type = Column(String) # roadblock|landslide|flood_zone|hazard
    latitude = Column(Float)
    longitude = Column(Float)
    description = Column(Text, nullable=True)
    photo_url = Column(String, nullable=True)
    upvotes = Column(Integer, default=0)
    relay_count = Column(Integer, default=0)
    source = Column(String, default="user") # user|mesh|admin
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

class CommunityUpdate(Base):
    __tablename__ = "community_updates"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    type = Column(String)   # electricity|water|shop_open|medical
    status = Column(String) # available|outage|shortage
    title = Column(String)
    description = Column(Text, nullable=True)
    latitude = Column(Float)
    longitude = Column(Float)
    photo_url = Column(String, nullable=True)
    verified_by = Column(Integer, default=0)
    source = Column(String, default="user")
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)

class SOSEvent(Base):
    __tablename__ = "sos_events"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    accuracy = Column(Float, default=10.0)
    trigger_type = Column(String) # crash_detection|manual_sos
    blood_group = Column(String, nullable=True)
    allergies = Column(Text, nullable=True)
    photo_url = Column(String, nullable=True)
    battery = Column(Integer, nullable=True)
    sms_sent_to = Column(JSON, default=[]) # List of phone numbers
    status = Column(String, default="active") # active|resolved
    created_at = Column(DateTime, default=datetime.utcnow)

class DispatchLog(Base):
    __tablename__ = "dispatch_log"
    id = Column(String, primary_key=True, index=True)
    dispatcher_id = Column(String, index=True)
    ambulance_id = Column(String, index=True)
    hospital_id = Column(String, index=True)
    incident_type = Column(String)
    route_geojson = Column(JSON)
    eta_minutes = Column(Integer)
    status = Column(String, default="dispatched") # dispatched|arrived|completed
    created_at = Column(DateTime, default=datetime.utcnow)
