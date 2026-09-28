const fs = require('fs');
const path = require('path');
const http = require('http');

async function runCompleteVerification() {
  console.log('=====================================================');
  console.log('  GATE PASS COMPLETE SUITE: DOM & PDF VERIFICATION   ');
  console.log('=====================================================\n');

  // 1. Fetch real pass record from API
  console.log('1. Querying /api/passes?_id=6aba812ef011a6f2f6ccacc1 from server...');
  const pass = await new Promise((resolve, reject) => {
    http.get('http://localhost:10000/api/passes?_id=6aba812ef011a6f2f6ccacc1', res => {
      let data = '';
      res.on('data', chunk => data += chunk);
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

  if (!pass) throw new Error('Pass 6aba812ef011a6f2f6ccacc1 was not returned by API!');
  console.log('   Pass ID in DB:', pass._id);
  console.log('   Student Name:', pass.name);
  console.log('   Roll Number:', pass.rollNo);
  console.log('   Accommodation:', pass.accommodation);
  console.log('   Counselor Name:', pass.counselorApproval?.counselorName);
  console.log('   Class Advisor Name:', pass.advisorApproval?.advisorName);
  console.log('   HOD Name:', pass.hodApproval?.hodName);
  console.log('   Principal Name:', pass.principalApproval?.principalName);
  console.log('   Warden Name:', pass.wardenApproval?.wardenName);

  // Assertions for DB names
  if (pass.counselorApproval?.counselorName !== 'Mrs shanmugavalli') {
    throw new Error(`Counselor mismatch: expected 'Mrs shanmugavalli', got '${pass.counselorApproval?.counselorName}'`);
  }
  if (pass.advisorApproval?.advisorName !== 'shanmugavalli') {
    throw new Error(`Advisor mismatch: expected 'shanmugavalli', got '${pass.advisorApproval?.advisorName}'`);
  }
  if (pass.hodApproval?.hodName !== 'Dr kamal') {
    throw new Error(`HOD mismatch: expected 'Dr kamal', got '${pass.hodApproval?.hodName}'`);
  }
  if (pass.principalApproval?.principalName !== 'Dr Arumugam') {
    throw new Error(`Principal mismatch: expected 'Dr Arumugam', got '${pass.principalApproval?.principalName}'`);
  }
  if (pass.wardenApproval?.wardenName !== 'Mr Arul Prasad') {
    throw new Error(`Warden mismatch: expected 'Mr Arul Prasad', got '${pass.wardenApproval?.wardenName}'`);
  }
  console.log('   ✓ Database approval records match the exact expected staff names!\n');

  // 2. Verify HTML template in index.html and components/modals/gatePassCardModal.html
  console.log('2. Inspecting Gate Pass Modal HTML template...');
  const modalHtml = fs.readFileSync(path.join(__dirname, '../components/modals/gatePassCardModal.html'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

  // Check required IDs exist
  const requiredIds = [
    'gatePassCardModal',
    'gatePassDocumentPreview',
    'gpDocPassId',
    'gpDocAccomBadge',
    'gpDocName',
    'gpDocRoll',
    'gpDocDept',
    'gpDocYearSec',
    'gpDocAccom',
    'gpDocParentContact',
    'gpDocDate',
    'gpDocTime',
    'gpDocReturnTime',
    'gpDocFinalAuthority',
    'gpDocReason',
    'gpDocApprovalTime',
    'gpDocVerifyCode',
    'gpDocClearanceGrid',
    'gpDocCounselorName',
    'gpDocCounselorTime',
    'gpDocAdvisorName',
    'gpDocAdvisorTime',
    'gpDocHodName',
    'gpDocHodTime',
    'gpDocPrincipalName',
    'gpDocPrincipalTime',
    'gpDocWardenBox',
    'gpDocWardenName',
    'gpDocWardenTime',
    'gpDocStudentSignName',
    'gpDocFinalAuthoritySign',
    'gpDocApproverRoleLabel',
    'gpCardDownloadBtn'
  ];

  for (const id of requiredIds) {
    if (!modalHtml.includes(`id="${id}"`)) {
      throw new Error(`Missing ID in gatePassCardModal.html: ${id}`);
    }
    if (!indexHtml.includes(`id="${id}"`)) {
      throw new Error(`Missing ID in index.html: ${id}`);
    }
  }
  console.log('   ✓ All required modal elements exist in both component and assembled index.html!\n');

  // 3. Verify No colorful badges in preview
  console.log('3. Checking Clean White & Black Styling in Document Preview...');
  const previewStart = modalHtml.indexOf('<div id="gatePassDocumentPreview"');
  const previewEnd = modalHtml.indexOf('<!-- Modal Action Buttons');
  const previewSection = modalHtml.slice(previewStart, previewEnd);

  const forbiddenClassPatterns = ['bg-emerald-50', 'bg-blue-50', 'bg-amber-50', 'text-emerald-', 'text-blue-', 'text-amber-'];
  for (const p of forbiddenClassPatterns) {
    if (previewSection.includes(p)) {
      throw new Error(`Forbidden color class '${p}' found in Gate Pass document preview!`);
    }
  }
  console.log('   ✓ Document preview is strictly clean white background with black text/borders!\n');

  // 4. Test studentModals.js openGatePassCardModal logic simulation
  console.log('4. Simulating openGatePassCardModal execution with DOM mock...');
  const elements = {};
  requiredIds.forEach(id => {
    elements[id] = {
      id,
      innerText: '',
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        contains(c) { return this.classes.has(c); }
      },
      className: ''
    };
  });
  elements.gpDocQrImage = { src: '', onerror: null };
  elements.gpDocGateExitTime = { innerText: '' };
  elements.gpDocGateReturnTime = { innerText: '' };

  // Helper document mock
  const mockDoc = {
    getElementById(id) {
      return elements[id] || null;
    }
  };

  // Run the modal logic function
  const studentModalsCode = fs.readFileSync(path.join(__dirname, '../js/modules/student/studentModals.js'), 'utf8');
  const openModalStart = studentModalsCode.indexOf('async function openGatePassCardModal(pass) {');
  const openModalEnd = studentModalsCode.indexOf('function closeGatePassCardModal() {');
  const openModalBody = studentModalsCode.slice(openModalStart, openModalEnd);

  const modalFn = new Function('pass', 'document', 'window', 'formatTime12',
    `const fetch = async () => ({ ok: false });\n${openModalBody}; return openGatePassCardModal(pass);`
  );

  await modalFn(pass, mockDoc, { currentActivePass: null }, t => t);

  console.log('   Simulated DOM State for Hosteller:');
  console.log('   - gpDocName:', elements.gpDocName.innerText);
  console.log('   - gpDocRoll:', elements.gpDocRoll.innerText);
  console.log('   - gpDocCounselorName:', elements.gpDocCounselorName.innerText);
  console.log('   - gpDocAdvisorName:', elements.gpDocAdvisorName.innerText);
  console.log('   - gpDocHodName:', elements.gpDocHodName.innerText);
  console.log('   - gpDocPrincipalName:', elements.gpDocPrincipalName.innerText);
  console.log('   - gpDocWardenName:', elements.gpDocWardenName.innerText);
  console.log('   - gpDocAccomBadge:', elements.gpDocAccomBadge.innerText);
  console.log('   - gpDocWardenBox hidden:', elements.gpDocWardenBox.classList.contains('hidden'));

  if (elements.gpDocCounselorName.innerText !== 'Mrs shanmugavalli') throw new Error('Modal counselor mismatch');
  if (elements.gpDocAdvisorName.innerText !== 'shanmugavalli') throw new Error('Modal advisor mismatch');
  if (elements.gpDocHodName.innerText !== 'Dr kamal') throw new Error('Modal HOD mismatch');
  if (elements.gpDocPrincipalName.innerText !== 'Dr Arumugam') throw new Error('Modal principal mismatch');
  if (elements.gpDocWardenName.innerText !== 'Mr Arul Prasad') throw new Error('Modal warden mismatch');
  if (elements.gpDocWardenBox.classList.contains('hidden')) throw new Error('Warden box should be visible for hosteller');
  console.log('   ✓ Hosteller Gate Pass Modal rendered all 5 approval tiers accurately!\n');

  // Test Day Scholar pass in simulation
  console.log('5. Testing Day Scholar Pass modal simulation...');
  const dsPass = { ...pass, accommodation: 'Day Scholar', wardenApproval: null };
  await modalFn(dsPass, mockDoc, { currentActivePass: null }, t => t);
  console.log('   - gpDocAccomBadge:', elements.gpDocAccomBadge.innerText);
  console.log('   - gpDocWardenBox hidden:', elements.gpDocWardenBox.classList.contains('hidden'));
  if (elements.gpDocAccomBadge.innerText !== 'DAY SCHOLAR') throw new Error('Day Scholar badge mismatch');
  if (!elements.gpDocWardenBox.classList.contains('hidden')) throw new Error('Warden box should be hidden for day scholar');
  console.log('   ✓ Day Scholar Gate Pass Modal correctly hides Warden box!\n');

  console.log('=====================================================');
  console.log('   ALL VERIFICATION SUITE TESTS PASSED 100% SUCCESS  ');
  console.log('=====================================================');
}

runCompleteVerification().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
