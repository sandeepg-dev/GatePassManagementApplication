/**
 * Integration Test for Bifurcated Approval Workflows
 * 1. Leave Request: Student -> Counselor -> Advisor -> HOD -> CLOSED (Never Principal/Warden)
 * 2. Day Scholar Gate Pass: Student -> Counselor -> Advisor -> HOD -> Principal -> CLOSED
 * 3. Hosteller Gate Pass: Student -> Counselor -> Advisor -> HOD -> Warden -> CLOSED
 */

const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('CAMPUS PASSPRO • BIFURCATED WORKFLOW VERIFICATION');
  console.log('====================================================');

  const baseOpts = {
    hostname: 'localhost',
    port: 10000,
    headers: { 'Content-Type': 'application/json' }
  };

  const studentDS = '110324104001'; // AADARSHINI V - Day Scholar
  const studentHostel = '110324104018'; // DHANUSH G - Hosteller
  const counselorDS = 'counselor_cse_1';
  const advisor = 'advisor_cse_b';
  const hod = 'hod_cse';
  const principal = 'principal_office';
  const boysWarden = 'warden_boys';

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, message) {
    totalCount++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SUITE 1: LEAVE REQUEST WORKFLOW (Student -> Counselor -> Advisor -> HOD -> CLOSED)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 1: Leave Request Approval Workflow ---');

  const leavePayload = {
    rollNo: studentDS,
    requestCategory: 'leave',
    leaveType: 'Personal Leave',
    reason: 'Going to hometown for festival',
    placeOrEvent: 'Hometown Family Gathering',
    contactNumber: '9876543210',
    fromDate: '2026-10-01',
    toDate: '2026-10-03',
    expectedReturnDate: '2026-10-03',
    expectedReturnTime: '18:00',
    expectedReturnDateTime: '2026-10-03 18:00',
    additionalDetails: 'Bus travel booked'
  };

  const createLeaveRes = await request({
    ...baseOpts,
    path: '/api/apply-pass',
    method: 'POST'
  }, leavePayload);

  assert(createLeaveRes.status === 200 && createLeaveRes.data.success, 'Leave Request created successfully');
  const leavePassId = createLeaveRes.data.pass?._id || createLeaveRes.data.pass?.id;

  // 1. Counselor Queue should see it
  const cQueueRes = await request({
    ...baseOpts,
    path: `/api/passes?role=counselor&authorityUserId=${counselorDS}`,
    method: 'GET'
  });
  const cLeaveFound = Array.isArray(cQueueRes.data) && cQueueRes.data.find(p => p._id === leavePassId || p.id === leavePassId);
  assert(!!cLeaveFound, 'Leave Request appears in Counselor review queue');

  // Counselor approves -> routes to Advisor
  console.log('DEBUG leavePassId:', leavePassId);
  const cApproveRes = await request({
    ...baseOpts,
    path: '/api/approvals/counselor',
    method: 'POST'
  }, { passId: leavePassId, counselorName: 'Dr. Counselor', parentCalled: true });
  console.log('DEBUG cApproveRes:', cApproveRes.status, cApproveRes.data);
  assert(cApproveRes.status === 200 && cApproveRes.data.success, 'Counselor approves Leave Request -> routes to Advisor');

  // 2. Class Advisor approves -> routes to HOD
  const aApproveRes = await request({
    ...baseOpts,
    path: '/api/approvals/advisor',
    method: 'POST'
  }, { passId: leavePassId, advisorName: 'Prof. Advisor' });
  assert(aApproveRes.status === 200 && aApproveRes.data.success, 'Advisor approves Leave Request -> routes to HOD');

  // 3. HOD approves -> Workflow MUST CLOSE at HOD!
  const hApproveRes = await request({
    ...baseOpts,
    path: '/api/approvals/hod',
    method: 'POST'
  }, { passId: leavePassId, hodName: 'Dr. HOD' });
  assert(hApproveRes.status === 200 && hApproveRes.data.success, 'HOD approves Leave Request');
  assert(hApproveRes.data.pass?.status === 'Approved', 'Leave Request status is immediately Approved/CLOSED at HOD');

  // 4. Verify Principal and Warden NEVER receive this Leave Request
  const princQueueRes = await request({
    ...baseOpts,
    path: '/api/passes?role=principal&authorityUserId=' + principal,
    method: 'GET'
  });
  const princFoundLeave = Array.isArray(princQueueRes.data) && princQueueRes.data.find(p => p._id === leavePassId || p.id === leavePassId);
  assert(!princFoundLeave, 'Leave Request does NOT appear in Principal queue (Forbidden)');

  const wardenQueueRes = await request({
    ...baseOpts,
    path: '/api/passes?role=boys_warden&authorityUserId=' + boysWarden,
    method: 'GET'
  });
  const wardenFoundLeave = Array.isArray(wardenQueueRes.data) && wardenQueueRes.data.find(p => p._id === leavePassId || p.id === leavePassId);
  assert(!wardenFoundLeave, 'Leave Request does NOT appear in Warden queue (Forbidden)');

  // ─────────────────────────────────────────────────────────────
  // SUITE 2: DAY SCHOLAR GATE PASS WORKFLOW (Student -> Counselor -> Advisor -> HOD -> Principal -> CLOSED)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 2: Day Scholar Gate Pass Approval Workflow ---');

  const dsGpPayload = {
    rollNo: studentDS,
    requestCategory: 'gate_pass',
    reason: 'Emergency medical appointment outside campus',
    departureDate: '2026-10-02',
    departureTime: '13:30',
    expectedReturnDate: '2026-10-02',
    expectedReturnTime: '17:00',
    expectedReturnDateTime: '2026-10-02 17:00',
    contactNumber: '9876543210'
  };

  const createDsGpRes = await request({
    ...baseOpts,
    path: '/api/apply-pass',
    method: 'POST'
  }, dsGpPayload);

  assert(createDsGpRes.status === 200 && createDsGpRes.data.success, 'Day Scholar Gate Pass created successfully');
  const dsGpPassId = createDsGpRes.data.pass?._id || createDsGpRes.data.pass?.id;

  // Counselor approves
  await request({
    ...baseOpts,
    path: '/api/approvals/counselor',
    method: 'POST'
  }, { passId: dsGpPassId, counselorName: 'Dr. Counselor', parentCalled: true });

  // Advisor approves
  await request({
    ...baseOpts,
    path: '/api/approvals/advisor',
    method: 'POST'
  }, { passId: dsGpPassId, advisorName: 'Prof. Advisor' });

  // HOD approves -> Day Scholar MUST go to Principal
  const hodDsRes = await request({
    ...baseOpts,
    path: '/api/approvals/hod',
    method: 'POST'
  }, { passId: dsGpPassId, hodName: 'Dr. HOD' });

  assert(hodDsRes.status === 200 && hodDsRes.data.success, 'HOD approves Day Scholar Gate Pass');
  assert(hodDsRes.data.pass?.status === 'Pending Principal', 'Day Scholar Gate Pass routed to Pending Principal');

  // Verify NOT in Warden queue
  const wCheckRes = await request({
    ...baseOpts,
    path: '/api/passes?role=boys_warden&authorityUserId=' + boysWarden,
    method: 'GET'
  });
  const wardenHasDs = Array.isArray(wCheckRes.data) && wCheckRes.data.find(p => p._id === dsGpPassId || p.id === dsGpPassId);
  assert(!wardenHasDs, 'Day Scholar Gate Pass does NOT go to Warden');

  // Principal approves -> CLOSED
  const princApproveRes = await request({
    ...baseOpts,
    path: '/api/approvals/principal',
    method: 'POST'
  }, { passId: dsGpPassId, principalName: 'Dr. Principal' });
  assert(princApproveRes.status === 200 && princApproveRes.data.success, 'Principal approves Day Scholar Gate Pass');
  assert(princApproveRes.data.pass?.status === 'Approved', 'Day Scholar Gate Pass status is Approved/CLOSED');

  // ─────────────────────────────────────────────────────────────
  // SUITE 3: HOSTELLER GATE PASS WORKFLOW (Student -> Counselor -> Advisor -> HOD -> Warden -> CLOSED)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Suite 3: Hosteller Gate Pass Approval Workflow ---');

  const hostelGpPayload = {
    rollNo: studentHostel,
    requestCategory: 'gate_pass',
    reason: 'Weekend hometown visit with parental approval',
    departureDate: '2026-10-02',
    departureTime: '17:00',
    expectedReturnDate: '2026-10-04',
    expectedReturnTime: '19:00',
    expectedReturnDateTime: '2026-10-04 19:00',
    contactNumber: '9876543211'
  };

  const createHostelGpRes = await request({
    ...baseOpts,
    path: '/api/apply-pass',
    method: 'POST'
  }, hostelGpPayload);

  assert(createHostelGpRes.status === 200 && createHostelGpRes.data.success, 'Hosteller Gate Pass created successfully');
  const hostelGpPassId = createHostelGpRes.data.pass?._id || createHostelGpRes.data.pass?.id;

  // Counselor approves
  await request({
    ...baseOpts,
    path: '/api/approvals/counselor',
    method: 'POST'
  }, { passId: hostelGpPassId, counselorName: 'Dr. Counselor', parentCalled: true });

  // Advisor approves
  await request({
    ...baseOpts,
    path: '/api/approvals/advisor',
    method: 'POST'
  }, { passId: hostelGpPassId, advisorName: 'Prof. Advisor' });

  // HOD approves -> Hosteller MUST go directly to Warden (bypass Principal)
  const hodHostelRes = await request({
    ...baseOpts,
    path: '/api/approvals/hod',
    method: 'POST'
  }, { passId: hostelGpPassId, hodName: 'Dr. HOD' });

  assert(hodHostelRes.status === 200 && hodHostelRes.data.success, 'HOD approves Hosteller Gate Pass');
  assert(hodHostelRes.data.pass?.status === 'Pending Boys Warden', 'Hosteller Gate Pass routed directly to Pending Boys Warden');

  // Verify Principal queue does NOT have it
  const pCheckRes = await request({
    ...baseOpts,
    path: '/api/passes?role=principal&authorityUserId=' + principal,
    method: 'GET'
  });
  const princHasHostel = Array.isArray(pCheckRes.data) && pCheckRes.data.find(p => p._id === hostelGpPassId || p.id === hostelGpPassId);
  assert(!princHasHostel, 'Hosteller Gate Pass does NOT go to Principal (bypasses Principal)');

  // Warden approves -> CLOSED
  const wardenApproveRes = await request({
    ...baseOpts,
    path: '/api/approvals/warden',
    method: 'POST'
  }, { passId: hostelGpPassId, wardenRole: 'boys_warden', wardenName: 'Hostel Chief Warden' });
  assert(wardenApproveRes.status === 200 && wardenApproveRes.data.success, 'Warden approves Hosteller Gate Pass');
  assert(wardenApproveRes.data.pass?.status === 'Approved', 'Hosteller Gate Pass status is Approved/CLOSED');

  console.log('\n====================================================');
  console.log(`WORKFLOW VERIFICATION SUMMARY: ${passedCount} / ${totalCount} PASSED`);
  console.log('====================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
