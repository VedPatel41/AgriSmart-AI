/**
 * AgriSmart AI - Centralized Regional Language Translation Engine (i18n)
 * English-Only Foundation: Provides comprehensive semantic translations
 * for all headings, labels, buttons, and helper texts across the application.
 */
const AgriI18n = {
  translations: {
    en: {
      // Header & Navigation
      "nav.brandTitle": "AgriSmart AI",
      "nav.brandSubtitle": "Smart decisions for healthier crops",
      "nav.statusOnline": "Backend: Online",
      "nav.statusOffline": "Backend: Offline",
      "nav.statusChecking": "Checking...",
      "nav.langLabel": "Language",

      // Navigation Shell Groups
      "nav.groupOverview": "OVERVIEW",
      "nav.overview": "Dashboard Overview",
      "nav.groupMyFarm": "MY FARM",
      "nav.myFarm": "My Farm Profile",
      "nav.cropHealth": "Crop Health",
      "nav.groupSmartFarming": "SMART FARMING",
      "nav.weather": "Weather Intelligence",
      "nav.irrigation": "Smart Irrigation",
      "nav.sustainability": "Sustainability & Eco-Score",
      "nav.groupAssistance": "ASSISTANCE",
      "nav.assistant": "Farmer AI Assistant",
      "nav.groupSystem": "SYSTEM",
      "nav.settings": "Settings",
      "nav.logout": "Log Out",

      // Auth
      "auth.loginTitle": "Welcome back",
      "auth.loginSub": "Smart decisions for healthier crops.",
      "auth.signupTitle": "Create your farm account",
      "auth.signupSub": "Start monitoring crop health and farm conditions.",
      "auth.identifierLabel": "Email or Mobile Number",
      "auth.identifierPlaceholder": "farmer@example.com or 10-digit mobile",
      "auth.passwordLabel": "Password",
      "auth.confirmPasswordLabel": "Confirm Password",
      "auth.fullNameLabel": "Full Name",
      "auth.farmNameLabel": "Farm Name (Optional)",
      "auth.btnLogin": "Sign In to Farm",
      "auth.btnSignup": "Create Account",
      "auth.btnDemo": "Continue as Demo Farmer",
      "auth.demoDisclaimer": "Demo session: Pre-loads sample Indian farm context for evaluation. No credentials needed.",
      "auth.noAccount": "Don't have an account?",
      "auth.haveAccount": "Already have an account?",
      "auth.createAccountLink": "Create one now",
      "auth.loginLink": "Sign in here",

      // Onboarding Wizard
      "onboard.title": "Welcome to AgriSmart",
      "onboard.sub": "Let's set up your farm profile for tailored recommendations.",
      "onboard.step1Title": "Tell us about your farm",
      "onboard.step2Title": "Where is your farm located?",
      "onboard.step3Title": "What is your main crop?",
      "onboard.btnNext": "Continue →",
      "onboard.btnBack": "← Back",
      "onboard.btnFinish": "Complete Setup",
      "onboard.btnSkip": "Skip for now",

      // Module Badges & Titles
      "module.weatherBadge": "Live Weather",
      "module.irrigationBadge": "Field Advisory",
      "module.sustainabilityBadge": "Stewardship Indicator",
      "module.assistantBadge": "AI Farmer Advisor",
      "module.weatherTitle": "Weather & Disease Risk",
      "module.irrigationTitle": "Smart Irrigation Advisory",
      "module.sustainabilityTitle": "Sustainability & Stewardship",
      "module.assistantTitle": "GenAI Farmer Assistant",

      // Smart Farming Dashboard & Shared
      "sf.sectionTitle": "Smart Farming",
      "sf.sectionSub": "Real-time decision support for your farm",
      "sf.weatherCardTitle": "Weather Intelligence",
      "sf.weatherCardDesc": "Local temperature, rain chance & crop risk",
      "sf.weatherBtn": "View Weather",
      "sf.irrigationCardTitle": "Smart Irrigation",
      "sf.irrigationCardDesc": "Moisture-balanced watering recommendations",
      "sf.irrigationBtn": "Check Irrigation",
      "sf.sustainabilityCardTitle": "Sustainability",
      "sf.sustainabilityCardDesc": "Farm eco-score and water conservation",
      "sf.sustainabilityBtn": "View Sustainability",
      "sf.notAvailable": "Not available",
      "sf.notCalculated": "Not calculated yet",
      "sf.setupFarm": "Set up farm location",
      "sf.enterMoisture": "Enter soil moisture to check",

      // Weather Module
      "weather.title": "Weather Intelligence",
      "weather.subtitle": "Current weather and forecast-based farm insights",
      "weather.refreshBtn": "Refresh Weather",
      "weather.locationMissing": "Set your farm location to view local weather.",
      "weather.updateLocationBtn": "Update Farm Location",
      "weather.unavailable": "Weather data is currently unavailable.",
      "weather.tryAgain": "Try Again",
      "weather.next24h": "Next 24 Hours",
      "weather.rainChance": "Rain probability",
      "weather.humidity": "Humidity",
      "weather.wind": "Wind speed",
      "weather.risk": "Crop Weather Risk",

      // Irrigation Module
      "irrigation.title": "Smart Irrigation Advisory",
      "irrigation.subtitle": "Make a better watering decision based on soil moisture and rainfall",
      "irrigation.moistureLabel": "Current soil moisture (%)",
      "irrigation.moistureHelp": "Manual soil moisture input between 0% and 100%",
      "irrigation.checkBtn": "Check Irrigation",
      "irrigation.recTitle": "Recommendation",
      "irrigation.whyTitle": "Why this decision?",
      "irrigation.rulesTitle": "How this decision was made",
      "irrigation.irrigateNow": "Irrigate now",
      "irrigation.delayIrrigation": "Delay irrigation",
      "irrigation.monitor": "Monitor",

      // Sustainability Module
      "sustainability.title": "Farm Sustainability & Stewardship",
      "sustainability.subtitle": "Understand the sustainability indicators for your farm",
      "sustainability.scoreTitle": "Overall Stewardship Score",
      "sustainability.waterEff": "Water efficiency",
      "sustainability.weatherAdapt": "Micro-climate adaptation",
      "sustainability.factors": "Contributing factors",
      "sustainability.suggestion": "Actionable field guidance",
      "sustainability.empty": "Complete your farm information to calculate this indicator.",

      // Footer
      "footer.brand": "AgriSmart AI • Empowering Farmers with Accessible AI",
      "footer.notes": "Built for the Smart India Hackathon (SIH) • Designed for real farm conditions"
    }
  },

  keyAliases: {
    "nav.subtitle": "nav.brandSubtitle"
  },

  /**
   * Get translation for a key (English-only)
   */
  t(key, lang = "en") {
    const resolvedKey = this.keyAliases[key] || key;
    const enDict = this.translations.en || {};
    return enDict[resolvedKey] || enDict[key] || key;
  },

  /**
   * Applies English to all DOM elements with data-i18n attributes
   */
  applyLanguage(lang = "en") {
    // 1. Text content
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const translation = this.t(key, "en");
      if (translation && translation !== key) {
        el.textContent = translation;
      }
    });

    // 2. Input placeholders
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      const translation = this.t(key, "en");
      if (translation) {
        el.setAttribute("placeholder", translation);
      }
    });

    // 3. Titles / tooltips
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      const key = el.getAttribute("data-i18n-title");
      const translation = this.t(key, "en");
      if (translation) {
        el.setAttribute("title", translation);
      }
    });

    // 4. Update html lang attribute
    document.documentElement.lang = "en";
    try {
      localStorage.setItem("agrismart_lang_pref", "en");
    } catch (e) {}
  }
};

// Expose globally
window.AgriI18n = AgriI18n;
