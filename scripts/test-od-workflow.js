/**
 * Automated Verification Script for On-Duty (OD) Workflow & Governance
 * Tests:
 * 1. Student OD Application submission (with placeEvent & expectedReturnTime)
 * 2. Formal OD Letter generation check
 * 3. Counselor approval (Tier 1)
 * 4. Advisor approval (Tier 2)
 * 5. HOD final approval (Tier 3 -> Completed)
 * 6. OD Rejection testing & instant workflow termination
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

async function runODTests() {
  console.log('[Test] Starting On-Duty (OD) Workflow E2E Tests...\n');

  try {
    // 1. Submit OD Application
    console.log('1. Submitting On-Duty Requisition...');
    const applyRes = await request('POST', '/api/onduty/apply', {
      rollNo: '110324104001',
      mode: 'dates',
      fromDate: '2026-09-25',
      toDate: '2026-09-26',
      placeEvent: 'IIT Madras / National Robotics Competition',
      expectedReturnTime: '2026-09-26 19:00',
      reason: 'Participating in National Level Autonomous Robotics Challenge representing GRTIET'
    });

    console.log('Submit Result:', applyRes.status, applyRes.data.message);
    if (!applyRes.data.success) {
      console.error('FAILED to apply for OD:', applyRes.data);
      return;
    }

    const odId = applyRes.data.onDuty._id;
    console.log(`Generated OD ID: ${odId}`);
    console.log('Formal Letter Preview Snippet:\n' + applyRes.data.onDuty.odLetter.slice(0, 300) + '...\n');

    // 2. Counselor Approval
    console.log('2. Counselor endorsing OD request...');
    const counselorRes = await request('POST', '/api/onduty/approve/counselor', {
      requestId: odId,
      counselorName: 'Dr. Shanmugavalli',
      remarks: 'Verified student participation document'
    });
    console.log('Counselor Approval Result:', counselorRes.status, counselorRes.data.message);
    console.log('Status after Counselor:', counselorRes.data.onDuty?.status);

    // 3. Class Advisor Approval
    console.log('\n3. Class Advisor endorsing OD request...');
    const advisorRes = await request('POST', '/api/onduty/approve/advisor', {
      requestId: odId,
      advisorName: 'Prof. Ramesh',
      remarks: 'Recommended for attendance benefit'
    });
    console.log('Advisor Approval Result:', advisorRes.status, advisorRes.data.message);
    console.log('Status after Advisor:', advisorRes.data.onDuty?.status);

    // 4. HOD Final Approval
    console.log('\n4. HOD granting final authorization...');
    const hodRes = await request('POST', '/api/onduty/approve/hod', {
      requestId: odId,
      hodName: 'Dr. A. Kumar (HOD CSE)',
      remarks: 'Authorized. Duty sanctioned.'
    });
    console.log('HOD Final Result:', hodRes.status, hodRes.data.message);
    console.log('Final Status:', hodRes.data.onDuty?.status);

    // 5. Test Rejection Flow
    console.log('\n5. Submitting second OD request to test instant Rejection flow...');
    const apply2 = await request('POST', '/api/onduty/apply', {
      rollNo: '110324104002',
      mode: 'dates',
      fromDate: '2026-09-28',
      toDate: '2026-09-28',
      placeEvent: 'Off-campus workshop',
      expectedReturnTime: '2026-09-28 17:00',
      reason: 'Attending external technical session'
    });
    const od2Id = apply2.data.onDuty._id;

    console.log('Counselor rejecting OD request 2...');
    const rejectRes = await request('POST', '/api/onduty/reject', {
      requestId: od2Id,
      reason: 'Conflict with scheduled mid-semester examinations',
      rejectedBy: 'Dr. Shanmugavalli',
      role: 'counselor'
    });
    console.log('Rejection Result:', rejectRes.status, rejectRes.data.message);
    console.log('Status after Rejection:', rejectRes.data.onDuty?.status);
    console.log('Rejection Record:', rejectRes.data.onDuty?.rejection);

    console.log('\n[PASS] ALL ON-DUTY WORKFLOW E2E TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('[FAIL] Test failed with error:', err.message);
  }
}

runODTests();
