const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:10000', { waitUntil: 'networkidle0' });

  console.log('[Browser] Navigated to login page.');
  await page.type('#commonLoginId', '110324104001');
  await page.type('#commonPassword', 'student123');
  await page.click('#commonLoginBtn');

  await page.waitForSelector('#studentPortalContainer:not(.hidden)', { timeout: 8000 });
  console.log('[Browser] Student Portal is visible.');

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'public/student_dashboard_test.png', fullPage: true });
  console.log('[Browser] Screenshot saved to public/student_dashboard_test.png');

  // Verify elements
  const leaveActive = await page.$eval('#stuTopNav_leave', el => el.classList.contains('border-b-2'));
  console.log('[Browser] Leave tab active:', leaveActive);

  const heroHeading = await page.$eval('#stuHeroHeading', el => el.innerText);
  console.log('[Browser] Hero heading:', heroHeading);

  const tableRows = await page.$$eval('#stuLeaveTableBody tr', rows => rows.length);
  console.log('[Browser] Table rows rendered:', tableRows);

  // Test Sign Out
  await page.click('#stuAvatarInitials');
  await new Promise(r => setTimeout(r, 500));
  const dropdownVisible = await page.$eval('#stuProfileDropdown', el => !el.classList.contains('hidden'));
  console.log('[Browser] Profile dropdown toggled:', dropdownVisible);

  await page.evaluate(() => logout());
  await page.waitForSelector('#singleLoginPortalScreen:not(.hidden)', { timeout: 5000 });
  console.log('[Browser] Sign Out redirected back to Common Login Page successfully.');

  await browser.close();
  console.log('[Browser] Test completed successfully.');
})().catch(err => {
  console.error('Browser test failed:', err);
  process.exit(1);
});
