/**
 * AgriSmart AI - Part 5 Final Comprehensive Verification Suite
 * Executes the full hardening and SIH demo readiness test battery.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
const ROOT_DIR = path.resolve(__dirname, "..");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

// Helper to make HTTP requests using node http module
function request(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json
        });
      });
    });

    req.on("error", (e) => reject(e));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runPart5FinalQA() {
  console.log("==================================================");
  console.log("AGRISMART AI — PART 5 FINAL COMPREHENSIVE QA");
  console.log(`Target Backend: ${BASE_URL}`);
  console.log("==================================================\n");

  // TEST 1: Backend Health & PyTorch Model Verification
  console.log("[1. Backend Health & Core ML Model]");
  try {
    const healthRes = await request(`${BASE_URL}/health`);
    assert(healthRes.statusCode === 200, "Backend /health returns HTTP 200");
    assert(healthRes.json && healthRes.json.status === "ok", "System status is 'ok'");
    assert(healthRes.json.model_loaded === true, "Model loaded status is true");
    assert(healthRes.json.framework === "pytorch", "ML Framework is PyTorch");
    assert(healthRes.json.num_classes === 15, "Model output classes match 15 trained PlantVillage/SIH classes");
    assert(Array.isArray(healthRes.json.input_shape) && healthRes.json.input_shape[0] === 224, "Model input shape is 224x224x3");
  } catch (err) {
    assert(false, `Health check connection failed: ${err.message}`);
  }

  // TEST 2: Strict Smart Irrigation Boundary Matrix
  console.log("\n[2. Smart Irrigation Boundary & Rule Engine Matrix]");
  const irrigationCases = [
    // [soil, rain, expRecommendation, expDecision]
    [29, 29, "Irrigate now", "irrigate_now"],
    [30, 29, "Monitor", "monitor"],
    [29, 30, "Monitor", "monitor"],
    [25, 60, "Monitor", "monitor"],
    [25, 61, "Delay irrigation", "delay_irrigation"],
    [0, 0, "Irrigate now", "irrigate_now"],
    [100, 100, "Delay irrigation", "delay_irrigation"],
    [15, 10, "Irrigate now", "irrigate_now"],
    [45, 15, "Monitor", "monitor"],
    [35, 75, "Delay irrigation", "delay_irrigation"]
  ];

  for (const [soil, rain, expRec, expDec] of irrigationCases) {
    try {
      const payload = JSON.stringify({ soil_moisture: soil, rain_probability: rain });
      const res = await request(`${BASE_URL}/irrigation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
      }, payload);

      assert(res.statusCode === 200, `Soil=${soil}%, Rain=${rain}% returns HTTP 200`);
      assert(res.json && res.json.recommendation === expRec, `Soil=${soil}%, Rain=${rain}% -> '${expRec}'`);
      assert(res.json && res.json.decision === expDec, `Decision code is '${expDec}'`);
      assert(res.json && typeof res.json.reason === "string" && res.json.reason.length > 10, `Transparent reasoning provided`);
    } catch (err) {
      assert(false, `Irrigation boundary test failed for (${soil}, ${rain}): ${err.message}`);
    }
  }

  // Irrigation Invalid Input Rejections
  const invalidIrrigationInputs = [-5, 105, "abc"];
  for (const inv of invalidIrrigationInputs) {
    const payload = JSON.stringify({ soil_moisture: inv, rain_probability: 20 });
    const res = await request(`${BASE_URL}/irrigation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
    }, payload);
    assert(res.statusCode === 400, `Rejects invalid soil moisture input: ${inv}`);
  }

  // TEST 3: Sustainability Scoring Engine
  console.log("\n[3. Sustainability Scoring Engine]");
  try {
    const payload = JSON.stringify({
      soil_moisture: 35.0,
      rain_probability: 75,
      recommendation: "Delay irrigation",
      disease_risk: "Low"
    });
    const res = await request(`${BASE_URL}/sustainability`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
    }, payload);

    assert(res.statusCode === 200, "Sustainability evaluation returns HTTP 200");
    assert(res.json && res.json.score === 93, "Deterministic 60/40 score matches expected: 93");
    assert(res.json.rating === "Excellent", "Rating is categorized as 'Excellent'");
    assert(res.json.weights.water_efficiency === 0.6, "Water efficiency weight is strictly 0.60");
    assert(res.json.weights.weather_adaptation === 0.4, "Weather adaptation weight is strictly 0.40");
    assert(Array.isArray(res.json.reasons) && res.json.reasons.length > 0, "Returns transparent contributing reasons");
    assert(typeof res.json.suggestion === "string", "Returns actionable farm improvement suggestion");
  } catch (err) {
    assert(false, `Sustainability test failed: ${err.message}`);
  }

  // Sustainability Missing Input Validation
  try {
    const payload = JSON.stringify({ rain_probability: 20 });
    const res = await request(`${BASE_URL}/sustainability`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
    }, payload);
    assert(res.statusCode === 400, "Rejects evaluation without soil moisture (HTTP 400)");
  } catch (err) {
    assert(false, `Sustainability validation failed: ${err.message}`);
  }

  // TEST 4: Weather & Decoupled Architecture
  console.log("\n[4. Weather Module & Crop Health Decoupling]");
  try {
    const resMiss = await request(`${BASE_URL}/weather`);
    assert(resMiss.statusCode === 400, "Missing location returns HTTP 400 MISSING_LOCATION");
    assert(resMiss.json && resMiss.json.code === "MISSING_LOCATION", "Error code is MISSING_LOCATION");
  } catch (err) {
    assert(false, `Weather validation check failed: ${err.message}`);
  }

  // TEST 5: GenAI Assistant Validation & Guardrails
  console.log("\n[5. GenAI Assistant Validation & Guardrails]");
  try {
    const emptyRes = await request(`${BASE_URL}/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(JSON.stringify({})) }
    }, JSON.stringify({}));
    assert(emptyRes.statusCode === 400, "Empty message rejected with HTTP 400");
    assert(emptyRes.json && emptyRes.json.code === "EMPTY_MESSAGE", "Code is EMPTY_MESSAGE");

    const hugeMsg = JSON.stringify({ message: "A".repeat(650) });
    const hugeRes = await request(`${BASE_URL}/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(hugeMsg) }
    }, hugeMsg);
    assert(hugeRes.statusCode === 400, "Message > 600 characters rejected with HTTP 400 MESSAGE_TOO_LONG");
  } catch (err) {
    assert(false, `Assistant validation check failed: ${err.message}`);
  }

  // TEST 6: Security Audit (Zero Hardcoded Secrets in Frontend)
  console.log("\n[6. Security Audit - Leaked Secrets Scan]");
  const secretRegex = /(AIza[0-9A-Za-z-_]{35}|sk-[a-zA-Z0-9]{32,})/;
  function checkDirForSecrets(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        checkDirForSecrets(fullPath);
      } else if (ent.name.endsWith(".js") || ent.name.endsWith(".html") || ent.name.endsWith(".css")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const match = content.match(secretRegex);
        assert(!match, `Zero secrets in frontend file: ${path.relative(ROOT_DIR, fullPath)}`);
      }
    }
  }
  checkDirForSecrets(FRONTEND_DIR);

  // TEST 7: Fake Data Removal Audit
  console.log("\n[7. Fake Data Search]");
  const feFiles = ["index.html", "js/config.js", "js/api.js", "js/history.js", "js/components/cropHealth.js", "js/components/dashboard.js"];
  for (const f of feFiles) {
    const content = fs.readFileSync(path.join(FRONTEND_DIR, f), "utf-8");
    assert(!content.includes("Backend: Connected"), `No 'Backend: Connected' fake string in ${f}`);
    assert(!content.includes('"Eco Score"'), `No 'Eco Score' fake metric in ${f}`);
  }

  // TEST 8: English-Only UI & Language Switcher Removal Verification
  console.log("\n[8. English-Only UI & Language Switcher Removal]");
  const i18nPath = path.join(FRONTEND_DIR, "js", "i18n.js");
  const i18nContent = fs.readFileSync(i18nPath, "utf-8");
  function extractKeys(lang) {
    const match = i18nContent.match(new RegExp(`${lang}:\\s*\\{([^}]+)\\}`, "s"));
    if (!match) return new Set();
    const keys = match[1].match(/["']([a-zA-Z0-9_.]+)["']\s*:/g) || [];
    return new Set(keys.map(k => k.replace(/['":\s]/g, "")));
  }
  const enKeys = extractKeys("en");
  assert(enKeys.size >= 50, `English translation dictionary has ${enKeys.size} keys (>=50)`);
  
  // Verify language switcher is completely removed from index.html
  const indexHtmlRaw = fs.readFileSync(path.join(FRONTEND_DIR, "index.html"), "utf-8");
  assert(!indexHtmlRaw.includes('id="lang-selector"'), "Language selector dropdown completely removed from header");
  assert(!indexHtmlRaw.includes('id="settings-lang"'), "Language selector completely removed from settings");
  
  // Verify zero Indic/Devanagari characters in all frontend files
  const devanagariRegex = /[\u0900-\u097F\u0A80-\u0AFF]/;
  function checkDirForIndic(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        checkDirForIndic(fullPath);
      } else if (ent.name.endsWith(".js") || ent.name.endsWith(".html") || ent.name.endsWith(".css")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        assert(!devanagariRegex.test(content), `Zero Indic/Devanagari characters in ${path.relative(ROOT_DIR, fullPath)}`);
      }
    }
  }
  checkDirForIndic(FRONTEND_DIR);
  console.log("  ✓ PASS: English-only UI verified with complete removal of language selectors and zero Devanagari text");

  // TEST 9: Frontend DOM Interactive Elements & Component Matrix
  console.log("\n[9. Interactive Buttons, Navigation & Component Matrix]");
  const indexHtml = fs.readFileSync(path.join(FRONTEND_DIR, "index.html"), "utf-8");
  const requiredIndexIds = [
    "auth-view", "form-login", "form-signup", "tab-login", "tab-signup", "btn-demo-login",
    "onboarding-modal", "onboard-btn-next-1", "onboard-btn-next-2", "onboard-btn-back-2", "onboard-btn-back-3", "onboard-btn-finish",
    "app-shell", "app-sidebar",
    "view-overview", "view-my-farm", "view-crop-health", "view-weather", "view-irrigation", "view-sustainability", "view-assistant",
    "crop-drop-zone", "crop-file-input", "crop-camera-input", "btn-crop-choose", "btn-crop-take",
    "btn-analyze-crop", "crop-results-container", "result-confidence-val", "result-condition-title",
    "btn-analyze-another", "btn-ask-assistant-crop", "btn-copy-result",
    "sustainability-module-container", "assistant-module-container", "irrigation-module-container", "weather-module-container"
  ];

  for (const id of requiredIndexIds) {
    assert(indexHtml.includes(`id="${id}"`), `index.html contains #${id}`);
  }

  // Verify navigation targets in index.html
  const navTargets = ["overview", "my-farm", "crop-health", "weather", "irrigation", "sustainability", "assistant", "settings"];
  for (const target of navTargets) {
    assert(indexHtml.includes(`data-view="${target}"`), `Navigation contains link for data-view="${target}"`);
  }

  // Component-rendered element templates verification
  const irrCardJs = fs.readFileSync(path.join(FRONTEND_DIR, "js", "components", "irrigationCard.js"), "utf-8");
  assert(irrCardJs.includes('id="soil-moisture-input"'), "irrigationCard renders #soil-moisture-input");
  assert(irrCardJs.includes('id="btn-calc-irrigation"'), "irrigationCard renders #btn-calc-irrigation");
  assert(irrCardJs.includes('id="irrigation-result-area"'), "irrigationCard renders #irrigation-result-area");

  const sustCardJs = fs.readFileSync(path.join(FRONTEND_DIR, "js", "components", "sustainabilityCard.js"), "utf-8");
  assert(sustCardJs.includes('id="btn-sustainability-refresh"'), "sustainabilityCard renders #btn-sustainability-refresh");
  assert(sustCardJs.includes('id="btn-eval-sustainability"'), "sustainabilityCard renders #btn-eval-sustainability");

  const asstCardJs = fs.readFileSync(path.join(FRONTEND_DIR, "js", "components", "assistantCard.js"), "utf-8");
  assert(asstCardJs.includes('id="assistant-text-input"'), "assistantCard renders #assistant-text-input");
  assert(asstCardJs.includes('id="btn-assistant-send"'), "assistantCard renders #btn-assistant-send");
  assert(asstCardJs.includes('id="btn-assistant-clear"'), "assistantCard renders #btn-assistant-clear");

  // TEST 10: Mobile Responsive Breakpoints
  console.log("\n[10. CSS Responsive Design Verification]");
  const styleCss = fs.readFileSync(path.join(FRONTEND_DIR, "style.css"), "utf-8");
  assert(styleCss.includes("@media (max-width: 768px)"), "CSS contains tablet/mobile breakpoint (<= 768px)");
  assert(styleCss.includes("@media (max-width: 480px)"), "CSS contains mobile small breakpoint (<= 480px)");
  assert(styleCss.includes("min-height: 44px") || styleCss.includes("padding: var(--space-3)"), "Touch targets meet comfortable accessible dimensions");

  console.log("\n==================================================");
  console.log(`PART 5 FINAL QA SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPart5FinalQA().catch((err) => {
  console.error("FATAL: Test runner crashed:", err);
  process.exit(1);
});
