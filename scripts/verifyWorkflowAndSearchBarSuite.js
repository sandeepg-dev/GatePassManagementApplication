/**
 * Comprehensive Verification Suite for:
 * 1. Day Scholar Gate Pass Workflow (Student -> Counselor -> Advisor -> HOD -> Principal -> Final Approval)
 * 2. Hosteller Gate Pass Workflow (Student -> Counselor -> Advisor -> HOD -> Principal -> Warden -> Final Approval)
 * 3. Leave Request Workflow (Student -> Counselor -> Advisor -> HOD -> Completed/Closed, never goes to Principal/Warden)
 * 4. OD Request Workflow (Student -> Counselor -> Advisor -> HOD -> Completed, never goes to Principal/Warden)
 * 5. Search Bar Visibility & Design Across All Portals (White theme, professional border, subtle shadow, clear placeholder & icon)
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectDB = require('../src/config/db');
const Pass = require('../src/models/Pass');
const OnDuty = require('../src/models/OnDuty');
const Student = require('../src/models/Student');
const User = require('../src/models/User');

const approvalController = require('../src/controllers/approvalController');
const onDutyController = require('../src/controllers/onDutyController');
const passController = require('../src/controllers/passController');

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function runSuite() {
  console.log('================================================================');
  console.log('  STARTING WORKFLOW & SEARCH BAR VERIFICATION SUITE');
  console.log('================================================================\n');

  await connectDB();
  console.log(' Connected to MongoDB via project connection manager.');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` [PASS] ${message}`);
      passed++;
    } else {
      console.error(` [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: DAY SCHOLAR GATE PASS WORKFLOW
    // Student -> Counselor -> Class Advisor -> HOD -> Principal -> Final Approval
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Day Scholar Gate Pass Workflow ---');
    const dayScholarPass = new Pass({
      rollNo: 'TEST_DS_001',
      name: 'Day Scholar Test Student',
      dept: 'CSE',
      academicYear: '3 Year',
      yearSec: 'A',
      accommodation: 'Day Scholar',
      gender: 'Male',
      requestCategory: 'gate_pass',
      reason: 'Official Symposium Presentation',
      departureDate: '2026-10-01',
      departureTime: '10:00 AM',
      expectedReturnDate: '2026-10-01',
      expectedReturnTime: '04:00 PM',
      status: 'Pending Counselor',
      counselorName: 'Dr. Test Counselor',
      parentName: 'Parent DS',
      parentContact: '9876543210'
    });
    await dayScholarPass.save();
    assert(dayScholarPass.status === 'Pending Counselor', 'Initial Day Scholar pass is Pending Counselor');

    // 1a. Counselor Approves
    const reqC = { body: { passId: dayScholarPass._id.toString(), counselorName: 'Dr. Test Counselor', parentCalled: true } };
    const resC = createMockRes();
    await approvalController.approveCounselor(reqC, resC);
    const passAfterC = await Pass.findById(dayScholarPass._id);
    assert(passAfterC.status === 'Pending Advisor', 'Counselor approval routes to Pending Advisor');

    // 1b. Advisor Approves
    const reqA = { body: { passId: dayScholarPass._id.toString(), advisorName: 'Prof. Test Advisor' } };
    const resA = createMockRes();
    await approvalController.approveAdvisor(reqA, resA);
    const passAfterA = await Pass.findById(dayScholarPass._id);
    assert(passAfterA.status === 'Pending HOD', 'Advisor approval routes to Pending HOD');

    // 1c. HOD Approves
    const reqH = { body: { passId: dayScholarPass._id.toString(), hodName: 'Dr. Test HOD' } };
    const resH = createMockRes();
    await approvalController.approveHod(reqH, resH);
    const passAfterH = await Pass.findById(dayScholarPass._id);
    assert(passAfterH.status === 'Pending Principal', 'HOD approval routes Day Scholar Gate Pass to Pending Principal');

    // 1d. Principal Approves (Final step for Day Scholar!)
    const reqP = { body: { passId: dayScholarPass._id.toString(), principalName: 'Dr. Test Principal' } };
    const resP = createMockRes();
    await approvalController.approvePrincipal(reqP, resP);
    const passAfterP = await Pass.findById(dayScholarPass._id);
    assert(passAfterP.status === 'Approved', 'Principal approval marks Day Scholar Gate Pass as Approved (Final Clearance)');
    assert(passAfterP.principalApproval?.approved === true, 'Principal approval record is saved');

    // Clean up
    await Pass.findByIdAndDelete(dayScholarPass._id);

    // -------------------------------------------------------------
    // TEST 2: HOSTELLER GATE PASS WORKFLOW
    // Student -> Counselor -> Class Advisor -> HOD -> Principal -> Warden -> Final Approval
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Hosteller Gate Pass Workflow ---');
    const hostellerPass = new Pass({
      rollNo: 'TEST_HST_001',
      name: 'Hosteller Test Student',
      dept: 'CSE',
      academicYear: '3 Year',
      yearSec: 'A',
      accommodation: 'Hosteller',
      gender: 'Male',
      requestCategory: 'gate_pass',
      reason: 'Home visit for festival',
      departureDate: '2026-10-02',
      departureTime: '05:00 PM',
      expectedReturnDate: '2026-10-05',
      expectedReturnTime: '08:00 AM',
      status: 'Pending Counselor',
      counselorName: 'Dr. Test Counselor',
      parentName: 'Parent Hosteller',
      parentContact: '9876543211',
      hostelRoom: 'B-204',
      hostelBlock: 'Boys Hostel 1'
    });
    await hostellerPass.save();

    // 2a. Counselor Approves
    const reqHC = { body: { passId: hostellerPass._id.toString(), counselorName: 'Dr. Test Counselor', parentCalled: true } };
    await approvalController.approveCounselor(reqHC, createMockRes());

    // 2b. Advisor Approves
    const reqHA = { body: { passId: hostellerPass._id.toString(), advisorName: 'Prof. Test Advisor' } };
    await approvalController.approveAdvisor(reqHA, createMockRes());

    // 2c. HOD Approves
    const reqHH = { body: { passId: hostellerPass._id.toString(), hodName: 'Dr. Test HOD' } };
    await approvalController.approveHod(reqHH, createMockRes());
    const passAfterHH = await Pass.findById(hostellerPass._id);
    assert(passAfterHH.status === 'Pending Principal', 'HOD approval routes Hosteller Gate Pass to Pending Principal');

    // 2d. Principal Approves (Must forward to Warden for Hosteller!)
    const reqHP = { body: { passId: hostellerPass._id.toString(), principalName: 'Dr. Test Principal' } };
    await approvalController.approvePrincipal(reqHP, createMockRes());
    const passAfterHP = await Pass.findById(hostellerPass._id);
    assert(passAfterHP.status === 'Pending Boys Warden', 'Principal approval forwards Hosteller Gate Pass to Warden (Pending Boys Warden)');

    // 2e. Warden Approves (Final step for Hosteller!)
    const reqHW = { body: { passId: hostellerPass._id.toString(), wardenName: 'Mr. Test Boys Warden' } };
    await approvalController.approveWarden(reqHW, createMockRes());
    const passAfterHW = await Pass.findById(hostellerPass._id);
    assert(passAfterHW.status === 'Approved', 'Warden approval marks Hosteller Gate Pass as Approved (Final Clearance)');
    assert(passAfterHW.wardenApproval?.approved === true, 'Warden approval record is saved');

    // Clean up
    await Pass.findByIdAndDelete(hostellerPass._id);

    // -------------------------------------------------------------
    // TEST 3: LEAVE REQUEST WORKFLOW
    // Student -> Counselor -> Class Advisor -> HOD -> Completed (Closed at HOD)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Leave Request Workflow ---');
    const leavePass = new Pass({
      rollNo: 'TEST_LV_001',
      name: 'Leave Test Student',
      dept: 'CSE',
      academicYear: '3 Year',
      yearSec: 'A',
      accommodation: 'Day Scholar',
      gender: 'Male',
      requestCategory: 'leave',
      reason: 'Medical treatment for fever',
      leaveDate: '2026-10-01',
      fromDate: '2026-10-01',
      toDate: '2026-10-03',
      status: 'Pending Counselor',
      counselorName: 'Dr. Test Counselor',
      parentName: 'Parent Leave',
      parentContact: '9876543212'
    });
    await leavePass.save();

    // 3a. Counselor Approves
    const reqLC = { body: { passId: leavePass._id.toString(), counselorName: 'Dr. Test Counselor', parentCalled: true } };
    await approvalController.approveCounselor(reqLC, createMockRes());

    // 3b. Advisor Approves
    const reqLA = { body: { passId: leavePass._id.toString(), advisorName: 'Prof. Test Advisor' } };
    await approvalController.approveAdvisor(reqLA, createMockRes());

    // 3c. HOD Approves (Final step for Leave Request!)
    const reqLH = { body: { passId: leavePass._id.toString(), hodName: 'Dr. Test HOD' } };
    await approvalController.approveHod(reqLH, createMockRes());
    const passAfterLH = await Pass.findById(leavePass._id);
    assert(passAfterLH.status === 'Approved', 'HOD approval directly completes/closes Leave Request (status = Approved)');
    assert(passAfterLH.hodApproval?.approved === true, 'HOD approval record is saved for Leave');

    // 3d. Verify Principal and Warden query filters NEVER receive Leave requests
    const reqPrincFilter = { query: { role: 'principal' } };
    const resPrincFilter = createMockRes();
    await passController.getPasses(reqPrincFilter, resPrincFilter);
    const princPasses = resPrincFilter.body || [];
    const hasLeaveInPrinc = princPasses.some(p => p._id.toString() === leavePass._id.toString());
    assert(!hasLeaveInPrinc, 'Principal portal filters OUT all Leave requests');

    // Clean up
    await Pass.findByIdAndDelete(leavePass._id);

    // -------------------------------------------------------------
    // TEST 4: ON-DUTY (OD) REQUEST WORKFLOW
    // Student -> Counselor -> Class Advisor -> HOD -> Completed (Closed at HOD)
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing On-Duty (OD) Request Workflow ---');
    const odReq = new OnDuty({
      rollNo: 'TEST_OD_001',
      name: 'OD Test Student',
      dept: 'CSE',
      academicYear: '3 Year',
      yearSec: 'A',
      accommodation: 'Day Scholar',
      gender: 'Male',
      reason: 'Attending State Level Hackathon',
      placeEvent: 'Anna University Tech Fest',
      mode: 'dates',
      fromDate: '2026-10-06',
      toDate: '2026-10-07',
      status: 'Pending Counselor',
      counselorName: 'Dr. Test Counselor',
      parentName: 'Parent OD',
      parentContact: '9876543213'
    });
    await odReq.save();

    // 4a. Counselor Approves
    const reqODC = { body: { id: odReq._id.toString(), counselorName: 'Dr. Test Counselor' } };
    await onDutyController.approveCounselorOD(reqODC, createMockRes());
    const odAfterC = await OnDuty.findById(odReq._id);
    assert(odAfterC.status === 'Pending Advisor', 'Counselor approves OD request -> routes to Pending Advisor');

    // 4b. Advisor Approves
    const reqODA = { body: { id: odReq._id.toString(), advisorName: 'Prof. Test Advisor' } };
    await onDutyController.approveAdvisorOD(reqODA, createMockRes());
    const odAfterA = await OnDuty.findById(odReq._id);
    assert(odAfterA.status === 'Pending HOD', 'Advisor approves OD request -> routes to Pending HOD');

    // 4c. HOD Approves (Final authority for OD Request!)
    const reqODH = { body: { id: odReq._id.toString(), hodName: 'Dr. Test HOD' } };
    await onDutyController.approveHodOD(reqODH, createMockRes());
    const odAfterH = await OnDuty.findById(odReq._id);
    assert(odAfterH.status === 'Completed', 'HOD authorizes OD request -> status marked as Completed');
    assert(odAfterH.hodApproval?.approved === true, 'HOD approval record saved on OD document');

    // 4d. Verify Principal and Warden query filters return empty for OD requests
    const reqPrincOD = { query: { role: 'principal' } };
    const resPrincOD = createMockRes();
    await onDutyController.getOnDutyRequests(reqPrincOD, resPrincOD);
    assert(Array.isArray(resPrincOD.body) && resPrincOD.body.length === 0, 'Principal receives 0 OD requests (strictly forbidden)');

    const reqWardenOD = { query: { role: 'warden' } };
    const resWardenOD = createMockRes();
    await onDutyController.getOnDutyRequests(reqWardenOD, resWardenOD);
    assert(Array.isArray(resWardenOD.body) && resWardenOD.body.length === 0, 'Warden receives 0 OD requests (strictly forbidden)');

    // Clean up
    await OnDuty.findByIdAndDelete(odReq._id);

    // -------------------------------------------------------------
    // TEST 5: SEARCH BAR SPECIFICATIONS & STYLING
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Search Bar Markup & Design Specifications ---');
    const cssPath = path.join(__dirname, '../css/styles.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert(cssContent.includes('.app-search-input'), 'css/styles.css includes .app-search-input');
    assert(cssContent.includes('#authSearchInput'), 'css/styles.css targets #authSearchInput');
    assert(cssContent.includes('#unifiedSearchInput'), 'css/styles.css targets #unifiedSearchInput');
    assert(cssContent.includes('background-color: #ffffff !important'), 'Search bar enforces crisp white background');
    assert(cssContent.includes('border: 1px solid #cbd5e1 !important'), 'Search bar enforces professional border');
    assert(cssContent.includes('box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.06)'), 'Search bar enforces subtle shadow');
    assert(cssContent.includes('color-scheme: light !important'), 'Search bar enforces light color scheme against dark OS themes');
    assert(cssContent.includes('color: #64748b !important'), 'Search bar placeholder has high-contrast readable color (#64748b)');

    const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    assert(indexHtml.includes('id="authSearchInput"'), 'index.html contains #authSearchInput for Authority dashboards');
    assert(indexHtml.includes('id="unifiedSearchInput"'), 'index.html contains #unifiedSearchInput for Student dashboard');
    assert(indexHtml.includes('app-search-input w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-300'), 'authSearchInput has app-search-input and clean light styling');
    assert(indexHtml.includes('app-search-input w-full pl-10 pr-3.5 py-2 bg-white border border-slate-300'), 'unifiedSearchInput has app-search-input and clean light styling');

    // Check studentRequests.js stepper implementation
    const studentRequestsJs = fs.readFileSync(path.join(__dirname, '../js/modules/student/studentRequests.js'), 'utf8');
    assert(studentRequestsJs.includes("if (isLeave || isOD)"), 'studentRequests.js detects Leave & OD requests in stepper');
    assert(studentRequestsJs.includes("{ key: 'hod', label: 'HOD Approval', authority: 'Head of Department' }"), 'Leave/OD stepper ends at HOD');
    assert(studentRequestsJs.includes("{ key: 'completed', label: 'Completed', authority: 'Final Authorization' }"), 'Leave/OD stepper marks Completed after HOD');

    console.log('\n================================================================');
    console.log(`  SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal suite error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runSuite();
