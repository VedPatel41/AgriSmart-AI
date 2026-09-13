/**
 * AgriSmart AI - Smart Irrigation Decision Engine Component
 * Component: AgriIrrigationCard
 * 
 * Provides an explainable, rule-based irrigation advisory by evaluating
 * manual soil moisture measurements against live next-24h precipitation forecasts.
 * 
 * Rules:
 * - Rule 1: Rain probability > 60% -> "Delay irrigation"
 * - Rule 2: Soil moisture < 30% AND Rain probability < 30% -> "Irrigate now"
 * - Rule 3: Otherwise -> "Monitor"
 */
class AgriIrrigationCard {
  constructor() {
    this.container = document.getElementById("irrigation-module-container");
    this.activeRequestId = 0;
    this.lastCalculatedSoil = null;
    this.isCalculating = false;

    if (this.container) {
      this.init();
    }
  }

  init() {
    this.render();
    this.bindEvents();

    // Subscribe to shared state updates (e.g. when weather loads, update the rain forecast preview)
    if (window.AgriState) {
      window.AgriState.subscribe((state, changedKeys) => {
        if (changedKeys.includes("weatherData")) {
          this.updateWeatherForecastPreview();
        }
      });
    }
  }

  /**
   * Renders the interactive Smart Irrigation card layout
   */
  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="irrigation-page-wrapper">
        <div class="page-title-banner">
          <div>
            <h2 class="page-main-heading" data-i18n="irrigation.title">Smart Irrigation</h2>
            <p class="page-subheading" data-i18n="irrigation.subtitle">Make a watering decision using soil moisture and rainfall forecast.</p>
          </div>
        </div>

        <div class="irrigation-card-inner" role="region" aria-label="Smart Irrigation Advisory Module">
          
          <!-- Header -->
          <div class="irrigation-header">
            <div class="irrigation-title-wrap">
              <div class="weather-badge-row">
                <span class="module-icon" aria-hidden="true">💧</span>
                <span class="track-badge live-badge" data-i18n="module.irrigationBadge">Field Advisory</span>
              </div>
              <h3 class="irrigation-card-title">CURRENT CONDITIONS</h3>
            </div>
            <span class="irrigation-rule-tag">Transparent Rule Engine</span>
          </div>

          <!-- Honest Manual Input Notice (No Fake IoT/Sensor claims) -->
          <p class="irrigation-input-notice">
            <strong>Manual Soil Moisture Input:</strong> Enter your measured field moisture level (0% = dry, 100% = saturated).
          </p>

          <!-- Input Section -->
          <form class="irrigation-form" id="irrigation-form" novalidate>
            
            <div class="irrigation-field-row">
              <div class="irrigation-input-group">
                <label for="soil-moisture-input" class="irrigation-label" data-i18n="irrigation.moistureLabel">
                  Current Soil Moisture (manual)
                </label>
                <div class="irrigation-input-wrapper">
                  <input 
                    type="number" 
                    id="soil-moisture-input" 
                    class="irrigation-number-input" 
                    min="0" 
                    max="100" 
                    step="0.5" 
                    placeholder="Enter percentage (e.g. 25)" 
                    required
                    aria-describedby="soil-input-help"
                  />
                  <span class="input-unit-symbol" aria-hidden="true">%</span>
                </div>
                <span id="soil-input-help" class="input-sub-hint" data-i18n="irrigation.moistureHelp">Enter your measured soil moisture level between 0% and 100%</span>
              </div>

              <!-- Connected Next 24h Rain Indicator from Weather Module -->
              <div class="irrigation-forecast-preview">
                <span class="forecast-preview-label">Next 24h Rain Probability</span>
                <div class="forecast-preview-val-wrap">
                  <span class="forecast-preview-val" id="irrigation-rain-preview">
                    ${this.getConnectedRainDisplay()}
                  </span>
                  <span class="forecast-preview-sub" id="irrigation-loc-preview">
                    ${this.getConnectedLocationDisplay()}
                  </span>
                </div>
              </div>
            </div>

            <!-- Quick Preset Chips -->
            <div class="irrigation-presets-row" role="group" aria-label="Quick soil moisture presets">
              <span class="preset-label">Quick select:</span>
              <div class="preset-buttons-wrap">
                <button type="button" class="btn-preset-chip" data-val="15">15% (Very Dry)</button>
                <button type="button" class="btn-preset-chip" data-val="25">25% (Deficient)</button>
                <button type="button" class="btn-preset-chip" data-val="45">45% (Balanced)</button>
                <button type="button" class="btn-preset-chip" data-val="70">70% (Wet)</button>
              </div>
            </div>

            <!-- Action Button & Inline Validation Error -->
            <div class="irrigation-action-row">
              <button type="submit" class="btn btn-primary btn-calc-irrigation" id="btn-calc-irrigation">
                <span class="btn-text" data-i18n="irrigation.checkBtn">Check Irrigation</span>
              </button>
              <div class="irrigation-val-error" id="irrigation-val-error" role="alert" style="display: none;"></div>
            </div>

          </form>

          <!-- Dynamic Results Section -->
          <div class="irrigation-result-area" id="irrigation-result-area" aria-live="polite">
            <div class="irrigation-idle-placeholder">
              <span class="idle-icon" aria-hidden="true">🌱</span>
              <p class="idle-text">Enter soil moisture and click <strong>Check Irrigation</strong> to evaluate rainfall-balanced watering advice.</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="irrigation-card-footer">
            <span class="footer-note">Rule Criteria: Evaluates 30% soil moisture and 60% / 30% next-24h rain thresholds.</span>
          </div>

        </div>
      </div>
    `;
  }

  bindEvents() {
    if (!this.container) return;

    const form = this.container.querySelector("#irrigation-form");
    const soilInput = this.container.querySelector("#soil-moisture-input");
    const presetButtons = this.container.querySelectorAll(".btn-preset-chip");

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleCalculation();
      });
    }

    presetButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const val = btn.dataset.val;
        if (soilInput) {
          soilInput.value = val;
          soilInput.focus();
          this.clearError();
          this.handleInputChange();
        }
      });
    });

    if (soilInput) {
      soilInput.addEventListener("input", () => {
        this.clearError();
        this.handleInputChange();
      });
    }

    // Delegated click for Go to Weather button if weather is unavailable
    this.container.addEventListener("click", (e) => {
      if (e.target && e.target.closest("#btn-goto-weather")) {
        if (window.AgriNavigation) {
          AgriNavigation.navigateTo("weather");
        }
      }
      if (e.target && e.target.closest("#btn-ask-assistant-irrigation")) {
        if (window.AgriApp && window.AgriApp.assistantCard) {
          window.AgriApp.assistantCard.askQuestion("Why was this irrigation recommendation given?", true);
        } else if (window.AgriNavigation) {
          window.AgriNavigation.navigateTo("assistant");
        }
      }
    });
  }

  getWeatherState() {
    if (window.AgriState && window.AgriState.getState().weatherData) {
      return window.AgriState.getState().weatherData;
    }
    if (window.AgriApp && window.AgriApp.weatherCard && window.AgriApp.weatherCard.weatherData) {
      return window.AgriApp.weatherCard.weatherData;
    }
    return null;
  }

  getConnectedRainDisplay() {
    const wData = this.getWeatherState();
    if (wData && wData.forecast && wData.forecast.forecast_available && typeof wData.forecast.rain_probability_24h === "number") {
      return `🌧️ ${wData.forecast.rain_probability_24h}% Rain`;
    }
    return "Forecast pending";
  }

  getConnectedLocationDisplay() {
    const wData = this.getWeatherState();
    if (wData && wData.location && wData.location.name) {
      return `Location: ${wData.location.name}`;
    }
    const profile = window.AgriAuth ? AgriAuth.getFarmProfile() : {};
    return profile.district ? `Location: ${profile.district}` : "From Weather Module";
  }

  updateWeatherForecastPreview() {
    const rainEl = this.container ? this.container.querySelector("#irrigation-rain-preview") : null;
    const locEl = this.container ? this.container.querySelector("#irrigation-loc-preview") : null;
    if (rainEl) rainEl.textContent = this.getConnectedRainDisplay();
    if (locEl) locEl.textContent = this.getConnectedLocationDisplay();
  }

  handleInputChange() {
    const soilInput = this.container ? this.container.querySelector("#soil-moisture-input") : null;
    const resultArea = this.container ? this.container.querySelector("#irrigation-result-area") : null;
    if (!soilInput || !resultArea) return;

    const currentVal = parseFloat(soilInput.value);
    if (this.lastCalculatedSoil !== null && currentVal !== this.lastCalculatedSoil) {
      if (window.AgriState) {
        window.AgriState.invalidateIrrigation();
        window.AgriState.invalidateSustainability();
      }
      const activeCard = resultArea.querySelector(".irrigation-recommendation-box");
      if (activeCard) {
        activeCard.classList.add("outdated");
        let staleNotice = activeCard.querySelector(".stale-notice");
        if (!staleNotice) {
          staleNotice = document.createElement("div");
          staleNotice.className = "stale-notice";
          staleNotice.textContent = "⚠️ Input changed. Click 'Check Irrigation' to recalculate.";
          activeCard.prepend(staleNotice);
        }
      }
    }
  }

  /**
   * Performs client validation and dispatches calculation request
   */
  async handleCalculation() {
    const soilInput = this.container ? this.container.querySelector("#soil-moisture-input") : null;
    if (!soilInput) return;

    const rawVal = soilInput.value.trim();

    // 1. Strict Validation: reject empty, negative, > 100, non-numeric
    if (rawVal === "") {
      this.showError("Enter a soil moisture value between 0% and 100%.");
      soilInput.focus();
      return;
    }

    const numericVal = parseFloat(rawVal);
    if (isNaN(numericVal) || !isFinite(numericVal) || numericVal < 0 || numericVal > 100) {
      this.showError("Enter a soil moisture value between 0% and 100%.");
      soilInput.focus();
      return;
    }

    this.clearError();

    // 2. Prepare payload options (using live weather forecast)
    const options = {};
    const wData = this.getWeatherState();
    
    if (wData && wData.forecast && wData.forecast.forecast_available && typeof wData.forecast.rain_probability_24h === "number") {
      options.rain_probability = wData.forecast.rain_probability_24h;
      if (wData.location && wData.location.name) {
        options.city = wData.location.name;
      }
    } else {
      // Check farm profile location if weather forecast not pre-loaded
      const profile = window.AgriAuth ? AgriAuth.getFarmProfile() : {};
      if (profile.district || profile.state) {
        options.city = profile.district || profile.state;
      }
    }

    // 3. Stale Request & Loading State
    const thisRequestId = ++this.activeRequestId;
    this.setLoading(true);

    const result = await AgriApi.calculateIrrigation(numericVal, options);

    // Guard against race conditions
    if (thisRequestId !== this.activeRequestId) {
      return;
    }

    this.setLoading(false);

    if (result.success && result.data) {
      this.lastCalculatedSoil = numericVal;
      this.irrigationData = result.data;
      if (window.AgriState) {
        window.AgriState.setIrrigationData(result.data);
      }
      this.renderRecommendation(result.data);
    } else {
      if (window.AgriState) {
        window.AgriState.invalidateIrrigation();
      }
      const isWeatherErr = (result.code === "WEATHER_UNAVAILABLE" || (result.error && result.error.includes("weather")));
      this.renderError(
        result.error || "Unable to calculate irrigation advisory.",
        isWeatherErr
      );
    }
  }

  /**
   * Renders the recommendation outcome with transparent explanation
   */
  renderRecommendation(data) {
    const resultArea = this.container ? this.container.querySelector("#irrigation-result-area") : null;
    if (!resultArea) return;

    const recName = data.recommendation || "Monitor";
    const soilMoisture = typeof data.soil_moisture === "number" ? `${data.soil_moisture.toFixed(1)}%` : "N/A";
    const rainProb = typeof data.rain_probability_24h === "number" ? `${data.rain_probability_24h}%` : "N/A";

    let icon = "👀";
    let badgeClass = "badge-monitor";
    if (recName === "Irrigate now") {
      icon = "💧";
      badgeClass = "badge-irrigate";
    } else if (recName === "Delay irrigation") {
      icon = "🌧️";
      badgeClass = "badge-delay";
    }

    resultArea.innerHTML = `
      <div class="irrigation-recommendation-box ${badgeClass}">
        
        <div class="rec-header-row">
          <div class="rec-badge-wrap">
            <span class="rec-icon" aria-hidden="true">${icon}</span>
            <div class="rec-title-group">
              <span class="rec-sub-label" data-i18n="irrigation.recTitle">Recommendation:</span>
              <h3 class="rec-main-title">${this.escapeHtml(recName)}</h3>
            </div>
          </div>
          <span class="rec-action-pill">${this.escapeHtml(data.action || recName)}</span>
        </div>

        <!-- Metrics Evaluated -->
        <div class="rec-metrics-strip">
          <div class="rec-metric-cell">
            <span class="cell-label">Soil moisture:</span>
            <strong class="cell-value">${soilMoisture}</strong>
          </div>
          <div class="rec-metric-cell">
            <span class="cell-label">Next 24h rain probability:</span>
            <strong class="cell-value">${rainProb}</strong>
          </div>
          <div class="rec-metric-cell">
            <span class="cell-label">Location:</span>
            <strong class="cell-value">${this.escapeHtml(data.location || "Your Farm")}</strong>
          </div>
        </div>

        <!-- Transparent Decision Explanation -->
        <div class="rec-reason-block">
          <strong class="why-tag" data-i18n="irrigation.whyTitle">Why?</strong>
          <p class="rec-reason-text">${this.escapeHtml(data.reason)}</p>
        </div>

        <!-- Transparent Rules Matrix Explanation -->
        <div class="rec-rules-transparency-card">
          <h5 class="transparency-title" data-i18n="irrigation.rulesTitle">HOW THIS DECISION WAS MADE</h5>
          <ul class="rules-criteria-list">
            <li class="${recName === 'Delay irrigation' ? 'rule-matched' : ''}">
              <strong>Delay irrigation:</strong> If next-24h rain probability &gt; 60%
            </li>
            <li class="${recName === 'Irrigate now' ? 'rule-matched' : ''}">
              <strong>Irrigate now:</strong> If soil moisture &lt; 30% AND next-24h rain probability &lt; 30%
            </li>
            <li class="${recName === 'Monitor' ? 'rule-matched' : ''}">
              <strong>Monitor:</strong> Current conditions do not trigger immediate watering or delay thresholds
            </li>
          </ul>
        </div>

        <!-- Assistant Cross-Module CTA -->
        <div class="irrigation-assistant-cta" style="margin-top: var(--space-4); text-align: right;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-ask-assistant-irrigation">
            🤖 Ask AgriSmart
          </button>
        </div>

      </div>
    `;
  }

  /**
   * Renders error state in result area
   */
  renderError(errorMsg, isWeatherError = false) {
    const resultArea = this.container ? this.container.querySelector("#irrigation-result-area") : null;
    if (!resultArea) return;

    if (isWeatherError) {
      resultArea.innerHTML = `
        <div class="irrigation-error-box state-weather-needed" role="alert">
          <span class="err-icon" aria-hidden="true">🌧️</span>
          <div class="err-text-wrap">
            <h4 class="err-title">Irrigation recommendation unavailable</h4>
            <p class="err-desc">Live rainfall forecast is required to evaluate irrigation.</p>
            <div style="display: flex; gap: var(--space-2); margin-top: var(--space-3);">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-goto-weather">
                View Weather →
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      resultArea.innerHTML = `
        <div class="irrigation-error-box" role="alert">
          <span class="err-icon" aria-hidden="true">⚠️</span>
          <div class="err-text-wrap">
            <h4 class="err-title">Unable to calculate irrigation advice</h4>
            <p class="err-desc">${this.escapeHtml(errorMsg)}</p>
          </div>
        </div>
      `;
    }
  }

  showError(msg) {
    const errorEl = this.container ? this.container.querySelector("#irrigation-val-error") : null;
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = "block";
    }
  }

  clearError() {
    const errorEl = this.container ? this.container.querySelector("#irrigation-val-error") : null;
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.style.display = "none";
    }
  }

  setLoading(isLoading) {
    this.isCalculating = isLoading;
    const submitBtn = this.container ? this.container.querySelector("#btn-calc-irrigation") : null;
    const resultArea = this.container ? this.container.querySelector("#irrigation-result-area") : null;

    if (submitBtn) {
      if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="btn-spinner" aria-hidden="true">⏳</span> Checking irrigation conditions...`;
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span class="btn-text">Check Irrigation</span>`;
      }
    }

    if (isLoading && resultArea) {
      resultArea.innerHTML = `
        <div class="irrigation-loading-skeleton" aria-label="Checking irrigation conditions...">
          <div class="skeleton-box skeleton-rec-badge"></div>
          <div class="skeleton-box skeleton-rec-reason"></div>
        </div>
      `;
    }
  }

  escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

window.AgriIrrigationCard = AgriIrrigationCard;
