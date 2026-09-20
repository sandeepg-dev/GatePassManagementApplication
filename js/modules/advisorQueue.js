/**
 * Class Advisor Review & Endorsement Module
 */

async function fetchAdvisorQueue() {
  const el = document.getElementById('advisorQueue');
  if (!el || !loggedUser) return;

  try {
    const qUrl = `/api/passes?status=Pending Advisor&role=advisor&dept=${encodeURIComponent(
      loggedUser.dept
    )}&yearSec=${encodeURIComponent(loggedUser.yearSec)}`;
    const passes = await Api.get(qUrl);

    const countBadge = document.getElementById('authBadge_requests');
    if (countBadge) {
      countBadge.innerText = (passes || []).length;
      countBadge.className = (passes && passes.length > 0)
        ? 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse'
        : 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600';
    }
    const subBadgePasses = document.getElementById('subBadge_passes');
    if (subBadgePasses) {
      subBadgePasses.innerText = (passes || []).length;
    }
    const kpiPending = document.getElementById('kpi_pending');
    if (kpiPending) kpiPending.innerText = (passes || []).length;

    if (!passes || passes.length === 0) {
      el.innerHTML = `
        <div class="p-12 text-center bg-white space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto shadow-2xs">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="text-base font-bold text-slate-800">No Pending Leave Requests</div>
          <p class="text-xs md:text-sm text-slate-500 max-w-sm mx-auto">No requests pending Class Advisor review for ${loggedUser.dept} - Section ${loggedUser.yearSec}.</p>
        </div>`;
      return;
    }

    el.innerHTML = `
      <table class="enterprise-table min-w-[850px]">
        <thead>
          <tr>
            <th>Student & Roll No</th>
            <th>Class & Accommodation</th>
            <th>Audit Timeline (IST)</th>
            <th>Father & Parent Phone</th>
            <th>Reason & Document</th>
            <th>Counselor Verification</th>
            <th class="text-right">Decision</th>
          </tr>
        </thead>
        <tbody>
          ${passes
            .map(
              p => `
            <tr>
              <td>
                <div class="font-bold text-slate-900 text-sm">${escapeHtml(p.name)}</div>
                <div class="font-mono text-xs font-bold text-red-700 bg-red-50/80 border border-red-200/60 inline-block px-2 py-0.5 rounded-md mt-0.5">${p.rollNo}</div>
              </td>
              <td>
                <div class="font-semibold text-slate-800 text-xs md:text-sm">${formatClassSection(p.dept, p.yearSec, p.academicYear)}</div>
                <div class="mt-1">
                  ${formatAccommodationBadge(p.accommodation)}
                </div>
              </td>
              <td>
                <div class="font-mono text-xs text-slate-700 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <div><span class="text-slate-500 font-sans">1. Applied:</span> ${p.appliedTime || '-'}</div>
                  <div class="text-emerald-800 font-semibold"><span class="text-emerald-600 font-sans">2. Counselor:</span> ${p.parentCallTime || '-'}</div>
                </div>
              </td>
              <td>
                <div class="text-xs text-slate-600 font-medium mb-1">Father: <span class="font-bold text-slate-900">${escapeHtml(p.fatherName || p.parentName || '-')}</span></div>
                <a href="tel:${p.parentContact}" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition active:scale-95">
                  <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  ${p.parentContact || 'N/A'}
                </a>
              </td>
              <td class="max-w-xs">
                ${typeof renderPassScheduleInfo === 'function' ? renderPassScheduleInfo(p) : ''}
                <div class="font-medium text-slate-800 text-xs md:text-sm leading-relaxed mb-1.5 line-clamp-2">"${escapeHtml(p.reason)}"</div>
                <button onclick="viewFormalLetter(${escapeAttr(p)})" class="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition active:scale-95">
                  View Letter
                </button>
              </td>
              <td>
                <div class="space-y-1.5">
                  <span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300/80 px-2.5 py-1 rounded-md">
                    <span>Parent Call Confirmed</span>
                  </span>
                  <div class="text-[11px] text-slate-500">By: ${escapeHtml(p.counselorApproval?.counselorName || p.counselorName || 'Counselor')}</div>
                </div>
              </td>
              <td class="text-right">
                <div class="flex items-center justify-end gap-2">
                  <button onclick="downloadOfficialLetterOnlyPDF(${escapeAttr(p)})" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold rounded-xl shadow-2xs whitespace-nowrap transition active:scale-95 text-xs md:text-sm flex items-center gap-1.5" title="Download Official Gate Pass Letter">
                    <svg class="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <span>Download Letter</span>
                  </button>
                  <button onclick="openRejectModal('${p._id}', 'Class Advisor')" class="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-semibold rounded-xl shadow-2xs whitespace-nowrap transition active:scale-95 text-xs md:text-sm">
                    Reject
                  </button>
                  <button onclick="approveAdvisorPass('${p._id}', true)" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-2xs whitespace-nowrap transition active:scale-95 text-xs md:text-sm flex items-center gap-1.5">
                    <span>Approve</span>
                  </button>
                </div>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    el.innerHTML = `<div class="p-8 text-center text-xs md:text-sm text-rose-500 font-semibold">Failed to load advisor queue.</div>`;
  }
}

async function approveAdvisorPass(passId, wasVerified) {
  let fallback = false;
  if (!wasVerified) {
    fallback = document.getElementById(`advisorCallFallback_${passId}`)?.checked;
    if (!fallback) return showToast("You must check 'I talked to their parents' before forwarding to HOD!", 'warning', 3500);
  }

  try {
    const data = await Api.post('/api/approve/advisor', {
      passId,
      advisorName: loggedUser.name,
      parentCalledFallback: fallback
    });
    if (data && (data.success === false || data.error)) {
      showToast(data.message || data.error || 'Advisor approval failed.', 'error', 3500);
      return;
    }
    showToast(data.message || 'Class Advisor approved successfully. Forwarded to HOD.', 'success', 3000);
    refreshAllAuthorityViews();
  } catch (err) {
    showToast('Advisor approval server error.', 'error', 3500);
  }
}

/**
 * On-Duty (OD) Class Advisor Queue & Endorsement
 */
async function fetchAdvisorODQueue() {
  const el = document.getElementById('advisorODQueue');
  if (!el || !loggedUser) return;

  try {
    const qUrl = `/api/onduty?status=Pending Advisor&dept=${encodeURIComponent(
      loggedUser.dept
    )}&yearSec=${encodeURIComponent(loggedUser.yearSec)}`;
    const odRequests = await Api.get(qUrl);

    const odBadge = document.getElementById('subBadge_onduty');
    if (odBadge) {
      odBadge.innerText = (odRequests || []).length;
      odBadge.className = (odRequests && odRequests.length > 0)
        ? 'px-2 py-0.5 rounded-full text-[11px] bg-indigo-600 text-white font-extrabold animate-pulse'
        : 'px-2 py-0.5 rounded-full text-[11px] bg-indigo-100 text-indigo-700 font-extrabold';
    }

    if (!odRequests || odRequests.length === 0) {
      el.innerHTML = `
        <div class="p-12 text-center bg-white space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto shadow-2xs">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div class="text-base font-bold text-slate-800">No Pending On-Duty Requests</div>
          <p class="text-xs md:text-sm text-slate-500 max-w-sm mx-auto">No On-Duty requests pending Class Advisor endorsement for ${loggedUser.dept} - Section ${loggedUser.yearSec}.</p>
        </div>`;
      return;
    }

    el.innerHTML = `
      <table class="enterprise-table min-w-[850px]">
        <thead>
          <tr>
            <th>Student & Roll No</th>
            <th>Class & Academic Year</th>
            <th>Counsellor Clearance</th>
            <th>Duration / Timing</th>
            <th>Reason for On-Duty</th>
            <th class="text-right">Decision</th>
          </tr>
        </thead>
        <tbody>
          ${odRequests
            .map(od => {
              const timingDisplay = od.mode === 'time'
                ? `<div><span class="font-bold text-indigo-800">Date:</span> ${od.specificDate || od.fromDate}</div><div class="text-slate-600 font-mono text-[11px] mt-0.5">${od.fromTime || ''} - ${od.toTime || ''}</div>`
                : `<div><span class="font-bold text-indigo-800">From:</span> ${od.fromDate}</div><div><span class="font-bold text-indigo-800">To:</span> ${od.toDate}</div>`;

              return `
                <tr>
                  <td>
                    <div class="font-bold text-slate-900 text-sm">${escapeHtml(od.name)}</div>
                    <div class="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 inline-block px-2 py-0.5 rounded-md mt-0.5">${od.rollNo}</div>
                    <div class="text-xs text-slate-600 mt-1">
                      <div>Father: <span class="font-bold text-slate-900">${escapeHtml(od.fatherName || od.parentName || '-')}</span></div>
                      <div>Parent: <a href="tel:${od.parentContact}" class="text-emerald-700 font-semibold hover:underline">${od.parentContact || '-'}</a></div>
                    </div>
                  </td>
                  <td>
                    <div class="font-semibold text-slate-800 text-xs md:text-sm">${od.dept} - Sec ${od.yearSec}</div>
                    <div class="text-[11px] text-slate-500 font-bold mt-0.5">${od.academicYear || '3 Year'}</div>
                  </td>
                  <td>
                    <div class="font-mono text-xs space-y-1 bg-emerald-50/70 border border-emerald-200 p-2 rounded-xl text-emerald-900">
                      <div><span class="font-bold text-emerald-800">Approved:</span> ${escapeHtml(od.counselorApproval?.counselorName || 'Counsellor')}</div>
                      <div class="text-[11px] text-slate-600">${od.counselorApproval?.time || '-'}</div>
                    </div>
                  </td>
                  <td>
                    <div class="text-xs bg-indigo-50/70 border border-indigo-100 p-2.5 rounded-xl space-y-1">
                      ${timingDisplay}
                      <div class="text-[10px] text-slate-600 font-medium">Return: ${escapeHtml(od.expectedReturnTime || '-')}</div>
                    </div>
                  </td>
                  <td class="max-w-xs">
                    <div class="font-semibold text-indigo-950 text-xs mb-0.5"><span class="text-indigo-600 font-bold">Venue:</span> ${escapeHtml(od.placeEvent || od.event || 'College Assignment')}</div>
                    <div class="font-medium text-slate-800 text-xs md:text-sm leading-relaxed">${escapeHtml(od.reason)}</div>
                  </td>
                  <td class="text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <button onclick="viewOnDutyLetterById('${od._id}')" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold rounded-xl shadow-2xs whitespace-nowrap transition active:scale-95 text-xs flex items-center gap-1" title="View Official OD Letter">
                        <span>Letter</span>
                      </button>
                      <button onclick="downloadOnDutyLetterById('${od._id}')" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-2xs whitespace-nowrap transition active:scale-95 text-xs flex items-center gap-1" title="Download Official OD Letter PDF">
                        <span>PDF</span>
                      </button>
                      <button onclick="openRejectModal('${od._id}', 'Class Advisor', true)" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-semibold rounded-xl shadow-2xs whitespace-nowrap transition active:scale-95 text-xs">
                        Reject
                      </button>
                      <button onclick="approveAdvisorOD('${od._id}')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-2xs whitespace-nowrap transition active:scale-95 text-xs flex items-center gap-1">
                        <span>Approve</span>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    el.innerHTML = `<div class="p-8 text-center text-xs md:text-sm text-rose-500 font-semibold">Failed to load advisor On-Duty queue.</div>`;
  }
}

async function approveAdvisorOD(requestId) {
  try {
    const data = await Api.post('/api/onduty/approve/advisor', {
      requestId,
      advisorName: loggedUser.name
    });
    if (data && (data.success === false || data.error)) {
      showToast(data.message || data.error || 'Advisor endorsement failed.', 'error', 3500);
      return;
    }
    showToast(data.message || 'On-Duty endorsed and forwarded to Department HOD.', 'success', 3000);
    refreshAllAuthorityViews();
  } catch (err) {
    showToast('Server error while endorsing On-Duty.', 'error', 3500);
  }
}

window.fetchAdvisorQueue = fetchAdvisorQueue;
window.approveAdvisorPass = approveAdvisorPass;
window.fetchAdvisorODQueue = fetchAdvisorODQueue;
window.approveAdvisorOD = approveAdvisorOD;
