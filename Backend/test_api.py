import json
import os
import subprocess
import sys
import time
from typing import Any, Dict, Optional, Tuple

import requests


def _request_json(
    method: str,
    url: str,
    *,
    headers: Optional[Dict[str, str]] = None,
    params: Optional[Dict[str, str]] = None,
    json_body: Optional[Dict[str, Any]] = None,
    data: Optional[Dict[str, Any]] = None,
    files: Optional[Dict[str, Any]] = None,
    timeout_s: int = 30,
) -> Tuple[int, Dict[str, Any], float]:
    """Make an HTTP request and return (status_code, parsed_json, elapsed_seconds)."""
    start = time.time()
    resp = requests.request(
        method,
        url,
        headers=headers,
        params=params,
        json=json_body,
        data=data,
        files=files,
        timeout=timeout_s,
    )
    elapsed = time.time() - start
    try:
        parsed = resp.json()
    except Exception:
        parsed = {"raw": resp.text}
    return resp.status_code, parsed, elapsed


def _wait_for_health(base_url: str, timeout_s: int = 20) -> bool:
    """Wait until /health responds or timeout occurs."""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            status_code, payload, _ = _request_json("GET", f"{base_url}/health", timeout_s=5)
            if status_code == 200 and payload.get("success") is True:
                return True
        except Exception:
            time.sleep(0.5)
    return False


def _start_server(backend_dir: str) -> subprocess.Popen:
    """Start uvicorn server for api.py in a subprocess."""
    # Use --app-dir so uvicorn can import api:app correctly.
    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "api:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8000",
        "--reload",
        "--log-level",
        "warning",
        "--app-dir",
        backend_dir,
    ]
    # Note: --reload can be slow; but for hackathon this is acceptable.
    proc = subprocess.Popen(cmd, cwd=backend_dir, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    return proc


def run_tests() -> None:
    """Run 7 endpoint tests and print PASS/FAIL summary."""
    base_url = "http://127.0.0.1:8000"
    backend_dir = os.path.dirname(os.path.abspath(__file__))

    server_proc: Optional[subprocess.Popen] = None
    if not _wait_for_health(base_url, timeout_s=2):
        server_proc = _start_server(backend_dir)
        if not _wait_for_health(base_url, timeout_s=20):
            print("Server did not start: /health unreachable.")
            if server_proc is not None:
                server_proc.terminate()
            sys.exit(1)

    tests_passed = 0
    total_tests = 7

    def report(test_name: str, ok: bool, elapsed_s: Optional[float] = None) -> None:
        """Print PASS/FAIL for a single test."""
        nonlocal tests_passed
        mark = "PASS" if ok else "FAIL"
        suffix = f" | {elapsed_s:.3f}s" if elapsed_s is not None else ""
        print(f"{mark}: {test_name}{suffix}")
        if ok:
            tests_passed += 1

    # 1) GET /health
    try:
        code, payload, elapsed = _request_json("GET", f"{base_url}/health", timeout_s=10)
        ok = code == 200 and payload.get("success") is True
        report("GET /health", ok, elapsed)
    except Exception:
        report("GET /health", False)
        payload = {}

    # 2) POST /auth/login with all 3 users
    tokens: Dict[str, str] = {}
    try:
        login_users = ["cmd123", "lead123", "vol123"]
        ok_all = True
        elapsed_total = 0.0
        for u in login_users:
            code, payload, elapsed = _request_json(
                "POST",
                f"{base_url}/auth/login",
                json_body={"username": u, "password": u},
                timeout_s=15,
            )
            elapsed_total += elapsed
            if code != 200 or not payload.get("token"):
                ok_all = False
            else:
                tokens[u] = payload["token"]
        report("POST /auth/login (3 users)", ok_all, elapsed_total)
    except Exception:
        report("POST /auth/login (3 users)", False)

    # 3) POST /analyze/text
    analysis_id: Optional[str] = None
    try:
        prompt = (
            "Himachal Pradesh mein flash flood aaya hai. "
            "Manali district mein 200 log phaase hain. "
            "15 injured hain. NH-21 block ho gaya hai. "
            "Beas river ka water level danger mark se upar hai."
        )
        headers = {"Authorization": f"Bearer {tokens['cmd123']}"}
        code, payload, elapsed = _request_json(
            "POST",
            f"{base_url}/analyze/text",
            headers=headers,
            data={"text": prompt},
            timeout_s=60,
        )
        analysis_id = payload.get("id") if code == 200 else None
        ok = code == 200 and payload.get("success") is True and analysis_id is not None
        report("POST /analyze/text", ok, elapsed)
    except Exception:
        report("POST /analyze/text", False)

    # 4) POST /analyze/manual
    try:
        headers = {"Authorization": f"Bearer {tokens['cmd123']}"}
        data = {
            "disaster_type": "Earthquake",
            "location": "Shimla district",
            "people": "220",
            "severity": "HIGH",
            "details": "Building collapse reports + aftershocks. Road access partial block.",
        }
        code, payload, elapsed = _request_json(
            "POST",
            f"{base_url}/analyze/manual",
            headers=headers,
            data=data,
            timeout_s=60,
        )
        ok = code == 200 and payload.get("success") is True and payload.get("data", {}).get("severity")
        report("POST /analyze/manual", bool(ok), elapsed)
    except Exception:
        report("POST /analyze/manual", False)

    # 5) GET /history
    try:
        headers = {"Authorization": f"Bearer {tokens['cmd123']}"}
        code, payload, elapsed = _request_json("GET", f"{base_url}/history", headers=headers, timeout_s=20)
        ok = code == 200 and payload.get("success") is True and isinstance(payload.get("data"), list)
        report("GET /history", ok, elapsed)
    except Exception:
        report("GET /history", False)

    # 6) GET /history/{id}
    try:
        headers = {"Authorization": f"Bearer {tokens['cmd123']}"}
        if not analysis_id:
            report("GET /history/{id}", False)
        else:
            code, payload, elapsed = _request_json(
                "GET", f"{base_url}/history/{analysis_id}", headers=headers, timeout_s=20
            )
            ok = code == 200 and payload.get("success") is True and payload.get("data", {}).get("id") == analysis_id
            report("GET /history/{id}", ok, elapsed)
    except Exception:
        report("GET /history/{id}", False)

    # 7) POST /replan
    try:
        headers = {"Authorization": f"Bearer {tokens['cmd123']}"}
        if not analysis_id:
            report("POST /replan", False)
        else:
            code, payload, elapsed = _request_json(
                "POST",
                f"{base_url}/replan",
                headers=headers,
                data={"original_id": analysis_id, "update_text": "50 aur log affected hue"},
                timeout_s=90,
            )
            ok = code == 200 and payload.get("success") is True and payload.get("data", {}).get("severity")
            report("POST /replan", ok, elapsed)
    except Exception:
        report("POST /replan", False)

    print(f"\nFinal summary: {tests_passed}/{total_tests} tests passed")

    if server_proc is not None:
        server_proc.terminate()


if __name__ == "__main__":
    run_tests()

