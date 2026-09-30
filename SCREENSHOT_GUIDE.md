# NEURIX Screenshot Guide

This guide details exactly how to capture the required screenshots for the NEURIX portfolio README.

### Screenshot 1: NEURIX Dashboard
**What to show:** The main landing screen with the tactical UI, offline status indicator, and quick-action buttons.
**State:** The app should be running in a simulator/device with "Offline Mode" active. Ensure the UI text is fully loaded and readable.

### Screenshot 2: AI / Command Interface
**What to show:** The chat or command interface where the user interacts with the Sentinel AI.
**State:** Show a realistic query and response (e.g., "Analyze current sector status") demonstrating the offline AI capability.

### Screenshot 3: Disaster Analysis
**What to show:** The screen detailing a specific disaster event, pulling data from GDACS or local intel.
**State:** Display an active alert (e.g., Earthquake or Flood) with severity badges and location details.

### Screenshot 4: Tactical Reconnaissance / Map
**What to show:** The `ReconView` or map screen showing local tactical assets (Hospitals, Resources).
**State:** The radar UI should be visible with a few nodes plotted. Location permission should ideally be granted or mocked to a realistic coordinate.

### Screenshot 5: Triage / Emergency Response
**What to show:** The Casualty Triage list showing color-coded tags (RED, YELLOW, GREEN).
**State:** Pre-populate at least 3 simulated patients (e.g., one Red, one Yellow, one Green) to show the sorting and UI styling.

### Screenshot 6: Response / Resource / Status Screen
**What to show:** The alerts or resources view detailing available supplies or active alerts.
**State:** Show a list of simulated resources (e.g., "Medical Kit", "Water Rations") or active broadcast alerts.

---
**Capture Instructions:**
1. Use an iOS Simulator or Android Emulator.
2. Ensure the status bar is clean (hide time/battery if possible, or keep it consistent).
3. Take screenshots with consistent dimensions.
4. Save the images as `.png` or `.jpg` into the `assets/screenshots/` folder.
5. Update `README.md` to point to these new file paths.
