const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');

console.log('================================================================');
console.log('  GATE PASS AUTHORITY LETTER & STUDENT PASS SEPARATION SUITE');
console.log('================================================================\n');

// 1. Check pdfService.js code
const pdfServiceCode = fs.readFileSync(path.join(__dirname, '../js/services/pdfService.js'), 'utf8');

console.log('--- Test 1: pdfService.js Verification ---');
// Verify downloadOfficialLetterOnlyPDF does NOT delegate to downloadGatePassCardPDF
const officialLetterFunc = pdfServiceCode.slice(
  pdfServiceCode.indexOf('async function downloadOfficialLetterOnlyPDF('),
  pdfServiceCode.indexOf('async function downloadSinglePassPDF(')
);

if (officialLetterFunc.includes('return await downloadGatePassCardPDF(')) {
  throw new Error('FAIL: downloadOfficialLetterOnlyPDF still delegates to downloadGatePassCardPDF!');
}
console.log(' [PASS] downloadOfficialLetterOnlyPDF does not call downloadGatePassCardPDF');

if (!officialLetterFunc.includes('renderOfficialGatePassLetterPage(')) {
  throw new Error('FAIL: downloadOfficialLetterOnlyPDF does not invoke renderOfficialGatePassLetterPage!');
}
console.log(' [PASS] downloadOfficialLetterOnlyPDF invokes renderOfficialGatePassLetterPage for Gate Pass requests');

if (!officialLetterFunc.includes('GRTIET_Gate_Pass_Letter_')) {
  throw new Error('FAIL: downloadOfficialLetterOnlyPDF does not save with filename GRTIET_Gate_Pass_Letter_!');
}
console.log(' [PASS] downloadOfficialLetterOnlyPDF saves document as GRTIET_Gate_Pass_Letter_<roll>.pdf');

// Verify downloadGatePassCardPDF has role guard for authorities
const cardPdfFunc = pdfServiceCode.slice(
  pdfServiceCode.indexOf('async function downloadGatePassCardPDF('),
  pdfServiceCode.indexOf('async function downloadOfficialLetterOnlyPDF(')
);

if (!cardPdfFunc.includes("['counselor', 'advisor', 'hod', 'principal', 'warden'].includes(String(u.role).toLowerCase())")) {
  throw new Error('FAIL: downloadGatePassCardPDF missing authority role guard!');
}
console.log(' [PASS] downloadGatePassCardPDF has authority role guard redirecting authorities to downloadOfficialLetterOnlyPDF');

if (!cardPdfFunc.includes('isApprovedChecker && !isApprovedChecker(pass)')) {
  throw new Error('FAIL: downloadGatePassCardPDF missing full approval check!');
}
console.log(' [PASS] downloadGatePassCardPDF enforces full approval requirement before generating actual pass card');


// 2. Check studentModals.js code
console.log('\n--- Test 2: studentModals.js openGatePassCardModal Guard ---');
const studentModalsCode = fs.readFileSync(path.join(__dirname, '../js/modules/student/studentModals.js'), 'utf8');
const openModalFunc = studentModalsCode.slice(
  studentModalsCode.indexOf('async function openGatePassCardModal('),
  studentModalsCode.indexOf('function closeGatePassCardModal(')
);

if (!openModalFunc.includes("['counselor', 'advisor', 'hod', 'principal', 'warden'].includes(String(u.role).toLowerCase())")) {
  throw new Error('FAIL: openGatePassCardModal missing authority role redirect to viewFormalLetter!');
}
console.log(' [PASS] openGatePassCardModal guards authorities and redirects to viewFormalLetter');

if (!openModalFunc.includes('isApprovedChecker && !isApprovedChecker(pass)')) {
  throw new Error('FAIL: openGatePassCardModal does not check if pass is fully approved!');
}
console.log(' [PASS] openGatePassCardModal checks full approval before opening pass card modal');


// 3. Check auditLogs.js tables
console.log('\n--- Test 3: auditLogs.js Authority Tables Cleanliness ---');
const auditLogsCode = fs.readFileSync(path.join(__dirname, '../js/modules/auditLogs.js'), 'utf8');

// Ensure no downloadGatePassCardPDF exists anywhere in auditLogs.js
if (auditLogsCode.includes('downloadGatePassCardPDF')) {
  throw new Error('FAIL: auditLogs.js still contains downloadGatePassCardPDF buttons for authorities!');
}
console.log(' [PASS] auditLogs.js contains 0 references to downloadGatePassCardPDF (authorities only have Letter)');

if (!auditLogsCode.includes('Formal Gate Pass Requisition Letter')) {
  throw new Error('FAIL: auditLogs.js missing Gate Pass Requisition Letter subtitle for viewFormalLetter!');
}
console.log(' [PASS] viewFormalLetter sets subtitle to Formal Gate Pass Requisition Letter for gate passes');


// 4. Test PDF Generation Execution of Gate Pass Letter Page
console.log('\n--- Test 4: Testing renderOfficialGatePassLetterPage PDF Generation ---');
const letterPageFuncStart = pdfServiceCode.indexOf('function renderOfficialGatePassLetterPage(');
const letterPageFuncEnd = pdfServiceCode.indexOf('function generateDynamicLeaveContent(');
const letterPageCode = pdfServiceCode.slice(letterPageFuncStart, letterPageFuncEnd);

const letterRunner = new Function(
  'doc', 'pass', 'logo', 'watermark', 'banner', 'renderPageWatermark', 'formatLetterDate',
  `
  ${letterPageCode}
  return renderOfficialGatePassLetterPage(doc, pass, logo, watermark, banner);
  `
);

const testDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
const mockPass = {
  rollNo: '211723104001',
  studentName: 'Aravind Kumar',
  dept: 'Computer Science and Engineering',
  academicYear: 'III Year',
  yearSec: 'A',
  accommodation: 'Hosteller',
  hostelBlock: 'B',
  hostelRoom: '204',
  departureDate: '30/09/2026',
  departureTime: '16:30',
  expectedReturnDate: '01/10/2026',
  expectedReturnTime: '18:00',
  reason: 'Attending family function at hometown with parental permission',
  parentContact: '9876543210',
  counselorApproval: { approved: true, counselorName: 'Mrs shanmugavalli', time: '30/09/2026 10:00' },
  advisorApproval: { approved: true, advisorName: 'shanmugavalli', time: '30/09/2026 10:30' },
  hodApproval: { approved: true, hodName: 'Dr kamal', time: '30/09/2026 11:00' },
  principalApproval: { approved: true, principalName: 'Dr Arumugam', time: '30/09/2026 11:30' },
  wardenApproval: { approved: true, wardenName: 'Mr Arul Prasad', time: '30/09/2026 12:00' }
};

letterRunner(testDoc, mockPass, null, null, null, () => {}, () => '30/09/2026');

const outPath = path.join(__dirname, '../artifacts/test_gate_pass_letter.pdf');
const dir = path.dirname(outPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(outPath, Buffer.from(testDoc.output('arraybuffer')));
console.log(' [PASS] Generated formal Gate Pass Letter PDF successfully:', outPath);

// 5. Test Day Scholar Letter Generation
console.log('\n--- Test 5: Testing Day Scholar Gate Pass Letter Generation ---');
const dsDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
const mockDSPass = {
  ...mockPass,
  accommodation: 'Day Scholar',
  wardenApproval: null
};
letterRunner(dsDoc, mockDSPass, null, null, null, () => {}, () => '30/09/2026');
const dsOutPath = path.join(__dirname, '../artifacts/test_gate_pass_letter_dayscholar.pdf');
fs.writeFileSync(dsOutPath, Buffer.from(dsDoc.output('arraybuffer')));
console.log(' [PASS] Generated formal Day Scholar Gate Pass Letter PDF successfully:', dsOutPath);

console.log('\n================================================================');
console.log('  ALL GATE PASS LETTER & PASS SEPARATION TESTS PASSED (100%)!');
console.log('================================================================');
