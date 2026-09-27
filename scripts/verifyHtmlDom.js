const http = require('http');

http.get('http://127.0.0.1:10000', (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    const requiredElements = [
      'id="studentPortalContainer"',
      'stu-portal-entrance',
      'id="stuWelcomeHeading"',
      'id="stuDeptSecBadge"',
      'id="stuAccomBadge"',
      'id="leaveFromDate"',
      'id="leaveToDate"',
      'id="leaveReason"',
      'id="stuLeaveTableBody"',
      'id="gatePassReason"',
      'id="gpDepDate"',
      'id="gpDepTime"',
      'id="gpRetDate"',
      'id="gpRetTime"',
      'id="stuGatePassTableBody"',
      'id="odTabBtn_date"',
      'id="odTabBtn_time"',
      'id="stuOdDateSection"',
      'id="stuOdTimeSection"',
      'id="stuODTableBody"'
    ];

    const forbiddenElements = [
      'campus-bg.jpg',
      '“Education<br>Empowers<br>a Better Tomorrow”',
      'id="leaveTypeSelect"',
      'id="leavePlaceEvent"',
      'id="leaveContactNumber"',
      'id="leaveAdditionalDetails"',
      'Gate Pass Approval Workflows',
      'Approval Pipeline'
    ];

    let allOk = true;
    console.log('\n--- Checking Required Clean Elements ---');
    for (const c of requiredElements) {
      const ok = html.includes(c);
      console.log(`[${ok ? 'PASS' : 'FAIL'}] Present: ${c}`);
      if (!ok) allOk = false;
    }

    console.log('\n--- Checking Forbidden / Removed Elements ---');
    for (const f of forbiddenElements) {
      const exists = html.includes(f);
      console.log(`[${!exists ? 'PASS' : 'FAIL'}] Omitted: ${f}`);
      if (exists) allOk = false;
    }

    if (allOk) {
      console.log('\nALL STUDENT PORTAL REQUIREMENTS STRICTLY VERIFIED!');
    } else {
      process.exit(1);
    }
  });
});
