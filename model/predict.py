
"""
AgriSmart AI - Standalone Predict Interface (SIH 2026 Submission Contract)
Exposes:
  1. Python API: predict(image_path: str) -> str
  2. CLI: python model/predict.py --image <path_to_image>
"""
import os
import sys
import argparse
from PIL import Image

# Add project root to sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.predictor import load_model, predict as run_prediction, is_model_loaded


def predict(image_path: str) -> str:
    """
    SIH 2026 Required Predict Interface:
    Loads trained model weights and classifies a single leaf/crop image into its disease class.
    
    Args:
        image_path (str): File system path to the input leaf image.
        
    Returns:
        str: Authoritative predicted class label string.
    """
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image file not found at '{image_path}'")
    
    # Ensure model is loaded
    if not is_model_loaded():
        load_model()
    
    # Open image using PIL
    with Image.open(image_path) as img:
        img_rgb = img.convert("RGB")
        result = run_prediction(img_rgb)
        return result["class_label"]


def main():
    parser = argparse.ArgumentParser(
        description="AgriSmart AI - Crop Disease Classification CLI (SIH 2026)"
    )
    parser.add_argument(
        "--image",
        type=str,
        required=True,
        help="Path to the crop/leaf image file to classify"
    )
    args = parser.parse_args()

    try:
        class_label = predict(args.image)
        print(class_label)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
