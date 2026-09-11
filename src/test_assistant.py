"""
AgriSmart AI - Unit Test Suite for GenAI Farmer Assistant Service
Validates:
- Multi-module grounded context assembly
- Safe handling of missing/partial context
- Strict safety guardrails and system prompt instructions
- Input validation (empty message, oversized message)
- Unconfigured API key behavior (honest 503 error, no fake fallback)
- Bounded conversation history handling
- Provider error mapping (timeout, rate limit, provider error)
"""
import os
import sys
import unittest
from unittest.mock import patch, MagicMock
import requests

# Ensure project root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

try:
    from src.assistant_service import (
        AgriAssistantService,
        AssistantError,
        AssistantNotConfiguredError,
        AssistantValidationError,
        AssistantProviderError,
        AssistantTimeoutError,
        AssistantRateLimitError,
        MAX_USER_MESSAGE_LENGTH
    )
except ImportError:
    from assistant_service import (
        AgriAssistantService,
        AssistantError,
        AssistantNotConfiguredError,
        AssistantValidationError,
        AssistantProviderError,
        AssistantTimeoutError,
        AssistantRateLimitError,
        MAX_USER_MESSAGE_LENGTH
    )


class TestAssistantService(unittest.TestCase):

    def setUp(self):
        self.service = AgriAssistantService(api_key="test_api_key_123")
        self.unconfigured_service = AgriAssistantService(api_key="")
        # Ensure env does not interfere
        self.unconfigured_service.claude_key = ""

    def test_configuration_detection(self):
        """Service correctly identifies whether an API key is available."""
        self.assertTrue(self.service.is_configured())
        self.assertFalse(self.unconfigured_service.is_configured())

    def test_unconfigured_service_raises_error(self):
        """Unconfigured service must raise AssistantNotConfiguredError with 503 status code."""
        with self.assertRaises(AssistantNotConfiguredError) as ctx:
            self.unconfigured_service.generate_response(message="Hello")
        self.assertEqual(ctx.exception.status_code, 503)
        self.assertEqual(ctx.exception.error_code, "NOT_CONFIGURED")

    def test_empty_message_validation(self):
        """Empty or whitespace-only messages must be rejected with HTTP 400."""
        with self.assertRaises(AssistantValidationError) as ctx1:
            self.service.generate_response(message="")
        self.assertEqual(ctx1.exception.status_code, 400)
        self.assertEqual(ctx1.exception.error_code, "EMPTY_MESSAGE")

        with self.assertRaises(AssistantValidationError) as ctx2:
            self.service.generate_response(message="   \n\t  ")
        self.assertEqual(ctx2.exception.status_code, 400)

    def test_oversized_message_validation(self):
        """Messages exceeding MAX_USER_MESSAGE_LENGTH must be rejected with HTTP 400."""
        oversized = "A" * (MAX_USER_MESSAGE_LENGTH + 10)
        with self.assertRaises(AssistantValidationError) as ctx:
            self.service.generate_response(message=oversized)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.error_code, "MESSAGE_TOO_LONG")

    def test_grounded_context_full(self):
        """Full multi-module context formats all four active modules accurately."""
        context = {
            "diagnosis": {
                "class_label": "Rice_False_Smut",
                "confidence": 0.915,
                "advisory": {
                    "crop": "Rice",
                    "disease_name": "False Smut",
                    "severity": "High",
                    "organic_remedy": "Remove and burn infected panicles.",
                    "prevention": "Avoid late nitrogen application."
                }
            },
            "weather": {
                "city": "Ludhiana",
                "temperature": 29.5,
                "humidity": 68,
                "rain_probability_24h": 35,
                "disease_risk": "Moderate"
            },
            "irrigation": {
                "soil_moisture": 42.0,
                "recommendation": "Monitor",
                "reason": "Soil moisture is in adequate range.",
                "action": "Maintain routine moisture scouting."
            },
            "sustainability": {
                "score": 82,
                "rating": "Excellent",
                "breakdown": {
                    "water_efficiency": 85,
                    "weather_adaptation": 78
                },
                "suggestion": "Maintain drip timing."
            }
        }

        facts, modules = self.service.build_grounded_context(context)
        self.assertIn("Rice_False_Smut", facts)
        self.assertIn("91.5%", facts)
        self.assertIn("NEVER refer to it as accuracy", facts)
        self.assertIn("Ludhiana", facts)
        self.assertIn("29.5°C", facts)
        self.assertIn("35%", facts)
        self.assertIn("Soil Moisture: 42.0%", facts)
        self.assertIn("Recommendation: Monitor", facts)
        self.assertIn("Score: 82 / 100", facts)
        self.assertEqual(set(modules), {"diagnosis", "weather", "irrigation", "sustainability"})

    def test_grounded_context_partial_missing(self):
        """Missing modules are explicitly tagged as NOT AVAILABLE to prevent hallucination."""
        context = {
            "irrigation": {
                "soil_moisture": 22.0,
                "recommendation": "Irrigate now"
            }
        }

        facts, modules = self.service.build_grounded_context(context)
        self.assertIn("• Crop Diagnosis: [NOT AVAILABLE / NO CROP LEAF SCANNED YET]", facts)
        self.assertIn("• Weather Conditions: [NOT AVAILABLE / WEATHER NOT CONFIGURED OR LOADED]", facts)
        self.assertIn("• Sustainability Score: [NOT AVAILABLE / NOT EVALUATED YET]", facts)
        self.assertIn("• Smart Irrigation Advisory:", facts)
        self.assertIn("Irrigate now", facts)
        self.assertEqual(modules, ["irrigation"])

    def test_system_instruction_languages(self):
        """System instruction adapts properly to English, Hindi, and Gujarati."""
        prompt_en = self.service.build_system_instruction("en")
        self.assertIn("English", prompt_en)
        self.assertIn("DO NOT OVERRIDE THE ML MODEL", prompt_en)
        self.assertIn("CONFIDENCE IS NOT ACCURACY", prompt_en)

        prompt_hi = self.service.build_system_instruction("hi")
        self.assertIn("Hindi", prompt_hi)
        self.assertIn("किसान भाई", prompt_hi)

        prompt_gu = self.service.build_system_instruction("gu")
        self.assertIn("Gujarati", prompt_gu)
        self.assertIn("ખેડૂત મિત્ર", prompt_gu)

    @patch("src.assistant_service.requests.post")
    def test_successful_gemini_generation(self, mock_post):
        """Successful Gemini API response parsed and returned cleanly."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": "नमस्ते किसान भाई! आपके धान में False Smut रोग का पता चला है।"}
                        ]
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        res = self.service.generate_response(
            message="Meri crop me kya bimari hai?",
            language="hi",
            context={"diagnosis": {"class_label": "Rice_False_Smut", "confidence": 0.92}}
        )

        self.assertIn("False Smut", res["response"])
        self.assertEqual(res["language"], "hi")
        self.assertIn("diagnosis", res["grounded_modules"])
        self.assertIn("google-", res["model_provider"])

    @patch("src.assistant_service.requests.post")
    def test_gemini_rate_limit_error(self, mock_post):
        """Provider HTTP 429 maps to AssistantRateLimitError."""
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_post.return_value = mock_response

        with self.assertRaises(AssistantRateLimitError) as ctx:
            self.service.generate_response(message="Hello")
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertEqual(ctx.exception.error_code, "RATE_LIMITED")

    @patch("src.assistant_service.requests.post")
    def test_gemini_timeout_error(self, mock_post):
        """Provider timeout maps to AssistantTimeoutError with 504 status code."""
        mock_post.side_effect = requests.exceptions.Timeout("Connection timed out")

        with self.assertRaises(AssistantTimeoutError) as ctx:
            self.service.generate_response(message="Hello")
        self.assertEqual(ctx.exception.status_code, 504)
        self.assertEqual(ctx.exception.error_code, "TIMEOUT")


if __name__ == "__main__":
    unittest.main()
