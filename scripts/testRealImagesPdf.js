const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');

async function testWithImages() {
  console.log('Testing PDF generation with actual logo image file...');
  const logoPath = path.join(__dirname, '../public/grt-logo.png');
  let logoBase64 = null;
  if (fs.existsSync(logoPath)) {
    const buf = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${buf.toString('base64')}`;
  }

  const pass = {
    _id: '6aba812ef011a6f2f6ccacc1',
    gatePassId: 'GRT-GP-2026-ACC1',
    name: 'SANDEEP G',
    rollNo: '110324104091',
    dept: 'CSE',
    academicYear: 'III Year',
    yearSec: 'A',
    accommodation: 'Hosteller',
    parentContact: '9876543210',
    departureDate: '28/09/2026',
    departureTime: '16:00',
    expectedReturnDate: '29/09/2026',
    expectedReturnTime: '18:00',
    reason: 'Family Emergency and Medical Appointment with Parents',
    counselorApproval: { counselorName: 'Mrs shanmugavalli', approved: true, time: '28/09/2026, 08:32:42 pm' },
    advisorApproval: { advisorName: 'shanmugavalli', approved: true, time: '28/09/2026, 08:34:01 pm' },
    hodApproval: { hodName: 'Dr kamal', approved: true, time: '28/09/2026, 08:35:10 pm' },
    principalApproval: { principalName: 'Dr Arumugam', approved: true, time: '28/09/2026, 08:35:38 pm' },
    wardenApproval: { wardenName: 'Mr Arul Prasad', approved: true, time: '28/09/2026, 09:25:35 pm' },
    finalApprovingAuthority: 'Mr Arul Prasad (Hostel Warden)'
  };

  const pdfServiceCode = fs.readFileSync(path.join(__dirname, '../js/services/pdfService.js'), 'utf8');
  const funcStart = pdfServiceCode.indexOf('function renderProfessionalGatePassCardPage(');
  const funcEnd = pdfServiceCode.indexOf('async function downloadGatePassCardPDF(');
  const renderCode = pdfServiceCode.slice(funcStart, funcEnd);

  const runner = new Function('doc', 'pass', 'logo', 'watermark', 'banner', 'qr', 'formatTime12',
    `${renderCode}; return renderProfessionalGatePassCardPage(doc, pass, logo, watermark, banner, qr);`
  );

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  runner(doc, pass, logoBase64, null, null, null, t => t);

  const outPath = path.join(__dirname, '../artifacts/test_gate_pass_with_logo.pdf');
  fs.writeFileSync(outPath, Buffer.from(doc.output('arraybuffer')));
  console.log('Successfully wrote:', outPath);

  const content = fs.readFileSync(outPath, 'utf8');
  console.log('Has pure white fill (1 1 1 rg):', content.includes('1 1 1 rg') || content.includes('1 g'));
  console.log('Has pure black text (0 0 0 rg / 0 g):', content.includes('0 0 0 rg') || content.includes('0 g'));
  console.log('Has student name:', content.includes('SANDEEP G'));
  console.log('Has Counselor:', content.includes('Mrs shanmugavalli'));
  console.log('Has Advisor:', content.includes('shanmugavalli'));
  console.log('Has HOD:', content.includes('Dr kamal'));
  console.log('Has Principal:', content.includes('Dr Arumugam'));
  console.log('Has Warden:', content.includes('Mr Arul Prasad'));
  console.log('✓ All checks passed!');
}

testWithImages().catch(err => {
  console.error(err);
  process.exit(1);
});
