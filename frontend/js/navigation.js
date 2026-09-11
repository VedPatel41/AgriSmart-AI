/**
 * AgriSmart AI - Navigation & Shell Controller
 * Manages routing between Auth and App Shell, sidebar page navigation,
 * mobile drawer toggle, profile dropdown, and breadcrumb updates.
 */
const AgriNavigation = {
  activeView: "overview",
  isMobileSidebarOpen: false,

  VIEW_TITLES: {
    overview: "Farm Overview",
    "my-farm": "My Farm",
    "crop-health": "Crop Health",
    weather: "Weather Intelligence",
    irrigation: "Smart Irrigation",
    sustainability: "Sustainability & Eco-Score",
    assistant: "Farmer Assistant",
    settings: "Settings & Preferences"
  },

  init() {
    this.bindSidebarLinks();
    this.bindMobileMenu();
    this.bindProfileMenu();
    this.bindAuthTabs();
    this.bindHashRouting();

    // Listen to authentication state changes
    AgriAuth.subscribe(state => this.handleAuthStateChange(state));

    // Initial auth check
    const initialAuth = AgriAuth.getState();
    this.handleAuthStateChange(initialAuth);
  },

  handleAuthStateChange(state) {
    const authContainer = document.getElementById("auth-view");
    const appShell = document.getElementById("app-shell");

    if (!authContainer || !appShell) return;

    if (state.isAuthenticated) {
      authContainer.classList.add("hidden");
      appShell.classList.remove("hidden");

      // Update header profile display
      this.updateHeaderProfile(state.user, state.isDemoUser);

      // Check if onboarding is needed
      if (!AgriAuth.hasCompletedOnboarding() && !state.isDemoUser) {
        if (window.AgriOnboarding) {
          window.AgriOnboarding.open();
        }
      }

      // Check current hash or navigate to overview
      const hash = window.location.hash.replace("#", "") || "overview";
      this.navigateTo(hash);
    } else {
      appShell.classList.add("hidden");
      authContainer.classList.remove("hidden");
      this.closeMobileSidebar();
    }
  },

  navigateTo(pageId) {
    if (!this.VIEW_TITLES[pageId]) {
      pageId = "overview";
    }

    this.activeView = pageId;

    // Update active class on all sidebar and mobile navigation links
    document.querySelectorAll(".nav-link").forEach(link => {
      const target = link.dataset.view;
      if (target === pageId) {
        link.classList.add("nav-link-active");
        link.setAttribute("aria-current", "page");
      } else {
        link.classList.remove("nav-link-active");
        link.removeAttribute("aria-current");
      }
    });

    // Hide all view content sections and show active one
    document.querySelectorAll(".view-section").forEach(sec => {
      if (sec.id === `view-${pageId}`) {
        sec.classList.remove("hidden");
        sec.removeAttribute("aria-hidden");
      } else {
        sec.classList.add("hidden");
        sec.setAttribute("aria-hidden", "true");
      }
    });

    // Update header breadcrumb/title
    const titleEl = document.getElementById("header-page-title");
    if (titleEl) {
      titleEl.textContent = this.VIEW_TITLES[pageId] || "AgriSmart AI";
    }

    // Update hash silently without jump
    if (window.location.hash !== `#${pageId}`) {
      window.history.replaceState(null, "", `#${pageId}`);
    }

    // Trigger page-specific view refreshes (e.g. My Farm data)
    this.refreshActiveView();

    // Auto-close mobile drawer upon navigation
    this.closeMobileSidebar();

    // Scroll main viewport to top
    const mainContent = document.getElementById("main-content-scroll");
    if (mainContent) mainContent.scrollTop = 0;
  },

  refreshActiveView() {
    if (this.activeView === "my-farm") {
      if (window.AgriMyFarm) AgriMyFarm.render();
      else this.renderMyFarmView();
    } else if (this.activeView === "overview") {
      if (window.AgriDashboard) AgriDashboard.render();
      else this.renderOverviewSummary();
    } else if (this.activeView === "crop-health") {
      if (window.AgriCropHealth) {
        AgriCropHealth.syncWithFarmProfile();
        AgriCropHealth.renderHistory();
      }
    } else if (this.activeView === "weather") {
      if (window.AgriApp && window.AgriApp.weatherCard) {
        if (!window.AgriApp.weatherCard.weatherData && window.AgriApp.weatherCard.currentLocation) {
          window.AgriApp.weatherCard.fetchWeather(window.AgriApp.weatherCard.currentLocation);
        }
      }
    } else if (this.activeView === "irrigation") {
      if (window.AgriApp && window.AgriApp.irrigationCard) {
        window.AgriApp.irrigationCard.updateWeatherForecastPreview();
      }
    } else if (this.activeView === "assistant") {
      if (window.AgriApp && window.AgriApp.assistantCard) {
        window.AgriApp.assistantCard.refreshContextDisplays();
        window.AgriApp.assistantCard.scrollToBottom();
      }
    }
  },

  renderOverviewSummary() {
    const profile = AgriAuth.getFarmProfile();
    const session = AgriAuth.getState();

    const welcomeGreeting = document.getElementById("overview-welcome-farmer");
    if (welcomeGreeting) {
      const name = profile.farmerName || (session.user ? session.user.name : "Kisan");
      welcomeGreeting.textContent = `Welcome back, ${name} 👋`;
    }

    const farmMeta = document.getElementById("overview-farm-meta");
    if (farmMeta) {
      const farmName = profile.farmName || "Your Farm";
      const loc = profile.district && profile.state ? `${profile.district}, ${profile.state}` : (profile.state || "Location not set");
      const crop = profile.primaryCrop || "Crop not set";
      farmMeta.textContent = `${farmName} • ${loc} • ${crop}`;
    }
  },

  renderMyFarmView() {
    const profile = AgriAuth.getFarmProfile();
    const session = AgriAuth.getState();

    const setField = (id, val) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = val || "Not set";
        if (!val) {
          el.classList.add("text-muted");
        } else {
          el.classList.remove("text-muted");
        }
      }
    };

    setField("farm-view-name", profile.farmName);
    setField("farm-view-farmer", profile.farmerName || (session.user ? session.user.name : ""));
    setField("farm-view-state", profile.state);
    setField("farm-view-district", profile.district);
    setField("farm-view-crop", profile.primaryCrop);
    setField("farm-view-soil", profile.soilType);
    setField("farm-view-acres", profile.farmSizeAcres ? `${profile.farmSizeAcres} Acres` : "");
  },

  updateHeaderProfile(user, isDemoUser) {
    const nameEl = document.getElementById("header-user-name");
    const farmEl = document.getElementById("header-user-farm");
    const avatarEl = document.getElementById("header-user-avatar");
    const navNameEl = document.getElementById("nav-header-user-name");
    const sideNameEl = document.getElementById("sidebar-user-name");
    const sideFarmEl = document.getElementById("sidebar-user-farm");
    const sideAvatarEl = document.getElementById("sidebar-user-avatar");
    const demoBadge = document.getElementById("header-demo-badge");

    const profile = AgriAuth.getFarmProfile();
    const displayName = (user && (user.farmerName || user.name)) || profile.farmerName || "Farmer";
    const displayFarm = profile.farmName || (user ? user.farmName : "My Farm");
    const initials = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "AS";

    if (nameEl) nameEl.textContent = displayName;
    if (farmEl) farmEl.textContent = displayFarm;
    if (avatarEl) avatarEl.textContent = initials;
    if (navNameEl) navNameEl.textContent = displayName;

    if (sideNameEl) sideNameEl.textContent = displayName;
    if (sideFarmEl) sideFarmEl.textContent = displayFarm;
    if (sideAvatarEl) sideAvatarEl.textContent = initials;

    if (demoBadge) {
      if (isDemoUser) {
        demoBadge.classList.remove("hidden");
      } else {
        demoBadge.classList.add("hidden");
      }
    }
  },

  bindSidebarLinks() {
    document.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        const targetView = link.dataset.view;
        if (targetView) {
          this.navigateTo(targetView);
        }
      });
    });

    // Quick action buttons (e.g. "Analyze a Crop" button on overview)
    document.querySelectorAll("[data-nav-target]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        const target = btn.dataset.navTarget;
        if (target) {
          this.navigateTo(target);
        }
      });
    });

    // Edit farm profile CTA
    const editProfileBtn = document.getElementById("btn-edit-farm-profile");
    if (editProfileBtn) {
      editProfileBtn.addEventListener("click", () => {
        if (window.AgriOnboarding) {
          window.AgriOnboarding.open();
        }
      });
    }

    // Logout buttons
    document.querySelectorAll(".btn-trigger-logout").forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        if (confirm("Are you sure you want to log out of AgriSmart AI?")) {
          AgriAuth.logout();
          if (window.AgriUI) {
            AgriUI.showToast("Logged out successfully.", "info");
          }
        }
      });
    });
  },

  bindMobileMenu() {
    const hamburgerBtn = document.getElementById("btn-mobile-menu");
    const mobileBackdrop = document.getElementById("mobile-sidebar-backdrop");
    const closeBtn = document.getElementById("btn-drawer-close");
    const sidebar = document.getElementById("app-sidebar");

    if (hamburgerBtn && sidebar) {
      hamburgerBtn.addEventListener("click", () => {
        this.toggleMobileSidebar();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this.closeMobileSidebar();
      });
    }

    if (mobileBackdrop) {
      mobileBackdrop.addEventListener("click", () => {
        this.closeMobileSidebar();
      });
    }
  },

  toggleMobileSidebar() {
    const sidebar = document.getElementById("app-sidebar");
    const backdrop = document.getElementById("mobile-sidebar-backdrop");
    if (!sidebar) return;

    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
    if (this.isMobileSidebarOpen) {
      sidebar.classList.add("sidebar-open");
      if (backdrop) backdrop.classList.remove("hidden");
    } else {
      sidebar.classList.remove("sidebar-open");
      if (backdrop) backdrop.classList.add("hidden");
    }
  },

  closeMobileSidebar() {
    const sidebar = document.getElementById("app-sidebar");
    const backdrop = document.getElementById("mobile-sidebar-backdrop");
    if (sidebar) sidebar.classList.remove("sidebar-open");
    if (backdrop) backdrop.classList.add("hidden");
    this.isMobileSidebarOpen = false;
  },

  bindProfileMenu() {
    const profileTrigger = document.getElementById("header-profile-trigger");
    const profileDropdown = document.getElementById("header-profile-dropdown");

    if (profileTrigger && profileDropdown) {
      profileTrigger.addEventListener("click", e => {
        e.stopPropagation();
        const isOpen = !profileDropdown.classList.contains("hidden");
        if (isOpen) {
          profileDropdown.classList.add("hidden");
          profileTrigger.setAttribute("aria-expanded", "false");
        } else {
          profileDropdown.classList.remove("hidden");
          profileTrigger.setAttribute("aria-expanded", "true");
        }
      });

      document.addEventListener("click", e => {
        if (!profileDropdown.contains(e.target) && !profileTrigger.contains(e.target)) {
          profileDropdown.classList.add("hidden");
          profileTrigger.setAttribute("aria-expanded", "false");
        }
      });
    }
  },

  bindAuthTabs() {
    const tabLogin = document.getElementById("tab-login");
    const tabSignup = document.getElementById("tab-signup");
    const formLogin = document.getElementById("form-card-login");
    const formSignup = document.getElementById("form-card-signup");

    if (tabLogin && tabSignup && formLogin && formSignup) {
      tabLogin.addEventListener("click", () => {
        tabLogin.classList.add("auth-tab-active");
        tabSignup.classList.remove("auth-tab-active");
        formLogin.classList.remove("hidden");
        formSignup.classList.add("hidden");
      });

      tabSignup.addEventListener("click", () => {
        tabSignup.classList.add("auth-tab-active");
        tabLogin.classList.remove("auth-tab-active");
        formSignup.classList.remove("hidden");
        formLogin.classList.add("hidden");
      });
    }

    // Switch buttons inside cards (e.g. "Create an account" / "Already have an account? Login")
    const toSignupLink = document.getElementById("link-goto-signup");
    const toLoginLink = document.getElementById("link-goto-login");

    if (toSignupLink) {
      toSignupLink.addEventListener("click", e => {
        e.preventDefault();
        if (tabSignup) tabSignup.click();
      });
    }

    if (toLoginLink) {
      toLoginLink.addEventListener("click", e => {
        e.preventDefault();
        if (tabLogin) tabLogin.click();
      });
    }
  },

  bindHashRouting() {
    window.addEventListener("hashchange", () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && this.VIEW_TITLES[hash] && this.activeView !== hash) {
        this.navigateTo(hash);
      }
    });
  }
};

window.AgriNavigation = AgriNavigation;
