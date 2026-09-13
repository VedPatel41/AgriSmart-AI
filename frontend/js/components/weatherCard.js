/**
 * AgriSmart AI - Weather Intelligence & Crop Disease Risk Component
 * Component: AgriWeatherCard
 * 
 * Production-ready weather card integrating OpenWeatherMap via the Flask backend.
 * Provides real-time micro-climate indicators, next-24h rain probability,
 * transparent rule-based foliar disease risk, working refresh with anti-spam,
 * location search/presets, and stale-request race-condition protection.
 */
class AgriWeatherCard {
  constructor() {
    this.container = document.getElementById("weather-module-container");
    this.activeRequestId = 0;
    
    // Resolve initial location from farmer profile, falling back to default hub
    const profile = window.AgriAuth ? AgriAuth.getFarmProfile() : {};
    this.farmLocation = profile.district || profile.state || "";
    this.currentLocation = this.farmLocation || (AgriConfig.weather ? AgriConfig.weather.defaultCity : "Ahmedabad");
    
    this.currentState = "IDLE";
    this.weatherData = null;
    this.lastRefreshedAt = 0;
    this.refreshCooldownMs = 3000; // 3 seconds anti-spam debounce

    if (this.container) {
      this.init();
    }
  }

  init() {
    this.renderShell();
    this.bindEvents();

    // Subscribe to Auth changes (e.g. if farmer updates farm location in My Farm)
    if (window.AgriAuth) {
      AgriAuth.subscribe(() => {
        const profile = AgriAuth.getFarmProfile();
        const newFarmLoc = profile.district || profile.state || "";
        if (newFarmLoc && newFarmLoc !== this.farmLocation) {
          this.farmLocation = newFarmLoc;
          this.currentLocation = newFarmLoc;
          this.renderShell();
          this.bindEvents();
          this.fetchWeather(this.currentLocation);
        }
      });
    }

    // Auto-fetch location if set, or prompt to set location
    if (this.currentLocation) {
      this.fetchWeather(this.currentLocation);
    } else {
      this.setState("LOCATION_MISSING");
    }
  }

  /**
   * Renders the base interactive shell structure
   */
  renderShell() {
    if (!this.container) return;

    const popularLocations = (AgriConfig.weather && AgriConfig.weather.popularLocations) || [];

    this.container.innerHTML = `
      <div class="weather-page-wrapper">
        <div class="page-title-banner">
          <div>
            <h2 class="page-main-heading" data-i18n="weather.title">Weather Intelligence</h2>
            <p class="page-subheading" data-i18n="weather.subtitle">Live weather information for your farm location.</p>
          </div>
        </div>

        <div class="weather-card-inner" role="region" aria-label="Real-Time Weather Intelligence">
          
          <!-- Header & Location Control Bar -->
          <div class="weather-card-header">
            <div class="weather-header-info">
              <div class="weather-badge-row">
                <span class="module-icon" aria-hidden="true">🌦️</span>
                <span class="track-badge live-badge" data-i18n="module.weatherBadge">Live Weather</span>
              </div>
              <h3 class="weather-module-title" data-i18n="module.weatherTitle">Weather & Disease Risk</h3>
            </div>

            <div class="weather-controls">
              <!-- Location Selector -->
              <label for="weather-hub-select" class="sr-only">Select Location</label>
              <select id="weather-hub-select" class="weather-select" aria-label="Select location for weather">
                ${this.farmLocation ? `
                  <option value="${this.escapeHtml(this.farmLocation)}" ${this.currentLocation === this.farmLocation ? "selected" : ""}>
                    📍 ${this.escapeHtml(this.farmLocation)} (Your Farm)
                  </option>
                ` : `
                  <option value="" disabled ${!this.currentLocation ? "selected" : ""}>Select Farm Location</option>
                `}
                ${popularLocations.map(loc => `
                  <option value="${loc.name}" ${loc.name === this.currentLocation ? "selected" : ""}>
                    ${loc.name} (${loc.state})
                  </option>
                `).join("")}
                <option value="__custom__">🔍 Other City / Custom...</option>
              </select>

              <!-- Refresh Button -->
              <button type="button" class="btn btn-secondary btn-weather-refresh" id="btn-weather-refresh" aria-label="Refresh live weather" title="Refresh live weather">
                <span class="refresh-icon" aria-hidden="true">↻</span>
                <span data-i18n="weather.refreshBtn">Refresh Weather</span>
              </button>
            </div>
          </div>

          <!-- Custom City Input (Hidden by default, shown when custom selected) -->
          <div class="weather-custom-row" id="weather-custom-row" style="display: none;">
            <input 
              type="text" 
              id="weather-custom-input" 
              class="weather-custom-input" 
              placeholder="Type city or district name (e.g. Surat, Indore, Karnal)..." 
              maxlength="60"
              aria-label="Enter custom location name"
            />
            <button type="button" id="btn-custom-city-go" class="btn btn-secondary btn-sm">Search</button>
            <button type="button" id="btn-custom-city-cancel" class="btn btn-text btn-sm">Cancel</button>
          </div>

          <!-- Dynamic Weather Content Area -->
          <div class="weather-content-area" id="weather-content-area" aria-live="polite">
            <!-- Populated by state renderers -->
          </div>

          <!-- Card Footer with Verification & Timestamp -->
          <div class="weather-card-footer">
            <div class="weather-timestamp-wrap">
              <span class="weather-status-dot" id="weather-status-dot"></span>
              <span class="weather-timestamp" id="weather-timestamp">Initializing...</span>
            </div>
            <span class="weather-powered-by">OpenWeatherMap API</span>
          </div>

        </div>
      </div>
    `;
  }

  bindEvents() {
    if (!this.container) return;

    const hubSelect = this.container.querySelector("#weather-hub-select");
    const refreshBtn = this.container.querySelector("#btn-weather-refresh");
    const customRow = this.container.querySelector("#weather-custom-row");
    const customInput = this.container.querySelector("#weather-custom-input");
    const customGoBtn = this.container.querySelector("#btn-custom-city-go");
    const customCancelBtn = this.container.querySelector("#btn-custom-city-cancel");

    // Location dropdown change
    if (hubSelect) {
      hubSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        if (val === "__custom__") {
          customRow.style.display = "flex";
          customInput.focus();
        } else {
          customRow.style.display = "none";
          this.currentLocation = val;
          this.fetchWeather(this.currentLocation);
        }
      });
    }

    // Custom city submission
    const handleCustomSubmit = () => {
      const city = customInput.value.trim();
      if (!city) {
        customInput.focus();
        return;
      }
      this.currentLocation = city;
      this.fetchWeather(this.currentLocation);
    };

    if (customGoBtn) customGoBtn.addEventListener("click", handleCustomSubmit);
    if (customInput) {
      customInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleCustomSubmit();
        }
      });
    }

    if (customCancelBtn) {
      customCancelBtn.addEventListener("click", () => {
        customRow.style.display = "none";
        hubSelect.value = this.currentLocation;
      });
    }

    // Refresh button click with debounce protection
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        const now = Date.now();
        if (now - this.lastRefreshedAt < this.refreshCooldownMs) {
          if (window.AgriUI) AgriUI.showToast("Please wait a moment before refreshing again.", "info");
          return;
        }
        this.lastRefreshedAt = now;
        this.fetchWeather(this.currentLocation, true);
      });
    }

    // Delegated actions for retry or update location
    this.container.addEventListener("click", (e) => {
      if (e.target && e.target.closest("#btn-retry-weather")) {
        this.fetchWeather(this.currentLocation, true);
      }
      if (e.target && e.target.closest("#btn-update-farm-location")) {
        if (window.AgriNavigation) {
          AgriNavigation.navigateTo("my-farm");
        }
      }
      if (e.target && e.target.closest("#btn-ask-assistant-weather")) {
        if (window.AgriApp && window.AgriApp.assistantCard) {
          window.AgriApp.assistantCard.askQuestion("How might this weather affect my crop?", true);
        } else if (window.AgriNavigation) {
          window.AgriNavigation.navigateTo("assistant");
        }
      }
    });
  }

  /**
   * Fetches weather from the backend proxy with race condition protection
   */
  async fetchWeather(location, bypassCache = false) {
    if (!location) {
      this.setState("LOCATION_MISSING");
      return;
    }

    // Increment monotonic request ID to guard against out-of-order race conditions
    const thisRequestId = ++this.activeRequestId;

    this.setState("LOADING");
    this.setRefreshSpinning(true);

    const result = await AgriApi.getWeather(location, bypassCache);

    // Stale Request Protection: If user switched locations while this request was inflight, ignore it!
    if (thisRequestId !== this.activeRequestId) {
      console.warn(`Ignoring stale weather response for '${location}' (Request #${thisRequestId} vs Active #${this.activeRequestId})`);
      return;
    }

    this.setRefreshSpinning(false);

    if (result.success && result.data) {
      this.weatherData = result.data;
      if (window.AgriState) {
        window.AgriState.setWeatherData(result.data);
      }
      this.setState("SUCCESS");
    } else {
      if (window.AgriState) {
        window.AgriState.setWeatherData(null);
      }
      if (result.code === "NOT_CONFIGURED") {
        this.setState("CONFIGURATION_MISSING", result.error);
      } else if (result.code === "MISSING_LOCATION") {
        this.setState("LOCATION_MISSING");
      } else {
        this.setState("ERROR", result.error || "Weather data is currently unavailable.");
      }
    }
  }

  /**
   * Updates state and refreshes inner view
   */
  setState(newState, errorMessage = "") {
    this.currentState = newState;
    const contentArea = this.container ? this.container.querySelector("#weather-content-area") : null;
    const statusDot = this.container ? this.container.querySelector("#weather-status-dot") : null;
    const timestampEl = this.container ? this.container.querySelector("#weather-timestamp") : null;

    if (!contentArea) return;

    switch (newState) {
      case "LOADING":
        if (statusDot) statusDot.className = "weather-status-dot pulse";
        if (timestampEl) timestampEl.textContent = "Loading weather...";
        contentArea.innerHTML = this.renderLoadingSkeleton();
        break;

      case "SUCCESS":
        if (statusDot) statusDot.className = "weather-status-dot active";
        if (timestampEl) {
          const updateTime = this.weatherData.updated_at ? new Date(this.weatherData.updated_at) : new Date();
          const timeStr = updateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          timestampEl.textContent = `Updated at ${timeStr}${this.weatherData.cached ? " (Cached)" : ""}`;
        }
        contentArea.innerHTML = this.renderSuccessView(this.weatherData);
        break;

      case "CONFIGURATION_MISSING":
        if (statusDot) statusDot.className = "weather-status-dot warning";
        if (timestampEl) timestampEl.textContent = "Service not configured";
        contentArea.innerHTML = this.renderNotConfiguredView(errorMessage);
        break;

      case "LOCATION_MISSING":
        if (statusDot) statusDot.className = "weather-status-dot warning";
        if (timestampEl) timestampEl.textContent = "Location missing";
        contentArea.innerHTML = this.renderLocationMissingView();
        break;

      case "ERROR":
      default:
        if (statusDot) statusDot.className = "weather-status-dot error";
        if (timestampEl) timestampEl.textContent = "Weather data unavailable";
        contentArea.innerHTML = this.renderErrorView(
          errorMessage || "Weather data is currently unavailable.",
          "Please check your network connection or try refreshing."
        );
        break;
    }
  }

  /**
   * Spin animation on refresh icon
   */
  setRefreshSpinning(isSpinning) {
    const refreshBtn = this.container ? this.container.querySelector("#btn-weather-refresh") : null;
    if (!refreshBtn) return;
    const icon = refreshBtn.querySelector(".refresh-icon");
    const textSpan = refreshBtn.querySelector("[data-i18n='weather.refreshBtn']") || refreshBtn.querySelector("span:last-child");
    if (isSpinning) {
      if (icon) icon.classList.add("spinning");
      if (textSpan) textSpan.textContent = "Refreshing...";
      refreshBtn.disabled = true;
    } else {
      if (icon) icon.classList.remove("spinning");
      if (textSpan) textSpan.textContent = "Refresh Weather";
      refreshBtn.disabled = false;
    }
  }

  /**
   * Renders Loading Skeleton
   */
  renderLoadingSkeleton() {
    return `
      <div class="weather-skeleton-wrap" aria-label="Loading weather metrics...">
        <div class="skeleton-row top-row">
          <div class="skeleton-box skeleton-temp"></div>
          <div class="skeleton-box skeleton-cond"></div>
        </div>
        <div class="skeleton-grid">
          <div class="skeleton-box skeleton-metric"></div>
          <div class="skeleton-box skeleton-metric"></div>
          <div class="skeleton-box skeleton-metric"></div>
        </div>
        <div class="skeleton-box skeleton-risk"></div>
      </div>
    `;
  }

  /**
   * Renders Real Success View (strictly no fake values)
   */
  renderSuccessView(data) {
    const loc = data.location || {};
    const curr = data.current || {};
    const fc = data.forecast || {};
    const risk = data.risk || { level: "Low", reason: "Normal weather conditions." };

    const cityName = loc.name || this.currentLocation;
    const country = loc.country ? `, ${loc.country}` : "";
    const tempDisplay = typeof curr.temperature_c === "number" ? `${curr.temperature_c.toFixed(1)}°C` : "Unavailable";
    const humidityDisplay = typeof curr.humidity_percent === "number" ? `${curr.humidity_percent}%` : "Unavailable";
    
    // Strict distinction between humidity and rain probability
    const rainChanceDisplay = (fc.forecast_available && typeof fc.rain_probability_24h === "number") 
      ? `${fc.rain_probability_24h}%` 
      : "Rain probability unavailable";
    
    const windDisplay = typeof curr.wind_kph === "number" ? `${curr.wind_kph} km/h` : "Unavailable";

    const conditionName = curr.condition || "Clear";
    const conditionDesc = curr.description || conditionName;
    const weatherEmoji = this.getWeatherEmoji(curr.icon, conditionName);

    const riskLevel = risk.level || "Low";

    return `
      <div class="weather-success-card">
        
        <!-- Primary Weather Row -->
        <div class="weather-main-row">
          <div class="weather-location-display">
            <span class="weather-loc-label">CURRENT WEATHER</span>
            <h3 class="weather-loc-name">${this.escapeHtml(cityName)}${this.escapeHtml(country)}</h3>
          </div>

          <div class="weather-temp-badge">
            <span class="weather-icon-symbol" aria-hidden="true">${weatherEmoji}</span>
            <div class="weather-temp-text">
              <span class="weather-temp-num">${tempDisplay}</span>
              <span class="weather-condition-desc">${this.escapeHtml(conditionDesc)}</span>
            </div>
          </div>
        </div>

        <!-- Metric Grid -->
        <div class="weather-metrics-grid">
          <div class="weather-metric-item">
            <span class="metric-label" data-i18n="weather.humidity">Humidity</span>
            <div class="metric-val-wrap">
              <strong class="metric-val">${humidityDisplay}</strong>
              <span class="metric-sub">Relative moisture</span>
            </div>
          </div>

          <div class="weather-metric-item">
            <span class="metric-label">Rain probability</span>
            <div class="metric-val-wrap">
              <strong class="metric-val">${rainChanceDisplay}</strong>
              <span class="metric-sub">Next 24h peak</span>
            </div>
          </div>

          <div class="weather-metric-item">
            <span class="metric-label" data-i18n="weather.wind">Wind speed</span>
            <div class="metric-val-wrap">
              <strong class="metric-val">${windDisplay}</strong>
              <span class="metric-sub">Surface airflow</span>
            </div>
          </div>
        </div>

        <!-- RAINFALL OUTLOOK (Next 24 Hours) -->
        <div class="weather-forecast-strip">
          <div class="forecast-strip-header">
            <h4 class="forecast-strip-title" data-i18n="weather.next24h">RAINFALL OUTLOOK</h4>
            <span class="forecast-window-tag">Next 24 hours</span>
          </div>
          <div class="rainfall-outlook-card">
            <div class="rainfall-outlook-main">
              <span class="rainfall-outlook-icon" aria-hidden="true">🌧️</span>
              <div class="rainfall-outlook-meta">
                <span class="rainfall-outlook-label">Rain probability</span>
                <strong class="rainfall-outlook-value">${rainChanceDisplay}</strong>
              </div>
            </div>
            <p class="rainfall-outlook-desc">
              ${fc.forecast_available && typeof fc.rain_probability_24h === "number"
                ? (fc.rain_probability_24h > 60
                    ? "Rain is likely over the next 24 hours. Consider postponing scheduled irrigation until rainfall is measured."
                    : (fc.rain_probability_24h >= 30
                        ? "Moderate rainfall likelihood. Check local soil moisture before operating irrigation pumps."
                        : "Low chance of rain. Field moisture relies primarily on scheduled irrigation."))
                : "Live rainfall forecast is currently unavailable from the weather provider."}
            </p>
          </div>
        </div>

        <!-- FARM WEATHER INSIGHT -->
        <div class="weather-risk-box risk-${riskLevel.toLowerCase()}">
          <div class="risk-box-header">
            <span class="risk-label-tag">FARM WEATHER INSIGHT</span>
            <span class="risk-badge badge-${riskLevel.toLowerCase()}">
              <strong class="risk-level-text">${riskLevel} Disease Risk</strong>
            </span>
          </div>
          <p class="risk-reason-text">
            <strong class="risk-why-label">Agronomic Insight: </strong>
            ${this.escapeHtml(risk.reason)}
          </p>
        </div>

        <!-- Assistant Cross-Module CTA -->
        <div class="weather-assistant-cta" style="margin-top: var(--space-4); display: flex; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-ask-assistant-weather">
            🤖 Ask AgriSmart
          </button>
        </div>

      </div>
    `;
  }

  /**
   * Renders LOCATION_MISSING state
   */
  renderLocationMissingView() {
    return `
      <div class="weather-state-box state-warning" role="alert">
        <div class="state-icon-wrap" aria-hidden="true">📍</div>
        <div class="state-text-wrap">
          <h4 class="state-heading">Set your farm location to view local weather.</h4>
          <p class="state-desc">We need your farm district or state to fetch accurate micro-climate information.</p>
          <button type="button" class="btn btn-primary btn-sm" id="btn-update-farm-location" data-i18n="weather.updateLocationBtn">
            Update Farm Location
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renders CONFIGURATION_MISSING state (Zero fake weather)
   */
  renderNotConfiguredView(msg) {
    return `
      <div class="weather-state-box state-unconfigured" role="alert">
        <div class="state-icon-wrap" aria-hidden="true">⚙️</div>
        <div class="state-text-wrap">
          <h4 class="state-heading">Weather Service Not Configured</h4>
          <p class="state-desc">
            ${this.escapeHtml(msg || "Weather service is not configured. Add OPENWEATHER_API_KEY in backend .env to enable real meteorological data.")}
          </p>
          <div class="state-help-box">
            <span class="help-title">To enable live weather:</span>
            <code>Add OPENWEATHER_API_KEY=your_key in backend .env</code>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders ERROR state
   */
  renderErrorView(heading, subtext) {
    return `
      <div class="weather-state-box state-error" role="alert">
        <div class="state-icon-wrap" aria-hidden="true">⚠️</div>
        <div class="state-text-wrap">
          <h4 class="state-heading">${this.escapeHtml(heading)}</h4>
          <p class="state-desc">${this.escapeHtml(subtext)}</p>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-retry-weather" data-i18n="weather.tryAgain">
            Try Again
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Maps OpenWeatherMap icon codes to readable weather emojis
   */
  getWeatherEmoji(iconCode, condition) {
    if (!iconCode) {
      if (condition === "Rain") return "🌧️";
      if (condition === "Clouds") return "☁️";
      if (condition === "Clear") return "☀️";
      return "🌤️";
    }
    const code = iconCode.slice(0, 2);
    switch (code) {
      case "01": return "☀️"; // Clear sky
      case "02": return "⛅"; // Few clouds
      case "03": return "☁️"; // Scattered clouds
      case "04": return "☁️"; // Broken clouds
      case "09": return "🌧️"; // Shower rain
      case "10": return "🌦️"; // Rain
      case "11": return "⛈️"; // Thunderstorm
      case "13": return "❄️"; // Snow
      case "50": return "🌫️"; // Mist/Haze
      default: return "🌤️";
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

window.AgriWeatherCard = AgriWeatherCard;
