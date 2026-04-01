from typing import Dict, Any

FLAHS_FLOOD_PLAYBOOK = {
    "disaster_type": "Flash Flood & Water-logging",
    "severity": "CRITICAL",
    "confidence": 99,
    "environmental_impact": "Severe structural inundation, heavily compromised soil stability, and active electrical hazards in waterlogged areas.",
    "infrastructure_status": "Road networks are heavily restricted. Power grid disabled in low-lying sectors. Water supply contaminated.",
    "tactical_advice": "Deploy shallow-water rescue boats. Cut main power grids to prevent mass electrocution. Activate high-ground shelters immediately.",
    "immediate_action": "Evacuate low-lying zones immediately and establish medical triage at the nearest high ground.",
    "doc_summary": "[OFFLINE INTEL DIRECTIVE] Massive surge reported. Infrastructure is submerged and civilians are stranded. Proceed with tactical aquatic rescue.",
    "action_cards": [
        {"priority": "URGENT", "title": "Power Grid Isolation", "detail": "Cut primary power links to submerged neighborhoods.", "time": "Immediate", "color": "#D32F2F", "confidence": 100, "category": "Infrastructure"},
        {"priority": "HIGH", "title": "Deploy Rescue Rafts", "detail": "Mobilize NDRF shallow-water rafts to critical coordinates.", "time": "+15 mins", "color": "#FF9800", "confidence": 95, "category": "Rescue"},
        {"priority": "MEDIUM", "title": "Airdrop Supply Lines", "detail": "Dispatch IAF choppers with rations/medicines.", "time": "+2 hours", "color": "#1976D2", "confidence": 80, "category": "Logistics"}
    ],
    "timeline": [
        {"time": "00:00", "label": "Incident Triggered", "active": False, "tasks": ["Sensors & SOS triggered"]},
        {"time": "00:15", "label": "NDRF Deployed", "active": True, "tasks": ["Teams moving to high-water mark", "Boats launched"]},
        {"time": "01:30", "label": "Aerial Recon", "active": False, "tasks": ["Helicopters mapping stranded zones", "Dropping life jackets"]}
    ],
    "resources": [
        {"label": "Rescue Boats", "value": "12", "unit": "Units", "urgency": "High"},
        {"label": "Life Jackets", "value": "500", "unit": "Sets", "urgency": "High"},
        {"label": "Food Packets", "value": "2K", "unit": "Kits", "urgency": "Medium"}
    ],
    "authorized_actions": [
        {"id": "auth_ff_1", "type": "SHUTDOWN_GRID", "description": "Remotely command substation delta to shut down.", "impact": "Prevents massive electrocution.", "status": "pending"}
    ],
    "risk_zones": ["Ghat areas", "Sector 4 lowlands", "Underpass tunnels"],
    "replan_triggers": ["Water level rises above 5 ft", "Rainfall continues for >2 hours"],
    "safety_guidelines": [
        "DO NOT walk or drive through moving water. 6 inches can knock you down.",
        "Turn off utilities at main switches if instructed.",
        "Move to the highest floor or roof and wait for authorities."
    ],
    "role_delegations": [
        {"role": "NDRF Boat Squad", "tasks": ["Search & Rescue in Sector 4", "Distribute life jackets"]},
        {"role": "Local Police", "tasks": ["Block all underpass routes", "Direct traffic to high ground"]},
        {"role": "Medical Triage", "tasks": ["Setup camp at nearest safe hospital", "Prepare for waterborne diseases"]}
    ]
}

EARTHQUAKE_PLAYBOOK = {
    "disaster_type": "High-Magnitude Earthquake",
    "severity": "CRITICAL",
    "confidence": 99,
    "environmental_impact": "Dust clouds impairing visibility, unstable fault lines causing continuous aftershocks, pipelines ruptured.",
    "infrastructure_status": "Major building collapses detected. Gas leaks scattered. Cellular towers operating at 30% capacity.",
    "tactical_advice": "Do NOT enter highly unstable structures without structural engineers. Use thermal imaging drones to locate survivors under debris.",
    "immediate_action": "Shut down all municipal gas lines to prevent fires. Dispatch K-9 units and rubble-clearing heavy machinery.",
    "doc_summary": "[OFFLINE INTEL DIRECTIVE] Seismic event confirmed. Structural integrity of sector compromised. Prioritize search and rescue in dense urban blocks.",
    "action_cards": [
        {"priority": "URGENT", "title": "Gas Line Shutdown", "detail": "Prevent massive fires by shutting down city gas valves.", "time": "Immediate", "color": "#D32F2F", "confidence": 100, "category": "Safety"},
        {"priority": "HIGH", "title": "Deploy Thermal Drones", "detail": "Scan collapsed buildings for heat signatures.", "time": "+30 mins", "color": "#FF9800", "confidence": 95, "category": "Recon"},
        {"priority": "HIGH", "title": "K-9 Sniffer Squads", "detail": "Deploy specialized dogs to locate buried civilians.", "time": "+1 hour", "color": "#1976D2", "confidence": 85, "category": "Rescue"}
    ],
    "timeline": [
        {"time": "00:00", "label": "Main Quake Hits", "active": False, "tasks": ["Seismic alerts triggered"]},
        {"time": "00:10", "label": "Gas Shutoff", "active": True, "tasks": ["City-wide valves closed"]},
        {"time": "00:45", "label": "S&R Operations", "active": False, "tasks": ["Drones and dogs scanning rubble"]}
    ],
    "resources": [
        {"label": "Excavators", "value": "8", "unit": "Heavy", "urgency": "High"},
        {"label": "Thermal Drones", "value": "15", "unit": "Air", "urgency": "High"},
        {"label": "Medical Kits", "value": "400", "unit": "Trauma", "urgency": "Critical"}
    ],
    "authorized_actions": [
        {"id": "auth_eq_1", "type": "ACTIVATE_CELL_TOWERS_ON_WHEELS", "description": "Deploy COW (Cell on Wheels) to restore comms.", "impact": "Restores emergency comms overlay.", "status": "pending"}
    ],
    "risk_zones": ["High-rise residential blocks", "Underground metro lines", "Bridges"],
    "replan_triggers": ["Aftershock measuring >5.0 occurs", "Gas fire breaks out in sector 2"],
    "safety_guidelines": [
        "DROP, COVER, AND HOLD ON if inside. Do not use elevators.",
        "Stay away from glass, windows, and heavy furniture.",
        "If trapped, tap on a pipe or wall so rescuers can locate you. Do NOT light a match."
    ],
    "role_delegations": [
        {"role": "Structural Engineers", "tasks": ["Assess building stability before rescue entry", "Mark safe zones"]},
        {"role": "Search & Rescue K-9", "tasks": ["Scan sector 1 and 2 rubbles", "Signal medical teams upon finding survivors"]},
        {"role": "Telecom Operators", "tasks": ["Establish emergency HAM radio networks", "Deploy portable cell towers"]}
    ]
}

LANDSLIDE_PLAYBOOK = {
    "disaster_type": "Terrain Landslide / Mudslide",
    "severity": "HIGH",
    "confidence": 95,
    "environmental_impact": "Massive mud flows blocking all terrain routes. Soil saturation at 90%. Rivers dammed by debris.",
    "infrastructure_status": "Highways and mountain passes completely cut off. Power lines snapped.",
    "tactical_advice": "Halt all ground vehicular movement towards the zone. Rely on airlift for supply insertion.",
    "immediate_action": "Evacuate downhill communities. Prepare for secondary landslides.",
    "doc_summary": "[OFFLINE INTEL DIRECTIVE] Slope failure reported. Debris flow has severed logistical transit lines. Immediate airlift required.",
    "action_cards": [
        {"priority": "URGENT", "title": "Downhill Evacuation", "detail": "Clear villages situated below the slide vectors.", "time": "Immediate", "color": "#D32F2F", "confidence": 98, "category": "Safety"},
        {"priority": "HIGH", "title": "Airlift Medevac", "detail": "Send choppers to extract stranded individuals.", "time": "+45 mins", "color": "#FF9800", "confidence": 90, "category": "Rescue"},
        {"priority": "MEDIUM", "title": "Earth Movers", "detail": "Dispatch bulldozers to clear primary highways.", "time": "+4 hours", "color": "#1976D2", "confidence": 85, "category": "Logistics"}
    ],
    "timeline": [
        {"time": "00:00", "label": "Initial Slide", "active": False, "tasks": ["Roads blocked", "Comms lost"]},
        {"time": "00:30", "label": "Aerial Assessment", "active": True, "tasks": ["Choppers survey damage scale"]},
        {"time": "03:00", "label": "Debris Clearing", "active": False, "tasks": ["Heavy machinery begins digging"]}
    ],
    "resources": [
        {"label": "Bulldozers", "value": "5", "unit": "Heavy", "urgency": "High"},
        {"label": "Helicopters", "value": "3", "unit": "Air", "urgency": "Critical"},
        {"label": "Tents", "value": "200", "unit": "Units", "urgency": "Medium"}
    ],
    "authorized_actions": [
        {"id": "auth_ls_1", "type": "REQUISITION_CHOPPERS", "description": "Commandeer private/military choppers for rescue.", "impact": "Enables high-altitude extractions.", "status": "pending"}
    ],
    "risk_zones": ["Mountain pass roads", "Valley settlements", "Riverside camps"],
    "replan_triggers": ["Heavy rain restarts", "Natural debris dam bursts"],
    "safety_guidelines": [
        "Move away from the path of the landslide or debris flow immediately.",
        "Listen for any unusual sounds that might indicate moving debris.",
        "If escape is impossible, curl into a tight ball and protect your head."
    ],
    "role_delegations": [
        {"role": "Aviation Wing", "tasks": ["Conduct aerial rescue", "Airdrop emergency rations"]},
        {"role": "Border Roads Org (BRO)", "tasks": ["Mobilize dozers to clear highway", "Assess bridge stability"]},
        {"role": "Local NGOs", "tasks": ["Set up relief camps at safe altitudes", "Distribute thermal blankets"]}
    ]
}

FIRE_PLAYBOOK = {
    "disaster_type": "Urban / Forest Fire",
    "severity": "CRITICAL",
    "confidence": 98,
    "environmental_impact": "Dangerous levels of carbon monoxide and thick particulate smoke reducing visibility to zero. Rapid spread across vegetation/structures.",
    "infrastructure_status": "Local power grids melting. Access roads blocked by panicked evacuation. Extreme heat gradients.",
    "tactical_advice": "Attack from upwind. Deploy aerial water bombers if forest. Use chemical foam for urban/industrial sectors.",
    "immediate_action": "Execute mass evacuation downwind. Establish firebreaks to halt the advance.",
    "doc_summary": "[OFFLINE INTEL DIRECTIVE] Uncontrolled blaze detected. Smoke inhalation poses primary civilian threat. Initiate containment protocols.",
    "action_cards": [
        {"priority": "URGENT", "title": "Mass Evacuation", "detail": "Clear all downwind sectors immediately.", "time": "Immediate", "color": "#D32F2F", "confidence": 100, "category": "Safety"},
        {"priority": "HIGH", "title": "Firebreak Trenching", "detail": "Cut vegetation lines to starve forest fire.", "time": "+1 hour", "color": "#FF9800", "confidence": 90, "category": "Containment"},
        {"priority": "HIGH", "title": "Water Bomber Drop", "detail": "Aerial drop of chemical retardant on hotspots.", "time": "+2 hours", "color": "#1976D2", "confidence": 85, "category": "Combat"}
    ],
    "timeline": [
        {"time": "00:00", "label": "Blaze Reported", "active": False, "tasks": ["First responders dispatched"]},
        {"time": "00:20", "label": "Containment Ring", "active": True, "tasks": ["Firetrucks establish perimeter"]},
        {"time": "01:30", "label": "Aerial Drops", "active": False, "tasks": ["Water bombers commence runs"]}
    ],
    "resources": [
        {"label": "Fire Tenders", "value": "20", "unit": "Trucks", "urgency": "Critical"},
        {"label": "Water Bombers", "value": "2", "unit": "Air", "urgency": "High"},
        {"label": "Oxygen Kits", "value": "150", "unit": "Med", "urgency": "High"}
    ],
    "authorized_actions": [
        {"id": "auth_fr_1", "type": "MOBILIZE_AERIAL_BOMBERS", "description": "Scramble water bomber aircraft from regional bases.", "impact": "Prevents fire from jumping highways.", "status": "pending"}
    ],
    "risk_zones": ["Chemical factories downwind", "Dense vegetation slopes", "Narrow urban alleys"],
    "replan_triggers": ["Wind direction changes abruptly", "Fire jumps the primary firebreak"],
    "safety_guidelines": [
        "Evacuate immediately if instructed. Do not wait.",
        "Stay low to the floor to avoid inhaling smoke.",
        "Cover your mouth and nose with a damp cloth if smoke is thick."
    ],
    "role_delegations": [
        {"role": "Fire Command", "tasks": ["Direct hose streams on primary vectors", "Coordinate aerial drops"]},
        {"role": "Police Evac Unit", "tasks": ["Go door-to-door in downwind sectors", "Manage traffic flow out of the city"]},
        {"role": "Paramedics", "tasks": ["Treat burn victims", "Administer oxygen for smoke inhalation"]}
    ]
}

DEFENSE_PLAYBOOK = {
    "disaster_type": "Tactical Threat / Defense Breach",
    "severity": "CRITICAL",
    "confidence": 100,
    "environmental_impact": "Area locked down. Intelligence suggests hostile entities in sector. Radio jamming active.",
    "infrastructure_status": "All civilian communications cut (blackout). Military grid overlay activated. Borders sealed.",
    "tactical_advice": "Assume hostile intent. Deploy rapid response units. Clear civilian presence unconditionally.",
    "immediate_action": "Initiate absolute lockdown. Scramble Quick Reaction Teams (QRT).",
    "doc_summary": "[OFFLINE MILITARY DIRECTIVE] Perimeter breach or tactical intrusion detected. Shift to combat rules of engagement.",
    "action_cards": [
        {"priority": "URGENT", "title": "Sector Lockdown", "detail": "Seal all entry/exit points to the compromised sector.", "time": "Immediate", "color": "#D32F2F", "confidence": 100, "category": "Containment"},
        {"priority": "HIGH", "title": "QRT Deployment", "detail": "Dispatch heavily armed tactical units to last known coords.", "time": "+10 mins", "color": "#FF9800", "confidence": 95, "category": "Combat"},
        {"priority": "HIGH", "title": "Surveillance Drones", "detail": "Launch silent recon drones for thermal mapping.", "time": "+15 mins", "color": "#1976D2", "confidence": 90, "category": "Intel"}
    ],
    "timeline": [
        {"time": "00:00", "label": "Breach Detected", "active": False, "tasks": ["Alarms tripped", "Base notified"]},
        {"time": "00:05", "label": "Lockdown Executed", "active": True, "tasks": ["Gates locked", "Civilians sheltered"]},
        {"time": "00:15", "label": "QRT Engagement", "active": False, "tasks": ["Tactical units moving to intercept"]}
    ],
    "resources": [
        {"label": "QRT Squads", "value": "4", "unit": "Teams", "urgency": "Critical"},
        {"label": "Recon Drones", "value": "6", "unit": "Air", "urgency": "High"},
        {"label": "Armored Vehicles", "value": "2", "unit": "Heavy", "urgency": "Medium"}
    ],
    "authorized_actions": [
        {"id": "auth_df_1", "type": "WEAPONS_FREE", "description": "Authorize lethal force for perimeter defense.", "impact": "Neutralizes hostile threat.", "status": "pending"},
        {"id": "auth_df_2", "type": "COMMS_BLACKOUT", "description": "Jam all commercial cellular frequencies in a 5km radius.", "impact": "Prevents enemy coordination.", "status": "pending"}
    ],
    "risk_zones": ["Perimeter fencing", "Armory sector", "Command centers"],
    "replan_triggers": ["Hostages taken", "Explosives detected by rovers"],
    "safety_guidelines": [
        "SHELTER IN PLACE immediately. Do not look out of windows.",
        "Turn off all lights and stay completely silent.",
        "Follow absolute instructions from uniformed personnel only."
    ],
    "role_delegations": [
        {"role": "QRT (Strike Team)", "tasks": ["Intercept and neutralize threat", "Secure high-value assets"]},
        {"role": "Intel Ops", "tasks": ["Monitor drone feeds", "Jam enemy communications"]},
        {"role": "Base Security", "tasks": ["Lock down civilian barracks", "Establish secondary defense lines"]}
    ]
}

DEFAULT_PLAYBOOK = {
    "disaster_type": "Unknown General Emergency",
    "severity": "HIGH",
    "confidence": 60,
    "environmental_impact": "Conditions unknown. Proceed with high caution.",
    "infrastructure_status": "Pending reconnaissance.",
    "tactical_advice": "Establish a forward operating base and send scouts to assess the damage.",
    "immediate_action": "Secure a safe perimeter and await incoming data.",
    "doc_summary": "[OFFLINE INTEL] Anomaly reported. System is awaiting detailed recon to classify threat.",
    "action_cards": [
        {"priority": "HIGH", "title": "Deploy Recon", "detail": "Send advance party to gather intelligence.", "time": "Immediate", "color": "#FF9800", "confidence": 70, "category": "Recon"}
    ],
    "timeline": [
        {"time": "00:00", "label": "Report Received", "active": True, "tasks": ["Log incident"]}
    ],
    "resources": [
        {"label": "Recon Units", "value": "2", "unit": "Teams", "urgency": "High"}
    ],
    "authorized_actions": [],
    "risk_zones": ["Unknown - Treat all as hazardous"],
    "replan_triggers": ["New data arrives"],
    "safety_guidelines": [
        "Stay vigilant and alert.",
        "Await official broadcasts for instructions."
    ],
    "role_delegations": [
        {"role": "Command Central", "tasks": ["Analyze incoming field reports", "Prepare reserve units"]}
    ]
}

MASTER_PLAYBOOKS = {
    "flood": FLAHS_FLOOD_PLAYBOOK,
    "earthquake": EARTHQUAKE_PLAYBOOK,
    "landslide": LANDSLIDE_PLAYBOOK,
    "fire": FIRE_PLAYBOOK,
    "defense": DEFENSE_PLAYBOOK,
    "default": DEFAULT_PLAYBOOK
}

def get_offline_playbook(text: str, location: str, description: str) -> Dict[str, Any]:
    text_lower = (text + " " + location + " " + description).lower()
    
    if any(k in text_lower for k in ["flood", "water", "paani", "tsunami"]):
        playbook = MASTER_PLAYBOOKS["flood"]
    elif any(k in text_lower for k in ["earthquake", "quake", "tremor", "bhookamp"]):
        playbook = MASTER_PLAYBOOKS["earthquake"]
    elif any(k in text_lower for k in ["landslide", "mudslide", "avalanche"]):
        playbook = MASTER_PLAYBOOKS["landslide"]
    elif any(k in text_lower for k in ["fire", "aag", "smoke", "blaze", "burn"]):
        playbook = MASTER_PLAYBOOKS["fire"]
    elif any(k in text_lower for k in ["defense", "intrusion", "attack", "terrorist", "border", "enemy", "breach", "military"]):
        playbook = MASTER_PLAYBOOKS["defense"]
    else:
        playbook = MASTER_PLAYBOOKS["default"]
        
    import copy
    pb = copy.deepcopy(playbook)
    # Inject dynamic data
    if location.strip() and location != "Unknown Location":
         pb["location"] = location
         pb["detailed_summary"] = pb["doc_summary"].replace("sector", location)
    else:
         pb["location"] = "Unspecified Zone"
         pb["detailed_summary"] = pb["doc_summary"]
         
    return pb
