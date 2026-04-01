import requests
import json
import uuid
import sys
import os
from datetime import datetime
from loguru import logger

# Ensure we can import from the backend directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import SessionLocal, init_db
from db.models import HospitalStatus

def save_hospitals_to_db(hospitals_data):
    db = SessionLocal()
    try:
        inserted = 0
        updated = 0
        for data in hospitals_data:
            h_id = f"OSM_{data['osm_id']}"
            existing = db.query(HospitalStatus).filter(HospitalStatus.id == h_id).first()
            
            if existing:
                # Update beds or info
                existing.beds_available = data['beds_free']
                existing.icu_available = data['icu_free']
                existing.updated_at = datetime.utcnow()
                updated += 1
            else:
                new_hospital = HospitalStatus(
                    id=h_id,
                    name=data['name'],
                    latitude=data['lat'],
                    longitude=data['lng'],
                    address=data['phone'],  # Storing phone in address for demo purposes
                    beds_available=data['beds_free'],
                    icu_available=data['icu_free'],
                    doctors_available=max(1, data['icu_total']),
                    specialization="multispecialty"
                )
                db.add(new_hospital)
                inserted += 1
        
        db.commit()
        logger.info(f"✅ DB SEED COMPLETE: Inserted {inserted} new, Updated {updated} existing hospitals.")
    except Exception as e:
        logger.error(f"❌ DB SEED FAILED: {str(e)}")
        db.rollback()
    finally:
        db.close()

def seed_hospitals_from_osm(lat: float, lng: float, radius_km: int = 50):
    """
    Query OpenStreetMap Overpass API for real hospitals and save to local DB.
    """
    logger.info(f"Initiating Global Satellite Scan for real medical facilities near {lat}, {lng} ({radius_km}km radius)...")
    
    overpass_query = f"""
    [out:json][timeout:30];
    (
      node["amenity"="hospital"](around:{radius_km * 1000},{lat},{lng});
      node["amenity"="clinic"](around:{radius_km * 1000},{lat},{lng});
      way["amenity"="hospital"](around:{radius_km * 1000},{lat},{lng});
    );
    out body center;
    """
    
    try:
        response = requests.post(
            'https://overpass-api.de/api/interpreter',
            data={'data': overpass_query},
            timeout=30
        )
        response.raise_for_status()
        elements = response.json().get('elements', [])
        
        hospitals = []
        for element in elements:
            tags = element.get('tags', {})
            name = tags.get('name')
            if not name:
                continue # Skip nameless nodes
                
            if element['type'] == 'node':
                h_lat, h_lng = element['lat'], element['lon']
            else:
                h_lat = element.get('center', {}).get('lat', 0)
                h_lng = element.get('center', {}).get('lon', 0)
                if h_lat == 0: continue
            
            # Estimate beds/capacity if missing for demonstration realism
            raw_beds = tags.get('beds')
            try:
                beds_total = int(raw_beds) if raw_beds and str(raw_beds).isdigit() else 500
            except:
                beds_total = 100
                
            hospital = {
                'osm_id': element['id'],
                'name': name,
                'lat': h_lat,
                'lng': h_lng,
                'phone': tags.get('phone', tags.get('contact:phone', '')),
                'beds_total': beds_total,
                'beds_free': beds_total // 2,
                'icu_total': max(5, beds_total // 10),
                'icu_free': max(2, beds_total // 20),
            }
            hospitals.append(hospital)
        
        logger.info(f"📡 Discovered {len(hospitals)} valid medical facilities. Syncing to Tactical DB...")
        save_hospitals_to_db(hospitals)
        return hospitals
        
    except Exception as e:
        logger.error(f"Failed to fetch data from OSM: {str(e)}")
        return []

if __name__ == "__main__":
    init_db()  # Ensure tables exist
    # Run for Chandigarh/Mohali base coordinates
    seed_hospitals_from_osm(lat=30.7333, lng=76.7794, radius_km=50)
