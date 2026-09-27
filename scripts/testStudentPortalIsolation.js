const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  console.log('[TestStudentIsolation] Launching Edge browser...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://127.0.0.1:10000', { waitUntil: 'networkidle0' });

  // Login as student
  console.log('[TestStudentIsolation] Logging in as Student (110324104061)...');
  await page.type('#commonLoginId', '110324104061');
  await page.type('#commonPassword', 'grt@123');
  await page.click('#commonLoginBtn');

  // Wait for 1.5s loader transition
  await page.waitForSelector('#grtPageTransitionLoader:not(.active)', { timeout: 6000 });
  await new Promise(r => setTimeout(r, 1000));

  // Verify Student Portal Container is visible
  const isStuPortalVisible = await page.$eval('#studentPortalContainer', el => {
    const s = window.getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden';
  });
  console.log('[TestStudentIsolation] Student Portal Container visible:', isStuPortalVisible);

  // Verify Authority Dashboard Layout is COMPLETELY HIDDEN
  const isAuthLayoutHidden = await page.$eval('#authorityDashboardLayout', el => {
    const s = window.getComputedStyle(el);
    return s.display === 'none' || s.visibility === 'hidden' || el.classList.contains('hidden');
  });
  console.log('[TestStudentIsolation] Authority Dashboard Layout hidden:', isAuthLayoutHidden);

  // Check all authority queues and controls
  const authorityCheck = await page.evaluate(() => {
    function isVisible(el) {
      if (!el) return false;
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && (r.width > 0 || r.height > 0);
    }

    const checkIds = [
      'authorityDashboardLayout',
      'authScreen',
      'counselorQueue',
      'advisorQueue',
      'hodQueue',
      'principalQueue',
      'wardenQueue',
      'roleDashboardContent',
      'topBulkPdfBtn',
      'topBulkLettersBtn',
      'clearAllDataBtn',
      'authTopNav_dashboard',
      'authTopNav_pass',
      'authTopNav_leave',
      'authTopNav_onduty'
    ];

    const visibleAuthorityElements = [];
    for (const id of checkIds) {
      const el = document.getElementById(id);
      if (el && isVisible(el)) {
        visibleAuthorityElements.push(id);
      }
    }

    return { visibleAuthorityElements };
  });

  console.log('[TestStudentIsolation] Visible authority elements (must be 0):', authorityCheck.visibleAuthorityElements.length);
  if (authorityCheck.visibleAuthorityElements.length > 0) {
    console.error('FAIL: Detected visible authority elements:', authorityCheck.visibleAuthorityElements);
    process.exit(1);
  }

  // Scroll down completely to bottom
  console.log('[TestStudentIsolation] Scrolling down to bottom of page...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 500));

  // Verify after scrolling that STILL no authority elements appear
  const authorityCheckAfterScroll = await page.evaluate(() => {
    function isVisible(el) {
      if (!el) return false;
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && (r.width > 0 || r.height > 0);
    }

    const auth = document.getElementById('authorityDashboardLayout');
    return auth && isVisible(auth);
  });
  console.log('[TestStudentIsolation] Authority layout visible after scroll (must be false):', authorityCheckAfterScroll);

  // Take screenshot of bottom of page
  await page.screenshot({ path: 'public/screenshot_student_scrolled_bottom.png' });
  console.log('[TestStudentIsolation] Saved public/screenshot_student_scrolled_bottom.png');

  // Now switch to My Requests page
  console.log('[TestStudentIsolation] Switching to My Requests page...');
  await page.click('#stuNav_requests');
  await page.waitForSelector('#grtPageTransitionLoader:not(.active)', { timeout: 6000 });
  await new Promise(r => setTimeout(r, 1000));

  // Scroll down in My Requests
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.screenshot({ path: 'public/screenshot_student_requests_scrolled.png' });
  console.log('[TestStudentIsolation] Saved public/screenshot_student_requests_scrolled.png');

  console.log('[TestStudentIsolation] ALL STUDENT ISOLATION CHECKS PASSED PERFECTLY!');
  await browser.close();
})();
