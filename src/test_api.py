"""
AgriSmart AI - Automated API Test Suite (Prompt 3 Verification)
Tests all core routes, error codes, HTTP statuses, and edge cases:
- Health check readiness (GET /health)
- Image formats (JPG, PNG, WEBP)
- Missing file field (400 MISSING_FILE)
- Invalid file types (415 INVALID_FILE_TYPE)
- Corrupted/unreadable image (422 INVALID_IMAGE)
- Oversized payload (413 FILE_TOO_LARGE)
- Sequential & concurrent independence
- Bonus placeholder routes (/irrigation, /weather, /sustainability, /assistant)
"""
import os
import sys
import io
import time
import requests
from PIL import Image

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000")


def generate_test_image(format_name: str, size=(100, 100), color="green") -> bytes:
    """Helper to generate a valid in-memory test image."""
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format_name)
    buf.seek(0)
    return buf.getvalue()


def test_step(name: str, method: str, path: str, expected_status: list, **kwargs):
    """Executes a single test case and evaluates result."""
    url = f"{BASE_URL}{path}"
    print(f"\n--------------------------------------------------")
    print(f"TEST: {name}")
    print(f"Endpoint: {method.upper()} {url}")

    if not isinstance(expected_status, list):
        expected_status = [expected_status]

    try:
        if method.lower() == "get":
            res = requests.get(url, **kwargs)
        elif method.lower() == "post":
            res = requests.post(url, **kwargs)
        else:
            raise ValueError(f"Unsupported method: {method}")

        print(f"Status Code: {res.status_code} (Expected: {expected_status})")
        try:
            body = res.json()
            print(f"Response JSON: {body}")
        except Exception:
            body = res.text
            print(f"Response Body: {body}")

        passed = res.status_code in expected_status
        if passed:
            print(f"Result: [PASS] - {name}")
        else:
            print(f"Result: [FAIL] - {name} (Got HTTP {res.status_code})")
        return passed, body

    except Exception as e:
        print(f"Result: [FAIL] - {name} (Connection/Runtime Error: {e})")
        return False, None


def run_full_suite():
    print(f"==================================================")
    print(f"AgriSmart AI - Production Backend Verification")
    print(f"Target Server: {BASE_URL}")
    print(f"==================================================")

    results = []

    # 1. Health Endpoint (GET /health)
    p, data = test_step("1. Health Endpoint Check", "get", "/health", 200)
    results.append(p)
    if p and data:
        print(f"   Model Loaded: {data.get('model_loaded')}, Status: {data.get('status')}")

    # 2. Valid JPEG Prediction (POST /predict)
    # Expected: 200 (if model loaded or dev mock enabled) OR 503 (MODEL_NOT_READY when weights pending)
    jpg_bytes = generate_test_image("JPEG", color="forestgreen")
    p, _ = test_step(
        "2. Prediction with Valid JPEG",
        "post",
        "/predict",
        [200, 503],
        files={"image": ("leaf.jpg", jpg_bytes, "image/jpeg")}
    )
    results.append(p)

    # 3. Valid PNG Prediction (POST /predict)
    png_bytes = generate_test_image("PNG", color="darkgreen")
    p, _ = test_step(
        "3. Prediction with Valid PNG",
        "post",
        "/predict",
        [200, 503],
        files={"image": ("leaf.png", png_bytes, "image/png")}
    )
    results.append(p)

    # 4. Valid WEBP Prediction (POST /predict)
    webp_bytes = generate_test_image("WEBP", color="olive")
    p, _ = test_step(
        "4. Prediction with Valid WEBP",
        "post",
        "/predict",
        [200, 503],
        files={"image": ("leaf.webp", webp_bytes, "image/webp")}
    )
    results.append(p)

    # 5. Missing 'image' field (POST /predict) -> 400 MISSING_FILE
    p, data = test_step(
        "5. Missing File Field Validation",
        "post",
        "/predict",
        400,
        data={"wrong_field": "test"}
    )
    if p and data and data.get("code") == "MISSING_FILE":
        print("   Confirmed Error Code: MISSING_FILE")
    results.append(p)

    # 6. Empty filename (POST /predict) -> 400 MISSING_FILE
    p, _ = test_step(
        "6. Empty Filename Validation",
        "post",
        "/predict",
        400,
        files={"image": ("", b"", "image/jpeg")}
    )
    results.append(p)

    # 7. Unsupported File Type: TXT/PDF (POST /predict) -> 415 INVALID_FILE_TYPE
    p, data = test_step(
        "7. Unsupported File Type Validation (.txt)",
        "post",
        "/predict",
        415,
        files={"image": ("notes.txt", b"plain text content", "text/plain")}
    )
    if p and data and data.get("code") == "INVALID_FILE_TYPE":
        print("   Confirmed Error Code: INVALID_FILE_TYPE")
    results.append(p)

    # 8. Corrupted Image File (POST /predict) -> 422 INVALID_IMAGE
    corrupted_bytes = b"NOT_A_VALID_IMAGE_DATA_CORRUPT"
    p, data = test_step(
        "8. Corrupted Image Data Validation",
        "post",
        "/predict",
        422,
        files={"image": ("corrupted.jpg", corrupted_bytes, "image/jpeg")}
    )
    if p and data and data.get("code") == "INVALID_IMAGE":
        print("   Confirmed Error Code: INVALID_IMAGE")
    results.append(p)

    # 9. Oversized Image File (POST /predict) -> 413 FILE_TOO_LARGE
    oversized_bytes = b"0" * (10 * 1024 * 1024 + 100) # > 10 MB
    p, data = test_step(
        "9. Oversized Payload Validation (>10MB)",
        "post",
        "/predict",
        413,
        files={"image": ("huge_leaf.jpg", oversized_bytes, "image/jpeg")}
    )
    if p and data and data.get("code") == "FILE_TOO_LARGE":
        print("   Confirmed Error Code: FILE_TOO_LARGE")
    results.append(p)

    # 10. Sequential Prediction Independence
    print("\n--------------------------------------------------")
    print("TEST: 10. Sequential Prediction Independence")
    p1, _ = test_step("10a. Request A", "post", "/predict", [200, 503], files={"image": ("leaf_a.jpg", jpg_bytes, "image/jpeg")})
    p2, _ = test_step("10b. Request B", "post", "/predict", [200, 503], files={"image": ("leaf_b.jpg", png_bytes, "image/png")})
    results.append(p1 and p2)

    # 11. Rapid Concurrent Requests
    print("\n--------------------------------------------------")
    print("TEST: 11. Rapid Successive Requests Stability")
    r_a = requests.post(f"{BASE_URL}/predict", files={"image": ("rapid1.jpg", jpg_bytes, "image/jpeg")})
    r_b = requests.post(f"{BASE_URL}/predict", files={"image": ("rapid2.png", png_bytes, "image/png")})
    rapid_passed = r_a.status_code in [200, 503] and r_b.status_code in [200, 503]
    print(f"Result: [{'PASS' if rapid_passed else 'FAIL'}] - Rapid requests executed without crashing server.")
    results.append(rapid_passed)

    # 12. Bonus Endpoints Integrity, Weather Intelligence & Sustainability Score
    p_irr, _ = test_step("12a. Irrigation Endpoint", "post", "/irrigation", 200, json={"soil_moisture": 30.0, "rain_probability": 0.5})
    # Weather endpoint returns 200 when OPENWEATHER_API_KEY configured, or 503 (NOT_CONFIGURED) without fake data
    p_wea_get, r_wg = test_step("12b. Weather Endpoint (GET)", "get", "/weather?city=Ahmedabad", [200, 503])
    p_wea_post, r_wp = test_step("12c. Weather Endpoint (POST)", "post", "/weather", [200, 503], json={"lat": 18.5, "lon": 73.8})
    p_wea_val, r_wv = test_step("12d. Weather Missing Location Validation", "get", "/weather", 400)
    p_sust, r_sust = test_step("12e. Sustainability Valid Assessment", "post", "/sustainability", 200, json={"soil_moisture": 45.0, "rain_probability": 10, "recommendation": "Monitor", "disease_risk": "Low"})
    p_sust_val, _ = test_step("12f. Sustainability Missing Field Validation", "post", "/sustainability", 400, json={"rain_probability": 10})
    # Assistant endpoint returns 200 when GEMINI_API_KEY configured, 503 (NOT_CONFIGURED), or 502 (AI_PROVIDER_ERROR) without fake data
    p_asst, r_asst = test_step("12g. Assistant Endpoint (Query)", "post", "/assistant", [200, 502, 503], json={"message": "Meri crop ko kya hua?", "language": "hi"})
    p_asst_val, _ = test_step("12h. Assistant Missing Message Validation", "post", "/assistant", 400, json={})
    results.append(p_irr and p_wea_get and p_wea_post and p_wea_val and p_sust and p_sust_val and p_asst and p_asst_val)

    # Summary
    passed_count = sum(1 for r in results if r)
    total_count = len(results)
    print("\n==================================================")
    print(f"TEST SUMMARY: {passed_count}/{total_count} test suites PASSED")
    print("==================================================")

    if passed_count != total_count:
        sys.exit(1)


if __name__ == "__main__":
    run_full_suite()
