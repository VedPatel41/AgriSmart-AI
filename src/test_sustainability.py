"""
AgriSmart AI - Sustainability / Eco Score Unit & Integration Test Suite
Tests all requirements from Prompt 8 Section 17:
- Minimum/maximum bounds
- Component calculations (water efficiency & weather adaptation)
- Clamping guarantees [0, 100]
- Rating categories (Excellent, Good, Fair, Needs Improvement)
- Input validation (rejections of negative, >100, NaN, Inf, strings)
- Dynamic explainability
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.sustainability_service import (
    calculate_sustainability_score,
    validate_moisture,
    validate_rain_prob,
    get_rating_category,
    get_sustainability_assessment,
    SustainabilityValidationError
)


class TestSustainabilityEngine(unittest.TestCase):
    """Verifies rule-based sustainability calculation and boundary conditions."""

    def test_minimum_valid_inputs(self):
        """Minimum valid inputs (soil=0, rain=0) -> Irrigate now, score within [0, 100]."""
        res = calculate_sustainability_score(soil_moisture=0.0, rain_probability_24h=0)
        self.assertGreaterEqual(res["score"], 0)
        self.assertLessEqual(res["score"], 100)
        self.assertEqual(res["metrics"]["recommendation"], "Irrigate now")
        self.assertIn("score", res)
        self.assertIn("breakdown", res)
        self.assertIn("water_efficiency", res["breakdown"])
        self.assertIn("weather_adaptation", res["breakdown"])

    def test_maximum_valid_inputs(self):
        """Maximum valid inputs (soil=100, rain=100) -> Delay irrigation."""
        res = calculate_sustainability_score(soil_moisture=100.0, rain_probability_24h=100)
        self.assertEqual(res["metrics"]["recommendation"], "Delay irrigation")
        self.assertGreaterEqual(res["score"], 0)
        self.assertLessEqual(res["score"], 100)

    def test_typical_water_delay_scenario(self):
        """Rain probability 75% -> Delay irrigation -> High water conservation score."""
        res = calculate_sustainability_score(
            soil_moisture=35.0,
            rain_probability_24h=75,
            disease_risk="Low"
        )
        # Water efficiency is 95, weather adaptation (Low risk) is 90
        # Overall = 95*0.6 + 90*0.4 = 57 + 36 = 93 -> Excellent
        self.assertEqual(res["score"], 93)
        self.assertEqual(res["rating"], "Excellent")
        self.assertIn("Postponing irrigation", res["reasons"][0])

    def test_optimal_soil_balance_scenario(self):
        """Soil at 45% (adequate) and rain at 20% -> Monitor -> 85 water score."""
        res = calculate_sustainability_score(
            soil_moisture=45.0,
            rain_probability_24h=20,
            disease_risk="Moderate"
        )
        # Water score = 85, weather score = 70
        # Overall = 85*0.6 + 70*0.4 = 51 + 28 = 79 -> Good
        self.assertEqual(res["score"], 79)
        self.assertEqual(res["rating"], "Good")

    def test_high_disease_risk_impact(self):
        """High disease risk lowers the environmental adaptation component."""
        res = calculate_sustainability_score(
            soil_moisture=25.0,
            rain_probability_24h=10,
            disease_risk="High"
        )
        # Water score = 75 (Irrigate now), weather score = 50 (High risk)
        # Overall = 75*0.6 + 50*0.4 = 45 + 20 = 65 -> Good
        self.assertEqual(res["score"], 65)
        self.assertEqual(res["breakdown"]["weather_adaptation"], 50)

    def test_score_clamping_guarantee(self):
        """Score must never be negative or exceed 100 under any edge conditions."""
        res_low = calculate_sustainability_score(0.0, 0, disease_risk="High")
        self.assertGreaterEqual(res_low["score"], 0)

        res_high = calculate_sustainability_score(50.0, 80, disease_risk="Low")
        self.assertLessEqual(res_high["score"], 100)

    def test_rating_categories(self):
        """Test score categorization mapping."""
        self.assertEqual(get_rating_category(85), "Excellent")
        self.assertEqual(get_rating_category(80), "Excellent")
        self.assertEqual(get_rating_category(75), "Good")
        self.assertEqual(get_rating_category(60), "Good")
        self.assertEqual(get_rating_category(55), "Fair")
        self.assertEqual(get_rating_category(40), "Fair")
        self.assertEqual(get_rating_category(35), "Needs Improvement")
        self.assertEqual(get_rating_category(0), "Needs Improvement")

    def test_validation_rejections(self):
        """Negative values, >100, strings, NaN, Inf, and empty must raise SustainabilityValidationError."""
        with self.assertRaises(SustainabilityValidationError):
            validate_moisture(-1)
        with self.assertRaises(SustainabilityValidationError):
            validate_moisture(101)
        with self.assertRaises(SustainabilityValidationError):
            validate_moisture("abc")
        with self.assertRaises(SustainabilityValidationError):
            validate_moisture(None)
        with self.assertRaises(SustainabilityValidationError):
            validate_moisture("")
        with self.assertRaises(SustainabilityValidationError):
            validate_moisture(float("nan"))
        with self.assertRaises(SustainabilityValidationError):
            validate_moisture(float("inf"))

        with self.assertRaises(SustainabilityValidationError):
            validate_rain_prob(-5)
        with self.assertRaises(SustainabilityValidationError):
            validate_rain_prob(150)

    def test_assessment_coordinator(self):
        """get_sustainability_assessment returns complete payload with reasons and suggestions."""
        res = get_sustainability_assessment(
            soil_moisture_input=28.0,
            rain_probability_input=65,
            disease_risk_input="Low"
        )
        self.assertIn("score", res)
        self.assertIn("rating", res)
        self.assertIn("suggestion", res)
        self.assertTrue(len(res["reasons"]) >= 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
