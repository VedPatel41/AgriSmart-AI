"""
Direct HTTP test for /irrigation endpoint running against http://localhost:5000
"""
import requests

tests = [
    ({"soil_moisture": 25, "rain_probability": 20}, 200, "Irrigate now"),
    ({"soil_moisture": 25, "rain_probability": 65}, 200, "Delay irrigation"),
    ({"soil_moisture": 50, "rain_probability": 20}, 200, "Monitor"),
    ({"soil_moisture": -5, "rain_probability": 20}, 400, "INVALID_INPUT"),
    ({"soil_moisture": 105, "rain_probability": 20}, 400, "INVALID_INPUT"),
    ({"soil_moisture": "abc", "rain_probability": 20}, 400, "INVALID_INPUT"),
    ({}, 400, "MISSING_FIELD")
]

for payload, exp_status, exp_rec in tests:
    r = requests.post("http://localhost:5000/irrigation", json=payload)
    assert r.status_code == exp_status, f"Expected {exp_status} got {r.status_code} for {payload}: {r.text}"
    body = r.json()
    if exp_status == 200:
        rec = body.get("recommendation")
        assert rec == exp_rec, f"Expected {exp_rec} got {rec}"
        print(f"PASS [200]: {payload} -> '{rec}' (Reason: {body.get('reason')})")
    else:
        code = body.get("code")
        assert code == exp_rec, f"Expected {exp_rec} got {code}"
        print(f"PASS [{r.status_code}]: {payload} -> {code}: {body.get('error')}")

print("\n>>> ALL DIRECT /irrigation TESTS PASSED SUCCESSFULLY! <<<")
