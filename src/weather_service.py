"""
AgriSmart AI - Real Weather Intelligence & Crop Disease Risk Service
Module: src.weather_service

Handles server-side communication with OpenWeatherMap API, normalizes
weather metrics, calculates 24-hour precipitation probability from forecast data,
computes transparent rule-based crop disease risk indicators, and provides
in-memory caching to prevent upstream rate-limiting.

Security Notice:
- OPENWEATHER_API_KEY is read strictly server-side from environment variables.
- It is NEVER exposed to client-side bundles, logs, or HTTP responses.
"""

import os
import time
import math
import logging
import requests
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple

logger = logging.getLogger("agrismart.weather")


class WeatherError(Exception):
    """Base exception for weather service operations."""
    status_code = 500
    error_code = "WEATHER_ERROR"

    def __init__(self, message: str, status_code: int = 500, error_code: str = "WEATHER_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code


class WeatherNotConfiguredError(WeatherError):
    """Raised when OPENWEATHER_API_KEY is not set or empty."""
    def __init__(self, message: str = "Weather service is not configured. Add OPENWEATHER_API_KEY in backend .env"):
        super().__init__(message, status_code=503, error_code="NOT_CONFIGURED")


class WeatherValidationError(WeatherError):
    """Raised when location parameters are invalid or empty."""
    def __init__(self, message: str = "Invalid location parameter provided"):
        super().__init__(message, status_code=400, error_code="INVALID_LOCATION")


class WeatherNotFoundError(WeatherError):
    """Raised when the specified city/coordinates are not found by the provider."""
    def __init__(self, message: str = "We couldn't find weather for that location"):
        super().__init__(message, status_code=404, error_code="LOCATION_NOT_FOUND")


class WeatherRateLimitError(WeatherError):
    """Raised when OpenWeatherMap rate limit is exceeded."""
    def __init__(self, message: str = "Weather service rate limit reached. Please try again shortly."):
        super().__init__(message, status_code=429, error_code="RATE_LIMITED")


class WeatherUnavailableError(WeatherError):
    """Raised when upstream weather service is down or times out."""
    def __init__(self, message: str = "Weather information is temporarily unavailable"):
        super().__init__(message, status_code=503, error_code="WEATHER_UNAVAILABLE")


class WeatherAuthenticationError(WeatherError):
    """Raised when the provided OpenWeatherMap API key is invalid."""
    def __init__(self, message: str = "Weather service provider authentication failed. Please verify API key."):
        super().__init__(message, status_code=502, error_code="INVALID_API_KEY")


class WeatherService:
    """
    OpenWeatherMap Client with In-Memory TTL Cache and Crop Disease Risk Evaluator.
    """

    OWM_BASE_URL = "https://api.openweathermap.org/data/2.5"
    DEFAULT_CACHE_TTL_SECONDS = 600  # 10 minutes cache window

    def __init__(self, api_key: Optional[str] = None, cache_ttl_seconds: int = DEFAULT_CACHE_TTL_SECONDS):
        self._api_key = api_key or os.getenv("OPENWEATHER_API_KEY", "").strip()
        self.cache_ttl = cache_ttl_seconds
        self._cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}

    @property
    def api_key(self) -> str:
        # Re-check os.environ if key was updated dynamically in runtime
        return self._api_key or os.getenv("OPENWEATHER_API_KEY", "").strip()

    def is_configured(self) -> bool:
        """Returns True if a non-empty API key is present."""
        return bool(self.api_key)

    def _get_cache_key(self, city: Optional[str], lat: Optional[float], lon: Optional[float]) -> str:
        if city:
            return f"city:{city.strip().lower()}"
        if lat is not None and lon is not None:
            return f"geo:{round(lat, 2)}:{round(lon, 2)}"
        return "unknown"

    def clear_cache(self):
        """Clears the in-memory weather cache."""
        self._cache.clear()

    def validate_location(self, city: Optional[str], lat: Optional[Any], lon: Optional[Any]) -> Tuple[Optional[str], Optional[float], Optional[float]]:
        """
        Validates and sanitizes location inputs.
        Rejects empty input, excessively long city strings, or out-of-range coordinates.
        """
        if city is not None:
            city_str = str(city).strip()
            if not city_str:
                raise WeatherValidationError("City name cannot be empty.")
            if len(city_str) > 80:
                raise WeatherValidationError("City name exceeds maximum allowable length of 80 characters.")
            # Verify string contains reasonable characters (letters, spaces, commas, hyphens, periods, accents)
            # Rejects script tags or suspicious SQL/path injection payloads
            if any(char in city_str for char in ["<", ">", ";", "$", "{", "}", "\\", "/"]):
                raise WeatherValidationError("City name contains invalid characters.")
            return city_str, None, None

        if lat is not None and lon is not None:
            try:
                lat_float = float(lat)
                lon_float = float(lon)
            except (ValueError, TypeError):
                raise WeatherValidationError("Latitude and longitude must be valid numeric values.")

            if math.isnan(lat_float) or math.isinf(lat_float) or math.isnan(lon_float) or math.isinf(lon_float):
                raise WeatherValidationError("Coordinates cannot be NaN or Infinite.")

            if not (-90.0 <= lat_float <= 90.0):
                raise WeatherValidationError("Latitude must be between -90 and 90 degrees.")
            if not (-180.0 <= lon_float <= 180.0):
                raise WeatherValidationError("Longitude must be between -180 and 180 degrees.")

            return None, lat_float, lon_float

        raise WeatherValidationError("Either a city name or latitude/longitude coordinates must be provided.")

    def get_weather(
        self,
        city: Optional[str] = None,
        lat: Optional[Any] = None,
        lon: Optional[Any] = None,
        bypass_cache: bool = False
    ) -> Dict[str, Any]:
        """
        Fetches current weather and next-24h forecast, normalizes the payload,
        and computes rule-based crop disease risk.
        """
        # 1. Check Configuration
        if not self.is_configured():
            logger.warning("Weather requested but OPENWEATHER_API_KEY is not configured.")
            raise WeatherNotConfiguredError(
                "Weather service is not configured. Please add OPENWEATHER_API_KEY in the backend .env to enable live weather."
            )

        # 2. Validate Inputs
        norm_city, norm_lat, norm_lon = self.validate_location(city, lat, lon)
        cache_key = self._get_cache_key(norm_city, norm_lat, norm_lon)

        # 3. Check Cache
        now = time.time()
        if not bypass_cache and cache_key in self._cache:
            cache_time, cached_data = self._cache[cache_key]
            if now - cache_time < self.cache_ttl:
                logger.info("Serving weather for '%s' from in-memory cache (age: %.1fs)", cache_key, now - cache_time)
                res = dict(cached_data)
                res["cached"] = True
                return res

        # 4. Query OpenWeatherMap Upstream
        current_data, forecast_data = self._fetch_from_owm(norm_city, norm_lat, norm_lon)

        # 5. Normalize Payload
        normalized = self._normalize_weather(current_data, forecast_data)
        normalized["cached"] = False

        # 6. Save to In-Memory Cache
        self._cache[cache_key] = (now, normalized)
        return normalized

    def _fetch_from_owm(
        self,
        city: Optional[str],
        lat: Optional[float],
        lon: Optional[float]
    ) -> Tuple[Dict[str, Any], Optional[Dict[str, Any]]]:
        """
        Executes HTTP requests to OpenWeatherMap weather and forecast endpoints.
        """
        params = {"appid": self.api_key, "units": "metric"}
        if city:
            params["q"] = city
            location_label = city
        else:
            params["lat"] = lat
            params["lon"] = lon
            location_label = f"{lat},{lon}"

        logger.info("Fetching live weather from OpenWeatherMap for location: %s", location_label)

        # Request 1: Current Weather
        try:
            curr_resp = requests.get(
                f"{self.OWM_BASE_URL}/weather",
                params=params,
                timeout=6.0
            )
        except requests.exceptions.Timeout:
            logger.error("OpenWeatherMap current weather request timed out for %s", location_label)
            raise WeatherUnavailableError("Weather service connection timed out.")
        except requests.exceptions.RequestException as e:
            logger.error("OpenWeatherMap network request failed: %s", str(e))
            raise WeatherUnavailableError("Network failure communicating with weather provider.")

        self._handle_owm_status(curr_resp, location_label)
        curr_json = curr_resp.json()

        # Request 2: 5-Day / 3-Hour Forecast (for 24h rain probability)
        forecast_json = None
        try:
            fc_resp = requests.get(
                f"{self.OWM_BASE_URL}/forecast",
                params=params,
                timeout=6.0
            )
            if fc_resp.status_code == 200:
                forecast_json = fc_resp.json()
            else:
                logger.warning(
                    "Forecast endpoint returned HTTP %d for %s. Continuing with current weather only.",
                    fc_resp.status_code, location_label
                )
        except Exception as e:
            logger.warning("Failed to retrieve forecast data for %s: %s", location_label, str(e))

        return curr_json, forecast_json

    def _handle_owm_status(self, resp: requests.Response, location_label: str):
        """Maps OpenWeatherMap HTTP status codes to custom domain errors."""
        status = resp.status_code
        if status == 200:
            return
        if status == 401:
            logger.error("OpenWeatherMap reported 401 Unauthorized. Verify OPENWEATHER_API_KEY.")
            raise WeatherAuthenticationError()
        if status == 404:
            logger.warning("OpenWeatherMap reported 404 for location: %s", location_label)
            raise WeatherNotFoundError(f"We couldn't find weather for '{location_label}'. Please check the spelling.")
        if status == 429:
            logger.error("OpenWeatherMap reported 429 Rate Limit Exceeded.")
            raise WeatherRateLimitError()
        if status >= 500:
            logger.error("OpenWeatherMap reported server error %d.", status)
            raise WeatherUnavailableError("Weather provider is currently experiencing server downtime.")

        raise WeatherUnavailableError(f"Unexpected response ({status}) from weather service.")

    def _calculate_24h_rain_prob(self, forecast_data: Optional[Dict[str, Any]]) -> Tuple[Optional[int], bool]:
        """
        Calculates the peak precipitation probability across the next 24-hour window.
        
        OpenWeatherMap 5-day forecast provides 3-hour slices (each entry has dt, pop, weather).
        The next 24 hours corresponds to the first 8 slices (8 * 3 hours = 24 hours).
        The 'pop' field indicates probability of precipitation (0.0 to 1.0).
        
        We calculate the maximum expected precipitation probability in the 24h window:
        peak_rain_prob = round(max([slice.get('pop', 0.0) for slice in slices[:8]]) * 100)
        
        Strict Rule: If 'pop' is not provided by the API tier, we do NOT fabricate or derive
        it from humidity. We return (None, False).
        """
        if not forecast_data or "list" not in forecast_data or not isinstance(forecast_data["list"], list):
            return None, False

        slices = forecast_data["list"][:8]  # First 8 entries = 24 hours
        if not slices:
            return None, False

        pops = []
        for s in slices:
            if isinstance(s, dict) and "pop" in s and s["pop"] is not None:
                try:
                    pop_val = float(s["pop"])
                    # Clamp between 0.0 and 1.0
                    pop_val = max(0.0, min(1.0, pop_val))
                    pops.append(pop_val)
                except (ValueError, TypeError):
                    continue

        if not pops:
            return None, False

        peak_pop = max(pops)
        return int(round(peak_pop * 100)), True

    def _calculate_disease_risk(
        self,
        temperature_c: float,
        humidity_percent: int,
        rain_probability_24h: Optional[int]
    ) -> Dict[str, str]:
        """
        Calculates transparent rule-based crop disease risk indicator.
        
        Agronomic Background:
        Most fungal foliar pathogens (e.g. Rice Blast, Sheath Blight, Maize Leaf Blight)
        and bacterial leaf blights flourish under sustained high relative humidity (>= 75%),
        moderate-to-warm temperatures (20-30°C), and precipitation that prolongs leaf wetness.
        
        Rules:
        1. High Risk:
           - Humidity >= 75% AND 24h Rain Chance >= 60%
           Explanation: Cites sustained high humidity and imminent rainfall promoting spore germination.
        2. Moderate Risk:
           - Humidity >= 70% OR 24h Rain Chance >= 50%
           - OR Temperature between 20°C and 30°C with Humidity >= 65%
           Explanation: Cites elevated moisture/temperature favoring foliar leaf wetness.
        3. Low Risk:
           - Conditions outside above thresholds (e.g. Humidity < 65%, dry weather).
           Explanation: Cites lower humidity and dry conditions unfavorable for rapid disease spread.
        """
        rain_val = rain_probability_24h if rain_probability_24h is not None else 0

        # Rule 1: High Risk (Both high humidity and high rain probability)
        if humidity_percent >= 75 and rain_val >= 60:
            return {
                "level": "High",
                "reason": f"High weather risk: Sustained high humidity ({humidity_percent}%) and strong rain chance ({rain_val}%) create prime conditions for fungal spore germination and foliar blight spread."
            }

        # Rule 2: Moderate Risk
        if humidity_percent >= 70 or rain_val >= 50:
            reasons = []
            if humidity_percent >= 70:
                reasons.append(f"high humidity ({humidity_percent}%)")
            if rain_val >= 50:
                reasons.append(f"probable rainfall ({rain_val}%)")
            reason_text = " and ".join(reasons)
            return {
                "level": "Moderate",
                "reason": f"Moderate weather risk: Elevated {reason_text} increases crop leaf wetness duration. Monitor field regularly."
            }

        if 20.0 <= temperature_c <= 30.0 and humidity_percent >= 65:
            return {
                "level": "Moderate",
                "reason": f"Moderate weather risk: Warm temperature ({temperature_c:.1f}°C) with {humidity_percent}% humidity supports mild pathogen incubation. Routine scouting advised."
            }

        # Rule 3: Low Risk
        return {
            "level": "Low",
            "reason": f"Low weather risk: Moderate humidity ({humidity_percent}%) and low rain chance ({rain_val}%) are currently unfavorable for rapid foliar disease spread."
        }

    def _normalize_weather(
        self,
        curr_data: Dict[str, Any],
        forecast_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Transforms raw OpenWeatherMap responses into the clean internal contract.
        Validates all numeric values and ensures no API keys or raw metadata leak.
        """
        main = curr_data.get("main", {})
        weather_list = curr_data.get("weather", [{}])
        weather_first = weather_list[0] if weather_list else {}
        wind = curr_data.get("wind", {})
        coord = curr_data.get("coord", {})
        sys_info = curr_data.get("sys", {})

        # 1. Temperature Validation
        raw_temp = main.get("temp")
        if raw_temp is None or not isinstance(raw_temp, (int, float)) or math.isnan(raw_temp) or math.isinf(raw_temp):
            raise WeatherUnavailableError("Invalid temperature data received from provider.")
        temp_c = round(float(raw_temp), 1)

        # 2. Humidity Validation (0 - 100)
        raw_humidity = main.get("humidity")
        if raw_humidity is None or not isinstance(raw_humidity, (int, float)):
            humidity = 50  # Safe default if somehow missing
        else:
            humidity = max(0, min(100, int(round(raw_humidity))))

        # 3. Condition & Icon
        condition = weather_first.get("main", "Clear")
        description = weather_first.get("description", condition).capitalize()
        icon = weather_first.get("icon", "01d")

        # 4. Wind Speed (m/s to km/h)
        raw_wind_speed = wind.get("speed", 0.0)
        try:
            wind_kph = round(float(raw_wind_speed) * 3.6, 1)
        except (ValueError, TypeError):
            wind_kph = 0.0

        # 5. Location Details
        name = curr_data.get("name") or "Selected Location"
        country = sys_info.get("country", "")
        lat = round(float(coord.get("lat", 0.0)), 4) if coord.get("lat") is not None else None
        lon = round(float(coord.get("lon", 0.0)), 4) if coord.get("lon") is not None else None

        # 6. Forecast 24h Rain Probability
        rain_prob_24h, forecast_available = self._calculate_24h_rain_prob(forecast_data)

        # 7. Disease Risk Evaluation
        risk_info = self._calculate_disease_risk(temp_c, humidity, rain_prob_24h)

        return {
            "location": {
                "name": name,
                "country": country,
                "lat": lat,
                "lon": lon
            },
            "current": {
                "temperature_c": temp_c,
                "humidity_percent": humidity,
                "condition": condition,
                "description": description,
                "icon": icon,
                "wind_kph": wind_kph
            },
            "forecast": {
                "rain_probability_24h": rain_prob_24h,
                "forecast_available": forecast_available,
                "window_hours": 24
            },
            "risk": risk_info,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }


# Singleton instance for application reuse
weather_service = WeatherService()
