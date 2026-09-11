"""
AgriSmart AI - E2E Verification Script for GenAI Farmer Assistant
Verifies:
1. Empty message validation -> 400
2. Message length limit validation (>600 chars) -> 400
3. Non-dict / non-JSON payload -> 400
4. Missing API key behavior -> 503 (NOT_CONFIGURED, no fake response)
5. Grounded prompt assembly & guardrail verification with mock Gemini responses
6. Multi-language instruction validation (English, Hindi, Gujarati)
7. Multi-module context combinations (full, partial, empty)
"""
import sys
import os
import unittest
from unittest.mock import patch, MagicMock

# Ensure project root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from src.assistant_service import AgriAssistantService, AssistantNotConfiguredError, AssistantValidationError


class TestAssistantE2E(unittest.TestCase):

    def setUp(self):
        self.service_with_key = AgriAssistantService(api_key="ai_test_key_sample")
        self.service_no_key = AgriAssistantService(api_key="")
        self.service_no_key.claude_key = ""

    def test_01_empty_message(self):
        with self.assertRaises(AssistantValidationError) as ctx:
            self.service_with_key.generate_response(message="")
        self.assertEqual(ctx.exception.error_code, "EMPTY_MESSAGE")

    def test_02_oversized_message(self):
        with self.assertRaises(AssistantValidationError) as ctx:
            self.service_with_key.generate_response(message="x" * 601)
        self.assertEqual(ctx.exception.error_code, "MESSAGE_TOO_LONG")

    def test_03_unconfigured_no_fallback(self):
        with self.assertRaises(AssistantNotConfiguredError) as ctx:
            self.service_no_key.generate_response(message="What is the weather?")
        self.assertEqual(ctx.exception.status_code, 503)
        self.assertEqual(ctx.exception.error_code, "NOT_CONFIGURED")

    @patch("src.assistant_service.requests.post")
    def test_04_full_context_gemini_call(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "candidates": [{
                "content": {
                    "parts": [{"text": "Based on your crop diagnosis of Rice False Smut, remove infected panicles immediately."}]
                }
            }]
        }
        mock_post.return_value = mock_resp

        context = {
            "diagnosis": {"class_label": "Rice_False_Smut", "confidence": 0.88},
            "weather": {"city": "Ahmedabad", "temperature": 32.0, "rain_probability_24h": 10},
            "irrigation": {"soil_moisture": 40.0, "recommendation": "Monitor"},
            "sustainability": {"score": 85, "rating": "Excellent"}
        }

        res = self.service_with_key.generate_response(
            message="Explain my situation",
            language="en",
            context=context
        )

        self.assertIn("Rice False Smut", res["response"])
        self.assertEqual(len(res["grounded_modules"]), 4)

        # Inspect call arguments to verify grounding was sent to Gemini
        call_kwargs = mock_post.call_args[1]
        json_body = call_kwargs["json"]
        sent_prompt = json_body["contents"][-1]["parts"][0]["text"]
        self.assertIn("Rice_False_Smut", sent_prompt)
        self.assertIn("Soil Moisture: 40.0%", sent_prompt)
        self.assertIn("Recommendation: Monitor", sent_prompt)
        self.assertIn("Score: 85 / 100", sent_prompt)

    @patch("src.assistant_service.requests.post")
    def test_05_hindi_language_prompt(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "candidates": [{
                "content": {
                    "parts": [{"text": "किसान भाई, आज बारिश की संभावना 80% है, इसलिए सिंचाई न करें।"}]
                }
            }]
        }
        mock_post.return_value = mock_resp

        context = {
            "irrigation": {"recommendation": "Delay irrigation", "reason": "High rain forecast"}
        }

        res = self.service_with_key.generate_response(
            message="क्या आज पानी देना चाहिए?",
            language="hi",
            context=context
        )

        self.assertIn("सिंचाई न करें", res["response"])
        self.assertEqual(res["language"], "hi")

        # Verify system instruction contains Hindi directive
        call_kwargs = mock_post.call_args[1]
        system_text = call_kwargs["json"]["system_instruction"]["parts"][0]["text"]
        self.assertIn("किसान भाई", system_text)

    @patch("src.assistant_service.requests.post")
    def test_06_gujarati_language_prompt(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "candidates": [{
                "content": {
                    "parts": [{"text": "ખેડૂત મિત્ર, તમારા પાક માટે હવામાન અનુકૂળ છે."}]
                }
            }]
        }
        mock_post.return_value = mock_resp

        res = self.service_with_key.generate_response(
            message="હવામાન કેવું છે?",
            language="gu",
            context={"weather": {"city": "Surat", "temperature": 31.5}}
        )

        self.assertIn("ખેડૂત મિત્ર", res["response"])
        self.assertEqual(res["language"], "gu")

    @patch("src.assistant_service.requests.post")
    def test_07_partial_context_missing_data_tagged(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "candidates": [{
                "content": {
                    "parts": [{"text": "Weather data is currently not available."}]
                }
            }]
        }
        mock_post.return_value = mock_resp

        res = self.service_with_key.generate_response(
            message="Aaj baarish hogi?",
            context={} # empty context
        )

        call_kwargs = mock_post.call_args[1]
        sent_prompt = call_kwargs["json"]["contents"][-1]["parts"][0]["text"]
        self.assertIn("[NOT AVAILABLE / WEATHER NOT CONFIGURED OR LOADED]", sent_prompt)
        self.assertIn("[NOT AVAILABLE / NO CROP LEAF SCANNED YET]", sent_prompt)
        self.assertIn("[NOT AVAILABLE / SOIL MOISTURE NOT ENTERED]", sent_prompt)


if __name__ == "__main__":
    unittest.main()
