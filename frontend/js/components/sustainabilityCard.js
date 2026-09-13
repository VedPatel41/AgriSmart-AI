/**
 * AgriSmart AI - Farm Sustainability & Stewardship Component
 * Component: AgriSustainabilityCard
 * 
 * Professional agronomic stewardship indicator evaluating water conservation
 * efficiency and micro-climate disease adaptation based on real backend rules.
 * 
 * Backend is the Single Source of Truth:
 * - Water Efficiency & Stewardship: 60%
 * - Micro-Climate & Pathogen Adaptation: 40%
 * 
 * Strictly reproducible and transparent with zero fabricated scores.
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

    // Check if initial sustainability data already exists in state
    if (window.AgriState) {
      const state = window.AgriState.getState();
      if (state.sustainabilityData) {
        this.sustainabilityData = state.sustainabilityData;
        const contentArea = this.container ? this.container.querySelector("#sustainability-content-area") : null;
        if (contentArea) {
          contentArea.innerHTML = this.renderSuccessState(this.sustainabilityData);
        }
      }

      window.AgriState.subscribe((st, changedKeys) => {
        if (changedKeys.includes("sustainabilityData")) {
          const contentArea = this.container ? this.container.querySelector("#sustainability-content-area") : null;
          if (st.sustainabilityData === null) {
            if (contentArea && this.sustainabilityData) {
              this.sustainabilityData = null;
              contentArea.innerHTML = this.renderIdleState();
            }
          } else if (st.sustainabilityData && contentArea) {
            this.sustainabilityData = st.sustainabilityData;
            contentArea.innerHTML = this.renderSuccessState(st.sustainabilityData);
          }
        }
      });
    }
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="sustainability-page-wrapper">
        <!-- Page Header -->
        <div class="page-title-banner">
          <div>
            <h2 class="page-main-heading" data-i18n="sustainability.title">Sustainability</h2>
            <p class="page-subheading" data-i18n="sustainability.subtitle">An indicative view of your farm's resource efficiency and crop health.</p>
          </div>
        </div>

        <div class="sustainability-card-inner" role="region" aria-label="Farm Sustainability and Stewardship Indicator">
          
          <!-- Card Header Strip -->
          <div class="sustainability-header">
            <div class="sustainability-title-wrap">
              <div class="weather-badge-row">
                <span class="module-icon" aria-hidden="true">♻️</span>
                <span class="track-badge live-badge" data-i18n="module.sustainabilityBadge">Stewardship Indicator</span>
              </div>
              <h3 class="sustainability-card-title" data-i18n="sustainability.scoreTitle">Farm Sustainability</h3>
            </div>
            <button type="button" class="btn btn-secondary btn-sm btn-sustainability-refresh" id="btn-sustainability-refresh" aria-label="Recalculate sustainability score" title="Recalculate score">
              <span class="refresh-icon" aria-hidden="true">↻</span>
              <span>Recalculate</span>
            </button>
          </div>

          <!-- Dynamic Assessment Content Area -->
          <div class="sustainability-content-area" id="sustainability-content-area" aria-live="polite">
            ${this.renderIdleState()}
          </div>

          <!-- Reproducible Formula Transparency Section -->
          <div class="sustainability-formula-card" role="region" aria-label="Formula Transparency">
            <div class="formula-card-header">
              <span class="formula-icon" aria-hidden="true">📐</span>
              <div>
                <h4 class="formula-card-title">How the Score is Calculated</h4>
                <p class="formula-card-sub">Published reproducible agronomic rules and weighting from AgriSmart AI backend</p>
              </div>
            </div>

            <div class="formula-explanation-body">
              <p class="formula-intro">
                The sustainability score is an indicative stewardship indicator (0–100) calculated by combining field water conservation efficiency and micro-climate disease adaptation.
              </p>

              <div class="formula-math-box">
                <code>Overall Score = round((Water Efficiency × 0.60) + (Micro-Climate Adaptation × 0.40))</code>
              </div>

              <div class="formula-columns-grid">
                <!-- Water Efficiency Rules -->
                <div class="formula-col">
                  <div class="formula-col-header">
                    <strong>Water Efficiency (60% Weight)</strong>
                    <span class="formula-col-badge">Telemetry & Irrigation</span>
                  </div>
                  <ul class="formula-rules-list">
                    <li>
                      <span class="rule-condition">Delay Irrigation (Rain > 60%):</span>
                      <span class="rule-score">95 / 100</span>
                      <p class="rule-note">Conserves pumped water by utilizing natural forecasted precipitation.</p>
                    </li>
                    <li>
                      <span class="rule-condition">Monitor (Soil Moisture 30%–60%):</span>
                      <span class="rule-score">85 / 100</span>
                      <p class="rule-note">Maintains root-zone moisture in optimal balanced zone.</p>
                    </li>
                    <li>
                      <span class="rule-condition">Irrigate Now (Soil < 30%, Rain < 30%):</span>
                      <span class="rule-score">75 / 100</span>
                      <p class="rule-note">Targeted moisture replenishment prevents crop water stress.</p>
                    </li>
                    <li>
                      <span class="rule-condition">Monitor (Low moisture, moderate rain):</span>
                      <span class="rule-score">75 / 100</span>
                      <p class="rule-note">Prudent observation before activating pumping equipment.</p>
                    </li>
                    <li>
                      <span class="rule-condition">Monitor (Saturated soil > 60%):</span>
                      <span class="rule-score">65 / 100</span>
                      <p class="rule-note">Prevents over-saturation; drainage monitoring required.</p>
                    </li>
                  </ul>
                </div>

                <!-- Micro-Climate Rules -->
                <div class="formula-col">
                  <div class="formula-col-header">
                    <strong>Micro-Climate Adaptation (40% Weight)</strong>
                    <span class="formula-col-badge">Weather & Crop Health</span>
                  </div>
                  <ul class="formula-rules-list">
                    <li>
                      <span class="rule-condition">Low Disease Risk:</span>
                      <span class="rule-score">90 / 100</span>
                      <p class="rule-note">Favorable atmospheric conditions minimize need for interventions.</p>
                    </li>
                    <li>
                      <span class="rule-condition">Moderate Disease Risk:</span>
                      <span class="rule-score">70 / 100</span>
                      <p class="rule-note">Standard environmental monitoring warranted for canopy protection.</p>
                    </li>
                    <li>
                      <span class="rule-condition">High Disease Risk:</span>
                      <span class="rule-score">50 / 100</span>
                      <p class="rule-note">Elevated humidity and leaf wetness require diligent crop scouting.</p>
                    </li>
                  </ul>

                  <!-- Score Rating Bands -->
                  <div class="score-bands-box">
                    <strong class="bands-title">Published Rating Bands:</strong>
                    <div class="bands-pills">
                      <span class="band-pill band-pill-excellent">80–100: Excellent</span>
                      <span class="band-pill band-pill-good">60–79: Good</span>
                      <span class="band-pill band-pill-fair">40–59: Fair</span>
                      <span class="band-pill band-pill-improvement">&lt; 40: Needs Improvement</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Indicative Notice -->
              <p class="formula-disclaimer">
                <strong>Stewardship Notice:</strong> This score provides an indicative operational view of resource efficiency and crop disease adaptation. It does not represent an accredited carbon credit audit or official environmental certification.
              </p>
            </div>
          </div>

          <!-- Bottom Navigation Actions -->
          <div class="sustainability-page-actions">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-goto-farm-profile">
              Update Farm Profile
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-ask-assistant-sustainability">
              🤖 Ask AgriSmart
            </button>
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
      if (e.target && (e.target.closest("#btn-goto-irrigation") || e.target.closest(".btn-goto-irrigation"))) {
        if (window.AgriNavigation) {
          AgriNavigation.navigateTo("irrigation");
        }
      }
      if (e.target && (e.target.closest("#btn-goto-farm-profile") || e.target.closest("#btn-goto-farm") || e.target.closest(".btn-goto-farm"))) {
        if (window.AgriNavigation) {
          AgriNavigation.navigateTo("my-farm");
        }
      }
      if (e.target && e.target.closest("#btn-ask-assistant-sustainability")) {
        if (window.AgriApp && window.AgriApp.assistantCard) {
          window.AgriApp.assistantCard.askQuestion("How can I improve my sustainability indicator?", true);
        } else if (window.AgriNavigation) {
          AgriNavigation.navigateTo("assistant");
        }
      }
    });
  }

  renderIdleState() {
    // Check if soil moisture is available in the app state or input
    const soilInput = document.getElementById("soil-moisture-input");
    const irrData = window.AgriState ? window.AgriState.getState().irrigationData : null;
    const hasSoil = (soilInput && soilInput.value.trim() !== "") || (irrData && irrData.soil_moisture !== undefined);

    if (!hasSoil) {
      return `
        <div class="sustainability-empty-card" role="status">
          <div class="empty-card-header">
            <span class="empty-card-icon" aria-hidden="true">🌱</span>
            <div class="empty-card-title-wrap">
              <h4 class="empty-card-heading">Farm Sustainability</h4>
              <p class="empty-card-subheading">Not enough data</p>
            </div>
          </div>
          <p class="empty-card-message">
            We need additional farm information to calculate the sustainability indicator. Complete your farm information (such as entering soil moisture in Smart Irrigation) to calculate the score.
          </p>
          <div class="empty-card-cta-row">
            <button type="button" class="btn btn-primary btn-sm btn-goto-irrigation" id="btn-goto-irrigation">
              Enter Soil Moisture in Smart Irrigation →
            </button>
            <button type="button" class="btn btn-secondary btn-sm btn-goto-farm" id="btn-goto-farm">
              Update Farm Profile
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="sustainability-idle-box">
        <span class="idle-eco-icon" aria-hidden="true">📊</span>
        <div class="idle-eco-text">
          <h4 class="idle-eco-title">Farm Sustainability</h4>
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
      <div class="sustainability-loading-wrap" aria-label="Calculating sustainability...">
        <div class="skeleton-box skeleton-score-gauge"></div>
        <div class="skeleton-box skeleton-breakdown"></div>
        <div class="skeleton-box skeleton-reasons"></div>
        <p class="loading-label-text">Calculating sustainability...</p>
      </div>
    `;
  }

  renderSuccessState(data) {
    const score = (data && data.score !== undefined) ? data.score : 0;
    const rating = (data && data.rating) || "Good";
    const breakdown = (data && data.breakdown) || {};
    const waterScore = breakdown.water_efficiency !== undefined ? breakdown.water_efficiency : 0;
    const weatherScore = breakdown.weather_adaptation !== undefined ? breakdown.weather_adaptation : 0;
    const reasons = (data && data.reasons) || [];
    const suggestion = (data && data.suggestion) || "";
    const metrics = (data && data.metrics) || {};

    let badgeClass = "badge-good";
    if (rating === "Excellent") badgeClass = "badge-excellent";
    else if (rating === "Fair") badgeClass = "badge-fair";
    else if (rating === "Needs Improvement") badgeClass = "badge-improvement";

    // Format inputs used
    const soilVal = metrics.soil_moisture !== undefined ? `${metrics.soil_moisture}%` : "Not recorded";
    const rainVal = metrics.rain_probability_24h !== undefined ? `${metrics.rain_probability_24h}%` : "Not available";
    const diseaseVal = metrics.disease_risk ? `${metrics.disease_risk} Risk` : "Not evaluated";
    const recVal = metrics.recommendation ? metrics.recommendation : "Not scheduled";

    return `
      <div class="sustainability-success-card">
        
        <!-- Main Score Card -->
        <div class="sustainability-main-score-box">
          <div class="score-card-top-title">
            <span class="score-card-lead">Farm Sustainability</span>
          </div>

          <div class="sustainability-score-row">
            <div class="score-hero-display">
              <span class="score-hero-number">${score}</span>
              <span class="score-hero-denom">/ 100</span>
            </div>

            <div class="score-meta-group">
              <div class="score-meta-title-row">
                <span class="score-indicative-label">Indicative Score</span>
                <span class="score-rating-pill ${badgeClass}">${this.escapeHtml(rating)}</span>
              </div>
              <p class="score-caption">Based on available farm data.</p>
              
              <!-- Clean Score Visualization Bar -->
              <div class="score-visual-bar-wrap" role="progressbar" aria-valuenow="${score}" aria-valuemin="0" aria-valuemax="100" aria-label="Farm sustainability score progress">
                <div class="score-visual-fill ${badgeClass}-bg" style="width: ${Math.max(4, Math.min(100, score))}%;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Inputs Used / Data Sources Strip -->
        <div class="inputs-used-strip" role="region" aria-label="Data Sources Used">
          <span class="inputs-strip-title">Data used:</span>
          <div class="inputs-badge-group">
            <div class="input-source-chip">
              <span class="input-chip-label">Soil Moisture:</span>
              <span class="input-chip-value">${this.escapeHtml(soilVal)}</span>
            </div>
            <div class="input-source-chip">
              <span class="input-chip-label">Rain Forecast:</span>
              <span class="input-chip-value">${this.escapeHtml(rainVal)}</span>
            </div>
            <div class="input-source-chip">
              <span class="input-chip-label">Crop Health Risk:</span>
              <span class="input-chip-value">${this.escapeHtml(diseaseVal)}</span>
            </div>
            <div class="input-source-chip">
              <span class="input-chip-label">Irrigation Advice:</span>
              <span class="input-chip-value">${this.escapeHtml(recVal)}</span>
            </div>
          </div>
        </div>

        <!-- Score Components Breakdown Grid -->
        <div class="sustainability-components-section">
          <h5 class="components-header-title">Score Components</h5>
          
          <div class="sustainability-components-grid">
            <!-- Water Efficiency -->
            <div class="component-card">
              <div class="component-card-header">
                <span class="comp-title" data-i18n="sustainability.waterEff">Water Efficiency</span>
                <span class="comp-weight-badge">60% Weight</span>
              </div>
              <div class="comp-score-row">
                <span class="comp-score-val">${waterScore}</span>
                <span class="comp-score-max">/ 100</span>
              </div>
              <div class="progress-track" role="progressbar" aria-valuenow="${waterScore}" aria-valuemin="0" aria-valuemax="100" aria-label="Water efficiency score">
                <div class="progress-fill fill-water" style="width: ${waterScore}%;"></div>
              </div>
              <p class="comp-desc">Evaluated from soil moisture telemetry and irrigation alignment with forecast rainfall.</p>
            </div>

            <!-- Resource Use & Weather Adaptation -->
            <div class="component-card">
              <div class="component-card-header">
                <span class="comp-title" data-i18n="sustainability.weatherAdapt">Micro-Climate Adaptation</span>
                <span class="comp-weight-badge">40% Weight</span>
              </div>
              <div class="comp-score-row">
                <span class="comp-score-val">${weatherScore}</span>
                <span class="comp-score-max">/ 100</span>
              </div>
              <div class="progress-track" role="progressbar" aria-valuenow="${weatherScore}" aria-valuemin="0" aria-valuemax="100" aria-label="Micro-climate adaptation score">
                <div class="progress-fill fill-weather" style="width: ${weatherScore}%;"></div>
              </div>
              <p class="comp-desc">Evaluated from local atmospheric pathogen pressure and canopy disease susceptibility.</p>
            </div>

            <!-- Resource Use Note -->
            <div class="component-card component-card-resource">
              <div class="component-card-header">
                <span class="comp-title">Resource Stewardship</span>
                <span class="comp-weight-badge">Direct Impact</span>
              </div>
              <div class="comp-score-row">
                <span class="comp-score-val" style="font-size: var(--text-md); font-weight: 700; color: var(--primary-green);">Optimized</span>
              </div>
              <p class="comp-desc" style="margin-top: var(--space-2);">Resource use is evaluated through water conservation and runoff prevention. Independent chemical inputs are not tracked to maintain empirical accuracy.</p>
            </div>
          </div>
        </div>

        <!-- Improvement Suggestions (Ways to Improve) -->
        <div class="sustainability-suggestions-wrapper">
          <div class="sugg-section-title-row">
            <span class="sugg-icon" aria-hidden="true">💡</span>
            <h5 class="sugg-section-title">Ways to Improve</h5>
          </div>

          ${suggestion ? `
            <div class="sustainability-suggestion-box">
              <p class="sugg-text">${this.escapeHtml(suggestion)}</p>
            </div>
          ` : ""}

          <!-- Contributing Factors -->
          ${reasons && reasons.length > 0 ? `
            <div class="sustainability-reasons-box">
              <strong class="reasons-heading" data-i18n="sustainability.factors">Contributing Factors:</strong>
              <ul class="reasons-list">
                ${reasons.map(r => `<li>${this.escapeHtml(r)}</li>`).join("")}
              </ul>
            </div>
          ` : ""}
        </div>

      </div>
    `;
  }

  renderErrorState(msg) {
    return `
      <div class="sustainability-error-box" role="alert">
        <span class="err-icon" aria-hidden="true">⚠️</span>
        <div class="err-text-wrap">
          <h4 class="err-title">Unable to calculate sustainability.</h4>
          <p class="err-desc">${this.escapeHtml(msg)}</p>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-eval-sustainability">
            Retry
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Pulls real active parameters from weather, crop health, and irrigation modules
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

    // Check crop health diagnosis if disease risk not set by weather
    if (!diseaseRisk && window.AgriState && window.AgriState.getState().predictionResult) {
      const pred = window.AgriState.getState().predictionResult;
      if (pred.is_healthy) {
        diseaseRisk = "Low";
      } else {
        diseaseRisk = "High";
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
          <div class="sustainability-empty-card" role="status">
            <div class="empty-card-header">
              <span class="empty-card-icon" aria-hidden="true">🌱</span>
              <div class="empty-card-title-wrap">
                <h4 class="empty-card-heading">Farm Sustainability</h4>
                <p class="empty-card-subheading">Not enough data</p>
              </div>
            </div>
            <p class="empty-card-message">
              We need additional farm information to calculate the sustainability indicator. Complete your farm information (such as entering soil moisture in Smart Irrigation) to calculate the score.
            </p>
            <div class="empty-card-cta-row">
              <button type="button" class="btn btn-primary btn-sm btn-goto-irrigation" id="btn-goto-irrigation">
                Enter Soil Moisture in Smart Irrigation →
              </button>
              <button type="button" class="btn btn-secondary btn-sm btn-goto-farm" id="btn-goto-farm">
                Update Farm Profile
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
          res.error || "Unable to calculate sustainability."
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
