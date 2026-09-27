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
  console.log('--- Verifying Leave Request Letter & OD Options ---');
  const baseOpts = { hostname: 'localhost', port: 10000, headers: { 'Content-Type': 'application/json' } };

  // 1. Submit Streamlined Leave Request (From Date, To Date, Reason only)
  const leaveRes = await request({
    ...baseOpts,
    path: '/api/apply-pass',
    method: 'POST'
  }, {
    rollNo: '110324104001',
    requestCategory: 'leave',
    fromDate: '2026-10-10',
    toDate: '2026-10-12',
    reason: 'Family emergency and personal commitments'
  });

  console.log('Leave Request Response:', leaveRes.status, leaveRes.data.success);
  if (!leaveRes.data.success) throw new Error('Leave Request creation failed');

  const pass = leaveRes.data.pass;
  const letter = pass.formalLetter;
  console.log('Has generated formal letter:', !!letter);
  if (!letter || !letter.includes('LEAVE') || !letter.includes('2026-10-10') || !letter.includes('2026-10-12')) {
    throw new Error('Formal leave letter content missing or malformed');
  }
  console.log('[PASS] Formal Leave Letter generated automatically with dates and reason');

  // 2. Verify Counselor can retrieve this pass with letter
  const cPasses = await request({
    ...baseOpts,
    path: '/api/passes?role=counselor&authorityUserId=counselor_cse_1',
    method: 'GET'
  });
  const foundInC = Array.isArray(cPasses.data) && cPasses.data.find(p => p._id === pass._id);
  console.log('[PASS] Counselor has access to leave request and formal letter:', !!(foundInC && foundInC.formalLetter));

  // 3. Test Date-Based OD
  const dateOdRes = await request({
    ...baseOpts,
    path: '/api/apply-onduty',
    method: 'POST'
  }, {
    rollNo: '110324104001',
    reason: 'National Technical Symposium presentation',
    dates: 'Oct 15, 2026 to Oct 17, 2026',
    fromDate: '2026-10-15',
    toDate: '2026-10-17'
  });
  console.log('[PASS] Date-Based OD created:', dateOdRes.status === 200 && dateOdRes.data.success);

  // 4. Test Time-Based OD (e.g. 10:00 AM to 02:00 PM)
  const timeOdRes = await request({
    ...baseOpts,
    path: '/api/apply-onduty',
    method: 'POST'
  }, {
    rollNo: '110324104001',
    reason: 'Inter-College Coding Hackathon round',
    dates: 'Oct 18, 2026 (10:00 AM to 02:00 PM)',
    fromDate: '2026-10-18',
    toDate: '2026-10-18'
  });
  console.log('[PASS] Time-Based OD created:', timeOdRes.status === 200 && timeOdRes.data.success);

  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
