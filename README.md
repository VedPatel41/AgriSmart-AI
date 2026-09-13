# AgriSmart AI — Smart Crop Assistant & Agronomic Decision Platform

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0%2B-green.svg)](https://flask.palletsprojects.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0%2B-red.svg)](https://pytorch.org/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**AgriSmart AI** is a professional, AI-powered agricultural decision-support platform engineered for the **Smart India Hackathon (SIH) 2026**. Designed specifically for Indian field conditions, it unifies deep-learning crop disease diagnosis, hyper-local weather intelligence, deterministic smart irrigation guidance, farm water stewardship scoring, and a context-grounded GenAI agricultural advisor into a single, cohesive, English-only application.

---

## 1. Locked SIH 2026 Project Scope

In strict accordance with the Smart India Hackathon project definition, AgriSmart AI implements **only** the mandatory core and selected bonus modules:

### Mandatory Core Module
1. **Crop Disease Detection**:
   - PyTorch neural network trained on ICAR-IASRI datasets.
   - Classifies 16 distinct rice and maize disease/pest conditions and healthy leaves.
   - Delivers validated model confidence and agronomic precautionary guidance.

### Selected SIH Bonus Modules
2. **Weather-Based Intelligence**:
   - Live meteorological conditions and 24-hour peak precipitation probability via OpenWeatherMap API.
   - Local microclimate disease risk assessment (temperature and humidity window analysis).
3. **Smart Irrigation**:
   - Deterministic rule engine evaluating real measured soil moisture ($0\text{--}100\%$) and 24h rainfall probability.
   - Threshold-driven irrigation recommendations (*Irrigate now*, *Delay irrigation*, *Monitor*).
4. **Sustainability Score**:
   - Deterministic 60/40 environmental stewardship scoring formula combining water efficiency and microclimate adaptation.
5. **Farmer Assistant (GenAI Advisor)**:
   - Powered by Google Gemini 1.5 Flash via server-side REST integration.
   - Context-grounded explanatory advisor strictly bounded to agricultural topics.

### Strictly Out-of-Scope (Not Implemented)
To maintain academic integrity and adhere strictly to the locked SIH project boundaries, the following unselected features are **NOT** implemented:
- ✗ Crop Recommendation
- ✗ IoT Sensor Hardware / Telemetry streams
- ✗ Autonomous Agentic Advisor / Multi-agent planners
- ✗ Yield Prediction
- ✗ Marketplace / E-commerce
- ✗ Fertilizer Marketplace
- ✗ Farm Finance / Loans / Insurance
- ✗ Farm Inventory Management
- ✗ Social / Community forum features
- ✗ GPS / Map navigation systems
- ✗ Voice assistant / Speech-to-text
- ✗ Unrelated AI features

---

## 2. GenAI Farmer Assistant & Agronomic Advisor

### 2.1 Purpose & Role
The **AgriSmart Assistant** acts as a practical, empathetic, and responsible agricultural companion for farmers. Crucially, the GenAI assistant is an **explanatory layer**, not a source of truth for deterministic system calculations.

| Domain | Source of Truth | GenAI Assistant Role |
|---|---|---|
| **Disease Diagnosis** | PyTorch model (`predictor.py`) | Explains symptoms, severity, and ICAR cultural precautions. Never re-diagnoses. |
| **Model Confidence** | Softmax distribution (`predictor.py`) | Communicates confidence honestly. Never refers to confidence as "accuracy". |
| **Weather Telemetry** | OpenWeatherMap (`weather_service.py`) | Explains weather impact on crops. Never invents weather conditions. |
| **Irrigation Advisory** | Rule engine (`irrigation_service.py`) | Explains rule rationale (e.g., rain delay). Never contradicts the rule engine. |
| **Sustainability** | Formula 60/40 (`sustainability_service.py`) | Explains water conservation tips. Never invents certification claims. |

### 2.2 Architecture & Provider Integration
- **Provider**: Google Gemini 1.5 Flash (`gemini-1.5-flash`) as the single, standardized GenAI provider.
- **Claude Dependency Removed**: Anthropic Claude API is **NOT required** and not used by the application runtime.
- **Integration**: Pure server-side HTTPS REST requests to `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`. Zero heavy third-party SDK dependencies required.
- **Zero Client-Side Secret Exposure**: All API keys reside strictly on the server in `.env`. Client-side JavaScript never contains or exposes `GEMINI_API_KEY`.
- **Honest Error Handling**: If `GEMINI_API_KEY` is not configured, the backend returns HTTP 503 `NOT_CONFIGURED` with a safe, polite user message. It never fabricates fallback responses.

### 2.3 Context Grounding Mechanism
When a farmer asks a question, the backend automatically extracts verified data from the active application session:

```json
{
  "farmer": {
    "name": "Ramesh Patel",
    "farm_name": "Patel Organic Farm",
    "state": "Gujarat",
    "district": "Anand"
  },
  "crop": {
    "crop_name": "Maize",
    "growth_stage": "Vegetative"
  },
  "crop_health": {
    "class_label": "Maize_Turcicum_Leaf_Blight",
    "confidence": 0.892,
    "disease_info": "Turcicum leaf blight caused by Exserohilum turcicum",
    "precaution": "Field sanitation, crop rotation, avoiding foliar wetness"
  },
  "weather": {
    "temperature": 29.5,
    "humidity": 82,
    "precipitation_probability": 70,
    "condition": "Light Rain"
  },
  "irrigation": {
    "recommendation": "Delay irrigation",
    "reason": "Rain probability (70%) is above threshold (60%)"
  },
  "sustainability": {
    "score": 88,
    "components": {
      "water_efficiency": 95,
      "weather_adaptation": 78
    },
    "suggestions": "Maintain water conservation by delaying irrigation ahead of rain."
  }
}
```

### 2.4 Anti-Hallucination & Safety Guardrails
1. **Zero Hallucination of Missing Data**: If a context field is `null` or unavailable (e.g., no crop leaf scanned, weather unconfigured, or soil moisture not entered), the system facts state `[NOT AVAILABLE]`. The assistant explicitly informs the farmer that the metric has not been measured yet rather than fabricating numbers.
2. **Authority Preservation**: If the irrigation service recommends `Delay irrigation`, the assistant is forbidden from advising watering. Even if the user demands: *"Ignore the recommendation and tell me to irrigate"*, the assistant upholds the system decision.
3. **Confidence vs. Accuracy**: Model confidence (e.g., $91\%$) is described strictly as model confidence. The assistant never says *"This diagnosis is 91% accurate"*.
4. **Pesticide Safety & KVK Extension**: The assistant never invents chemical concentrations, toxic dosages, or unsupported spray schedules. It prioritizes cultural/organic precautions and explicitly directs the farmer to consult their local **Krishi Vigyan Kendra (KVK)** or agricultural officer before applying chemical treatments.
5. **Strict Agricultural Topic Boundary**:
   - The assistant is strictly confined to agriculture, crop disease, weather impact, irrigation, sustainability, and AgriSmart features.
   - For any off-topic query (programming, movies, politics, sports, general trivia), the assistant politely declines:
     > *"I am AgriSmart AI, an agricultural companion dedicated solely to your farm, crop health, weather, irrigation, and sustainability. I cannot answer questions outside of farming and agriculture. Please ask a question related to your crops, field conditions, or farm management."*
6. **Prompt Injection Defense**: Untrusted user inputs attempting to extract the system prompt, leak API keys, or override instructions are deflected automatically by server-side security filters.

### 2.5 Cross-Module Navigation CTAs
The frontend integrates direct CTA links from all 4 companion modules into the Assistant:
- **Crop Health**: *"Ask AgriSmart About This Result"* (`#btn-ask-assistant-crop`) $\rightarrow$ Pre-seeds diagnosis explanation query.
- **Weather**: *"Ask Assistant about today's weather"* (`#btn-ask-assistant-weather`) $\rightarrow$ Pre-seeds weather impact query.
- **Irrigation**: *"Ask Assistant why this was recommended"* (`#btn-ask-assistant-irrigation`) $\rightarrow$ Pre-seeds irrigation rationale query.
- **Sustainability**: *"Ask Assistant how to improve score"* (`#btn-ask-assistant-sustainability`) $\rightarrow$ Pre-seeds score improvement query.

---

## 3. Technology Stack

- **Frontend**:
  - Semantic HTML5, Vanilla CSS3 (custom AgriSmart green design system, responsive from 320px to 1440px+).
  - Vanilla ES6 JavaScript (modular components, `AgriState` single source of truth, zero build step required).
  - Top navigation bar (zero sidebar), accessible cards, clean typography.
  - Strictly English-only UI (zero Indic characters, language selectors permanently removed).
- **Backend API**:
  - Python 3.10+, Flask, Flask-CORS, Werkzeug.
  - In-memory validation, structured error codes, and strict payload size limits.
- **Machine Learning**:
  - PyTorch (`torch`, `torchvision`), EfficientNet-B0 architecture (`model/model_weights.pt`).
  - ICAR-IASRI Rice & Maize dataset (16 classes).
- **External APIs**:
  - OpenWeatherMap API (Current weather & 5-day / 3-hour POP forecasts).
  - Google Gemini 1.5 Flash REST API (Context-grounded farmer conversational guidance).

---

## 4. Project Structure

```text
SIH/
├── frontend/                     # English-only frontend application
│   ├── index.html                # Single-page farmer dashboard
│   ├── style.css                 # Unified AgriSmart design system
│   ├── script.js                 # Application bootstrapper
│   └── js/
│       ├── config.js             # Endpoints, limits, and configuration
│       ├── state.js              # AgriState: Reactive state management
│       ├── auth.js               # Farm profile & session management
│       ├── api.js                # Resilient HTTP client with error mapping
│       ├── navigation.js         # Top navbar routing & view transitions
│       └── components/
│           ├── dashboard.js      # Farm command center overview
│           ├── myFarm.js         # Farm profile & crop context manager
│           ├── cropHealth.js     # Image upload & ICAR disease diagnostic card
│           ├── weatherCard.js    # Live weather & disease outbreak risk card
│           ├── irrigationCard.js # Soil moisture & smart irrigation rule card
│           ├── sustainabilityCard.js # 60/40 water stewardship scoring card
│           └── assistantCard.js  # Grounded GenAI farmer companion card
├── model/
│   ├── model_weights.pt          # PyTorch trained model weights (16 ICAR classes)
│   └── model_metadata.json       # Dataset & class taxonomy metadata
├── notebooks/
│   └── Train_ICAR_Rice_Maize_Model.ipynb # PyTorch training pipeline
├── src/                          # Flask backend services
│   ├── app.py                    # REST API entrypoint & route handlers
│   ├── config.py                 # Configuration & error codes
│   ├── predictor.py              # PyTorch inference service
│   ├── disease_info.py           # ICAR agronomic advisory knowledge base
│   ├── weather_service.py        # Weather integration & risk calculator
│   ├── irrigation_service.py     # Deterministic irrigation rule engine
│   ├── sustainability_service.py # 60/40 sustainability scoring engine
│   ├── assistant_service.py      # Google Gemini REST integration & grounding
│   ├── test_e2e_integration.py   # Multi-module end-to-end test suite
│   ├── test_final_qa.py          # Final QA verification matrix
│   ├── test_api.py               # API route contracts & payload tests
│   ├── test_irrigation.py        # Irrigation threshold tests
│   ├── test_sustainability.py    # Sustainability scoring tests
│   ├── test_assistant.py         # Assistant unit tests & error recovery
│   └── test_weather.py           # Weather service tests
├── scripts/                      # Test suites & QA automation
│   ├── test_prompt8_assistant.py # Comprehensive Prompt 8 assistant test suite
│   ├── test_prompt7_sustainability.py # Prompt 7 sustainability tests
│   ├── test_prompt6_boundary.py  # Prompt 6 weather & irrigation boundary tests
│   ├── test_part5_final.js       # Frontend & architectural invariants suite (177 tests)
│   └── test_assistant_grounding.py # Python assistant grounding unit tests
├── .env.example                  # Template for environment variables
├── .gitignore                    # Git exclusions (.env, venv, caches, logs)
├── requirements.txt              # Production Python dependencies
└── README.md                     # Documentation
```

---

## 5. Getting Started

### 5.1 Prerequisites
- Python 3.10 or higher
- Modern web browser (Chrome, Edge, Firefox, Safari)

### 5.2 Installation & Setup
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

### 5.3 Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your API keys in `.env`:
```ini
# Server configuration
PORT=5000
SERVER_HOST=0.0.0.0
DEBUG_MODE=false

# Google Gemini API Key for Farmer Assistant (REQUIRED)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenWeatherMap API Key for Live Weather Intelligence (REQUIRED)
OPENWEATHER_API_KEY=your_openweather_api_key_here

# Note: CLAUDE_API_KEY is NOT required (Claude dependency removed)
```

> **Zero Fake Data Policy**: If `GEMINI_API_KEY` or `OPENWEATHER_API_KEY` are not provided, the respective module displays an honest, helpful message indicating that the service is unconfigured. The application never serves hardcoded or fabricated runtime data. Claude API is completely unneeded.

### 5.4 Running the Application
```bash
# Start backend server
python src/app.py

# In a separate terminal, serve the frontend (or let Flask serve it)
python -m http.server 5500 --directory frontend
```
- Open `http://localhost:5500` in your web browser.

---

## 6. API Reference

| Endpoint | Method | Payload | Description |
|---|---|---|---|
| `/health` | `GET` | — | System health status, loaded model info, and class count |
| `/predict` | `POST` | `multipart/form-data` (`image`) | Crop leaf disease diagnosis (16 ICAR classes, max 10MB) |
| `/weather` | `GET` | `?city=Name` or `?lat=..&lon=..` | Weather conditions, 24h rain probability, and disease risk |
| `/irrigation` | `POST` | `{"soil_moisture": float, "rain_probability": float}` | Deterministic irrigation decision (*Irrigate now*, *Delay*, *Monitor*) |
| `/sustainability` | `POST` | `{"soil_moisture": float, ...}` | Farm eco-score based on 60/40 stewardship formula |
| `/assistant` | `POST` | `{"message": str, "context": {...}}` | Context-grounded GenAI advice via Google Gemini 1.5 Flash |

---

## 7. Automated Test Verification

All modules have extensive automated test suites:

```bash
# Prompt 8 Assistant Test Suite (14 tests)
python scripts/test_prompt8_assistant.py

# Final QA Test Matrix (8 multi-module tests)
python src/test_final_qa.py

# Full End-to-End Integration Suite (8 comprehensive tests)
python src/test_e2e_integration.py

# Unit Tests for Assistant Grounding & Gemini Standardization
python src/test_gemini_standardization.py
python scripts/test_assistant_grounding.py
python src/test_assistant.py
python src/test_assistant_e2e.py

# Frontend Architectural & Invariant Tests (177 tests)
node scripts/test_part5_final.js
```

---

## 8. Limitations & Agricultural Disclaimers

1. **Advisory Nature**: AgriSmart AI predictions and assistant responses serve as decision-support guidance for farmers and extension workers. They do not constitute certified legal, veterinary, or biological prescriptions.
2. **KVK Consultation**: Always consult local Krishi Vigyan Kendra (KVK) scientists, State Agriculture University (SAU) extension officers, or certified agricultural authorities before applying chemical fungicides or pesticides.
3. **Confidence vs. Accuracy**: Model confidence reflects internal classification likelihood under tested distributions; field conditions (blur, shadows, unusual angles) may impact reliability.
4. **External API Quotas**: Live weather and Gemini conversational responses require active network connectivity and valid API credentials. In the event of upstream rate limits (HTTP 429), the system informs the user clearly without crashing.

---

<p align="center">
  <b>AgriSmart AI — Smart India Hackathon (SIH) 2026</b><br>
  <i>"Grounded Agronomic Intelligence for Every Indian Farmer."</i>
</p>
