"""
AgriSmart AI - Model Inference Service
Handles model loading, weight caching, in-memory image preprocessing, and inference execution.
"""
import os
import logging
from PIL import Image

try:
    from src.config import MODEL_PATH, CLASS_NAMES, ENABLE_DEV_MOCK, ErrorCode
except ImportError:
    from config import MODEL_PATH, CLASS_NAMES, ENABLE_DEV_MOCK, ErrorCode

logger = logging.getLogger(__name__)

# Cached model instance (loaded once on startup)
_MODEL = None
_MODEL_FRAMEWORK = None
_MODEL_INPUT_SHAPE = (224, 224, 3)  # Default fallback shape if not discoverable
_MODEL_OUTPUT_CLASSES = None


class ModelNotReadyError(Exception):
    """Raised when an inference request is received but no model is loaded."""
    pass


class ModelConfigurationError(Exception):
    """Raised when model architecture or class configuration is inconsistent."""
    pass


class ModelOutputError(Exception):
    """Raised when model output contains invalid values (e.g. NaN, Inf, out-of-range)."""
    pass


class InferenceError(Exception):
    """Raised when model inference execution fails."""
    pass


def _verify_and_warmup_model():
    """
    Validates the loaded model's output classes against CLASS_NAMES
    and runs a single controlled dummy inference pass (warm-up)
    to catch shape/weight runtime faults early before serving requests.
    """
    global _MODEL_OUTPUT_CLASSES, _MODEL_INPUT_SHAPE

    import numpy as np

    # 1. Inspect model input shape if available
    try:
        if _MODEL_FRAMEWORK == "tensorflow":
            in_shape = getattr(_MODEL, "input_shape", None)
            if in_shape and len(in_shape) == 4:
                # Typically (None, H, W, C)
                h, w = in_shape[1], in_shape[2]
                c = in_shape[3] if len(in_shape) > 3 else 3
                if h and w:
                    _MODEL_INPUT_SHAPE = (int(h), int(w), int(c))

            out_shape = getattr(_MODEL, "output_shape", None)
            if out_shape:
                _MODEL_OUTPUT_CLASSES = int(out_shape[-1])

        elif _MODEL_FRAMEWORK == "pytorch":
            _MODEL_INPUT_SHAPE = (224, 224, 3)
            import torch
            if hasattr(_MODEL, "classifier"):
                if isinstance(_MODEL.classifier, torch.nn.Sequential) and hasattr(_MODEL.classifier[-1], "out_features"):
                    _MODEL_OUTPUT_CLASSES = int(_MODEL.classifier[-1].out_features)
                elif hasattr(_MODEL.classifier, "out_features"):
                    _MODEL_OUTPUT_CLASSES = int(_MODEL.classifier.out_features)
            elif hasattr(_MODEL, "fc") and hasattr(_MODEL.fc, "out_features"):
                _MODEL_OUTPUT_CLASSES = int(_MODEL.fc.out_features)

        elif _MODEL_FRAMEWORK == "onnx":
            in_shape = _MODEL.get_inputs()[0].shape
            if len(in_shape) == 4:
                if in_shape[1] == 3:  # NCHW
                    _MODEL_INPUT_SHAPE = (int(in_shape[2]), int(in_shape[3]), 3)
                else:  # NHWC
                    _MODEL_INPUT_SHAPE = (int(in_shape[1]), int(in_shape[2]), 3)
            out_shape = _MODEL.get_outputs()[0].shape
            if out_shape:
                _MODEL_OUTPUT_CLASSES = int(out_shape[-1])

    except Exception as shape_err:
        logger.warning(f"Could not automatically inspect model shapes: {shape_err}")

    # 2. Verify Output Class Count vs Configured CLASS_NAMES
    if _MODEL_OUTPUT_CLASSES is not None:
        configured_count = len(CLASS_NAMES)
        if _MODEL_OUTPUT_CLASSES != configured_count:
            error_msg = (
                f"MODEL_CONFIGURATION_ERROR: Model output classes ({_MODEL_OUTPUT_CLASSES}) "
                f"do not match configured class labels ({configured_count})."
            )
            logger.critical(error_msg)
            raise ModelConfigurationError(error_msg)
        logger.info(f"Model output classes verified: {_MODEL_OUTPUT_CLASSES} matches CLASS_NAMES ({configured_count}).")

    # 3. Model Warm-up Execution
    try:
        target_h, target_w = _MODEL_INPUT_SHAPE[0], _MODEL_INPUT_SHAPE[1]
        dummy_input = np.zeros((1, target_h, target_w, 3), dtype=np.float32)

        if _MODEL_FRAMEWORK == "tensorflow":
            _ = _MODEL.predict(dummy_input, verbose=0)
        elif _MODEL_FRAMEWORK == "pytorch":
            import torch
            dummy_torch = torch.from_numpy(dummy_input).permute(0, 3, 1, 2).float()
            with torch.no_grad():
                _ = _MODEL(dummy_torch)
        elif _MODEL_FRAMEWORK == "onnx":
            input_name = _MODEL.get_inputs()[0].name
            in_shape = _MODEL.get_inputs()[0].shape
            if len(in_shape) == 4 and in_shape[1] == 3:
                data = np.transpose(dummy_input, (0, 3, 1, 2)).astype(np.float32)
            else:
                data = dummy_input.astype(np.float32)
            _ = _MODEL.run(None, {input_name: data})

        logger.info(f"Model warm-up completed successfully with input shape {_MODEL_INPUT_SHAPE}.")

    except Exception as warmup_err:
        logger.error(f"Model warm-up failed: {warmup_err}", exc_info=True)
        raise ModelConfigurationError(f"Model warm-up failed: {warmup_err}")


def load_model():
    """
    Loads model weights once from MODEL_PATH and caches the loaded model instance.
    Supports Keras (.h5, .keras), PyTorch (.pt, .pth), and ONNX (.onnx).
    """
    global _MODEL, _MODEL_FRAMEWORK

    if not os.path.exists(MODEL_PATH):
        logger.warning(
            f"Model weights file not found at '{MODEL_PATH}'. "
            f"Model readiness: FALSE (Dev Mock Mode: {ENABLE_DEV_MOCK})"
        )
        _MODEL = None
        _MODEL_FRAMEWORK = None
        return None

    try:
        logger.info(f"Attempting to load model weights from '{MODEL_PATH}'...")
        _, ext = os.path.splitext(MODEL_PATH.lower())

        if ext in (".h5", ".keras"):
            try:
                import tensorflow as tf
                _MODEL = tf.keras.models.load_model(MODEL_PATH)
                _MODEL_FRAMEWORK = "tensorflow"
                logger.info(f"TensorFlow/Keras model successfully loaded from '{MODEL_PATH}'")
                _verify_and_warmup_model()
                return _MODEL
            except ImportError:
                logger.error("TensorFlow is not installed in the environment to load .h5/.keras weights.")

        elif ext in (".pt", ".pth"):
            try:
                import torch
                _MODEL = torch.load(MODEL_PATH, map_location="cpu", weights_only=False)
                if hasattr(_MODEL, "eval"):
                    _MODEL.eval()
                _MODEL_FRAMEWORK = "pytorch"
                logger.info(f"PyTorch model successfully loaded from '{MODEL_PATH}'")
                _verify_and_warmup_model()
                return _MODEL
            except ImportError:
                logger.error("PyTorch is not installed in the environment to load .pt/.pth weights.")

        elif ext == ".onnx":
            try:
                import onnxruntime as ort
                _MODEL = ort.InferenceSession(MODEL_PATH)
                _MODEL_FRAMEWORK = "onnx"
                logger.info(f"ONNX model successfully loaded from '{MODEL_PATH}'")
                _verify_and_warmup_model()
                return _MODEL
            except ImportError:
                logger.error("ONNX Runtime is not installed in the environment to load .onnx weights.")

        # Fallback if specific framework loader could not be initialized
        logger.warning(f"Recognized weights file '{MODEL_PATH}' but no supported inference engine is available.")
        _MODEL = None
        _MODEL_FRAMEWORK = None
        return None

    except ModelConfigurationError:
        _MODEL = None
        _MODEL_FRAMEWORK = None
        raise

    except Exception as e:
        logger.error(f"Failed to load model from '{MODEL_PATH}': {e}", exc_info=True)
        _MODEL = None
        _MODEL_FRAMEWORK = None
        return None


def is_model_loaded() -> bool:
    """Returns whether the model is loaded and ready for live inference."""
    return _MODEL is not None


def get_model_info() -> dict:
    """Returns metadata describing current model status."""
    return {
        "loaded": is_model_loaded(),
        "model_path": MODEL_PATH,
        "framework": _MODEL_FRAMEWORK,
        "input_shape": _MODEL_INPUT_SHAPE,
        "num_classes": len(CLASS_NAMES),
        "dev_mock_enabled": ENABLE_DEV_MOCK
    }


def preprocess_image(image: Image.Image, target_size=None):
    """
    Standardizes input crop leaf image for neural network inference.
    - Converts to 3-channel RGB (handles RGBA, grayscale, CMYK)
    - Resizes to authoritative model input dimension
    - Converts to float32 tensor
    - Normalizes pixel range to [0.0, 1.0]
    - Adds batch dimension: (1, H, W, 3)
    """
    global _MODEL_INPUT_SHAPE

    if target_size is None:
        target_size = (_MODEL_INPUT_SHAPE[0], _MODEL_INPUT_SHAPE[1])

    # 1. Convert to RGB explicitly
    if image.mode != "RGB":
        image = image.convert("RGB")

    # 2. Resize to exact model input shape (deterministic, no random augmentations)
    image = image.resize(target_size, Image.Resampling.BILINEAR)

    # 3. Convert to array, cast to float32, and normalize
    try:
        import numpy as np
        img_array = np.array(image, dtype=np.float32) / 255.0
        # Add batch dimension: (1, H, W, 3)
        img_batch = np.expand_dims(img_array, axis=0)
        return img_batch
    except ImportError:
        logger.warning("NumPy not installed; returning raw PIL image for inference.")
        return image


def predict(image: Image.Image) -> dict:
    """
    Executes disease inference on a validated PIL Image.

    Args:
        image: Decoded PIL Image object.

    Returns:
        dict: { 'class_label': str, 'confidence': float }

    Raises:
        ModelNotReadyError: When model weights are not loaded and dev mock is disabled.
        ModelConfigurationError: When model class mapping is misaligned.
        ModelOutputError: When model returns non-finite or invalid confidence values.
        InferenceError: When inference computation fails.
    """
    global _MODEL

    # If model is not loaded yet, attempt one reload in case file was placed at runtime
    if _MODEL is None and os.path.exists(MODEL_PATH):
        load_model()

    # If model is still not loaded:
    if _MODEL is None:
        if ENABLE_DEV_MOCK:
            logger.info("Serving prediction using explicit development mock flag (ENABLE_DEV_MOCK=true).")
            mock_label = CLASS_NAMES[0] if CLASS_NAMES else "Rice_Bacterial_Leaf_Blight"
            return {
                "class_label": mock_label,
                "confidence": 0.9324,
                "is_mock": True
            }
        # In production without weights, refuse to fake predictions
        raise ModelNotReadyError(
            "The crop disease detection model is currently unavailable. Trained model weights are pending."
        )

    # Live Inference Pipeline
    try:
        import numpy as np
        input_tensor = preprocess_image(image)

        if _MODEL_FRAMEWORK == "tensorflow":
            raw_predictions = _MODEL.predict(input_tensor, verbose=0)
            probs = np.array(raw_predictions[0], dtype=np.float64)

        elif _MODEL_FRAMEWORK == "pytorch":
            import torch
            # Convert (1, H, W, 3) to PyTorch channel-first format (1, 3, H, W)
            tensor_torch = torch.from_numpy(input_tensor).permute(0, 3, 1, 2).float()
            with torch.no_grad():
                raw_output = _MODEL(tensor_torch)
                probs = raw_output[0].cpu().numpy().astype(np.float64)

        elif _MODEL_FRAMEWORK == "onnx":
            input_name = _MODEL.get_inputs()[0].name
            shape = _MODEL.get_inputs()[0].shape
            if len(shape) == 4 and shape[1] == 3:
                input_data = np.transpose(input_tensor, (0, 3, 1, 2)).astype(np.float32)
            else:
                input_data = input_tensor.astype(np.float32)
            raw_output = _MODEL.run(None, {input_name: input_data})[0]
            probs = np.array(raw_output[0], dtype=np.float64)

        else:
            raise InferenceError(f"Unsupported model framework: {_MODEL_FRAMEWORK}")

        # Model Output Interpretation: Detect whether output is logits or probabilities
        # Probabilities satisfy: all values >= 0, <= 1, and sum ~= 1.0
        is_probability = (
            np.all(probs >= 0.0) and
            np.all(probs <= 1.0) and
            np.isclose(np.sum(probs), 1.0, atol=1e-2)
        )

        if not is_probability:
            # Model returned logits; apply numerically stable softmax
            exp_logits = np.exp(probs - np.max(probs))
            probs = exp_logits / np.sum(exp_logits)

        predicted_idx = int(np.argmax(probs))
        confidence = float(probs[predicted_idx])

        # Confidence Sanity Verification
        if not np.isfinite(confidence) or confidence < 0.0 or confidence > 1.0:
            raise ModelOutputError(
                f"MODEL_OUTPUT_ERROR: Model returned non-finite or out-of-bounds confidence: {confidence}"
            )

        # Validate predicted index against class names list
        if not (0 <= predicted_idx < len(CLASS_NAMES)):
            raise ModelConfigurationError(
                f"MODEL_CONFIGURATION_ERROR: Model predicted index {predicted_idx} outside registered class list range (0..{len(CLASS_NAMES)-1})."
            )

        class_label = str(CLASS_NAMES[predicted_idx])

        return {
            "class_label": class_label,
            "confidence": round(confidence, 4)
        }

    except (ModelNotReadyError, ModelConfigurationError, ModelOutputError):
        raise
    except Exception as err:
        logger.error(f"Inference execution failed: {err}", exc_info=True)
        raise InferenceError(f"Error during model computation: {str(err)}")
