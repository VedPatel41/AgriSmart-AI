"""
Direct unit test for /irrigation endpoint using Flask test_client
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.app import app


def test_irrigation_endpoint():
    client = app.test_client()
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
        r = client.post("/irrigation", json=payload)
        assert r.status_code == exp_status, f"Expected {exp_status} got {r.status_code} for {payload}: {r.get_data(as_text=True)}"
        body = r.get_json()
        if exp_status == 200:
            rec = body.get("recommendation")
            assert rec == exp_rec, f"Expected {exp_rec} got {rec}"
        else:
            code = body.get("code")
            assert code == exp_rec, f"Expected {exp_rec} got {code}"


if __name__ == "__main__":
    test_irrigation_endpoint()
    print("\n>>> ALL DIRECT /irrigation TESTS PASSED SUCCESSFULLY! <<<")

