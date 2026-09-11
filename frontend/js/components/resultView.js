/**
 * AgriSmart AI - Result View Component
 * Renders verified diagnosis details, confidence certainty, and farmer precautions.
 * Decoupled from upload component; consumes real prediction data from AgriState.
 */
class AgriResultView {
  constructor() {
    this.container = document.getElementById("results-container");
    this.diseaseNameEl = document.getElementById("result-disease-name");
    this.severityBadgeEl = document.getElementById("result-severity-badge");
    this.confidenceValEl = document.getElementById("result-confidence-val");
    this.confidenceProgressEl = document.getElementById("result-confidence-progress");
    this.adviceTextEl = document.getElementById("result-advice-text");
    this.organicTextEl = document.getElementById("result-organic-text");
    this.btnCheckAnother = document.getElementById("btn-check-another");
    this.btnCopyResult = document.getElementById("btn-copy-result");
    this.copyFeedbackEl = document.getElementById("copy-feedback");

    this.init();
  }

  init() {
    this.bindEvents();

    // Subscribe to state changes
    AgriState.subscribe((state, changedKeys) => {
      if (changedKeys.includes("uiState") || changedKeys.includes("predictionResult")) {
        this.render(state);
      }
    });

    this.render(AgriState.getState());
  }

  bindEvents() {
    // 1. "Check Another Crop" button
    // Cleans up all current prediction state and returns directly to empty upload state
    if (this.btnCheckAnother) {
      this.btnCheckAnother.addEventListener("click", (e) => {
        e.preventDefault();
        
        // Reset state cleanly without page refresh
        AgriState.resetForNewCrop();

        // Smoothly scroll back to the upload card and focus
        const uploadSection = document.getElementById("crop-diagnosis-card");
        if (uploadSection) {
          uploadSection.scrollIntoView({ behavior: "smooth", block: "start" });
          const chooseBtn = document.getElementById("btn-choose-file");
          if (chooseBtn) {
            setTimeout(() => chooseBtn.focus(), 300);
          }
        }
      });
    }

    // 2. "Copy Summary" button
    if (this.btnCopyResult) {
      this.btnCopyResult.addEventListener("click", (e) => {
        e.preventDefault();
        this.copySummaryToClipboard();
      });
    }
  }

  async copySummaryToClipboard() {
    const result = AgriState.getState().predictionResult;
    if (!result) return;

    const summaryLines = [
      `🌾 AgriSmart AI — Crop Health Report`,
      `Diagnosis: ${result.formattedName}`,
      `Model Confidence: ${result.confidencePercentage}%`,
      `Status: ${result.severity}`,
      `Action: ${result.advice}`,
      result.organicCare ? `Organic Tip: ${result.organicCare}` : ""
    ].filter(Boolean);

    const textToCopy = summaryLines.join("\n");

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      if (this.copyFeedbackEl) {
        this.copyFeedbackEl.style.display = "inline-block";
        setTimeout(() => {
          if (this.copyFeedbackEl) {
            this.copyFeedbackEl.style.display = "none";
          }
        }, 2500);
      }
    } catch (err) {
      console.warn("Clipboard copy failed:", err);
    }
  }

  /**
   * Renders the diagnosis result strictly from real API response data stored in state
   * @param {object} state
   */
  render(state) {
    if (!this.container) return;

    const { uiState, predictionResult } = state;

    if (uiState === AgriConfig.states.SUCCESS && predictionResult) {
      this.container.style.display = "block";

      // Render disease title
      if (this.diseaseNameEl) {
        this.diseaseNameEl.textContent = predictionResult.formattedName || "Detected Condition";
      }

      // Render severity badge
      if (this.severityBadgeEl) {
        this.severityBadgeEl.textContent = predictionResult.severity || "Verified Assessment";
        this.severityBadgeEl.className = "severity-badge";
        if (predictionResult.severity === "High Alert") {
          this.severityBadgeEl.classList.add("severity-high");
        } else if (predictionResult.severity === "Optimal Condition") {
          this.severityBadgeEl.classList.add("severity-healthy");
        } else {
          this.severityBadgeEl.classList.add("severity-moderate");
        }
      }

      // Render confidence
      if (this.confidenceValEl) {
        this.confidenceValEl.textContent = `${predictionResult.confidencePercentage}%`;
      }

      // Render confidence progress bar
      if (this.confidenceProgressEl) {
        this.confidenceProgressEl.style.width = `${Math.min(100, Math.max(0, predictionResult.confidencePercentage))}%`;
      }

      // Render advice
      if (this.adviceTextEl) {
        this.adviceTextEl.textContent = predictionResult.advice || "Monitor the crop and inspect for spreading spots.";
      }

      // Render organic tip
      if (this.organicTextEl) {
        if (predictionResult.organicCare) {
          this.organicTextEl.textContent = predictionResult.organicCare;
          if (this.organicTextEl.parentElement) {
            this.organicTextEl.parentElement.style.display = "block";
          }
        } else if (this.organicTextEl.parentElement) {
          this.organicTextEl.parentElement.style.display = "none";
        }
      }

      // Smooth scroll into view
      setTimeout(() => {
        this.container.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);

    } else {
      // Hide results and clear display elements
      this.container.style.display = "none";
      if (this.diseaseNameEl) this.diseaseNameEl.textContent = "—";
      if (this.confidenceValEl) this.confidenceValEl.textContent = "—";
      if (this.confidenceProgressEl) this.confidenceProgressEl.style.width = "0%";
      if (this.adviceTextEl) this.adviceTextEl.textContent = "—";
      if (this.organicTextEl) this.organicTextEl.textContent = "—";
      if (this.copyFeedbackEl) this.copyFeedbackEl.style.display = "none";
    }
  }
}

window.AgriResultView = AgriResultView;
