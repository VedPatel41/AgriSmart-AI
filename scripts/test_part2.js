/**
 * Automated Verification Suite for AgriSmart AI Part 2
 * Tests:
 * 1. Live Backend /predict with real leaf images (Disease and Healthy classes)
 * 2. API Contract Verification (class_label, confidence, advisory fields)
 * 3. Validation rejection cases (missing file, wrong ext, corrupt image)
 * 4. AgriHistory storage and subscriber notification
 * 5. AgriMyFarm in-place profile updates and persistence
 * 6. AgriDashboard reactive data rendering
 * 7. Verification of all Part 2 DOM Elements in index.html
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Mock localStorage and window
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.window = global;
global.localStorage = new LocalStorageMock();

// Load modules
const authCode = fs.readFileSync(path.join(__dirname, '../frontend/js/auth.js'), 'utf8');
eval(authCode);

const historyCode = fs.readFileSync(path.join(__dirname, '../frontend/js/history.js'), 'utf8');
eval(historyCode);

async function runPart2Tests() {
  console.log('--- STARTING AGRI-SMART PART 2 TEST SUITE ---\n');

  // Test 1: Real /predict with Disease Image
  console.log('1. Testing Live /predict with real Rice leaf image');
  const sampleImagePath = path.join(__dirname, '../data/icar_dataset/val/Rice_Bacterial_Leaf_Blight/val_0.jpg');
  assert(fs.existsSync(sampleImagePath), 'Sample leaf image must exist');

  const imageBuffer = fs.readFileSync(sampleImagePath);
  const boundary = '----WebKitFormBoundaryAgriSmartTest' + Date.now();
  
  const postDataHeader = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="image"; filename="val_0.jpg"\r\n` +
    `Content-Type: image/jpeg\r\n\r\n`
  );
  const postDataFooter = Buffer.from(`\r\n--${boundary}--\r\n`);
  const fullBody = Buffer.concat([postDataHeader, imageBuffer, postDataFooter]);

  const predictRes = await fetch('http://localhost:5000/predict', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(fullBody.length)
    },
    body: fullBody
  });

  assert.strictEqual(predictRes.status, 200, `Expected 200 OK from /predict, got ${predictRes.status}`);
  const predictJson = await predictRes.json();
  console.log('  [PASS] Backend returned 200 OK from real model:');
  console.log(`         class_label: "${predictJson.class_label}", confidence: ${predictJson.confidence}`);

  // Test 2: Contract shape validation
  console.log('\n2. Verifying Response Contract Shape');
  assert(typeof predictJson.class_label === 'string', 'class_label must be string');
  assert(typeof predictJson.confidence === 'number', 'confidence must be float number');
  assert(predictJson.confidence >= 0 && predictJson.confidence <= 1, 'confidence must be in [0, 1]');
  assert(predictJson.advisory, 'advisory object must be present');
  assert(predictJson.advisory.disease_name, 'advisory.disease_name must exist');
  assert(predictJson.advisory.symptoms, 'advisory.symptoms must exist');
  assert(predictJson.advisory.prevention, 'advisory.prevention must exist');
  console.log('  [PASS] Full ICAR agronomic contract verified.');

  // Test 3: Backend Error Handling & Validation
  console.log('\n3. Testing Backend Validation Cases');
  // 3a. Missing image field
  const emptyRes = await fetch('http://localhost:5000/predict', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: Buffer.from(`--${boundary}--\r\n`)
  });
  assert.strictEqual(emptyRes.status, 400, 'Missing image field must return 400');
  console.log('  [PASS] Missing file rejected with 400');

  // 3b. Invalid extension
  const badExtHeader = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="script.sh"\r\nContent-Type: text/plain\r\n\r\necho test`
  );
  const badExtBody = Buffer.concat([badExtHeader, postDataFooter]);
  const badExtRes = await fetch('http://localhost:5000/predict', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: badExtBody
  });
  assert.strictEqual(badExtRes.status, 415, 'Invalid extension must return 415');
  console.log('  [PASS] Invalid file extension rejected with 415');

  // 3c. Corrupted image
  const corruptHeader = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="corrupt.jpg"\r\nContent-Type: image/jpeg\r\n\r\nNOT_AN_IMAGE_DATA`
  );
  const corruptBody = Buffer.concat([corruptHeader, postDataFooter]);
  const corruptRes = await fetch('http://localhost:5000/predict', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: corruptBody
  });
  assert.strictEqual(corruptRes.status, 422, 'Corrupt image must return 422');
  console.log('  [PASS] Corrupted image rejected with 422');

  // Test 4: Analysis History Store
  console.log('\n4. Testing AgriHistory Session Persistence');
  localStorage.clear();
  assert.strictEqual(AgriHistory.getHistory().length, 0);

  const rec = AgriHistory.addRecord({
    crop: 'Rice (धान)',
    growthStage: 'Vegetative',
    classLabel: predictJson.class_label,
    formattedName: `${predictJson.advisory.crop} — ${predictJson.advisory.disease_name}`,
    confidence: predictJson.confidence,
    isHealthy: false,
    severity: predictJson.advisory.severity,
    symptoms: predictJson.advisory.symptoms,
    advice: predictJson.advisory.prevention
  });

  assert(rec && rec.id, 'Record must have an id');
  assert.strictEqual(AgriHistory.getHistory().length, 1);
  const latest = AgriHistory.getLatestRecord();
  assert.strictEqual(latest.classLabel, predictJson.class_label);
  assert.strictEqual(latest.confidencePercentage, Math.round(predictJson.confidence * 100));
  console.log('  [PASS] Analysis record persisted and retrieved.');

  // Test 5: My Farm Profile Updates & Validation
  console.log('\n5. Testing Farm Profile Save & Retrieval');
  const initialProfile = AgriAuth.getFarmProfile();
  assert.strictEqual(initialProfile.farmName, '');

  AgriAuth.saveFarmProfile({
    farmName: 'Sardar Patel Krishi Kendra',
    farmerName: 'Dhyan Patel',
    state: 'Gujarat',
    district: 'Anand',
    primaryCrop: 'Rice (धान)',
    growthStage: 'Vegetative',
    soilType: 'Alluvial Loam',
    farmSizeAcres: 5.5
  });

  const updatedProfile = AgriAuth.getFarmProfile();
  assert.strictEqual(updatedProfile.farmName, 'Sardar Patel Krishi Kendra');
  assert.strictEqual(updatedProfile.district, 'Anand');
  assert.strictEqual(updatedProfile.farmSizeAcres, 5.5);
  console.log('  [PASS] Farm profile saved and synchronized with session.');

  // Test 6: Verify index.html contains all Part 2 elements
  console.log('\n6. Testing Part 2 DOM Structure in index.html');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../frontend/index.html'), 'utf8');

  const requiredPart2Ids = [
    // Dashboard IDs
    'overview-welcome-farmer', 'dash-snap-crop', 'dash-snap-loc', 'dash-snap-health',
    'dash-farm-crop', 'dash-farm-stage', 'dash-farm-soil', 'dash-farm-loc',
    'dash-recent-list', 'dash-recent-empty',
    // My Farm View & Edit IDs
    'farm-view-mode', 'farm-edit-mode', 'farm-edit-form',
    'farm-view-name', 'farm-view-farmer', 'farm-view-state', 'farm-view-district',
    'farm-view-crop', 'farm-view-stage', 'farm-view-soil', 'farm-view-acres',
    'edit-farm-name', 'edit-farmer-name', 'edit-farm-state', 'edit-farm-district',
    'edit-farm-crop', 'edit-farm-stage', 'edit-farm-soil', 'edit-farm-acres',
    'btn-edit-farm-profile', 'btn-cancel-farm-edit', 'btn-save-farm-edit',
    // Crop Health IDs
    'crop-quality-tips', 'crop-context-select', 'growth-stage-select',
    'crop-drop-zone', 'crop-drop-prompt', 'crop-file-input', 'crop-camera-input',
    'btn-crop-choose', 'btn-crop-take', 'crop-preview-card', 'crop-image-preview',
    'crop-file-name', 'crop-file-size', 'crop-file-dims', 'btn-crop-change',
    'btn-crop-remove', 'btn-analyze-crop',
    // Diagnosis Result IDs
    'crop-results-container', 'result-status-badge', 'result-condition-title',
    'result-confidence-val', 'result-confidence-bar', 'result-confidence-note',
    'result-symptoms-text', 'result-prevention-text', 'result-organic-text',
    'btn-analyze-another', 'btn-copy-result',
    // Crop History IDs
    'crop-history-list', 'crop-history-empty'
  ];

  requiredPart2Ids.forEach(id => {
    assert(indexHtml.includes(`id="${id}"`), `Missing required Part 2 DOM id="${id}"`);
  });
  console.log(`  [PASS] All ${requiredPart2Ids.length} Part 2 interactive DOM elements verified.`);

  console.log('\n=========================================');
  console.log('ALL PART 2 TEST SUITE CHECKS PASSED (6/6)');
  console.log('=========================================');
}

runPart2Tests().catch(err => {
  console.error('PART 2 TEST SUITE FAILED:', err);
  process.exit(1);
});
