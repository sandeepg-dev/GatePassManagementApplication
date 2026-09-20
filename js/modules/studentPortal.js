/**
 * Student Portal Module: Requisition Submission & Personal Status
 */

async function submitStudentPass(rollNo) {
  const reason = document.getElementById('passReason')?.value.trim();
  if (!reason) return showToast('Please enter your outpass reason.', 'warning');

  const payload = { rollNo, reason };

  const depDateEl = document.getElementById('departureDate');
  const depTimeEl = document.getElementById('departureTime');
  const retDateEl = document.getElementById('expectedReturnDate');
  const retTimeEl = document.getElementById('expectedReturnTime');

  const dayScholarDateEl = document.getElementById('dayScholarDate');
  const dayScholarTimeEl = document.getElementById('dayScholarTime');

  if (dayScholarDateEl || dayScholarTimeEl) {
    const dsDate = dayScholarDateEl?.value || '';
    const dsTime = dayScholarTimeEl?.value || '';

    if (!dsDate) return showToast('Please select Date.', 'warning');
    if (!dsTime) return showToast('Please select the required time.', 'warning');

    payload.leaveDate = dsDate;
    payload.leaveTime = dsTime;
    payload.departureDate = dsDate;
    payload.departureTime = dsTime;
  } else if (depDateEl || depTimeEl || retDateEl || retTimeEl) {
    const departureDate = depDateEl?.value || '';
    const departureTime = depTimeEl?.value || '';
    const expectedReturnDate = retDateEl?.value || '';
    const expectedReturnTime = retTimeEl?.value || '';

    if (!departureDate) return showToast('Please select Departure Date.', 'warning');
    if (!departureTime) return showToast('Please select Departure Time.', 'warning');
    if (!expectedReturnDate) return showToast('Please select Expected Return Date.', 'warning');
    if (!expectedReturnTime) return showToast('Please select Expected Return Time.', 'warning');

    payload.departureDate = departureDate;
    payload.departureTime = departureTime;
    payload.expectedReturnDate = expectedReturnDate;
    payload.expectedReturnTime = expectedReturnTime;
    payload.expectedReturnDateTime = `${expectedReturnDate} ${expectedReturnTime}`;
  }

  try {
    const data = await Api.post('/api/apply-pass', payload);
    if (data.success) {
      showToast(data.message || 'Leave application submitted successfully!', 'success');
      const passReasonInput = document.getElementById('passReason');
      if (passReasonInput) passReasonInput.value = '';
      if (dayScholarTimeEl) dayScholarTimeEl.value = '';
      if (depDateEl) depDateEl.value = '';
      if (depTimeEl) depTimeEl.value = '';
      if (retDateEl) retDateEl.value = '';
      if (retTimeEl) retTimeEl.value = '';
      loadStudentPersonalStatus();
    } else {
      showToast(data.message || data.error || 'Failed to submit outpass requisition.', 'error');
    }
  } catch (err) {
    showToast('Failed to submit outpass requisition.', 'error');
  }
}

function isPassFullyApproved(p) {
  if (!p || p.status === 'Rejected') return false;
  if (p.status === 'Approved' || p.status === 'Completed' || p.status === 'Exited' || p.exitStatus === 'Exited Campus' || p.exitStatus === 'Returned to College') {
    return true;
  }
  const isHostel = (/hoste?l|^h$/i.test(p.accommodation || '') && !/day/i.test(p.accommodation || ''));
  if (isHostel) {
    const cOk = p.counselorApproval?.approved === true || !!p.counselorApproval?.time;
    const aOk = p.advisorApproval?.approved === true || !!p.advisorApproval?.time;
    const hOk = p.hodApproval?.approved === true || !!p.hodApproval?.time;
    const pOk = p.principalApproval?.approved === true || !!p.principalApproval?.time;
    const wOk = p.wardenApproval?.approved === true || !!p.wardenApproval?.time;
    return (cOk && aOk && hOk && pOk && wOk);
  } else {
    const cOk = p.counselorApproval?.approved === true || !!p.counselorApproval?.time;
    const aOk = p.advisorApproval?.approved === true || !!p.advisorApproval?.time;
    const hOk = p.hodApproval?.approved === true || !!p.hodApproval?.time;
    const pOk = p.principalApproval?.approved === true || !!p.principalApproval?.time;
    return (cOk && aOk && hOk && pOk);
  }
}

async function loadStudentPersonalStatus() {
  const tbody = document.getElementById('studentPersonalBody');
  const cardContainer = document.getElementById('studentApprovedPassCardContainer');
  if (!tbody || !loggedUser) return;

  // Do not display the Gate Pass directly on the Student Dashboard.
  if (cardContainer) cardContainer.innerHTML = '';

  try {
    const passes = await Api.get(`/api/passes?rollNo=${encodeURIComponent(loggedUser.userId)}`);

    if (!passes || passes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-12 text-center bg-white space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto shadow-2xs">
              <svg class="w-6 h-6 fill-current" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>
            </div>
            <div class="text-base font-bold text-slate-800">No Active Leave Applications</div>
            <p class="text-xs md:text-sm text-slate-500 max-w-sm mx-auto">You currently have no active pass requisitions on record.</p>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = passes
      .map(
        p => {
          const isApproved = isPassFullyApproved(p);
          return `
      <tr>
        <td class="font-mono text-xs md:text-sm font-bold text-slate-700">
          ${p.appliedTime || new Date(p.createdAt).toLocaleString('en-IN')}
        </td>
        <td class="max-w-xs">
          <div class="flex items-center gap-1.5 mb-1.5">
            <span class="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-800 font-bold text-xs rounded">${p.academicYear || 'III Year'}</span>
            ${formatAccommodationBadge(p.accommodation)}
          </div>
          <div class="text-xs text-slate-600 mb-1.5">
            Father: <span class="font-bold text-slate-800">${escapeHtml(p.fatherName || p.parentName || '-')}</span> | Parent: <span class="font-mono font-semibold">${p.parentContact || '-'}</span>
          </div>
          ${typeof renderPassScheduleInfo === 'function' ? renderPassScheduleInfo(p) : ''}
          <div class="font-medium text-slate-800 text-xs md:text-sm leading-relaxed mb-1.5 line-clamp-2">"${escapeHtml(p.reason)}"</div>
          ${
            isApproved
              ? `<button onclick="viewFormalLetter(${escapeAttr(p)})" class="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition active:scale-95">
                  View Pass Letter
                </button>`
              : `<span class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 italic">
                  <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  Gate Pass hidden until all approvals are completed
                </span>`
          }
        </td>
        <td>
          <div class="flex flex-wrap gap-1.5">
            <span class="px-2.5 py-1 rounded-md text-xs font-bold ${p.counselorApproval?.approved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : p.status === 'Rejected' && /counselor/i.test(p.rejectedBy || '') ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-500'}">
              ${p.counselorApproval?.approved ? 'Counselor: ' + (p.counselorApproval.counselorName || 'Verified') : p.status === 'Rejected' && /counselor/i.test(p.rejectedBy || '') ? 'Counselor (Rejected)' : 'Counselor (Pending)'}
            </span>
            <span class="px-2.5 py-1 rounded-md text-xs font-bold ${p.advisorApproval?.approved ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : p.status === 'Rejected' && /advisor/i.test(p.rejectedBy || '') ? 'bg-rose-50 text-rose-800 border border-rose-200' : p.status === 'Rejected' ? 'Stopped' : 'Advisor (Pending)'}">
              ${p.advisorApproval?.approved ? 'Advisor: ' + (p.advisorApproval.advisorName || 'Approved') : p.status === 'Rejected' && /advisor/i.test(p.rejectedBy || '') ? 'Advisor (Rejected)' : p.status === 'Rejected' ? 'Stopped' : 'Advisor (Pending)'}
            </span>
            <span class="px-2.5 py-1 rounded-md text-xs font-bold ${p.hodApproval?.approved ? 'bg-purple-50 text-purple-800 border border-purple-200' : p.status === 'Rejected' && /hod/i.test(p.rejectedBy || '') ? 'bg-rose-50 text-rose-800 border border-rose-200' : p.status === 'Rejected' ? 'Stopped' : 'HOD (Pending)'}">
              ${p.hodApproval?.approved ? 'HOD: ' + (p.hodApproval.hodName || 'Authorized') : p.status === 'Rejected' && /hod/i.test(p.rejectedBy || '') ? 'HOD (Rejected)' : p.status === 'Rejected' ? 'Stopped' : 'HOD (Pending)'}
            </span>
            <span class="px-2.5 py-1 rounded-md text-xs font-bold ${p.principalApproval?.approved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : p.status === 'Rejected' && /principal/i.test(p.rejectedBy || '') ? 'bg-rose-50 text-rose-800 border border-rose-200' : p.status === 'Rejected' ? 'Stopped' : 'Principal (Pending)'}">
              ${p.principalApproval?.approved ? 'Principal (Approved)' : p.status === 'Rejected' && /principal/i.test(p.rejectedBy || '') ? 'Principal (Rejected)' : p.status === 'Rejected' ? 'Stopped' : 'Principal (Pending)'}
            </span>
            ${
              (/hoste?l|^h$/i.test(p.accommodation || '') && !/day/i.test(p.accommodation || '')) || p.wardenApproval?.approved || /warden/i.test(p.status) || /warden/i.test(p.rejectedBy || '')
                ? `<span class="px-2.5 py-1 rounded-md text-xs font-bold ${
                    p.wardenApproval?.approved
                      ? 'bg-pink-50 text-pink-800 border border-pink-200'
                      : p.status === 'Rejected' && /warden/i.test(p.rejectedBy || '')
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-slate-100 text-slate-500'
                  }">
                    ${p.wardenApproval?.approved ? 'Warden (Approved)' : p.status === 'Rejected' && /warden/i.test(p.rejectedBy || '') ? 'Warden (Rejected)' : p.status === 'Rejected' ? 'Stopped' : 'Warden (Pending)'}
                  </span>`
                : ''
            }
          </div>
        </td>
        <td>
          ${
            p.status === 'Rejected'
              ? `<div class="space-y-1">
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
                    REJECTED
                  </span>
                  <div class="text-xs text-rose-800 font-medium">"${escapeHtml(p.rejectionReason || 'No reason specified')}"</div>
                  <div class="text-xs text-slate-500">By: ${escapeHtml(p.rejectedBy || 'Authority')}</div>
                 </div>`
              : p.status === 'Returned' || p.exitStatus === 'Returned to College'
              ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-900 border border-sky-300">
                  PASS COMPLETED
                </span>`
              : p.status === 'Exited' || p.exitStatus === 'Exited Campus'
              ? `<div class="space-y-1">
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    CAMPUS EXITED
                  </span>
                </div>`
              : p.status === 'Approved'
              ? `<div class="space-y-1">
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    APPROVED
                  </span>
                  <div class="text-xs font-mono font-bold text-emerald-700">${formatRemainingTime(p.expiresAt)}</div>
                 </div>`
              : p.status === 'Expired'
              ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  EXPIRED
                </span>`
              : `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  ${escapeHtml(p.status.toUpperCase())}
                 </span>`
          }
        </td>
        <td>
          ${
            p.status === 'Rejected'
              ? `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  NOT AUTHORIZED
                 </span>`
              : p.status === 'Returned' || p.exitStatus === 'Returned to College'
              ? `<div class="space-y-1.5 p-2.5 bg-sky-50/90 rounded-xl border border-sky-200/80 min-w-[190px]">
                  <div class="flex items-center gap-1.5">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black bg-sky-700 text-white shadow-2xs">
                      RETURNED TO CAMPUS
                    </span>
                  </div>
                  <div class="text-xs font-mono text-slate-700">
                    <span class="font-bold text-slate-900">Scanned Exit:</span> ${escapeHtml(p.exitTime && p.exitTime !== '-' ? p.exitTime : '-')}
                  </div>
                  <div class="text-xs font-mono text-sky-900 font-bold">
                    <span class="font-bold text-sky-950">Scanned Return:</span> ${escapeHtml(p.returnTime && p.returnTime !== '-' ? p.returnTime : '-')}
                  </div>
                </div>`
              : p.status === 'Exited' || p.exitStatus === 'Exited Campus'
              ? `<div class="space-y-1.5 p-2.5 bg-emerald-50/90 rounded-xl border border-emerald-200/80 min-w-[190px]">
                  <div class="flex items-center gap-1.5">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-700 text-white shadow-2xs">
                      EXITED CAMPUS
                    </span>
                  </div>
                  <div class="text-xs font-mono text-emerald-900 font-bold">
                    <span class="font-bold text-emerald-950">Scanned Exit:</span> ${escapeHtml(p.exitTime || '-')}
                  </div>
                  <div class="text-[11px] text-amber-700 font-medium italic flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Pending Return Scan at Gate</span>
                  </div>
                </div>`
              : p.status === 'Approved'
              ? `<div class="space-y-1 p-2 bg-emerald-50/60 rounded-xl border border-emerald-200/60 min-w-[180px]">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    GATE PASS READY
                  </span>
                  <div class="text-[11px] text-slate-600 font-medium">
                    ${(/hoste?l|^h$/i.test(p.accommodation || '') && !/day/i.test(p.accommodation || '')) ? 'Ready for Hosteller Gate Exit Scan' : 'Approved (Day Scholar)'}
                  </div>
                </div>`
              : `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  PENDING CLEARANCE
                 </span>`
          }
        </td>
        <td class="text-right">
          ${
            isApproved
              ? `<div class="flex items-center justify-end gap-2">
                  <button onclick="downloadGatePassCardPDF(${escapeAttr(p)})" class="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5 active:scale-95 text-xs" title="Download Official Gate Pass Card (PDF)">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                    <span>Download Gate Pass</span>
                  </button>
                  <button onclick="downloadOfficialLetterOnlyPDF(${escapeAttr(p)})" class="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5 active:scale-95 text-xs" title="Download Formal College Letter (PDF)">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <span>Download Letter</span>
                  </button>
                </div>`
              : `<div class="flex items-center justify-end gap-2">
                  <button onclick="downloadOfficialLetterOnlyPDF(${escapeAttr(p)})" class="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5 active:scale-95 text-xs" title="Download Formal College Letter (PDF)">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <span>Download Letter</span>
                  </button>
                  <span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold border border-slate-200/80 cursor-not-allowed" title="Gate pass card will be available after all authorities approve">
                    <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    <span>Pass Pending</span>
                  </span>
                </div>`
          }
        </td>
      </tr>
    `;
        }
      )
      .join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-xs md:text-sm text-rose-500 font-semibold">Failed to load personal passes.</td></tr>`;
  }
}

window.isPassFullyApproved = isPassFullyApproved;
window.loadStudentPersonalStatus = loadStudentPersonalStatus;


