/**
 * On-Duty (OD) Student Portal Module
 * Handles On-Duty Requisition Submission & Personal Status Tracking
 * Approval Pipeline: Student -> Counsellor -> Class Advisor -> HOD -> Completed
 */

let currentStudentPortalTab = 'pass'; // 'pass' | 'onduty'
let currentODTimingMode = 'dates';    // 'dates' | 'time'

function switchStudentPortalTab(tabName) {
  currentStudentPortalTab = tabName;

  const btnPass = document.getElementById('stuTabBtn_pass');
  const btnOD = document.getElementById('stuTabBtn_onduty');
  const viewPass = document.getElementById('studentPassSection');
  const viewOD = document.getElementById('studentOnDutySection');
  const tablePass = document.getElementById('studentPersonalView');
  const tableOD = document.getElementById('studentOnDutyHistoryView');

  if (tabName === 'pass') {
    if (btnPass) {
      btnPass.className = 'px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-900/40 transition flex items-center gap-2 border border-red-500/50';
    }
    if (btnOD) {
      btnOD.className = 'px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white transition flex items-center gap-2 border border-slate-800';
    }
    if (viewPass) viewPass.classList.remove('hidden');
    if (viewOD) viewOD.classList.add('hidden');
    if (tablePass) tablePass.classList.remove('hidden');
    if (tableOD) tableOD.classList.add('hidden');

    if (typeof loadStudentPersonalStatus === 'function') {
      loadStudentPersonalStatus();
    }
  } else {
    if (btnPass) {
      btnPass.className = 'px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white transition flex items-center gap-2 border border-slate-800';
    }
    if (btnOD) {
      btnOD.className = 'px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-900/40 transition flex items-center gap-2 border border-indigo-500/50';
    }
    if (viewPass) viewPass.classList.add('hidden');
    if (viewOD) viewOD.classList.remove('hidden');
    if (tablePass) tablePass.classList.add('hidden');
    if (tableOD) tableOD.classList.remove('hidden');

    loadStudentOnDutyStatus();
  }
}

function setODTimingMode(mode) {
  currentODTimingMode = mode;
  const btnDates = document.getElementById('odModeBtn_dates');
  const btnTime = document.getElementById('odModeBtn_time');
  const dateRangeFields = document.getElementById('odDateRangeFields');
  const timeFields = document.getElementById('odTimeFields');

  if (mode === 'dates') {
    if (btnDates) {
      btnDates.className = 'flex-1 py-2 px-3 text-xs font-bold rounded-lg bg-indigo-600 text-white shadow-xs transition';
    }
    if (btnTime) {
      btnTime.className = 'flex-1 py-2 px-3 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition';
    }
    if (dateRangeFields) dateRangeFields.classList.remove('hidden');
    if (timeFields) timeFields.classList.add('hidden');
  } else {
    if (btnDates) {
      btnDates.className = 'flex-1 py-2 px-3 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition';
    }
    if (btnTime) {
      btnTime.className = 'flex-1 py-2 px-3 text-xs font-bold rounded-lg bg-indigo-600 text-white shadow-xs transition';
    }
    if (dateRangeFields) dateRangeFields.classList.add('hidden');
    if (timeFields) timeFields.classList.remove('hidden');
  }
}

/**
 * Submit Student On-Duty Requisition
 */
async function submitStudentOnDuty(rollNo) {
  const reason = document.getElementById('odReason')?.value?.trim();

  if (!reason) return showToast('Please state your reason for On-Duty.', 'warning');

  let body = {
    rollNo,
    mode: currentODTimingMode,
    reason
  };

  if (currentODTimingMode === 'dates') {
    const fromDate = document.getElementById('odFromDate')?.value;
    const toDate = document.getElementById('odToDate')?.value;
    if (!fromDate || !toDate) {
      return showToast('Please select both From Date and To Date.', 'warning');
    }
    if (fromDate > toDate) {
      return showToast('From Date cannot be later than To Date.', 'warning');
    }
    body.fromDate = fromDate;
    body.toDate = toDate;
  } else {
    const specificDate = document.getElementById('odSpecificDate')?.value;
    const fromTime = document.getElementById('odFromTime')?.value;
    const toTime = document.getElementById('odToTime')?.value;
    if (!specificDate) {
      return showToast('Please select the date for On-Duty.', 'warning');
    }
    if (!fromTime || !toTime) {
      return showToast('Please specify both From Time and To Time.', 'warning');
    }
    body.specificDate = specificDate;
    body.fromDate = specificDate;
    body.toDate = specificDate;
    body.fromTime = fromTime;
    body.toTime = toTime;
  }

  try {
    const data = await Api.post('/api/onduty/apply', body);
    if (data.success) {
      showToast(data.message || 'On-Duty requisition submitted successfully!', 'success');
      const reasonInput = document.getElementById('odReason');
      if (reasonInput) reasonInput.value = '';
      loadStudentOnDutyStatus();
    } else {
      showToast(data.message || 'Failed to submit On-Duty requisition.', 'error');
    }
  } catch (err) {
    showToast('Failed to submit On-Duty requisition.', 'error');
  }
}

/**
 * Load Personal On-Duty Applications & Live Approval Tracking
 */
async function loadStudentOnDutyStatus() {
  const tbody = document.getElementById('studentOnDutyBody');
  if (!tbody || !loggedUser) return;

  try {
    const requests = await Api.get(`/api/onduty?rollNo=${encodeURIComponent(loggedUser.userId)}`);

    if (!requests || requests.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="p-12 text-center bg-slate-900/60 border border-slate-800 space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-indigo-950 text-indigo-400 flex items-center justify-center mx-auto shadow-2xs border border-indigo-800">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="text-base font-bold text-white">No Active On-Duty Requests</div>
            <p class="text-xs md:text-sm text-slate-400 max-w-sm mx-auto">You currently have no On-Duty requisitions on record.</p>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = requests
      .map(od => {
        const isDates = od.mode !== 'time';
        let timingDisplay = '';
        if (isDates) {
          timingDisplay = `
            <div class="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
              <span>${escapeHtml(od.fromDate)} to ${escapeHtml(od.toDate)}</span>
            </div>
            <div class="text-[10px] text-slate-500 mt-0.5">Date Range On-Duty</div>
          `;
        } else {
          timingDisplay = `
            <div class="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
              <span>${escapeHtml(od.fromTime)} - ${escapeHtml(od.toTime)}</span>
            </div>
            <div class="text-[10px] text-slate-600 font-mono mt-0.5">On: ${escapeHtml(od.specificDate || od.fromDate || '-')}</div>
          `;
        }

        return `
          <tr class="hover:bg-slate-50 transition border-b border-slate-100">
            <td class="font-mono text-xs font-bold text-slate-700">
              ${od.appliedTime || new Date(od.createdAt).toLocaleString('en-IN')}
            </td>
            <td>
              ${timingDisplay}
              ${od.expectedReturnTime && od.expectedReturnTime !== '-' ? `<div class="text-[10px] text-slate-500 font-medium mt-1">Return: ${escapeHtml(od.expectedReturnTime)}</div>` : ''}
            </td>
            <td class="max-w-xs">
              ${od.placeEvent && od.placeEvent !== '-' ? `<div class="font-semibold text-indigo-950 text-xs mb-0.5"><span class="text-indigo-600 font-bold">Venue:</span> ${escapeHtml(od.placeEvent)}</div>` : ''}
              <div class="font-medium text-slate-700 text-xs leading-relaxed mb-1 line-clamp-2">
                "${escapeHtml(od.reason)}"
              </div>
              <div class="text-[10px] text-slate-500 font-mono">
                Counsellor: <span class="font-semibold text-slate-700">${escapeHtml(od.counselorName || '-')}</span>
              </div>
            </td>
            <td>
              <div class="flex flex-wrap gap-1.5">
                <!-- 1. Counselor -->
                <span class="px-2.5 py-1 rounded-md text-xs font-bold ${
                  od.counselorApproval?.approved
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : od.status === 'Rejected' && /counselor/i.test(od.rejection?.role || '')
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-slate-100 text-slate-500'
                }">
                  ${
                    od.counselorApproval?.approved
                      ? 'Counselor (' + (od.counselorApproval.counselorName || 'Endorsed') + ')'
                      : od.status === 'Rejected' && /counselor/i.test(od.rejection?.role || '')
                      ? 'Counselor (Rejected)'
                      : 'Counselor'
                  }
                </span>

                <!-- 2. Class Advisor -->
                <span class="px-2.5 py-1 rounded-md text-xs font-bold ${
                  od.advisorApproval?.approved
                    ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                    : od.status === 'Rejected' && /advisor/i.test(od.rejection?.role || '')
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : od.status === 'Rejected'
                    ? 'bg-slate-100 text-slate-400'
                    : 'bg-slate-100 text-slate-500'
                }">
                  ${
                    od.advisorApproval?.approved
                      ? 'Advisor (' + (od.advisorApproval.advisorName || 'Approved') + ')'
                      : od.status === 'Rejected' && /advisor/i.test(od.rejection?.role || '')
                      ? 'Advisor (Rejected)'
                      : od.status === 'Rejected'
                      ? 'Stopped'
                      : 'Advisor'
                  }
                </span>

                <!-- 3. HOD -->
                <span class="px-2.5 py-1 rounded-md text-xs font-bold ${
                  od.hodApproval?.approved
                    ? 'bg-purple-50 text-purple-800 border border-purple-200'
                    : od.status === 'Rejected' && /hod/i.test(od.rejection?.role || '')
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : od.status === 'Rejected'
                    ? 'bg-slate-100 text-slate-400'
                    : 'bg-slate-100 text-slate-500'
                }">
                  ${
                    od.hodApproval?.approved
                      ? 'HOD (' + (od.hodApproval.hodName || 'Authorized') + ')'
                      : od.status === 'Rejected' && /hod/i.test(od.rejection?.role || '')
                      ? 'HOD (Rejected)'
                      : od.status === 'Rejected'
                      ? 'Stopped'
                      : 'HOD'
                  }
                </span>
              </div>
            </td>
            <td>
              ${
                od.status === 'Completed' || od.status === 'Approved'
                  ? `<div class="space-y-1">
                      <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        COMPLETED
                      </span>
                      <div class="text-[10px] text-emerald-800 font-medium">Authorized by HOD</div>
                    </div>`
                  : od.status === 'Rejected'
                  ? `<div class="space-y-1">
                      <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
                        REJECTED
                      </span>
                      <div class="text-xs text-rose-800 font-medium">"${escapeHtml(od.rejection?.reason || 'Declined')}"</div>
                      <div class="text-[10px] text-slate-500">By: ${escapeHtml(od.rejection?.roleTitle || 'Authority')}</div>
                    </div>`
                  : `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      ${escapeHtml(od.status.toUpperCase())}
                    </span>`
              }
            </td>
            <td class="text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button onclick="viewOnDutyLetterById('${od._id}')" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 shadow-2xs" title="View Official On-Duty Letter">
                  <span>View Letter</span>
                </button>
                <button onclick="downloadOnDutyLetterById('${od._id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 shadow-2xs" title="Download Official OD Letter PDF">
                  <span>PDF</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-xs md:text-sm text-rose-500 font-semibold">Failed to load On-Duty requests.</td></tr>`;
  }
}

/**
 * Letter Modal & PDF Helpers for On-Duty
 */
let currentModalOD = null;

async function viewOnDutyLetterById(id) {
  try {
    const res = await fetch(`/api/onduty/${id}`);
    const data = await res.json();
    if (data.success && data.onDuty) {
      viewOnDutyLetter(data.onDuty);
    } else {
      showToast(data.message || 'Unable to fetch On-Duty details.', 'error');
    }
  } catch (err) {
    showToast('Failed to load On-Duty letter.', 'error');
  }
}

function viewOnDutyLetter(od) {
  currentModalOD = od;
  const contentEl = document.getElementById('letterModalContent');
  const btnEl = document.getElementById('modalDownloadLetterBtn');
  const modalEl = document.getElementById('letterModal');
  const subtitleEl = document.getElementById('letterModalSubtitle');

  if (subtitleEl) {
    subtitleEl.innerText = 'Tiruttani • Official On-Duty (OD) Requisition Letter';
  }

  const letterText = od.odLetter || formatOnDutyFallbackLetter(od);
  if (contentEl) contentEl.innerText = letterText;
  if (btnEl) {
    btnEl.innerHTML = `<span>Download Official OD Letter (PDF)</span>`;
    btnEl.onclick = () => downloadOnDutyLetterPDF(od);
  }
  if (modalEl) modalEl.classList.remove('hidden');
}

async function downloadOnDutyLetterById(id) {
  try {
    const res = await fetch(`/api/onduty/${id}`);
    const data = await res.json();
    if (data.success && data.onDuty) {
      if (typeof downloadOnDutyLetterPDF === 'function') {
        downloadOnDutyLetterPDF(data.onDuty);
      } else {
        showToast('PDF download service initializing...', 'info');
      }
    } else {
      showToast(data.message || 'Unable to download On-Duty letter.', 'error');
    }
  } catch (err) {
    showToast('Failed to download On-Duty letter.', 'error');
  }
}

function formatOnDutyFallbackLetter(od) {
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

Date: ${od.appliedTime || '-'}
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
1. Student Signature : ${od.name || 'Student'} (Date: ${od.appliedTime || '-'})
2. Class Counselor   : ${counselorStatus}
3. Class Advisor     : ${advisorStatus}
4. Head of Dept (HOD): ${hodStatus}`;
}

// Global exports
window.switchStudentPortalTab = switchStudentPortalTab;
window.setODTimingMode = setODTimingMode;
window.submitStudentOnDuty = submitStudentOnDuty;
window.loadStudentOnDutyStatus = loadStudentOnDutyStatus;
window.viewOnDutyLetter = viewOnDutyLetter;
window.viewOnDutyLetterById = viewOnDutyLetterById;
window.downloadOnDutyLetterById = downloadOnDutyLetterById;
