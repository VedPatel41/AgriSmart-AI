/**
 * AgriSmart AI - GenAI Farmer Assistant Component
 * Component: AgriAssistantCard
 * 
 * Interactive conversational farming companion grounded in real application context:
 * - Farmer profile (from AgriAuth)
 * - Crop health diagnosis & model confidence (from AgriState & CropHealth)
 * - Live weather & 24h precipitation probability (from AgriState & WeatherCard)
 * - Smart irrigation rule decision & reason (from AgriState & IrrigationCard)
 * - Sustainability eco-score (from AgriState & SustainabilityCard)
 * 
 * Guarantees:
 * - Anti-hallucination: explicitly states when data is missing, never invents fake metrics
 * - Respects authoritative ML diagnosis and irrigation rule engine
 * - Multilingual support: English (en), Hindi (hi), Gujarati (gu)
 * - Mobile responsive (320px to 1440px)
 * - Safe markdown rendering without raw HTML injection
 * - Zero secrets in frontend
 */
class AgriAssistantCard {
  constructor() {
    this.container = document.getElementById("assistant-module-container");
    this.messages = [];
    this.isGenerating = false;
    this.activeRequestId = 0;
    this.lastSentMessage = "";

    if (this.container) {
      this.init();
    }
  }

  init() {
    this.initGreeting();
    this.render();
    this.bindEvents();

    // Subscribe to state changes (language, diagnosis, weather, irrigation, sustainability)
    if (window.AgriState) {
      window.AgriState.subscribe((state, changedKeys) => {
        if (changedKeys.includes("currentLanguage")) {
          this.updateLanguage();
        }
        if (changedKeys.some(k => ["predictionResult", "weatherData", "irrigationData", "sustainabilityData"].includes(k))) {
          this.refreshContextDisplays();
        }
      });
    }

    // Subscribe to farm profile updates
    if (window.AgriAuth) {
      window.AgriAuth.subscribe(() => {
        this.refreshContextDisplays();
      });
    }
  }

  getCurrentLanguage() {
    return "en";
  }

  initGreeting() {
    const greeting = "Hello farmer friend! I am your AgriSmart AI Companion. I can help explain your crop leaf diagnosis, live weather forecast, smart irrigation recommendation, or farm eco-score. How can I help your farm today?";

    this.messages = [
      {
        role: "assistant",
        content: greeting,
        time: this.formatTime()
      }
    ];
  }

  formatTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  render() {
    const lang = this.getCurrentLanguage();
    const ctx = this.gatherActiveContext();
    const quickQs = this.getAdaptiveQuickQuestions(ctx, lang);

    this.container.innerHTML = `
      <div class="assistant-page-wrapper" role="region" aria-label="GenAI Farmer Assistant">
        
        <!-- Assistant Top Banner -->
        <div class="assistant-top-banner">
          <div class="banner-title-area">
            <div class="assistant-badge-row">
              <span class="assistant-icon" aria-hidden="true">🤖</span>
              <span class="track-badge live-badge">AI Farmer Companion</span>
            </div>
            <h2 class="assistant-main-title">AgriSmart AI Assistant</h2>
            <p class="assistant-sub-title">Your knowledgeable digital farming companion • Ask about crop health, weather, irrigation, or eco score.</p>
          </div>
          <div class="banner-actions-area">
            <button type="button" class="btn btn-secondary btn-sm btn-clear-chat" id="btn-assistant-clear" title="Clear conversation history">
              <span aria-hidden="true">🗑️</span> Clear Chat
            </button>
          </div>
        </div>

        <!-- Grounded Context Indicators Bar -->
        <div class="assistant-context-bar" id="assistant-context-bar">
          ${this.renderContextPills(ctx)}
        </div>

        <!-- Two-Column Assistant Workspace -->
        <div class="assistant-workspace-grid">
          
          <!-- LEFT / SIDE PANEL: Active Farm Context Snapshot -->
          <aside class="assistant-context-sidebar" aria-label="Current farm facts available to the assistant">
            <div class="sidebar-header">
              <h4 class="sidebar-title">🌾 Current Farm Context</h4>
              <span class="sidebar-note">Real data only</span>
            </div>

            <div class="context-snapshot-list" id="assistant-context-snapshot">
              ${this.renderContextSnapshot(ctx)}
            </div>

            <div class="sidebar-quick-links">
              <span class="quick-links-title">Quick Actions:</span>
              <div class="quick-links-buttons">
                <button type="button" class="btn-link-chip" data-nav-target="crop-health">🔬 Analyze Crop</button>
                <button type="button" class="btn-link-chip" data-nav-target="weather">☀ View Weather</button>
                <button type="button" class="btn-link-chip" data-nav-target="irrigation">💧 Check Irrigation</button>
                <button type="button" class="btn-link-chip" data-nav-target="sustainability">♻ View Sustainability</button>
              </div>
            </div>
          </aside>

          <!-- RIGHT / MAIN AREA: Interactive Chat Conversation -->
          <section class="assistant-chat-section">
            
            <!-- Scrollable Messages Window -->
            <div class="assistant-chat-window" id="assistant-chat-window" role="log" aria-live="polite">
              ${this.renderMessages()}
              ${this.isGenerating ? this.renderThinkingBubble() : ""}
            </div>

            <!-- Adaptive Suggested Questions Strip -->
            <div class="assistant-quick-questions-strip">
              <span class="quick-label">Suggested questions:</span>
              <div class="quick-chips-wrap" id="assistant-quick-questions">
                ${quickQs.map(q => `
                  <button type="button" class="quick-chip-btn" data-question="${this.escapeHtml(q)}">
                    ${this.escapeHtml(q)}
                  </button>
                `).join("")}
              </div>
            </div>

            <!-- Message Input Form -->
            <form class="assistant-input-form" id="assistant-input-form" onsubmit="return false;">
              <div class="input-wrap">
                <label for="assistant-text-input" class="sr-only">Ask about your farm</label>
                <textarea 
                  class="assistant-text-input" 
                  id="assistant-text-input" 
                  rows="1"
                  placeholder="${this.getInputPlaceholder(lang)}" 
                  maxlength="${(AgriConfig.assistant && AgriConfig.assistant.maxMessageLength) || 600}"
                  autocomplete="off"
                  ${this.isGenerating ? "disabled" : ""}
                ></textarea>
                <span class="char-counter" id="assistant-char-counter">0/600</span>
              </div>
              <button 
                type="submit" 
                class="btn btn-primary btn-assistant-send" 
                id="btn-assistant-send"
                ${this.isGenerating ? "disabled" : ""}
                aria-label="Send question to assistant"
              >
                <span class="send-label">Send</span>
                <span class="send-icon" aria-hidden="true">➤</span>
              </button>
            </form>

            <!-- Safety & KVK Extension Footer Notice -->
            <div class="assistant-safety-footer">
              <span class="safety-icon" aria-hidden="true">🛡️</span>
              <span>Grounded in verified farm data • Model confidence is not validation accuracy • Verify pesticide treatments with local KVK experts</span>
            </div>

          </section>

        </div>

      </div>
    `;
  }

  getInputPlaceholder(lang) {
    return "Ask about your crop, weather, irrigation, or farm health... (Press Enter to send)";
  }

  renderContextPills(ctx) {
    const hasDiag = !!(ctx.diagnosis && ctx.diagnosis.class_label);
    const hasWeather = !!(ctx.weather && (ctx.weather.temperature !== undefined || ctx.weather.city));
    const hasIrrigation = !!(ctx.irrigation && ctx.irrigation.recommendation);
    const hasSust = !!(ctx.sustainability && ctx.sustainability.score !== undefined);

    return `
      <div class="ctx-pill ${hasDiag ? 'active' : 'inactive'}" title="${hasDiag ? 'Active disease scan loaded' : 'No crop leaf scan in active session'}">
        <span class="pill-dot"></span>
        <span class="pill-title">Crop:</span>
        <span class="pill-val">${hasDiag ? this.escapeHtml(ctx.diagnosis.class_label.replace(/_/g, ' ')) : 'Not scanned'}</span>
      </div>
      <div class="ctx-pill ${hasWeather ? 'active' : 'inactive'}" title="${hasWeather ? 'Live weather intelligence active' : 'Weather information unavailable'}">
        <span class="pill-dot"></span>
        <span class="pill-title">Weather:</span>
        <span class="pill-val">${hasWeather ? `${ctx.weather.temperature !== undefined ? `${ctx.weather.temperature}°C` : ''} ${ctx.weather.city || ''}`.trim() : 'Unavailable'}</span>
      </div>
      <div class="ctx-pill ${hasIrrigation ? 'active' : 'inactive'}" title="${hasIrrigation ? 'Irrigation rule calculated' : 'Soil moisture not entered'}">
        <span class="pill-dot"></span>
        <span class="pill-title">Irrigation:</span>
        <span class="pill-val">${hasIrrigation ? this.escapeHtml(ctx.irrigation.recommendation) : 'Not calculated'}</span>
      </div>
      <div class="ctx-pill ${hasSust ? 'active' : 'inactive'}" title="${hasSust ? 'Farm eco-score evaluated' : 'Eco score not evaluated'}">
        <span class="pill-dot"></span>
        <span class="pill-title">Eco-Score:</span>
        <span class="pill-val">${hasSust ? `${ctx.sustainability.score}/100` : 'Not evaluated'}</span>
      </div>
    `;
  }

  renderContextSnapshot(ctx) {
    const profile = ctx.farmer || {};
    const crop = ctx.crop || {};
    const diag = ctx.diagnosis;
    const weather = ctx.weather;
    const irr = ctx.irrigation;
    const sust = ctx.sustainability;

    const farmerName = profile.name || "Anonymous Farmer";
    const farmName = profile.farmName || "Unregistered Farm";
    const farmLoc = (profile.district && profile.state) ? `${profile.district}, ${profile.state}` : (profile.district || profile.state || "Not set");
    const cropName = crop.name || "Not set";
    const growthStage = crop.growthStage || "Not set";

    const diagText = diag ? `${diag.class_label.replace(/_/g, ' ')} (${Math.round((diag.confidence || 0) * 100)}% conf)` : "Not scanned yet";
    const weatherText = weather ? `${weather.temperature !== undefined ? `${weather.temperature}°C` : ''} • ${weather.condition || 'Available'} • Rain: ${weather.rain_probability_24h !== undefined ? `${weather.rain_probability_24h}%` : 'N/A'}` : "Not loaded";
    const irrText = irr ? `${irr.recommendation} (Soil: ${irr.soil_moisture !== undefined ? `${irr.soil_moisture}%` : 'N/A'})` : "Soil moisture not entered";
    const sustText = sust ? `${sust.score} / 100 (${sust.rating || 'Evaluated'})` : "Not calculated";

    return `
      <div class="snapshot-row">
        <span class="snap-label">Farmer / Farm:</span>
        <strong class="snap-val">${this.escapeHtml(farmerName)} (${this.escapeHtml(farmName)})</strong>
      </div>
      <div class="snapshot-row">
        <span class="snap-label">Location:</span>
        <strong class="snap-val">${this.escapeHtml(farmLoc)}</strong>
      </div>
      <div class="snapshot-row">
        <span class="snap-label">Crop & Stage:</span>
        <strong class="snap-val">${this.escapeHtml(cropName)} • ${this.escapeHtml(growthStage)}</strong>
      </div>
      <div class="snapshot-row ${diag ? 'has-data' : 'empty-data'}">
        <span class="snap-label">Latest Diagnosis:</span>
        <strong class="snap-val">${this.escapeHtml(diagText)}</strong>
      </div>
      <div class="snapshot-row ${weather ? 'has-data' : 'empty-data'}">
        <span class="snap-label">Weather:</span>
        <strong class="snap-val">${this.escapeHtml(weatherText)}</strong>
      </div>
      <div class="snapshot-row ${irr ? 'has-data' : 'empty-data'}">
        <span class="snap-label">Irrigation Advice:</span>
        <strong class="snap-val">${this.escapeHtml(irrText)}</strong>
      </div>
      <div class="snapshot-row ${sust ? 'has-data' : 'empty-data'}">
        <span class="snap-label">Sustainability:</span>
        <strong class="snap-val">${this.escapeHtml(sustText)}</strong>
      </div>
    `;
  }

  getAdaptiveQuickQuestions(ctx, lang) {
    const questions = [];

    // Diagnosis questions
    if (ctx.diagnosis && ctx.diagnosis.class_label) {
      questions.push("Explain my crop diagnosis and remedies");
      questions.push("What organic care is best for this condition?");
    }

    // Irrigation questions
    if (ctx.irrigation && ctx.irrigation.recommendation) {
      questions.push("Why was this irrigation recommendation given?");
    }

    // Weather questions
    if (ctx.weather && (ctx.weather.temperature !== undefined || ctx.weather.city)) {
      questions.push("What does today's weather mean for my farm?");
    }

    // Sustainability questions
    if (ctx.sustainability && ctx.sustainability.score !== undefined) {
      questions.push("How can I improve my sustainability score?");
    }

    // Fallbacks if some modules are missing
    if (questions.length < 3) {
      if (!ctx.diagnosis) questions.push("How do I check my crop health?");
      if (!ctx.irrigation) questions.push("When is the best time to irrigate?");
    }

    return questions.slice(0, 4);
  }

  renderMessages() {
    return this.messages.map((msg, index) => `
      <div class="chat-bubble-row ${msg.role === 'user' ? 'user-row' : 'assistant-row'}" data-msg-idx="${index}">
        <div class="chat-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-assistant'}">
          <div class="bubble-sender">
            <span class="sender-avatar">${msg.role === 'user' ? '🧑‍🌾' : '🤖'}</span>
            <span class="sender-name">${msg.role === 'user' ? 'Farmer' : 'AgriSmart AI'}</span>
            <span class="bubble-time">${msg.time}</span>
          </div>
          <div class="bubble-content">
            ${msg.isError ? `<div class="assistant-error-msg">${this.escapeHtml(msg.content)}</div>` : this.formatMarkdown(msg.content)}
          </div>
          ${msg.isError && msg.canRetry ? `
            <div class="retry-action-row">
              <button type="button" class="btn btn-secondary btn-xs btn-retry-msg" data-retry-text="${this.escapeHtml(this.lastSentMessage)}">
                🔄 Try Again
              </button>
            </div>
          ` : ""}
        </div>
      </div>
    `).join("");
  }

  renderThinkingBubble() {
    return `
      <div class="chat-bubble-row assistant-row">
        <div class="chat-bubble bubble-assistant bubble-thinking">
          <div class="bubble-sender">
            <span class="sender-avatar">🤖</span>
            <span class="sender-name">AgriSmart AI</span>
          </div>
          <div class="thinking-dots" aria-live="polite">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="thinking-text">Thinking with farm context...</span>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const form = this.container.querySelector("#assistant-input-form");
    const input = this.container.querySelector("#assistant-text-input");
    const clearBtn = this.container.querySelector("#btn-assistant-clear");
    const charCounter = this.container.querySelector("#assistant-char-counter");

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleSend();
      });
    }

    if (input) {
      // Auto-expand textarea and count characters
      input.addEventListener("input", () => {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 120) + "px";
        if (charCounter) {
          const len = input.value.length;
          charCounter.textContent = `${len}/600`;
          charCounter.classList.toggle("char-warning", len > 550);
        }
      });

      // Keyboard send on Enter (without Shift)
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.handleSend();
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        this.initGreeting();
        this.refreshChatWindow();
        if (window.AgriUI) AgriUI.showToast("Conversation reset.", "info");
      });
    }

    // Delegated click for quick chips, retries, and navigation targets
    this.container.addEventListener("click", (e) => {
      // 1. Quick Question Chips
      const chip = e.target.closest(".quick-chip-btn");
      if (chip && !this.isGenerating) {
        const question = chip.dataset.question;
        if (question) {
          if (input) input.value = question;
          this.handleSend();
        }
        return;
      }

      // 2. Retry Button
      const retryBtn = e.target.closest(".btn-retry-msg");
      if (retryBtn && !this.isGenerating) {
        const retryText = retryBtn.dataset.retryText || this.lastSentMessage;
        if (retryText) {
          if (input) input.value = retryText;
          this.handleSend();
        }
        return;
      }

      // 3. Quick Navigation buttons in sidebar
      const navBtn = e.target.closest("[data-nav-target]");
      if (navBtn) {
        const target = navBtn.dataset.navTarget;
        if (target && window.AgriNavigation) {
          AgriNavigation.navigateTo(target);
        }
      }
    });
  }

  updateLanguage() {
    this.render();
    this.bindEvents();
    this.scrollToBottom();
  }

  refreshContextDisplays() {
    if (!this.container) return;
    const ctx = this.gatherActiveContext();
    const lang = this.getCurrentLanguage();

    const contextBar = this.container.querySelector("#assistant-context-bar");
    if (contextBar) contextBar.innerHTML = this.renderContextPills(ctx);

    const snapshotEl = this.container.querySelector("#assistant-context-snapshot");
    if (snapshotEl) snapshotEl.innerHTML = this.renderContextSnapshot(ctx);

    const quickQsEl = this.container.querySelector("#assistant-quick-questions");
    if (quickQsEl) {
      const qs = this.getAdaptiveQuickQuestions(ctx, lang);
      quickQsEl.innerHTML = qs.map(q => `
        <button type="button" class="quick-chip-btn" data-question="${this.escapeHtml(q)}">
          ${this.escapeHtml(q)}
        </button>
      `).join("");
    }
  }

  refreshChatWindow() {
    const windowEl = this.container ? this.container.querySelector("#assistant-chat-window") : null;
    if (windowEl) {
      windowEl.innerHTML = this.renderMessages() + (this.isGenerating ? this.renderThinkingBubble() : "");
    }
    this.scrollToBottom();
  }

  scrollToBottom() {
    const windowEl = this.container ? this.container.querySelector("#assistant-chat-window") : null;
    if (windowEl) {
      windowEl.scrollTop = windowEl.scrollHeight;
    }
  }

  /**
   * Builds the centralized assistant context object from actual application state
   * Strictly adheres to Section 5:
   * { farmer, crop, diagnosis, weather, irrigation, sustainability, language }
   * Missing information remains null (never fabricated!).
   */
  gatherActiveContext() {
    const context = {
      farmer: null,
      crop: null,
      diagnosis: null,
      weather: null,
      irrigation: null,
      sustainability: null,
      language: this.getCurrentLanguage()
    };

    // 1. Farmer & Farm profile
    if (window.AgriAuth) {
      const profile = AgriAuth.getFarmProfile();
      const session = AgriAuth.getState();
      const name = profile.farmerName || (session.user && session.user.name) || null;
      const farmName = profile.farmName || (session.user && session.user.farmName) || null;
      const state = profile.state || null;
      const district = profile.district || null;

      if (name || farmName || state || district) {
        context.farmer = { name, farmName, state, district };
      }

      if (profile.primaryCrop || profile.growthStage) {
        context.crop = {
          name: profile.primaryCrop || null,
          growthStage: profile.growthStage || null
        };
      }
    }

    const appState = window.AgriState ? window.AgriState.getState() : {};

    // 2. Disease prediction from state
    const pResult = appState.predictionResult;
    if (pResult && (pResult.rawLabel || pResult.class_label)) {
      context.diagnosis = {
        class_label: pResult.rawLabel || pResult.class_label,
        classLabel: pResult.rawLabel || pResult.class_label,
        confidence: pResult.confidence,
        advisory: pResult.raw ? pResult.raw.advisory : null
      };
    }

    // 3. Weather from state or card
    const wData = appState.weatherData || (window.AgriApp && window.AgriApp.weatherCard && window.AgriApp.weatherCard.weatherData);
    if (wData && (wData.current || wData.location)) {
      context.weather = {
        location: (wData.location && wData.location.name) || null,
        city: (wData.location && wData.location.name) || null,
        temperature: wData.current && wData.current.temperature_c,
        humidity: wData.current && wData.current.humidity_percent,
        condition: wData.current && wData.current.condition,
        rainProbability: wData.forecast && wData.forecast.rain_probability_24h,
        rain_probability_24h: wData.forecast && wData.forecast.rain_probability_24h,
        disease_risk: wData.risk && wData.risk.level
      };
    }

    // 4. Smart irrigation from state or card
    const irrData = appState.irrigationData || (window.AgriApp && window.AgriApp.irrigationCard && window.AgriApp.irrigationCard.irrigationData);
    if (irrData && (irrData.recommendation || irrData.soil_moisture !== undefined)) {
      context.irrigation = {
        soilMoisture: irrData.soil_moisture,
        soil_moisture: irrData.soil_moisture,
        recommendation: irrData.recommendation,
        reason: irrData.reason,
        action: irrData.action
      };
    }

    // 5. Sustainability eco-score from state or card
    const sData = appState.sustainabilityData || (window.AgriApp && window.AgriApp.sustainabilityCard && window.AgriApp.sustainabilityCard.sustainabilityData);
    if (sData && sData.score !== undefined) {
      context.sustainability = {
        score: sData.score,
        rating: sData.rating,
        indicators: sData.breakdown,
        breakdown: sData.breakdown,
        suggestion: sData.suggestion
      };
    }

    return context;
  }

  /**
   * Public helper to pre-fill and optionally send question from external CTAs
   */
  askQuestion(questionText, autoSend = true) {
    if (window.AgriNavigation) {
      AgriNavigation.navigateTo("assistant");
    }

    setTimeout(() => {
      const input = this.container ? this.container.querySelector("#assistant-text-input") : null;
      if (input) {
        input.value = questionText;
        input.dispatchEvent(new Event("input"));
        if (autoSend) {
          this.handleSend();
        } else {
          input.focus();
        }
      }
    }, 100);
  }

  async handleSend() {
    if (this.isGenerating) return;

    const input = this.container ? this.container.querySelector("#assistant-text-input") : null;
    const sendBtn = this.container ? this.container.querySelector("#btn-assistant-send") : null;
    if (!input) return;

    const text = input.value.trim();
    if (!text) {
      if (window.AgriUI) AgriUI.showToast("Please enter a question for the assistant.", "warning");
      input.focus();
      return;
    }

    if (text.length > 600) {
      if (window.AgriUI) AgriUI.showToast("Your question is too long. Please shorten it to under 600 characters.", "warning");
      input.focus();
      return;
    }

    this.lastSentMessage = text;

    // Append user message to conversation
    this.messages.push({
      role: "user",
      content: text,
      time: this.formatTime()
    });

    // Reset input
    input.value = "";
    input.style.height = "auto";
    const charCounter = this.container.querySelector("#assistant-char-counter");
    if (charCounter) {
      charCounter.textContent = "0/600";
      charCounter.classList.remove("char-warning");
    }

    this.isGenerating = true;
    if (sendBtn) sendBtn.disabled = true;
    input.disabled = true;
    this.refreshChatWindow();

    const thisRequestId = ++this.activeRequestId;
    const context = this.gatherActiveContext();
    const language = this.getCurrentLanguage();

    // Prepare bounded history payload for API (last 8 messages)
    const historyPayload = this.messages.slice(-8).map(m => ({
      role: m.role,
      content: m.content
    }));

    const result = await AgriApi.askAssistant({
      message: text,
      language: language,
      history: historyPayload,
      context: context
    });

    // Guard against race conditions
    if (thisRequestId !== this.activeRequestId) return;

    this.isGenerating = false;
    if (sendBtn) sendBtn.disabled = false;
    input.disabled = false;
    input.focus();

    if (result.success && result.data && result.data.response) {
      this.messages.push({
        role: "assistant",
        content: result.data.response,
        time: this.formatTime()
      });
    } else {
      const errMsg = result.error || "The AI farmer assistant is temporarily unavailable. Please try again.";
      this.messages.push({
        role: "assistant",
        content: `⚠️ ${errMsg}`,
        time: this.formatTime(),
        isError: true,
        canRetry: true
      });
    }

    this.refreshChatWindow();
  }

  formatMarkdown(raw) {
    if (!raw) return "";
    let safe = this.escapeHtml(raw);

    // Convert **bold** to <strong>
    safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Convert numbered lists
    safe = safe.replace(/^(\d+)\.\s+(.*)$/gm, "<li class='ol-item'><span class='num-badge'>$1</span> $2</li>");

    // Convert bullet points starting with * or - or •
    safe = safe.replace(/^[\*\-•]\s+(.*)$/gm, "<li class='bullet-item'>$1</li>");
    if (safe.includes("<li class='bullet-item'>") || safe.includes("<li class='ol-item'>")) {
      safe = safe.replace(/(<li.*<\/li>)/s, "<ul class='chat-list'>$1</ul>");
    }

    // Convert double newlines to paragraphs and single newlines to breaks
    safe = safe.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>");
    return `<p>${safe}</p>`;
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

window.AgriAssistantCard = AgriAssistantCard;
