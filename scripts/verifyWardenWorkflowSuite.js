/**
 * Comprehensive Verification Suite for Warden Routing & Gate Pass Workflow:
 * 1. Male Hosteller: Student -> Counselor -> Advisor -> HOD -> Principal -> Boys Warden -> Final Approval (Gate Pass Ready)
 * 2. Female Hosteller: Student -> Counselor -> Advisor -> HOD -> Principal -> Girls Warden -> Final Approval (Gate Pass Ready)
 * 3. Day Scholar: Student -> Counselor -> Advisor -> HOD -> Principal -> Final Approval (Gate Pass Ready, NO Warden)
 * 4. Cross-jurisdiction isolation:
 *    - Boys Warden never sees Female or Day Scholar requests
 *    - Girls Warden never sees Male or Day Scholar requests
 */
const http = require('http');

function apiCall(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 10000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function assert(cond, msg) {
  if (!cond) {
    console.error('❌ ASSERTION FAILED: ' + msg);
    process.exit(1);
  }
  console.log('✅ ' + msg);
}

async function runSuite() {
  console.log('--- Starting Gate Pass Workflow & Warden Routing Verification Suite ---\n');

  // Find or create test students
  // 1. Male Hosteller
  const maleHostelRoll = '110324104091'; // SANDEEP G
  // 2. Female Hosteller
  const femaleHostelRoll = '110324104055'; // Let's check or create a female hosteller
  // 3. Day Scholar
  const dayScholarRoll = '110324104010';

  console.log('--- Test 1: Testing Male Hosteller Gate Pass Routing to Boys Warden ---');
  // Create Gate Pass for Male Hosteller
  const malePassRes = await apiCall('POST', '/api/apply-pass', {
    rollNo: maleHostelRoll,
    studentName: 'SANDEEP G',
    dept: 'CSE',
    yearSec: 'III-B',
    gender: 'Male',
    accommodation: 'Hosteller',
    departureDate: '2026-09-30',
    departureTime: '10:00',
    returnDate: '2026-10-02',
    returnTime: '18:00',
    reason: 'Family Emergency at Home Town',
    parentContact: '9876543210'
  });
  assert(malePassRes.status === 201 || malePassRes.status === 200, 'Male hostel pass created');
  const malePassId = malePassRes.body.pass ? malePassRes.body.pass._id : malePassRes.body._id;
  assert(malePassId, 'Got male pass ID: ' + malePassId);

  // Counselor approve
  const cAppRes = await apiCall('POST', '/api/approvals/counselor', { passId: malePassId, counselorName: 'Dr Saravanan', parentCalled: true });
  assert(cAppRes.body.pass.status === 'Pending Advisor', 'Counselor approval forwarded to Pending Advisor');

  // Advisor approve
  const aAppRes = await apiCall('POST', '/api/approvals/advisor', { passId: malePassId, advisorName: 'Mrs Preethi' });
  assert(aAppRes.body.pass.status === 'Pending HOD', 'Advisor approval forwarded to Pending HOD');

  // HOD approve
  const hAppRes = await apiCall('POST', '/api/approvals/hod', { passId: malePassId, hodName: 'Dr Balaji' });
  assert(hAppRes.body.pass.status === 'Pending Principal', 'HOD approval forwarded to Pending Principal');

  // Principal approve (CRITICAL STEP: Must route to Pending Boys Warden, not finish or disappear!)
  const pAppRes = await apiCall('POST', '/api/approvals/principal', { passId: malePassId, principalName: 'Dr Arumugam' });
  assert(pAppRes.status === 200, 'Principal approval succeeded');
  assert(pAppRes.body.pass.status === 'Pending Boys Warden', 'Principal routed male hosteller to Pending Boys Warden');
  assert(!pAppRes.body.pass.gatePassId, 'Gate Pass ID NOT generated yet before Warden approval');

  // Check Boys Warden dashboard query
  const bwReqRes = await apiCall('GET', '/api/passes?authorityUserId=6661&role=boys_warden&accommodation=Hosteller&gender=Male');
  assert(bwReqRes.status === 200, 'Boys Warden passes query returns 200 OK');
  const foundInBw = bwReqRes.body.find(p => p._id === malePassId);
  assert(foundInBw, 'Male hosteller pass appears on Boys Warden dashboard');
  assert(foundInBw.status === 'Pending Boys Warden', 'Status on Boys Warden dashboard is Pending Boys Warden');

  // Check Girls Warden dashboard query (MUST NOT APPEAR)
  const gwReqRes = await apiCall('GET', '/api/passes?authorityUserId=6662&role=girls_warden&accommodation=Hosteller&gender=Female');
  const foundInGw = gwReqRes.body.find(p => p._id === malePassId);
  assert(!foundInGw, 'Male hosteller pass DOES NOT appear on Girls Warden dashboard');

  // Boys Warden approves pass (Final clearance)
  const bwAppRes = await apiCall('POST', '/api/approvals/boys-warden', { passId: malePassId, wardenName: 'Mr Arul Prasad' });
  assert(bwAppRes.status === 200, 'Boys Warden approval succeeded');
  assert(bwAppRes.body.pass.status === 'Approved', 'Status updated to Approved after Boys Warden');
  assert(bwAppRes.body.pass.gatePassId && bwAppRes.body.pass.gatePassId.startsWith('GRT-GP-'), 'Gate Pass ID automatically generated: ' + bwAppRes.body.pass.gatePassId);
  assert(bwAppRes.body.pass.wardenApproval.approved === true, 'wardenApproval record saved');

  console.log('\n--- Test 2: Testing Female Hosteller Gate Pass Routing to Girls Warden ---');
  // Create Gate Pass for Female Hosteller
  const femalePassRes = await apiCall('POST', '/api/apply-pass', {
    rollNo: '110324104088',
    studentName: 'PRIYA K',
    dept: 'ECE',
    yearSec: 'II-A',
    gender: 'Female',
    accommodation: 'Hosteller',
    departureDate: '2026-10-01',
    departureTime: '09:00',
    returnDate: '2026-10-03',
    returnTime: '17:00',
    reason: 'Sister Wedding Ceremony',
    parentContact: '9840112233'
  });
  assert(femalePassRes.status === 201 || femalePassRes.status === 200, 'Female hostel pass created');
  const femalePassId = femalePassRes.body.pass ? femalePassRes.body.pass._id : femalePassRes.body._id;

  // Run through approvals: Counselor -> Advisor -> HOD -> Principal
  await apiCall('POST', '/api/approvals/counselor', { passId: femalePassId, counselorName: 'Dr Saravanan', parentCalled: true });
  await apiCall('POST', '/api/approvals/advisor', { passId: femalePassId, advisorName: 'Mrs Preethi' });
  await apiCall('POST', '/api/approvals/hod', { passId: femalePassId, hodName: 'Dr Balaji' });
  const pAppFemaleRes = await apiCall('POST', '/api/approvals/principal', { passId: femalePassId, principalName: 'Dr Arumugam' });

  assert(pAppFemaleRes.body.pass.status === 'Pending Girls Warden', 'Principal routed female hosteller to Pending Girls Warden');

  // Check Girls Warden dashboard
  const gwReqRes2 = await apiCall('GET', '/api/passes?authorityUserId=6662&role=girls_warden&accommodation=Hosteller&gender=Female');
  const foundFemaleInGw = gwReqRes2.body.find(p => p._id === femalePassId);
  assert(foundFemaleInGw, 'Female hosteller pass appears on Girls Warden dashboard');

  // Check Boys Warden dashboard (MUST NOT APPEAR)
  const bwReqRes2 = await apiCall('GET', '/api/passes?authorityUserId=6661&role=boys_warden&accommodation=Hosteller&gender=Male');
  const foundFemaleInBw = bwReqRes2.body.find(p => p._id === femalePassId);
  assert(!foundFemaleInBw, 'Female hosteller pass DOES NOT appear on Boys Warden dashboard');

  // Girls Warden approves pass
  const gwAppRes = await apiCall('POST', '/api/approvals/girls-warden', { passId: femalePassId, wardenName: 'Mrs Kanya' });
  assert(gwAppRes.status === 200, 'Girls Warden approval succeeded');
  assert(gwAppRes.body.pass.status === 'Approved', 'Status updated to Approved after Girls Warden');
  assert(gwAppRes.body.pass.gatePassId && gwAppRes.body.pass.gatePassId.startsWith('GRT-GP-'), 'Gate Pass ID generated: ' + gwAppRes.body.pass.gatePassId);

  console.log('\n--- Test 3: Testing Day Scholar Gate Pass (Ends at Principal, NEVER routes to Warden) ---');
  const dsPassRes = await apiCall('POST', '/api/apply-pass', {
    rollNo: '110324104015',
    studentName: 'DINESH M',
    dept: 'MECH',
    yearSec: 'IV-A',
    gender: 'Male',
    accommodation: 'Day Scholar',
    departureDate: '2026-09-30',
    departureTime: '13:00',
    reason: 'Medical Consultation',
    parentContact: '9123456780'
  });
  const dsPassId = dsPassRes.body.pass ? dsPassRes.body.pass._id : dsPassRes.body._id;

  await apiCall('POST', '/api/approvals/counselor', { passId: dsPassId, counselorName: 'Dr Saravanan', parentCalled: true });
  await apiCall('POST', '/api/approvals/advisor', { passId: dsPassId, advisorName: 'Mrs Preethi' });
  await apiCall('POST', '/api/approvals/hod', { passId: dsPassId, hodName: 'Dr Balaji' });
  const pAppDsRes = await apiCall('POST', '/api/approvals/principal', { passId: dsPassId, principalName: 'Dr Arumugam' });

  assert(pAppDsRes.body.pass.status === 'Approved', 'Day Scholar is directly Approved by Principal (Final Clearance)');
  assert(pAppDsRes.body.pass.gatePassId && pAppDsRes.body.pass.gatePassId.startsWith('GRT-GP-'), 'Gate Pass ID generated upon Principal approval for Day Scholar: ' + pAppDsRes.body.pass.gatePassId);

  // Check Boys Warden dashboard (MUST NOT APPEAR)
  const bwReqRes3 = await apiCall('GET', '/api/passes?authorityUserId=6661&role=boys_warden&accommodation=Hosteller&gender=Male');
  const foundDsInBw = bwReqRes3.body.find(p => p._id === dsPassId);
  assert(!foundDsInBw, 'Day Scholar pass DOES NOT route to Boys Warden dashboard');

  // Check Girls Warden dashboard (MUST NOT APPEAR)
  const gwReqRes3 = await apiCall('GET', '/api/passes?authorityUserId=6662&role=girls_warden&accommodation=Hosteller&gender=Female');
  const foundDsInGw = gwReqRes3.body.find(p => p._id === dsPassId);
  assert(!foundDsInGw, 'Day Scholar pass DOES NOT route to Girls Warden dashboard');

  console.log('\n======================================================');
  console.log('🎉 ALL GATE PASS & WARDEN ROUTING TESTS PASSED 100%! 🎉');
  console.log('======================================================');
}

runSuite().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
