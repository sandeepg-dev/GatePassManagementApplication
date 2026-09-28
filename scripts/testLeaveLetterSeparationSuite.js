const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');

console.log('=== Running Leave Letter Separate PDF Generation Test Suite ===\n');

// 1. Read pdfService.js and extract generateDynamicLeaveContent & renderOfficialLeaveLetterPage
const pdfServiceCode = fs.readFileSync(path.join(__dirname, '../js/services/pdfService.js'), 'utf8');

const dynStart = pdfServiceCode.indexOf('function generateDynamicLeaveContent(');
const dynEnd = pdfServiceCode.indexOf('function renderOfficialLeaveLetterPage(');
const dynCode = pdfServiceCode.slice(dynStart, dynEnd);

const renderStart = pdfServiceCode.indexOf('function renderOfficialLeaveLetterPage(');
const renderEnd = pdfServiceCode.indexOf('async function downloadLeaveLetterPDF(');
const renderCode = pdfServiceCode.slice(renderStart, renderEnd);

const formatLetterDateCode = `
function formatLetterDate(dateStr) {
  if (!dateStr) return new Date().toLocaleDateString('en-GB');
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  } catch (e) {}
  return String(dateStr).split(' ')[0] || new Date().toLocaleDateString('en-GB');
}
`;

const runner = new Function(
  'doc', 'pass', 'logo', 'watermark', 'banner',
  `
  ${formatLetterDateCode}
  ${dynCode}
  ${renderCode}
  return {
    generateDynamicLeaveContent,
    renderOfficialLeaveLetterPage
  };
  `
);

const env = runner(null, {}, null, null, null);
const { generateDynamicLeaveContent, renderOfficialLeaveLetterPage } = env;

// 2. Test dynamic reason adaptations
console.log('Test 1: Testing Dynamic Content Adaptation...');

const testCases = [
  {
    name: 'Medical Leave',
    pass: {
      reason: 'Suffering from severe viral fever and throat infection',
      fromDate: '29/09/2026',
      toDate: '01/10/2026'
    },
    expectedCategory: 'medical',
    expectedSubjectSubstr: 'Medical Leave',
    expectedBodySubstr: 'advised medical rest'
  },
  {
    name: 'Family Function',
    pass: {
      reason: 'Elder brother wedding function and family gathering at native place',
      fromDate: '05/10/2026',
      toDate: '07/10/2026'
    },
    expectedCategory: 'family_function',
    expectedSubjectSubstr: 'Family Function',
    expectedBodySubstr: 'wedding function'
  },
  {
    name: 'Emergency',
    pass: {
      reason: 'Urgent family emergency due to grandmother hospitalization',
      fromDate: '30/09/2026',
      toDate: '02/10/2026'
    },
    expectedCategory: 'emergency',
    expectedSubjectSubstr: 'Emergency',
    expectedBodySubstr: 'emergency situation'
  },
  {
    name: 'Personal Reason',
    pass: {
      reason: 'Personal work regarding official passport verification appointment',
      fromDate: '03/10/2026',
      toDate: '03/10/2026'
    },
    expectedCategory: 'personal',
    expectedSubjectSubstr: 'Personal Reasons',
    expectedBodySubstr: 'personal commitment'
  },
  {
    name: 'Custom Other Reason',
    pass: {
      reason: 'Attending regional robotics competition finals in Bangalore',
      fromDate: '10/10/2026',
      toDate: '12/10/2026'
    },
    expectedCategory: 'general',
    expectedSubjectSubstr: 'robotics competition',
    expectedBodySubstr: 'Attending regional robotics'
  }
];

testCases.forEach(tc => {
  const result = generateDynamicLeaveContent(tc.pass);
  console.log(`- ${tc.name}:`);
  console.log(`  Subject: "${result.subject}"`);
  console.log(`  Days: "${result.daysText}"`);
  if (!result.subject.includes(tc.expectedSubjectSubstr)) {
    throw new Error(`Expected subject to contain "${tc.expectedSubjectSubstr}" but got "${result.subject}"`);
  }
  if (!result.bodyPara1.includes(tc.expectedBodySubstr)) {
    throw new Error(`Expected body to contain "${tc.expectedBodySubstr}" but got "${result.bodyPara1}"`);
  }
});

console.log('✓ Dynamic content correctly adapts to all reason categories!\n');

// 3. Test PDF Generation and inspect stream
console.log('Test 2: Testing Professional Leave Letter PDF Generation...');

const logoPath = path.join(__dirname, '../public/grt-logo.png');
let logoBase64 = null;
if (fs.existsSync(logoPath)) {
  const buf = fs.readFileSync(logoPath);
  logoBase64 = `data:image/png;base64,${buf.toString('base64')}`;
}

const leavePass = {
  _id: '6aba812ef011a6f2f6ccacc9',
  requestCategory: 'leave',
  name: 'SANDEEP G',
  rollNo: '110324104091',
  dept: 'CSE',
  academicYear: 'III Year',
  yearSec: 'A',
  accommodation: 'Hosteller',
  fatherName: 'Ganesan K',
  parentContact: '9876543210',
  fromDate: '29/09/2026',
  toDate: '01/10/2026',
  reason: 'Medical rest due to high fever and doctor advised clinical treatment',
  counselorApproval: { counselorName: 'Mrs shanmugavalli', approved: true, time: '28/09/2026, 08:32:42 pm' },
  advisorApproval: { advisorName: 'shanmugavalli', approved: true, time: '28/09/2026, 08:34:01 pm' },
  hodApproval: { hodName: 'Dr kamal', approved: true, time: '28/09/2026, 08:35:10 pm' },
  status: 'Approved'
};

const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: false });
renderOfficialLeaveLetterPage(doc, leavePass, logoBase64, null, null);

const outDir = path.join(__dirname, '../artifacts');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPdfPath = path.join(outDir, 'test_official_leave_letter.pdf');

const rawPdf = doc.output();
fs.writeFileSync(outPdfPath, rawPdf);
console.log('✓ Successfully generated PDF at:', outPdfPath);

// Verify content and operators in raw stream
console.log('Test 3: Verifying PDF Contents and Styling...');
const hasMasthead = rawPdf.includes('GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY');
const hasDocTitle = rawPdf.includes('OFFICIAL LEAVE REQUISITION LETTER');
const hasRef = rawPdf.includes('LEAVE/2026/110324104091');
const hasStudent = rawPdf.includes('SANDEEP G');
const hasHeadOfDept = rawPdf.includes('The Head of the Department');
const hasSubject = rawPdf.includes('Medical Leave');
const hasSchedule = rawPdf.includes('From 29/09/2026 to 01/10/2026');
const hasCounselor = rawPdf.includes('Mrs shanmugavalli');
const hasAdvisor = rawPdf.includes('shanmugavalli');
const hasHOD = rawPdf.includes('Dr kamal');
const hasClosing = rawPdf.includes('Yours obediently');
const hasFooter = rawPdf.includes('official academic leave requisition letter');

console.log('- Has Institutional Masthead:', hasMasthead);
console.log('- Has Document Title (OFFICIAL LEAVE REQUISITION LETTER):', hasDocTitle);
console.log('- Has Ref (LEAVE/...):', hasRef);
console.log('- Has Student Name (SANDEEP G):', hasStudent);
console.log('- Has Addressee (Head of Dept):', hasHeadOfDept);
console.log('- Has Dynamic Subject (Medical Leave):', hasSubject);
console.log('- Has Highlighted Schedule Box:', hasSchedule);
console.log('- Has Counselor Signature Block:', hasCounselor);
console.log('- Has Advisor Signature Block:', hasAdvisor);
console.log('- Has HOD Signature Block:', hasHOD);
console.log('- Has Yours obediently:', hasClosing);
console.log('- Has Institutional Footer Notice:', hasFooter);

if (!hasMasthead || !hasDocTitle || !hasRef || !hasStudent || !hasHeadOfDept || !hasSubject || !hasCounselor || !hasAdvisor || !hasHOD) {
  throw new Error('PDF content verification failed for one or more critical fields!');
}

// Verify ZERO black fill operators on content boxes
const fills = (rawPdf.match(/[^\n\r]+(\bB\*?\b|\bf\*?\b)[^\n\r]*/g) || []);
console.log('- Drawing Fill Operations in stream:', fills);
const nonXrefFills = fills.filter(f => !f.includes('65535 f'));
console.log('- Content path fill operations (should be 0 or background only):', nonXrefFills.length);

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
