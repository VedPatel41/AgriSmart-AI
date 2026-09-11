"""
AgriSmart AI - Smart Irrigation Decision Engine
Module: src.irrigation_service

Provides deterministic, explainable irrigation recommendations by evaluating
manually entered soil moisture against real next-24-hour rainfall forecasts
derived from the Prompt 6 weather intelligence system.

Rules:
1. If next-24h rain probability > 60% -> "Delay irrigation"
2. If soil moisture < 30% AND next-24h rain probability < 30% -> "Irrigate now"
3. Otherwise -> "Monitor"
"""

import math
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("agrismart.irrigation")


class IrrigationError(Exception):
    """Base exception for irrigation engine operations."""
    status_code = 500
    error_code = "IRRIGATION_ERROR"

    def __init__(self, message: str, status_code: int = 500, error_code: str = "IRRIGATION_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code


class IrrigationValidationError(IrrigationError):
    """Raised when user input for soil moisture or rain probability is invalid."""
    def __init__(self, message: str = "Invalid soil moisture percentage provided."):
        super().__init__(message, status_code=400, error_code="INVALID_INPUT")


class IrrigationWeatherUnavailableError(IrrigationError):
    """Raised when live next-24h rain probability cannot be obtained from the weather service."""
    def __init__(self, message: str = "Weather forecast is unavailable. Real next-24h rain probability is required for irrigation decisions."):
        super().__init__(message, status_code=503, error_code="WEATHER_UNAVAILABLE")


# Legitimate rule threshold constants (Not demo/fake values)
RAIN_DELAY_THRESHOLD = 60      # Next-24h rain probability strictly > 60%
SOIL_DRY_THRESHOLD = 30        # Soil moisture strictly < 30%
RAIN_LOW_THRESHOLD = 30        # Next-24h rain probability strictly < 30%


def validate_soil_moisture(value: Any) -> float:
    """
    Validates that soil moisture is a real numeric percentage between 0 and 100.
    Rejects None, empty strings, letters, negative numbers, numbers > 100, NaN, and Infinity.
    """
    if value is None or value == "":
        raise IrrigationValidationError("Soil moisture is required. Please enter a value between 0 and 100%.")

    try:
        val_float = float(value)
    except (ValueError, TypeError):
        raise IrrigationValidationError(f"Invalid soil moisture '{value}'. Please enter a valid number between 0 and 100.")

    if math.isnan(val_float) or math.isinf(val_float):
        raise IrrigationValidationError("Soil moisture cannot be NaN or Infinite.")

    if not (0.0 <= val_float <= 100.0):
        raise IrrigationValidationError(f"Soil moisture {val_float}% is out of bounds. Must be between 0% and 100%.")

    return round(val_float, 1)


def validate_rain_probability(value: Any) -> int:
    """
    Validates rain probability.
    Supports legacy 0.0 - 1.0 fraction or standard 0 - 100 integer percentage.
    """
    if value is None:
        raise IrrigationValidationError("Rain probability value is required.")

    try:
        val_float = float(value)
    except (ValueError, TypeError):
        raise IrrigationValidationError(f"Invalid rain probability '{value}'.")

    if math.isnan(val_float) or math.isinf(val_float):
        raise IrrigationValidationError("Rain probability cannot be NaN or Infinite.")

    # Handle legacy decimal representation (e.g. 0.65 -> 65%)
    if 0.0 <= val_float <= 1.0 and isinstance(value, float):
        val_float = val_float * 100.0

    if not (0.0 <= val_float <= 100.0):
        raise IrrigationValidationError(f"Rain probability {val_float}% is out of range (0-100%).")

    return int(round(val_float))


def calculate_irrigation_recommendation(
    soil_moisture: float,
    rain_probability_24h: int
) -> Dict[str, Any]:
    """
    Pure rule engine applying the project's exact irrigation decision rules:

    RULE 1:
    If next-24h rain probability > 60%
    -> Recommendation: "Delay irrigation"

    RULE 2:
    If soil moisture < 30% AND next-24h rain probability < 30%
    -> Recommendation: "Irrigate now"

    RULE 3:
    Otherwise
    -> Recommendation: "Monitor"
    """
    # Rule 1: High rain probability upcoming in next 24h
    if rain_probability_24h > RAIN_DELAY_THRESHOLD:
        return {
            "recommendation": "Delay irrigation",
            "decision": "delay_irrigation",
            "soil_moisture": soil_moisture,
            "rain_probability_24h": rain_probability_24h,
            "rule": f"Next-24h rain probability ({rain_probability_24h}%) is above {RAIN_DELAY_THRESHOLD}% threshold.",
            "reason": f"Next-24h rain probability is {rain_probability_24h}%, which is above the {RAIN_DELAY_THRESHOLD}% threshold. Delaying irrigation prevents waterlogging, nutrient leaching, and unnecessary water expenditure.",
            "action": "Delay watering to conserve water"
        }

    # Rule 2: Soil is dry and low probability of rain
    if soil_moisture < SOIL_DRY_THRESHOLD and rain_probability_24h < RAIN_LOW_THRESHOLD:
        return {
            "recommendation": "Irrigate now",
            "decision": "irrigate_now",
            "soil_moisture": soil_moisture,
            "rain_probability_24h": rain_probability_24h,
            "rule": f"Soil moisture ({soil_moisture}%) is below {SOIL_DRY_THRESHOLD}% and rain probability ({rain_probability_24h}%) is below {RAIN_LOW_THRESHOLD}%.",
            "reason": f"Soil moisture is {soil_moisture}%, which is below the {SOIL_DRY_THRESHOLD}% threshold, and next-24h rain probability is {rain_probability_24h}%, which is below {RAIN_LOW_THRESHOLD}%. Immediate root zone irrigation is recommended.",
            "action": "Irrigation recommended"
        }

    # Rule 3: Otherwise -> Monitor
    return {
        "recommendation": "Monitor",
        "decision": "monitor",
        "soil_moisture": soil_moisture,
        "rain_probability_24h": rain_probability_24h,
        "rule": f"Soil moisture ({soil_moisture}%) and next-24h rain probability ({rain_probability_24h}%) do not trigger immediate irrigation or delay thresholds.",
        "reason": f"Soil moisture is {soil_moisture}% and next-24h rain probability is {rain_probability_24h}%. Current moisture conditions do not require immediate water application or postponement; continue routine monitoring.",
        "action": "Maintain standard soil monitoring"
    }


def get_irrigation_decision(
    soil_moisture_input: Any,
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    rain_probability_input: Optional[Any] = None,
    weather_service_instance: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Coordinates input validation, weather forecast lookup, and rule evaluation.
    """
    soil_moisture = validate_soil_moisture(soil_moisture_input)

    # 1. Check if rain_probability was provided directly
    if rain_probability_input is not None:
        rain_probability_24h = validate_rain_probability(rain_probability_input)
        location_name = city or "Provided Forecast"
    else:
        # 2. Retrieve real next-24h rain probability from Prompt 6 weather service
        if weather_service_instance is None:
            try:
                from src.weather_service import weather_service as default_ws
                weather_service_instance = default_ws
            except ImportError:
                from weather_service import weather_service as default_ws
                weather_service_instance = default_ws

        query_city = city or "Ahmedabad"
        try:
            weather_data = weather_service_instance.get_weather(city=query_city, lat=lat, lon=lon)
        except Exception as e:
            logger.warning("Failed to fetch live weather for irrigation decision: %s", str(e))
            raise IrrigationWeatherUnavailableError(
                "Cannot compute irrigation advisory: Live weather service is unavailable or unconfigured."
            )

        fc = weather_data.get("forecast", {})
        rain_prob = fc.get("rain_probability_24h")
        if rain_prob is None or not fc.get("forecast_available", False):
            raise IrrigationWeatherUnavailableError(
                "Cannot compute irrigation advisory: Next-24h precipitation probability is not available for this location."
            )

        rain_probability_24h = int(rain_prob)
        location_name = weather_data.get("location", {}).get("name", query_city)

    # 3. Calculate recommendation
    result = calculate_irrigation_recommendation(soil_moisture, rain_probability_24h)
    result["location"] = location_name
    return result
