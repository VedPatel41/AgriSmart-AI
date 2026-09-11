/**
 * AgriSmart AI - Farmer Onboarding Wizard (5-Step Flow)
 * Step 1: About You (Farmer Name & Contact)
 * Step 2: Your Farm (Farm Name, State, District)
 * Step 3: Your Crop (Primary Crop & Growth Stage)
 * Step 4: Farm Conditions (Soil Type & Acreage)
 * Step 5: Review & Confirmation
 */
const AgriOnboarding = {
  currentStep: 1,
  totalSteps: 5,
  isOpen: false,

  // Curated list of major agricultural states in India
  STATES: [
    "Gujarat",
    "Maharashtra",
    "Punjab",
    "Haryana",
    "Uttar Pradesh",
    "Madhya Pradesh",
    "Karnataka",
    "Andhra Pradesh",
    "Tamil Nadu",
    "Rajasthan",
    "West Bengal",
    "Bihar",
    "Odisha",
    "Telangana",
    "Kerala"
  ],

  // Common crops with ICAR-supported models highlighted
  CROPS: [
    { value: "Rice", label: "Rice / Paddy (ICAR Model Supported)" },
    { value: "Maize", label: "Maize / Corn (ICAR Model Supported)" },
    { value: "Wheat", label: "Wheat" },
    { value: "Tomato", label: "Tomato" },
    { value: "Potato", label: "Potato" },
    { value: "Cotton", label: "Cotton" },
    { value: "Sugarcane", label: "Sugarcane" },
    { value: "Soybean", label: "Soybean" },
    { value: "Mustard", label: "Mustard" },
    { value: "Groundnut", label: "Groundnut" },
    { value: "Chilli", label: "Chilli" },
    { value: "Onion", label: "Onion" }
  ],

  // Crop growth stages for irrigation & disease advisory
  CROP_STAGES: [
    "Germination / Seedling",
    "Tillering / Vegetative",
    "Flowering / Heading",
    "Grain Filling / Milking",
    "Maturity / Harvest Ready"
  ],

  // Common agricultural soil types
  SOIL_TYPES: [
    { value: "Alluvial Loam", label: "Alluvial Loam" },
    { value: "Black Soil (Regur)", label: "Black Soil (Regur)" },
    { value: "Red & Yellow Soil", label: "Red & Yellow Soil" },
    { value: "Clayey Soil", label: "Clayey Soil" },
    { value: "Sandy Loam", label: "Sandy Loam" },
    { value: "Laterite Soil", label: "Laterite Soil" }
  ],

  init() {
    this.modalEl = document.getElementById("onboarding-modal");
    if (!this.modalEl) return;

    this.populateDropdowns();
    this.bindEvents();
  },

  populateDropdowns() {
    const stateSelect = document.getElementById("onboard-state");
    if (stateSelect && stateSelect.options.length <= 1) {
      this.STATES.forEach(st => {
        const opt = document.createElement("option");
        opt.value = st;
        opt.textContent = st;
        stateSelect.appendChild(opt);
      });
    }

    const cropSelect = document.getElementById("onboard-crop");
    if (cropSelect && cropSelect.options.length <= 1) {
      this.CROPS.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.value;
        opt.textContent = c.label;
        cropSelect.appendChild(opt);
      });
    }

    const stageSelect = document.getElementById("onboard-crop-stage");
    if (stageSelect && stageSelect.options.length <= 1) {
      this.CROP_STAGES.forEach(stage => {
        const opt = document.createElement("option");
        opt.value = stage;
        opt.textContent = stage;
        stageSelect.appendChild(opt);
      });
    }

    const soilSelect = document.getElementById("onboard-soil");
    if (soilSelect && soilSelect.options.length <= 1) {
      this.SOIL_TYPES.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.value;
        opt.textContent = s.label;
        soilSelect.appendChild(opt);
      });
    }
  },

  bindEvents() {
    // Next buttons for Steps 1 through 4
    const nextBtn1 = document.getElementById("onboard-btn-next-1");
    if (nextBtn1) nextBtn1.addEventListener("click", () => this.handleStep1());

    const nextBtn2 = document.getElementById("onboard-btn-next-2");
    if (nextBtn2) nextBtn2.addEventListener("click", () => this.handleStep2());

    const nextBtn3 = document.getElementById("onboard-btn-next-3");
    if (nextBtn3) nextBtn3.addEventListener("click", () => this.handleStep3());

    const nextBtn4 = document.getElementById("onboard-btn-next-4");
    if (nextBtn4) nextBtn4.addEventListener("click", () => this.handleStep4());

    // Back buttons
    const backBtn2 = document.getElementById("onboard-btn-back-2");
    if (backBtn2) backBtn2.addEventListener("click", () => this.goToStep(1));

    const backBtn3 = document.getElementById("onboard-btn-back-3");
    if (backBtn3) backBtn3.addEventListener("click", () => this.goToStep(2));

    const backBtn4 = document.getElementById("onboard-btn-back-4");
    if (backBtn4) backBtn4.addEventListener("click", () => this.goToStep(3));

    const backBtn5 = document.getElementById("onboard-btn-back-5");
    if (backBtn5) backBtn5.addEventListener("click", () => this.goToStep(1));

    // Finish button
    const finishBtn = document.getElementById("onboard-btn-finish");
    if (finishBtn) finishBtn.addEventListener("click", () => this.handleStep5());

    // Skip button
    const skipBtn = document.getElementById("onboard-btn-skip");
    if (skipBtn) skipBtn.addEventListener("click", () => this.close());
  },

  open(options = {}) {
    if (!this.modalEl) this.init();
    if (!this.modalEl) return;

    this.isOpen = true;
    this.modalEl.classList.remove("hidden");
    this.modalEl.setAttribute("aria-hidden", "false");

    // Pre-fill existing profile data if available
    const profile = AgriAuth.getFarmProfile();
    const session = AgriAuth.getState();

    const nameInput = document.getElementById("onboard-farmer-name");
    const emailInput = document.getElementById("onboard-farmer-email");
    const farmInput = document.getElementById("onboard-farm-name");
    const stateSelect = document.getElementById("onboard-state");
    const distInput = document.getElementById("onboard-district");
    const cropSelect = document.getElementById("onboard-crop");
    const stageSelect = document.getElementById("onboard-crop-stage");
    const soilSelect = document.getElementById("onboard-soil");
    const acresInput = document.getElementById("onboard-acres");

    if (nameInput) nameInput.value = profile.farmerName || (session.user ? session.user.name : "");
    if (emailInput) emailInput.value = profile.contactNumber || (session.user ? session.user.identifier : "");
    if (farmInput) farmInput.value = profile.farmName || (session.user ? session.user.farmName : "");
    if (stateSelect && profile.state) stateSelect.value = profile.state;
    if (distInput) distInput.value = profile.district || "";
    if (cropSelect && profile.primaryCrop) cropSelect.value = profile.primaryCrop;
    if (stageSelect && profile.cropGrowthStage) stageSelect.value = profile.cropGrowthStage;
    if (soilSelect && profile.soilType) soilSelect.value = profile.soilType;
    if (acresInput) acresInput.value = profile.farmSizeAcres || "";

    this.goToStep(options.startStep || 1);
  },

  close() {
    if (!this.modalEl) return;
    this.isOpen = false;
    this.modalEl.classList.add("hidden");
    this.modalEl.setAttribute("aria-hidden", "true");
  },

  goToStep(stepNumber) {
    this.currentStep = Math.max(1, Math.min(stepNumber, this.totalSteps));

    // Update step visibility
    for (let i = 1; i <= this.totalSteps; i++) {
      const stepEl = document.getElementById(`onboard-step-${i}`);
      const indicatorEl = document.getElementById(`step-indicator-${i}`);
      if (stepEl) {
        if (i === this.currentStep) {
          stepEl.classList.remove("hidden");
        } else {
          stepEl.classList.add("hidden");
        }
      }
      if (indicatorEl) {
        if (i === this.currentStep) {
          indicatorEl.classList.add("step-active");
          indicatorEl.classList.remove("step-completed");
        } else if (i < this.currentStep) {
          indicatorEl.classList.add("step-completed");
          indicatorEl.classList.remove("step-active");
        } else {
          indicatorEl.classList.remove("step-active", "step-completed");
        }
      }
    }

    // Update progress label & track
    const progressLabel = document.getElementById("onboard-progress-label");
    if (progressLabel) {
      progressLabel.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
    }

    const progressBar = document.getElementById("onboard-progress-fill");
    if (progressBar) {
      progressBar.style.width = `${(this.currentStep / this.totalSteps) * 100}%`;
    }

    // Clear any previous error messages
    this.clearErrors();

    // If entering Review Step (Step 5), populate review summary
    if (this.currentStep === 5) {
      this.renderReviewSummary();
    }
  },

  handleStep1() {
    this.clearErrors();
    const nameInput = document.getElementById("onboard-farmer-name");
    const emailInput = document.getElementById("onboard-farmer-email");

    const farmerName = nameInput ? nameInput.value.trim() : "";
    const contactNumber = emailInput ? emailInput.value.trim() : "";

    if (!farmerName || farmerName.length < 2) {
      this.showError("onboard-farmer-name-error", "Please enter your full name (minimum 2 letters).");
      if (nameInput) nameInput.focus();
      return;
    }

    AgriAuth.saveFarmProfile({
      farmerName,
      contactNumber
    });

    this.goToStep(2);
  },

  handleStep2() {
    this.clearErrors();
    const farmInput = document.getElementById("onboard-farm-name");
    const stateSelect = document.getElementById("onboard-state");
    const distInput = document.getElementById("onboard-district");

    const farmName = farmInput ? farmInput.value.trim() : "";
    const state = stateSelect ? stateSelect.value.trim() : "";
    const district = distInput ? distInput.value.trim() : "";

    if (!farmName) {
      this.showError("onboard-farm-name-error", "Please enter a name for your farm or land.");
      if (farmInput) farmInput.focus();
      return;
    }

    if (!state) {
      this.showError("onboard-state-error", "Please select the state where your farm is located.");
      if (stateSelect) stateSelect.focus();
      return;
    }

    if (!district) {
      this.showError("onboard-district-error", "Please enter your district (used for local weather & advisory).");
      if (distInput) distInput.focus();
      return;
    }

    AgriAuth.saveFarmProfile({
      farmName,
      state,
      district
    });

    this.goToStep(3);
  },

  handleStep3() {
    this.clearErrors();
    const cropSelect = document.getElementById("onboard-crop");
    const stageSelect = document.getElementById("onboard-crop-stage");

    const primaryCrop = cropSelect ? cropSelect.value.trim() : "";
    const cropGrowthStage = stageSelect ? stageSelect.value.trim() : "";

    if (!primaryCrop) {
      this.showError("onboard-crop-error", "Please select your primary crop.");
      if (cropSelect) cropSelect.focus();
      return;
    }

    if (!cropGrowthStage) {
      this.showError("onboard-crop-stage-error", "Please select the current crop growth stage.");
      if (stageSelect) stageSelect.focus();
      return;
    }

    AgriAuth.saveFarmProfile({
      primaryCrop,
      cropGrowthStage
    });

    this.goToStep(4);
  },

  handleStep4() {
    this.clearErrors();
    const soilSelect = document.getElementById("onboard-soil");
    const acresInput = document.getElementById("onboard-acres");

    const soilType = soilSelect ? soilSelect.value.trim() : "";
    const acres = acresInput ? acresInput.value.trim() : "";

    AgriAuth.saveFarmProfile({
      soilType: soilType || null,
      farmSizeAcres: acres ? acres : null
    });

    this.goToStep(5);
  },

  renderReviewSummary() {
    const summaryCard = document.getElementById("onboard-review-summary");
    if (!summaryCard) return;

    const profile = AgriAuth.getFarmProfile();
    const session = AgriAuth.getState();

    const farmer = profile.farmerName || (session.user ? session.user.name : "Farmer");
    const farm = profile.farmName || "My Farm";
    const loc = (profile.district && profile.state) ? `${profile.district}, ${profile.state}` : (profile.state || "Not set");
    const crop = profile.primaryCrop || "Not set";
    const stage = profile.cropGrowthStage || "Not set";
    const soil = profile.soilType || "Not specified (Optional)";
    const size = profile.farmSizeAcres ? `${profile.farmSizeAcres} Acres` : "Not specified (Optional)";

    summaryCard.innerHTML = `
      <div class="review-grid">
        <div class="review-item">
          <span class="review-label">Farmer Name</span>
          <span class="review-val">${this._escape(farmer)}</span>
        </div>
        <div class="review-item">
          <span class="review-label">Farm / Land</span>
          <span class="review-val">${this._escape(farm)}</span>
        </div>
        <div class="review-item">
          <span class="review-label">Location</span>
          <span class="review-val">${this._escape(loc)}</span>
        </div>
        <div class="review-item">
          <span class="review-label">Primary Crop</span>
          <span class="review-val highlight-crop">${this._escape(crop)}</span>
        </div>
        <div class="review-item">
          <span class="review-label">Growth Stage</span>
          <span class="review-val">${this._escape(stage)}</span>
        </div>
        <div class="review-item">
          <span class="review-label">Soil Type</span>
          <span class="review-val text-muted-val">${this._escape(soil)}</span>
        </div>
        <div class="review-item">
          <span class="review-label">Farm Size</span>
          <span class="review-val text-muted-val">${this._escape(size)}</span>
        </div>
      </div>
    `;
  },

  handleStep5() {
    const profile = AgriAuth.getFarmProfile();
    // Ensure farmName and primaryCrop are verified
    if (!profile.farmName || !profile.primaryCrop) {
      if (window.AgriUI) AgriUI.showToast("Please complete your farm and crop details first.", "warning");
      this.goToStep(1);
      return;
    }

    this.close();

    if (window.AgriUI && typeof AgriUI.showToast === "function") {
      AgriUI.showToast("Farm profile saved successfully! Welcome to AgriSmart AI.", "success");
    }

    // Refresh active views and header displays
    if (window.AgriNavigation && typeof AgriNavigation.refreshActiveView === "function") {
      AgriNavigation.refreshActiveView();
    }
  },

  showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = message;
      el.classList.remove("hidden");
    }
  },

  clearErrors() {
    document.querySelectorAll(".onboard-error").forEach(el => {
      el.textContent = "";
      el.classList.add("hidden");
    });
  },

  _escape(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
};

window.AgriOnboarding = AgriOnboarding;
