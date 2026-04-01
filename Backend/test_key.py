import requests
import json
import os
from dotenv import load_dotenv

load_dotenv('c:/Users/RUPSA/Desktop/NEURIX/Backend/.env')
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    # Try hardcoded from config if .env fails
    api_key = "AIzaSyC_NHqQzb4d3DS0RKcNsBx74LrJA1TXjv8"

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
payload = {
    "contents": [{"parts": [{"text": "Hello, are you operational? Answer in 1 sentence."}]}]
}

try:
    print(f"Testing Gemini with key: {api_key[:10]}...")
    r = requests.post(url, json=payload, timeout=10)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        print("Response:", r.json()['candidates'][0]['content']['parts'][0]['text'])
    else:
        print("Error:", r.text)
except Exception as e:
    print("Failed:", e)
