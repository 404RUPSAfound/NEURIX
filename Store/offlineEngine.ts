// Store/offlineEngine.ts

export const MASTER_PLAYBOOKS = {
  flood: {
    disaster_type: "Flash Flood & Water-logging",
    severity: "CRITICAL",
    confidence: 99,
    environmental_impact: "Severe structural inundation, heavily compromised soil stability, and active electrical hazards in waterlogged areas.",
    infrastructure_status: "Road networks are heavily restricted. Power grid disabled in low-lying sectors. Water supply contaminated.",
    tactical_advice: "Deploy shallow-water rescue boats. Cut main power grids to prevent mass electrocution. Activate high-ground shelters immediately.",
    immediate_action: "Evacuate low-lying zones immediately and establish medical triage at the nearest high ground.",
    doc_summary: "[MOBILE OFFLINE INTEL] Massive surge reported. Infrastructure is submerged and civilians are stranded. Proceed with tactical aquatic rescue.",
    action_cards: [
      { priority: "URGENT", title: "Power Grid Isolation", detail: "Cut primary power links to submerged neighborhoods.", time: "Immediate", color: "#D32F2F", confidence: 100, category: "Infrastructure" },
      { priority: "HIGH", title: "Deploy Rescue Rafts", detail: "Mobilize NDRF shallow-water rafts.", time: "+15 mins", color: "#FF9800", confidence: 95, category: "Rescue" },
      { priority: "MEDIUM", title: "Airdrop Supply Lines", detail: "Dispatch choppers with rations/medicines.", time: "+2 hours", color: "#1976D2", confidence: 80, category: "Logistics" }
    ],
    timeline: [
      { time: "00:00", label: "Incident Triggered", active: false, tasks: ["Sensors & SOS triggered"] },
      { time: "00:15", label: "NDRF Deployed", active: true, tasks: ["Teams moving to high-water mark", "Boats launched"] },
      { time: "01:30", label: "Aerial Recon", active: false, tasks: ["Helicopters mapping stranded zones", "Dropping life jackets"] }
    ],
    resources: [
      { label: "Rescue Boats", value: "12", unit: "Units", urgency: "High" },
      { label: "Life Jackets", value: "500", unit: "Sets", urgency: "High" },
      { label: "Food Packets", value: "2K", unit: "Kits", urgency: "Medium" }
    ],
    authorized_actions: [
      { id: "auth_ff_1", type: "SHUTDOWN_GRID", description: "Remotely command substation delta to shut down.", impact: "Prevents massive electrocution.", status: "pending" }
    ],
    risk_zones: ["Ghat areas", "Sector 4 lowlands", "Underpass tunnels"],
    replan_triggers: ["Water level rises above 5 ft", "Rainfall continues for >2 hours"],
    safety_guidelines: [
      "DO NOT walk or drive through moving water. 6 inches can knock you down.",
      "Turn off utilities at main switches if instructed.",
      "Move to the highest floor or roof and wait for authorities."
    ],
    role_delegations: [
      { role: "NDRF Boat Squad", tasks: ["Search & Rescue in Sector 4", "Distribute life jackets"] },
      { role: "Local Police", tasks: ["Block all underpass routes", "Direct traffic to high ground"] },
      { role: "Medical Triage", tasks: ["Setup camp at nearest safe hospital", "Prepare for waterborne diseases"] }
    ]
  },
  earthquake: {
    disaster_type: "High-Magnitude Earthquake",
    severity: "CRITICAL",
    confidence: 99,
    environmental_impact: "Dust clouds impairing visibility, unstable fault lines causing continuous aftershocks, pipelines ruptured.",
    infrastructure_status: "Major building collapses detected. Gas leaks scattered. Cellular towers operating at 30% capacity.",
    tactical_advice: "Do NOT enter highly unstable structures without structural engineers. Use thermal imaging drones.",
    immediate_action: "Shut down all municipal gas lines to prevent fires. Dispatch K-9 units and rubble-clearing heavy machinery.",
    doc_summary: "[MOBILE OFFLINE INTEL] Seismic event confirmed. Structural integrity of sector compromised. Prioritize search and rescue.",
    action_cards: [
      { priority: "URGENT", title: "Gas Line Shutdown", detail: "Prevent massive fires by shutting down city gas valves.", time: "Immediate", color: "#D32F2F", confidence: 100, category: "Safety" },
      { priority: "HIGH", title: "Deploy Thermal Drones", detail: "Scan collapsed buildings for heat signatures.", time: "+30 mins", color: "#FF9800", confidence: 95, category: "Recon" },
      { priority: "HIGH", title: "K-9 Sniffer Squads", detail: "Deploy specialized dogs to locate buried civilians.", time: "+1 hour", color: "#1976D2", confidence: 85, category: "Rescue" }
    ],
    timeline: [
      { time: "00:00", label: "Main Quake Hits", active: false, tasks: ["Seismic alerts triggered"] },
      { time: "00:10", label: "Gas Shutoff", active: true, tasks: ["City-wide valves closed"] },
      { time: "00:45", label: "S&R Operations", active: false, tasks: ["Drones and dogs scanning rubble"] }
    ],
    resources: [
      { label: "Excavators", value: "8", unit: "Heavy", urgency: "High" },
      { label: "Thermal Drones", value: "15", unit: "Air", urgency: "High" },
      { label: "Medical Kits", value: "400", unit: "Trauma", urgency: "Critical" }
    ],
    authorized_actions: [
      { id: "auth_eq_1", type: "ACTIVATE_CELL_TOWERS_ON_WHEELS", description: "Deploy COW (Cell on Wheels) to restore comms.", impact: "Restores emergency comms overlay.", status: "pending" }
    ],
    risk_zones: ["High-rise residential blocks", "Underground metro lines", "Bridges"],
    replan_triggers: ["Aftershock measuring >5.0 occurs", "Gas fire breaks out in sector 2"],
    safety_guidelines: [
      "DROP, COVER, AND HOLD ON if inside. Do not use elevators.",
      "Stay away from glass, windows, and heavy furniture.",
      "If trapped, tap on a pipe or wall so rescuers can locate you. Do NOT light a match."
    ],
    role_delegations: [
      { role: "Structural Engineers", tasks: ["Assess building stability before rescue entry", "Mark safe zones"] },
      { role: "Search & Rescue K-9", tasks: ["Scan sector 1 and 2 rubbles", "Signal medical teams"] },
      { role: "Telecom Operators", tasks: ["Establish emergency HAM radio networks", "Deploy portable cell towers"] }
    ]
  },
  landslide: {
    disaster_type: "Terrain Landslide / Mudslide",
    severity: "HIGH",
    confidence: 95,
    environmental_impact: "Massive mud flows blocking all terrain routes. Soil saturation at 90%. Rivers dammed by debris.",
    infrastructure_status: "Highways and mountain passes completely cut off. Power lines snapped.",
    tactical_advice: "Halt all ground vehicular movement towards the zone. Rely on airlift for supply insertion.",
    immediate_action: "Evacuate downhill communities. Prepare for secondary landslides.",
    doc_summary: "[MOBILE OFFLINE INTEL] Slope failure reported. Debris flow has severed logistical transit lines.",
    action_cards: [
      { priority: "URGENT", title: "Downhill Evacuation", detail: "Clear villages situated below the slide vectors.", time: "Immediate", color: "#D32F2F", confidence: 98, category: "Safety" }
    ],
    timeline: [
      { time: "00:00", label: "Initial Slide", active: true, tasks: ["Roads blocked"] }
    ],
    resources: [{ label: "Bulldozers", value: "5", unit: "Heavy", urgency: "High" }],
    authorized_actions: [],
    risk_zones: ["Mountain pass roads", "Valley settlements"],
    replan_triggers: ["Heavy rain restarts"],
    safety_guidelines: ["Move away from the path of the landslide or debris flow immediately."],
    role_delegations: [{ role: "Border Roads Org (BRO)", tasks: ["Mobilize dozers to clear highway"] }]
  },
  fire: {
    disaster_type: "Urban / Forest Fire",
    severity: "CRITICAL",
    confidence: 98,
    environmental_impact: "Dangerous levels of carbon monoxide and thick particulate smoke reducing visibility to zero.",
    infrastructure_status: "Local power grids melting. Extreme heat gradients.",
    tactical_advice: "Attack from upwind. Deploy aerial water bombers if forest.",
    immediate_action: "Execute mass evacuation downwind. Establish firebreaks to halt the advance.",
    doc_summary: "[MOBILE OFFLINE INTEL] Uncontrolled blaze detected. Smoke inhalation poses primary civilian threat.",
    action_cards: [
      { priority: "URGENT", title: "Mass Evacuation", detail: "Clear all downwind sectors immediately.", time: "Immediate", color: "#D32F2F", confidence: 100, category: "Safety" }
    ],
    timeline: [{ time: "00:00", label: "Blaze Reported", active: true, tasks: ["First responders dispatched"] }],
    resources: [{ label: "Fire Tenders", value: "20", unit: "Trucks", urgency: "Critical" }],
    authorized_actions: [],
    risk_zones: ["Chemical factories downwind", "Dense vegetation slopes"],
    replan_triggers: ["Wind direction changes abruptly"],
    safety_guidelines: ["Evacuate immediately if instructed. Do not wait.", "Stay low to the floor to avoid inhaling smoke."],
    role_delegations: [{ role: "Fire Command", tasks: ["Direct hose streams on primary vectors"] }]
  },
  defense: {
    disaster_type: "Tactical Threat / Defense Breach",
    severity: "CRITICAL",
    confidence: 100,
    environmental_impact: "Area locked down. Intelligence suggests hostile entities in sector.",
    infrastructure_status: "All civilian communications cut (blackout). Military grid overlay activated.",
    tactical_advice: "Assume hostile intent. Deploy rapid response units. Clear civilian presence unconditionally.",
    immediate_action: "Initiate absolute lockdown. Scramble Quick Reaction Teams (QRT).",
    doc_summary: "[MOBILE OFFLINE INTEL] Perimeter breach or tactical intrusion detected. Shift to combat rules of engagement.",
    action_cards: [
      { priority: "URGENT", title: "Sector Lockdown", detail: "Seal all entry/exit points to the compromised sector.", time: "Immediate", color: "#D32F2F", confidence: 100, category: "Containment" },
      { priority: "HIGH", title: "QRT Deployment", detail: "Dispatch heavily armed tactical units to last known coords.", time: "+10 mins", color: "#FF9800", confidence: 95, category: "Combat" }
    ],
    timeline: [
      { time: "00:00", label: "Breach Detected", active: true, tasks: ["Alarms tripped", "Base notified"] }
    ],
    resources: [
      { label: "QRT Squads", value: "4", unit: "Teams", urgency: "Critical" }
    ],
    authorized_actions: [
      { id: "auth_df_1", type: "WEAPONS_FREE", description: "Authorize lethal force for perimeter defense.", impact: "Neutralizes hostile threat.", status: "pending" }
    ],
    risk_zones: ["Perimeter fencing", "Armory sector", "Command centers"],
    replan_triggers: ["Hostages taken"],
    safety_guidelines: ["SHELTER IN PLACE immediately.", "Turn off all lights and stay completely silent."],
    role_delegations: [{ role: "QRT (Strike Team)", tasks: ["Intercept and neutralize threat", "Secure high-value assets"] }]
  },
  default: {
    disaster_type: "Unknown General Emergency",
    severity: "HIGH",
    confidence: 60,
    environmental_impact: "Conditions unknown. Proceed with high caution.",
    infrastructure_status: "Pending reconnaissance.",
    tactical_advice: "Establish a forward operating base and send scouts to assess the damage.",
    immediate_action: "Secure a safe perimeter and await incoming data.",
    doc_summary: "[MOBILE OFFLINE INTEL] Anomaly reported. System is awaiting detailed recon to classify threat.",
    action_cards: [{ priority: "HIGH", title: "Deploy Recon", detail: "Send advance party to gather intelligence.", time: "Immediate", color: "#FF9800", confidence: 70, category: "Recon" }],
    timeline: [{ time: "00:00", label: "Report Received", active: true, tasks: ["Log incident"] }],
    resources: [{ label: "Recon Units", value: "2", unit: "Teams", urgency: "High" }],
    authorized_actions: [],
    risk_zones: ["Unknown - Treat all as hazardous"],
    replan_triggers: ["New data arrives"],
    safety_guidelines: ["Stay vigilant and alert."],
    role_delegations: [{ role: "Command Central", tasks: ["Analyze incoming field reports"] }]
  }
};

export const generateOfflineAnalysis = (text: string, location: string, username: string = "offline_op") => {
  const textLower = (text + " " + location).toLowerCase();

  let playbookKey: keyof typeof MASTER_PLAYBOOKS = 'default';

  if (['flood', 'water', 'paani', 'tsunami'].some(k => textLower.includes(k))) playbookKey = 'flood';
  else if (['earthquake', 'quake', 'tremor', 'bhookamp'].some(k => textLower.includes(k))) playbookKey = 'earthquake';
  else if (['landslide', 'mudslide', 'avalanche'].some(k => textLower.includes(k))) playbookKey = 'landslide';
  else if (['fire', 'aag', 'smoke', 'blaze', 'burn'].some(k => textLower.includes(k))) playbookKey = 'fire';
  else if (['defense', 'intrusion', 'attack', 'terrorist', 'border', 'enemy', 'breach', 'military'].some(k => textLower.includes(k))) playbookKey = 'defense';

  const playbook = MASTER_PLAYBOOKS[playbookKey];
  const actualLocation = location.trim() ? location : "Unspecified Zone";
  const analysis_id = Math.random().toString(36).substring(7);

  // Format matching the exact API response for `results.tsx`
  const data = {
    situation: {
      title: playbook.disaster_type,
      severity: playbook.severity,
      description: playbook.immediate_action || "Emergency deployed.",
      stats: { affected: 500, injured: 25, villages: 10, confidence: playbook.confidence }
    },
    environmental_impact: playbook.environmental_impact,
    infrastructure_status: playbook.infrastructure_status,
    doc_summary: playbook.doc_summary,
    detailed_summary: playbook.doc_summary.replace("sector", actualLocation),
    tactical_advice: playbook.tactical_advice,
    action_cards: playbook.action_cards,
    timeline: playbook.timeline,
    resources: playbook.resources,
    authorized_actions: playbook.authorized_actions,
    safety_guidelines: playbook.safety_guidelines,
    role_delegations: playbook.role_delegations,
    ai_powered: false,
    generated_at: new Date().toISOString(),
    processing_time_ms: 0,
    analysis_id: analysis_id,
    user: username
  };

  return { success: true, data: data, id: analysis_id, is_offline_generated: true };
};
