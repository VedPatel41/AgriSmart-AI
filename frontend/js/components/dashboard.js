/**
 * AgriSmart AI - Farmer Dashboard Controller
 * Connects the farmer workspace with real farm profile state,
 * active crop health status, Smart Farming summary modules,
 * and live session analysis history.
 * Strictly free of fabricated metrics.
 */
const AgriDashboard = {
  init() {
    this.cacheDom();
    this.bindEvents();
    this.render();

    // Subscribe to Auth and History updates
    if (window.AgriAuth) {
      AgriAuth.subscribe(() => {
        this.renderGreeting();
        this.renderFarmSummary();
        this.renderSmartFarmingSummary();
      });
    }
    if (window.AgriHistory) {
      AgriHistory.subscribe(() => {
        this.renderLatestStatus();
        this.renderSmartFarmingSummary();
      });
    }
    if (window.AgriState) {
      AgriState.subscribe((state, changedKeys) => {
        if (changedKeys.some(k => ["weatherData", "irrigationData", "sustainabilityData"].includes(k))) {
          this.renderSmartFarmingSummary();
        }
      });
    }
  },

  cacheDom() {
    this.greetingEl = document.getElementById("overview-welcome-farmer");
    this.farmMetaLine = document.getElementById("dash-farm-meta-line");
    this.cropSnapshotEl = document.getElementById("dash-snap-crop");
    this.locSnapshotEl = document.getElementById("dash-snap-loc");
    this.healthSnapshotEl = document.getElementById("dash-snap-health");

    // Crop Health Hero Card body
    this.cropHeroBody = document.getElementById("dash-crop-hero-body");

    // My Farm summary fields
    this.farmCropEl = document.getElementById("dash-farm-crop");
    this.farmStageEl = document.getElementById("dash-farm-stage");
    this.farmSoilEl = document.getElementById("dash-farm-soil");
    this.farmLocEl = document.getElementById("dash-farm-loc");
    this.farmSizeEl = document.getElementById("dash-farm-size");

    // Smart Farming summary cards
    this.dashWeatherTemp = document.getElementById("dash-weather-temp");
    this.dashWeatherSummary = document.getElementById("dash-weather-summary");
    this.dashWeatherBadge = document.getElementById("dash-weather-badge");

    this.dashIrrigationRec = document.getElementById("dash-irrigation-rec");
    this.dashIrrigationSummary = document.getElementById("dash-irrigation-summary");

    this.dashSustainabilityScore = document.getElementById("dash-sustainability-score");
    this.dashSustainabilitySummary = document.getElementById("dash-sustainability-summary");

    // Assistant summary card
    this.dashAssistantLead = document.getElementById("dash-assistant-lead");
    this.dashAssistantSummary = document.getElementById("dash-assistant-summary");
    this.btnDashAskAssistant = document.getElementById("btn-dash-ask-assistant");

    // Recent activity
    this.recentListEl = document.getElementById("dash-recent-list");
    this.recentEmptyEl = document.getElementById("dash-recent-empty");
  },

  bindEvents() {
    // Navigation target buttons
    document.querySelectorAll("[data-nav-target]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const target = btn.dataset.navTarget;
        if (btn.id === "btn-dash-ask-assistant") {
          const latest = window.AgriHistory ? AgriHistory.getLatestRecord() : null;
          if (latest && window.AgriApp && window.AgriApp.assistantCard) {
            window.AgriApp.assistantCard.askQuestion("Explain this crop diagnosis and precautions.", true);
            return;
          }
        }
        if (target && window.AgriNavigation) {
          AgriNavigation.navigateTo(target);
        }
      });
    });

    // Assistant query chips on dashboard
    document.querySelectorAll(".dash-query-chip").forEach(chip => {
      chip.addEventListener("click", (e) => {
        e.preventDefault();
        const query = chip.dataset.question;
        if (window.AgriApp && window.AgriApp.assistantCard) {
          window.AgriApp.assistantCard.askQuestion(query, true);
        } else if (window.AgriNavigation) {
          AgriNavigation.navigateTo("assistant");
        }
      });
    });
  },

  render() {
    this.renderGreeting();
    this.renderFarmSummary();
    this.renderLatestStatus();
    this.renderSmartFarmingSummary();
  },

  getGreetingPrefix() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  },

  renderGreeting() {
    const profile = AgriAuth.getFarmProfile();
    const session = AgriAuth.getState();
    const name = profile.farmerName || (session.user ? session.user.name : "");

    const prefix = this.getGreetingPrefix();
    if (this.greetingEl) {
      if (name) {
        this.greetingEl.textContent = `${prefix}, ${name} 👋`;
      } else {
        this.greetingEl.textContent = `${prefix}, Farmer 👋`;
      }
    }

    if (this.farmMetaLine) {
      const farmName = profile.farmName || (session.user ? session.user.farmName : "My Farm");
      const loc = (profile.district && profile.state)
        ? `${profile.district}, ${profile.state}`
        : (profile.state || profile.district || "Location not set");
      const crop = profile.primaryCrop || "Crop not set";

      this.farmMetaLine.innerHTML = `
        <span class="meta-item">${escapeHTML(farmName)}</span>
        <span class="meta-sep">•</span>
        <span class="meta-item">${escapeHTML(loc)}</span>
        <span class="meta-sep">•</span>
        <span class="meta-item">Primary Crop: <strong>${escapeHTML(crop)}</strong></span>
      `;
    }
  },

  renderFarmSummary() {
    const profile = AgriAuth.getFarmProfile();

    const crop = profile.primaryCrop || "Not set";
    const loc = (profile.district && profile.state)
      ? `${profile.district}, ${profile.state}`
      : (profile.state || profile.district || "Not set");
    const stage = profile.cropGrowthStage || profile.growthStage || "Not set";
    const soil = profile.soilType || "Not set";
    const acres = profile.farmSizeAcres ? `${profile.farmSizeAcres} Acres` : "Not set";

    if (this.cropSnapshotEl) this.cropSnapshotEl.textContent = crop;
    if (this.locSnapshotEl) this.locSnapshotEl.textContent = loc;

    if (this.farmCropEl) this.farmCropEl.textContent = crop;
    if (this.farmStageEl) this.farmStageEl.textContent = stage;
    if (this.farmSoilEl) this.farmSoilEl.textContent = soil;
    if (this.farmLocEl) this.farmLocEl.textContent = loc;
    if (this.farmSizeEl) this.farmSizeEl.textContent = acres;
  },

  renderLatestStatus() {
    const latest = window.AgriHistory ? AgriHistory.getLatestRecord() : null;

    // 1. Update top snapshot pill
    if (this.healthSnapshotEl) {
      if (latest) {
        const icon = latest.isHealthy ? "✓" : "⚠️";
        this.healthSnapshotEl.innerHTML = `
          <span class="status-indicator-tag ${latest.isHealthy ? 'tag-healthy' : 'tag-disease'}">
            ${icon} ${escapeHTML(latest.formattedName)}
          </span>
          <span class="status-conf-tag">Model confidence: ${latest.confidencePercentage}%</span>
        `;
      } else {
        this.healthSnapshotEl.innerHTML = `<span class="text-muted">No crop analysis yet</span>`;
      }
    }

    // 2. Update Crop Health Hero Card
    if (this.cropHeroBody) {
      if (latest) {
        const isHealthy = Boolean(latest.isHealthy);
        const statusClass = isHealthy ? "status-pill-healthy" : "status-pill-disease";
        const fillClass = isHealthy ? "fill-healthy" : "fill-disease";
        const icon = isHealthy ? "✓" : "⚠️";
        const statusText = isHealthy ? "Healthy Crop" : "Disease Detected";

        this.cropHeroBody.innerHTML = `
          <div class="crop-hero-diagnosis">
            <div class="diagnosis-header-row">
              <div class="diagnosis-status-pill ${statusClass}">
                <span class="status-icon">${icon}</span>
                <span class="status-text">${statusText}</span>
              </div>
              <span class="diagnosis-time-tag">${escapeHTML(latest.timeFormatted || "Recent")}</span>
            </div>

            <h3 class="diagnosis-condition-name">${escapeHTML(latest.formattedName)}</h3>
            <p class="diagnosis-crop-name">Crop: <strong>${escapeHTML(latest.crop || "Rice")}</strong></p>

            <div class="dash-conf-box">
              <div class="conf-box-header">
                <span class="conf-label">Model confidence</span>
                <strong class="conf-val">${latest.confidencePercentage}%</strong>
              </div>
              <div class="conf-meter-track" role="progressbar" aria-valuenow="${latest.confidencePercentage}" aria-valuemin="0" aria-valuemax="100">
                <div class="conf-meter-fill ${fillClass}" style="width: ${latest.confidencePercentage}%;"></div>
              </div>
            </div>

            <div class="crop-hero-actions">
              <button type="button" class="btn btn-primary" data-nav-target="crop-health">
                View Full Analysis →
              </button>
              <button type="button" class="btn btn-secondary" data-nav-target="crop-health">
                🔬 Analyze New Leaf
              </button>
            </div>
          </div>
        `;
      } else {
        this.cropHeroBody.innerHTML = `
          <div class="crop-hero-empty" id="dash-crop-empty-state">
            <div class="crop-empty-illustration">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M7 20h10"></path>
                <path d="M10 20c5.5-2.5.8-6.4 3-10"></path>
                <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"></path>
                <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"></path>
              </svg>
            </div>
            <h3 class="crop-empty-title">No crop health analysis yet</h3>
            <p class="crop-empty-desc">
              Upload a clear leaf image to diagnose disease conditions with ICAR-aligned models and get immediate precautions.
            </p>
            <button type="button" class="btn btn-primary" data-nav-target="crop-health">
              🔬 Analyze Leaf Image
            </button>
          </div>
        `;
      }

      // Re-bind click events for newly created action buttons
      this.cropHeroBody.querySelectorAll("[data-nav-target]").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const target = btn.dataset.navTarget;
          if (target && window.AgriNavigation) {
            AgriNavigation.navigateTo(target);
          }
        });
      });
    }

    // 3. Render recent activity list on dashboard
    if (this.recentListEl) {
      const records = window.AgriHistory ? AgriHistory.getHistory() : [];
      if (records.length === 0) {
        if (this.recentEmptyEl) this.recentEmptyEl.classList.remove("hidden");
        this.recentListEl.innerHTML = "";
      } else {
        if (this.recentEmptyEl) this.recentEmptyEl.classList.add("hidden");
        this.recentListEl.innerHTML = "";

        // Display up to 4 recent records on dashboard
        records.slice(0, 4).forEach(rec => {
          const item = document.createElement("div");
          item.className = "dash-activity-item";

          const icon = rec.isHealthy ? "✓" : "⚠️";
          const badgeClass = rec.isHealthy ? "badge-healthy" : "badge-disease";

          item.innerHTML = `
            <div class="activity-left">
              <div class="activity-crop-title">${escapeHTML(rec.crop)} • <strong>${escapeHTML(rec.formattedName)}</strong></div>
              <div class="activity-time">${escapeHTML(rec.timeFormatted)}</div>
            </div>
            <div class="activity-right">
              <span class="diagnosis-badge ${badgeClass}" style="font-size: 0.75rem; padding: 2px 8px;">
                <span>${icon}</span>
                <span>${rec.isHealthy ? 'Healthy' : rec.severity}</span>
              </span>
              <span class="activity-conf">Model conf: ${rec.confidencePercentage}%</span>
            </div>
          `;
          this.recentListEl.appendChild(item);
        });
      }
    }
  },

  /**
   * Renders the 3 Smart Farming cards with real active data or honest empty states
   */
  renderSmartFarmingSummary() {
    const profile = AgriAuth.getFarmProfile();
    const farmLoc = profile.district || profile.state || "";

    // 1. Weather Summary Card
    const weatherData = (window.AgriState && window.AgriState.getState().weatherData) ||
                        (window.AgriApp && window.AgriApp.weatherCard && window.AgriApp.weatherCard.weatherData);

    if (this.dashWeatherTemp && this.dashWeatherSummary) {
      if (weatherData && weatherData.current) {
        const curr = weatherData.current;
        const fc = weatherData.forecast || {};
        const locName = weatherData.location ? weatherData.location.name : farmLoc;
        
        const rainChance = (fc.forecast_available && typeof fc.rain_probability_24h === "number")
          ? `${fc.rain_probability_24h}% rain chance`
          : "rain forecast N/A";

        this.dashWeatherTemp.textContent = typeof curr.temperature_c === "number" ? `${curr.temperature_c.toFixed(1)}°C` : "--°C";
        this.dashWeatherSummary.textContent = `${curr.condition} in ${locName} • Humidity ${curr.humidity_percent}% • ${rainChance}`;
        if (this.dashWeatherBadge) this.dashWeatherBadge.textContent = "Live";
      } else if (farmLoc) {
        this.dashWeatherTemp.textContent = "--°C";
        this.dashWeatherSummary.textContent = `Location set to ${farmLoc}. Click View Weather to load live forecast.`;
        if (this.dashWeatherBadge) this.dashWeatherBadge.textContent = "Ready";
      } else {
        this.dashWeatherTemp.textContent = "--";
        this.dashWeatherSummary.textContent = "Set up your farm location to view local weather.";
        if (this.dashWeatherBadge) this.dashWeatherBadge.textContent = "Setup needed";
      }
    }

    // 2. Smart Irrigation Summary Card
    const irrData = window.AgriState ? window.AgriState.getState().irrigationData : null;
    if (this.dashIrrigationRec && this.dashIrrigationSummary) {
      if (irrData && irrData.recommendation) {
        this.dashIrrigationRec.textContent = irrData.recommendation;
        this.dashIrrigationRec.className = "sf-rec-pill " + (
          irrData.recommendation === "Irrigate now" ? "pill-irrigate" :
          irrData.recommendation === "Delay irrigation" ? "pill-delay" : "pill-monitor"
        );
        this.dashIrrigationSummary.textContent = `Soil moisture: ${irrData.soil_moisture}% • Rain probability: ${irrData.rain_probability_24h}%`;
      } else {
        this.dashIrrigationRec.textContent = "Not calculated";
        this.dashIrrigationRec.className = "sf-rec-pill text-muted";
        this.dashIrrigationSummary.textContent = "Enter soil moisture to receive watering advice.";
      }
    }

    // 3. Sustainability Summary Card
    const sustData = window.AgriState ? window.AgriState.getState().sustainabilityData : null;
    if (this.dashSustainabilityScore && this.dashSustainabilitySummary) {
      if (sustData && typeof sustData.score === "number") {
        this.dashSustainabilityScore.textContent = `${sustData.score} / 100`;
        this.dashSustainabilitySummary.textContent = `Rating: ${sustData.rating} • Water efficiency: ${sustData.breakdown.water_efficiency}/100`;
      } else {
        this.dashSustainabilityScore.textContent = "-- / 100";
        this.dashSustainabilitySummary.textContent = "Not evaluated yet. Calculate in Sustainability module.";
      }
    }

    // 4. AI Farmer Assistant Summary Card
    if (this.dashAssistantLead && this.dashAssistantSummary) {
      const latest = window.AgriHistory ? AgriHistory.getLatestRecord() : null;
      if (latest) {
        this.dashAssistantLead.textContent = `Ask about your ${latest.crop} diagnosis`;
        this.dashAssistantSummary.textContent = `Recent analysis: ${latest.formattedName} (${latest.confidencePercentage}% model confidence)`;
      } else {
        this.dashAssistantLead.textContent = "Need help with your farm?";
        this.dashAssistantSummary.textContent = "Ask questions about your crops, weather, or irrigation.";
      }
    }
  }
};

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

window.AgriDashboard = AgriDashboard;
