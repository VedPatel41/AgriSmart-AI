"""
AgriSmart AI - Backend Application Entry Point
Production-ready Flask service with in-memory validation, model readiness health checks,
CORS security, structured error responses, and static frontend hosting.
"""
import os
import sys
import io
import logging
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image, UnidentifiedImageError

# Ensure project root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Import Configuration
try:
    from src.config import (
        FRONTEND_DIR,
        ALLOWED_EXTENSIONS,
        ALLOWED_PIL_FORMATS,
        MAX_FILE_SIZE_BYTES,
        MIN_IMAGE_DIMENSION,
        CORS_ORIGINS,
        SERVER_HOST,
        SERVER_PORT,
        DEBUG_MODE,
        ErrorCode
    )
    from src.predictor import (
        load_model,
        predict,
        is_model_loaded,
        get_model_info,
        ModelNotReadyError,
        ModelConfigurationError,
        ModelOutputError,
        InferenceError
    )
    from src.disease_info import get_disease_advisory
    from src.weather_service import (
        weather_service,
        WeatherError,
        WeatherNotConfiguredError,
        WeatherValidationError,
        WeatherNotFoundError,
        WeatherRateLimitError,
        WeatherUnavailableError,
        WeatherAuthenticationError
    )
    from src.irrigation_service import (
        get_irrigation_decision,
        calculate_irrigation_recommendation,
        IrrigationError,
        IrrigationValidationError,
        IrrigationWeatherUnavailableError
    )
    from src.sustainability_service import (
        get_sustainability_assessment,
        calculate_sustainability_score,
        SustainabilityError,
        SustainabilityValidationError
    )
    from src.assistant_service import (
        assistant_service,
        AssistantError,
        AssistantNotConfiguredError,
        AssistantValidationError,
        AssistantProviderError,
        AssistantTimeoutError,
        AssistantRateLimitError
    )
except ImportError:
    from config import (
        FRONTEND_DIR,
        ALLOWED_EXTENSIONS,
        ALLOWED_PIL_FORMATS,
        MAX_FILE_SIZE_BYTES,
        MIN_IMAGE_DIMENSION,
        CORS_ORIGINS,
        SERVER_HOST,
        SERVER_PORT,
        DEBUG_MODE,
        ErrorCode
    )
    from predictor import (
        load_model,
        predict,
        is_model_loaded,
        get_model_info,
        ModelNotReadyError,
        ModelConfigurationError,
        ModelOutputError,
        InferenceError
    )
    from disease_info import get_disease_advisory
    from weather_service import (
        weather_service,
        WeatherError,
        WeatherNotConfiguredError,
        WeatherValidationError,
        WeatherNotFoundError,
        WeatherRateLimitError,
        WeatherUnavailableError,
        WeatherAuthenticationError
    )
    from irrigation_service import (
        get_irrigation_decision,
        calculate_irrigation_recommendation,
        IrrigationError,
        IrrigationValidationError,
        IrrigationWeatherUnavailableError
    )
    from sustainability_service import (
        get_sustainability_assessment,
        calculate_sustainability_score,
        SustainabilityError,
        SustainabilityValidationError
    )
    from assistant_service import (
        assistant_service,
        AssistantError,
        AssistantNotConfiguredError,
        AssistantValidationError,
        AssistantProviderError,
        AssistantTimeoutError,
        AssistantRateLimitError
    )
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Setup safe server-side logging (Never log image binaries or secret tokens)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("agrismart.api")

app = Flask(__name__)

# Configure CORS (Supports development '*' or restricted origins from environment)
CORS(app, resources={r"/*": {"origins": CORS_ORIGINS}})

# Maximum incoming content length protection
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE_BYTES

# Attempt to load model once at startup
logger.info("Initializing AgriSmart AI prediction engine...")
load_model()


def make_error_response(message: str, code: str, status_code: int):
    """
    Constructs a standardized, machine-readable JSON error response.
    Maintains 'error' as a string for 100% frontend compatibility,
    along with 'code' and 'status'.
    """
    return jsonify({
        "error": message,
        "code": code,
        "status": status_code
    }), status_code


# =============================================================================
# Core Application Endpoints
# =============================================================================

@app.route("/", methods=["GET"])
def index():
    """
    Serves the farmer frontend UI if present, or returns API JSON status.
    """
    index_file = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_file) and "application/json" not in request.headers.get("Accept", ""):
        return send_from_directory(FRONTEND_DIR, "index.html")

    return jsonify({
        "service": "AgriSmart AI Backend",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "GET /": "Frontend Web Application / API status",
            "GET /health": "Real-time backend and model readiness status",
            "POST /predict": "Crop disease prediction (multipart/form-data: 'image')",
            "POST /irrigation": "Smart irrigation advisory (JSON)",
            "GET, POST /weather": "Real weather intelligence & crop disease risk (OpenWeatherMap)",
            "POST /sustainability": "Farm sustainability metric (JSON)",
            "POST /assistant": "GenAI multilingual farmer assistant (JSON)"
        }
    }), 200


@app.route("/<path:path>", methods=["GET"])
def static_proxy(path):
    """
    Serves static assets (style.css, script.js, js/...) from the /frontend directory.
    """
    target_path = os.path.join(FRONTEND_DIR, path)
    if os.path.isfile(target_path):
        return send_from_directory(FRONTEND_DIR, path)
    return make_error_response(f"Resource '{path}' not found", "NOT_FOUND", 404)


@app.route("/docs", methods=["GET"])
def docs():
    """
    Honest API documentation catalog for AgriSmart AI services.
    """
    return jsonify({
        "title": "AgriSmart AI API Documentation",
        "version": "1.0.0",
        "description": "Smart Agriculture & Crop Health Decision Support API",
        "endpoints": [
            {
                "path": "/health",
                "alias": "/api/v1/health",
                "method": "GET",
                "description": "Backend and ML model readiness health check",
                "response": {"status": "ok", "model_loaded": True, "num_classes": 16}
            },
            {
                "path": "/predict",
                "alias": "/api/v1/predict/disease",
                "method": "POST",
                "content_type": "multipart/form-data",
                "parameters": {"image": "File (JPEG/PNG/WEBP, max 10MB)"},
                "description": "PyTorch leaf disease classification across 16 ICAR classes",
                "response": {"class_label": "string", "confidence": "float", "advisory": "object"}
            },
            {
                "path": "/irrigation",
                "method": "POST",
                "content_type": "application/json",
                "parameters": {"soil_moisture": "float (0-100)", "rain_probability": "float (0-100)"},
                "description": "Deterministic rule-based irrigation recommendation",
                "response": {"recommendation": "string", "reason": "string"}
            },
            {
                "path": "/weather",
                "method": "GET, POST",
                "parameters": {"city": "string", "lat": "float", "lon": "float"},
                "description": "Live weather conditions and foliar disease outbreak risk",
                "response": {"temperature": "float", "humidity": "float", "rain_probability": "float"}
            },
            {
                "path": "/sustainability",
                "method": "POST",
                "content_type": "application/json",
                "parameters": {"soil_moisture": "float", "rain_probability": "float"},
                "description": "60/40 Water stewardship and resource efficiency scoring",
                "response": {"score": "int (0-100)", "rating": "string"}
            },
            {
                "path": "/assistant",
                "method": "POST",
                "content_type": "application/json",
                "parameters": {"message": "string", "context": "object"},
                "description": "Grounded GenAI agricultural companion (Google Gemini 1.5 Flash)",
                "response": {"response": "string"}
            }
        ]
    }), 200


@app.route("/health", methods=["GET"])
@app.route("/api/v1/health", methods=["GET"])
def health():
    """
    System health and readiness check endpoint.
    Communicates real model availability without executing expensive dummy inferences.
    """
    model_info = get_model_info()
    is_ready = model_info["loaded"] or model_info["dev_mock_enabled"]
    status_label = "ok" if is_ready else "degraded"

    payload = {
        "status": status_label,
        "model_loaded": model_info["loaded"],
        "model_path": model_info["model_path"],
        "framework": model_info["framework"],
        "input_shape": list(model_info.get("input_shape", [])),
        "num_classes": model_info.get("num_classes", 0),
        "version": "1.0.0"
    }

    if not is_ready:
        payload["message"] = (
            "Backend server is online, but trained model weights were not found at the configured path. "
            "Inference requests will return 503 until model weights are placed in /model."
        )

    return jsonify(payload), 200


@app.route("/predict", methods=["POST"])
@app.route("/api/v1/predict/disease", methods=["POST"])
def predict_route():
    """
    Core Crop Disease Prediction Endpoint.
    - Content-Type: multipart/form-data
    - Expected field name: 'image'
    - In-memory validation: size, extension, decode integrity, dimensions
    - Output contract: { 'class_label': str, 'confidence': float }
    """
    # 1. Validation: Field presence
    if "image" not in request.files:
        logger.warning("Predict request rejected: missing 'image' field in multipart/form-data")
        return make_error_response(
            "No image file provided in request field 'image'",
            ErrorCode.MISSING_FILE,
            400
        )

    file = request.files["image"]

    # 2. Validation: Filename presence
    if not file or not file.filename:
        logger.warning("Predict request rejected: empty filename")
        return make_error_response(
            "No image file selected",
            ErrorCode.MISSING_FILE,
            400
        )

    # Sanitize filename for safe logging
    safe_name = secure_filename(file.filename) or "uploaded_leaf"
    logger.info(f"Incoming /predict request for file: '{safe_name}'")

    # 3. Validation: File extension check
    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        logger.warning(f"Predict request rejected for '{safe_name}': invalid extension '{ext}'")
        return make_error_response(
            f"Unsupported file type '{ext}'. Allowed formats: JPG, JPEG, PNG, WEBP.",
            ErrorCode.INVALID_FILE_TYPE,
            415
        )

    # 4. In-Memory Read and Content Size Check
    try:
        file_bytes = file.read()
    except Exception as read_err:
        logger.error(f"Error reading image stream for '{safe_name}': {read_err}")
        return make_error_response(
            "Could not read uploaded image data.",
            ErrorCode.INVALID_IMAGE,
            422
        )

    if len(file_bytes) == 0:
        logger.warning(f"Predict request rejected for '{safe_name}': file is empty")
        return make_error_response(
            "Uploaded image file is empty.",
            ErrorCode.INVALID_IMAGE,
            422
        )

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        logger.warning(f"Predict request rejected for '{safe_name}': size ({len(file_bytes)} bytes) exceeds limit")
        return make_error_response(
            f"Image file too large. Maximum allowed size is {MAX_FILE_SIZE_BYTES // (1024*1024)} MB.",
            ErrorCode.FILE_TOO_LARGE,
            413
        )

    # 5. In-Memory Decoding and Integrity Validation (Pillow)
    try:
        # Step 5a: Verify image data structure
        stream = io.BytesIO(file_bytes)
        img_verify = Image.open(stream)
        img_verify.verify()

        # Step 5b: Re-open stream for format and dimension checks (verify closes file pointer)
        image = Image.open(io.BytesIO(file_bytes))

        # Check decoded format against whitelist
        if image.format not in ALLOWED_PIL_FORMATS:
            logger.warning(f"Predict request rejected for '{safe_name}': invalid decoded format '{image.format}'")
            return make_error_response(
                f"Unsupported image format '{image.format}'. Allowed formats: JPEG, PNG, WEBP.",
                ErrorCode.INVALID_FILE_TYPE,
                415
            )

        # Check dimensions
        if image.width < MIN_IMAGE_DIMENSION or image.height < MIN_IMAGE_DIMENSION:
            logger.warning(f"Predict request rejected for '{safe_name}': dimensions ({image.width}x{image.height}) too small")
            return make_error_response(
                f"Image dimensions ({image.width}x{image.height}) are too small to analyze.",
                ErrorCode.INVALID_IMAGE,
                422
            )

    except (UnidentifiedImageError, ValueError, OSError) as decode_err:
        logger.warning(f"Predict request rejected for '{safe_name}': decode failed ({decode_err})")
        return make_error_response(
            "Image file could not be decoded. The file may be corrupt or not a valid image.",
            ErrorCode.INVALID_IMAGE,
            422
        )

    # 6. Execute Model Inference
    try:
        result = predict(image)
        advisory = get_disease_advisory(result.get("class_label", ""))
        result["advisory"] = advisory
        logger.info(
            f"Prediction completed for '{safe_name}': "
            f"class_label={result.get('class_label')}, confidence={result.get('confidence')}"
        )
        return jsonify(result), 200

    except ModelNotReadyError as not_ready_err:
        logger.error(f"Prediction unavailable for '{safe_name}': {not_ready_err}")
        return make_error_response(
            str(not_ready_err),
            ErrorCode.MODEL_NOT_READY,
            503
        )
    except ModelConfigurationError as config_err:
        logger.critical(f"Model configuration error for '{safe_name}': {config_err}")
        return make_error_response(
            "Model configuration error: model outputs do not match configured class labels.",
            ErrorCode.MODEL_CONFIGURATION_ERROR,
            500
        )
    except ModelOutputError as out_err:
        logger.error(f"Model output validation failed for '{safe_name}': {out_err}")
        return make_error_response(
            "Model returned an invalid or non-finite prediction value.",
            ErrorCode.MODEL_OUTPUT_ERROR,
            500
        )
    except InferenceError as infer_err:
        logger.error(f"Inference error for '{safe_name}': {infer_err}")
        return make_error_response(
            "An error occurred while computing the crop diagnosis.",
            ErrorCode.PREDICTION_FAILED,
            500
        )
    except Exception as unexpected_err:
        logger.error(f"Unexpected prediction failure for '{safe_name}': {unexpected_err}", exc_info=True)
        return make_error_response(
            "An unexpected internal error occurred during prediction. Please try again.",
            ErrorCode.INTERNAL_ERROR,
            500
        )


# =============================================================================
# Bonus Modules (Placeholder routes - To be completed in future prompts)
# =============================================================================

def _check_json_fields(data, required_fields):
    if not isinstance(data, dict):
        return make_error_response(f"Missing required field: {required_fields[0]}", "INVALID_REQUEST", 400)
    for field in required_fields:
        if field not in data:
            return make_error_response(f"Missing required field: {field}", "INVALID_REQUEST", 400)
    return None


@app.route("/irrigation", methods=["POST"])
def irrigation():
    """
    Smart Irrigation Advisory Endpoint.
    Accepts JSON body:
      - soil_moisture (required): float 0.0 - 100.0
      - rain_probability (optional): float 0.0 - 100.0 or 0.0 - 1.0 (if provided directly)
      - city (optional): target city name for live forecast lookup (default: Ahmedabad)
      - lat, lon (optional): target coordinates for live forecast lookup
    Evaluates:
      - Rule 1: rain_probability > 60% -> "Delay irrigation"
      - Rule 2: soil_moisture < 30% and rain_probability < 30% -> "Irrigate now"
      - Rule 3: Otherwise -> "Monitor"
    """
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return make_error_response("Invalid request payload. Expected JSON object.", "INVALID_REQUEST", 400)

    if "soil_moisture" not in data:
        return make_error_response("Missing required field: soil_moisture (0-100%).", "MISSING_FIELD", 400)

    soil_moisture_val = data.get("soil_moisture")
    rain_probability_val = data.get("rain_probability")
    city = data.get("city")
    lat = data.get("lat")
    lon = data.get("lon")
    crop_type = data.get("crop_type") or data.get("crop")
    growth_stage = data.get("growth_stage") or data.get("stage")

    try:
        result = get_irrigation_decision(
            soil_moisture_input=soil_moisture_val,
            city=city,
            lat=lat,
            lon=lon,
            rain_probability_input=rain_probability_val,
            crop_type=crop_type,
            growth_stage=growth_stage,
            weather_service_instance=weather_service
        )
        return jsonify(result), 200

    except IrrigationValidationError as e:
        return make_error_response(e.message, e.error_code, e.status_code)
    except IrrigationWeatherUnavailableError as e:
        return make_error_response(e.message, e.error_code, e.status_code)
    except Exception as e:
        logger.error("Unexpected error in /irrigation endpoint: %s", str(e), exc_info=True)
        return make_error_response("Irrigation service temporarily unavailable.", "IRRIGATION_ERROR", 500)


@app.route("/weather", methods=["GET", "POST"])
def weather():
    """
    Real Weather Intelligence & Crop Disease Risk Endpoint.
    Accepts:
      - GET /weather?city=Ahmedabad  (or ?lat=23.02&lon=72.57)
      - POST /weather with JSON body: {"city": "Ahmedabad"} or {"lat": 23.02, "lon": 72.57}
    Returns normalized weather, next-24h rain probability, and rule-based disease risk.
    Guarantees:
      - Never exposes OPENWEATHER_API_KEY.
      - Never returns fake/demo weather if unavailable or unconfigured.
    """
    city = None
    lat = None
    lon = None
    bypass_cache = False

    if request.method == "GET":
        city = request.args.get("city")
        lat = request.args.get("lat")
        lon = request.args.get("lon")
        bypass_cache = request.args.get("refresh", "").lower() in ("true", "1")
    elif request.method == "POST":
        data = request.get_json(silent=True) or {}
        city = data.get("city")
        lat = data.get("lat")
        lon = data.get("lon")
        bypass_cache = bool(data.get("refresh", False))

    if not city and (lat is None or lon is None):
        return make_error_response(
            "Please provide a location via 'city' parameter or 'lat' and 'lon' coordinates.",
            "MISSING_LOCATION",
            400
        )

    try:
        weather_data = weather_service.get_weather(
            city=city,
            lat=lat,
            lon=lon,
            bypass_cache=bypass_cache
        )
        return jsonify(weather_data), 200

    except WeatherNotConfiguredError as e:
        return make_error_response(e.message, e.error_code, e.status_code)
    except WeatherValidationError as e:
        return make_error_response(e.message, e.error_code, e.status_code)
    except WeatherNotFoundError as e:
        return make_error_response(e.message, e.error_code, e.status_code)
    except WeatherRateLimitError as e:
        return make_error_response(e.message, e.error_code, e.status_code)
    except WeatherAuthenticationError as e:
        return make_error_response(e.message, e.error_code, e.status_code)
    except WeatherUnavailableError as e:
        return make_error_response(e.message, e.error_code, e.status_code)
    except Exception as e:
        logger.error("Unexpected error in /weather: %s", str(e), exc_info=True)
        return make_error_response("Weather service is temporarily unavailable.", "WEATHER_ERROR", 500)


@app.route("/sustainability", methods=["POST"])
def sustainability():
    """
    Farm Sustainability & Water Efficiency Score Endpoint.
    Accepts JSON body:
      - soil_moisture (required): float 0.0 - 100.0
      - rain_probability (optional): float / int
      - recommendation (optional): "Delay irrigation", "Irrigate now", "Monitor"
      - disease_risk (optional): "Low", "Moderate", "High"
      - city (optional): target location name
    Evaluates:
      - Water Efficiency & Stewardship (Weight 60%)
      - Micro-Climate & Pathogen Adaptation (Weight 40%)
    Returns:
      - score: integer (0 - 100)
      - rating: "Excellent" | "Good" | "Fair" | "Needs Improvement"
      - breakdown: { "water_efficiency": int, "weather_adaptation": int }
      - reasons: list of strings
      - suggestion: string
    """
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return make_error_response("Invalid request payload. Expected JSON object.", "INVALID_REQUEST", 400)

    # Support legacy field names or standard soil_moisture input
    soil_moisture = data.get("soil_moisture")
    if soil_moisture is None and "water_used_liters" in data:
        soil_moisture = 40.0

    if soil_moisture is None:
        return make_error_response(
            "Missing required field: soil_moisture (0-100%).",
            "MISSING_FIELD",
            400
        )

    rain_prob = data.get("rain_probability")
    recommendation = data.get("recommendation")
    disease_risk = data.get("disease_risk")
    city = data.get("city")
    lat = data.get("lat")
    lon = data.get("lon")

    try:
        result = get_sustainability_assessment(
            soil_moisture_input=soil_moisture,
            rain_probability_input=rain_prob,
            recommendation_input=recommendation,
            disease_risk_input=disease_risk,
            city=city,
            lat=lat,
            lon=lon,
            weather_service_instance=weather_service
        )
        return jsonify(result), 200

    except SustainabilityValidationError as e:
        return make_error_response(e.message, e.error_code, e.status_code)
    except Exception as e:
        logger.error("Unexpected error in /sustainability endpoint: %s", str(e), exc_info=True)
        return make_error_response("Sustainability assessment service temporarily unavailable.", "SUSTAINABILITY_ERROR", 500)


@app.route("/assistant", methods=["POST"])
def assistant():
    """
    GenAI Multilingual Farmer Assistant Endpoint.
    Accepts JSON body:
      - message (required): string, farmer question (max 600 chars)
      - language (optional): "en" | "hi" | "gu" (default: "en")
      - history (optional): list of {"role": "user"|"assistant", "content": str}
      - context (optional): object containing:
          - diagnosis: { class_label, confidence, advisory }
          - weather: { city, temperature, humidity, rain_probability_24h, disease_risk }
          - irrigation: { soil_moisture, recommendation, reason, action }
          - sustainability: { score, rating, breakdown, suggestion }
    Guarantees:
      - Grounded strictly in real application context.
      - NEVER invents fake disease diagnosis, weather, or irrigation data.
      - Never confuses prediction confidence with validation accuracy.
      - Never returns fake/hardcoded chatbot replies when unconfigured or failing.
    """
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return make_error_response("Invalid request payload. Expected JSON object.", "INVALID_REQUEST", 400)

    # Legacy support: if message is missing but class_label is provided, formulate question
    raw_message = data.get("message")
    if not raw_message and data.get("class_label"):
        raw_message = f"Please explain the diagnosis for {data.get('class_label')} and recommended remedies."

    if not raw_message or not isinstance(raw_message, str) or not raw_message.strip():
        return make_error_response(
            "Missing required field: 'message'. Please provide a question for the assistant.",
            "EMPTY_MESSAGE",
            400
        )

    message = raw_message.strip()
    if len(message) > 600:
        return make_error_response(
            f"Message is too long ({len(message)} characters). Maximum allowed is 600 characters.",
            "MESSAGE_TOO_LONG",
            400
        )

    language = data.get("language", "en")
    history = data.get("history", [])
    context = data.get("context", {})

    # If context is empty but legacy flat fields exist, bundle them into context
    if not context and data.get("class_label"):
        context["diagnosis"] = {
            "class_label": data.get("class_label"),
            "confidence": data.get("confidence")
        }

    try:
        result = assistant_service.generate_response(
            message=message,
            history=history,
            context=context,
            language=language
        )
        return jsonify(result), 200

    except AssistantNotConfiguredError as e:
        return make_error_response(e.message, e.error_code, e.status_code)
    except AssistantValidationError as e:
        return make_error_response(e.message, e.error_code, e.status_code)
    except AssistantTimeoutError as e:
        return make_error_response(e.message, e.error_code, e.status_code)
    except AssistantRateLimitError as e:
        return make_error_response(e.message, e.error_code, e.status_code)
    except AssistantProviderError as e:
        return make_error_response(e.message, e.error_code, e.status_code)
    except Exception as e:
        logger.error("Unexpected error in /assistant endpoint: %s", str(e), exc_info=True)
        return make_error_response("The AI farmer assistant is temporarily unavailable.", "ASSISTANT_ERROR", 500)


# =============================================================================
# Global Flask Error Handlers
# =============================================================================

@app.errorhandler(413)
def request_entity_too_large(error):
    return make_error_response(
        f"Request payload too large. Maximum allowed size is {MAX_FILE_SIZE_BYTES // (1024*1024)} MB.",
        ErrorCode.FILE_TOO_LARGE,
        413
    )

@app.errorhandler(404)
def not_found_handler(error):
    return make_error_response("Resource not found", "NOT_FOUND", 404)

@app.errorhandler(405)
def method_not_allowed_handler(error):
    return make_error_response("HTTP method not allowed for this endpoint", "METHOD_NOT_ALLOWED", 405)

@app.errorhandler(500)
def internal_server_error(error):
    return make_error_response("Internal server error", ErrorCode.INTERNAL_ERROR, 500)


if __name__ == "__main__":
    logger.info(f"Starting AgriSmart AI Server on {SERVER_HOST}:{SERVER_PORT} (Debug: {DEBUG_MODE})")
    app.run(host=SERVER_HOST, port=SERVER_PORT, debug=DEBUG_MODE)
