/**
 * Automated Verification Suite for Official Gate Pass Auto-Generation & Workflow
 */
const mongoose = require('mongoose');
const Pass = require('../src/models/Pass');
const User = require('../src/models/User');
const Student = require('../src/models/Student');
const approvalController = require('../src/controllers/approvalController');
const fs = require('fs');
const path = require('path');

// Mock Express response object
function createMockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.data = obj;
      return this;
    }
  };
  return res;
}

async function runVerification() {
  console.log('--- Starting Gate Pass Auto-Generation & Verification Suite ---');

  // Connect to DB using application's database manager
  const connectDB = require('../src/config/db');
  await connectDB();
  console.log('Connected to MongoDB');

  try {
    // TEST 1: DAY SCHOLAR WORKFLOW
    console.log('\n[Test 1] Testing Day Scholar Flow: Counselor -> Advisor -> HOD -> Principal (Final)');
    const dayPass = new Pass({
      rollNo: 'TEST_DS_101',
      name: 'Day Scholar Test Student',
      academicYear: 'III Year',
      dept: 'CSE',
      yearSec: 'A',
      accommodation: 'Day Scholar',
      gender: 'Male',
      reason: 'Special Medical Consultation',
      departureDate: '2026-09-29',
      departureTime: '14:30',
      parentContact: '9876543210',
      status: 'Pending Counselor'
    });
    await dayPass.save();

    // 1. Counselor approval
    let res = createMockRes();
    await approvalController.approveCounselor({ body: { passId: dayPass._id, counselorName: 'Dr. Counselor', parentCalled: true } }, res);
    let p = await Pass.findById(dayPass._id);
    if (p.status !== 'Pending Advisor') throw new Error(`Expected Pending Advisor, got ${p.status}`);

    // 2. Advisor approval
    res = createMockRes();
    await approvalController.approveAdvisor({ body: { passId: dayPass._id, advisorName: 'Prof. Advisor' } }, res);
    p = await Pass.findById(dayPass._id);
    if (p.status !== 'Pending HOD') throw new Error(`Expected Pending HOD, got ${p.status}`);

    // 3. HOD approval
    res = createMockRes();
    await approvalController.approveHod({ body: { passId: dayPass._id, hodName: 'Dr. HOD' } }, res);
    p = await Pass.findById(dayPass._id);
    if (p.status !== 'Pending Principal') throw new Error(`Expected Pending Principal, got ${p.status}`);

    // 4. Principal Final Approval -> Must automatically generate Gate Pass & Gate Pass ID!
    res = createMockRes();
    await approvalController.approvePrincipal({ body: { passId: dayPass._id, principalName: 'Dr. S. Principal' } }, res);
    p = await Pass.findById(dayPass._id);
    
    if (p.status !== 'Approved') throw new Error(`Expected Approved, got ${p.status}`);
    if (!p.gatePassId || !p.gatePassId.startsWith('GRT-GP-')) throw new Error(`Expected valid Gate Pass ID starting with GRT-GP-, got ${p.gatePassId}`);
    if (!p.finalApprovingAuthority || !p.finalApprovingAuthority.includes('Principal')) throw new Error(`Expected Principal in finalApprovingAuthority, got ${p.finalApprovingAuthority}`);
    if (!p.finalApprovalTime) throw new Error('Expected finalApprovalTime to be set');

    console.log(`✓ Day Scholar Gate Pass successfully auto-generated: ID=${p.gatePassId}, Authority=${p.finalApprovingAuthority}`);

    // TEST 2: HOSTELLER WORKFLOW
    console.log('\n[Test 2] Testing Hosteller Flow: Counselor -> Advisor -> HOD -> Principal -> Warden (Final)');
    const hostellerPass = new Pass({
      rollNo: 'TEST_HST_202',
      name: 'Hosteller Test Student',
      academicYear: 'IV Year',
      dept: 'ECE',
      yearSec: 'B',
      accommodation: 'Hosteller',
      gender: 'Male',
      reason: 'Weekend Home Visit',
      departureDate: '2026-09-29',
      departureTime: '16:00',
      expectedReturnDate: '2026-10-01',
      expectedReturnTime: '18:00',
      parentContact: '9123456780',
      status: 'Pending Counselor'
    });
    await hostellerPass.save();

    // 1. Counselor
    res = createMockRes();
    await approvalController.approveCounselor({ body: { passId: hostellerPass._id, counselorName: 'Dr. Counselor', parentCalled: true } }, res);

    // 2. Advisor
    res = createMockRes();
    await approvalController.approveAdvisor({ body: { passId: hostellerPass._id, advisorName: 'Prof. Advisor' } }, res);

    // 3. HOD
    res = createMockRes();
    await approvalController.approveHod({ body: { passId: hostellerPass._id, hodName: 'Dr. HOD' } }, res);

    // 4. Principal forwards to Warden for Hosteller
    res = createMockRes();
    await approvalController.approvePrincipal({ body: { passId: hostellerPass._id, principalName: 'Dr. S. Principal' } }, res);
    p = await Pass.findById(hostellerPass._id);
    if (p.status !== 'Pending Boys Warden') throw new Error(`Expected Pending Boys Warden, got ${p.status}`);
    console.log(`✓ Principal approved and forwarded Hosteller to: ${p.status}`);

    // 5. Boys Warden Final Approval -> Must auto-generate Gate Pass & Gate Pass ID!
    res = createMockRes();
    await approvalController.approveBoysWarden({ body: { passId: hostellerPass._id, wardenName: 'Mr. B. Warden' } }, res);
    p = await Pass.findById(hostellerPass._id);

    if (p.status !== 'Approved') throw new Error(`Expected Approved, got ${p.status}`);
    if (!p.gatePassId || !p.gatePassId.startsWith('GRT-GP-')) throw new Error(`Expected valid Gate Pass ID starting with GRT-GP-, got ${p.gatePassId}`);
    if (!p.finalApprovingAuthority || !p.finalApprovingAuthority.includes('Warden')) throw new Error(`Expected Warden in finalApprovingAuthority, got ${p.finalApprovingAuthority}`);
    if (!p.finalApprovalTime) throw new Error('Expected finalApprovalTime to be set');

    console.log(`✓ Hosteller Gate Pass successfully auto-generated: ID=${p.gatePassId}, Authority=${p.finalApprovingAuthority}`);

    // Clean up test data
    await Pass.deleteMany({ rollNo: { $in: ['TEST_DS_101', 'TEST_HST_202'] } });

    // TEST 3: DESIGN CHECKLIST VALIDATION (ALL 16 REQUIRED PARTICULARS)
    console.log('\n[Test 3] Verifying All 16 Required Elements in Modal and PDF Service');
    const modalContent = fs.readFileSync(path.join(__dirname, '../components/modals/gatePassCardModal.html'), 'utf-8');
    const pdfServiceContent = fs.readFileSync(path.join(__dirname, '../js/services/pdfService.js'), 'utf-8');
    const studentRequestsContent = fs.readFileSync(path.join(__dirname, '../js/modules/student/studentRequests.js'), 'utf-8');
    const studentDashboardContent = fs.readFileSync(path.join(__dirname, '../components/student/studentDashboard.html'), 'utf-8');

    const checklist = [
      { name: 'GRT Institute of Engineering and Technology', pattern: /GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY/i },
      { name: 'College Logo', pattern: /grt-logo\.png/i },
      { name: 'GATE PASS title', pattern: /GATE PASS/i },
      { name: 'Gate Pass / Pass ID', pattern: /gpDocPassId|gatePassId/i },
      { name: 'Student Name', pattern: /gpDocName|Student Name/i },
      { name: 'Register Number', pattern: /gpDocRoll|Register Number/i },
      { name: 'Department', pattern: /gpDocDept|Department/i },
      { name: 'Year and Section', pattern: /gpDocYearSec|Year and Section/i },
      { name: 'Day Scholar / Hosteller status', pattern: /gpDocAccom|HOSTELLER|DAY SCHOLAR/i },
      { name: 'Reason for leaving', pattern: /gpDocReason|Reason for Leaving/i },
      { name: 'Date', pattern: /gpDocDate|Date of Leaving/i },
      { name: 'Time of Leaving', pattern: /gpDocTime|Time of Leaving/i },
      { name: 'Expected Return Time', pattern: /gpDocReturnTime|Expected Return Time/i },
      { name: 'Parent/Guardian Contact Number', pattern: /gpDocParentContact|Parent \/ Guardian Contact/i },
      { name: 'Final Approving Authority', pattern: /gpDocFinalAuthority|Final Approving Authority/i },
      { name: 'Approval Date and Time', pattern: /gpDocApprovalTime|Approval Date & Time/i },
      { name: 'Authorized Signature Section', pattern: /Student Signature.*Approving Authority.*Main Gate Security/s },
      { name: 'QR Code / Verification Code', pattern: /gpDocQrImage|gpDocVerifyCode|getGatePassQrBase64/i }
    ];

    checklist.forEach(item => {
      const modalMatch = item.pattern.test(modalContent);
      const pdfMatch = item.pattern.test(pdfServiceContent);
      if (!modalMatch && !pdfMatch) {
        throw new Error(`Checklist item failed: ${item.name}`);
      }
      console.log(`  ✓ ${item.name}: Present in Gate Pass implementation`);
    });

    // TEST 4: STUDENT DASHBOARD INTEGRATION
    console.log('\n[Test 4] Verifying Student Dashboard Active Gate Pass Section');
    if (!studentDashboardContent.includes('stuActiveGatePassSection')) {
      throw new Error('stuActiveGatePassSection missing from studentDashboard.html');
    }
    if (!studentRequestsContent.includes('stuActiveGatePassSection')) {
      throw new Error('stuActiveGatePassSection rendering missing from studentRequests.js');
    }
    if (!studentRequestsContent.includes('dashViewGatePassBtn') || !studentRequestsContent.includes('dashDownloadGatePassBtn')) {
      throw new Error('Dashboard View and Download Gate Pass buttons missing from studentRequests.js');
    }
    console.log('  ✓ Student dashboard contains active Gate Pass section with View & Download actions');

    console.log('\n======================================================');
    console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY (100%)');
    console.log('======================================================');

  } catch (err) {
    console.error('\nVerification failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runVerification();
