import os
import requests

test_images = [
    r"data/icar_dataset/train/Maize_Aphids/sample_0.jpg",
    r"data/icar_dataset/train/Maize_Curvularia_Leaf_Spot/sample_1.jpg",
    r"data/icar_dataset/train/Rice_Bacterial_Leaf_Blight/sample_2.jpg",
    r"data/icar_dataset/train/Rice_False_Smut/sample_3.jpg",
    r"data/icar_dataset/train/Maize_Healthy/sample_4.jpg"
]

print("="*60)
print("TESTING /predict PIPELINE WITH 5 REAL IMAGE UPLOADS")
print("="*60)

for p in test_images:
    if not os.path.exists(p):
        print(f"[MISSING] {p}")
        continue
    with open(p, "rb") as f:
        files = {"image": (os.path.basename(p), f, "image/jpeg")}
        resp = requests.post("http://localhost:5000/predict", files=files, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            print(f"[PASS] {os.path.basename(p):25} -> Class: {data['class_label']:28} | Confidence: {data['confidence']:.4f} | Advisory: {data.get('advisory', {}).get('crop', 'N/A')}")
        else:
            print(f"[FAIL] {os.path.basename(p)} -> HTTP {resp.status_code}: {resp.text}")
print("="*60)
