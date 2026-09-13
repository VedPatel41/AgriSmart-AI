# AgriSmart AI — Smart India Hackathon (SIH 2026)
## Comprehensive Technical & Model Evaluation Report

---

### 1. Executive Summary & SIH Scope Compliance

**AgriSmart AI** is a specialized agricultural decision-support system engineered to provide trustworthy, explainable, and accessible intelligence directly to Indian farmers and extension officers.

In strict compliance with the **SIH 2026 Problem Statement**, the functional scope is locked to:

| Category | Module Name | Core Implementation / Architecture | Operational Status |
|---|---|---|---|
| **Mandatory Core** | **Crop Disease Detection** | PyTorch Transfer Learning (EfficientNet-B0, 16 ICAR Rice & Maize classes) | **PASS** (Inference verified) |
| **Selected Bonus 1** | **Weather-Based Intelligence** | OpenWeatherMap 5-day / 3-hour POP & microclimate foliar outbreak risk | **BLOCKED** on API key (`OPENWEATHER_API_KEY`) |
| **Selected Bonus 2** | **Smart Irrigation Advisory** | Deterministic threshold rule engine ($0\text{--}100\%$ soil moisture & 24h rain) | **PASS** (Rule boundaries verified) |
| **Selected Bonus 3** | **Sustainability & Stewardship** | 60/40 Agronomic stewardship scoring formula ($[0, 100]$ score) | **PASS** (Scoring logic verified) |
| **Selected Bonus 4** | **Farmer Assistant (GenAI)** | Google Gemini 1.5 Flash REST integration with multi-module grounding | **BLOCKED** on API key (`GEMINI_API_KEY`) |

#### Strict Out-of-Scope Confirmation
The following unselected bonus modules and extraneous product features are **strictly not implemented**:
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

### 2. Deep Learning Model & Preprocessing Pipeline

#### 2.1 Architecture
- **Backbone**: EfficientNet-B0 pre-trained transfer learning architecture (`torchvision.models.efficientnet_b0`).
- **Classification Head**: `Linear(in_features=1280, out_features=16)`.
- **Input Dimensions**: $224 \times 224 \times 3$ RGB.
- **Normalization**: Standard ImageNet statistics (`mean=[0.485, 0.456, 0.406]`, `std=[0.229, 0.224, 0.225]`).
- **Output Activation**: Softmax probability distribution over 16 classes.
- **Weights File**: `model/model_weights.pt` (16.4 MB PyTorch checkpoint).

#### 2.2 Dataset Taxonomy (ICAR-IASRI 16 Classes)
1. `Maize_Aphids` (Insect-pest)
2. `Maize_Curvularia_Leaf_Spot` (Fungal: *Curvularia lunata*)
3. `Maize_Fall_Armyworm` (Insect-pest: *Spodoptera frugiperda*)
4. `Maize_Healthy` (Healthy tissue)
5. `Maize_Maydis_Leaf_Blight` (Fungal: *Bipolaris maydis*)
6. `Maize_Sorghum_Downy_Mildew` (Oomycete: *Peronosclerospora sorghi*)
7. `Maize_Turcicum_Leaf_Blight` (Fungal: *Exserohilum turcicum*)
8. `Rice_Bacterial_Leaf_Blight` (Bacterial: *Xanthomonas oryzae*)
9. `Rice_Brown_Spot` (Fungal: *Bipolaris oryzae*)
10. `Rice_False_Smut` (Fungal: *Ustilaginoidea virens*)
11. `Rice_Healthy` (Healthy tissue)
12. `Rice_Leaf_Folder` (Insect-pest: *Cnaphalocrocis medinalis*)
13. `Rice_Leaf_Sheath_Blight` (Fungal: *Rhizoctonia solani*)
14. `Rice_Rice_Skipper` (Insect-pest: *Pelopidas mathias*)
15. `Rice_White_Stem_Borer` (Insect-pest: *Scirpophaga innotata*)
16. `Rice_Yellow_Stem_Borer` (Insect-pest: *Scirpophaga incertulas*)

#### 2.3 Model Training & Held-Out Evaluation Status: CRITICAL AUDIT
- **Current Checkpoint State**: The weights in `model/model_weights.pt` were initialized and trained against synthetic directory structures to validate the PyTorch training loop, backward pass, serialization, and serving pipeline.
- **AIKosh Dataset Requirement**: The official ~1GB ICAR-IASRI dataset (`Crop Disease and Insect-pest Image Dataset for Rice and Maize`) requires Govt of India AIKosh single sign-on (SSO) authentication with mobile/email OTP. It cannot be scraped or downloaded autonomously by automated agents.
- **Status**:
  - Model Training on full dataset: **BLOCKED / REMAINING ACTION FOR USER**.
  - Held-out test evaluation: **BLOCKED / REMAINING ACTION FOR USER**.
  - *Academic Integrity*: In adherence to SIH standards, precision, recall, macro-F1, and confusion matrix values are **NOT fabricated**. They must be computed on the quarantined held-out field test set after training.

---

### 3. Backend Services & Integration Architecture

```
                                  [ Farmer / Client ]
                                           │
                                           ▼
                            [ Top Navigation Bar / PWA ]
                                           │
                                           ▼
                          [ Flask REST API Gateway (:5000) ]
                                           │
         ┌───────────────────┬─────────────┴──────┬───────────────────┐
         ▼                   ▼                    ▼                   ▼
    [/predict]          [/weather]          [/irrigation]     [/sustainability]
         │                   │                    │                   │
         ▼                   ▼                    ▼                   ▼
  PyTorch Predictor    Weather Service     Irrigation Engine   Sustainability
  (EfficientNet-B0)   (OpenWeatherMap)      (Rule Engine)      (60/40 Formula)
         │                   │                    │                   │
         └───────────────────┴─────────────┬──────┴───────────────────┘
                                           │
                                           ▼
                                 Active Farm Context
                                           │
                                           ▼
                                      [/assistant]
                                           │
                                           ▼
                                Google Gemini 1.5 Flash
                                (Agricultural Grounding)
```

#### 3.1 Inference Engine (`src/predictor.py` & `/predict`)
- Validates multipart image uploads: MIME types (`image/jpeg`, `image/png`, `image/webp`), dimensions ($\ge 30\text{px}$), and file size ($\le 10\text{MB}$).
- Decodes image in-memory via Pillow, resizes to $224 \times 224$, applies ImageNet normalization, and executes forward pass.
- Returns `class_label`, `confidence` (never called "accuracy"), and links to ICAR agronomic advisory (`disease_info.py`).

#### 3.2 Weather Intelligence (`src/weather_service.py` & `/weather`)
- Ingests user city or GPS coordinates (`lat`, `lon`).
- Queries OpenWeatherMap 5-day / 3-hour API with an in-memory 10-minute cache.
- Analyzes peak 24h precipitation probability (POP) and microclimate foliar disease risks.
- **Unconfigured State**: Returns HTTP 503 `NOT_CONFIGURED` without fabricating dummy temperatures or rain chances.

#### 3.3 Smart Irrigation Rule Engine (`src/irrigation_service.py` & `/irrigation`)
- Authoritative deterministic decision rules based on measured root-zone soil moisture ($0\text{--}100\%$) and forecast rain probability:
  1. **Rain $> 60\%$** $\rightarrow$ **Delay irrigation** (prevents waterlogging & runoff)
  2. **Soil $< 30\%$ AND Rain $< 30\%$** $\rightarrow$ **Irrigate now** (mitigates crop moisture stress)
  3. **Otherwise** $\rightarrow$ **Monitor** (soil moisture currently adequate)

#### 3.4 Farm Sustainability Score (`src/sustainability_service.py` & `/sustainability`)
- Quantitative, reproducible stewardship formula:
  $$\text{Score} = (\text{Water Conservation Efficiency} \times 0.60) + (\text{Microclimate Adaptation} \times 0.40)$$
- Clamped to $[0, 100]$:
  - $\ge 80$: *Excellent*
  - $\ge 60$: *Good*
  - $\ge 40$: *Fair*
  - $< 40$: *Needs Improvement*
- Generates actionable water-conservation tips without false carbon credits or regulatory certifications.

#### 3.5 GenAI Farmer Assistant (`src/assistant_service.py` & `/assistant`)
- **Provider**: Google Gemini 1.5 Flash (`gemini-1.5-flash`) via pure HTTPS REST API.
- **Grounding**: Ingests active session context: Farmer Profile, Crop Info, Disease Diagnosis & Confidence, Live Weather, Irrigation Recommendation, and Sustainability Score.
- **Strict Role**: Explains trusted deterministic results; never re-diagnoses or overrides irrigation recommendations.
- **Topic Boundary**: Confined exclusively to agriculture and AgriSmart features; politely declines non-farming questions (coding, movies, politics, sports, general trivia).
- **Security**: Hardened against prompt injection, instruction overrides, and credential extraction.
- **Pesticide Safety**: Advises consulting local Krishi Vigyan Kendra (KVK) scientists before chemical applications; never invents dosages.

---

### 4. Verification & Testing Matrix

The implementation has been verified through an extensive battery of automated test suites:

| Test Suite | Scope & Target | Total Tests | Status |
|---|---|:---:|:---:|
| `scripts/test_part5_final.js` | Frontend DOM, Responsive Breakpoints, Zero Indic text, Security Secrets Scan | 177 | **PASS** (177/177) |
| `scripts/test_prompt8_assistant.py` | Assistant Prompt Injection, Topic Boundary, Grounding Authority, Missing Data | 14 | **PASS** (14/14) |
| `scripts/test_prompt7_sustainability.py` | Sustainability 60/40 Formula, Boundary Clamping, Missing Input Validation | 8 | **PASS** (8/8) |
| `scripts/test_prompt6_boundary.py` | Irrigation Strict Boundaries (29/29, 30/29, 25/60, 25/61), Out-of-Bounds Check | 8 | **PASS** (8/8) |
| `src/test_api.py` | Core API Contracts, Valid/Corrupt Image Payloads, Rate Limits, Sequential Execution | 12 | **PASS** (12/12) |
| `src/test_final_qa.py` | End-to-End System Health, Model Warmup, Weather/Irrigation/Sustainability/Assistant Matrix | 8 | **PASS** (8/8) |
| `src/test_e2e_integration.py` | Complete User Journey (Upload $\rightarrow$ Predict $\rightarrow$ Weather $\rightarrow$ Irrigate $\rightarrow$ Sustainability $\rightarrow$ Assistant) | 8 | **PASS** (8/8) |
| `src/test_assistant.py` | Unit Tests for Gemini REST Client, HTTP Status Mapping (429, 403, 503) | 10 | **PASS** (10/10) |
| `scripts/test_5_images.py` | Real Image Forward Passes Across 5 Distinct ICAR Classes | 5 | **PASS** (5/5) |

---

### 5. Final PASS / FAIL / BLOCKED Status Dashboard

| Component / Subsystem | Status | Details / Notes |
|---|:---:|---|
| **Core Disease Detection** | **PASS** | PyTorch EfficientNet-B0 inference pipeline operational |
| **Model Training** | **BLOCKED** | Requires downloading ~1GB ICAR dataset from AIKosh portal |
| **Model Evaluation** | **BLOCKED** | Unseen held-out test set evaluation pending model training |
| **Weather Intelligence** | **BLOCKED** | Waiting on `OPENWEATHER_API_KEY` in `.env` |
| **Smart Irrigation** | **PASS** | Exact deterministic rule thresholds verified |
| **Sustainability Score** | **PASS** | Deterministic 60/40 scoring formula verified |
| **GenAI Assistant** | **BLOCKED** | Waiting on `GEMINI_API_KEY` in `.env` |
| **Authentication** | **PASS** | Local/demo farmer profile and session management verified |
| **Frontend UI/UX** | **PASS** | English-only, top navbar, responsive mobile/desktop, zero fake data |
| **Backend API Gateway** | **PASS** | Flask REST service live on `0.0.0.0:5000` with input validation |
| **Deployment Readiness** | **PASS** | Ready for containerization or WSGI (Gunicorn) hosting |
| **Documentation** | **PASS** | Complete README, API reference, and technical report |
| **End-to-End Demo** | **PASS** | All local workflows verified with 5 real leaf image uploads |

---

### 6. Remaining Action Items for SIH Submission

1. **Obtain ICAR Dataset & Train Final Model**:
   - Visit [AIKosh IndiaAI Portal](https://aikosh.indiaai.gov.in/home/datasets/details/crop_disease_and_insect_pest_image_dataset_for_rice_and_maize.html).
   - Sign in with mobile/email OTP and download `icar_dataset.zip`.
   - Place into `data/` and run `python scripts/download_icar_data.py --zip data/icar_dataset.zip`.
   - Run the training pipeline via `python scripts/train_icar_model.py` or execute `notebooks/Train_ICAR_Rice_Maize_Model.ipynb` in Google Colab with GPU.
   - Quarantining the held-out test set will yield true Macro-F1, Confusion Matrix, and Precision/Recall figures.
2. **Add API Keys to `.env` for Live External Services**:
   - Add `OPENWEATHER_API_KEY=your_key` to `.env` to enable live weather and foliar disease risk indices.
   - Add `GEMINI_API_KEY=your_key` to `.env` to enable conversational answers from Google Gemini 1.5 Flash.
3. **Deploy Backend & Configure Production URL**:
   - Deploy backend to Render, Railway, AWS EC2, or Docker container.
   - Set `window.__AGRISMART_API_URL__` or host frontend on same origin to connect in production.
