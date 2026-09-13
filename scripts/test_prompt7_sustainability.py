"""
AgriSmart AI - Prompt 7 Sustainability & Stewardship Engine & UI Verification Script
Tests deterministic formula, backend endpoint contracts, boundary conditions,
missing-data behavior, and frontend DOM integrity.
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:5000"

def post_json(path, payload):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return resp.status, data
    except urllib.error.HTTPError as e:
        err_data = json.loads(e.read().decode("utf-8")) if e.headers.get_content_type() == "application/json" else {}
        return e.code, err_data

def test_sustainability():
    print("==================================================")
    print("AGRISMART AI — PROMPT 7 SUSTAINABILITY VERIFICATION")
    print("==================================================")

    # 1. Delay irrigation (water=95), Moderate risk (weather=70)
    # Expected: (95 * 0.60) + (70 * 0.40) = 57.0 + 28.0 = 85.0 -> 85 (Excellent)
    print("\n[Test 1] Delay Irrigation + Moderate Risk (Formula Check)")
    status, res = post_json("/sustainability", {
        "soil_moisture": 25.0,
        "rain_probability": 65,
        "recommendation": "Delay irrigation",
        "disease_risk": "Moderate"
    })
    assert status == 200, f"Expected 200, got {status}"
    assert res["score"] == 85, f"Expected 85, got {res['score']}"
    assert res["rating"] == "Excellent", f"Expected Excellent, got {res['rating']}"
    assert res["breakdown"]["water_efficiency"] == 95, "Water efficiency should be 95"
    assert res["breakdown"]["weather_adaptation"] == 70, "Weather adaptation should be 70"
    print(f"  PASS: Delay irrigation score = {res['score']}/100, Rating = {res['rating']}")

    # 2. Optimal soil moisture balanced (water=85), Low risk (weather=90)
    # Expected: (85 * 0.60) + (90 * 0.40) = 51.0 + 36.0 = 87.0 -> 87 (Excellent)
    print("\n[Test 2] Monitor (Balanced 35%) + Low Risk (Formula Check)")
    status, res = post_json("/sustainability", {
        "soil_moisture": 35.0,
        "rain_probability": 20,
        "recommendation": "Monitor",
        "disease_risk": "Low"
    })
    assert status == 200, f"Expected 200, got {status}"
    assert res["score"] == 87, f"Expected 87, got {res['score']}"
    assert res["rating"] == "Excellent", f"Expected Excellent, got {res['rating']}"
    assert res["breakdown"]["water_efficiency"] == 85, "Water efficiency should be 85"
    assert res["breakdown"]["weather_adaptation"] == 90, "Weather adaptation should be 90"
    print(f"  PASS: Balanced monitor score = {res['score']}/100, Rating = {res['rating']}")

    # 3. Targeted irrigation (water=75), High risk (weather=50)
    # Expected: (75 * 0.60) + (50 * 0.40) = 45.0 + 20.0 = 65.0 -> 65 (Good)
    print("\n[Test 3] Irrigate Now + High Disease Risk")
    status, res = post_json("/sustainability", {
        "soil_moisture": 18.0,
        "rain_probability": 10,
        "recommendation": "Irrigate now",
        "disease_risk": "High"
    })
    assert status == 200, f"Expected 200, got {status}"
    assert res["score"] == 65, f"Expected 65, got {res['score']}"
    assert res["rating"] == "Good", f"Expected Good, got {res['rating']}"
    assert res["breakdown"]["water_efficiency"] == 75, "Water efficiency should be 75"
    assert res["breakdown"]["weather_adaptation"] == 50, "Weather adaptation should be 50"
    print(f"  PASS: Targeted irrigation score = {res['score']}/100, Rating = {res['rating']}")

    # 4. Saturated soil (>60%) monitor (water=65), High risk (weather=50)
    # Expected: (65 * 0.60) + (50 * 0.40) = 39.0 + 20.0 = 59.0 -> 59 (Fair)
    print("\n[Test 4] Saturated soil (>60%) + High Disease Risk")
    status, res = post_json("/sustainability", {
        "soil_moisture": 72.0,
        "rain_probability": 30,
        "recommendation": "Monitor",
        "disease_risk": "High"
    })
    assert status == 200, f"Expected 200, got {status}"
    assert res["score"] == 59, f"Expected 59, got {res['score']}"
    assert res["rating"] == "Fair", f"Expected Fair, got {res['rating']}"
    print(f"  PASS: Saturated soil score = {res['score']}/100, Rating = {res['rating']}")

    # 5. Missing soil moisture validation
    print("\n[Test 5] Missing soil moisture input validation")
    status, res = post_json("/sustainability", {
        "rain_probability": 20
    })
    assert status == 400, f"Expected 400 for missing moisture, got {status}"
    err_code = res.get("code") or res.get("error_code")
    assert err_code in ["MISSING_FIELD", "INVALID_INPUT"], f"Expected error code, got {err_code}"
    print(f"  PASS: Missing soil moisture cleanly rejected: {res.get('error')}")

    # 6. Out of bounds soil moisture validation
    print("\n[Test 6] Out of bounds soil moisture (-5% and 120%)")
    status, res = post_json("/sustainability", {"soil_moisture": -5.0})
    assert status == 400, f"Expected 400, got {status}"
    status, res = post_json("/sustainability", {"soil_moisture": 120.0})
    assert status == 400, f"Expected 400, got {status}"
    print("  PASS: Out of bounds values correctly rejected")

    # 7. Frontend file verification
    print("\n[Test 7] Frontend Component Architecture & Published Formula")
    with open("frontend/js/components/sustainabilityCard.js", "r", encoding="utf-8") as f:
      sust_js = f.read()

    assert "Sustainability" in sust_js, "Header has Sustainability"
    assert "An indicative view of your farm's resource efficiency and crop health." in sust_js, "Correct subheading"
    assert "Farm Sustainability" in sust_js, "Card title has Farm Sustainability"
    assert "How the Score is Calculated" in sust_js, "Formula transparency card present"
    assert "Overall Score = round((Water Efficiency × 0.60) + (Micro-Climate Adaptation × 0.40))" in sust_js, "Published exact formula"
    assert "Water Efficiency (60% Weight)" in sust_js, "60% weight documented"
    assert "Micro-Climate Adaptation (40% Weight)" in sust_js, "40% weight documented"
    assert "btn-sustainability-refresh" in sust_js, "Has recalculate button ID"
    assert "btn-eval-sustainability" in sust_js, "Has eval button ID"
    assert "btn-ask-assistant-sustainability" in sust_js, "Has ask assistant button ID"
    assert "How can I improve my sustainability indicator?" in sust_js, "Pre-seeds question"
    assert "Not enough data" in sust_js, "Honest empty state when data missing"
    print("  PASS: sustainabilityCard.js fulfills all Prompt 7 layout, transparency, and CTA requirements")

    # 8. Dashboard alignment check
    print("\n[Test 8] Dashboard Integration Check")
    with open("frontend/js/components/dashboard.js", "r", encoding="utf-8") as f:
      dash_js = f.read()
    assert "Not evaluated" in dash_js, "Dashboard displays Not evaluated when un-evaluated"
    assert "${sustData.score} / 100" in dash_js, "Dashboard displays real score when evaluated"
    print("  PASS: Dashboard consumes identical backend sustainability data without fake scores")

    print("\n==================================================")
    print("ALL PROMPT 7 TESTS PASSED SUCCESSFULLY (8/8)")
    print("==================================================")

if __name__ == "__main__":
    test_sustainability()
