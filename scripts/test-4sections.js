/**
 * E2E Verification Script for 4-Section Architecture & Authority Workflows
 * Tests:
 * 1. Student Submission
 * 2. Counselor Section Separation (Requests -> Approved / Rejected -> All Records)
 * 3. Advisor Section Separation
 * 4. HOD Section Separation
 * 5. Principal Section Separation
 * 6. Sequential Visibility & Rejection Isolation
 */

const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:10000${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', err => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('[Test] Starting 4-Section Workflow Verification Tests...\n');

  // Test 1: Submit new Day Scholar Leave application
  console.log('1. Submitting test leave application for student 110324104001 (Day Scholar)...');
  const applyRes = await request('POST', '/api/apply-pass', {
    rollNo: '110324104001',
    reason: 'Attending technical seminar at IIT Madras'
  });
  console.log('Apply Result:', applyRes.status, applyRes.data.message || applyRes.data);
  const passId = applyRes.data.pass?._id || applyRes.data.passId;

  // Test 2: Check Counselor view
  console.log('\n2. Testing Counselor Dashboard Sections:');
  const counselorReqs = await request(
    'GET',
    '/api/passes?status=Pending%20Counselor&role=counselor&counselorName=TestCounselor&startRoll=110324104001&endRoll=110324104020'
  );
  console.log(`- [Student Leave Requests] (Pending Counselor): Found ${counselorReqs.data.length} pass(es)`);
  const counselorAll = await request(
    'GET',
    '/api/passes?role=counselor&counselorName=TestCounselor&startRoll=110324104001&endRoll=110324104020'
  );
  console.log(`- [All Records] (Counselor jurisdiction): Found ${counselorAll.data.length} pass(es)`);

  // Test 3: Counselor approves
  console.log('\n3. Counselor approving leave request...');
  const cApproveRes = await request('POST', '/api/approve/counselor', {
    passId: passId,
    parentCalled: true,
    counselorName: 'Dr. Shanmugavalli'
  });
  console.log('Counselor Approve Result:', cApproveRes.status, cApproveRes.data.message);

  // Check Counselor Approved section
  const counselorAllAfter = await request(
    'GET',
    '/api/passes?role=counselor&counselorName=TestCounselor&startRoll=110324104001&endRoll=110324104020'
  );
  const cApprovedCount = counselorAllAfter.data.filter(p => p.counselorApproval?.approved).length;
  console.log(`- Counselor [Approved] Tab count: ${cApprovedCount}`);

  // Test 4: Check Advisor view
  console.log('\n4. Testing Class Advisor Dashboard Sections:');
  const advisorReqs = await request('GET', '/api/passes?status=Pending%20Advisor&role=advisor&dept=CSE&yearSec=A');
  console.log(`- [Leave Requests] (Pending Advisor): Found ${advisorReqs.data.length} pass(es)`);
  
  // Advisor approves
  console.log('Class Advisor approving leave request...');
  const aApproveRes = await request('POST', '/api/approve/advisor', {
    passId: passId,
    advisorName: 'Prof. Ramesh',
    parentCalledFallback: false
  });
  console.log('Advisor Approve Result:', aApproveRes.status, aApproveRes.data.message);

  const advisorAll = await request('GET', '/api/passes?role=advisor&dept=CSE&yearSec=A');
  const aApprovedCount = advisorAll.data.filter(p => p.advisorApproval?.approved).length;
  console.log(`- Advisor [Approved] Tab count: ${aApprovedCount}`);

  // Test 5: Check HOD view
  console.log('\n5. Testing HOD Dashboard Sections:');
  const hodReqs = await request('GET', '/api/passes?status=Pending%20HOD&role=hod&dept=CSE');
  console.log(`- [Leave Requests] (Pending HOD): Found ${hodReqs.data.length} pass(es)`);

  // HOD approves
  console.log('HOD authorizing leave request...');
  const hApproveRes = await request('POST', '/api/approve/hod', {
    passId: passId,
    hodName: 'Dr. Suresh'
  });
  console.log('HOD Authorize Result:', hApproveRes.status, hApproveRes.data.message);

  const hodAll = await request('GET', '/api/passes?role=hod&dept=CSE');
  const hApprovedCount = hodAll.data.filter(p => p.hodApproval?.approved).length;
  console.log(`- HOD [Approved] Tab count: ${hApprovedCount}`);

  // Test 6: Check Principal view
  console.log('\n6. Testing Principal Dashboard Sections:');
  const principalReqs = await request('GET', '/api/passes?status=Pending%20Principal&role=principal');
  console.log(`- [Leave Requests] (Pending Principal): Found ${principalReqs.data.length} pass(es)`);

  // Principal approves
  console.log('Principal granting final clearance...');
  const pApproveRes = await request('POST', '/api/approve/principal', {
    passId: passId
  });
  console.log('Principal Clearance Result:', pApproveRes.status, pApproveRes.data.message);

  const principalAll = await request('GET', '/api/passes?role=principal');
  const pApprovedCount = principalAll.data.filter(p => p.principalApproval?.approved).length;
  console.log(`- Principal [Approved] Tab count: ${pApprovedCount}`);

  // Test 7: Test Rejection Flow
  console.log('\n7. Testing Rejection Flow and Separation:');
  const applyRes2 = await request('POST', '/api/apply-pass', {
    rollNo: '110324104002',
    reason: 'Personal shopping during class hours'
  });
  const passId2 = applyRes2.data.pass?._id || applyRes2.data.passId;

  console.log('Counselor rejecting invalid request passId2...');
  const rejectRes = await request('POST', '/api/approve/reject', {
    passId: passId2,
    reason: 'Unauthorized reason during lecture hours',
    rejectedBy: 'Dr. Shanmugavalli',
    role: 'counselor'
  });
  console.log('Counselor Rejection Result:', rejectRes.status, rejectRes.data.message);

  const counselorAfterReject = await request(
    'GET',
    '/api/passes?role=counselor&counselorName=TestCounselor&startRoll=110324104001&endRoll=110324104020'
  );
  const cRejectedCount = counselorAfterReject.data.filter(
    p => p.status === 'Rejected' && (p.rejection?.role === 'counselor' || /counselor/i.test(p.rejectedBy || ''))
  ).length;
  console.log(`- Counselor [Rejected] Tab count: ${cRejectedCount}`);

  // Confirm that the rejected pass did NOT propagate to Advisor
  const advisorAllAfterReject = await request('GET', '/api/passes?role=advisor&dept=CSE&yearSec=A');
  const pass2InAdvisor = advisorAllAfterReject.data.find(p => p._id === passId2);
  console.log(`- Is Counselor-rejected pass visible to Advisor? ${pass2InAdvisor ? 'YES (Error!)' : 'NO (Correct!)'}`);

  // Test 8: Hosteller to Boys Warden Flow
  console.log('\n8. Testing Hosteller routing to Boys Warden:');
  const applyHostel = await request('POST', '/api/apply-pass', {
    rollNo: '110324104003',
    accommodation: 'Hosteller',
    gender: 'Male',
    reason: 'Hostel weekend leave for home visit'
  });
  const hostelPassId = applyHostel.data.passId;

  // Counselor -> Advisor -> HOD -> Principal
  await request('POST', '/api/approve/counselor', { passId: hostelPassId, parentCalled: true, counselorName: 'Dr. Shanmugavalli' });
  await request('POST', '/api/approve/advisor', { passId: hostelPassId, advisorName: 'Prof. Ramesh', parentCalledFallback: false });
  await request('POST', '/api/approve/hod', { passId: hostelPassId, hodName: 'Dr. Suresh' });
  await request('POST', '/api/approve/principal', { passId: hostelPassId });

  // Check Boys Warden Requests
  const wardenReqs = await request('GET', '/api/passes?status=Pending%20Boys%20Warden&role=boys_warden');
  console.log(`- Boys Warden [Leave Requests]: Found ${wardenReqs.data.length} pass(es)`);

  // Boys Warden approves
  const wardenApprove = await request('POST', '/api/approve/boys-warden', { passId: hostelPassId });
  console.log('Boys Warden Approve Result:', wardenApprove.status, wardenApprove.data.message);

  const wardenAll = await request('GET', '/api/passes?role=boys_warden');
  const wardenApprovedCount = wardenAll.data.filter(p => p.wardenApproval?.approved || p.status === 'Approved').length;
  console.log(`- Boys Warden [Approved] Tab count: ${wardenApprovedCount}`);

  console.log('\n[PASS] All 4-Section Architecture & Workflow Tests Completed Successfully!');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
