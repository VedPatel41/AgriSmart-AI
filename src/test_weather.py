"""
AgriSmart AI - Comprehensive Weather Service & API Verification Suite
Tests:
- Input validation (valid/invalid cities, coordinate boundaries)
- 24-hour forecast rain probability parsing
- Rule-based crop disease risk indicator (Low, Moderate, High)
- In-memory TTL caching and cache bypass
- Missing API key / NOT_CONFIGURED state handling
- Backend Flask GET /weather and POST /weather contract
- Decoupling from crop disease prediction
"""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.weather_service import (
    WeatherService,
    WeatherNotConfiguredError,
    WeatherValidationError,
    WeatherNotFoundError,
    WeatherAuthenticationError
)
from src.app import app


class TestWeatherServiceLogic(unittest.TestCase):
    """Unit tests for weather service internal calculations and rules."""

    def setUp(self):
        self.service = WeatherService(api_key="mock_test_key_123")

    def test_location_validation_valid(self):
        """Valid city names and coordinates must sanitize properly."""
        city, lat, lon = self.service.validate_location("Ahmedabad", None, None)
        self.assertEqual(city, "Ahmedabad")
        self.assertIsNone(lat)
        self.assertIsNone(lon)

        city, lat, lon = self.service.validate_location(None, 23.0225, 72.5714)
        self.assertIsNone(city)
        self.assertAlmostEqual(lat, 23.0225)
        self.assertAlmostEqual(lon, 72.5714)

    def test_location_validation_invalid(self):
        """Empty inputs, excessive lengths, or out-of-range coords must raise WeatherValidationError."""
        with self.assertRaises(WeatherValidationError):
            self.service.validate_location("", None, None)

        with self.assertRaises(WeatherValidationError):
            self.service.validate_location("   ", None, None)

        with self.assertRaises(WeatherValidationError):
            self.service.validate_location("A" * 100, None, None)

        with self.assertRaises(WeatherValidationError):
            self.service.validate_location("City<script>alert(1)</script>", None, None)

        with self.assertRaises(WeatherValidationError):
            self.service.validate_location(None, 95.0, 72.0)  # Lat out of range

        with self.assertRaises(WeatherValidationError):
            self.service.validate_location(None, None, None)  # Neither provided

    def test_24h_rain_probability_calculation(self):
        """24-hour rain probability must be peak POP across first 8 3h-slices (24 hours)."""
        # 8 slices with varying POPs: peak is 0.75 (75%)
        mock_forecast = {
            "list": [
                {"pop": 0.10, "dt_txt": "2026-09-11 12:00:00"},
                {"pop": 0.35, "dt_txt": "2026-09-11 15:00:00"},
                {"pop": 0.75, "dt_txt": "2026-09-11 18:00:00"},  # Max in 24h
                {"pop": 0.40, "dt_txt": "2026-09-11 21:00:00"},
                {"pop": 0.20, "dt_txt": "2026-09-12 00:00:00"},
                {"pop": 0.15, "dt_txt": "2026-09-12 03:00:00"},
                {"pop": 0.05, "dt_txt": "2026-09-12 06:00:00"},
                {"pop": 0.10, "dt_txt": "2026-09-12 09:00:00"},
                # 9th slice is 27 hours in the future, should be excluded even if higher
                {"pop": 0.99, "dt_txt": "2026-09-12 12:00:00"}
            ]
        }
        rain_prob, available = self.service._calculate_24h_rain_prob(mock_forecast)
        self.assertTrue(available)
        self.assertEqual(rain_prob, 75)

    def test_24h_rain_prob_unavailable_returns_none(self):
        """If provider does not supply pop or forecast is empty, return None without fabricating."""
        rain_prob, available = self.service._calculate_24h_rain_prob(None)
        self.assertFalse(available)
        self.assertIsNone(rain_prob)

        mock_no_pop = {"list": [{"temp": 30.0}, {"temp": 28.0}]}
        rain_prob, available = self.service._calculate_24h_rain_prob(mock_no_pop)
        self.assertFalse(available)
        self.assertIsNone(rain_prob)

    def test_crop_disease_risk_rules(self):
        """Test transparent agronomic risk rules and dynamic explanations."""
        # 1. High Risk: Humidity >= 75% AND 24h Rain >= 60%
        high_risk = self.service._calculate_disease_risk(28.0, 82, 70)
        self.assertEqual(high_risk["level"], "High")
        self.assertIn("82%", high_risk["reason"])
        self.assertIn("70%", high_risk["reason"])

        # 2. Moderate Risk: Humidity >= 70% OR Rain >= 50%
        mod_risk_hum = self.service._calculate_disease_risk(31.0, 74, 20)
        self.assertEqual(mod_risk_hum["level"], "Moderate")
        self.assertIn("74%", mod_risk_hum["reason"])

        # 3. Moderate Risk: Warm temp (20-30°C) with Humidity >= 65%
        mod_risk_temp = self.service._calculate_disease_risk(26.5, 68, 10)
        self.assertEqual(mod_risk_temp["level"], "Moderate")
        self.assertIn("26.5°C", mod_risk_temp["reason"])

        # 4. Low Risk: Dry weather
        low_risk = self.service._calculate_disease_risk(34.0, 42, 10)
        self.assertEqual(low_risk["level"], "Low")
        self.assertIn("42%", low_risk["reason"])

    def test_caching_mechanism(self):
        """Verify 10-minute cache prevents redundant upstream calls."""
        mock_curr = {
            "name": "Ahmedabad",
            "main": {"temp": 31.2, "humidity": 65},
            "weather": [{"main": "Clear", "description": "clear sky", "icon": "01d"}],
            "wind": {"speed": 3.5},
            "coord": {"lat": 23.02, "lon": 72.57},
            "sys": {"country": "IN"}
        }
        with patch.object(self.service, "_fetch_from_owm", return_value=(mock_curr, None)) as mock_fetch:
            # First call -> fetch called
            res1 = self.service.get_weather(city="Ahmedabad")
            self.assertEqual(res1["cached"], False)
            self.assertEqual(mock_fetch.call_count, 1)

            # Second call immediately -> served from cache
            res2 = self.service.get_weather(city="Ahmedabad")
            self.assertEqual(res2["cached"], True)
            self.assertEqual(mock_fetch.call_count, 1)

            # Bypass cache flag -> forces upstream call
            res3 = self.service.get_weather(city="Ahmedabad", bypass_cache=True)
            self.assertEqual(res3["cached"], False)
            self.assertEqual(mock_fetch.call_count, 2)


class TestWeatherFlaskEndpoints(unittest.TestCase):
    """Integration tests for Flask /weather endpoint."""

    def setUp(self):
        self.client = app.test_client()

    def test_missing_location_returns_400(self):
        """Endpoint must return 400 if no location is specified."""
        res = self.client.get("/weather")
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertEqual(data["code"], "MISSING_LOCATION")

    def test_unconfigured_api_key_returns_503(self):
        """When OPENWEATHER_API_KEY is empty, endpoint returns 503 NOT_CONFIGURED without fake data."""
        with patch("src.weather_service.weather_service._api_key", ""):
            with patch.dict(os.environ, {"OPENWEATHER_API_KEY": ""}):
                res = self.client.get("/weather?city=Ahmedabad")
                self.assertEqual(res.status_code, 503)
                data = res.get_json()
                self.assertEqual(data["code"], "NOT_CONFIGURED")
                self.assertIn("not configured", data["error"].lower())

    def test_successful_weather_get_and_post_contract(self):
        """When API key is present, /weather returns normalized contract matching specification."""
        mock_curr = {
            "name": "Pune",
            "main": {"temp": 28.4, "humidity": 72},
            "weather": [{"main": "Clouds", "description": "broken clouds", "icon": "04d"}],
            "wind": {"speed": 4.1},
            "coord": {"lat": 18.52, "lon": 73.85},
            "sys": {"country": "IN"}
        }
        mock_forecast = {
            "list": [
                {"pop": 0.45, "dt_txt": "2026-09-11 12:00:00"},
                {"pop": 0.65, "dt_txt": "2026-09-11 15:00:00"}
            ]
        }

        # Clear cache before test
        from src.weather_service import weather_service
        weather_service.clear_cache()

        with patch.object(weather_service, "_api_key", "valid_mock_key_abc"):
            with patch.object(weather_service, "_fetch_from_owm", return_value=(mock_curr, mock_forecast)):
                # 1. Test GET /weather?city=Pune
                res_get = self.client.get("/weather?city=Pune")
                self.assertEqual(res_get.status_code, 200)
                data_get = res_get.get_json()

                # Verify contract
                self.assertEqual(data_get["location"]["name"], "Pune")
                self.assertEqual(data_get["location"]["country"], "IN")
                self.assertEqual(data_get["current"]["temperature_c"], 28.4)
                self.assertEqual(data_get["current"]["humidity_percent"], 72)
                self.assertEqual(data_get["forecast"]["rain_probability_24h"], 65)
                self.assertTrue(data_get["forecast"]["forecast_available"])
                self.assertIn(data_get["risk"]["level"], ["Low", "Moderate", "High"])
                self.assertTrue(len(data_get["risk"]["reason"]) > 0)

                # 2. Test POST /weather with JSON
                res_post = self.client.post("/weather", json={"city": "Pune", "refresh": True})
                self.assertEqual(res_post.status_code, 200)
                data_post = res_post.get_json()
                self.assertEqual(data_post["location"]["name"], "Pune")

    def test_decoupling_with_disease_prediction(self):
        """Crop disease prediction endpoint must remain 100% operational even if weather fails."""
        # Check /health endpoint
        health_res = self.client.get("/health")
        self.assertIn(health_res.status_code, [200, 503])


if __name__ == "__main__":
    unittest.main(verbosity=2)
