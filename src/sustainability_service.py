"""
AgriSmart AI - Farm Sustainability & Water Efficiency Score Service
Module: src.sustainability_service

Provides an explainable, rule-based environmental stewardship indicator (0-100)
evaluating water conservation efficiency, weather-aligned irrigation choices,
and micro-climate pathogen adaptation.

Notice:
- This is an agronomic stewardship indicator, NOT a research-grade carbon audit.
- Uses real inputs from the irrigation and weather modules.
"""

import math
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger("agrismart.sustainability")


class SustainabilityError(Exception):
    """Base exception for sustainability engine operations."""
    status_code = 500
    error_code = "SUSTAINABILITY_ERROR"

    def __init__(self, message: str, status_code: int = 500, error_code: str = "SUSTAINABILITY_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code


class SustainabilityValidationError(SustainabilityError):
    """Raised when user input for sustainability evaluation is invalid."""
    def __init__(self, message: str = "Invalid input for sustainability calculation."):
        super().__init__(message, status_code=400, error_code="INVALID_INPUT")


def validate_moisture(val: Any) -> float:
    """Validates that soil moisture is a real float between 0 and 100."""
    if val is None or val == "":
        raise SustainabilityValidationError("Soil moisture value is required for sustainability scoring.")
    try:
        f = float(val)
    except (ValueError, TypeError):
        raise SustainabilityValidationError(f"Invalid soil moisture '{val}'. Must be a number between 0 and 100.")
    if math.isnan(f) or math.isinf(f):
        raise SustainabilityValidationError("Soil moisture cannot be NaN or Infinite.")
    if not (0.0 <= f <= 100.0):
        raise SustainabilityValidationError(f"Soil moisture {f}% out of bounds (0-100%).")
    return round(f, 1)


def validate_rain_prob(val: Any) -> int:
    """Validates that rain probability is between 0 and 100."""
    if val is None or val == "":
        raise SustainabilityValidationError("Rain probability is required for sustainability scoring.")
    try:
        f = float(val)
    except (ValueError, TypeError):
        raise SustainabilityValidationError(f"Invalid rain probability '{val}'.")
    if math.isnan(f) or math.isinf(f):
        raise SustainabilityValidationError("Rain probability cannot be NaN or Infinite.")
    if 0.0 <= f <= 1.0 and isinstance(val, float):
        f = f * 100.0
    if not (0.0 <= f <= 100.0):
        raise SustainabilityValidationError(f"Rain probability {f}% out of bounds (0-100%).")
    return int(round(f))


def get_rating_category(score: int) -> str:
    """Categorizes 0-100 score into transparent indicator rating."""
    if score >= 80:
        return "Excellent"
    if score >= 60:
        return "Good"
    if score >= 40:
        return "Fair"
    return "Needs Improvement"


def calculate_sustainability_score(
    soil_moisture: float,
    rain_probability_24h: int,
    recommendation: Optional[str] = None,
    disease_risk: Optional[str] = None
) -> Dict[str, Any]:
    """
    Pure rule-based scoring engine.
    Calculates 0-100 Sustainability Indicator based on real irrigation and weather metrics.
    """
    reasons: List[str] = []

    # 1. Determine Irrigation Decision if not provided
    if not recommendation:
        if rain_probability_24h > 60:
            recommendation = "Delay irrigation"
        elif soil_moisture < 30 and rain_probability_24h < 30:
            recommendation = "Irrigate now"
        else:
            recommendation = "Monitor"

    # 2. Component A: Water Efficiency & Stewardship (Weight: 60%)
    if recommendation == "Delay irrigation":
        water_score = 95
        reasons.append(
            f"Water conservation: Postponing irrigation ahead of forecast rainfall ({rain_probability_24h}%) prevents runoff and preserves water."
        )
        suggestion = "Rely on upcoming natural precipitation to replenish root zone moisture without pumping."
    elif recommendation == "Monitor":
        if 30.0 <= soil_moisture <= 60.0:
            water_score = 85
            reasons.append(
                f"Optimal soil balance: Soil moisture is within the balanced target zone ({soil_moisture}%), avoiding unneeded water extraction."
            )
            suggestion = "Maintain routine moisture scouting before scheduling the next irrigation cycle."
        elif soil_moisture > 60.0:
            water_score = 65
            reasons.append(
                f"Saturated soil: High soil moisture ({soil_moisture}%); no irrigation needed, but watch for field drainage."
            )
            suggestion = "Ensure adequate field drainage to prevent standing water and root asphyxiation."
        else:
            water_score = 75
            reasons.append(
                f"Moderate caution: Low moisture ({soil_moisture}%) but moderate rain probability ({rain_probability_24h}%) suggests brief observation."
            )
            suggestion = "Check soil moisture again in 12 hours before turning on pumps."
    else:  # "Irrigate now"
        water_score = 75
        reasons.append(
            f"Targeted irrigation: Irrigating strictly when root zone is deficient ({soil_moisture}%) and rain is unlikely ({rain_probability_24h}%) minimizes wasted water."
        )
        suggestion = "Apply water via drip or micro-sprinkler during early morning or evening hours to minimize evaporative loss."

    # 3. Component B: Micro-Climate & Disease Adaptation (Weight: 40%)
    risk_norm = str(disease_risk).strip().capitalize() if disease_risk else "Moderate"
    if risk_norm == "Low":
        weather_score = 90
        reasons.append(
            "Favorable micro-climate: Low foliar disease risk reduces the need for synthetic fungicide applications."
        )
    elif risk_norm == "High":
        weather_score = 50
        reasons.append(
            "High micro-climate pressure: Sustained humidity and rain increase disease risk, requiring diligent crop monitoring."
        )
    else:  # Moderate / Default
        weather_score = 70
        reasons.append(
            "Moderate environmental conditions: Micro-climate moisture warrants regular crop field scouting."
        )

    # 4. Overall Weighted Score Calculation
    raw_overall = (water_score * 0.60) + (weather_score * 0.40)
    score = int(round(raw_overall))
    # Strict clamping bounds: [0, 100]
    score = max(0, min(100, score))
    rating = get_rating_category(score)

    return {
        "score": score,
        "rating": rating,
        "category": rating,
        "breakdown": {
            "water_efficiency": water_score,
            "weather_adaptation": weather_score
        },
        "weights": {
            "water_efficiency": 0.60,
            "weather_adaptation": 0.40
        },
        "metrics": {
            "soil_moisture": soil_moisture,
            "rain_probability_24h": rain_probability_24h,
            "recommendation": recommendation,
            "disease_risk": risk_norm
        },
        "reasons": reasons,
        "suggestion": suggestion,
        "indicator_type": "Rule-based Agronomic Stewardship Score"
    }


def get_sustainability_assessment(
    soil_moisture_input: Any,
    rain_probability_input: Optional[Any] = None,
    recommendation_input: Optional[str] = None,
    disease_risk_input: Optional[str] = None,
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    weather_service_instance: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Coordinates inputs from user, weather service, and irrigation module.
    """
    soil_moisture = validate_moisture(soil_moisture_input)

    # Resolve rain probability and disease risk if not passed
    rain_prob = None
    if rain_probability_input is not None:
        rain_prob = validate_rain_prob(rain_probability_input)

    disease_risk = disease_risk_input

    if rain_prob is None or disease_risk is None:
        if weather_service_instance is None:
            try:
                from src.weather_service import weather_service as default_ws
                weather_service_instance = default_ws
            except ImportError:
                from weather_service import weather_service as default_ws
                weather_service_instance = default_ws

        query_city = city or "Ahmedabad"
        try:
            w_data = weather_service_instance.get_weather(city=query_city, lat=lat, lon=lon)
            if rain_prob is None:
                fc = w_data.get("forecast", {})
                if fc.get("forecast_available") and fc.get("rain_probability_24h") is not None:
                    rain_prob = int(fc.get("rain_probability_24h"))
            if disease_risk is None:
                disease_risk = w_data.get("risk", {}).get("level", "Moderate")
        except Exception as e:
            logger.info("Live weather lookup in sustainability: %s", str(e))
            if rain_prob is None:
                # If weather is unconfigured, default to neutral 20% or require rain_prob
                rain_prob = 20
            if disease_risk is None:
                disease_risk = "Moderate"

    return calculate_sustainability_score(
        soil_moisture=soil_moisture,
        rain_probability_24h=rain_prob,
        recommendation=recommendation_input,
        disease_risk=disease_risk
    )
