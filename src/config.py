"""
AgriSmart AI - Backend Configuration & Constants
Single source of truth for environment settings, model paths, validation rules, and error codes.
"""
import os
try:
    from dotenv import load_dotenv
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_dotenv(os.path.join(BASE_DIR, ".env"))
except ImportError:
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Base directory paths
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

# Model Configuration
default_weights = (
    os.path.join(BASE_DIR, "model", "model_weights.pt")
    if os.path.exists(os.path.join(BASE_DIR, "model", "model_weights.pt"))
    else os.path.join(BASE_DIR, "model", "model_weights.h5")
)
MODEL_PATH = os.getenv("MODEL_PATH", default_weights)

# Development Mock Prediction Flag
# Production MUST have this as False. Real inference requires trained model weights.
ENABLE_DEV_MOCK = os.getenv("ENABLE_DEV_MOCK", "false").lower() in ("true", "1", "yes")

# Upload and Validation Constraints
# Default 10 MB matching Prompt 2 guidance; configurable via environment
MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_BYTES", 10 * 1024 * 1024))
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_PIL_FORMATS = {"JPEG", "PNG", "WEBP"}
MIN_IMAGE_DIMENSION = 30  # Minimum width and height in pixels

# CORS Configuration
# Accepts comma-separated origins, or '*' for development
CORS_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "*")
if CORS_ORIGINS != "*":
    CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS.split(",") if origin.strip()]

# Server Configuration
SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("PORT", 5000))
DEBUG_MODE = os.getenv("FLASK_DEBUG", "false").lower() in ("true", "1", "yes")

# ICAR-IASRI Rice & Maize Disease and Pest Taxonomy
ICAR_RICE_MAIZE_CLASSES = [
    # Rice Diseases & Pests
    "Rice_Bacterial_Leaf_Blight",
    "Rice_Brown_Spot",
    "Rice_False_Smut",
    "Rice_Leaf_Sheath_Blight",
    "Rice_Leaf_Folder",
    "Rice_Rice_Skipper",
    "Rice_White_Stem_Borer",
    "Rice_Yellow_Stem_Borer",
    "Rice_Healthy",
    # Maize Diseases & Pests
    "Maize_Maydis_Leaf_Blight",
    "Maize_Turcicum_Leaf_Blight",
    "Maize_Curvularia_Leaf_Spot",
    "Maize_Sorghum_Downy_Mildew",
    "Maize_Fall_Armyworm",
    "Maize_Aphids",
    "Maize_Healthy"
]

# Legacy / Multi-crop Fallback Classes
DEFAULT_CLASS_NAMES = [
    "Apple_Black_Rot",
    "Apple_Healthy",
    "Corn_Common_Rust",
    "Corn_Healthy",
    "Potato_Early_Blight",
    "Potato_Late_Blight",
    "Potato_Healthy",
    "Tomato_Early_Blight",
    "Tomato_Late_Blight",
    "Tomato_Healthy"
]

# Dynamic Class Resolution:
# 1. If model/model_metadata.json exists, load authoritative trained classes
# 2. If DATASET_PROFILE=icar, use ICAR_RICE_MAIZE_CLASSES
# 3. Else fallback to DEFAULT_CLASS_NAMES
def _resolve_class_names():
    import json
    metadata_file = os.path.join(BASE_DIR, "model", "model_metadata.json")
    if os.path.isfile(metadata_file):
        try:
            with open(metadata_file, "r", encoding="utf-8") as f:
                meta = json.load(f)
                if "classes" in meta and isinstance(meta["classes"], list):
                    return meta["classes"]
        except Exception:
            pass

    profile = os.getenv("DATASET_PROFILE", "icar").lower()
    if profile == "icar":
        return ICAR_RICE_MAIZE_CLASSES
    return DEFAULT_CLASS_NAMES

CLASS_NAMES = _resolve_class_names()

# Standardized Machine-Readable Error Codes
class ErrorCode:
    MISSING_FILE = "MISSING_FILE"
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    INVALID_IMAGE = "INVALID_IMAGE"
    MODEL_NOT_READY = "MODEL_NOT_READY"
    MODEL_CONFIGURATION_ERROR = "MODEL_CONFIGURATION_ERROR"
    MODEL_OUTPUT_ERROR = "MODEL_OUTPUT_ERROR"
    PREDICTION_FAILED = "PREDICTION_FAILED"
    INTERNAL_ERROR = "INTERNAL_ERROR"
