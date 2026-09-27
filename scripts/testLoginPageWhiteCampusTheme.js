const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  console.log('[TestLoginTheme] Starting browser testing...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Initial Launch
  await page.goto('http://127.0.0.1:10000', { waitUntil: 'networkidle0' });
  console.log('[TestLoginTheme] Loaded initial URL.');

  // Check that Login page appears first
  const loginState = await page.evaluate(() => {
    function isVisible(el) {
      if (!el) return false;
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && (r.width > 0 || r.height > 0);
    }

    const loginScreen = document.getElementById('singleLoginPortalScreen');
    const loginCard = document.getElementById('loginCard');
    const dashScreen = document.getElementById('dashScreen');
    const stuPortal = document.getElementById('studentPortalContainer');
    const authLayout = document.getElementById('authorityDashboardLayout');
    const campusBg = document.getElementById('loginCampusBg');

    const cardComputed = loginCard ? window.getComputedStyle(loginCard) : null;
    const bgComputed = campusBg ? window.getComputedStyle(campusBg) : null;

    return {
      loginScreenVisible: isVisible(loginScreen),
      loginCardVisible: isVisible(loginCard),
      cardBgColor: cardComputed ? cardComputed.backgroundColor : null,
      hasCampusBg: bgComputed && bgComputed.backgroundImage.includes('splash-bg.jpg'),
      dashScreenVisible: isVisible(dashScreen),
      stuPortalVisible: isVisible(stuPortal),
      authLayoutVisible: isVisible(authLayout)
    };
  });

  console.log('[TestLoginTheme] Login screen visible:', loginState.loginScreenVisible);
  console.log('[TestLoginTheme] Login card visible:', loginState.loginCardVisible);
  console.log('[TestLoginTheme] Login card background color (white theme):', loginState.cardBgColor);
  console.log('[TestLoginTheme] Campus background image present:', loginState.hasCampusBg);
  console.log('[TestLoginTheme] Dashboards visible BEFORE login (must be false):', {
    dashScreen: loginState.dashScreenVisible,
    studentPortal: loginState.stuPortalVisible,
    authorityLayout: loginState.authLayoutVisible
  });

  if (!loginState.loginScreenVisible || !loginState.loginCardVisible || !loginState.hasCampusBg) {
    console.error('FAIL: Login page with campus background not active on startup!');
    process.exit(1);
  }

  if (loginState.dashScreenVisible || loginState.stuPortalVisible || loginState.authLayoutVisible) {
    console.error('FAIL: A dashboard was visible BEFORE login!');
    process.exit(1);
  }

  // Capture screenshot of the new white login card with campus photo background
  await page.screenshot({ path: 'public/screenshot_login_white_campus_theme.png' });
  console.log('[TestLoginTheme] Saved public/screenshot_login_white_campus_theme.png');

  // 2. Test Student Login & Role Redirection
  console.log('[TestLoginTheme] Testing Student login redirection...');
  await page.type('#commonLoginId', '110324104061');
  await page.type('#commonPassword', 'grt@123');
  await page.click('#commonLoginBtn');

  // Wait for loader to become active on login
  await page.waitForSelector('#grtPageTransitionLoader.active', { timeout: 6000 });
  // Wait for loader to complete (1.5s)
  await page.waitForSelector('#grtPageTransitionLoader:not(.active)', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1000));

  const studentPostLogin = await page.evaluate(() => {
    function isVisible(el) {
      if (!el) return false;
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && (r.width > 0 || r.height > 0);
    }
    return {
      studentVisible: isVisible(document.getElementById('studentPortalContainer')),
      authorityVisible: isVisible(document.getElementById('authorityDashboardLayout')),
      loginVisible: isVisible(document.getElementById('singleLoginPortalScreen'))
    };
  });
  console.log('[TestLoginTheme] Post Student Login State:', studentPostLogin);

  if (!studentPostLogin.studentVisible || studentPostLogin.authorityVisible || studentPostLogin.loginVisible) {
    console.error('FAIL: Student redirection not strictly isolated!');
    process.exit(1);
  }

  // 3. Test Logout & Return to Login
  console.log('[TestLoginTheme] Testing logout...');
  await page.evaluate(() => {
    if (typeof logout === 'function') logout();
  });
  await new Promise(r => setTimeout(r, 1500));

  const postLogout = await page.evaluate(() => {
    function isVisible(el) {
      if (!el) return false;
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && (r.width > 0 || r.height > 0);
    }
    return {
      loginVisible: isVisible(document.getElementById('singleLoginPortalScreen')),
      dashVisible: isVisible(document.getElementById('dashScreen')),
      studentVisible: isVisible(document.getElementById('studentPortalContainer')),
      authorityVisible: isVisible(document.getElementById('authorityDashboardLayout'))
    };
  });
  console.log('[TestLoginTheme] Post Logout State:', postLogout);

  if (!postLogout.loginVisible || postLogout.dashVisible || postLogout.studentVisible || postLogout.authorityVisible) {
    console.error('FAIL: Logout did not return to clean login page!');
    process.exit(1);
  }

  // 4. Test Counselor (Authority) Login & Role Redirection
  console.log('[TestLoginTheme] Testing Authority (Counselor) login redirection...');
  await page.type('#commonLoginId', '7471');
  await page.type('#commonPassword', 'grt@123');
  await page.click('#commonLoginBtn');
  await new Promise(r => setTimeout(r, 2000));

  const authorityPostLogin = await page.evaluate(() => {
    function isVisible(el) {
      if (!el) return false;
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && (r.width > 0 || r.height > 0);
    }
    return {
      authorityVisible: isVisible(document.getElementById('authorityDashboardLayout')),
      studentVisible: isVisible(document.getElementById('studentPortalContainer')),
      loginVisible: isVisible(document.getElementById('singleLoginPortalScreen'))
    };
  });
  console.log('[TestLoginTheme] Post Authority Login State:', authorityPostLogin);

  if (!authorityPostLogin.authorityVisible || authorityPostLogin.studentVisible || authorityPostLogin.loginVisible) {
    console.error('FAIL: Authority redirection not strictly isolated!');
    process.exit(1);
  }

  console.log('[TestLoginTheme] ALL LOGIN THEME AND ROLE ISOLATION TESTS PASSED!');
  await browser.close();
})();
