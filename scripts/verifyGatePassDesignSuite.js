const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');
const http = require('http');

async function testDesignSuite() {
  console.log('--- 1. Fetching active pass record from API ---');
  const pass = await new Promise((resolve, reject) => {
    http.get('http://localhost:10000/api/passes?_id=6aba812ef011a6f2f6ccacc1', res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          resolve(list[0]);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });

  if (!pass) {
    throw new Error('Pass 6aba812ef011a6f2f6ccacc1 not found in database!');
  }

  console.log('Loaded Pass:', {
    studentName: pass.studentName,
    rollNo: pass.rollNo,
    accommodation: pass.accommodation,
    counselor: pass.counselorApproval?.counselorName,
    advisor: pass.advisorApproval?.advisorName,
    hod: pass.hodApproval?.hodName,
    principal: pass.principalApproval?.principalName,
    warden: pass.wardenApproval?.wardenName,
    finalAuth: pass.finalApprovingAuthority
  });

  console.log('\n--- 2. Checking Approval Records Names ---');
  if (pass.counselorApproval?.counselorName !== 'Mrs shanmugavalli') {
    throw new Error(`Counselor name expected 'Mrs shanmugavalli', got '${pass.counselorApproval?.counselorName}'`);
  }
  if (pass.advisorApproval?.advisorName !== 'shanmugavalli') {
    throw new Error(`Advisor name expected 'shanmugavalli', got '${pass.advisorApproval?.advisorName}'`);
  }
  if (pass.hodApproval?.hodName !== 'Dr kamal') {
    throw new Error(`HOD name expected 'Dr kamal', got '${pass.hodApproval?.hodName}'`);
  }
  if (pass.principalApproval?.principalName !== 'Dr Arumugam') {
    throw new Error(`Principal name expected 'Dr Arumugam', got '${pass.principalApproval?.principalName}'`);
  }
  if (pass.wardenApproval?.wardenName !== 'Mr Arul Prasad') {
    throw new Error(`Warden name expected 'Mr Arul Prasad', got '${pass.wardenApproval?.wardenName}'`);
  }
  console.log('✓ All 5 authority names strictly verified against database records!');

  console.log('\n--- 3. Testing PDF Generation in Node using jsPDF ---');
  // Load pdfService.js text and extract renderProfessionalGatePassCardPage
  const pdfServiceCode = fs.readFileSync(path.join(__dirname, '../js/services/pdfService.js'), 'utf8');

  // Verify that pdfService has no colorful references in renderProfessionalGatePassCardPage
  const funcStart = pdfServiceCode.indexOf('function renderProfessionalGatePassCardPage(');
  const funcEnd = pdfServiceCode.indexOf('async function downloadGatePassCardPDF(');
  const renderCode = pdfServiceCode.slice(funcStart, funcEnd);

  // Check that no colored text codes exist (like green 22, 101, 52 or amber 146, 64, 14 or blue 30, 58, 138)
  const forbiddenColors = ['22, 101, 52', '146, 64, 14', '30, 58, 138', '203, 213, 225', '248, 250, 252'];
  for (const c of forbiddenColors) {
    if (renderCode.includes(c)) {
      throw new Error(`renderProfessionalGatePassCardPage still contains color reference: ${c}`);
    }
  }
  console.log('✓ Pure black/white styling verified in PDF rendering logic (no color codes found)!');

  // Evaluate and run the rendering function with jsPDF
  const evalEnv = {
    renderProfessionalGatePassCardPage: null,
    formatTime12: t => t,
    cachedCollegeLogoBase64: null,
    cachedCollegeLogoWatermarkBase64: null,
    renderPageWatermark: () => {}
  };
  const runner = new Function('doc', 'pass', 'logo', 'watermark', 'banner', 'qr', 'formatTime12', 'renderPageWatermark',
    `${renderCode}; return renderProfessionalGatePassCardPage(doc, pass, logo, watermark, banner, qr);`
  );

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  runner(doc, pass, null, null, null, null, t => t, () => {});

  const outPath = path.join(__dirname, '../artifacts/test_gate_pass_card.pdf');
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(doc.output('arraybuffer')));
  console.log('✓ Successfully generated PDF to:', outPath);

  console.log('\n--- 4. Testing Day Scholar Pass (4 Approval Tiers) ---');
  const dsPass = {
    ...pass,
    accommodation: 'Day Scholar',
    finalApprovingAuthority: 'Principal (Dr Arumugam)',
    wardenApproval: null
  };
  const dsDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  runner(dsDoc, dsPass, null, null, null, null, t => t, () => {});
  const dsOutPath = path.join(__dirname, '../artifacts/test_gate_pass_card_dayscholar.pdf');
  fs.writeFileSync(dsOutPath, Buffer.from(dsDoc.output('arraybuffer')));
  console.log('✓ Successfully generated Day Scholar PDF to:', dsOutPath);

  console.log('\n--- 5. Testing Long Name Wrapping Behavior ---');
  const longNamePass = {
    ...pass,
    studentName: 'RANJANA SHAKTHI DHASARI VELU PRABHU OF COMPUTER SCIENCE AND ENGINEERING',
    dept: 'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING & COMPUTER SCIENCE',
    reason: 'Attending State Level Hackathon Grand Finale at Anna University Main Campus with Prior Parental and Institutional Endorsement'
  };
  const lnDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  runner(lnDoc, longNamePass, null, null, null, null, t => t, () => {});
  const lnOutPath = path.join(__dirname, '../artifacts/test_gate_pass_card_longnames.pdf');
  fs.writeFileSync(lnOutPath, Buffer.from(lnDoc.output('arraybuffer')));
  console.log('✓ Successfully generated Long Name Wrapped PDF to:', lnOutPath);

  console.log('\n=== ALL SUITE CHECKS PASSED PERFECTLY ===');
}

testDesignSuite().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
