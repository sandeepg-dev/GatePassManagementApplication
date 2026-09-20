/**
 * Class Counselor Queue & Verification Module
 */

async function fetchCounselorQueue() {
  const el = document.getElementById('counselorQueue');
  if (!el || !loggedUser) return;

  try {
    const qUrl = `/api/passes?authorityUserId=${encodeURIComponent(loggedUser.userId || '')}&status=Pending Counselor&role=counselor&counselorName=${encodeURIComponent(
      loggedUser.name
    )}&startRoll=${encodeURIComponent(loggedUser.startRoll || '')}&endRoll=${encodeURIComponent(
      loggedUser.endRoll || ''
    )}`;
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
          <p class="text-xs md:text-sm text-slate-500 max-w-sm mx-auto">No student passes currently pending parent call verification in roll range ${loggedUser.startRoll || 'Start'} to ${loggedUser.endRoll || 'End'}.</p>
        </div>`;
      return;
    }

    el.innerHTML = `
      <table class="enterprise-table min-w-[850px]">
        <thead>
          <tr>
            <th class="w-10 text-center"><input type="checkbox" id="selectAllBatch" onchange="toggleSelectAllBatch(this)" class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" title="Select All"></th>
            <th>Student & Roll No</th>
            <th>Class & Accommodation</th>
            <th>Applied Timestamp</th>
            <th>Father & Parent Phone</th>
            <th>Reason & Document</th>
            <th>Phone Call Verification</th>
            <th class="text-right">Decision</th>
          </tr>
        </thead>
        <tbody>
          ${passes
            .map(
              p => `
            <tr class="pending-queue-row" data-accommodation="${escapeAttr((p.accommodation || '').toLowerCase())}" data-search="${escapeAttr(((p.name || '') + ' ' + (p.rollNo || '') + ' ' + (p.dept || '') + ' ' + (p.reason || '')).toLowerCase())}">
              <td class="text-center">
                <input type="checkbox" class="batch-select-cb w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" value="${p._id || p.id}" onchange="updateBatchActionBar()">
              </td>
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
                <div class="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                  <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  ${p.appliedTime || '-'}
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
                <label class="inline-flex items-center gap-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 transition">
                  <input type="checkbox" id="callCheck_${p._id}" class="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500">
                  <span class="text-xs font-bold text-slate-800 select-none">I talked to their parents</span>
                </label>
              </td>
              <td class="text-right">
                <div class="flex items-center justify-end gap-2">
                  <button onclick="downloadOfficialLetterOnlyPDF(${escapeAttr(p)})" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold rounded-xl shadow-2xs whitespace-nowrap transition active:scale-95 text-xs md:text-sm flex items-center gap-1.5" title="Download Official Gate Pass Letter">
                    <svg class="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <span>Download Letter</span>
                  </button>
                  <button onclick="openRejectModal('${p._id}', 'Counselor')" class="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-semibold rounded-xl shadow-2xs whitespace-nowrap transition active:scale-95 text-xs md:text-sm">
                    Reject
                  </button>
                  <button onclick="verifyCounselorPass('${p._id}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-2xs whitespace-nowrap transition active:scale-95 text-xs md:text-sm flex items-center gap-1.5">
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
    el.innerHTML = `<div class="p-8 text-center text-xs md:text-sm text-rose-500 font-semibold">Failed to load counselor queue.</div>`;
  }
}

async function verifyCounselorPass(passId) {
  const isChecked = document.getElementById(`callCheck_${passId}`)?.checked;
  if (!isChecked) {
    return showToast("Please check the 'I talked to their parents' box before confirming.", 'warning', 3500);
  }

  try {
    const data = await Api.post('/api/approve/counselor', {
      passId,
      parentCalled: true,
      counselorName: loggedUser.name
    });
    if (data && (data.success === false || data.error)) {
      showToast(data.message || data.error || 'Verification failed.', 'error', 3500);
      return;
    }
    showToast(data.message || 'Counselor verified successfully. Forwarded to Class Advisor.', 'success', 3000);
    refreshAllAuthorityViews();
  } catch (err) {
    showToast('Verification server error.', 'error', 3500);
  }
}

/**
 * On-Duty (OD) Counselor Queue & Verification
 */
async function fetchCounselorODQueue() {
  const el = document.getElementById('counselorODQueue');
  if (!el || !loggedUser) return;

  try {
    const qUrl = `/api/onduty?authorityUserId=${encodeURIComponent(loggedUser.userId || '')}&role=counselor&status=Pending Counselor&counselorName=${encodeURIComponent(
      loggedUser.name
    )}&startRoll=${encodeURIComponent(loggedUser.startRoll || '')}&endRoll=${encodeURIComponent(
      loggedUser.endRoll || ''
    )}`;
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
          <p class="text-xs md:text-sm text-slate-500 max-w-sm mx-auto">No student On-Duty requests pending your verification in roll range ${loggedUser.startRoll || 'Start'} to ${loggedUser.endRoll || 'End'}.</p>
        </div>`;
      return;
    }

    el.innerHTML = `
      <table class="enterprise-table min-w-[850px]">
        <thead>
          <tr>
            <th class="w-10 text-center"><input type="checkbox" onchange="toggleSelectAllBatch(this)" class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" title="Select All"></th>
            <th>Student & Roll No</th>
            <th>Class & Academic Year</th>
            <th>Applied (IST)</th>
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
                <tr class="pending-queue-row" data-accommodation="${escapeAttr((od.accommodation || '').toLowerCase())}" data-search="${escapeAttr(((od.name || '') + ' ' + (od.rollNo || '') + ' ' + (od.dept || '') + ' ' + (od.reason || '')).toLowerCase())}">
                  <td class="text-center">
                    <input type="checkbox" class="batch-select-cb w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" value="${od._id || od.id}" onchange="updateBatchActionBar()">
                  </td>
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
                    <div class="font-mono text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                      ${od.appliedTime || '-'}
                    </div>
                  </td>
                  <td>
                    <div class="text-xs bg-indigo-50/70 border border-indigo-100 p-2.5 rounded-xl space-y-1">
                      ${timingDisplay}
                      ${od.expectedReturnTime && od.expectedReturnTime !== '-' ? `<div class="text-[10px] text-slate-600 font-medium">Return: ${escapeHtml(od.expectedReturnTime)}</div>` : ''}
                    </div>
                  </td>
                  <td class="max-w-xs">
                    ${od.placeEvent && od.placeEvent !== '-' ? `<div class="font-semibold text-indigo-950 text-xs mb-0.5"><span class="text-indigo-600 font-bold">Venue:</span> ${escapeHtml(od.placeEvent)}</div>` : ''}
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
                      <button onclick="openRejectModal('${od._id}', 'Counselor', true)" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-semibold rounded-xl shadow-2xs whitespace-nowrap transition active:scale-95 text-xs">
                        Reject
                      </button>
                      <button onclick="verifyCounselorOD('${od._id}')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-2xs whitespace-nowrap transition active:scale-95 text-xs flex items-center gap-1">
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
    el.innerHTML = `<div class="p-8 text-center text-xs md:text-sm text-rose-500 font-semibold">Failed to load counselor On-Duty queue.</div>`;
  }
}

async function verifyCounselorOD(requestId) {
  try {
    const data = await Api.post('/api/onduty/approve/counselor', {
      requestId,
      counselorName: loggedUser.name
    });
    if (data && (data.success === false || data.error)) {
      showToast(data.message || data.error || 'Verification failed.', 'error', 3500);
      return;
    }
    showToast(data.message || 'On-Duty approved and forwarded to Class Advisor.', 'success', 3000);
    refreshAllAuthorityViews();
  } catch (err) {
    showToast('Server error while approving On-Duty.', 'error', 3500);
  }
}

window.fetchCounselorQueue = fetchCounselorQueue;
window.verifyCounselorPass = verifyCounselorPass;
window.fetchCounselorODQueue = fetchCounselorODQueue;
window.verifyCounselorOD = verifyCounselorOD;
