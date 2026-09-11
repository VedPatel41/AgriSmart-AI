/**
 * AgriSmart AI - Analysis History Store
 * Manages session-based crop analysis records.
 * Provides persistence, formatting, and subscription capabilities.
 */
const AgriHistory = {
  STORAGE_KEY: "agrismart_analysis_history_v1",
  listeners: [],

  /**
   * Retrieves stored analysis history
   * @returns {Array<object>}
   */
  getHistory() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn("Could not read analysis history:", e);
    }
    return [];
  },

  /**
   * Returns the most recent analysis record or null
   */
  getLatestRecord() {
    const history = this.getHistory();
    return history.length > 0 ? history[0] : null;
  },

  /**
   * Appends a new analysis record to history
   * @param {object} entry
   */
  addRecord(entry) {
    try {
      const history = this.getHistory();
      const newRecord = {
        id: "ana_" + Date.now(),
        timestamp: new Date().toISOString(),
        timeFormatted: this.formatDate(new Date()),
        crop: entry.crop || "Not specified",
        growthStage: entry.growthStage || "Not specified",
        classLabel: entry.classLabel || "",
        formattedName: entry.formattedName || entry.classLabel || "Unknown Condition",
        confidence: Number(entry.confidence || 0),
        confidencePercentage: Math.round(Number(entry.confidence || 0) * 100),
        isHealthy: Boolean(entry.isHealthy),
        severity: entry.severity || (entry.isHealthy ? "None" : "Moderate"),
        symptoms: entry.symptoms || "",
        advice: entry.advice || "",
        organicCare: entry.organicCare || "",
        chemicalRemedy: entry.chemicalRemedy || ""
      };

      // Keep latest 20 records
      const updated = [newRecord, ...history].slice(0, 20);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));

      this.notify(updated);
      return newRecord;
    } catch (e) {
      console.warn("Could not save analysis record:", e);
      return null;
    }
  },

  /**
   * Clears session analysis history
   */
  clearHistory() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.notify([]);
    } catch (e) {}
  },

  subscribe(callback) {
    if (typeof callback === "function") {
      this.listeners.push(callback);
    }
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  },

  notify(history) {
    this.listeners.forEach(cb => {
      try { cb(history); } catch (e) { console.error(e); }
    });
  },

  formatDate(date) {
    try {
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isToday) {
        return `Today, ${timeStr}`;
      }
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    } catch (e) {
      return date.toISOString();
    }
  }
};

window.AgriHistory = AgriHistory;
