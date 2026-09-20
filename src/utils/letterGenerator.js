/**
 * Institutional Leave Letter & On-Duty Letter Generator
 */
const { getISTTimeString } = require('./formatters');

/**
 * Generates the standardized official formal leave clearance application text.
 * @param {object} student Student demographic and contact details
 * @param {string} [rawReason=''] Reason for outpass
 * @param {string} [appliedTimeStr=''] Submission timestamp string
 * @returns {string} Formatted formal letter
 */
function generateFormalLetter(student, rawReason = '', appliedTimeStr = '', schedule = null) {
  const timeInfo = appliedTimeStr || getISTTimeString();
  const deptUpper = String(student.dept || 'ENGINEERING').toUpperCase();
  const isHosteller = (/hoste?l|^h$/i.test(student.accommodation || '') && !/day/i.test(student.accommodation || ''));
  const accommodationType = isHosteller ? 'Hosteller (Resident Student)' : 'Day Scholar';

  const depDate = student.departureDate || schedule?.departureDate;
  const depTime = student.departureTime || schedule?.departureTime;
  const retDate = student.expectedReturnDate || schedule?.expectedReturnDate;
  const retTime = student.expectedReturnTime || schedule?.expectedReturnTime;
  const retDateTime = student.expectedReturnDateTime || schedule?.expectedReturnDateTime || (retDate && retTime ? `${retDate} at ${retTime}` : (retDate || retTime));

  let scheduleDetailsText = '';
  if (isHosteller) {
    scheduleDetailsText = `\nOFFICIAL HOSTELLER MOVEMENT SCHEDULE:
- Application Date            : ${timeInfo}
- Departure Date & Time       : ${depDate || '-'}${depTime ? ' at ' + depTime : ''}
- Return Date & Time          : ${retDateTime || '-'}
- Department, Year & Section  : Department of ${student.dept || 'Engineering'}, ${student.academicYear || '3 Year'} (Section '${student.yearSec || 'A'}')\n`;
    const leaveDateStr = schedule?.leaveDate || schedule?.departureDate || student.leaveDate || student.departureDate || '';
    const leaveTimeStr = schedule?.leaveTime || schedule?.departureTime || student.leaveTime || student.departureTime || '';
    const leaveTime = leaveDateStr && leaveTimeStr ? `${leaveDateStr} at ${leaveTimeStr}` : (leaveDateStr || leaveTimeStr || schedule?.leaveDateTime || schedule?.approvalTime || student.approvalTime || timeInfo);
    scheduleDetailsText = `\nOFFICIAL DAY SCHOLAR CLEARANCE DETAILS:
- Leave Date & Time           : ${leaveTime}
- Department, Year & Section  : Department of ${student.dept || 'Engineering'}, ${student.academicYear || '3 Year'} (Section '${student.yearSec || 'A'}')\n`;
  }

  return `GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY
(Approved by AICTE, New Delhi | Affiliated to Anna University, Chennai)
(An Autonomous Institution | Accredited by NAAC with 'A++' Grade)
GRT Mahalaksmi Nagar, Chennai-Tirupati Highway, Tiruttani - 631 209.
DEPARTMENT OF ${deptUpper}

Date: ${timeInfo}
Ref: GRTIET/${deptUpper}/GP/2026/${student.rollNo}

From:
${student.name || 'Student'} (Register No: ${student.rollNo}),
${student.academicYear || '3 Year'}, Department of ${student.dept || 'Engineering'} (Section '${student.yearSec || 'A'}'),
Accommodation: ${accommodationType} | Father: ${student.fatherName || student.parentName || '-'} | Parent Phone: ${student.parentContact || '-'},
GRT Institute of Engineering and Technology, Tiruttani - 631 209.

Through:
(Through: Respective Class Counselor, Class Advisor, and Head of Department)

To:
The Principal / Institutional Directorate,
GRT Institute of Engineering and Technology,
Tiruttani - 631 209.

Respected Sir / Madam,

Subject: Requisition for Authorized Campus Gate Pass / Leave Clearance - Regarding.

I am writing to request permission for a Gate Pass to leave the college campus due to the following reason:

"${String(rawReason).trim()}"
${scheduleDetailsText}
I have informed my parents and assure you that I will abide by all institutional rules and return to the campus on time. Kindly grant me permission.

Thanking You,

Yours faithfully,
(${student.name || 'Student'})
Roll No: ${student.rollNo}

OFFICIAL MULTI-TIER CLEARANCE & APPROVAL ENDORSEMENT:
[1] Class Counselor: Verified & Recommended
[2] Class Advisor: Endorsed & Approved
[3] Head of Department: Authorized
[4] Principal / Directorate: Sanctioned
${isHosteller ? '[5] Hostel Warden: Gate Cleared & Sanctioned\n' : ''}
Campus PassPro • Official Gate Pass Requisition Record`;
}

/**
 * Generates the standardized official institutional On-Duty (OD) Letter text.
 * @param {object} od On-Duty record with student particulars and approval clearances
 * @returns {string} Formatted formal OD letter
 */
function generateOnDutyLetter(od) {
  const appliedTime = od.appliedTime || getISTTimeString();
  
  const scheduleText = od.mode === 'time'
    ? `${od.specificDate || od.fromDate || '-'} (from ${od.fromTime || '-'} to ${od.toTime || '-'})`
    : `From ${od.fromDate || '-'} to ${od.toDate || '-'}`;

  const counselorStatus = od.counselorApproval?.approved
    ? `Recommended & Approved (${od.counselorApproval.counselorName || 'Class Counselor'} on ${od.counselorApproval.time || '-'})`
    : (od.status === 'Rejected' && /counselor/i.test(od.rejection?.role || '')
      ? `REJECTED (${od.rejection?.reason || 'Declined'} on ${od.rejection?.time || '-'})`
      : `Pending Counselor Endorsement`);

  const advisorStatus = od.advisorApproval?.approved
    ? `Recommended & Approved (${od.advisorApproval.advisorName || 'Class Advisor'} on ${od.advisorApproval.time || '-'})`
    : (od.status === 'Rejected' && /advisor/i.test(od.rejection?.role || '')
      ? `REJECTED (${od.rejection?.reason || 'Declined'} on ${od.rejection?.time || '-'})`
      : (od.counselorApproval?.approved ? `Pending Advisor Endorsement` : `Queued (Awaiting Counselor)`));

  const hodStatus = od.hodApproval?.approved
    ? `Sanctioned & Approved (${od.hodApproval.hodName || 'Head of Department'} on ${od.hodApproval.time || '-'})`
    : (od.status === 'Rejected' && /hod/i.test(od.rejection?.role || '')
      ? `REJECTED (${od.rejection?.reason || 'Declined'} on ${od.rejection?.time || '-'})`
      : (od.advisorApproval?.approved ? `Pending HOD Sanction` : `Queued (Awaiting Advisor)`));

  const placeEvent = String(od.placeEvent || od.event || '').trim();
  const expectedReturn = String(od.expectedReturnTime || '').trim();
  const reason = String(od.reason || '').trim();
  const deptUpper = String(od.dept || 'ENGINEERING').toUpperCase();

  const particularItems = [];
  if (placeEvent && placeEvent !== '-' && placeEvent !== 'Institutional Assignment / Symposium' && placeEvent !== 'College Assignment') {
    particularItems.push(`  • Place / Event        : ${placeEvent}`);
  }
  particularItems.push(`  • OD Date & Time       : ${scheduleText}`);
  particularItems.push(`  • OD Reason / Purpose  : ${reason}`);
  if (expectedReturn && expectedReturn !== '-' && expectedReturn !== 'Promptly after event completion') {
    particularItems.push(`  • Expected Return Time : ${expectedReturn}`);
  }

  return `GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY
(Approved by AICTE, New Delhi | Affiliated to Anna University, Chennai)
(An Autonomous Institution | Accredited by NAAC with 'A++' Grade)
GRT Mahalaksmi Nagar, Chennai-Tirupati Highway, Tiruttani - 631 209.
DEPARTMENT OF ${deptUpper}

Date: ${appliedTime}
Ref: GRTIET/${deptUpper}/OD/2026/${od.rollNo}

From:
${od.name || 'Student'} (Register No: ${od.rollNo}),
${od.academicYear || '3 Year'}, Department of ${od.dept || 'Engineering'} (Section '${od.yearSec || 'A'}'),
GRT Institute of Engineering and Technology,
Tiruttani - 631 209.

To:
The Head of the Department,
Department of ${od.dept || 'Engineering'},
GRT Institute of Engineering and Technology,
Tiruttani - 631 209.

(Through: Respective Class Counselor and Class Advisor)

Respected Sir / Madam,

Subject: Requisition for Academic On-Duty (OD) Permission - Regarding.

I am writing to formally request On-Duty (OD) permission for myself to participate in / attend the specified academic engagement. The particulars of the proposed On-Duty engagement are detailed below:

${particularItems.join('\n')}

I kindly request you to consider this requisition favorably, grant me On-Duty permission for the duration stated above, and award academic attendance for the same. I assure you that I will observe all institutional rules and proactively complete all lectures, assignments, and laboratory coursework missed during my absence.

Thanking You,

Yours faithfully,

(Signature of the Student)
${od.name || 'Student'}
Roll No: ${od.rollNo}

================================================================================
OFFICIAL VERIFICATION & ACADEMIC ENDORSEMENTS:
1. Student Signature : ${od.name || 'Student'} (Date: ${appliedTime})
2. Class Counselor   : ${counselorStatus}
3. Class Advisor     : ${advisorStatus}
4. Head of Dept (HOD): ${hodStatus}`;
}

module.exports = {
  generateFormalLetter,
  generateOnDutyLetter
};
