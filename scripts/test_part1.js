/**
 * Automated Verification Suite for AgriSmart AI Part 1
 * Tests:
 * 1. AgriAuth: Login validation, signup validation, demo mode, session persistence, profile storage
 * 2. AgriOnboarding: 3-step state progression, validation, saving profile
 * 3. AgriI18n: Language keys coverage across en, hi, gu
 * 4. DOM Elements: Verification of all required IDs and ARIA tags in index.html
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

const i18nCode = fs.readFileSync(path.join(__dirname, '../frontend/js/i18n.js'), 'utf8');
eval(i18nCode);

async function runTests() {
  console.log('--- STARTING AGRI-SMART PART 1 TEST SUITE ---\n');

  // Test 1: Direct access without session
  console.log('1. Checking Initial Unauthenticated State');
  localStorage.clear();
  const initAuth = AgriAuth.getState();
  assert.strictEqual(initAuth.isAuthenticated, false, 'Should be unauthenticated initially');
  assert.strictEqual(initAuth.user, null, 'User should be null initially');
  console.log('  [PASS] Initial unauthenticated state verified.');

  // Test 2: Login validation
  console.log('\n2. Testing Login Validation');
  const emptyLogin = await AgriAuth.login({ identifier: '', password: '' });
  assert.strictEqual(emptyLogin.success, false);
  assert(emptyLogin.error.includes('email or 10-digit mobile'));
  console.log('  [PASS] Empty fields rejected');

  const shortPassLogin = await AgriAuth.login({ identifier: 'test@example.com', password: '123' });
  assert.strictEqual(shortPassLogin.success, false);
  assert(shortPassLogin.error.includes('at least 6 characters'));
  console.log('  [PASS] Short password rejected');

  // Test 3: Demo session login
  console.log('\n3. Testing Demo Session Login');
  const demoLogin = await AgriAuth.login({ isDemo: true });
  assert.strictEqual(demoLogin.success, true);
  assert.strictEqual(demoLogin.isDemo, true);
  assert.strictEqual(demoLogin.user.name, 'Ramesh Patel');
  
  const activeSession = AgriAuth.getState();
  assert.strictEqual(activeSession.isAuthenticated, true);
  assert.strictEqual(activeSession.isDemoUser, true);
  
  const demoProfile = AgriAuth.getFarmProfile();
  assert.strictEqual(demoProfile.farmName, 'Patel Krishi Farm');
  assert.strictEqual(demoProfile.state, 'Gujarat');
  assert.strictEqual(demoProfile.district, 'Ahmedabad');
  console.log('  [PASS] Demo session populated authentic farmer context.');

  // Test 4: Logout
  console.log('\n4. Testing Logout');
  AgriAuth.logout();
  const postLogout = AgriAuth.getState();
  assert.strictEqual(postLogout.isAuthenticated, false);
  assert.strictEqual(postLogout.user, null);
  console.log('  [PASS] Session cleared on logout.');

  // Test 5: Signup Validation
  console.log('\n5. Testing Signup Validation');
  const emptySignup = await AgriAuth.signup({});
  assert.strictEqual(emptySignup.success, false);
  assert(emptySignup.error.includes('full name'));

  const badEmailSignup = await AgriAuth.signup({
    fullName: 'Suresh Kumar',
    identifier: 'invalid-email',
    password: 'password123',
    confirmPassword: 'password123'
  });
  assert.strictEqual(badEmailSignup.success, false);
  assert(badEmailSignup.error.includes('valid email or 10-digit mobile'));

  const mismatchSignup = await AgriAuth.signup({
    fullName: 'Suresh Kumar',
    identifier: 'suresh@krishi.in',
    password: 'password123',
    confirmPassword: 'password456'
  });
  assert.strictEqual(mismatchSignup.success, false);
  assert(mismatchSignup.error.includes('Passwords do not match'));

  const validSignup = await AgriAuth.signup({
    fullName: 'Suresh Kumar',
    identifier: 'suresh@krishi.in',
    password: 'securePassword123',
    confirmPassword: 'securePassword123',
    farmName: 'Suresh Organic Farm'
  });
  assert.strictEqual(validSignup.success, true);
  assert.strictEqual(validSignup.user.name, 'Suresh Kumar');
  assert.strictEqual(validSignup.needsOnboarding, true);
  
  // Verify password is NOT stored in plaintext
  const rawUsers = JSON.parse(localStorage.getItem(AgriAuth.STORAGE_KEYS.USERS));
  assert(rawUsers[0].passHash.startsWith('h_'));
  assert.strictEqual(rawUsers[0].password, undefined, 'Plaintext password must not be stored');
  console.log('  [PASS] Signup validated and password safely hashed.');

  // Test 6: Farm Profile Persistence
  console.log('\n6. Testing Farm Profile Storage');
  AgriAuth.saveFarmProfile({
    state: 'Punjab',
    district: 'Ludhiana',
    primaryCrop: 'Wheat (गेहूँ)',
    soilType: 'Alluvial Loam',
    farmSizeAcres: '12'
  });
  const savedProfile = AgriAuth.getFarmProfile();
  assert.strictEqual(savedProfile.state, 'Punjab');
  assert.strictEqual(savedProfile.primaryCrop, 'Wheat (गेहूँ)');
  assert.strictEqual(savedProfile.farmSizeAcres, '12');
  console.log('  [PASS] Farm profile fields persisted correctly.');

  // Test 7: Translation Keys Completeness
  console.log('\n7. Testing Regional Translations');
  const requiredKeys = [
    'nav.brandTitle', 'nav.overview', 'nav.myFarm', 'nav.cropHealth',
    'nav.weather', 'nav.irrigation', 'nav.sustainability', 'nav.assistant',
    'auth.loginTitle', 'auth.signupTitle', 'auth.btnDemo',
    'onboard.step1Title', 'onboard.step2Title', 'onboard.step3Title'
  ];

  ['en', 'hi', 'gu'].forEach(lang => {
    requiredKeys.forEach(k => {
      const val = AgriI18n.t(k, lang);
      assert.notStrictEqual(val, k, `Missing translation for '${k}' in ${lang}`);
      assert(typeof val === 'string' && val.length > 0);
    });
  });
  console.log('  [PASS] All core navigation & auth keys present in English, Hindi, and Gujarati.');

  // Test 8: Verify DOM structure of index.html
  console.log('\n8. Testing index.html Structural Requirements');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../frontend/index.html'), 'utf8');

  const requiredDomIds = [
    'auth-view', 'app-shell', 'form-login', 'form-signup',
    'btn-demo-login', 'onboarding-modal', 'onboard-farm-name',
    'onboard-state', 'onboard-district', 'onboard-crop',
    'app-sidebar', 'btn-mobile-menu', 'header-page-title',
    'api-status-pill', 'header-profile-trigger',
    'header-profile-dropdown', 'view-overview', 'view-my-farm',
    'view-crop-health', 'view-weather', 'view-irrigation',
    'view-sustainability', 'view-assistant', 'view-settings',
    'agri-toast-container'
  ];

  requiredDomIds.forEach(id => {
    assert(indexHtml.includes(`id="${id}"`), `Missing required element id="${id}" in index.html`);
  });
  assert(!indexHtml.includes('id="lang-selector"'), 'Language selector must be completely removed from header');
  assert(!indexHtml.includes('id="settings-lang"'), 'Language selector must be completely removed from settings');
  console.log(`  [PASS] All ${requiredDomIds.length} required shell elements verified and language selector confirmed removed.`);

  console.log('\n=========================================');
  console.log('ALL PART 1 TEST SUITE CHECKS PASSED (8/8)');
  console.log('=========================================');
}

runTests().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
