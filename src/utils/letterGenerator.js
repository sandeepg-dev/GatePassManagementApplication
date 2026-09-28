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

  if (schedule?.requestCategory === 'leave') {
    const fromDateStr = schedule.fromDate || schedule.departureDate || '-';
    const toDateStr = schedule.toDate || schedule.expectedReturnDate || '-';

    return `GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY
(Approved by AICTE, New Delhi | Affiliated to Anna University, Chennai)
(An Autonomous Institution | Accredited by NAAC with 'A++' Grade)
GRT Mahalaksmi Nagar, Chennai-Tirupati Highway, Tiruttani - 631 209.
DEPARTMENT OF ${deptUpper}

Date: ${timeInfo}
Ref: GRTIET/${deptUpper}/LEAVE/2026/${student.rollNo}

From:
${student.name || 'Student'} (Register No: ${student.rollNo}),
${student.academicYear || '3 Year'}, Department of ${student.dept || 'Engineering'} (Section '${student.yearSec || 'A'}'),
Accommodation: ${accommodationType} | Parent Phone: ${student.parentContact || '-'},
GRT Institute of Engineering and Technology, Tiruttani - 631 209.

Through:
Respective Class Counselor and Class Advisor

To:
The Head of the Department,
Department of ${student.dept || 'Engineering'},
GRT Institute of Engineering and Technology,
Tiruttani - 631 209.

Respected Sir / Madam,

Subject: Application for Leave of Absence - Regarding.

I am writing to respectfully request permission to take leave of absence from college for the following period:

- From Date : ${fromDateStr}
- To Date   : ${toDateStr}

Reason for Leave:
"${String(rawReason).trim()}"

I have informed my parents regarding this leave of absence and I will ensure that any academic classes or laboratory assignments missed during this period will be covered promptly. Kindly sanction my leave request.

Thanking You,

Yours faithfully,
(${student.name || 'Student'})
Roll No: ${student.rollNo}

APPROVAL WORKFLOW (Counselor -> Class Advisor -> HOD -> CLOSED):
--------------------------------------------------------------------------------
[1] Class Counselor   : Verified & Recommended
[2] Class Advisor     : Endorsed & Approved
[3] Head of Department: Sanctioned & Closed
--------------------------------------------------------------------------------
Campus PassPro • Official Student Leave Requisition Letter`;
  }

  let scheduleDetailsText = '';
  const destination = schedule?.destination || schedule?.placeOrEvent || student.destination || student.placeOrEvent || '';
  const hostelRoom = schedule?.hostelRoom || student.hostelRoom || '';
  const hostelBlock = schedule?.hostelBlock || student.hostelBlock || '';
  const hostelInfoText = isHosteller ? `\n- Hostel Particulars          : Block ${hostelBlock || 'A'}, Room ${hostelRoom || 'Resident'}` : '';

  const returnScheduleText = isHosteller ? `- Expected Return Date & Time : ${retDateTime || '-'}\n` : '';
  const destinationText = destination ? `- Place / Destination         : ${destination}\n` : '';

  scheduleDetailsText = `
OFFICIAL GATE OUTPASS SCHEDULE:
- Departure Date & Time       : ${depDate || '-'}${depTime ? ' at ' + depTime : ''}
${returnScheduleText}${destinationText}${hostelInfoText ? hostelInfoText + '\n' : ''}- Department, Year & Section  : Department of ${student.dept || 'Engineering'}, ${student.academicYear || '3 Year'} (Section '${student.yearSec || 'A'}')
`;

  // Approval audit trail
  const cApp = schedule?.counselorApproval?.approved || student.counselorApproval?.approved;
  const aApp = schedule?.advisorApproval?.approved || student.advisorApproval?.approved;
  const hApp = schedule?.hodApproval?.approved || student.hodApproval?.approved;
  const pApp = schedule?.principalApproval?.approved || student.principalApproval?.approved;
  const wApp = schedule?.wardenApproval?.approved || student.wardenApproval?.approved;

  const cTime = schedule?.counselorApproval?.time || student.counselorApproval?.time || '';
  const aTime = schedule?.advisorApproval?.time || student.advisorApproval?.time || '';
  const hTime = schedule?.hodApproval?.time || student.hodApproval?.time || '';
  const pTime = schedule?.principalApproval?.time || student.principalApproval?.time || '';
  const wTime = schedule?.wardenApproval?.time || student.wardenApproval?.time || '';

  const rej = schedule?.rejection || student.rejection || {};
  const isRej = schedule?.status === 'Rejected' || student.status === 'Rejected' || !!rej.rejected;
  const rejRole = rej.role || '';

  const cStatus = cApp ? `Verified & Recommended (${cTime || 'Approved'})` : (isRej && /counselor/i.test(rejRole) ? `REJECTED (${rej.reason || 'Declined'})` : 'Pending Counselor Review');
  const aStatus = aApp ? `Endorsed & Approved (${aTime || 'Approved'})` : (isRej && /advisor/i.test(rejRole) ? `REJECTED (${rej.reason || 'Declined'})` : (cApp ? 'Pending Class Advisor Review' : 'Queued'));
  const hStatus = hApp ? `Authorized & Sanctioned (${hTime || 'Approved'})` : (isRej && /hod/i.test(rejRole) ? `REJECTED (${rej.reason || 'Declined'})` : (aApp ? 'Pending HOD Review' : 'Queued'));
  const pStatus = pApp ? `Sanctioned & Approved (${pTime || 'Approved'})` : (isRej && /principal/i.test(rejRole) ? `REJECTED (${rej.reason || 'Declined'})` : (hApp ? 'Pending Principal Review' : 'Queued'));
  const wStatus = wApp ? `Gate Cleared & Sanctioned (${wTime || 'Approved'})` : (isRej && /warden/i.test(rejRole) ? `REJECTED (${rej.reason || 'Declined'})` : (pApp ? 'Pending Warden Review' : 'Queued'));

  const approvalBlock = isHosteller
    ? `OFFICIAL MULTI-TIER CLEARANCE & APPROVAL ENDORSEMENT:
[1] Class Counselor   : ${cStatus}
[2] Class Advisor     : ${aStatus}
[3] Head of Department: ${hStatus}
[4] Principal         : ${pStatus}
[5] Hostel Warden     : ${wStatus}`
    : `OFFICIAL MULTI-TIER CLEARANCE & APPROVAL ENDORSEMENT:
[1] Class Counselor   : ${cStatus}
[2] Class Advisor     : ${aStatus}
[3] Head of Department: ${hStatus}
[4] Principal         : ${pStatus}`;

  const rejectionBlock = isRej
    ? `\n\n--------------------------------------------------------------------------------\nREJECTION NOTICE: Application was rejected by ${rej.roleTitle || rej.rejectedBy || 'Authority'}.\nReason: "${rej.reason || student.rejectionReason || 'Not approved'}"\n--------------------------------------------------------------------------------`
    : '';

  return `GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY
(Approved by AICTE, New Delhi | Affiliated to Anna University, Chennai)
(An Autonomous Institution | Accredited by NAAC with 'A++' Grade)
GRT Mahalakshmi Nagar, Chennai-Tirupati Highway, Tiruttani - 631 209.
DEPARTMENT OF ${deptUpper}

Date: ${timeInfo}
Ref: GRTIET/${deptUpper}/GP/2026/${student.rollNo}

From:
${student.name || 'Student'} (Register No: ${student.rollNo}),
Father's Name: ${student.fatherName || student.parentName || '-'},
Parent's Phone: ${student.parentContact || '-'},
Department of ${student.dept || 'Engineering'}, ${student.academicYear || '3 Year'} (Section '${student.yearSec || 'A'}'),
Accommodation: ${accommodationType},
GRT Institute of Engineering and Technology, Tiruttani - 631 209.

Through:
(Through: Respective Class Counselor, Class Advisor, and Head of Department)

To:
The Principal,
GRT Institute of Engineering and Technology,
Tiruttani - 631 209.

Respected Sir / Madam,

Subject: Requisition for Authorized Campus Gate Pass / Outpass Permission - Regarding.

I am writing to request permission for a Gate Pass to leave the college campus due to the following reason:

"${String(rawReason).trim()}"
${scheduleDetailsText}
I have informed my parents and assure you that I will abide by all institutional rules and return to the campus on time. Kindly grant me permission.

Thanking You,

Yours faithfully,
(${student.name || 'Student'})
Roll No: ${student.rollNo}

${approvalBlock}${rejectionBlock}
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
