/**
 * AgriSmart AI - My Farm Profile Controller
 * Manages viewing and in-place editing of real farm context.
 * Synchronizes with AgriAuth session storage, Dashboard, Smart Irrigation, and AI Assistant.
 */
const AgriMyFarm = {
  isEditing: false,

  STATES: [
    "Gujarat", "Maharashtra", "Punjab", "Haryana", "Uttar Pradesh",
    "Madhya Pradesh", "Karnataka", "Andhra Pradesh", "Tamil Nadu",
    "Rajasthan", "West Bengal", "Bihar", "Odisha", "Telangana", "Kerala"
  ],

  CROPS: [
    "Rice", "Maize", "Wheat", "Tomato",
    "Potato", "Cotton", "Sugarcane", "Soybean",
    "Mustard", "Groundnut", "Chilli", "Onion"
  ],

  GROWTH_STAGES: [
    "Seedling", "Vegetative", "Flowering", "Fruiting", "Harvest", "Not sure"
  ],

  SOIL_TYPES: [
    "Alluvial Loam", "Black Soil (Regur)", "Red & Yellow Soil",
    "Clayey Soil", "Sandy Loam", "Laterite Soil"
  ],

  init() {
    this.cacheDom();
    this.populateEditDropdowns();
    this.bindEvents();
    this.render();

    // Subscribe to Auth updates
    if (window.AgriAuth) {
      AgriAuth.subscribe(() => this.render());
    }
  },

  cacheDom() {
    this.viewModeEl = document.getElementById("farm-view-mode");
    this.editModeEl = document.getElementById("farm-edit-mode");

    // Display fields
    this.nameVal = document.getElementById("farm-view-name");
    this.farmerVal = document.getElementById("farm-view-farmer");
    this.stateVal = document.getElementById("farm-view-state");
    this.districtVal = document.getElementById("farm-view-district");
    this.cropVal = document.getElementById("farm-view-crop");
    this.stageVal = document.getElementById("farm-view-stage");
    this.soilVal = document.getElementById("farm-view-soil");
    this.phVal = document.getElementById("farm-view-ph");
    this.moistureVal = document.getElementById("farm-view-moisture");
    this.acresVal = document.getElementById("farm-view-acres");
    this.completionBadge = document.getElementById("farm-completion-badge");

    // Form inputs
    this.form = document.getElementById("farm-edit-form");
    this.inputFarmer = document.getElementById("edit-farmer-name");
    this.inputFarm = document.getElementById("edit-farm-name");
    this.selectState = document.getElementById("edit-farm-state");
    this.inputDistrict = document.getElementById("edit-farm-district");
    this.selectCrop = document.getElementById("edit-farm-crop");
    this.selectStage = document.getElementById("edit-farm-stage");
    this.selectSoil = document.getElementById("edit-farm-soil");
    this.inputPh = document.getElementById("edit-farm-ph");
    this.inputMoisture = document.getElementById("edit-farm-moisture");
    this.inputAcres = document.getElementById("edit-farm-acres");

    // Buttons
    this.btnTriggerEdit = document.getElementById("btn-edit-farm-profile");
    this.btnCancelEdit = document.getElementById("btn-cancel-farm-edit");
    this.btnSaveEdit = document.getElementById("btn-save-farm-edit");
  },

  populateEditDropdowns() {
    if (this.selectState && this.selectState.options.length <= 1) {
      this.STATES.forEach(st => {
        const opt = document.createElement("option");
        opt.value = st;
        opt.textContent = st;
        this.selectState.appendChild(opt);
      });
    }

    if (this.selectCrop && this.selectCrop.options.length <= 1) {
      this.CROPS.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        this.selectCrop.appendChild(opt);
      });
    }

    if (this.selectStage && this.selectStage.options.length <= 1) {
      this.GROWTH_STAGES.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        this.selectStage.appendChild(opt);
      });
    }

    if (this.selectSoil && this.selectSoil.options.length <= 1) {
      this.SOIL_TYPES.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        this.selectSoil.appendChild(opt);
      });
    }
  },

  bindEvents() {
    if (this.btnTriggerEdit) {
      this.btnTriggerEdit.addEventListener("click", () => this.enterEditMode());
    }

    if (this.btnCancelEdit) {
      this.btnCancelEdit.addEventListener("click", () => this.cancelEdit());
    }

    if (this.form) {
      this.form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveProfile();
      });
    }
  },

  render() {
    const profile = AgriAuth.getFarmProfile();
    const session = AgriAuth.getState();

    const setVal = (el, val, suffix = "", emptyText = "Not set") => {
      if (!el) return;
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        el.textContent = `${val}${suffix}`;
        el.classList.remove("text-muted");
      } else {
        el.textContent = emptyText;
        el.classList.add("text-muted");
      }
    };

    setVal(this.nameVal, profile.farmName);
    setVal(this.farmerVal, profile.farmerName || (session.user ? session.user.name : ""));
    setVal(this.stateVal, profile.state);
    setVal(this.districtVal, profile.district);
    setVal(this.cropVal, profile.primaryCrop);
    setVal(this.stageVal, profile.growthStage);
    setVal(this.soilVal, profile.soilType);
    setVal(this.phVal, profile.soilPh ? `${profile.soilPh} pH` : null, "", "Not set");
    
    // Truthful manual soil moisture representation (never sensor/IoT)
    const moistureValue = profile.manualSoilMoisture !== undefined && profile.manualSoilMoisture !== null && String(profile.manualSoilMoisture).trim() !== ""
      ? `${profile.manualSoilMoisture}% (Manual)`
      : null;
    setVal(this.moistureVal, moistureValue, "", "Not entered");

    setVal(this.acresVal, profile.farmSizeAcres, " Acres");

    // Deterministic Profile Completion Indicator
    this.updateCompletionIndicator(profile);
  },

  updateCompletionIndicator(profile) {
    if (!this.completionBadge) return;

    const hasCore = Boolean(profile.farmName && profile.primaryCrop && profile.district);
    const hasField = Boolean(profile.soilType || profile.soilPh || (profile.manualSoilMoisture !== undefined && profile.manualSoilMoisture !== ""));

    const textEl = this.completionBadge.querySelector(".completion-text");

    if (hasCore && hasField) {
      if (textEl) textEl.textContent = "Detailed Profile Complete";
      this.completionBadge.className = "profile-completion-badge complete";
    } else if (hasCore) {
      if (textEl) textEl.textContent = "Basic Profile Complete";
      this.completionBadge.className = "profile-completion-badge basic";
    } else {
      if (textEl) textEl.textContent = "Profile Incomplete";
      this.completionBadge.className = "profile-completion-badge incomplete";
    }
  },

  enterEditMode() {
    this.isEditing = true;
    const profile = AgriAuth.getFarmProfile();
    const session = AgriAuth.getState();

    if (this.inputFarmer) this.inputFarmer.value = profile.farmerName || (session.user ? session.user.name : "");
    if (this.inputFarm) this.inputFarm.value = profile.farmName || "";
    if (this.selectState) this.selectState.value = profile.state || "";
    if (this.inputDistrict) this.inputDistrict.value = profile.district || "";
    if (this.selectCrop) this.selectCrop.value = profile.primaryCrop || "";
    if (this.selectStage) this.selectStage.value = profile.growthStage || "";
    if (this.selectSoil) this.selectSoil.value = profile.soilType || "";
    if (this.inputPh) this.inputPh.value = profile.soilPh || "";
    if (this.inputMoisture) {
      this.inputMoisture.value = profile.manualSoilMoisture !== undefined && profile.manualSoilMoisture !== null
        ? profile.manualSoilMoisture
        : "";
    }
    if (this.inputAcres) this.inputAcres.value = profile.farmSizeAcres || "";

    if (this.viewModeEl) this.viewModeEl.classList.add("hidden");
    if (this.editModeEl) this.editModeEl.classList.remove("hidden");

    // Scroll to top of edit container smoothly
    if (this.editModeEl) {
      this.editModeEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  },

  cancelEdit() {
    this.isEditing = false;
    if (this.viewModeEl) this.viewModeEl.classList.remove("hidden");
    if (this.editModeEl) this.editModeEl.classList.add("hidden");
  },

  saveProfile() {
    const farmName = this.inputFarm ? this.inputFarm.value.trim() : "";
    const farmerName = this.inputFarmer ? this.inputFarmer.value.trim() : "";
    const state = this.selectState ? this.selectState.value.trim() : "";
    const district = this.inputDistrict ? this.inputDistrict.value.trim() : "";
    const primaryCrop = this.selectCrop ? this.selectCrop.value.trim() : "";
    const growthStage = this.selectStage ? this.selectStage.value.trim() : "";
    const soilType = this.selectSoil ? this.selectSoil.value.trim() : "";
    const ph = this.inputPh ? this.inputPh.value.trim() : "";
    const moisture = this.inputMoisture ? this.inputMoisture.value.trim() : "";
    const acres = this.inputAcres ? this.inputAcres.value.trim() : "";

    // 1. Validation: Farm Name
    if (!farmName) {
      AgriUI.showToast("Please enter your farm or land name.", "warning");
      if (this.inputFarm) this.inputFarm.focus();
      return;
    }

    // 2. Validation: Primary Crop
    if (!primaryCrop) {
      AgriUI.showToast("Please select your primary crop.", "warning");
      if (this.selectCrop) this.selectCrop.focus();
      return;
    }

    // 3. Validation: Soil pH (if provided: 0.0 - 14.0)
    let parsedPh = null;
    if (ph) {
      const numPh = parseFloat(ph);
      if (isNaN(numPh) || numPh < 0 || numPh > 14) {
        AgriUI.showToast("Soil pH must be a valid number between 0.0 and 14.0.", "warning");
        if (this.inputPh) this.inputPh.focus();
        return;
      }
      parsedPh = numPh;
    }

    // 4. Validation: Soil Moisture (if provided: 0% - 100%)
    let parsedMoisture = null;
    if (moisture !== "") {
      const numMoisture = parseFloat(moisture);
      if (isNaN(numMoisture) || numMoisture < 0 || numMoisture > 100) {
        AgriUI.showToast("Soil moisture must be a percentage between 0% and 100%.", "warning");
        if (this.inputMoisture) this.inputMoisture.focus();
        return;
      }
      parsedMoisture = numMoisture;
    }

    // 5. Validation: Farm Size (if provided: > 0)
    let parsedAcres = null;
    if (acres) {
      const numAcres = parseFloat(acres);
      if (isNaN(numAcres) || numAcres <= 0) {
        AgriUI.showToast("Farm size must be a positive number of acres.", "warning");
        if (this.inputAcres) this.inputAcres.focus();
        return;
      }
      parsedAcres = numAcres;
    }

    AgriUI.setButtonLoading(this.btnSaveEdit, true, "Saving...");

    AgriAuth.saveFarmProfile({
      farmName,
      farmerName: farmerName || farmName,
      state: state || null,
      district: district || null,
      primaryCrop,
      growthStage: growthStage || null,
      soilType: soilType || null,
      soilPh: parsedPh !== null ? parsedPh : null,
      manualSoilMoisture: parsedMoisture !== null ? parsedMoisture : null,
      farmSizeAcres: parsedAcres !== null ? parsedAcres : null
    });

    AgriUI.setButtonLoading(this.btnSaveEdit, false);
    this.cancelEdit();
    this.render();

    AgriUI.showToast("Farm profile updated.", "success");

    // Synchronize with Dashboard Command Center
    if (window.AgriDashboard && typeof AgriDashboard.render === "function") {
      AgriDashboard.render();
    }

    // Synchronize manual soil moisture with Smart Irrigation card if available
    if (parsedMoisture !== null) {
      const soilMoistureInput = document.getElementById("soil-moisture-input");
      if (soilMoistureInput && !soilMoistureInput.value) {
        soilMoistureInput.value = parsedMoisture;
      }
    }

    // Synchronize with Assistant active context if loaded
    if (window.AgriApp && window.AgriApp.assistantCard && typeof window.AgriApp.assistantCard.renderContextSnapshot === "function") {
      const ctx = window.AgriApp.assistantCard.gatherActiveContext();
      const sidebarSnapshot = document.getElementById("assistant-context-snapshot");
      if (sidebarSnapshot) {
        sidebarSnapshot.innerHTML = window.AgriApp.assistantCard.renderContextSnapshot(ctx);
      }
    }
  }
};

window.AgriMyFarm = AgriMyFarm;
