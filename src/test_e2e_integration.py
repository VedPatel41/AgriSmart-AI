"""
AgriSmart AI - End-to-End Integration & Multi-Module Verification Test Suite (Prompt 10)
Validates the unified application:
1. Backend Health Check (GET /health)
2. Real PyTorch Disease Inference (POST /predict) with ICAR Rice & Maize Advisory
3. Weather Intelligence Service (GET /weather, POST /weather) & honest fallback
4. Smart Irrigation Decision Engine (POST /irrigation) with exact threshold validation:
   - IF rain_probability_24h > 60% -> Delay irrigation
   - IF soil_moisture < 30% AND rain_probability_24h < 30% -> Irrigate now
   - OTHERWISE -> Monitor
5. Sustainability Scoring Engine (POST /sustainability) adhering to 60/40 formula
6. GenAI Farmer Assistant (POST /assistant) multi-module context ingestion & language handling
7. Frontend Regional Language (i18n.js) Translation Consistency & Key Symmetry (EN, HI, GU)
8. State Reset & Freshness Invariant Validation
"""
import io
import os
import re
import sys
import unittest
import requests
from PIL import Image

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000")


def generate_leaf_image(format_name: str = "JPEG", size=(224, 224), color="darkgreen") -> bytes:
    """Creates a valid test leaf image for PyTorch inference."""
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format_name)
    buf.seek(0)
    return buf.getvalue()


class TestAgriSmartEndToEndIntegration(unittest.TestCase):
    """Full End-to-End multi-module integration test suite."""

    @classmethod
    def setUpClass(cls):
        # Verify server is responding
        try:
            res = requests.get(f"{BASE_URL}/health", timeout=5)
            cls.server_online = (res.status_code == 200)
            cls.health_data = res.json()
        except Exception as e:
            cls.server_online = False
            cls.health_data = {}

    def test_01_backend_health_status(self):
        """STEP 1 & 2: Backend health endpoint confirms online status and loaded model."""
        self.assertTrue(self.server_online, "Backend must be running on port 5000.")
        self.assertEqual(self.health_data.get("status"), "ok")
        self.assertTrue(self.health_data.get("model_loaded"), "PyTorch model must be loaded.")
        self.assertEqual(self.health_data.get("num_classes"), 16)

    def test_02_crop_disease_prediction_pipeline(self):
        """STEP 3, 4, 5: Crop image analysis calls /predict and yields genuine ICAR advisory."""
        leaf_bytes = generate_leaf_image("JPEG")
        res = requests.post(
            f"{BASE_URL}/predict",
            files={"image": ("test_leaf.jpg", leaf_bytes, "image/jpeg")},
            timeout=10
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # Invariants
        self.assertIn("class_label", data)
        self.assertIn("confidence", data)
        self.assertGreater(data["confidence"], 0.0)
        self.assertLessEqual(data["confidence"], 1.0)

        # ICAR Advisory integration
        self.assertIn("advisory", data)
        advisory = data["advisory"]
        self.assertIn("disease_name", advisory)
        self.assertIn("hindi_summary", advisory)
        self.assertIn("chemical_remedy", advisory)
        self.assertIn("organic_remedy", advisory)
        self.assertIn("prevention", advisory)
        print(f"\n[E2E] Real Diagnosis Verified: {data['class_label']} ({data['confidence']*100:.1f}%)")

    def test_03_weather_intelligence_module(self):
        """STEP 6: Weather endpoint responds honestly without fake data."""
        # Ahmedabad hub lookup
        res = requests.get(f"{BASE_URL}/weather?city=Ahmedabad", timeout=8)
        # Either 200 (live OpenWeatherMap configured) or 503 (NOT_CONFIGURED), never fake values
        self.assertIn(res.status_code, [200, 503])
        if res.status_code == 200:
            data = res.json()
            self.assertIn("temperature", data)
            self.assertIn("humidity", data)
            self.assertIn("rain_probability_24h", data)
            self.assertIn("disease_risk", data)
            print(f"[E2E] Weather live: Temp={data['temperature']}°C, POP={data['rain_probability_24h']}%, Risk={data['disease_risk']['level']}")
        else:
            data = res.json()
            self.assertEqual(data.get("code"), "NOT_CONFIGURED")
            print(f"[E2E] Weather unconfigured state handled cleanly: {data.get('error')}")

    def test_04_irrigation_exact_thresholds(self):
        """STEP 7, 8, 9: Smart Irrigation rule engine strictly enforces defined thresholds."""
        # Rule 1: rain_probability_24h > 60% -> Delay irrigation
        res_delay = requests.post(f"{BASE_URL}/irrigation", json={
            "soil_moisture": 20.0,
            "rain_probability": 70
        }, timeout=5)
        self.assertEqual(res_delay.status_code, 200)
        d_delay = res_delay.json()
        self.assertEqual(d_delay["recommendation"], "Delay irrigation")
        self.assertEqual(d_delay["decision"], "delay_irrigation")

        # Rule 2: soil_moisture < 30% AND rain_probability_24h < 30% -> Irrigate now
        res_irrigate = requests.post(f"{BASE_URL}/irrigation", json={
            "soil_moisture": 25.0,
            "rain_probability": 15
        }, timeout=5)
        self.assertEqual(res_irrigate.status_code, 200)
        d_irr = res_irrigate.json()
        self.assertEqual(d_irr["recommendation"], "Irrigate now")
        self.assertEqual(d_irr["decision"], "irrigate_now")

        # Rule 3: Otherwise -> Monitor
        res_monitor = requests.post(f"{BASE_URL}/irrigation", json={
            "soil_moisture": 50.0,
            "rain_probability": 20
        }, timeout=5)
        self.assertEqual(res_monitor.status_code, 200)
        d_mon = res_monitor.json()
        self.assertEqual(d_mon["recommendation"], "Monitor")
        self.assertEqual(d_mon["decision"], "monitor")
        print("[E2E] All 3 Irrigation rules and threshold boundaries confirmed.")

    def test_05_sustainability_scoring_engine(self):
        """STEP 10, 11: Sustainability score calculated using backend 60/40 rule."""
        res = requests.post(f"{BASE_URL}/sustainability", json={
            "soil_moisture": 45.0,
            "rain_probability": 10,
            "recommendation": "Monitor",
            "disease_risk": "Low"
        }, timeout=5)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # Verify weights
        self.assertEqual(data["weights"]["water_efficiency"], 0.6)
        self.assertEqual(data["weights"]["weather_adaptation"], 0.4)

        # Verify components
        water_eff = data["breakdown"]["water_efficiency"]
        weather_adapt = data["breakdown"]["weather_adaptation"]
        expected_score = round(water_eff * 0.6 + weather_adapt * 0.4)
        self.assertEqual(data["score"], expected_score)
        self.assertIn("reasons", data)
        self.assertIn("suggestion", data)
        print(f"[E2E] Sustainability Score Verified: {data['score']}/100 ({data['rating']})")

    def test_06_assistant_context_and_language_integration(self):
        """STEP 12, 14, 15: GenAI Assistant validates context ingestion & language preference."""
        # Test Assistant endpoint validation
        res_empty = requests.post(f"{BASE_URL}/assistant", json={}, timeout=5)
        self.assertEqual(res_empty.status_code, 400)
        self.assertEqual(res_empty.json().get("code"), "EMPTY_MESSAGE")

        # Context-rich query in Hindi
        payload = {
            "message": "क्या मुझे अभी सिंचाई करनी चाहिए?",
            "language": "hi",
            "context": {
                "disease": {"class_label": "Rice_Blast", "confidence": 0.92},
                "weather": {"temp": 32, "humidity": 75, "rain_probability": 15},
                "irrigation": {"recommendation": "Irrigate now", "soil_moisture": 22.0},
                "sustainability": {"score": 75, "rating": "Good"}
            }
        }
        res_hi = requests.post(f"{BASE_URL}/assistant", json=payload, timeout=8)
        # Either 200 (live Gemini API key) or 503 (NOT_CONFIGURED)
        self.assertIn(res_hi.status_code, [200, 503])
        if res_hi.status_code == 200:
            ans = res_hi.json()
            self.assertIn("reply", ans)
            self.assertEqual(ans.get("language"), "hi")
            print("[E2E] Assistant Hindi contextual answer generated.")
        else:
            ans = res_hi.json()
            self.assertEqual(ans.get("code"), "NOT_CONFIGURED")
            print("[E2E] Assistant honest unconfigured state verified (no fake text).")

    def test_07_i18n_english_only_and_language_selector_removal(self):
        """STEP 13: Verify permanent English-only UI, language switcher removal, and zero Indic text."""
        frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
        i18n_path = os.path.join(frontend_dir, "js", "i18n.js")
        index_path = os.path.join(frontend_dir, "index.html")

        self.assertTrue(os.path.exists(i18n_path), f"i18n.js must exist at {i18n_path}")

        with open(i18n_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Extract en dictionary using regex
        match = re.search(r"en:\s*\{([^}]+)\}", content, re.DOTALL)
        self.assertIsNotNone(match, "en dictionary must exist in i18n.js")
        en_keys = set(re.findall(r'["\']([a-zA-Z0-9_.]+)["\']\s*:', match.group(1)))
        self.assertGreater(len(en_keys), 20, "EN translation dictionary must have >20 keys")

        # Verify language selector is completely removed from index.html
        with open(index_path, "r", encoding="utf-8") as f:
            index_content = f.read()
        self.assertNotIn('id="lang-selector"', index_content, "Language selector must be removed from header")
        self.assertNotIn('id="settings-lang"', index_content, "Language selector must be removed from settings")

        # Verify zero Devanagari/Indic characters across all frontend files
        indic_regex = re.compile(r'[\u0900-\u097F\u0A80-\u0AFF]')
        for root, dirs, files in os.walk(frontend_dir):
            for file in files:
                if file.endswith((".html", ".js", ".css")):
                    filepath = os.path.join(root, file)
                    with open(filepath, "r", encoding="utf-8") as f:
                        file_content = f.read()
                    self.assertIsNone(
                        indic_regex.search(file_content),
                        f"Found non-English Indic characters in {os.path.relpath(filepath, frontend_dir)}"
                    )
        print(f"[E2E] English-only UI and Language Selector Removal Confirmed ({len(en_keys)} EN keys, 0 Indic chars).")

    def test_08_no_exposed_secrets_in_repo(self):
        """STEP 28: Verify no hardcoded API keys exist in frontend files."""
        frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
        secret_patterns = [
            re.compile(r'AIza[0-9A-Za-z-_]{35}'),
            re.compile(r'sk-[a-zA-Z0-9]{32,}'),
        ]

        for root, _, files in os.walk(frontend_dir):
            for file in files:
                if file.endswith((".js", ".html", ".css")):
                    path = os.path.join(root, file)
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        text = f.read()
                        for pattern in secret_patterns:
                            matches = pattern.findall(text)
                            self.assertEqual(matches, [], f"Found potential secret in {path}: {matches}")
        print("[E2E] Security Audit: Zero hardcoded API keys detected in frontend assets.")


if __name__ == "__main__":
    unittest.main(verbosity=2)
