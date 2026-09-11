/**
 * AgriSmart AI - Frontend Configuration & Constants
 * Single source of truth for API, upload rules, validation, and precautions.
 */
const AgriConfig = {
  // API Base URL - allows environment/runtime override or auto-detects current host
  apiBaseUrl: (() => {
    // 1. Explicit global runtime override (e.g. injected in production hosting)
    if (typeof window !== "undefined" && window.__AGRISMART_API_URL__ && typeof window.__AGRISMART_API_URL__ === "string") {
      return window.__AGRISMART_API_URL__.trim().replace(/\/+$/, "");
    }
    // 2. Browser localStorage override for staging/production testing
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = window.localStorage.getItem("agrismart_api_url");
        if (stored && stored.trim()) return stored.trim().replace(/\/+$/, "");
      }
    } catch (e) {}
    // 3. Local development fallbacks
    if (window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:5000";
    }
    // 4. Same-origin deployment (reverse proxy or served by Flask)
    if (window.location.port === "5000") {
      return window.location.origin;
    }
    return window.location.port ? `http://${window.location.hostname}:5000` : window.location.origin;
  })(),

  // Endpoints
  endpoints: {
    health: "/health",
    predict: "/predict",
    weather: "/weather",
    irrigation: "/irrigation",
    sustainability: "/sustainability",
    assistant: "/assistant"
  },

  // Upload constraints & validation parameters
  upload: {
    maxFileSizeBytes: 5 * 1024 * 1024, // 5 MB
    maxFileSizeDisplay: "5 MB",
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    allowedMimeTypes: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
    minImageDimensions: {
      width: 30,
      height: 30
    }
  },

  // UI States
  states: {
    IDLE: "idle",             // No file chosen
    SELECTED: "selected",     // File selected and verified
    ANALYZING: "analyzing",   // Uploading & processing
    SUCCESS: "success",       // Prediction received
    ERROR: "error"            // Validation or network error
  },

  // Network request settings
  network: {
    predictTimeoutMs: 25000,
    healthCheckIntervalMs: 15000,
    weatherTimeoutMs: 10000
  },

  // Weather Intelligence Settings
  weather: {
    defaultCity: "Ahmedabad",
    popularLocations: [
      { name: "Ahmedabad", state: "Gujarat", region: "Western" },
      { name: "Ludhiana", state: "Punjab", region: "Northern" },
      { name: "Lucknow", state: "Uttar Pradesh", region: "Central" },
      { name: "Pune", state: "Maharashtra", region: "Western" },
      { name: "Nagpur", state: "Maharashtra", region: "Central" },
      { name: "Patna", state: "Bihar", region: "Eastern" },
      { name: "Hyderabad", state: "Telangana", region: "Southern" }
    ],
    states: {
      IDLE: "idle",
      LOADING: "loading",
      SUCCESS: "success",
      ERROR: "error",
      NO_LOCATION: "no_location",
      NOT_CONFIGURED: "not_configured"
    },
    riskBadges: {
      High: { color: "danger", icon: "⚠️", label: "High Crop Weather Risk" },
      Moderate: { color: "warning", icon: "⚡", label: "Moderate Crop Weather Risk" },
      Low: { color: "success", icon: "🌱", label: "Low Crop Weather Risk" }
    }
  },

  // Smart Irrigation Decision Engine Settings
  irrigation: {
    thresholds: {
      RAIN_DELAY_THRESHOLD: 60,
      SOIL_DRY_THRESHOLD: 30,
      RAIN_LOW_THRESHOLD: 30
    },
    recommendations: {
      "Irrigate now": {
        key: "irrigate_now",
        badgeClass: "badge-irrigate-now",
        icon: "💧",
        title: "Irrigate Now",
        shortDesc: "Soil moisture is low and rain is unlikely. Root zone irrigation is recommended."
      },
      "Delay irrigation": {
        key: "delay_irrigation",
        badgeClass: "badge-delay-irrigation",
        icon: "⏳",
        title: "Delay Irrigation",
        shortDesc: "Rainfall expected in next 24 hours. Postpone watering to avoid waterlogging."
      },
      "Monitor": {
        key: "monitor",
        badgeClass: "badge-monitor",
        icon: "👁️",
        title: "Monitor Soil",
        shortDesc: "Moisture levels are currently adequate; continue regular monitoring."
      }
    },
    quickPresets: [
      { label: "15% (Very Dry)", value: 15 },
      { label: "25% (Dry)", value: 25 },
      { label: "50% (Adequate)", value: 50 },
      { label: "75% (Wet)", value: 75 }
    ]
  },

  // Sustainability & Water Efficiency Settings
  sustainability: {
    ratings: {
      "Excellent": { label: "Excellent", min: 80, badgeClass: "badge-success", color: "#15803d", icon: "🌿" },
      "Good": { label: "Good", min: 60, badgeClass: "badge-primary", color: "#2563eb", icon: "🌱" },
      "Fair": { label: "Fair", min: 40, badgeClass: "badge-warning", color: "#b45309", icon: "⚡" },
      "Needs Improvement": { label: "Needs Improvement", min: 0, badgeClass: "badge-danger", color: "#b91c1c", icon: "🔻" }
    },
    weights: {
      water_efficiency: 0.60,
      weather_adaptation: 0.40
    }
  },

  // GenAI Farmer Assistant Settings
  assistant: {
    maxMessageLength: 600,
    maxHistoryMessages: 8,
    quickQuestions: {
      en: [
        "Explain crop diagnosis & remedies",
        "Should I irrigate today?",
        "What is the 24-hour weather risk?",
        "How can I improve my farm eco score?"
      ]
    }
  },

  // Friendly validation messages
  messages: {
    noFile: "Please select a crop leaf photo first.",
    unsupportedType: "This file type isn't supported. Please upload a JPG, PNG, or WEBP image.",
    tooLarge: "That image is too large. Please choose an image smaller than 5 MB.",
    unreadable: "We couldn't read this image. Please try another photo.",
    tooSmall: "This image appears too small to analyze. Please provide a clearer crop leaf photo.",
    timeout: "The analysis is taking too long. Please check your connection and try again.",
    offline: "We couldn't connect to the crop analysis service. Please check that the server is running on port 5000 and try again.",
    genericError: "The crop analysis service is temporarily unavailable. Please try again.",
    weatherNotConfigured: "Weather service is not configured. Add OPENWEATHER_API_KEY in backend .env to view live weather.",
    weatherNotFound: "We couldn't find weather for that location. Please check the spelling.",
    weatherUnavailable: "Weather information is temporarily unavailable.",
    weatherSelectLocation: "Select an agricultural hub or type a city to view live weather.",
    irrigationInvalidSoil: "Please enter a valid soil moisture percentage between 0 and 100%.",
    irrigationWeatherNeeded: "Real next-24h rain forecast is needed. Please ensure weather is loaded or configured.",
    sustainabilityDataNeeded: "Please check irrigation or enter soil moisture to calculate sustainability.",
    assistantNotConfigured: "AI Assistant is not configured. Please add GEMINI_API_KEY in backend .env to enable the assistant.",
    assistantEmptyMessage: "Please type a question before sending.",
    assistantTimeout: "AI Assistant is taking longer than expected. Please try again.",
    assistantError: "AI Assistant is temporarily unavailable. Please try again."
  },

  // Actionable Precaution Knowledge Base for Farmers
  precautions: {
    "Tomato_Early_Blight": {
      name: "Tomato — Early Blight",
      severity: "Moderate Alert",
      advice: "Remove infected lower leaves immediately. Avoid overhead watering to prevent fungus spores from splashing onto healthy foliage. Ensure good air circulation between plants.",
      organicCare: "Apply neem oil or diluted copper soap fungicide in early morning."
    },
    "Tomato_Late_Blight": {
      name: "Tomato — Late Blight",
      severity: "High Alert",
      advice: "Immediately cut and safely dispose of severely infected vines. Keep leaves completely dry. Do not compost infected debris as spores can survive in soil.",
      organicCare: "Spray approved bio-fungicide or copper-based protector before wet weather."
    },
    "Tomato_Healthy": {
      name: "Tomato — Healthy Plant",
      severity: "Optimal Condition",
      advice: "Your crop exhibits healthy green foliage with no detectable pathogens. Maintain regular drip irrigation at the root zone and inspect leaves weekly.",
      organicCare: "Apply balanced organic compost to sustain natural immunity."
    },
    "Potato_Early_Blight": {
      name: "Potato — Early Blight",
      severity: "Moderate Alert",
      advice: "Prune affected lower leaves and mulch around plant bases. Practice a 3-year crop rotation avoiding nightshade family crops.",
      organicCare: "Treat with copper hydroxide spray if lesions cover more than 5% of leaf area."
    },
    "Potato_Late_Blight": {
      name: "Potato — Late Blight",
      severity: "High Alert",
      advice: "Harvest tubers during dry weather only. Discard any tubers showing brown or sunken flesh. Store harvested potatoes in a dark, dry, ventilated area.",
      organicCare: "Remove cull piles and destroy volunteer potato sprouts."
    },
    "Corn_Common_Rust": {
      name: "Corn (Maize) — Common Rust",
      severity: "Moderate Alert",
      advice: "Common rust thrives in high humidity. Remove neighboring wild grass weeds that act as alternate hosts. Avoid overhead sprinkler irrigation.",
      organicCare: "Select resistant seed hybrids for the next planting cycle."
    },
    "Apple_Black_Rot": {
      name: "Apple — Black Rot",
      severity: "High Alert",
      advice: "Prune out dead cankered branches during dormant winter season. Remove and burn mummified fruit hanging on trees or lying on ground.",
      organicCare: "Apply sulfur or copper lime spray from silver-tip bud stage."
    }
  },

  defaultPrecaution: {
    name: "Detected Plant Condition",
    severity: "Observation Recommended",
    advice: "Isolate the affected plant from healthy crops. Monitor for spreading spots or discoloration, and consult your local Krishi Vigyan Kendra (KVK) or agricultural extension officer.",
    organicCare: "Ensure proper soil drainage and avoid wetting leaves during sunset."
  },

  // Supported languages (English-only)
  languages: [
    { code: "en", label: "English", flag: "EN" }
  ]
};

// Expose on window
window.AgriConfig = AgriConfig;
