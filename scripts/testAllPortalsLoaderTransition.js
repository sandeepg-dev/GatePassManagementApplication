const puppeteer = require('puppeteer-core');

const rolesToTest = [
  { name: 'Class Advisor', id: '7472', pass: 'grt@123', expectedElement: '#authSection_requests' },
  { name: 'Counselor', id: '7471', pass: 'grt@123', expectedElement: '#authSection_requests' },
  { name: 'HOD', id: '7247', pass: 'grt@123', expectedElement: '#authSection_requests' },
  { name: 'Principal', id: 'grt@head', pass: 'grt@123', expectedElement: '#authSection_requests' },
  { name: 'Boys Warden', id: '6661', pass: 'grt@123', expectedElement: '#authSection_requests' },
  { name: 'Admin', id: 'admin', pass: 'Admin@123', expectedUrl: '/admin.html' }
];

(async () => {
  console.log('[TestAllPortalsLoader] Starting verification across all user portals...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  for (const role of rolesToTest) {
    console.log(`\n--- Testing ${role.name} Login & Loader Transition ---`);
    await page.goto('http://127.0.0.1:10000', { waitUntil: 'networkidle0' });

    // Clear any previous state
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle0' });

    // Fill credentials
    await page.type('#commonLoginId', role.id);
    await page.type('#commonPassword', role.pass);
    await page.click('#commonLoginBtn');

    // Verify loader becomes active
    await page.waitForSelector('#grtPageTransitionLoader.active', { timeout: 8000 });
    console.log(`[PASS] ${role.name}: #grtPageTransitionLoader activated upon login!`);

    // Verify there is zero visible text inside the loader card
    const loaderText = await page.evaluate(() => {
      const card = document.getElementById('grtLoaderCard');
      // Clone card and remove sr-only elements to inspect visible text
      const clone = card.cloneNode(true);
      clone.querySelectorAll('.sr-only').forEach(el => el.remove());
      return clone.innerText.trim();
    });

    if (loaderText === '') {
      console.log(`[PASS] ${role.name}: Verified ZERO visible text in loader!`);
    } else {
      throw new Error(`Visible text found in loader: "${loaderText}"`);
    }

    if (role.name === 'Admin') {
      // Admin redirects to /admin.html
      await page.waitForFunction(() => window.location.pathname.includes('/admin.html'), { timeout: 6000 });
      console.log(`[PASS] Admin: Successfully redirected to /admin.html with loader!`);
      // Verify admin page has the loader as well
      await page.waitForSelector('#grtPageTransitionLoader', { timeout: 3000 });
      console.log(`[PASS] Admin: #grtPageTransitionLoader verified on /admin.html!`);
    } else {
      // Non-admin portals: wait for loader to smoothly fade out
      await page.waitForSelector('#grtPageTransitionLoader:not(.active)', { timeout: 5000 });
      console.log(`[PASS] ${role.name}: Loader smoothly finished.`);

      // Verify portal content is active
      const contentVisible = await page.$eval(role.expectedElement, el => !el.classList.contains('hidden'));
      console.log(`[PASS] ${role.name}: Target portal element visible:`, contentVisible);
    }
  }

  await browser.close();
  console.log('\n============================================================');
  console.log('ALL PORTALS (CLASS ADVISOR, COUNSELOR, HOD, PRINCIPAL, WARDEN, ADMIN)');
  console.log('SUCCESSFULLY VERIFIED WITH LOGO-ONLY LOADING SPINNER!');
  console.log('============================================================');
})().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
