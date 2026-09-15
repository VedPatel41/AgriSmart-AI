"""
AgriSmart AI - Prompt 11 Final QA & Hardening Automated Matrix
Executes the comprehensive test matrix defined in Prompt 11 Section 33:
- Upload verification
- Prediction pipeline
- Weather intelligence
- Smart irrigation exact thresholds
- Sustainability scoring
- GenAI Assistant context & error handling
- Trilingual key symmetry (EN, HI, GU)
- Security audit
- Fresh clone reproducibility audit
"""
import io
import os
import re
import sys
import unittest
import requests
from PIL import Image

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000")


def make_test_image(fmt="JPEG", size=(224, 224), color="forestgreen"):
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=fmt)
    buf.seek(0)
    return buf.getvalue()


class FinalQATestMatrix(unittest.TestCase):
    """Rigorous QA and Hardening Matrix."""

    @classmethod
    def setUpClass(cls):
        try:
            r = requests.get(f"{BASE_URL}/health", timeout=5)
            cls.server_online = (r.status_code == 200)
            cls.health = r.json()
        except Exception:
            cls.server_online = False
            cls.health = {}

    def test_01_backend_health_and_model_presence(self):
        """Verify server is live, model loaded with 15 classes, and framework is PyTorch."""
        self.assertTrue(self.server_online, "Backend server must be running.")
        self.assertEqual(self.health.get("status"), "ok")
        self.assertTrue(self.health.get("model_loaded"))
        self.assertEqual(self.health.get("framework"), "pytorch")
        self.assertEqual(self.health.get("num_classes"), 15)
        self.assertEqual(self.health.get("input_shape"), [224, 224, 3])

    def test_02_upload_matrix(self):
        """Verify image uploads across valid and invalid formats, corrupted bytes, and limits."""
        # 1. Valid JPG
        jpg_bytes = make_test_image("JPEG")
        r_jpg = requests.post(f"{BASE_URL}/predict", files={"image": ("leaf.jpg", jpg_bytes, "image/jpeg")}, timeout=10)
        self.assertEqual(r_jpg.status_code, 200)
        data = r_jpg.json()
        self.assertIn("class_label", data)
        self.assertIn("confidence", data)
        self.assertTrue(0.0 <= data["confidence"] <= 1.0)
        self.assertIn("advisory", data)

        # 2. Valid PNG
        png_bytes = make_test_image("PNG")
        r_png = requests.post(f"{BASE_URL}/predict", files={"image": ("leaf.png", png_bytes, "image/png")}, timeout=10)
        self.assertEqual(r_png.status_code, 200)

        # 3. Invalid File Extension (.txt)
        r_txt = requests.post(f"{BASE_URL}/predict", files={"image": ("bad.txt", b"plain text", "text/plain")}, timeout=5)
        self.assertEqual(r_txt.status_code, 415)
        self.assertEqual(r_txt.json().get("code"), "INVALID_FILE_TYPE")

        # 4. Corrupted Image
        r_corrupt = requests.post(f"{BASE_URL}/predict", files={"image": ("corrupt.jpg", b"not an image", "image/jpeg")}, timeout=5)
        self.assertEqual(r_corrupt.status_code, 422)
        self.assertEqual(r_corrupt.json().get("code"), "INVALID_IMAGE")

        # 5. Missing File
        r_missing = requests.post(f"{BASE_URL}/predict", data={"other": "data"}, timeout=5)
        self.assertEqual(r_missing.status_code, 400)
        self.assertEqual(r_missing.json().get("code"), "MISSING_FILE")

        # 6. Oversized Payload (>10MB)
        huge_bytes = b"X" * (10 * 1024 * 1024 + 100)
        r_huge = requests.post(f"{BASE_URL}/predict", files={"image": ("huge.jpg", huge_bytes, "image/jpeg")}, timeout=5)
        self.assertEqual(r_huge.status_code, 413)

    def test_03_weather_matrix(self):
        """Verify location handling, missing param validation, and unconfigured fallback."""
        # 1. Missing location
        r_miss = requests.get(f"{BASE_URL}/weather", timeout=5)
        self.assertEqual(r_miss.status_code, 400)
        self.assertEqual(r_miss.json().get("code"), "MISSING_LOCATION")

        # 2. Valid Location
        r_city = requests.get(f"{BASE_URL}/weather?city=Ahmedabad", timeout=8)
        self.assertIn(r_city.status_code, [200, 503])
        if r_city.status_code == 503:
            self.assertEqual(r_city.json().get("code"), "NOT_CONFIGURED")

    def test_04_irrigation_exact_threshold_matrix(self):
        """Verify strict rule boundary conditions: >60% delay, <30%&<30% irrigate, else monitor."""
        cases = [
            # (soil, rain, expected_recommendation, expected_decision)
            (29.0, 29.0, "Irrigate now", "irrigate_now"),
            (30.0, 29.0, "Monitor", "monitor"),
            (25.0, 60.0, "Monitor", "monitor"),
            (25.0, 61.0, "Delay irrigation", "delay_irrigation"),
            (15.0, 10.0, "Irrigate now", "irrigate_now"),
            (75.0, 10.0, "Monitor", "monitor"),
            (40.0, 75.0, "Delay irrigation", "delay_irrigation"),
        ]

        for soil, rain, exp_rec, exp_dec in cases:
            res = requests.post(f"{BASE_URL}/irrigation", json={"soil_moisture": soil, "rain_probability": rain}, timeout=5)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["recommendation"], exp_rec, f"Failed for soil={soil}, rain={rain}")
            self.assertEqual(data["decision"], exp_dec)

        # Invalid soil moisture (< 0, > 100, string)
        for invalid_soil in [-5, 105, "invalid"]:
            res_inv = requests.post(f"{BASE_URL}/irrigation", json={"soil_moisture": invalid_soil, "rain_probability": 20}, timeout=5)
            self.assertEqual(res_inv.status_code, 400)

    def test_05_sustainability_scoring_matrix(self):
        """Verify deterministic 60/40 scoring, clamping [0, 100], and validation."""
        # Test 1: Delay irrigation (water=95), low disease risk (weather=90) -> 95*0.6 + 90*0.4 = 93
        res1 = requests.post(f"{BASE_URL}/sustainability", json={
            "soil_moisture": 35.0,
            "rain_probability": 75,
            "recommendation": "Delay irrigation",
            "disease_risk": "Low"
        }, timeout=5)
        self.assertEqual(res1.status_code, 200)
        d1 = res1.json()
        self.assertEqual(d1["score"], 93)
        self.assertEqual(d1["rating"], "Excellent")

        # Test 2: Missing soil moisture -> 400
        res_miss = requests.post(f"{BASE_URL}/sustainability", json={"rain_probability": 20}, timeout=5)
        self.assertEqual(res_miss.status_code, 400)

    def test_06_assistant_matrix(self):
        """Verify validation, context ingestion, and error handling."""
        # 1. Empty message
        res_empty = requests.post(f"{BASE_URL}/assistant", json={"message": "   "}, timeout=5)
        self.assertEqual(res_empty.status_code, 400)
        self.assertEqual(res_empty.json().get("code"), "EMPTY_MESSAGE")

        # 2. Oversized message (>600 chars)
        res_big = requests.post(f"{BASE_URL}/assistant", json={"message": "x" * 601}, timeout=5)
        self.assertEqual(res_big.status_code, 400)
        self.assertEqual(res_big.json().get("code"), "MESSAGE_TOO_LONG")

        # 3. Contextual Query
        res_q = requests.post(f"{BASE_URL}/assistant", json={
            "message": "Explain irrigation advisory.",
            "language": "en",
            "context": {
                "irrigation": {"recommendation": "Delay irrigation", "soil_moisture": 35.0}
            }
        }, timeout=8)
        self.assertIn(res_q.status_code, [200, 502, 503])

    def test_07_english_only_ui(self):
        """Verify i18n.js has comprehensive English keys and zero Indic text in UI."""
        frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
        i18n_file = os.path.join(frontend_dir, "js", "i18n.js")
        with open(i18n_file, "r", encoding="utf-8") as f:
            txt = f.read()

        m = re.search(r"en:\s*\{([^}]+)\}", txt, re.DOTALL)
        self.assertIsNotNone(m, "en dictionary must exist in i18n.js")
        en_k = set(re.findall(r'["\']([a-zA-Z0-9_.]+)["\']\s*:', m.group(1)))
        self.assertGreaterEqual(len(en_k), 50)

        # Verify language selector removed from index.html
        index_file = os.path.join(frontend_dir, "index.html")
        with open(index_file, "r", encoding="utf-8") as f:
            index_txt = f.read()
        self.assertNotIn('id="lang-selector"', index_txt)
        self.assertNotIn('id="settings-lang"', index_txt)

        # Verify zero Indic text in frontend
        indic_regex = re.compile(r'[\u0900-\u097F\u0A80-\u0AFF]')
        for root, dirs, files in os.walk(frontend_dir):
            for file in files:
                if file.endswith((".html", ".js", ".css")):
                    filepath = os.path.join(root, file)
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                    self.assertIsNone(
                        indic_regex.search(content),
                        f"Found Indic characters in {os.path.relpath(filepath, frontend_dir)}"
                    )

    def test_08_security_and_reproducibility(self):
        """Verify zero secrets in frontend and verify requirements.txt has torch."""
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        # Check requirements.txt
        req_file = os.path.join(base_dir, "requirements.txt")
        with open(req_file, "r", encoding="utf-8") as f:
            reqs = f.read().lower()
        self.assertIn("torch", reqs)
        self.assertIn("torchvision", reqs)
        self.assertIn("flask", reqs)

        # Check frontend for secret keys
        fe_dir = os.path.join(base_dir, "frontend")
        sec_re = re.compile(r'(AIza[0-9A-Za-z-_]{35}|sk-[a-zA-Z0-9]{32,})')
        for r, _, files in os.walk(fe_dir):
            for f in files:
                if f.endswith((".js", ".html", ".css")):
                    with open(os.path.join(r, f), "r", encoding="utf-8", errors="ignore") as fh:
                        self.assertEqual(sec_re.findall(fh.read()), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
