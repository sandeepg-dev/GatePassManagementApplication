/**
 * Principal Directorate Final Clearance Module
 */

async function fetchPrincipalQueue() {
  const el = document.getElementById('principalQueue');
  if (!el) return;

  try {
    const uid = encodeURIComponent(window.loggedUser?.userId || '');
    const passes = await Api.get(`/api/passes?authorityUserId=${uid}&status=Pending%20Principal&role=principal`);

    const countBadge = document.getElementById('authBadge_requests');
    if (countBadge) {
      countBadge.innerText = (passes || []).length;
      countBadge.className = (passes && passes.length > 0)
        ? 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse'
        : 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600';
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
          <p class="text-xs md:text-sm text-slate-500 max-w-sm mx-auto">No student leave requisitions currently pending Principal clearance across any department.</p>
        </div>`;
      return;
    }

    el.innerHTML = `
      <table class="enterprise-table min-w-[900px]">
        <thead>
          <tr>
            <th class="w-10 text-center"><input type="checkbox" id="selectAllBatch" onchange="toggleSelectAllBatch(this)" class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" title="Select All"></th>
            <th>Student & Roll No</th>
            <th>Class & Accommodation</th>
            <th>Multi-Tier Audit Chain (IST)</th>
            <th>Reason & Document</th>
            <th>Verification Chain</th>
            <th class="text-right">Directorate Decision</th>
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
                <div class="text-xs text-slate-600 mt-1">
                  <div>Father: <span class="font-bold text-slate-900">${escapeHtml(p.fatherName || p.parentName || '-')}</span></div>
                  <div>Parent: <a href="tel:${p.parentContact}" class="text-emerald-700 font-semibold hover:underline">${p.parentContact || '-'}</a></div>
                </div>
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
                  <div class="text-emerald-800 font-semibold"><span class="text-emerald-600 font-sans">2. Counselor:</span> ${p.counselorApproval?.time || p.parentCallTime || '-'}</div>
                  <div class="text-indigo-800 font-semibold"><span class="text-indigo-600 font-sans">3. Advisor:</span> ${p.advisorApproval?.time || '-'}</div>
                  <div class="text-purple-800 font-semibold"><span class="text-purple-600 font-sans">4. HOD:</span> ${p.hodApproval?.time || '-'}</div>
                </div>
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
                  <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    ${p.parentCalledBy || 'Parents Contacted'}
                  </span><br>
                  <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                    Advisor & HOD Endorsed
                  </span>
                </div>
              </td>
              <td class="text-right">
                <div class="flex items-center justify-end gap-2">
                  <button onclick="downloadOfficialLetterOnlyPDF(${escapeAttr(p)})" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold rounded-xl shadow-2xs whitespace-nowrap transition active:scale-95 text-xs md:text-sm flex items-center gap-1.5" title="Download Official Gate Pass Letter">
                    <svg class="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <span>Download Letter</span>
                  </button>
                  <button onclick="openRejectModal('${p._id}', 'Principal')" class="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-semibold rounded-xl shadow-2xs whitespace-nowrap transition active:scale-95 text-xs md:text-sm">
                    Reject
                  </button>
                  ${
                    (/hoste?l|^h$/i.test(p.accommodation || '') && !/day/i.test(p.accommodation || ''))
                      ? `<button onclick="approveGenericPass('${p._id}', '/api/approve/principal')" class="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-xl shadow-2xs transition active:scale-95 whitespace-nowrap text-xs md:text-sm flex items-center gap-1.5">
                          <span>Forward to ${p.gender === 'Female' ? 'Girls Warden' : 'Boys Warden'}</span>
                        </button>`
                      : `<button onclick="approveGenericPass('${p._id}', '/api/approve/principal')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-2xs transition active:scale-95 whitespace-nowrap text-xs md:text-sm flex items-center gap-1.5">
                          <span>Final Clearance (20-Min Pass)</span>
                        </button>`
                  }
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
    el.innerHTML = `<div class="p-8 text-center text-xs md:text-sm text-rose-500 font-semibold">Failed to load Principal queue.</div>`;
  }
}

async function approveGenericPass(passId, endpoint) {
  try {
    const data = await Api.post(endpoint, { passId });
    if (data && (data.success === false || data.error)) {
      showToast(data.message || data.error || 'Clearance could not be completed.', 'error', 3500);
      return;
    }
    showToast(data.message || 'Principal approval granted successfully.', 'success', 3000);
    refreshAllAuthorityViews();
  } catch (err) {
    showToast('Principal clearance server error.', 'error', 3500);
  }
}
