/**
 * AgriSmart AI - Crop Health & Disease Detection Controller
 * Orchestrates camera/file image capture, client-side validation,
 * execution of the real /predict API, healthy/disease separation,
 * actionable precautions, and session analysis history tracking.
 */
const AgriCropHealth = {
  selectedFile: null,
  previewUrl: null,
  imageDimensions: null,
  isAnalyzing: false,

  init() {
    this.cacheDom();
    this.bindEvents();
    this.syncWithFarmProfile();
    this.renderHistory();

    // Listen to farm profile changes to pre-select default crop
    if (window.AgriAuth) {
      AgriAuth.subscribe(() => this.syncWithFarmProfile());
    }

    // Listen to history changes
    if (window.AgriHistory) {
      AgriHistory.subscribe(() => this.renderHistory());
    }
  },

  cacheDom() {
    // Context inputs
    this.cropSelect = document.getElementById("crop-context-select");
    this.growthSelect = document.getElementById("growth-stage-select");

    // Upload & Dropzone
    this.dropZone = document.getElementById("crop-drop-zone");
    this.fileInput = document.getElementById("crop-file-input");
    this.cameraInput = document.getElementById("crop-camera-input");
    this.btnChoose = document.getElementById("btn-crop-choose");
    this.btnTake = document.getElementById("btn-crop-take");

    // Previews & Prompts
    this.dropPrompt = document.getElementById("crop-drop-prompt");
    this.previewCard = document.getElementById("crop-preview-card");
    this.imagePreview = document.getElementById("crop-image-preview");
    this.fileNameEl = document.getElementById("crop-file-name");
    this.fileSizeEl = document.getElementById("crop-file-size");
    this.fileDimsEl = document.getElementById("crop-file-dims");
    this.btnChange = document.getElementById("btn-crop-change");
    this.btnRemove = document.getElementById("btn-crop-remove");

    // Action CTA
    this.btnAnalyze = document.getElementById("btn-analyze-crop");
    this.analyzeBtnText = document.getElementById("analyze-btn-text");

    // Results container
    this.resultsCard = document.getElementById("crop-results-container");
    this.resultBadge = document.getElementById("result-status-badge");
    this.resultTitle = document.getElementById("result-condition-title");
    this.confidenceVal = document.getElementById("result-confidence-val");
    this.confidenceBar = document.getElementById("result-confidence-bar");
    this.confidenceNote = document.getElementById("result-confidence-note");
    this.symptomsText = document.getElementById("result-symptoms-text");
    this.preventionText = document.getElementById("result-prevention-text");
    this.organicText = document.getElementById("result-organic-text");
    this.chemicalSection = document.getElementById("result-chemical-section");
    this.chemicalText = document.getElementById("result-chemical-text");
    this.hindiSummarySection = document.getElementById("result-hindi-section");
    this.hindiSummaryText = document.getElementById("result-hindi-text");

    this.btnAnalyzeAnother = document.getElementById("btn-analyze-another");
    this.btnAskAssistant = document.getElementById("btn-ask-assistant-crop");
    this.btnCopyResult = document.getElementById("btn-copy-result");
    this.copyFeedback = document.getElementById("copy-feedback");

    // History
    this.historyList = document.getElementById("crop-history-list");
    this.historyEmpty = document.getElementById("crop-history-empty");
  },

  syncWithFarmProfile() {
    if (!this.cropSelect) return;
    const profile = AgriAuth.getFarmProfile();
    if (profile && profile.primaryCrop) {
      // If user hasn't manually selected yet, match farm profile crop
      if (!this.cropSelect.value) {
        for (let i = 0; i < this.cropSelect.options.length; i++) {
          if (this.cropSelect.options[i].value.toLowerCase() === profile.primaryCrop.toLowerCase() ||
              profile.primaryCrop.toLowerCase().includes(this.cropSelect.options[i].value.toLowerCase())) {
            this.cropSelect.selectedIndex = i;
            break;
          }
        }
      }
    }
  },

  bindEvents() {
    // 1. File input change
    if (this.fileInput) {
      this.fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleFile(e.target.files[0]);
        }
        this.fileInput.value = "";
      });
    }

    // 2. Camera capture change
    if (this.cameraInput) {
      this.cameraInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleFile(e.target.files[0]);
        }
        this.cameraInput.value = "";
      });
    }

    // 3. Choose button click
    if (this.btnChoose) {
      this.btnChoose.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.fileInput) this.fileInput.click();
      });
    }

    // 4. Take Photo button click
    if (this.btnTake) {
      this.btnTake.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.cameraInput) {
          this.cameraInput.click();
        } else if (this.fileInput) {
          this.fileInput.click();
        }
      });
    }

    // 5. Change Photo button
    if (this.btnChange) {
      this.btnChange.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.isAnalyzing) return;
        if (this.fileInput) this.fileInput.click();
      });
    }

    // 6. Remove Photo button
    if (this.btnRemove) {
      this.btnRemove.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.isAnalyzing) return;
        this.resetUploadState();
      });
    }

    // 7. Drag & Drop
    if (this.dropZone) {
      ["dragenter", "dragover"].forEach(eventName => {
        this.dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!this.isAnalyzing) {
            this.dropZone.classList.add("drag-over");
          }
        });
      });

      ["dragleave", "drop"].forEach(eventName => {
        this.dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropZone.classList.remove("drag-over");
        });
      });

      this.dropZone.addEventListener("drop", (e) => {
        if (this.isAnalyzing) return;
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleFile(e.dataTransfer.files[0]);
        }
      });

      // Click on drop prompt area opens file dialog
      if (this.dropPrompt) {
        this.dropPrompt.addEventListener("click", (e) => {
          if (!this.selectedFile && !this.isAnalyzing) {
            if (this.fileInput) this.fileInput.click();
          }
        });
      }
    }

    // 8. Analyze Button
    if (this.btnAnalyze) {
      this.btnAnalyze.addEventListener("click", (e) => {
        e.preventDefault();
        this.analyzeCrop();
      });
    }

    // 9. Analyze Another Crop Button
    if (this.btnAnalyzeAnother) {
      this.btnAnalyzeAnother.addEventListener("click", (e) => {
        e.preventDefault();
        this.resetUploadState();
        if (this.dropZone) {
          this.dropZone.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }

    // 10. Copy Result Summary Button
    if (this.btnCopyResult) {
      this.btnCopyResult.addEventListener("click", (e) => {
        e.preventDefault();
        this.copyResultSummary();
      });
    }

    // 11. Ask AgriSmart About This Result Button
    if (this.btnAskAssistant) {
      this.btnAskAssistant.addEventListener("click", (e) => {
        e.preventDefault();
        const diseaseTitle = this.resultTitle ? this.resultTitle.textContent.trim() : "my crop diagnosis";
        if (window.AgriApp && window.AgriApp.assistantCard) {
          window.AgriApp.assistantCard.askQuestion(`Explain my crop diagnosis for ${diseaseTitle} and what precautions I should take.`, true);
        } else if (window.AgriNavigation) {
          window.AgriNavigation.navigateTo("assistant");
        }
      });
    }
  },

  /**
   * Validates selected image file
   */
  async handleFile(file) {
    if (!file) return;

    const allowedExts = [".jpg", ".jpeg", ".png", ".webp"];
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

    // Extension check
    const fileName = (file.name || "").toLowerCase();
    const hasValidExt = allowedExts.some(ext => fileName.endsWith(ext));
    if (!hasValidExt) {
      AgriUI.showToast("Unsupported file type. Please upload a JPG, JPEG, PNG, or WEBP photo.", "error");
      return;
    }

    // Size check
    if (file.size > maxSizeBytes) {
      AgriUI.showToast("File is too large. Maximum allowed size is 5 MB.", "error");
      return;
    }

    // In-memory decode & dimension check
    let tempUrl = null;
    try {
      tempUrl = URL.createObjectURL(file);
      const dims = await this.readImageDimensions(tempUrl);

      if (dims.width < 30 || dims.height < 30) {
        URL.revokeObjectURL(tempUrl);
        AgriUI.showToast("Image resolution is too small. Please upload a clear photo of the leaf.", "error");
        return;
      }

      // Cleanup old URL
      if (this.previewUrl) {
        try { URL.revokeObjectURL(this.previewUrl); } catch (e) {}
      }

      this.selectedFile = file;
      this.previewUrl = tempUrl;
      this.imageDimensions = dims;

      // Update Preview UI
      if (this.imagePreview) this.imagePreview.src = this.previewUrl;
      if (this.fileNameEl) this.fileNameEl.textContent = file.name;
      if (this.fileSizeEl) this.fileSizeEl.textContent = this.formatBytes(file.size);
      if (this.fileDimsEl) this.fileDimsEl.textContent = `${dims.width} × ${dims.height} px`;

      if (this.dropPrompt) this.dropPrompt.classList.add("hidden");
      if (this.previewCard) this.previewCard.classList.remove("hidden");
      if (this.dropZone) this.dropZone.classList.add("has-preview");

      if (this.btnAnalyze) {
        this.btnAnalyze.disabled = false;
        this.btnAnalyze.removeAttribute("aria-disabled");
      }

    } catch (err) {
      if (tempUrl) URL.revokeObjectURL(tempUrl);
      AgriUI.showToast("Could not read image file. It may be corrupt or not a valid image.", "error");
    }
  },

  readImageDimensions(objectUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Decode failed"));
      img.src = objectUrl;
    });
  },

  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  },

  resetUploadState() {
    if (this.previewUrl) {
      try { URL.revokeObjectURL(this.previewUrl); } catch (e) {}
    }
    this.selectedFile = null;
    this.previewUrl = null;
    this.imageDimensions = null;
    this.isAnalyzing = false;

    if (this.fileInput) this.fileInput.value = "";
    if (this.cameraInput) this.cameraInput.value = "";

    if (this.dropPrompt) this.dropPrompt.classList.remove("hidden");
    if (this.previewCard) this.previewCard.classList.add("hidden");
    if (this.dropZone) this.dropZone.classList.remove("has-preview");

    if (this.resultsCard) this.resultsCard.classList.add("hidden");

    if (this.btnAnalyze) {
      this.btnAnalyze.disabled = true;
      this.btnAnalyze.setAttribute("aria-disabled", "true");
      AgriUI.setButtonLoading(this.btnAnalyze, false);
    }
  },

  /**
   * Dispatches real prediction request to POST /predict
   */
  async analyzeCrop() {
    if (!this.selectedFile) {
      AgriUI.showToast("Please select or take a photo of a crop leaf first.", "warning");
      return;
    }

    if (this.isAnalyzing) return;
    this.isAnalyzing = true;

    // Loading indicator on button
    AgriUI.setButtonLoading(this.btnAnalyze, true, "Analyzing leaf image...");

    try {
      const response = await AgriApi.predictCropDisease(this.selectedFile);

      if (response.success && response.data) {
        this.renderDiagnosisResult(response.data);
      } else {
        const errorMsg = response.error || "Crop analysis service is temporarily unavailable. Please try again.";
        AgriUI.showToast(errorMsg, "error");
      }
    } catch (err) {
      AgriUI.showToast("Network error while connecting to analysis service. Please check your connection.", "error");
    } finally {
      this.isAnalyzing = false;
      AgriUI.setButtonLoading(this.btnAnalyze, false);
    }
  },

  /**
   * Renders the diagnosis result card
   */
  renderDiagnosisResult(data) {
    if (!this.resultsCard) return;

    const classLabel = data.classLabel || "";
    const confidence = Number(data.confidence || 0);
    const confidencePct = Math.round(confidence * 100);
    const raw = data.raw || {};
    const advisory = raw.advisory || data.advisory || {};

    const isHealthy = classLabel.toLowerCase().includes("healthy");

    // Context selected
    const selectedCrop = this.cropSelect ? this.cropSelect.value : "";
    const selectedStage = this.growthSelect ? this.growthSelect.value : "";

    // 1. Title and status badge (Strictly English)
    let displayCrop = (advisory.crop || "").replace(/\s*\([^)]*[\u0900-\u097F\u0A80-\u0AFF][^)]*\)/g, "").trim();
    let displayDisease = (advisory.disease_name || "").replace(/\s*\([^)]*[\u0900-\u097F\u0A80-\u0AFF][^)]*\)/g, "").trim();

    let displayTitle = "";
    if (displayCrop && displayDisease) {
      displayTitle = `${displayCrop} — ${displayDisease}`;
    } else {
      displayTitle = classLabel.replace(/_/g, " ");
    }
    // Final sanitization to guarantee pure English
    displayTitle = displayTitle.replace(/[\u0900-\u097F\u0A80-\u0AFF]/g, "").trim();

    if (this.resultTitle) {
      this.resultTitle.textContent = displayTitle;
    }

    if (this.resultBadge) {
      this.resultBadge.className = "diagnosis-badge";
      if (isHealthy) {
        this.resultBadge.classList.add("badge-healthy");
        this.resultBadge.innerHTML = `<span>✓</span> <span>Crop Appears Healthy</span>`;
      } else {
        const severity = advisory.severity || "Moderate";
        this.resultBadge.classList.add(severity.toLowerCase().includes("high") ? "badge-disease-high" : "badge-disease");
        this.resultBadge.innerHTML = `<span>⚠️</span> <span>Disease Detected (${severity})</span>`;
      }
    }

    // 2. Confidence Display (Strictly labeled "Model confidence", NOT accuracy)
    if (this.confidenceVal) {
      this.confidenceVal.textContent = `${confidencePct}%`;
    }
    if (this.confidenceBar) {
      this.confidenceBar.style.width = `${confidencePct}%`;
      if (isHealthy) {
        this.confidenceBar.style.backgroundColor = "var(--color-success)";
      } else if (confidencePct < 30) {
        this.confidenceBar.style.backgroundColor = "var(--color-warning)";
      } else {
        this.confidenceBar.style.backgroundColor = "var(--accent-leaf)";
      }
    }

    if (this.confidenceNote) {
      if (confidencePct < 40) {
        this.confidenceNote.textContent = "Model confidence is relatively low. Consider taking another clear photo in bright daylight.";
        this.confidenceNote.classList.remove("hidden");
      } else {
        this.confidenceNote.classList.add("hidden");
      }
    }

    // 3. Symptoms & What this means
    if (this.symptomsText) {
      if (isHealthy) {
        this.symptomsText.textContent = advisory.symptoms || "No visible pathogen lesions, discoloration, or pest damage were detected by the model in this image.";
      } else {
        this.symptomsText.textContent = advisory.symptoms || "Visible leaf symptoms associated with this condition were detected.";
      }
    }

    // 4. Precautionary Guidance & Remedies
    if (this.preventionText) {
      if (isHealthy) {
        this.preventionText.textContent = advisory.prevention || "Maintain scheduled irrigation, balanced soil nutrients, and regular field monitoring. No disease treatment is necessary.";
      } else {
        this.preventionText.textContent = advisory.prevention || "Remove visibly infected leaves to limit spore spread; avoid overhead splashing during irrigation.";
      }
    }

    if (this.organicText) {
      this.organicText.textContent = advisory.organic_remedy || "Use bio-pesticides or neem extract as recommended by your local KVK.";
    }

    if (this.chemicalSection && this.chemicalText) {
      if (isHealthy || !advisory.chemical_remedy || advisory.chemical_remedy.toLowerCase().includes("no chemical")) {
        this.chemicalSection.classList.add("hidden");
      } else {
        this.chemicalSection.classList.remove("hidden");
        this.chemicalText.textContent = advisory.chemical_remedy;
      }
    }

    // 5. Farmer Advisory (English Only)
    if (this.hindiSummarySection && this.hindiSummaryText) {
      const advisoryText = advisory.prevention || advisory.organic_remedy || "";
      if (advisoryText) {
        this.hindiSummarySection.classList.remove("hidden");
        this.hindiSummaryText.textContent = advisoryText;
      } else {
        this.hindiSummarySection.classList.add("hidden");
      }
    }

    // 6. Save to Session History
    AgriHistory.addRecord({
      crop: selectedCrop || (displayCrop || "Crop"),
      growthStage: selectedStage || "Not specified",
      classLabel: classLabel,
      formattedName: displayTitle,
      confidence: confidence,
      isHealthy: isHealthy,
      severity: advisory.severity || (isHealthy ? "None" : "Moderate"),
      symptoms: advisory.symptoms,
      advice: advisory.prevention || advisory.chemical_remedy,
      organicCare: advisory.organic_remedy,
      chemicalRemedy: advisory.chemical_remedy
    });

    // 7. Show Result Card and scroll smoothly
    this.resultsCard.classList.remove("hidden");
    this.resultsCard.scrollIntoView({ behavior: "smooth", block: "start" });

    AgriUI.showToast("Crop analysis complete!", "success");

    // Also trigger Dashboard to update its latest crop health card
    if (window.AgriDashboard && typeof AgriDashboard.renderLatestStatus === "function") {
      AgriDashboard.renderLatestStatus();
    }
  },

  /**
   * Copies formatted summary to clipboard
   */
  async copyResultSummary() {
    if (!this.resultTitle) return;

    const title = this.resultTitle.textContent || "Crop Health Report";
    const conf = this.confidenceVal ? this.confidenceVal.textContent : "";
    const symptoms = this.symptomsText ? this.symptomsText.textContent : "";
    const prevention = this.preventionText ? this.preventionText.textContent : "";

    const text = [
      `🌾 AgriSmart AI — Crop Health Report`,
      `Condition: ${title}`,
      `Model Confidence: ${conf}`,
      `Observations: ${symptoms}`,
      `Precaution: ${prevention}`,
      `Note: Verify with local agricultural extension before chemical application.`
    ].join("\n");

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      if (this.copyFeedback) {
        this.copyFeedback.classList.remove("hidden");
        setTimeout(() => {
          if (this.copyFeedback) this.copyFeedback.classList.add("hidden");
        }, 2000);
      }
      AgriUI.showToast("Report copied to clipboard.", "info");
    } catch (e) {
      AgriUI.showToast("Failed to copy report to clipboard.", "error");
    }
  },

  /**
   * Renders the session history list inside Crop Health
   */
  renderHistory() {
    if (!this.historyList) return;
    const records = AgriHistory.getHistory();

    if (records.length === 0) {
      if (this.historyEmpty) this.historyEmpty.classList.remove("hidden");
      this.historyList.innerHTML = "";
      return;
    }

    if (this.historyEmpty) this.historyEmpty.classList.add("hidden");
    this.historyList.innerHTML = "";

    records.forEach(rec => {
      const item = document.createElement("div");
      item.className = "history-item-card";

      const badgeClass = rec.isHealthy ? "badge-healthy" : "badge-disease";
      const icon = rec.isHealthy ? "✓" : "⚠️";

      item.innerHTML = `
        <div class="history-item-header">
          <div class="history-item-meta">
            <span class="history-item-crop">${escapeHTML(rec.crop)}</span>
            <span class="history-item-time">${escapeHTML(rec.timeFormatted)}</span>
          </div>
          <span class="diagnosis-badge ${badgeClass}" style="font-size: 0.75rem; padding: 2px 8px;">
            <span>${icon}</span>
            <span>${rec.isHealthy ? 'Healthy' : rec.severity || 'Disease'}</span>
          </span>
        </div>
        <div class="history-item-title">${escapeHTML(rec.formattedName)}</div>
        <div class="history-item-conf">Model confidence: <strong>${rec.confidencePercentage}%</strong></div>
      `;

      this.historyList.appendChild(item);
    });
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

window.AgriCropHealth = AgriCropHealth;
