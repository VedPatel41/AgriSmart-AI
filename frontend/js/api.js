/**
 * AgriSmart AI - API Service Layer
 * Encapsulates network communication with the Flask backend.
 * Provides resilient error mapping, timeouts, and request protection.
 */
const AgriApi = {
  /**
   * Check if backend server is responsive
   * @returns {Promise<{online: boolean, data?: object, error?: string}>}
   */
  async checkHealth() {
    const url = `${AgriConfig.apiBaseUrl}${AgriConfig.endpoints.health}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({ status: "ok" }));
        return { online: true, data };
      }
      return { online: false, error: `Server returned HTTP ${res.status}` };
    } catch (err) {
      return {
        online: false,
        error: err.name === "AbortError" ? "Health check timed out" : "Cannot connect to server"
      };
    }
  },

  /**
   * Submit leaf photo to /predict endpoint
   * Expected field name: "image"
   * @param {File} imageFile - The leaf image file to be analyzed
   * @returns {Promise<{success: boolean, data?: object, error?: string, statusCode?: number}>}
   */
  async predictCropDisease(imageFile) {
    if (!imageFile) {
      return { success: false, error: AgriConfig.messages.noFile };
    }

    const url = `${AgriConfig.apiBaseUrl}${AgriConfig.endpoints.predict}`;
    const formData = new FormData();
    // Use the exact field name "image" expected by the backend
    formData.append("image", imageFile);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AgriConfig.network.predictTimeoutMs);

      // Note: Do NOT set Content-Type header manually so the browser sets multipart boundary automatically
      const res = await fetch(url, {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // Parse JSON response safely
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        return {
          success: false,
          statusCode: res.status,
          error: this.mapHttpError(res.status, body)
        };
      }

      // Validate contract shape: { class_label: string, confidence: number }
      if (!body || typeof body.class_label === "undefined" || typeof body.confidence === "undefined") {
        return {
          success: false,
          statusCode: res.status,
          error: "Invalid prediction format received from the crop analysis service."
        };
      }

      return {
        success: true,
        statusCode: res.status,
        data: {
          classLabel: body.class_label,
          confidence: Number(body.confidence),
          raw: body
        }
      };

    } catch (err) {
      if (err.name === "AbortError") {
        return {
          success: false,
          error: AgriConfig.messages.timeout
        };
      }

      // Log technical details safely to console for debugging, but never show raw exception to user
      console.error("Crop prediction network error:", err);

      return {
        success: false,
        error: AgriConfig.messages.offline
      };
    }
  },

  /**
   * Map HTTP error codes to clear, farmer-friendly messages
   * @param {number} statusCode
   * @param {object|null} responseBody
   * @returns {string}
   */
  mapHttpError(statusCode, responseBody) {
    // If backend provided a meaningful human error string, prioritize it for 400
    if (statusCode === 400 && responseBody && typeof responseBody.error === "string") {
      const backendErr = responseBody.error.toLowerCase();
      if (backendErr.includes("unsupported") || backendErr.includes("file type")) {
        return AgriConfig.messages.unsupportedType;
      }
      if (backendErr.includes("too large") || backendErr.includes("max")) {
        return AgriConfig.messages.tooLarge;
      }
      if (backendErr.includes("no image")) {
        return AgriConfig.messages.noFile;
      }
      return responseBody.error;
    }

    switch (statusCode) {
      case 400:
        return "Invalid request. Please check your photo and try again.";
      case 401:
      case 403:
        return "Authorization error while communicating with the analysis service.";
      case 404:
        return "The crop analysis endpoint was not found on the server.";
      case 413:
        return AgriConfig.messages.tooLarge;
      case 415:
        return AgriConfig.messages.unsupportedType;
      case 422:
        return "The image could not be processed. Please try a clearer crop leaf photo.";
      case 429:
        return "Too many requests. Please wait a moment and try again.";
      case 500:
      case 502:
      case 503:
      default:
        return AgriConfig.messages.genericError;
    }
  },

  /**
   * Fetch real weather & crop disease risk intelligence
   * @param {string|{city?: string, lat?: number, lon?: number}} location - City name or geo coords
   * @param {boolean} [bypassCache=false] - Force fresh upstream query
   * @returns {Promise<{success: boolean, data?: object, code?: string, error?: string, statusCode?: number}>}
   */
  async getWeather(location, bypassCache = false) {
    let query = "";
    if (typeof location === "string") {
      const trimmed = location.trim();
      if (!trimmed) {
        return { success: false, code: "MISSING_LOCATION", error: "Please enter a location name." };
      }
      query = `?city=${encodeURIComponent(trimmed)}`;
    } else if (location && typeof location === "object") {
      if (location.city) {
        query = `?city=${encodeURIComponent(location.city.trim())}`;
      } else if (location.lat !== undefined && location.lon !== undefined) {
        query = `?lat=${encodeURIComponent(location.lat)}&lon=${encodeURIComponent(location.lon)}`;
      }
    }

    if (!query) {
      return { success: false, code: "MISSING_LOCATION", error: "Please provide a valid city or coordinates." };
    }

    if (bypassCache) {
      query += "&refresh=true";
    }

    const url = `${AgriConfig.apiBaseUrl}${AgriConfig.endpoints.weather}${query}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AgriConfig.network.weatherTimeoutMs || 10000);

      const res = await fetch(url, {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        const errCode = (body && body.code) ? body.code : (res.status === 404 ? "LOCATION_NOT_FOUND" : res.status === 503 ? "NOT_CONFIGURED" : "ERROR");
        return {
          success: false,
          statusCode: res.status,
          code: errCode,
          error: this.mapWeatherError(res.status, body)
        };
      }

      // Check required shape: location, current, forecast, risk
      if (!body || !body.current || !body.location) {
        return {
          success: false,
          statusCode: res.status,
          code: "MALFORMED_DATA",
          error: "Received incomplete weather information from the server."
        };
      }

      return {
        success: true,
        statusCode: res.status,
        data: body
      };
    } catch (err) {
      if (err.name === "AbortError") {
        return {
          success: false,
          code: "TIMEOUT",
          error: "Weather query timed out. Please try again."
        };
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        error: AgriConfig.messages.weatherUnavailable
      };
    }
  },

  /**
   * Maps weather-specific HTTP errors to farmer-friendly explanations
   */
  mapWeatherError(statusCode, responseBody) {
    const code = responseBody && responseBody.code;
    if (code === "NOT_CONFIGURED") {
      return AgriConfig.messages.weatherNotConfigured;
    }
    if (code === "LOCATION_NOT_FOUND" || statusCode === 404) {
      return (responseBody && responseBody.error) ? responseBody.error : AgriConfig.messages.weatherNotFound;
    }
    if (code === "RATE_LIMITED" || statusCode === 429) {
      return "Weather service request limit reached. Please wait a moment.";
    }
    if (statusCode === 400 && responseBody && responseBody.error) {
      return responseBody.error;
    }
    return AgriConfig.messages.weatherUnavailable;
  },

  /**
   * Request smart irrigation decision recommendation
   * @param {number|string} soilMoisture - Measured soil moisture (0 - 100)
   * @param {object} [options] - Optional city, coordinates, or pre-fetched rain probability
   * @returns {Promise<{success: boolean, data?: object, code?: string, error?: string, statusCode?: number}>}
   */
  async calculateIrrigation(soilMoisture, options = {}) {
    const url = `${AgriConfig.apiBaseUrl}${AgriConfig.endpoints.irrigation}`;
    const payload = {
      soil_moisture: Number(soilMoisture),
      ...options
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        return {
          success: false,
          statusCode: res.status,
          code: (body && body.code) ? body.code : "ERROR",
          error: (body && body.error) ? body.error : "Irrigation advisory service is temporarily unavailable."
        };
      }

      return {
        success: true,
        statusCode: res.status,
        data: body
      };
    } catch (err) {
      if (err.name === "AbortError") {
        return {
          success: false,
          code: "TIMEOUT",
          error: "Irrigation calculation timed out. Please try again."
        };
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        error: "Cannot connect to irrigation advisory service."
      };
    }
  },

  /**
   * Request farm sustainability / eco score assessment
   * @param {object} payload - Inputs including soil_moisture, rain_probability, recommendation, disease_risk
   * @returns {Promise<{success: boolean, data?: object, code?: string, error?: string, statusCode?: number}>}
   */
  async calculateSustainability(payload = {}) {
    const url = `${AgriConfig.apiBaseUrl}${AgriConfig.endpoints.sustainability}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        return {
          success: false,
          statusCode: res.status,
          code: (body && body.code) ? body.code : "ERROR",
          error: (body && body.error) ? body.error : "Sustainability scoring service is temporarily unavailable."
        };
      }

      return {
        success: true,
        statusCode: res.status,
        data: body
      };
    } catch (err) {
      if (err.name === "AbortError") {
        return {
          success: false,
          code: "TIMEOUT",
          error: "Sustainability assessment timed out. Please try again."
        };
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        error: "Cannot connect to sustainability assessment service."
      };
    }
  },

  /**
   * Send a query to the GenAI Farmer Assistant with grounded multi-module context
   * @param {object} payload - { message: string, language?: string, history?: array, context?: object }
   * @returns {Promise<{success: boolean, data?: object, code?: string, error?: string, statusCode?: number}>}
   */
  async askAssistant(payload = {}) {
    const url = `${AgriConfig.apiBaseUrl}${AgriConfig.endpoints.assistant}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        let userMessage = "The AI farmer assistant is temporarily unavailable.";
        const code = (body && body.code) ? body.code : "ERROR";

        if (code === "NOT_CONFIGURED" || res.status === 503) {
          userMessage = (body && body.error) ? body.error : AgriConfig.messages.assistantNotConfigured;
        } else if (code === "RATE_LIMITED" || res.status === 429) {
          userMessage = (body && body.error) ? body.error : "Rate limit reached. Please wait a moment.";
        } else if (code === "EMPTY_MESSAGE" || code === "MESSAGE_TOO_LONG") {
          userMessage = (body && body.error) ? body.error : "Invalid message.";
        } else if (body && body.error) {
          userMessage = body.error;
        }

        return {
          success: false,
          statusCode: res.status,
          code: code,
          error: userMessage
        };
      }

      return {
        success: true,
        statusCode: res.status,
        data: body
      };

    } catch (err) {
      if (err.name === "AbortError") {
        return {
          success: false,
          code: "TIMEOUT",
          error: AgriConfig.messages.assistantTimeout
        };
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        error: AgriConfig.messages.offline
      };
    }
  }
};

// Expose on window
window.AgriApi = AgriApi;
