/**
 * Automated Verification & Regression Test Suite
 * Campus PassPro • GRT Institute of Engineering and Technology
 */

const fs = require('fs');
const path = require('path');

async function runAllTests() {
  console.log('====================================================');
  console.log('CAMPUS PASSPRO • SYSTEM INTEGRITY & REGRESSION SUITE');
  console.log('====================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  function assert(name, condition, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${name}`);
    } else {
      console.error(`[FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
    }
  }

  // TEST SUITE 1: ARCHITECTURE & UI ISOLATION
  console.log('--- Suite 1: Dashboard UI & Master Auditing Buttons ---');
  const dashboardJs = fs.readFileSync(path.join(__dirname, '../js/dashboard.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

  // Check authSec_all sections
  const secAllMatches = [...dashboardJs.matchAll(/id="authSec_all"[\s\S]*?<\/div>\s*<\/div>/g)];
  let buttonsUnderAllRecords = false;
  for (const match of secAllMatches) {
    if (match[0].includes('downloadMasterPDF') || match[0].includes('downloadAllCompleteLettersPDF')) {
      buttonsUnderAllRecords = true;
      break;
    }
  }
  assert('Master & Download All PDF omitted from All Records section', !buttonsUnderAllRecords);

  const hasTopMasterPdf = indexHtml.includes('id="topBulkPdfBtn"') && indexHtml.includes('downloadMasterPDF');
  const hasTopDownloadAll = indexHtml.includes('id="topBulkLettersBtn"') && indexHtml.includes('downloadAllCompleteLettersPDF');
  const hasTopClearAll = indexHtml.includes('id="clearAllDataBtn"') && indexHtml.includes('confirmAndClearAllData');
  assert('Top Header displays Master Auditing PDF trigger', hasTopMasterPdf);
  assert('Top Header displays Download All PDF trigger', hasTopDownloadAll);
  assert('Top Header displays Scoped Clear All trigger', hasTopClearAll);

  // TEST SUITE 2: PDF GENERATION & DUAL LETTER ENGINE
  console.log('\n--- Suite 2: PDF Generation & GRT Logo Integrity ---');
  const pdfServiceJs = fs.readFileSync(path.join(__dirname, '../js/services/pdfService.js'), 'utf8');

  assert('Master Auditing PDF has Section 1 (Gate Pass List)', pdfServiceJs.includes('SECTION 1: CAMPUS GATE PASS MASTER AUDIT'));
  assert('Master Auditing PDF has Section 2 (OD List)', pdfServiceJs.includes('SECTION 2: ACADEMIC ON-DUTY (OD) MASTER AUDIT'));
  assert('Master Auditing PDF uses 1:1 square centered GRT College Logo', pdfServiceJs.includes('doc.addImage(logo, \'PNG\', leftLogoX, logoY, logoSize, logoSize)'));
  assert('Download All PDF compiles Gate Pass Letters', pdfServiceJs.includes('renderOfficialGatePassLetterPage('));
  assert('Download All PDF compiles OD Letters', pdfServiceJs.includes('renderOfficialODLetterPage('));

  // TEST SUITE 3: DATABASE INDEXES & PERFORMANCE OPTIMIZATIONS
  console.log('\n--- Suite 3: Database Compound Indexes & Asset Optimization ---');
  const passModel = fs.readFileSync(path.join(__dirname, '../src/models/Pass.js'), 'utf8');
  const odModel = fs.readFileSync(path.join(__dirname, '../src/models/OnDuty.js'), 'utf8');

  assert('Pass schema includes counselor compound index', passModel.includes('PassSchema.index({ counselorName: 1, status: 1, createdAt: -1 })'));
  assert('Pass schema includes department + yearSec index', passModel.includes('PassSchema.index({ dept: 1, yearSec: 1, status: 1 })'));
  assert('Pass schema includes warden hostel index', passModel.includes('PassSchema.index({ accommodation: 1, gender: 1, status: 1 })'));
  assert('OnDuty schema includes counselor compound index', odModel.includes('OnDutySchema.index({ counselorName: 1, status: 1, createdAt: -1 })'));
  assert('OnDuty schema includes department + yearSec index', odModel.includes('OnDutySchema.index({ dept: 1, yearSec: 1, status: 1 })'));

  const bannerPath = path.join(__dirname, '../public/grt-banner.png');
  if (fs.existsSync(bannerPath)) {
    const bannerSize = fs.statSync(bannerPath).size;
    assert('Banner PNG compressed (< 1.5MB vs original 4.87MB)', bannerSize < 1.5 * 1024 * 1024, `Size: ${(bannerSize/1024).toFixed(1)} KB`);
  }

  // TEST SUITE 4: BATCH APPROVAL & LIVE FILTERING CAPABILITIES
  console.log('\n--- Suite 4: Batch Approval, Filtering & Offline Capabilities ---');
  const approvalRoutes = fs.readFileSync(path.join(__dirname, '../src/routes/approvalRoutes.js'), 'utf8');
  const approvalController = fs.readFileSync(path.join(__dirname, '../src/controllers/approvalController.js'), 'utf8');

  assert('Route POST /api/approvals/bulk registered', approvalRoutes.includes("router.post('/bulk', approvalController.bulkApprovePasses)"));
  assert('approvalController supports bulk multi-pass approval', approvalController.includes('async function bulkApprovePasses'));
  assert('approvalController handles both Pass and OnDuty bulk approvals', approvalController.includes('const od = await OnDuty.findById(id)'));
  assert('dashboard.js exports live queue filter functions', dashboardJs.includes('window.filterPendingQueueLive = filterPendingQueueLive'));
  assert('dashboard.js exports batch action execution', dashboardJs.includes('window.executeBatchApproval = executeBatchApproval'));

  const scannerJs = fs.readFileSync(path.join(__dirname, '../js/scanner.js'), 'utf8');
  assert('scanner.js implements offline queue storage', scannerJs.includes('localStorage.setItem(\'offlineScanQueue\''));
  assert('scanner.js automatically syncs on online event', scannerJs.includes("window.addEventListener('online'"));

  // TEST SUITE 5: LIVE API CLEAR-ALL SCOPING INTEGRATION
  console.log('\n--- Suite 5: Live API Scoped Clear All Test ---');
  const baseApi = 'http://localhost:10000';
  const testUser = `test_authority_${Date.now()}`;

  try {
    // 5.1 Submit test GP
    const gpRes = await (await fetch(`${baseApi}/api/apply-pass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rollNo: '110324104003',
        reason: 'Automated Test Leave',
        departureDate: '2026-09-28',
        departureTime: '09:00',
        expectedReturnDate: '2026-09-29',
        expectedReturnTime: '18:00'
      })
    })).json();
    assert('API apply-pass creates Gate Pass successfully', gpRes.success === true);

    // 5.2 Submit test OD
    const odRes = await (await fetch(`${baseApi}/api/onduty/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rollNo: '110324104003',
        mode: 'dates',
        fromDate: '2026-09-29',
        toDate: '2026-09-30',
        reason: 'Automated Test OnDuty Event'
      })
    })).json();
    assert('API onduty/apply creates On-Duty successfully', odRes.success === true);

    // 5.3 Fetch as counselor before clear
    const cPassBefore = await (await fetch(`${baseApi}/api/passes?authorityUserId=${testUser}&role=counselor&startRoll=110324104001&endRoll=110324104050`)).json();
    const cODBefore = await (await fetch(`${baseApi}/api/onduty?authorityUserId=${testUser}&role=counselor&startRoll=110324104001&endRoll=110324104050`)).json();
    assert('Authority queries fetch active passes & ODs', Array.isArray(cPassBefore) && Array.isArray(cODBefore));

    // 5.4 Execute Scoped Clear All
    const clearRes = await (await fetch(`${baseApi}/api/passes/clear-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'counselor',
        userId: testUser,
        authorityUserId: testUser,
        startRoll: '110324104001',
        endRoll: '110324104050',
        currentlyLoadedPassIds: cPassBefore.map(p => p._id),
        currentlyLoadedODIds: cODBefore.map(o => o._id)
      })
    })).json();
    assert('API clear-all execution succeeds', clearRes.success === true);

    // 5.5 Query after clear
    const cPassAfter = await (await fetch(`${baseApi}/api/passes?authorityUserId=${testUser}&role=counselor&startRoll=110324104001&endRoll=110324104050`)).json();
    const cODAfter = await (await fetch(`${baseApi}/api/onduty?authorityUserId=${testUser}&role=counselor&startRoll=110324104001&endRoll=110324104050`)).json();
    assert('Authority dashboard shows 0 requests after scoped clear', cPassAfter.length === 0 && cODAfter.length === 0);

  } catch (err) {
    console.warn(`[SKIP] Live server API test skipped: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('====================================================\n');

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
