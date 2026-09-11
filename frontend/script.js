/**
 * AgriSmart AI — Main Bootstrap & Controller (Part 1 Foundation)
 * Initializes Auth, Onboarding, Navigation, UI system, i18n, and Backend Connectivity.
 */

document.addEventListener("DOMContentLoaded", () => {
  console.log("AgriSmart AI — Initializing Part 1 Foundation...");

  // 1. Initialize Regional Language Engine
  initLanguage();

  // 2. Initialize Backend Connectivity Check
  initBackendStatus();

  // 3. Initialize Auth Forms & Listeners
  initAuthForms();

  // 4. Initialize Onboarding Wizard
  AgriOnboarding.init();

  // 5. Initialize Smart Farming & Core Modules
  let weatherCardInstance = null;
  let irrigationCardInstance = null;
  let sustainabilityCardInstance = null;
  let assistantCardInstance = null;

  if (window.AgriWeatherCard) {
    weatherCardInstance = new AgriWeatherCard();
  }
  if (window.AgriIrrigationCard) {
    irrigationCardInstance = new AgriIrrigationCard();
  }
  if (window.AgriSustainabilityCard) {
    sustainabilityCardInstance = new AgriSustainabilityCard();
  }
  if (window.AgriAssistantCard) {
    assistantCardInstance = new AgriAssistantCard();
  }

  if (window.AgriDashboard) AgriDashboard.init();
  if (window.AgriMyFarm) AgriMyFarm.init();
  if (window.AgriCropHealth) AgriCropHealth.init();

  // 6. Initialize Navigation & Shell
  AgriNavigation.init();

  // Expose global app handle
  window.AgriApp = {
    auth: AgriAuth,
    ui: AgriUI,
    onboarding: AgriOnboarding,
    navigation: AgriNavigation,
    dashboard: window.AgriDashboard,
    myFarm: window.AgriMyFarm,
    cropHealth: window.AgriCropHealth,
    weatherCard: weatherCardInstance,
    irrigationCard: irrigationCardInstance,
    sustainabilityCard: sustainabilityCardInstance,
    assistantCard: assistantCardInstance,
    history: window.AgriHistory,
    state: window.AgriState,
    i18n: AgriI18n,
    config: window.AgriConfig || { apiBaseUrl: "http://localhost:5000" }
  };

  console.log("AgriSmart AI — Part 1, 2, 3 & 4 AI Assistant initialized successfully.");
});

/**
/**
 * Ensures permanent English language initialization across the interface
 */
function initLanguage() {
  try {
    localStorage.setItem("agrismart_lang_pref", "en");
  } catch (e) {}

  if (window.AgriI18n) {
    AgriI18n.applyLanguage("en");
  }
}

/**
 * Checks backend health asynchronously and updates the status pill
 */
async function initBackendStatus() {
  const statusPill = document.getElementById("api-status-pill");
  const statusText = document.getElementById("api-status-text");

  const setStatus = (isOnline) => {
    if (!statusPill || !statusText) return;
    statusPill.classList.remove("status-checking");
    if (isOnline) {
      statusPill.classList.add("is-online");
      statusPill.classList.remove("is-offline");
      statusText.textContent = "Connected";
    } else {
      statusPill.classList.add("is-offline");
      statusPill.classList.remove("is-online");
      statusText.textContent = "Offline";
    }
  };

  try {
    const baseUrl = (window.AgriConfig && window.AgriConfig.apiBaseUrl) || "";
    const healthPath = (window.AgriConfig && window.AgriConfig.endpoints && window.AgriConfig.endpoints.health) || "/health";
    const res = await fetch(`${baseUrl}${healthPath}`, { method: "GET", cache: "no-cache" });
    if (res.ok) {
      const data = await res.json();
      setStatus(data && (data.status === "ok" || data.status === "healthy"));
    } else {
      setStatus(false);
    }
  } catch (err) {
    // Silent fail gracefully without freezing application
    setStatus(false);
  }
}

/**
 * Binds Login, Signup, Password Toggles, and Demo Session actions
 */
function initAuthForms() {
  // Helper to bind show/hide password toggles
  const bindPasswordToggle = (toggleBtnId, inputId) => {
    const btn = document.getElementById(toggleBtnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    btn.addEventListener("click", () => {
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";

      const eyeIcon = btn.querySelector(".icon-eye");
      const eyeOffIcon = btn.querySelector(".icon-eye-off");

      if (eyeIcon && eyeOffIcon) {
        if (isPassword) {
          eyeIcon.classList.add("hidden");
          eyeOffIcon.classList.remove("hidden");
          btn.setAttribute("aria-label", "Hide password");
        } else {
          eyeIcon.classList.remove("hidden");
          eyeOffIcon.classList.add("hidden");
          btn.setAttribute("aria-label", "Show password");
        }
      }
      input.focus();
    });
  };

  bindPasswordToggle("btn-toggle-login-pass", "login-password");
  bindPasswordToggle("btn-toggle-signup-pass", "signup-password");
  bindPasswordToggle("btn-toggle-confirm-pass", "signup-confirm-password");

  // 1. Login Form Submit
  const loginForm = document.getElementById("form-login");
  const btnLoginSubmit = document.getElementById("btn-login-submit");
  const loginIdInput = document.getElementById("login-identifier");
  const loginPassInput = document.getElementById("login-password");
  const loginIdErr = document.getElementById("login-identifier-error");
  const loginPassErr = document.getElementById("login-password-error");

  const clearLoginErrors = () => {
    if (loginIdErr) { loginIdErr.textContent = ""; loginIdErr.classList.add("hidden"); }
    if (loginPassErr) { loginPassErr.textContent = ""; loginPassErr.classList.add("hidden"); }
    if (loginIdInput) loginIdInput.classList.remove("is-error");
    if (loginPassInput) loginPassInput.classList.remove("is-error");
  };

  if (loginIdInput) {
    loginIdInput.addEventListener("input", () => {
      if (loginIdErr) loginIdErr.classList.add("hidden");
      loginIdInput.classList.remove("is-error");
    });
  }
  if (loginPassInput) {
    loginPassInput.addEventListener("input", () => {
      if (loginPassErr) loginPassErr.classList.add("hidden");
      loginPassInput.classList.remove("is-error");
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearLoginErrors();

      const identifier = loginIdInput ? loginIdInput.value.trim() : "";
      const password = loginPassInput ? loginPassInput.value : "";

      let hasError = false;
      if (!identifier) {
        if (loginIdErr) { loginIdErr.textContent = "Please enter your email or 10-digit mobile number."; loginIdErr.classList.remove("hidden"); }
        if (loginIdInput) loginIdInput.classList.add("is-error");
        hasError = true;
      }
      if (!password) {
        if (loginPassErr) { loginPassErr.textContent = "Please enter your password."; loginPassErr.classList.remove("hidden"); }
        if (loginPassInput) loginPassInput.classList.add("is-error");
        hasError = true;
      } else if (password.length < 6) {
        if (loginPassErr) { loginPassErr.textContent = "Password must be at least 6 characters long."; loginPassErr.classList.remove("hidden"); }
        if (loginPassInput) loginPassInput.classList.add("is-error");
        hasError = true;
      }

      if (hasError) return;

      AgriUI.setButtonLoading(btnLoginSubmit, true, "Signing in...");
      const result = await AgriAuth.login({ identifier, password });
      AgriUI.setButtonLoading(btnLoginSubmit, false);

      if (result.success) {
        AgriUI.showToast(`Welcome back, ${result.user.name}!`, "success");
        if (result.needsOnboarding && window.AgriOnboarding) {
          window.AgriOnboarding.open({ startStep: 1 });
        }
      } else {
        const errorMsg = result.error || "We couldn't sign you in. Please check your credentials and try again.";
        if (loginPassErr) {
          loginPassErr.textContent = errorMsg;
          loginPassErr.classList.remove("hidden");
        }
        if (loginPassInput) loginPassInput.classList.add("is-error");
        AgriUI.showToast(errorMsg, "error");
      }
    });
  }

  // 2. Demo Login Button
  const btnDemoLogin = document.getElementById("btn-demo-login");
  if (btnDemoLogin) {
    btnDemoLogin.addEventListener("click", async () => {
      AgriUI.setButtonLoading(btnDemoLogin, true, "Loading demo...");
      const result = await AgriAuth.login({ isDemo: true });
      AgriUI.setButtonLoading(btnDemoLogin, false);

      if (result.success) {
        AgriUI.showToast("Logged in as Demo Farmer (Ramesh Patel).", "success");
      }
    });
  }

  // 3. Signup Form Submit
  const signupForm = document.getElementById("form-signup");
  const btnSignupSubmit = document.getElementById("btn-signup-submit");
  const nameInput = document.getElementById("signup-name");
  const signIdInput = document.getElementById("signup-identifier");
  const farmInput = document.getElementById("signup-farm");
  const passInput = document.getElementById("signup-password");
  const confirmInput = document.getElementById("signup-confirm-password");

  const nameErr = document.getElementById("signup-name-error");
  const idErr = document.getElementById("signup-identifier-error");
  const passErr = document.getElementById("signup-password-error");
  const confirmErr = document.getElementById("signup-confirm-password-error");

  const clearSignupErrors = () => {
    [nameErr, idErr, passErr, confirmErr].forEach(el => {
      if (el) { el.textContent = ""; el.classList.add("hidden"); }
    });
    [nameInput, signIdInput, passInput, confirmInput].forEach(el => {
      if (el) el.classList.remove("is-error");
    });
  };

  [nameInput, signIdInput, passInput, confirmInput].forEach(inp => {
    if (inp) {
      inp.addEventListener("input", () => {
        inp.classList.remove("is-error");
      });
    }
  });

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearSignupErrors();

      const fullName = nameInput ? nameInput.value.trim() : "";
      const identifier = signIdInput ? signIdInput.value.trim() : "";
      const farmName = farmInput ? farmInput.value.trim() : "";
      const password = passInput ? passInput.value : "";
      const confirmPassword = confirmInput ? confirmInput.value : "";

      let hasError = false;

      if (!fullName || fullName.length < 2) {
        if (nameErr) { nameErr.textContent = "Please enter your full name (minimum 2 characters)."; nameErr.classList.remove("hidden"); }
        if (nameInput) nameInput.classList.add("is-error");
        hasError = true;
      }

      const isEmail = identifier.includes("@") && identifier.includes(".");
      const isPhone = /^\d{10}$/.test(identifier.replace(/\D/g, ""));
      if (!identifier || (!isEmail && !isPhone)) {
        if (idErr) { idErr.textContent = "Please enter a valid email address or 10-digit mobile number."; idErr.classList.remove("hidden"); }
        if (signIdInput) signIdInput.classList.add("is-error");
        hasError = true;
      }

      if (!password || password.length < 6) {
        if (passErr) { passErr.textContent = "Password must be at least 6 characters."; passErr.classList.remove("hidden"); }
        if (passInput) passInput.classList.add("is-error");
        hasError = true;
      }

      if (password !== confirmPassword) {
        if (confirmErr) { confirmErr.textContent = "Passwords do not match."; confirmErr.classList.remove("hidden"); }
        if (confirmInput) confirmInput.classList.add("is-error");
        hasError = true;
      }

      if (hasError) return;

      AgriUI.setButtonLoading(btnSignupSubmit, true, "Creating farm account...");
      const result = await AgriAuth.signup({
        fullName,
        identifier,
        password,
        confirmPassword,
        farmName
      });
      AgriUI.setButtonLoading(btnSignupSubmit, false);

      if (result.success) {
        AgriUI.showToast("Account created successfully! Welcome to AgriSmart.", "success");
        // Open farmer onboarding modal wizard to complete setup
        if (window.AgriOnboarding) {
          window.AgriOnboarding.open({ startStep: 1 });
        }
      } else {
        if (idErr) {
          idErr.textContent = result.error || "Signup could not be completed.";
          idErr.classList.remove("hidden");
        }
        AgriUI.showToast(result.error || "Signup error.", "error");
      }
    });
  }
}
