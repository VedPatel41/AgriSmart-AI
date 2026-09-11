/**
 * AgriSmart AI - Upload Card Component (Prompt 2 Implementation)
 * Production-grade crop image input, camera capture, drag-and-drop,
 * decode validation, aspect-ratio preview, error recovery, and analysis submission.
 */
class AgriUploadCard {
  constructor() {
    // DOM Elements
    this.dropZone = document.getElementById("drop-zone");
    this.fileInput = document.getElementById("image-input");
    this.cameraInput = document.getElementById("camera-input");
    this.dropPrompt = document.getElementById("drop-prompt");
    this.previewContainer = document.getElementById("preview-container");
    this.imagePreview = document.getElementById("image-preview");
    this.fileNameDisplay = document.getElementById("file-name-display");
    this.fileSizeDisplay = document.getElementById("file-size-display");
    this.fileDimensionsDisplay = document.getElementById("file-dimensions-display");

    this.btnChooseFile = document.getElementById("btn-choose-file");
    this.btnTakePhoto = document.getElementById("btn-take-photo");
    this.btnChangePhoto = document.getElementById("btn-change-photo");
    this.btnRemovePhoto = document.getElementById("btn-remove-photo");

    this.checkBtn = document.getElementById("check-btn");
    this.checkBtnText = document.getElementById("check-btn-text");
    this.checkBtnIcon = document.getElementById("check-btn-icon");

    this.loadingContainer = document.getElementById("loading-container");
    this.errorContainer = document.getElementById("error-container");
    this.errorText = document.getElementById("error-text");
    this.btnErrorRetry = document.getElementById("btn-error-retry");
    this.btnErrorDismiss = document.getElementById("btn-error-dismiss");

    // Guard against multiple concurrent validation/submission tasks
    this.isValidating = false;

    this.init();
  }

  init() {
    this.bindEvents();

    // Subscribe to state store
    AgriState.subscribe((state, changedKeys) => {
      if (
        changedKeys.includes("uiState") ||
        changedKeys.includes("selectedFile") ||
        changedKeys.includes("errorMessage") ||
        changedKeys.includes("isSubmitting")
      ) {
        this.renderState(state);
      }
    });

    // Initial render
    this.renderState(AgriState.getState());
  }

  bindEvents() {
    // 1. Native File Input
    if (this.fileInput) {
      this.fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleFileSelection(e.target.files[0]);
        }
        // Clear input value so selecting the same file again triggers change event
        this.fileInput.value = "";
      });
    }

    // 2. Camera Input (Mobile capture="environment")
    if (this.cameraInput) {
      this.cameraInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleFileSelection(e.target.files[0]);
        }
        this.cameraInput.value = "";
      });
    }

    // 3. Choose Photo Button
    if (this.btnChooseFile) {
      this.btnChooseFile.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.fileInput) this.fileInput.click();
      });
    }

    // 4. Take Photo Button (Camera with fallback)
    if (this.btnTakePhoto) {
      this.btnTakePhoto.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.cameraInput) {
          this.cameraInput.click();
        } else if (this.fileInput) {
          this.fileInput.click();
        }
      });
    }

    // 5. Change Photo Button
    if (this.btnChangePhoto) {
      this.btnChangePhoto.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const state = AgriState.getState();
        if (state.isSubmitting) return; // Locked during analysis
        if (this.fileInput) this.fileInput.click();
      });
    }

    // 6. Remove Photo Button
    if (this.btnRemovePhoto) {
      this.btnRemovePhoto.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const state = AgriState.getState();
        if (state.isSubmitting) return; // Locked during analysis
        this.removePhoto();
      });
    }

    // 7. Drag & Drop Handlers
    if (this.dropZone) {
      ["dragenter", "dragover"].forEach(name => {
        this.dropZone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          const state = AgriState.getState();
          if (!state.isSubmitting) {
            this.dropZone.classList.add("drag-over");
          }
        });
      });

      ["dragleave", "drop"].forEach(name => {
        this.dropZone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropZone.classList.remove("drag-over");
        });
      });

      this.dropZone.addEventListener("drop", (e) => {
        const state = AgriState.getState();
        if (state.isSubmitting) return;

        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleFileSelection(e.dataTransfer.files[0]);
        }
      });

      // Clicking empty dropzone background opens file picker
      this.dropZone.addEventListener("click", (e) => {
        const state = AgriState.getState();
        if (state.uiState === AgriConfig.states.IDLE && !state.isSubmitting) {
          if (this.fileInput) this.fileInput.click();
        }
      });

      // Keyboard accessibility for dropzone (Enter / Space opens file picker)
      this.dropZone.addEventListener("keydown", (e) => {
        const state = AgriState.getState();
        if ((e.key === "Enter" || e.key === " ") && state.uiState === AgriConfig.states.IDLE && !state.isSubmitting) {
          e.preventDefault();
          if (this.fileInput) this.fileInput.click();
        }
      });
    }

    // 8. Primary CTA: Check My Crop
    if (this.checkBtn) {
      this.checkBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.submitAnalysis();
      });
    }

    // 9. Error Actions: Retry & Dismiss
    if (this.btnErrorRetry) {
      this.btnErrorRetry.addEventListener("click", (e) => {
        e.preventDefault();
        const state = AgriState.getState();
        if (state.selectedFile) {
          this.submitAnalysis();
        } else if (this.fileInput) {
          this.fileInput.click();
        }
      });
    }

    if (this.btnErrorDismiss) {
      this.btnErrorDismiss.addEventListener("click", (e) => {
        e.preventDefault();
        const state = AgriState.getState();
        if (state.selectedFile) {
          AgriState.setState({ uiState: AgriConfig.states.SELECTED, errorMessage: null });
        } else {
          AgriState.setState({ uiState: AgriConfig.states.IDLE, errorMessage: null });
        }
      });
    }
  }

  /**
   * Centralized Single Source of Truth for File Selection & Validation
   * Handles files from file picker, camera, or drag & drop.
   * Preserves existing valid image if a replacement attempt is invalid.
   * @param {File} file
   */
  async handleFileSelection(file) {
    if (!file) return;

    if (this.isValidating) return;
    this.isValidating = true;

    const currentState = AgriState.getState();
    const hasPreviousValidFile = !!(currentState.selectedFile && currentState.previewUrl);

    // 1. File existence check
    if (!file.name || file.size === 0) {
      this.handleValidationError(AgriConfig.messages.unreadable, hasPreviousValidFile);
      this.isValidating = false;
      return;
    }

    // 2. MIME type & Extension validation
    const fileName = file.name.toLowerCase();
    const hasValidExtension = AgriConfig.upload.allowedExtensions.some(ext => fileName.endsWith(ext));
    const fileMime = (file.type || "").toLowerCase();
    const hasValidMime = AgriConfig.upload.allowedMimeTypes.includes(fileMime) || fileMime.startsWith("image/");

    if (!hasValidExtension || !hasValidMime) {
      this.handleValidationError(AgriConfig.messages.unsupportedType, hasPreviousValidFile);
      this.isValidating = false;
      return;
    }

    // 3. File size validation (max 5MB)
    if (file.size > AgriConfig.upload.maxFileSizeBytes) {
      this.handleValidationError(AgriConfig.messages.tooLarge, hasPreviousValidFile);
      this.isValidating = false;
      return;
    }

    // 4. Image Decoding & Usability Check via local Image()
    let tempObjectUrl = null;
    try {
      tempObjectUrl = URL.createObjectURL(file);
      const dimensions = await this.validateImageDecoding(tempObjectUrl);

      // Verify minimum resolution to reject unreadable 1x1 blanks
      const minDims = AgriConfig.upload.minImageDimensions;
      if (dimensions.width < minDims.width || dimensions.height < minDims.height) {
        URL.revokeObjectURL(tempObjectUrl);
        this.handleValidationError(AgriConfig.messages.tooSmall, hasPreviousValidFile);
        this.isValidating = false;
        return;
      }

      // Valid file confirmed: commit to state
      AgriState.setFileSelected(file, tempObjectUrl, dimensions);

    } catch (decodeErr) {
      if (tempObjectUrl) {
        URL.revokeObjectURL(tempObjectUrl);
      }
      this.handleValidationError(AgriConfig.messages.unreadable, hasPreviousValidFile);
    } finally {
      this.isValidating = false;
    }
  }

  /**
   * Helper to validate decoding and read image dimensions
   * @param {string} objectUrl
   * @returns {Promise<{width: number, height: number}>}
   */
  validateImageDecoding(objectUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      img.onerror = () => {
        reject(new Error("Image decode failed"));
      };
      img.src = objectUrl;
    });
  }

  /**
   * Handles validation errors without breaking previous valid file
   */
  handleValidationError(errorMessage, hasPreviousValidFile) {
    if (hasPreviousValidFile) {
      // Preserve existing valid image and notify user of failed replacement
      AgriState.setState({
        errorMessage: errorMessage
      });
    } else {
      AgriState.setError(errorMessage);
    }
  }

  /**
   * Completely removes current photo and returns to State 1 (Idle)
   */
  removePhoto() {
    if (this.fileInput) this.fileInput.value = "";
    if (this.cameraInput) this.cameraInput.value = "";
    AgriState.clearFile();
  }

  /**
   * Submits crop image for analysis to POST /predict
   * Strictly enforces duplicate submission prevention and deterministic states.
   */
  async submitAnalysis() {
    const state = AgriState.getState();

    // 1. Validate image presence
    if (!state.selectedFile) {
      AgriState.setError(AgriConfig.messages.noFile);
      return;
    }

    // 2. Prevent duplicate clicks / concurrent requests
    if (state.isSubmitting || state.uiState === AgriConfig.states.ANALYZING) {
      return;
    }

    // 3. Set Analyzing state
    AgriState.setAnalyzing();

    // 4. Dispatch request to backend API service
    const response = await AgriApi.predictCropDisease(state.selectedFile);

    if (response.success) {
      // 5. Success: hand off real prediction response to result component
      AgriState.setPredictionSuccess(response.data);
    } else {
      // 6. Failure: show mapped friendly error and offer recovery
      AgriState.setError(response.error || AgriConfig.messages.genericError);
    }
  }

  /**
   * Human-readable file size formatter
   */
  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Deterministic State Renderer for Upload Card
   * Synchronizes DOM with AgriState store.
   * @param {object} state
   */
  renderState(state) {
    const { uiState, selectedFile, previewUrl, imageDimensions, errorMessage, isSubmitting } = state;

    // A. Inline Error Display (State 5)
    if (this.errorContainer && this.errorText) {
      if (errorMessage) {
        this.errorText.textContent = errorMessage;
        this.errorContainer.style.display = "flex";
      } else {
        this.errorContainer.style.display = "none";
      }
    }

    // B. Loading Container & Progress (State 3)
    if (this.loadingContainer) {
      this.loadingContainer.style.display = (uiState === AgriConfig.states.ANALYZING) ? "flex" : "none";
    }

    // C. Upload Box: Idle vs Selected Preview
    if (uiState === AgriConfig.states.IDLE) {
      if (this.dropPrompt) this.dropPrompt.style.display = "flex";
      if (this.previewContainer) this.previewContainer.style.display = "none";
      if (this.dropZone) this.dropZone.classList.remove("has-preview");

      // Check My Crop button is DISABLED
      if (this.checkBtn) {
        this.checkBtn.disabled = true;
        this.checkBtn.setAttribute("aria-disabled", "true");
      }
      if (this.checkBtnText) this.checkBtnText.textContent = "Check My Crop";
      if (this.checkBtnIcon) this.checkBtnIcon.textContent = "🔍";

      // Re-enable input buttons
      if (this.btnChooseFile) this.btnChooseFile.disabled = false;
      if (this.btnTakePhoto) this.btnTakePhoto.disabled = false;

    } else if (uiState === AgriConfig.states.SELECTED || uiState === AgriConfig.states.ERROR) {
      if (selectedFile && previewUrl) {
        if (this.dropPrompt) this.dropPrompt.style.display = "none";
        if (this.previewContainer) this.previewContainer.style.display = "flex";
        if (this.imagePreview) this.imagePreview.src = previewUrl;
        
        // Display filename securely via textContent (no raw HTML)
        if (this.fileNameDisplay) this.fileNameDisplay.textContent = selectedFile.name;
        if (this.fileSizeDisplay) this.fileSizeDisplay.textContent = this.formatBytes(selectedFile.size);

        if (this.fileDimensionsDisplay && imageDimensions) {
          this.fileDimensionsDisplay.textContent = `${imageDimensions.width} × ${imageDimensions.height} px`;
          this.fileDimensionsDisplay.style.display = "inline-block";
        } else if (this.fileDimensionsDisplay) {
          this.fileDimensionsDisplay.style.display = "none";
        }

        if (this.dropZone) this.dropZone.classList.add("has-preview");

        // Check My Crop button is ENABLED
        if (this.checkBtn) {
          this.checkBtn.disabled = false;
          this.checkBtn.removeAttribute("aria-disabled");
        }
        if (this.checkBtnText) this.checkBtnText.textContent = "Check My Crop";
        if (this.checkBtnIcon) this.checkBtnIcon.textContent = "🔍";

        if (this.btnChangePhoto) this.btnChangePhoto.disabled = false;
        if (this.btnRemovePhoto) this.btnRemovePhoto.disabled = false;

      } else {
        // No valid file selected yet
        if (this.dropPrompt) this.dropPrompt.style.display = "flex";
        if (this.previewContainer) this.previewContainer.style.display = "none";
        if (this.dropZone) this.dropZone.classList.remove("has-preview");

        if (this.checkBtn) {
          this.checkBtn.disabled = true;
          this.checkBtn.setAttribute("aria-disabled", "true");
        }
      }

    } else if (uiState === AgriConfig.states.ANALYZING) {
      // In analyzing state, all inputs are locked to prevent duplicate requests
      if (this.checkBtn) {
        this.checkBtn.disabled = true;
        this.checkBtn.setAttribute("aria-disabled", "true");
      }
      if (this.checkBtnText) this.checkBtnText.textContent = "Analyzing Crop...";
      if (this.checkBtnIcon) this.checkBtnIcon.textContent = "⏳";

      if (this.btnChangePhoto) this.btnChangePhoto.disabled = true;
      if (this.btnRemovePhoto) this.btnRemovePhoto.disabled = true;
      if (this.btnChooseFile) this.btnChooseFile.disabled = true;
      if (this.btnTakePhoto) this.btnTakePhoto.disabled = true;

    } else if (uiState === AgriConfig.states.SUCCESS) {
      // Results ready
      if (this.checkBtn) {
        this.checkBtn.disabled = false;
        this.checkBtn.removeAttribute("aria-disabled");
      }
      if (this.checkBtnText) this.checkBtnText.textContent = "Re-analyze Crop";
      if (this.checkBtnIcon) this.checkBtnIcon.textContent = "🔍";

      if (this.btnChangePhoto) this.btnChangePhoto.disabled = false;
      if (this.btnRemovePhoto) this.btnRemovePhoto.disabled = false;
    }
  }
}

window.AgriUploadCard = AgriUploadCard;
