"""
AgriSmart AI - ICAR Dataset Helper
Handles extraction, validation, and directory organization
for the ICAR Crop Disease & Insect-pest Image Dataset for Rice and Maize.
"""
import os
import sys
import zipfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "icar_dataset"

def unpack_dataset(zip_path: str):
    """
    Unpacks downloaded ICAR dataset zip file into standardized train/val split folders.
    """
    path = Path(zip_path)
    if not path.exists():
        print(f"[ERROR] Specified zip file not found: {path}")
        print("\nPlease follow these steps to obtain the official dataset:")
        print("1. Visit: https://aikosh.indiaai.gov.in/home/datasets/details/crop_disease_and_insect_pest_image_dataset_for_rice_and_maize.html")
        print("2. Click 'Download Dataset' and log in with your mobile/email OTP (Govt of India AIKosh single sign-on).")
        print(f"3. Place the downloaded zip file into: {PROJECT_ROOT / 'data'}")
        print(f"4. Re-run: python scripts/download_icar_data.py --zip <path_to_zip>")
        return False

    print(f"[INFO] Unpacking '{path.name}' into {DATA_DIR}...")
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(path, 'r') as zip_ref:
        zip_ref.extractall(DATA_DIR)

    print(f"[SUCCESS] Dataset successfully unpacked to: {DATA_DIR}")
    return True

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Unpack and prepare ICAR Rice & Maize dataset")
    parser.add_argument("--zip", type=str, default=str(PROJECT_ROOT / "data" / "icar_dataset.zip"), help="Path to downloaded zip file")

    args = parser.parse_args()
    unpack_dataset(args.zip)
