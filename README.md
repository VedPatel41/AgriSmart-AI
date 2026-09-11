# AgriSmart AI — Smart Crop Assistant & Agronomic Decision Platform

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0%2B-green.svg)](https://flask.palletsprojects.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0%2B-red.svg)](https://pytorch.org/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**AgriSmart AI** is an intelligent agricultural platform developed for the **Smart India Hackathon (SIH)**. Designed specifically for Indian field conditions, it unifies deep-learning crop disease diagnosis, hyper-local weather intelligence, deterministic smart irrigation guidance, farm water stewardship scoring, and a context-grounded multilingual GenAI assistant into a single, cohesive product.

---

## Key Features

1. **AI-Powered Crop Disease Diagnosis**:
   - Analyzes crop leaf photos using a PyTorch neural network trained on the ICAR-IASRI dataset.
   - Detects 16 major rice and maize diseases/pests (e.g. *Rice False Smut*, *Rice Bacterial Leaf Blight*, *Maize Turcicum Leaf Blight*, *Fall Armyworm*).
   - Returns verified model confidence, Hindi agronomic summaries, chemical recommendations, organic remedies, and prevention tips.

2. **Live Weather Intelligence & Crop Disease Risk**:
   - Integrates OpenWeatherMap 5-day / 3-hour forecasts with a 10-minute server cache.
   - Analyzes peak 24-hour precipitation probability and micro-climate conditions (humidity $\ge 80\%$, temperature $20\text{--}30^\circ\text{C}$) to evaluate foliar fungal/bacterial outbreak risks before symptoms become severe.

3. **Smart Irrigation Decision Engine**:
   - Evaluates real root-zone soil moisture ($0\text{--}100\%$) combined with upcoming 24h rainfall probability.
   - Strict deterministic rule thresholds:
     - **Rain $> 60\%$** $\rightarrow$ **Delay irrigation** (avoids waterlogging and nutrient leaching)
     - **Soil $< 30\%$ AND Rain $< 30\%$** $\rightarrow$ **Irrigate now** (relieves moisture stress)
     - **Otherwise** $\rightarrow$ **Monitor** (moisture currently adequate)

4. **Farm Sustainability & Water Efficiency Score**:
   - Computes an objective, rule-based environmental stewardship score:
     $$\text{Score} = \text{Water Conservation Efficiency} \times 0.60 + \text{Weather Adaptation} \times 0.40$$
   - Clamped to $[0, 100]$ and categorized into *Excellent* ($\ge 80$), *Good* ($\ge 60$), *Fair* ($\ge 40$), or *Needs Improvement* ($< 40$).

5. **GenAI Multilingual Farmer Assistant**:
   - Powered by Google Gemini 2.5 Flash via REST API.
   - **Context-Grounded**: Ingests active application state (diagnosed disease, live weather, irrigation decision, and sustainability score) to answer farmer questions without hallucinating data.
   - Enforces Krishi Vigyan Kendra (KVK) safety protocols (advises consulting local agricultural officers before applying chemical sprays).

6. **Centralized Regional Language Support**:
   - Trilingual interface supporting **English**, **Hindi (हिंदी)**, and **Gujarati (ગુજરાતી)** across all headers, cards, buttons, error messages, and assistant prompts.
   - Preserves 100% scientific taxonomy for disease classes while delivering localized remedies.

---

## Technology Stack

- **Frontend**: Semantic HTML5, Vanilla CSS3 (custom responsive design system, mobile-first from 320px to 1440px+), Vanilla ES6 JavaScript (modular classes, Single Source of Truth via `AgriState`, zero build step required).
- **Backend API**: Python 3.10+, Flask, Flask-CORS, Gunicorn, Werkzeug.
- **Machine Learning**: PyTorch (`torch`, `torchvision`), EfficientNet-B0 transfer learning weights (`model/model_weights.pt`).
- **External Services**: OpenWeatherMap API (Weather/POP), Google Gemini API (Conversational AI).

---

## Project Structure

```text
SIH/
├── frontend/                     # Client application (served directly or via CDN)
│   ├── index.html                # Unified farmer dashboard
│   ├── style.css                 # Design system, accessible palette & media queries
│   ├── script.js                 # Application bootstrap & lifecycle coordinator
│   └── js/
│       ├── config.js             # Client configurations, endpoints, validation rules
│       ├── state.js              # AgriState: Single Source of Truth & event bus
│       ├── i18n.js               # Centralized translation engine (EN, HI, GU)
│       ├── api.js                # Resilient API service with timeouts & error mapping
│       └── components/
│           ├── header.js         # Status indicator & language switcher
│           ├── uploadCard.js     # Drag-and-drop, camera & decode validation
│           ├── resultView.js     # Diagnosis card & ICAR advisory presentation
│           ├── weatherCard.js    # Live weather & disease risk module
│           ├── irrigationCard.js # Soil moisture input & rule engine display
│           ├── sustainabilityCard.js # 60/40 stewardship score display
│           ├── assistantCard.js  # Conversational AI farmer advisor
│           └── dashboard.js      # Dashboard grid layout coordinator
├── model/
│   ├── model_weights.pt          # PyTorch trained model weights (16 classes)
│   └── model_metadata.json       # Dataset & class taxonomy specification
├── notebooks/
│   └── Train_ICAR_Rice_Maize_Model.ipynb # Model training & evaluation pipeline
├── src/                          # Backend Flask microservices
│   ├── app.py                    # REST API entrypoint & route handlers
│   ├── config.py                 # Backend configuration & environment settings
│   ├── predictor.py              # PyTorch inference service & warmup
│   ├── disease_info.py           # ICAR agronomic advisory knowledge base
│   ├── weather_service.py        # Weather integration & risk calculator
│   ├── irrigation_service.py     # Deterministic irrigation rule engine
│   ├── sustainability_service.py # 60/40 sustainability scoring engine
│   ├── assistant_service.py      # Gemini GenAI context grounding engine
│   ├── test_e2e_integration.py   # Full multi-module end-to-end test suite
│   ├── test_api.py               # API route contracts & validation suite
│   ├── test_irrigation.py        # Irrigation threshold boundary tests
│   ├── test_sustainability.py    # Sustainability scoring unit tests
│   ├── test_assistant.py         # Assistant unit tests & error recovery
│   ├── test_assistant_e2e.py     # Assistant prompt & context tests
│   └── test_weather.py           # Weather service & cache tests
├── .env.example                  # Template for environment variables
├── .gitignore                    # Exclusions (.env, venv, caches, logs)
├── requirements.txt              # Production Python dependencies
└── README.md                     # Documentation
```

---

## Getting Started

### 1. Prerequisites
- Python 3.10 or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)

### 2. Installation
Clone the repository and create a virtual environment:

```bash
# Clone the repository
git clone https://github.com/your-org/AgriSmart-AI.git
cd AgriSmart-AI

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` to configure external service credentials:

```ini
# Optional external service keys
OPENWEATHER_API_KEY=your_openweathermap_api_key_here
GEMINI_API_KEY=your_google_gemini_api_key_here
CLAUDE_API_KEY=

# Server configuration
PORT=5000
SERVER_HOST=0.0.0.0
CORS_ALLOWED_ORIGINS=*
ENABLE_DEV_MOCK=false
```

> **Note on Missing Keys**: If `OPENWEATHER_API_KEY` or `GEMINI_API_KEY` are left blank, the application operates in an honest degraded mode. Disease diagnosis and smart irrigation work at 100% functionality, while external cards provide clear instructions on adding keys to `.env` without displaying fake demo data.

### 4. Running the Application
Start the backend server:

```bash
python src/app.py
```

The Flask server will start on `http://localhost:5000`.
- **Web Interface**: Open `http://localhost:5000/` in your browser.
- **Backend API**: Accessible at `http://localhost:5000/`.

---

## API Reference

| Endpoint | Method | Content-Type | Description |
|---|---|---|---|
| `/health` | `GET` | — | Real-time system health, model status, and framework info |
| `/predict` | `POST` | `multipart/form-data` | Crop disease prediction (`image` file, max 10MB) |
| `/weather` | `GET`, `POST` | `application/json` | Real-time weather, 24h precipitation probability, and disease risk |
| `/irrigation` | `POST` | `application/json` | Deterministic irrigation decision (`soil_moisture`, optional `rain_probability`) |
| `/sustainability` | `POST` | `application/json` | Farm water stewardship score based on 60/40 formula |
| `/assistant` | `POST` | `application/json` | Multilingual conversational advice with active farm context |

---

## Automated Verification & Testing

The project includes comprehensive test suites covering unit logic, boundary conditions, and end-to-end integration:

```bash
# Run End-to-End Integration Suite (Prompt 10 verification)
python src/test_e2e_integration.py

# Run Core API & Payload Invariant Suite
python src/test_api.py

# Run Smart Irrigation Threshold Boundary Tests
python src/test_irrigation.py

# Run Sustainability Scoring Unit Tests
python src/test_sustainability.py

# Run GenAI Assistant Unit & Prompt Tests
python src/test_assistant.py
python src/test_assistant_e2e.py

# Run Weather Intelligence & Cache Tests
python src/test_weather.py
```

---

## Deployment Notes

### Production WSGI (Gunicorn)
To run in production using Gunicorn:
```bash
gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 60 src.app:app
```

### Docker Deployment
The application can be containerized using Python 3.10-slim:
```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "src.app:app"]
```

---

## Known Limitations
1. **External API Quotas**: Weather and Gemini Assistant capabilities rely on OpenWeatherMap and Google Cloud Gemini API quotas. If upstream rate limits are reached, the application returns HTTP 429/503 with user-friendly notices rather than fabricating data.
2. **Offline Field Mode**: While image classification, smart irrigation rules, and sustainability scoring run locally on the backend without external internet access, live weather and conversational LLM require connectivity.
