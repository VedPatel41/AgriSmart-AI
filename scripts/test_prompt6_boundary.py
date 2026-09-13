import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from src.irrigation_service import calculate_irrigation_recommendation, validate_soil_moisture

cases = [
    (29.0, 29, "Irrigate now", "irrigate_now"),
    (30.0, 29, "Monitor", "monitor"),
    (29.0, 30, "Monitor", "monitor"),
    (25.0, 60, "Monitor", "monitor"),
    (25.0, 61, "Delay irrigation", "delay_irrigation"),
]

print("\n--- Testing Prompt 6 Irrigation Boundary Cases ---")
for soil, rain, expected_rec, expected_dec in cases:
    res = calculate_irrigation_recommendation(soil, rain)
    rec = res["recommendation"]
    dec = res["decision"]
    assert rec == expected_rec, f"Failed for ({soil}, {rain}): got {rec}, expected {expected_rec}"
    assert dec == expected_dec, f"Failed for ({soil}, {rain}): got {dec}, expected {expected_dec}"
    print(f"PASS: Soil {soil}%, Rain {rain}% -> {rec} (decision={dec})")

print("\n--- Testing Prompt 6 Invalid Input Rejections ---")
for invalid in [-5, 101, "abc"]:
    try:
        validate_soil_moisture(invalid)
        print(f"FAIL: Expected error for {invalid}")
        sys.exit(1)
    except Exception as e:
        print(f"PASS: Invalid soil '{invalid}' rejected: {e}")

print("\nALL PROMPT 6 BOUNDARY AND VALIDATION TESTS PASSED!\n")
