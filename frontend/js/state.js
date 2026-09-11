/**
 * AgriSmart AI - Centralized UI State Management
 * Observable single source of truth keeping UI, upload flow, disease predictions,
 * weather intelligence, irrigation decisions, and sustainability metrics synchronized.
 */
class AgriStateStore {
  constructor() {
    this.state = {
      uiState: AgriConfig.states.IDLE, // idle | selected | analyzing | success | error
      selectedFile: null,
      previewUrl: null,
      imageDimensions: null, // { width: number, height: number }
      predictionResult: null,
      errorMessage: null,
      isSubmitting: false, // Double-click submission protection
      backendStatus: "checking", // checking | connected | offline
      backendError: null,
      currentLanguage: "en",
      // Inter-module shared data domains
      weatherData: null,
      irrigationData: null,
      sustainabilityData: null
    };

    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(changedKeys = []) {
    for (const listener of this.listeners) {
      try {
        listener(this.state, changedKeys);
      } catch (err) {
        console.error("State listener error:", err);
      }
    }
  }

  setState(partialState) {
    const changedKeys = Object.keys(partialState);
    this.state = {
      ...this.state,
      ...partialState
    };
    this.notify(changedKeys);
  }

  // =========================================================================
  // State Action Helpers
  // =========================================================================

  setBackendStatus(status, error = null) {
    this.setState({
      backendStatus: status,
      backendError: error
    });
  }

  /**
   * Set validated image and revoke previous preview URL to prevent memory leaks
   */
  setFileSelected(file, previewUrl, dimensions = null) {
    if (this.state.previewUrl && this.state.previewUrl !== previewUrl) {
      try {
        URL.revokeObjectURL(this.state.previewUrl);
      } catch (e) {
        console.warn("Error revoking object URL:", e);
      }
    }

    this.setState({
      uiState: AgriConfig.states.SELECTED,
      selectedFile: file,
      previewUrl: previewUrl,
      imageDimensions: dimensions,
      predictionResult: null,
      errorMessage: null,
      isSubmitting: false
    });
  }

  /**
   * Cleans up selected file and revokes object URL
   */
  clearFile() {
    if (this.state.previewUrl) {
      try {
        URL.revokeObjectURL(this.state.previewUrl);
      } catch (e) {}
    }

    this.setState({
      uiState: AgriConfig.states.IDLE,
      selectedFile: null,
      previewUrl: null,
      imageDimensions: null,
      predictionResult: null,
      errorMessage: null,
      isSubmitting: false
    });
  }

  setAnalyzing() {
    this.setState({
      uiState: AgriConfig.states.ANALYZING,
      isSubmitting: true,
      errorMessage: null
    });
  }

  /**
   * Consumes verified prediction data from /predict
   * Prioritizes authoritative ICAR advisory returned by backend when available
   */
  setPredictionSuccess(resultData) {
    const rawLabel = resultData.classLabel;
    const raw = resultData.raw || {};
    const adv = raw.advisory || {};

    // Prioritize backend advisory details, with fallback to config knowledge base
    let formattedName = rawLabel.replace(/_/g, " ").replace(/^([A-Za-z]+)\s+/, "$1 — ");
    let severity = "Observation Recommended";
    let advice = AgriConfig.defaultPrecaution.advice;
    let organicCare = AgriConfig.defaultPrecaution.organicCare;

    if (adv && (adv.crop || adv.disease_name)) {
      formattedName = `${adv.crop || ""} — ${adv.disease_name || rawLabel}`.replace(/^—\s*/, "");
      severity = adv.severity || severity;
      advice = adv.prevention || adv.chemical_remedy || adv.symptoms || advice;
      organicCare = adv.organic_remedy || organicCare;
    } else if (AgriConfig.precautions[rawLabel]) {
      const info = AgriConfig.precautions[rawLabel];
      formattedName = info.name;
      severity = info.severity;
      advice = info.advice;
      organicCare = info.organicCare;
    }

    const formattedResult = {
      rawLabel: rawLabel,
      formattedName: formattedName,
      confidence: resultData.confidence,
      confidencePercentage: Math.round(resultData.confidence * 100),
      severity: severity,
      advice: advice,
      organicCare: organicCare,
      raw: raw
    };

    this.setState({
      uiState: AgriConfig.states.SUCCESS,
      predictionResult: formattedResult,
      isSubmitting: false,
      errorMessage: null
    });
  }

  setError(errorMessage) {
    this.setState({
      uiState: AgriConfig.states.ERROR,
      errorMessage: errorMessage,
      isSubmitting: false
    });
  }

  /**
   * Reset the crop analysis flow cleanly for "Check Another Crop"
   * Clears image and diagnosis without losing language or active weather/irrigation settings
   */
  resetForNewCrop() {
    this.clearFile();
  }

  setLanguage(langCode) {
    this.setState({
      currentLanguage: langCode
    });
  }

  // =========================================================================
  // Shared Module State Dispatchers
  // =========================================================================

  setWeatherData(data) {
    this.setState({
      weatherData: data
    });
  }

  setIrrigationData(data) {
    this.setState({
      irrigationData: data
    });
  }

  setSustainabilityData(data) {
    this.setState({
      sustainabilityData: data
    });
  }

  invalidateIrrigation() {
    this.setState({
      irrigationData: null
    });
  }

  invalidateSustainability() {
    this.setState({
      sustainabilityData: null
    });
  }
}

// Single shared instance
window.AgriState = new AgriStateStore();
