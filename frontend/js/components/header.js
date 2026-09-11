/**
 * AgriSmart AI - Header Component
 * Manages live backend status indicator and server connectivity.
 */
class AgriHeader {
  constructor() {
    this.statusPill = document.getElementById("server-status-pill");
    this.statusText = document.getElementById("status-text");
    this.statusDot = document.getElementById("status-dot");

    this.init();
  }

  init() {
    // Click on status pill to manually refresh health check
    if (this.statusPill) {
      this.statusPill.addEventListener("click", () => {
        this.checkStatus(true);
      });
    }

    // Subscribe to state changes
    AgriState.subscribe((state, changedKeys) => {
      if (changedKeys.includes("backendStatus")) {
        this.renderStatus(state.backendStatus, state.backendError);
      }
    });

    // Ensure English on boot
    if (window.AgriI18n) {
      window.AgriI18n.applyLanguage("en");
    }

    // Initial check
    this.checkStatus(false);

    // Periodic check
    setInterval(() => {
      this.checkStatus(false);
    }, AgriConfig.healthCheckIntervalMs);
  }

  async checkStatus(isManual = false) {
    if (isManual && this.statusText) {
      const checkingText = window.AgriI18n ? window.AgriI18n.t("nav.statusChecking") : "Checking...";
      this.statusText.textContent = checkingText;
    }

    const result = await AgriApi.checkHealth();
    if (result.online) {
      AgriState.setBackendStatus("connected");
    } else {
      AgriState.setBackendStatus("offline", result.error);
    }
  }

  renderStatus(status, error) {
    if (!this.statusPill || !this.statusText) return;

    this.statusPill.classList.remove("status-checking", "status-connected", "status-offline");

    const onlineLabel = window.AgriI18n ? window.AgriI18n.t("nav.statusOnline") : "Backend: Online";
    const offlineLabel = window.AgriI18n ? window.AgriI18n.t("nav.statusOffline") : "Backend: Offline";
    const checkingLabel = window.AgriI18n ? window.AgriI18n.t("nav.statusChecking") : "Checking...";

    if (status === "connected") {
      this.statusPill.classList.add("status-connected");
      this.statusText.textContent = onlineLabel;
      this.statusPill.setAttribute("title", "Flask API is running on port 5000. Click to re-test.");
    } else if (status === "offline") {
      this.statusPill.classList.add("status-offline");
      this.statusText.textContent = offlineLabel;
      this.statusPill.setAttribute("title", `${error || "Cannot connect to server"}. Click to retry.`);
    } else {
      this.statusPill.classList.add("status-checking");
      this.statusText.textContent = checkingLabel;
      this.statusPill.setAttribute("title", "Verifying connection to server...");
    }
  }
}

window.AgriHeader = AgriHeader;
