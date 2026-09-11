/**
 * AgriSmart AI - Part 3 Automated Verification Suite
 * Tests Weather Intelligence, Smart Irrigation Decision Engine,
 * Sustainability Scoring, and Frontend DOM Architecture.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n==================================================');
  console.log('AGRISMART AI - PART 3 VERIFICATION SUITE');
  console.log('==================================================\n');

  // -------------------------------------------------------------
  // Test 1: Weather Endpoint Contract & Key Security
  // -------------------------------------------------------------
  console.log('[Test 1] Testing /weather endpoint contract & security...');
  try {
    const res = await fetch(`${BASE_URL}/weather?city=Ahmedabad`);
    const data = await res.json();

    if (res.status === 200) {
      assert(data.location && typeof data.location.name === 'string', 'Weather location object contains name');
      assert(data.current && typeof data.current.temperature_c === 'number', 'Current weather contains numeric temperature_c');
      assert(data.current && typeof data.current.humidity_percent === 'number', 'Current weather contains numeric humidity_percent');
      assert(data.forecast && data.forecast.window_hours === 24, 'Forecast specifies 24-hour window');
      assert(data.risk && typeof data.risk.level === 'string', 'Risk evaluator returns risk level');

      // Security check: Never leak API key in JSON response
      const jsonStr = JSON.stringify(data);
      assert(!jsonStr.includes('appid') && !jsonStr.includes('api_key') && !jsonStr.includes('OPENWEATHER'), 'Weather response does NOT leak any API keys or secrets');
    } else if (res.status === 503) {
      assert(data.code === 'NOT_CONFIGURED', 'Returns clean NOT_CONFIGURED code when weather key unconfigured');
      assert(!data.temperature_c, 'Never serves fake mock weather when provider unconfigured');
    } else {
      assert(false, `Unexpected /weather status: ${res.status}`);
    }

    // Check missing location validation
    const badRes = await fetch(`${BASE_URL}/weather`);
    assert(badRes.status === 400, 'Rejects missing location with HTTP 400');
  } catch (err) {
    assert(false, `Weather endpoint connection error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 2: Irrigation Rule Engine Boundary Matrix
  // -------------------------------------------------------------
  console.log('\n[Test 2] Testing /irrigation boundary test matrix...');

  const boundaryMatrix = [
    { soil: 29, rain: 29, expected: 'Irrigate now', label: 'soil: 29, rain: 29 -> Irrigate now' },
    { soil: 30, rain: 29, expected: 'Monitor', label: 'soil: 30, rain: 29 -> Monitor' },
    { soil: 29, rain: 30, expected: 'Monitor', label: 'soil: 29, rain: 30 -> Monitor' },
    { soil: 25, rain: 60, expected: 'Monitor', label: 'soil: 25, rain: 60 -> Monitor' },
    { soil: 25, rain: 61, expected: 'Delay irrigation', label: 'soil: 25, rain: 61 -> Delay irrigation' },
    { soil: 0, rain: 0, expected: 'Irrigate now', label: 'soil: 0, rain: 0 -> Irrigate now' },
    { soil: 100, rain: 100, expected: 'Delay irrigation', label: 'soil: 100, rain: 100 -> Delay irrigation' }
  ];

  for (const tc of boundaryMatrix) {
    try {
      const res = await fetch(`${BASE_URL}/irrigation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soil_moisture: tc.soil,
          rain_probability: tc.rain
        })
      });

      const body = await res.json();
      assert(res.status === 200, `HTTP 200 for ${tc.label}`);
      assert(body.recommendation === tc.expected, `Expected '${tc.expected}', got '${body.recommendation}' for ${tc.label}`);
      assert(body.soil_moisture === tc.soil, `Body reflects input soil moisture: ${body.soil_moisture}`);
      assert(body.rain_probability_24h === tc.rain, `Body reflects input rain probability: ${body.rain_probability_24h}`);
      assert(typeof body.reason === 'string' && body.reason.length > 0, `Explanation provided in reason: "${body.reason.slice(0, 40)}..."`);
    } catch (err) {
      assert(false, `Error testing ${tc.label}: ${err.message}`);
    }
  }

  // -------------------------------------------------------------
  // Test 3: Irrigation Input Validation Bounds
  // -------------------------------------------------------------
  console.log('\n[Test 3] Testing /irrigation input validation...');

  const invalidInputs = [
    { soil: -5, rain: 20, desc: 'negative soil moisture (-5)' },
    { soil: 105, rain: 20, desc: 'soil moisture > 100 (105)' },
    { soil: 'invalid_text', rain: 20, desc: 'non-numeric soil moisture' }
  ];

  for (const tc of invalidInputs) {
    try {
      const res = await fetch(`${BASE_URL}/irrigation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soil_moisture: tc.soil,
          rain_probability: tc.rain
        })
      });
      assert(res.status === 400, `Rejects ${tc.desc} with HTTP 400`);
    } catch (err) {
      assert(false, `Error checking invalid input: ${err.message}`);
    }
  }

  // -------------------------------------------------------------
  // Test 4: Sustainability Endpoint Contract & Scoring
  // -------------------------------------------------------------
  console.log('\n[Test 4] Testing /sustainability endpoint contract & scoring...');
  try {
    const res = await fetch(`${BASE_URL}/sustainability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        soil_moisture: 28,
        rain_probability: 15,
        recommendation: 'Irrigate now',
        disease_risk: 'Low'
      })
    });

    const body = await res.json();
    assert(res.status === 200, 'Sustainability evaluation returns HTTP 200');
    assert(typeof body.score === 'number' && body.score >= 0 && body.score <= 100, `Score is numeric and clamped [0, 100]: ${body.score}`);
    assert(body.breakdown && typeof body.breakdown.water_efficiency === 'number', `Water efficiency breakdown returned: ${body.breakdown.water_efficiency}`);
    assert(body.breakdown && typeof body.breakdown.weather_adaptation === 'number', `Weather adaptation breakdown returned: ${body.breakdown.weather_adaptation}`);
    assert(Array.isArray(body.reasons) && body.reasons.length > 0, 'Returns contributing factors list');
    assert(typeof body.suggestion === 'string' && body.suggestion.length > 0, 'Returns actionable field suggestion');

    // Missing data validation
    const missingRes = await fetch(`${BASE_URL}/sustainability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(missingRes.status === 400, 'Rejects empty payload with HTTP 400 (missing soil moisture)');
  } catch (err) {
    assert(false, `Sustainability testing error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 5: DOM Architecture & Script Inclusions
  // -------------------------------------------------------------
  console.log('\n[Test 5] Testing frontend/index.html DOM architecture...');
  const indexPath = path.join(__dirname, '..', 'frontend', 'index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf8');

  // Containers
  assert(indexHtml.includes('id="view-weather"'), 'index.html contains #view-weather');
  assert(indexHtml.includes('id="weather-module-container"'), 'index.html contains #weather-module-container');
  assert(indexHtml.includes('id="view-irrigation"'), 'index.html contains #view-irrigation');
  assert(indexHtml.includes('id="irrigation-module-container"'), 'index.html contains #irrigation-module-container');
  assert(indexHtml.includes('id="view-sustainability"'), 'index.html contains #view-sustainability');
  assert(indexHtml.includes('id="sustainability-module-container"'), 'index.html contains #sustainability-module-container');

  // Dashboard Smart Farming section
  assert(indexHtml.includes('class="dash-smart-farming-section"'), 'Dashboard contains .dash-smart-farming-section');
  assert(indexHtml.includes('id="dash-weather-card"'), 'Dashboard contains #dash-weather-card');
  assert(indexHtml.includes('id="dash-irrigation-card"'), 'Dashboard contains #dash-irrigation-card');
  assert(indexHtml.includes('id="dash-sustainability-card"'), 'Dashboard contains #dash-sustainability-card');

  // Scripts
  assert(indexHtml.includes('src="js/state.js"'), 'index.html includes js/state.js');
  assert(indexHtml.includes('src="js/components/weatherCard.js"'), 'index.html includes weatherCard.js');
  assert(indexHtml.includes('src="js/components/irrigationCard.js"'), 'index.html includes irrigationCard.js');
  assert(indexHtml.includes('src="js/components/sustainabilityCard.js"'), 'index.html includes sustainabilityCard.js');

  // -------------------------------------------------------------
  // Test 6: CSS Stylesheet Check
  // -------------------------------------------------------------
  console.log('\n[Test 6] Testing frontend/style.css for Part 3 styles...');
  const cssPath = path.join(__dirname, '..', 'frontend', 'style.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert(css.includes('.dash-smart-farming-section'), 'style.css includes .dash-smart-farming-section');
  assert(css.includes('.smart-farming-cards-grid'), 'style.css includes .smart-farming-cards-grid');
  assert(css.includes('.weather-page-wrapper'), 'style.css includes .weather-page-wrapper');
  assert(css.includes('.irrigation-recommendation-box'), 'style.css includes .irrigation-recommendation-box');
  assert(css.includes('.sustainability-score-row'), 'style.css includes .sustainability-score-row');

  // -------------------------------------------------------------
  // Test 7: Crop Health Predict Endpoint Independence Check
  // -------------------------------------------------------------
  console.log('\n[Test 7] Verifying Crop Health /predict independence from weather...');
  try {
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, '/health returns 200 OK');
    assert(healthData.model_loaded === true, 'PyTorch EfficientNet-B0 disease model remains loaded and unaffected');
  } catch (err) {
    assert(false, `Health check error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Final Results
  // -------------------------------------------------------------
  console.log('\n==================================================');
  console.log(`PART 3 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
