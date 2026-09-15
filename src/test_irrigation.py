"""
AgriSmart AI - Comprehensive Smart Irrigation Unit & Boundary Test Suite
Tests all 10 required test cases from Prompt 7 Section 15, boundary limits,
input validations, and explainability.
"""

import os
import sys
import math
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.irrigation_service import (
    calculate_irrigation_recommendation,
    validate_soil_moisture,
    validate_rain_probability,
    get_irrigation_decision,
    IrrigationValidationError,
    IrrigationWeatherUnavailableError
)


class TestSmartIrrigationEngine(unittest.TestCase):
    """Verifies the exact irrigation decision rules and boundary cases."""

    # -------------------------------------------------------------------------
    # The 10 Specific Test Cases from Prompt 7 Section 15
    # -------------------------------------------------------------------------

    def test_case_1(self):
        """Case 1: soil = 25, rain = 20 -> Irrigate now"""
        res = calculate_irrigation_recommendation(25.0, 20)
        self.assertEqual(res["recommendation"], "Irrigate now")
        self.assertIn("25", res["reason"])
        self.assertIn("20%", res["reason"])

    def test_case_2(self):
        """Case 2: soil = 25, rain = 29 -> Irrigate now"""
        res = calculate_irrigation_recommendation(25.0, 29)
        self.assertEqual(res["recommendation"], "Irrigate now")

    def test_case_3(self):
        """Case 3: soil = 25, rain = 30 -> Monitor (rain is not < 30)"""
        res = calculate_irrigation_recommendation(25.0, 30)
        self.assertEqual(res["recommendation"], "Monitor")

    def test_case_4(self):
        """Case 4: soil = 29, rain = 29 -> Irrigate now (both strictly < 30)"""
        res = calculate_irrigation_recommendation(29.0, 29)
        self.assertEqual(res["recommendation"], "Irrigate now")

    def test_case_5(self):
        """Case 5: soil = 30, rain = 29 -> Monitor (soil is not < 30)"""
        res = calculate_irrigation_recommendation(30.0, 29)
        self.assertEqual(res["recommendation"], "Monitor")

    def test_case_6(self):
        """Case 6: soil = 31, rain = 29 -> Monitor (soil >= 30)"""
        res = calculate_irrigation_recommendation(31.0, 29)
        self.assertEqual(res["recommendation"], "Monitor")

    def test_case_7(self):
        """Case 7: soil = 25, rain = 60 -> Monitor (rain is not > 60, and rain not < 30)"""
        res = calculate_irrigation_recommendation(25.0, 60)
        self.assertEqual(res["recommendation"], "Monitor")

    def test_case_8(self):
        """Case 8: soil = 25, rain = 61 -> Delay irrigation (rain strictly > 60)"""
        res = calculate_irrigation_recommendation(25.0, 61)
        self.assertEqual(res["recommendation"], "Delay irrigation")

    def test_case_9(self):
        """Case 9: soil = 80, rain = 80 -> Delay irrigation (rain > 60)"""
        res = calculate_irrigation_recommendation(80.0, 80)
        self.assertEqual(res["recommendation"], "Delay irrigation")

    def test_case_10(self):
        """Case 10: soil = 50, rain = 20 -> Monitor (soil not < 30)"""
        res = calculate_irrigation_recommendation(50.0, 20)
        self.assertEqual(res["recommendation"], "Monitor")

    # -------------------------------------------------------------------------
    # Extremes and Additional Boundaries
    # -------------------------------------------------------------------------

    def test_extreme_soil_zero(self):
        """Soil at 0% with no rain -> Irrigate now"""
        res = calculate_irrigation_recommendation(0.0, 0)
        self.assertEqual(res["recommendation"], "Irrigate now")

    def test_extreme_soil_hundred(self):
        """Soil at 100% with no rain -> Monitor"""
        res = calculate_irrigation_recommendation(100.0, 0)
        self.assertEqual(res["recommendation"], "Monitor")

    def test_rain_boundary_59_60_61(self):
        """Verify strict > 60 boundary: 59% (Monitor), 60% (Monitor), 61% (Delay)"""
        self.assertEqual(calculate_irrigation_recommendation(25.0, 59)["recommendation"], "Monitor")
        self.assertEqual(calculate_irrigation_recommendation(25.0, 60)["recommendation"], "Monitor")
        self.assertEqual(calculate_irrigation_recommendation(25.0, 61)["recommendation"], "Delay irrigation")

    def test_decimal_values(self):
        """Decimal values like 29.9% soil moisture should evaluate correctly."""
        # 29.9 < 30 and 20 < 30 -> Irrigate now
        res = calculate_irrigation_recommendation(29.9, 20)
        self.assertEqual(res["recommendation"], "Irrigate now")

    # -------------------------------------------------------------------------
    # Input Validation Tests
    # -------------------------------------------------------------------------

    def test_valid_soil_inputs(self):
        """Valid inputs must parse to floats."""
        self.assertEqual(validate_soil_moisture(25), 25.0)
        self.assertEqual(validate_soil_moisture("30.5"), 30.5)
        self.assertEqual(validate_soil_moisture(0), 0.0)
        self.assertEqual(validate_soil_moisture(100), 100.0)

    def test_invalid_soil_inputs(self):
        """Negative, > 100, strings, None, NaN, and Inf must be rejected."""
        with self.assertRaises(IrrigationValidationError):
            validate_soil_moisture(-5)
        with self.assertRaises(IrrigationValidationError):
            validate_soil_moisture(101)
        with self.assertRaises(IrrigationValidationError):
            validate_soil_moisture("abc")
        with self.assertRaises(IrrigationValidationError):
            validate_soil_moisture(None)
        with self.assertRaises(IrrigationValidationError):
            validate_soil_moisture("")
        with self.assertRaises(IrrigationValidationError):
            validate_soil_moisture(float("nan"))
        with self.assertRaises(IrrigationValidationError):
            validate_soil_moisture(float("inf"))

    def test_get_irrigation_decision_with_direct_rain(self):
        """Direct rain input evaluation through get_irrigation_decision."""
        res = get_irrigation_decision(soil_moisture_input=22.5, rain_probability_input=15)
        self.assertEqual(res["recommendation"], "Irrigate now")
        self.assertEqual(res["soil_moisture"], 22.5)
        self.assertEqual(res["rain_probability_24h"], 15)

    def test_crop_and_growth_stage_sensitivity(self):
        """Verify that crop type and growth stage adjust thresholds appropriately."""
        # 1. Standard: soil 32%, rain 20% -> Monitor (32 >= 30)
        baseline = calculate_irrigation_recommendation(32.0, 20)
        self.assertEqual(baseline["recommendation"], "Monitor")

        # 2. Rice at flowering: threshold adjusts to 30 + 10 + 5 = 45%
        # Soil 32% < 45% -> Irrigate now!
        rice_flowering = calculate_irrigation_recommendation(32.0, 20, crop_type="Rice", growth_stage="Flowering")
        self.assertEqual(rice_flowering["recommendation"], "Irrigate now")
        self.assertIn("Rice", rice_flowering["reason"])
        self.assertIn("Flowering", rice_flowering["reason"])
        self.assertEqual(rice_flowering["effective_threshold"], 45.0)

        # 3. Cotton at maturity: threshold adjusts to 30 - 5 - 5 = 20%
        # Soil 25% > 20% -> Monitor (doesn't trigger premature watering at harvest)
        cotton_mat = calculate_irrigation_recommendation(25.0, 20, crop_type="Cotton", growth_stage="Maturity")
        self.assertEqual(cotton_mat["recommendation"], "Monitor")
        self.assertEqual(cotton_mat["effective_threshold"], 20.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
