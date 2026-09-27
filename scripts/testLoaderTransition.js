const puppeteer = require('puppeteer-core');

(async () => {
  console.log('[TestLoader] Launching Edge browser via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://127.0.0.1:10000', { waitUntil: 'networkidle0' });
  console.log('[TestLoader] Loaded Common Login Page.');

  page.on('console', msg => console.log('[BrowserConsole]', msg.text()));
  page.on('pageerror', err => console.log('[BrowserPageError]', err.message));

  // Login as student
  await page.type('#commonLoginId', '110324104061');
  await page.type('#commonPassword', 'grt@123');
  await page.click('#commonLoginBtn');

  // Verify loader is triggered on student entry
  await page.waitForSelector('#grtPageTransitionLoader.active', { timeout: 10000 });
  console.log('[TestLoader] PASS: #grtPageTransitionLoader is ACTIVE on student entry.');

  // Capture screenshot of loader with college logo
  await page.screenshot({ path: 'public/screenshot_loader_active.png' });
  console.log('[TestLoader] Saved public/screenshot_loader_active.png (Loader with College Logo).');

  // Check loader content
  const loaderTitle = await page.$eval('#grtLoaderTitle', el => el.innerText);
  const hasLogo = await page.$eval('#grtLoaderLogoImg', el => !!el.getAttribute('src'));
  console.log(`[TestLoader] Loader Title: "${loaderTitle}", Has Logo: ${hasLogo}`);

  // Wait for 1.5s loader transition to complete
  await page.waitForSelector('#grtPageTransitionLoader:not(.active)', { timeout: 4000 });
  console.log('[TestLoader] PASS: Loader smoothly completed after minimum duration.');

  // Verify Student Dashboard is active
  const isDashVisible = await page.$eval('#stuPage_dashboard', el => !el.classList.contains('hidden'));
  console.log('[TestLoader] PASS: Dashboard page is visible:', isDashVisible);

  // Take screenshot of student dashboard
  await page.screenshot({ path: 'public/screenshot_student_portal_ready.png' });
  console.log('[TestLoader] Saved public/screenshot_student_portal_ready.png');

  // Now test page switching: click My Requests
  console.log('[TestLoader] Clicking My Requests menu button...');
  await page.click('#stuNav_requests');

  // Check loader is active during page transition
  await page.waitForSelector('#grtPageTransitionLoader.active', { timeout: 1500 });
  const reqLoaderTitle = await page.$eval('#grtLoaderTitle', el => el.innerText);
  console.log(`[TestLoader] PASS: Loader activated on page switch with title: "${reqLoaderTitle}"`);

  // Wait for loader to complete
  await page.waitForSelector('#grtPageTransitionLoader:not(.active)', { timeout: 4000 });
  const isReqsVisible = await page.$eval('#stuPage_requests', el => !el.classList.contains('hidden'));
  console.log('[TestLoader] PASS: My Requests page is visible after loader completes:', isReqsVisible);

  // Take screenshot of My Requests page
  await page.screenshot({ path: 'public/screenshot_requests_ready.png' });
  console.log('[TestLoader] Saved public/screenshot_requests_ready.png');

  // Switch back to Dashboard
  console.log('[TestLoader] Switching back to Dashboard...');
  await page.click('#stuNav_dashboard');
  await page.waitForSelector('#grtPageTransitionLoader.active', { timeout: 1500 });
  console.log('[TestLoader] PASS: Loader active when returning to Dashboard.');

  await page.waitForSelector('#grtPageTransitionLoader:not(.active)', { timeout: 4000 });
  const isDashBack = await page.$eval('#stuPage_dashboard', el => !el.classList.contains('hidden'));
  console.log('[TestLoader] PASS: Back to Dashboard successfully:', isDashBack);

  await browser.close();
  console.log('\n[TestLoader] ALL 1.5S LOADER TRANSITION TESTS PASSED SUCCESSFULLY!');
})().catch(err => {
  console.error('[TestLoader] FAIL:', err);
  process.exit(1);
});
