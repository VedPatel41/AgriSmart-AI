import urllib.request
import sys
import json

def test_endpoints():
    base = "http://localhost:5000"
    urls = [
        "/",
        "/style.css",
        "/script.js",
        "/js/config.js",
        "/js/i18n.js",
        "/js/auth.js",
        "/js/ui.js",
        "/js/onboarding.js",
        "/js/navigation.js",
        "/assets/farm_hero.jpg",
        "/health"
    ]
    all_ok = True
    print("Testing AgriSmart Part 1 Frontend Assets & Endpoints:")
    for path in urls:
        full_url = f"{base}{path}"
        try:
            req = urllib.request.Request(full_url, headers={"User-Agent": "AgriSmartTest/1.0"})
            with urllib.request.urlopen(req, timeout=5) as res:
                content = res.read()
                print(f"  [OK] {res.status} {path:25s} ({len(content):,} bytes)")
        except Exception as e:
            print(f"  [FAIL] {path:25s} -> {e}")
            all_ok = False
    
    # Check health payload
    try:
        req = urllib.request.Request(f"{base}/health")
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read().decode())
            print(f"\nBackend Health Status: {data.get('status')} | Model loaded: {data.get('model_loaded')}")
    except Exception as e:
        print(f"\nFailed to check health JSON: {e}")
        all_ok = False

    return all_ok

if __name__ == "__main__":
    success = test_endpoints()
    sys.exit(0 if success else 1)
