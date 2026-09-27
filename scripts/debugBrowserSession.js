const puppeteer = require('puppeteer-core');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function runBrowserDebug() {
  console.log('Launching Edge browser...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  
  // Collect all console logs
  const logs = [];
  page.on('console', msg => {
    logs.push(`[CONSOLE ${msg.type()}]: ${msg.text()}`);
    console.log(`[BROWSER CONSOLE ${msg.type()}]: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    logs.push(`[PAGE ERROR]: ${err.message}`);
    console.error(`[BROWSER ERROR]:`, err.message);
  });

  console.log('\n--- SCENARIO 1: Fresh clean load of http://localhost:10000 ---');
  await page.goto('http://localhost:10000', { waitUntil: 'networkidle2' });

  // Evaluate UI state
  const state1 = await page.evaluate(() => {
    const loginPortal = document.getElementById('singleLoginPortalScreen');
    const dashScreen = document.getElementById('dashScreen');
    const overlay = document.getElementById('authCheckingOverlay');
    return {
      loginPortalVisible: loginPortal ? !loginPortal.classList.contains('hidden') : null,
      dashScreenVisible: dashScreen ? !dashScreen.classList.contains('hidden') : null,
      overlayPresent: !!overlay,
      overlayVisible: overlay ? !overlay.classList.contains('hidden') : false,
      loggedUser: window.loggedUser || null,
      localStorageUser: localStorage.getItem('campusPassUser'),
      bodyChildrenCount: document.body.children.length
    };
  });
  console.log('Scenario 1 State:', state1);

  // Take screenshot 1
  await page.screenshot({ path: path.join(__dirname, 'screenshot1_startup.png') });
  console.log('Saved screenshot1_startup.png');

  console.log('\n--- SCENARIO 2: Typing credentials and signing in as Student ---');
  await page.type('#commonLoginId', '110324104061');
  await page.type('#commonPassword', 'grt@123');
  await page.click('#commonLoginBtn');

  // Wait 2 seconds for API and dashboard rendering
  await new Promise(r => setTimeout(r, 2000));

  const state2 = await page.evaluate(() => {
    const loginPortal = document.getElementById('singleLoginPortalScreen');
    const dashScreen = document.getElementById('dashScreen');
    const roleContent = document.getElementById('roleDashboardContent');
    const greeting = document.getElementById('dashGreeting');
    return {
      loginPortalVisible: loginPortal ? !loginPortal.classList.contains('hidden') : null,
      dashScreenVisible: dashScreen ? !dashScreen.classList.contains('hidden') : null,
      greetingText: greeting ? greeting.innerText : null,
      roleContentLength: roleContent ? roleContent.innerHTML.length : 0,
      loggedUser: window.loggedUser || null
    };
  });
  console.log('Scenario 2 (Student Login) State:', state2);

  // Take screenshot 2
  await page.screenshot({ path: path.join(__dirname, 'screenshot2_student_dash.png') });
  console.log('Saved screenshot2_student_dash.png');

  console.log('\n--- SCENARIO 3: Refreshing page while authenticated ---');
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const state3 = await page.evaluate(() => {
    const loginPortal = document.getElementById('singleLoginPortalScreen');
    const dashScreen = document.getElementById('dashScreen');
    const roleContent = document.getElementById('roleDashboardContent');
    return {
      loginPortalVisible: loginPortal ? !loginPortal.classList.contains('hidden') : null,
      dashScreenVisible: dashScreen ? !dashScreen.classList.contains('hidden') : null,
      roleContentLength: roleContent ? roleContent.innerHTML.length : 0,
      loggedUser: window.loggedUser || null
    };
  });
  console.log('Scenario 3 (Refresh) State:', state3);

  console.log('\n--- SCENARIO 4: Logging out ---');
  await page.evaluate(() => {
    if (typeof logout === 'function') logout();
  });
  await new Promise(r => setTimeout(r, 500));

  const state4 = await page.evaluate(() => {
    const loginPortal = document.getElementById('singleLoginPortalScreen');
    const dashScreen = document.getElementById('dashScreen');
    return {
      loginPortalVisible: loginPortal ? !loginPortal.classList.contains('hidden') : null,
      dashScreenVisible: dashScreen ? !dashScreen.classList.contains('hidden') : null,
      loggedUser: window.loggedUser || null,
      localStorageUser: localStorage.getItem('campusPassUser')
    };
  });
  console.log('Scenario 4 (Logout) State:', state4);

  // Take screenshot 4
  await page.screenshot({ path: path.join(__dirname, 'screenshot4_after_logout.png') });
  console.log('Saved screenshot4_after_logout.png');

  await browser.close();
  console.log('\nBrowser debug session completed!');
}

runBrowserDebug().catch(err => {
  console.error('Fatal debug script error:', err);
  process.exit(1);
});
