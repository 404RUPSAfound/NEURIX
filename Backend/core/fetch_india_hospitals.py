"""
Fetch ALL hospitals across India from OpenStreetMap Overpass API.
Saves real lat/lng data to india_hospitals.json
Run once when online: python fetch_india_hospitals.py
"""
import requests, json, time, os

OUTPUT = os.path.join(os.path.dirname(__file__), "india_hospitals.json")

STATES_BBOXES = [
    ("Andhra Pradesh",     12.6,  76.7,  19.9,  84.8),
    ("Arunachal Pradesh",  26.6,  91.5,  29.5,  97.4),
    ("Assam",              24.1,  89.7,  27.9,  96.0),
    ("Bihar",              24.3,  83.3,  27.5,  88.3),
    ("Chhattisgarh",       17.7,  80.2,  24.1,  84.4),
    ("Goa",                14.8,  73.6,  15.8,  74.4),
    ("Gujarat",            20.1,  68.1,  24.7,  74.5),
    ("Haryana",            27.6,  74.4,  30.9,  77.6),
    ("Himachal Pradesh",   30.3,  75.5,  33.2,  79.0),
    ("Jharkhand",          21.9,  83.3,  25.3,  87.9),
    ("Karnataka",          11.5,  74.1,  18.4,  78.6),
    ("Kerala",              8.1,  74.8,  12.8,  77.4),
    ("Madhya Pradesh",     21.1,  74.0,  26.9,  82.8),
    ("Maharashtra",        15.6,  72.6,  22.0,  80.9),
    ("Manipur",            23.8,  93.0,  25.7,  94.8),
    ("Meghalaya",          25.0,  89.8,  26.1,  92.8),
    ("Mizoram",            21.9,  92.2,  24.5,  93.5),
    ("Nagaland",           25.1,  93.3,  27.0,  95.2),
    ("Odisha",             17.8,  81.3,  22.6,  87.5),
    ("Punjab",             29.5,  73.8,  32.5,  76.9),
    ("Rajasthan",          23.0,  69.5,  30.2,  78.2),
    ("Sikkim",             27.0,  88.0,  28.1,  88.9),
    ("Tamil Nadu",          8.0,  76.2,  13.6,  80.3),
    ("Telangana",          15.8,  77.2,  19.9,  81.3),
    ("Tripura",            22.9,  91.1,  24.5,  92.4),
    ("Uttar Pradesh",      23.9,  77.1,  30.4,  84.6),
    ("Uttarakhand",        28.7,  77.6,  31.5,  81.0),
    ("West Bengal",        21.5,  85.8,  27.2,  89.9),
    ("Delhi",              28.4,  76.8,  28.9,  77.4),
    ("Jammu Kashmir",      32.3,  73.7,  37.1,  80.4),
    ("Ladakh",             32.0,  75.7,  35.7,  80.0),
    ("Andaman Nicobar",     6.7,  92.2,  13.7,  93.9),
    ("Chandigarh",         30.6,  76.7,  30.8,  76.9),
    ("Dadra Nagar Haveli",  20.1,  72.9,  20.4,  73.3),
    ("Daman Diu",          20.3,  72.8,  20.4,  73.0),
    ("Lakshadweep",         8.0,  71.7,  12.7,  74.0),
    ("Puducherry",         11.6,  79.5,  12.1,  80.0),
]

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

def fetch_hospitals_for_state(name, s, w, n, e):
    query = f"""
[out:json][timeout:60];
(
  node["amenity"="hospital"]({s},{w},{n},{e});
  way["amenity"="hospital"]({s},{w},{n},{e});
  node["amenity"="clinic"]({s},{w},{n},{e});
  node["healthcare"="hospital"]({s},{w},{n},{e});
);
out center tags;
"""
    try:
        r = requests.post(OVERPASS_URL, data=query.encode(), timeout=90)
        r.raise_for_status()
        elements = r.json().get("elements", [])
        hospitals = []
        for el in elements:
            lat = el.get("lat") or (el.get("center") or {}).get("lat")
            lng = el.get("lon") or (el.get("center") or {}).get("lon")
            tags = el.get("tags", {})
            h_name = tags.get("name") or tags.get("name:en") or "Hospital"
            if lat and lng:
                hospitals.append({
                    "id": f"osm_{el.get('type','n')}_{el.get('id',0)}",
                    "name": h_name,
                    "lat": round(float(lat), 6),
                    "lng": round(float(lng), 6),
                    "state": name,
                    "address": ", ".join(filter(None, [
                        tags.get("addr:full"),
                        tags.get("addr:street"),
                        tags.get("addr:city"),
                        tags.get("addr:district"),
                        tags.get("addr:state"),
                    ])) or name,
                })
        print(f"  ✅ {name}: {len(hospitals)} hospitals")
        return hospitals
    except Exception as ex:
        print(f"  ❌ {name} failed: {ex}")
        return []

def main():
    all_hospitals = []
    for state_data in STATES_BBOXES:
        name = state_data[0]
        s, w, n, e = state_data[1], state_data[2], state_data[3], state_data[4]
        print(f"Fetching {name}...")
        hospitals = fetch_hospitals_for_state(name, s, w, n, e)
        all_hospitals.extend(hospitals)
        time.sleep(2)  # Be polite to Overpass API

    # Deduplicate by id
    seen = set()
    unique = []
    for h in all_hospitals:
        if h["id"] not in seen:
            seen.add(h["id"])
            unique.append(h)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(unique, f, ensure_ascii=False, indent=2)

    print(f"\n✅ DONE! {len(unique)} hospitals saved to {OUTPUT}")

if __name__ == "__main__":
    main()
