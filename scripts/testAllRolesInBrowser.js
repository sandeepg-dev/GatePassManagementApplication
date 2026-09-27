const puppeteer = require('puppeteer-core');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testAllRoles() {
  console.log('Launching Edge browser for comprehensive role & sign-out verification...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  
  const testAccounts = [
    { role: 'Student', id: '110324104061', pass: 'grt@123' },
    { role: 'Counselor', id: '7471', pass: 'grt@123' },
    { role: 'Advisor', id: '7472', pass: 'grt@123' },
    { role: 'HOD', id: '7247', pass: 'grt@123' },
    { role: 'Warden', id: '6661', pass: 'grt@123' },
    { role: 'Principal', id: 'grt@head', pass: 'grt@123' }
  ];

  for (const acc of testAccounts) {
    console.log(`\nTesting ${acc.role} flow (Common Login -> Dashboard -> Sign Out -> Common Login)...`);
    await page.goto('http://localhost:10000', { waitUntil: 'networkidle2' });
    
    // Clear storage and reload
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle2' });

    // Verify common login is visible initially
    const loginVisibleBefore = await page.evaluate(() => {
      const el = document.getElementById('singleLoginPortalScreen');
      return el && !el.classList.contains('hidden');
    });
    if (!loginVisibleBefore) throw new Error(`Common login screen not visible initially for ${acc.role}`);

    // Type credentials and submit
    await page.type('#commonLoginId', acc.id);
    await page.type('#commonPassword', acc.pass);
    await page.click('#commonLoginBtn');

    await new Promise(r => setTimeout(r, 1500));

    // Verify dashboard rendered
    const dashCheck = await page.evaluate(() => {
      const loginPortal = document.getElementById('singleLoginPortalScreen');
      const dashScreen = document.getElementById('dashScreen');
      const greeting = document.getElementById('dashGreeting')?.innerText;
      const roleContent = document.getElementById('roleDashboardContent');
      return {
        loginHidden: loginPortal ? loginPortal.classList.contains('hidden') : false,
        dashVisible: dashScreen ? !dashScreen.classList.contains('hidden') : false,
        greeting,
        roleContentLength: roleContent ? roleContent.innerHTML.length : 0,
        userRole: window.loggedUser?.role
      };
    });
    console.log(`  Login Result for ${acc.role}:`, dashCheck);
    if (!dashCheck.dashVisible || dashCheck.roleContentLength === 0) {
      throw new Error(`Failed to render dashboard for ${acc.role}`);
    }

    // Now test Sign Out
    await page.evaluate(() => {
      window.logout();
    });
    await new Promise(r => setTimeout(r, 800));

    // Verify user is back on Common Login
    const postLogoutState = await page.evaluate(() => {
      const loginPortal = document.getElementById('singleLoginPortalScreen');
      const dashScreen = document.getElementById('dashScreen');
      return {
        loginVisible: loginPortal && !loginPortal.classList.contains('hidden'),
        dashHidden: dashScreen && dashScreen.classList.contains('hidden'),
        sessionCleared: !sessionStorage.getItem('campusPassUser') && !localStorage.getItem('campusPassUser')
      };
    });
    console.log(`  Sign Out Result for ${acc.role}:`, postLogoutState);
    if (!postLogoutState.loginVisible || !postLogoutState.dashHidden || !postLogoutState.sessionCleared) {
      throw new Error(`Sign out failed for ${acc.role}: not returned to Common Login!`);
    }
    console.log(`  PASSED: ${acc.role} (Common Login -> Dashboard -> Sign Out -> Common Login)`);
  }

  // Test Admin: Common Login -> Admin Dashboard -> Sign Out -> Common Login
  console.log('\nTesting Admin flow (Common Login -> Admin Dashboard -> Sign Out -> Common Login)...');
  await page.goto('http://localhost:10000', { waitUntil: 'networkidle2' });
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.reload({ waitUntil: 'networkidle2' });

  await page.type('#commonLoginId', 'admin');
  await page.type('#commonPassword', 'Admin@123');
  await page.click('#commonLoginBtn');
  await new Promise(r => setTimeout(r, 2000));

  const adminUrl = page.url();
  console.log('  Admin redirected URL:', adminUrl);
  if (!adminUrl.includes('admin.html')) {
    throw new Error('Admin was not redirected to /admin.html!');
  }

  // Verify Admin page does NOT contain "Institutional Portal"
  const adminPageVerification = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const hasInstPortal = /institutional\s*portal/i.test(bodyText);
    const hasAdminLoginScreen = document.getElementById('adminLoginScreen') !== null;
    const adminDashboard = document.getElementById('adminDashboardScreen');
    const isDashboardVisible = adminDashboard && !adminDashboard.classList.contains('hidden');
    return {
      hasInstPortal,
      hasAdminLoginScreen,
      isDashboardVisible
    };
  });
  console.log('  Admin Page State:', adminPageVerification);
  if (adminPageVerification.hasInstPortal) {
    throw new Error('FAILED: "Institutional Portal" text found on Admin page!');
  }
  if (adminPageVerification.hasAdminLoginScreen) {
    throw new Error('FAILED: Separate admin login screen found on Admin page!');
  }
  if (!adminPageVerification.isDashboardVisible) {
    throw new Error('FAILED: Admin dashboard is not visible!');
  }
  console.log('  PASSED: Admin dashboard clean without separate login or Institutional Portal link.');

  // Test Admin Sign Out
  console.log('  Testing Admin Sign Out...');
  await page.evaluate(() => {
    window.adminLogout();
  });
  await new Promise(r => setTimeout(r, 1200));

  const postAdminLogoutUrl = page.url();
  const isBackOnCommonLogin = await page.evaluate(() => {
    const loginPortal = document.getElementById('singleLoginPortalScreen');
    const dashScreen = document.getElementById('dashScreen');
    return {
      url: window.location.href,
      loginVisible: loginPortal && !loginPortal.classList.contains('hidden'),
      dashHidden: dashScreen && dashScreen.classList.contains('hidden'),
      adminCleared: !sessionStorage.getItem('campusAdminUser') && !localStorage.getItem('campusAdminUser')
    };
  });
  console.log('  Admin Post-Logout State:', isBackOnCommonLogin);
  if (!isBackOnCommonLogin.loginVisible || !isBackOnCommonLogin.adminCleared) {
    throw new Error('FAILED: Admin logout did not return to Common Login page!');
  }
  console.log('  PASSED: Admin signed out cleanly back to Common Login page!');

  // Test Direct unauthenticated access to /admin.html
  console.log('\nTesting Unauthenticated Direct Access to /admin.html...');
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.goto('http://localhost:10000/admin.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const unauthUrl = page.url();
  const unauthCheck = await page.evaluate(() => {
    const loginPortal = document.getElementById('singleLoginPortalScreen');
    return {
      url: window.location.href,
      loginVisible: loginPortal && !loginPortal.classList.contains('hidden')
    };
  });
  console.log('  Direct /admin.html Access Result:', unauthCheck);
  if (!unauthCheck.loginVisible || unauthUrl.includes('admin.html')) {
    throw new Error('FAILED: Direct access to /admin.html was not redirected to Common Login!');
  }
  console.log('  PASSED: Direct access to /admin.html instantly redirected to Common Login!');

  await browser.close();
  console.log('\n======================================================');
  console.log('ALL COMMON LOGIN, ROLE ROUTING, AND SIGN OUT TESTS PASSED!');
  console.log('======================================================');
}

testAllRoles().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
