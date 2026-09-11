/**
 * AgriSmart AI - Farm Sustainability & Water Efficiency Score Component
 * Component: AgriSustainabilityCard
 * 
 * Production-ready stewardship indicator evaluating water conservation
 * and weather adaptation based on real application inputs.
 * 
 * Weights:
 * - Water Efficiency & Stewardship: 60%
 * - Micro-Climate & Disease Adaptation: 40%
 */
class AgriSustainabilityCard {
  constructor() {
    this.container = document.getElementById("sustainability-module-container");
    this.activeRequestId = 0;
    this.sustainabilityData = null;
    this.isEvaluating = false;

    if (this.container) {
      this.init();
    }
  }

  init() {
    this.render();
    this.bindEvents();

    if (window.AgriState) {
      window.AgriState.subscribe((state, changedKeys) => {
        if (changedKeys.includes("sustainabilityData") && state.sustainabilityData === null) {
          const contentArea = this.container ? this.container.querySelector("#sustainability-content-area") : null;
          if (contentArea && this.sustainabilityData) {
            this.sustainabilityData = null;
            contentArea.innerHTML = this.renderIdleState();
          }
        }
      });
    }
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="sustainability-page-wrapper">
        <div class="page-title-banner">
          <div>
            <h2 class="page-main-heading" data-i18n="sustainability.title">Farm Sustainability & Stewardship</h2>
            <p class="page-subheading" data-i18n="sustainability.subtitle">Understand the sustainability and water efficiency indicators for your farm.</p>
          </div>
        </div>

        <div class="sustainability-card-inner" role="region" aria-label="Farm Sustainability and Water Efficiency Score">
          
          <!-- Header -->
          <div class="sustainability-header">
            <div class="sustainability-title-wrap">
              <div class="weather-badge-row">
                <span class="module-icon" aria-hidden="true">♻️</span>
                <span class="track-badge live-badge" data-i18n="module.sustainabilityBadge">Stewardship Indicator</span>
              </div>
              <h3 class="sustainability-card-title" data-i18n="sustainability.scoreTitle">OVERALL STEWARDSHIP SCORE</h3>
            </div>
            <button type="button" class="btn btn-secondary btn-sm btn-sustainability-refresh" id="btn-sustainability-refresh" aria-label="Recalculate sustainability score" title="Recalculate score">
              <span class="refresh-icon" aria-hidden="true">↻</span>
              <span>Recalculate</span>
            </button>
          </div>

          <!-- Notice -->
          <p class="sustainability-notice">
            <strong>Stewardship Assessment:</strong> Objective evaluation based on your field soil moisture and 24-hour rainfall forecast alignment.
          </p>

          <!-- Dynamic Content Area -->
          <div class="sustainability-content-area" id="sustainability-content-area" aria-live="polite">
            ${this.renderIdleState()}
          </div>

          <!-- Card Footer -->
          <div class="sustainability-card-footer">
            <span class="footer-note">Metric Weights: 60% Water Efficiency • 40% Weather Adaptation</span>
          </div>

        </div>
      </div>
    `;
  }

  bindEvents() {
    if (!this.container) return;

    const refreshBtn = this.container.querySelector("#btn-sustainability-refresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this.evaluateSustainability();
      });
    }

    this.container.addEventListener("click", (e) => {
      if (e.target && e.target.closest("#btn-eval-sustainability")) {
        this.evaluateSustainability();
      }
      if (e.target && e.target.closest("#btn-goto-irrigation")) {
        if (window.AgriNavigation) {
          AgriNavigation.navigateTo("irrigation");
        }
      }
      if (e.target && e.target.closest("#btn-ask-assistant-sustainability")) {
        if (window.AgriApp && window.AgriApp.assistantCard) {
          window.AgriApp.assistantCard.askQuestion("How can I improve my sustainability indicator?", true);
        } else if (window.AgriNavigation) {
          window.AgriNavigation.navigateTo("assistant");
        }
      }
    });
  }

  renderIdleState() {
    return `
      <div class="sustainability-idle-box">
        <span class="idle-eco-icon" aria-hidden="true">📊</span>
        <div class="idle-eco-text">
          <h4 class="idle-eco-title">Calculate Sustainability Indicator</h4>
          <p class="idle-eco-desc">Combines your field soil moisture, irrigation schedule, and 24-hour rainfall forecast to evaluate water efficiency.</p>
          <button type="button" class="btn btn-primary btn-sm" id="btn-eval-sustainability">
            Calculate Sustainability Score →
          </button>
        </div>
      </div>
    `;
  }

  renderLoadingState() {
    return `
      <div class="sustainability-loading-wrap" aria-label="Calculating sustainability indicator...">
        <div class="skeleton-box skeleton-score-gauge"></div>
        <div class="skeleton-box skeleton-breakdown"></div>
        <div class="skeleton-box skeleton-reasons"></div>
        <p class="loading-label-text">Calculating indicator...</p>
      </div>
    `;
  }

  renderSuccessState(data) {
    const score = data.score !== undefined ? data.score : 0;
    const rating = data.rating || "Good";
    const breakdown = data.breakdown || {};
    const waterScore = breakdown.water_efficiency !== undefined ? breakdown.water_efficiency : 0;
    const weatherScore = breakdown.weather_adaptation !== undefined ? breakdown.weather_adaptation : 0;
    const reasons = data.reasons || [];
    const suggestion = data.suggestion || "";

    let badgeClass = "badge-good";
    if (rating === "Excellent") badgeClass = "badge-excellent";
    else if (rating === "Fair") badgeClass = "badge-fair";
    else if (rating === "Needs Improvement") badgeClass = "badge-improvement";

    return `
      <div class="sustainability-success-card">
        
        <!-- Score Hero Display -->
        <div class="sustainability-score-row">
          <div class="score-circle-wrap">
            <div class="score-number-display">
              <span class="score-value">${score}</span>
              <span class="score-max">/ 100</span>
            </div>
          </div>

          <div class="score-meta-group">
            <span class="score-meta-label">Status Rating:</span>
            <div class="score-rating-pill ${badgeClass}">
              <strong>${this.escapeHtml(rating)}</strong>
            </div>
            <span class="score-indicator-type">Rule-Based Stewardship Score</span>
          </div>
        </div>

        <!-- Indicators Breakdown (Actual Dimensions Supported by Backend) -->
        <div class="sustainability-breakdown-section">
          <h5 class="breakdown-title">INDICATORS</h5>
          
          <div class="breakdown-bar-item">
            <div class="bar-header">
              <span class="bar-label" data-i18n="sustainability.waterEff">Water efficiency (60% weight)</span>
              <span class="bar-val"><strong>${waterScore}</strong> / 100</span>
            </div>
            <div class="progress-track" role="progressbar" aria-valuenow="${waterScore}" aria-valuemin="0" aria-valuemax="100">
              <div class="progress-fill fill-water" style="width: ${waterScore}%;"></div>
            </div>
          </div>

          <div class="breakdown-bar-item">
            <div class="bar-header">
              <span class="bar-label" data-i18n="sustainability.weatherAdapt">Micro-climate adaptation (40% weight)</span>
              <span class="bar-val"><strong>${weatherScore}</strong> / 100</span>
            </div>
            <div class="progress-track" role="progressbar" aria-valuenow="${weatherScore}" aria-valuemin="0" aria-valuemax="100">
              <div class="progress-fill fill-weather" style="width: ${weatherScore}%;"></div>
            </div>
          </div>
        </div>

        <!-- Areas to Improve / Actionable Field Guidance -->
        ${suggestion ? `
          <div class="sustainability-suggestion-box">
            <div class="sugg-header">
              <span class="sugg-icon" aria-hidden="true">💡</span>
              <strong data-i18n="sustainability.suggestion">AREAS TO IMPROVE & GUIDANCE:</strong>
            </div>
            <p class="sugg-text">${this.escapeHtml(suggestion)}</p>
          </div>
        ` : ""}

        <!-- Contributing Factors -->
        <div class="sustainability-reasons-box">
          <strong class="reasons-heading" data-i18n="sustainability.factors">Contributing Factors:</strong>
          <ul class="reasons-list">
            ${reasons.map(r => `<li>${this.escapeHtml(r)}</li>`).join("")}
          </ul>
        </div>

        <!-- Assistant Cross-Module CTA -->
        <div class="sustainability-assistant-cta" style="margin-top: var(--space-4); text-align: right;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-ask-assistant-sustainability">
            🤖 Explain My Score (AI Companion)
          </button>
        </div>

      </div>
    `;
  }

  renderErrorState(msg) {
    return `
      <div class="sustainability-error-box" role="alert">
        <span class="err-icon" aria-hidden="true">⚠️</span>
        <div class="err-text-wrap">
          <h4 class="err-title">We couldn't load sustainability information</h4>
          <p class="err-desc">${this.escapeHtml(msg)}</p>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-eval-sustainability">
            Try Again
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Pulls real active parameters from weather and irrigation modules
   */
  async evaluateSustainability() {
    const contentArea = this.container ? this.container.querySelector("#sustainability-content-area") : null;
    const refreshBtn = this.container ? this.container.querySelector("#btn-sustainability-refresh") : null;

    // 1. Gather available inputs from state and DOM
    let soilMoisture = null;
    let rainProbability = null;
    let recommendation = null;
    let diseaseRisk = null;
    let city = null;

    // Check irrigation input or active state
    const soilInput = document.getElementById("soil-moisture-input");
    if (soilInput && soilInput.value.trim() !== "") {
      const parsed = parseFloat(soilInput.value);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        soilMoisture = parsed;
      }
    } else if (window.AgriState && window.AgriState.getState().irrigationData) {
      const irrData = window.AgriState.getState().irrigationData;
      soilMoisture = irrData.soil_moisture;
      recommendation = irrData.recommendation;
    }

    // Check live weather state
    const wData = (window.AgriState && window.AgriState.getState().weatherData) || 
                  (window.AgriApp && window.AgriApp.weatherCard && window.AgriApp.weatherCard.weatherData);
    if (wData) {
      city = wData.location ? wData.location.name : null;
      if (wData.forecast && wData.forecast.forecast_available) {
        rainProbability = wData.forecast.rain_probability_24h;
      }
      if (wData.risk && wData.risk.level) {
        diseaseRisk = wData.risk.level;
      }
    }

    // Farm profile fallback for city
    if (!city && window.AgriAuth) {
      const profile = AgriAuth.getFarmProfile();
      city = profile.district || profile.state || "Ahmedabad";
    }

    // Honest missing-data check: If farmer has not entered soil moisture yet
    if (soilMoisture === null) {
      if (contentArea) {
        contentArea.innerHTML = `
          <div class="sustainability-empty-state" role="status">
            <span class="empty-icon" aria-hidden="true">🌱</span>
            <div class="empty-text-wrap">
              <h4>Complete your farm information to calculate this indicator.</h4>
              <p>Soil moisture input is required to evaluate water efficiency. Please enter your soil moisture in Smart Irrigation.</p>
              <button type="button" class="btn btn-primary btn-sm" id="btn-goto-irrigation">
                Enter Soil Moisture in Smart Irrigation →
              </button>
            </div>
          </div>
        `;
      }
      return;
    }

    const payload = {
      soil_moisture: soilMoisture,
      rain_probability: rainProbability,
      recommendation: recommendation,
      disease_risk: diseaseRisk,
      city: city || "Ahmedabad"
    };

    const thisRequestId = ++this.activeRequestId;
    this.isEvaluating = true;
    if (refreshBtn) {
      const icon = refreshBtn.querySelector(".refresh-icon");
      if (icon) icon.classList.add("spinning");
    }
    if (contentArea) contentArea.innerHTML = this.renderLoadingState();

    const res = await AgriApi.calculateSustainability(payload);

    if (thisRequestId !== this.activeRequestId) return;

    this.isEvaluating = false;
    if (refreshBtn) {
      const icon = refreshBtn.querySelector(".refresh-icon");
      if (icon) icon.classList.remove("spinning");
    }

    if (res.success && res.data) {
      this.sustainabilityData = res.data;
      if (window.AgriState) {
        window.AgriState.setSustainabilityData(res.data);
      }
      if (contentArea) contentArea.innerHTML = this.renderSuccessState(res.data);
    } else {
      if (window.AgriState) {
        window.AgriState.invalidateSustainability();
      }
      if (contentArea) {
        contentArea.innerHTML = this.renderErrorState(
          res.error || "We couldn't load sustainability information."
        );
      }
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

window.AgriSustainabilityCard = AgriSustainabilityCard;
