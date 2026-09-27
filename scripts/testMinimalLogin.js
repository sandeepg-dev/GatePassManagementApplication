const puppeteer = require('puppeteer-core');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = 'http://localhost:10000';

(async () => {
  console.log('Testing minimal login design in Edge browser...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Visit index.html with clear cache
  await page.goto(APP_URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle2' });

  // 2. Verify login page elements
  const loginState = await page.evaluate(() => {
    const portal = document.getElementById('singleLoginPortalScreen');
    const h1 = portal ? portal.querySelector('h1')?.innerText : '';
    const img = portal ? portal.querySelector('img')?.getAttribute('src') : '';
    const idInput = document.getElementById('commonLoginId');
    const passInput = document.getElementById('commonPassword');
    const btn = document.getElementById('commonLoginBtn');
    const hasAdminLink = !!portal?.querySelector('a[href*="admin"]');
    const hasRememberMe = !!portal?.querySelector('#rememberMe');
    const fullText = portal ? portal.innerText : '';

    return {
      portalVisible: portal && !portal.classList.contains('hidden') && portal.offsetParent !== null,
      h1Text: h1,
      hasLogo: !!img,
      hasIdInput: !!idInput,
      idPlaceholder: idInput?.placeholder,
      hasPassInput: !!passInput,
      passPlaceholder: passInput?.placeholder,
      btnText: btn?.innerText?.trim(),
      hasAdminLink,
      hasRememberMe,
      hasGRTInstituteText: fullText.includes('GRT Institute of Engineering and Technology'),
      fullText
    };
  });

  console.log('Login Screen UI Verification:', JSON.stringify(loginState, null, 2));

  // Take screenshot of the minimal login page
  const screenshotPath = path.join(__dirname, 'minimal_login_screen.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`Saved screenshot to ${screenshotPath}`);

  // 3. Test Student login & button animation
  console.log('Testing Student login submission & button transition...');
  await page.type('#commonLoginId', '110324104061');
  await page.type('#commonPassword', 'grt@123');

  // Click submit and check intermediate button animation
  const submitPromise = page.click('#commonLoginBtn');
  
  // Wait a small bit to observe loading animation
  await new Promise(r => setTimeout(r, 60));
  const loadingBtnState = await page.evaluate(() => {
    const btn = document.getElementById('commonLoginBtn');
    return {
      disabled: btn?.disabled,
      isLoading: btn?.classList.contains('is-loading'),
      btnText: btn?.innerText?.trim()
    };
  });
  console.log('Button during authentication:', loadingBtnState);

  await submitPromise;
  await page.waitForFunction(() => {
    const dash = document.getElementById('dashScreen');
    return dash && !dash.classList.contains('hidden');
  }, { timeout: 8000 });

  const studentDashResult = await page.evaluate(() => {
    return {
      dashVisible: !document.getElementById('dashScreen')?.classList.contains('hidden'),
      loginHidden: document.getElementById('singleLoginPortalScreen')?.classList.contains('hidden'),
      greeting: document.getElementById('dashGreetingName')?.innerText?.trim()
    };
  });
  console.log('Student Dashboard Result:', studentDashResult);

  // 4. Test Single Login for Admin
  console.log('Testing Admin single login...');
  await page.goto(APP_URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle2' });

  await page.type('#commonLoginId', 'admin');
  await page.type('#commonPassword', 'Admin@123');
  await page.click('#commonLoginBtn');

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 });
  const adminUrl = page.url();
  const adminDashVisible = await page.evaluate(() => {
    return !document.getElementById('adminDashboardScreen')?.classList.contains('hidden');
  });

  console.log('Admin redirected to:', adminUrl, '| Admin Dashboard Visible:', adminDashVisible);

  await browser.close();
  console.log('All minimal login and single authentication tests completed successfully!');
})();
