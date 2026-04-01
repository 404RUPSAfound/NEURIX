import requests

tests = [
    "How do I set up flood rescue operations?",
    "Medical triage protocol for 500 casualties",
    "NDRF deployment and battalion structure",
    "What resources needed for earthquake zone with 10000 affected?",
    "Cyclone evacuation coastal villages",
]

for q in tests:
    r = requests.post(
        "http://127.0.0.1:8001/chat",
        json={"message": q, "history": []},
        headers={"Authorization": "Bearer mock_token"},
        timeout=30
    )
    d = r.json()
    engine = d.get("engine", "unknown")
    model = d.get("model", "")
    response = d.get("response", "")[:100]
    tag = f"[{engine}]" + (f"[{model}]" if model else "")
    print(f"Q: {q[:50]}")
    print(f"  {tag} {response}...")
    print()
