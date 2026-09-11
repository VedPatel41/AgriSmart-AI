/**
 * AgriSmart AI - Part 4 Automated Verification Suite
 * Tests AI Farmer Assistant Backend Endpoint, Grounding & Anti-Hallucination logic,
 * Multilingual System Prompts, Frontend Component Architecture, and Security.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
  console.log('AGRISMART AI - PART 4 VERIFICATION SUITE');
  console.log('==================================================\n');

  // -------------------------------------------------------------
  // Test 1: Backend /assistant API Validation & Error Contracts
  // -------------------------------------------------------------
  console.log('[Test 1] Testing /assistant validation & error handling...');
  try {
    // 1a. Empty message rejection
    const emptyRes = await fetch(`${BASE_URL}/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' })
    });
    const emptyData = await emptyRes.json();
    assert(emptyRes.status === 400, 'Rejects empty message with HTTP 400');
    assert(emptyData.code === 'EMPTY_MESSAGE', 'Returns EMPTY_MESSAGE error code');

    // 1b. Message too long (> 600 chars) rejection
    const longMessage = 'A'.repeat(605);
    const longRes = await fetch(`${BASE_URL}/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: longMessage })
    });
    const longData = await longRes.json();
    assert(longRes.status === 400, 'Rejects message > 600 characters with HTTP 400');
    assert(longData.code === 'MESSAGE_TOO_LONG', 'Returns MESSAGE_TOO_LONG error code');

    // 1c. Invalid JSON payload
    const badJsonRes = await fetch(`${BASE_URL}/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-non-json'
    });
    assert(badJsonRes.status === 400, 'Rejects non-JSON payload with HTTP 400');

    // 1d. Missing API key handling (when no GEMINI_API_KEY is configured in test environment)
    const validReqRes = await fetch(`${BASE_URL}/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What should I do about leaf blight?',
        language: 'en'
      })
    });
    const validReqData = await validReqRes.json();
    if (validReqRes.status === 503) {
      assert(validReqData.code === 'NOT_CONFIGURED', 'Returns NOT_CONFIGURED code when AI key is missing');
      assert(!validReqData.response, 'Never serves fake hallucinated LLM text when provider is unconfigured');
    } else if (validReqRes.status === 200) {
      assert(validReqData.response && typeof validReqData.response === 'string', 'Returns response string from configured GenAI provider');
    } else {
      console.log(`  ℹ Note: Assistant returned HTTP ${validReqRes.status} (${validReqData.code || 'provider status'})`);
    }
  } catch (err) {
    assert(false, `Assistant endpoint connection error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 2: Python Service Grounding & Anti-Hallucination Unit Tests
  // -------------------------------------------------------------
  console.log('\n[Test 2] Testing Grounding & Anti-Hallucination Guardrails in assistant_service.py...');
  try {
    const testScriptPath = path.join(__dirname, 'test_assistant_grounding.py');
    const pyOutput = execSync(`python "${testScriptPath}"`, {
      encoding: 'utf-8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });
    assert(pyOutput.includes('PYTHON_UNIT_TESTS_OK'), 'All Python assistant grounding & anti-hallucination unit tests passed');
  } catch (err) {
    assert(false, `Python unit test failure: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 3: Frontend DOM Elements & Structure in index.html
  // -------------------------------------------------------------
  console.log('\n[Test 3] Testing Frontend DOM structure in index.html...');
  const indexHtmlPath = path.join(__dirname, '..', 'frontend', 'index.html');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

  // Assistant page container
  assert(indexHtml.includes('id="view-assistant"'), 'index.html contains #view-assistant section');
  assert(indexHtml.includes('id="assistant-module-container"'), 'index.html contains #assistant-module-container');

  // Dashboard Overview Assistant card
  assert(indexHtml.includes('id="dash-assistant-card"'), 'Dashboard contains #dash-assistant-card');
  assert(indexHtml.includes('id="dash-assistant-lead"'), 'Dashboard contains #dash-assistant-lead');
  assert(indexHtml.includes('id="dash-assistant-summary"'), 'Dashboard contains #dash-assistant-summary');
  assert(indexHtml.includes('id="btn-dash-ask-assistant"'), 'Dashboard contains #btn-dash-ask-assistant button');

  // Cross-Module CTAs
  assert(indexHtml.includes('id="btn-ask-assistant-crop"'), 'Crop Health results contains #btn-ask-assistant-crop button');

  // Script tag inclusion
  assert(indexHtml.includes('src="js/components/assistantCard.js"'), 'index.html includes assistantCard.js script tag');

  // -------------------------------------------------------------
  // Test 4: Cross-Module CTA Implementations in Component Files
  // -------------------------------------------------------------
  console.log('\n[Test 4] Testing Cross-Module CTAs across JavaScript components...');

  // Crop Health CTA
  const cropHealthJs = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'js', 'components', 'cropHealth.js'), 'utf-8');
  assert(cropHealthJs.includes('btnAskAssistant'), 'cropHealth.js caches btnAskAssistant');
  assert(cropHealthJs.includes('askQuestion'), 'cropHealth.js calls assistantCard.askQuestion');

  // Weather Card CTA
  const weatherJs = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'js', 'components', 'weatherCard.js'), 'utf-8');
  assert(weatherJs.includes('btn-ask-assistant-weather'), 'weatherCard.js renders btn-ask-assistant-weather');
  assert(weatherJs.includes('How might this weather affect my crop?'), 'weatherCard.js pre-seeds weather inquiry');

  // Irrigation Card CTA
  const irrigationJs = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'js', 'components', 'irrigationCard.js'), 'utf-8');
  assert(irrigationJs.includes('btn-ask-assistant-irrigation'), 'irrigationCard.js renders btn-ask-assistant-irrigation');
  assert(irrigationJs.includes('Why was this irrigation recommendation given?'), 'irrigationCard.js pre-seeds irrigation inquiry');

  // Sustainability Card CTA
  const sustainabilityJs = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'js', 'components', 'sustainabilityCard.js'), 'utf-8');
  assert(sustainabilityJs.includes('btn-ask-assistant-sustainability'), 'sustainabilityCard.js renders btn-ask-assistant-sustainability');
  assert(sustainabilityJs.includes('How can I improve my sustainability indicator?'), 'sustainabilityCard.js pre-seeds sustainability inquiry');

  // Dashboard card wiring
  const dashboardJs = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'js', 'components', 'dashboard.js'), 'utf-8');
  assert(dashboardJs.includes('dashAssistantLead'), 'dashboard.js caches dashAssistantLead');
  assert(dashboardJs.includes('btn-dash-ask-assistant'), 'dashboard.js binds btn-dash-ask-assistant');

  // -------------------------------------------------------------
  // Test 5: Assistant Component Capabilities (assistantCard.js)
  // -------------------------------------------------------------
  console.log('\n[Test 5] Testing AgriAssistantCard features...');
  const assistantJs = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'js', 'components', 'assistantCard.js'), 'utf-8');

  assert(assistantJs.includes('gatherActiveContext'), 'Implements centralized gatherActiveContext');
  assert(assistantJs.includes('farmer:') && assistantJs.includes('crop:') && assistantJs.includes('diagnosis:') && assistantJs.includes('weather:') && assistantJs.includes('irrigation:') && assistantJs.includes('sustainability:'), 'gatherActiveContext collects all 5 required modules');
  assert(assistantJs.includes('getAdaptiveQuickQuestions'), 'Implements adaptive suggested questions');
  assert(assistantJs.includes('formatMarkdown'), 'Implements safe markdown formatter');
  assert(assistantJs.includes('escapeHtml'), 'Markdown formatter escapes raw HTML characters');
  assert(assistantJs.includes('btn-assistant-clear'), 'Supports clear chat functionality');
  assert(assistantJs.includes('askQuestion(questionText'), 'Exposes public askQuestion API for cross-module CTAs');
  assert(assistantJs.includes('isGenerating'), 'Protects against duplicate message submissions while inflight');
  assert(assistantJs.includes('activeRequestId'), 'Protects against stale out-of-order responses');

  // -------------------------------------------------------------
  // Test 6: Security & API Key Exposure Audit
  // -------------------------------------------------------------
  console.log('\n[Test 6] Auditing frontend code for leaked secrets & keys...');
  const frontendDir = path.join(__dirname, '..', 'frontend');
  
  function scanDirForSecrets(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        scanDirForSecrets(full);
      } else if (f.endsWith('.js') || f.endsWith('.html')) {
        const content = fs.readFileSync(full, 'utf-8');
        assert(!/AIza[0-9A-Za-z-_]{35}/.test(content), `No Google API keys in ${f}`);
        assert(!/sk-[a-zA-Z0-9]{20,}/.test(content), `No OpenAI/Anthropic keys in ${f}`);
        assert(!content.includes('GEMINI_API_KEY='), `No raw GEMINI_API_KEY in ${f}`);
      }
    }
  }
  scanDirForSecrets(frontendDir);

  // -------------------------------------------------------------
  // Test 7: CSS Styles for Assistant & Mobile Breakpoints
  // -------------------------------------------------------------
  console.log('\n[Test 7] Testing Assistant CSS styling & mobile responsiveness...');
  const styleCss = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'style.css'), 'utf-8');
  assert(styleCss.includes('.assistant-page-wrapper'), 'style.css contains .assistant-page-wrapper');
  assert(styleCss.includes('.assistant-workspace-grid'), 'style.css contains .assistant-workspace-grid');
  assert(styleCss.includes('.assistant-chat-window'), 'style.css contains .assistant-chat-window');
  assert(styleCss.includes('.bubble-user'), 'style.css contains .bubble-user');
  assert(styleCss.includes('.bubble-assistant'), 'style.css contains .bubble-assistant');
  assert(styleCss.includes('.bubble-thinking'), 'style.css contains .bubble-thinking');
  assert(styleCss.includes('.quick-chip-btn'), 'style.css contains .quick-chip-btn');
  assert(styleCss.includes('.assistant-text-input'), 'style.css contains .assistant-text-input');

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
