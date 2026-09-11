/**
 * AgriSmart AI - Global UI Component System
 * Provides standardized toast notifications, empty states, error containers,
 * loading skeletons, button states, and consistent SVG icons.
 */
const AgriUI = {
  // Common SVG icon templates
  ICONS: {
    checkCircle: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    alertCircle: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    alertTriangle: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    sprout: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"></path><path d="M10 20c5.5-2.5.8-6.4 3-10"></path><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"></path><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"></path></svg>`,
    microscope: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h8"></path><path d="M3 22h18"></path><path d="M14 22a7 7 0 1 0 0-14h-1"></path><path d="M9 14h2"></path><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"></path><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"></path></svg>`,
    cloudSun: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="M20 12h2"></path><path d="m19.07 4.93-1.41 1.41"></path><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"></path><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"></path></svg>`,
    droplets: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"></path><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"></path></svg>`,
    leaf: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg>`,
    bot: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>`,
    refresh: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>`
  },

  /**
   * Display a floating toast notification
   * @param {string} message - Text to show
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number} duration - Milliseconds before auto-dismiss
   */
  showToast(message, type = "info", duration = 4000) {
    let container = document.getElementById("agri-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "agri-toast-container";
      container.className = "toast-container";
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast-item toast-${type}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");

    let icon = this.ICONS.info;
    if (type === "success") icon = this.ICONS.checkCircle;
    else if (type === "error") icon = this.ICONS.alertCircle;
    else if (type === "warning") icon = this.ICONS.alertTriangle;

    toast.innerHTML = `
      <div class="toast-icon-wrap">${icon}</div>
      <div class="toast-content">${escapeHTML(message)}</div>
      <button type="button" class="toast-close" aria-label="Dismiss notification">
        ${this.ICONS.close}
      </button>
    `;

    const closeBtn = toast.querySelector(".toast-close");
    const removeToast = () => {
      toast.classList.add("toast-leaving");
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    };

    if (closeBtn) closeBtn.addEventListener("click", removeToast);

    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(removeToast, duration);
    }
  },

  /**
   * Render a standardized empty state card
   */
  renderEmptyState({ icon, title, description, actionText, actionId, actionCallback }) {
    const card = document.createElement("div");
    card.className = "empty-state-card";

    card.innerHTML = `
      <div class="empty-state-icon">${icon || this.ICONS.sprout}</div>
      <h3 class="empty-state-title">${escapeHTML(title)}</h3>
      <p class="empty-state-desc">${escapeHTML(description)}</p>
      ${actionText ? `<button type="button" class="btn btn-primary empty-state-btn" id="${actionId || 'empty-state-action'}">${escapeHTML(actionText)}</button>` : ""}
    `;

    if (actionText && typeof actionCallback === "function") {
      const btn = card.querySelector(".empty-state-btn");
      if (btn) btn.addEventListener("click", actionCallback);
    }

    return card;
  },

  /**
   * Render a standardized error card with a retry option
   */
  renderErrorState({ title = "Unable to load information", message = "We could not load this information right now. Please check your connection and try again.", retryCallback }) {
    const card = document.createElement("div");
    card.className = "error-state-card";

    card.innerHTML = `
      <div class="error-state-icon">${this.ICONS.alertTriangle}</div>
      <h3 class="error-state-title">${escapeHTML(title)}</h3>
      <p class="error-state-desc">${escapeHTML(message)}</p>
      ${retryCallback ? `<button type="button" class="btn btn-secondary error-retry-btn">${this.ICONS.refresh} <span>Try Again</span></button>` : ""}
    `;

    if (typeof retryCallback === "function") {
      const btn = card.querySelector(".error-retry-btn");
      if (btn) btn.addEventListener("click", retryCallback);
    }

    return card;
  },

  /**
   * Set button loading spinner state
   */
  setButtonLoading(btn, isLoading, loadingText = "Please wait...") {
    if (!btn) return;
    if (isLoading) {
      btn.dataset.originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add("btn-loading");
      btn.innerHTML = `<span class="spinner-small" aria-hidden="true"></span> <span>${escapeHTML(loadingText)}</span>`;
    } else {
      btn.disabled = false;
      btn.classList.remove("btn-loading");
      if (btn.dataset.originalHtml) {
        btn.innerHTML = btn.dataset.originalHtml;
        delete btn.dataset.originalHtml;
      }
    }
  },

  /**
   * Generates a skeleton placeholder card
   */
  createSkeletonCard() {
    const div = document.createElement("div");
    div.className = "skeleton-card";
    div.innerHTML = `
      <div class="skeleton-line skeleton-title"></div>
      <div class="skeleton-line skeleton-text"></div>
      <div class="skeleton-line skeleton-text short"></div>
    `;
    return div;
  }
};

function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

window.AgriUI = AgriUI;
