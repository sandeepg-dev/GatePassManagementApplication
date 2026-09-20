/**
 * Universal Authority 4-Section Architecture & Audit Logs Module
 * 1. Student Leave Requests / Leave Requests (Active Queue)
 * 2. Approved (Endorsed by this authority)
 * 3. Rejected (Declined by this authority)
 * 4. All Records (Complete audit trail in authority jurisdiction)
 */

let currentAuthorityTab = 'requests'; // 'requests' | 'approved' | 'rejected' | 'all'
let cachedAllRecords = [];
let cachedApprovedRecords = [];
let cachedRejectedRecords = [];
let currentModalPass = null;

function switchAuthorityTab(tabName) {
  // For extended dashboards (Counselor/Advisor/HOD), delegate to the extended switcher
  if (typeof switchExtendedAuthorityTab === 'function' &&
      document.getElementById('extTab_btn_requests')) {
    switchExtendedAuthorityTab(tabName);
    return;
  }

  currentAuthorityTab = tabName;
  const tabs = ['requests', 'approved', 'rejected', 'all'];

  tabs.forEach(t => {
    const secEl = document.getElementById(`authSec_${t}`);
    const cardEl = document.getElementById(`kpiCard_${t}`);

    if (secEl) {
      if (t === tabName) secEl.classList.remove('hidden');
      else secEl.classList.add('hidden');
    }

    if (cardEl) {
      if (t === tabName) cardEl.classList.add('active-kpi-card');
      else cardEl.classList.remove('active-kpi-card');
    }
  });
}

/**
 * Loads and filters passes into Approved, Rejected, and All Records sections
 * and updates live badge counts for the current authority
 */
async function loadUniversalLogs() {
  if (!loggedUser) return;

  try {
    let logUrl = '/api/passes?';
    let odUrl = '/api/onduty?';

    if (loggedUser.role === 'principal') {
      logUrl += 'role=principal';
      odUrl += 'role=principal';
    } else if (loggedUser.role === 'hod') {
      logUrl += `role=hod&dept=${encodeURIComponent(loggedUser.dept)}`;
      odUrl += `role=hod&dept=${encodeURIComponent(loggedUser.dept)}`;
    } else if (loggedUser.role === 'advisor') {
      logUrl += `role=advisor&dept=${encodeURIComponent(loggedUser.dept)}&yearSec=${encodeURIComponent(loggedUser.yearSec)}`;
      odUrl += `role=advisor&dept=${encodeURIComponent(loggedUser.dept)}&yearSec=${encodeURIComponent(loggedUser.yearSec)}`;
    } else if (loggedUser.role === 'counselor') {
      const counselorParams = `role=counselor&counselorName=${encodeURIComponent(loggedUser.name)}&startRoll=${encodeURIComponent(
        loggedUser.startRoll || ''
      )}&endRoll=${encodeURIComponent(loggedUser.endRoll || '')}`;
      logUrl += counselorParams;
      odUrl += counselorParams;
    } else if (loggedUser.role === 'boys_warden') {
      logUrl += 'role=boys_warden';
    } else if (loggedUser.role === 'girls_warden') {
      logUrl += 'role=girls_warden';
    }

    let passes = await Api.get(logUrl);
    passes = Array.isArray(passes) ? passes : [];

    let odPasses = [];
    if (['counselor', 'advisor', 'hod'].includes(loggedUser.role)) {
      try {
        const odData = await Api.get(odUrl);
        odPasses = (Array.isArray(odData) ? odData : []).map(o => ({ ...o, isOD: true }));
      } catch (err) {
        console.warn('Failed to load OD records for audit logs:', err);
      }
    }

    // Filter jurisdiction-specific visibility
    if (loggedUser.role === 'advisor') {
      passes = passes.filter(p => {
        const reached = p.counselorApproval?.approved === true || p.status === 'Pending Advisor';
        if (!reached) return false;
        if (p.status === 'Rejected' && !p.counselorApproval?.approved) return false;
        return true;
      });
    } else if (loggedUser.role === 'hod') {
      passes = passes.filter(p => {
        const reached = p.advisorApproval?.approved === true || p.status === 'Pending HOD';
        if (!reached) return false;
        if (p.status === 'Rejected' && !p.advisorApproval?.approved) return false;
        return true;
      });
    } else if (loggedUser.role === 'principal') {
      passes = passes.filter(p => {
        const reached = p.hodApproval?.approved === true || p.status === 'Pending Principal';
        if (!reached) return false;
        if (p.status === 'Rejected' && !p.hodApproval?.approved) return false;
        return true;
      });
    } else if (loggedUser.role === 'boys_warden') {
      passes = passes.filter(p => {
        const isHostel = (/hoste?l|^h$/i.test(p.accommodation || '') && !/day\s*scholar/i.test(p.accommodation || ''));
        const isNotFemale = !/^female$/i.test(String(p.gender || '').trim());
        const isNotGirlsStatus = p.status !== 'Pending Girls Warden';
        if (!isHostel || !isNotFemale || !isNotGirlsStatus) return false;
        const reached = p.principalApproval?.approved === true || p.status === 'Pending Boys Warden';
        if (!reached) return false;
        if (p.status === 'Rejected' && !p.principalApproval?.approved) return false;
        return true;
      });
    } else if (loggedUser.role === 'girls_warden') {
      passes = passes.filter(p => {
        const isHostel = (/hoste?l|^h$/i.test(p.accommodation || '') && !/day\s*scholar/i.test(p.accommodation || ''));
        const isFemale = /^female$/i.test(String(p.gender || '').trim()) || p.status === 'Pending Girls Warden';
        const isNotBoysStatus = p.status !== 'Pending Boys Warden';
        if (!isHostel || !isFemale || !isNotBoysStatus) return false;
        const reached = p.principalApproval?.approved === true || p.status === 'Pending Girls Warden';
        if (!reached) return false;
        if (p.status === 'Rejected' && !p.principalApproval?.approved) return false;
        return true;
      });
    }

    const allPasses = [...passes, ...odPasses].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Split into Approved and Rejected based on THIS authority's action
    let approvedPasses = [];
    let rejectedPasses = [];

    if (loggedUser.role === 'counselor') {
      approvedPasses = allPasses.filter(p => p.counselorApproval?.approved === true);
      rejectedPasses = allPasses.filter(
        p => p.status === 'Rejected' && (p.rejection?.role === 'counselor' || /counselor/i.test(p.rejectedBy || '') || /counselor/i.test(p.rejection?.roleTitle || ''))
      );
    } else if (loggedUser.role === 'advisor') {
      approvedPasses = allPasses.filter(p => p.advisorApproval?.approved === true);
      rejectedPasses = allPasses.filter(
        p => p.status === 'Rejected' && (p.rejection?.role === 'advisor' || /advisor/i.test(p.rejectedBy || '') || /advisor/i.test(p.rejection?.roleTitle || ''))
      );
    } else if (loggedUser.role === 'hod') {
      approvedPasses = allPasses.filter(p => p.hodApproval?.approved === true || (p.isOD && (p.status === 'Completed' || p.status === 'Approved')));
      rejectedPasses = allPasses.filter(
        p => p.status === 'Rejected' && (p.rejection?.role === 'hod' || /hod/i.test(p.rejectedBy || '') || /hod/i.test(p.rejection?.roleTitle || ''))
      );
    } else if (loggedUser.role === 'principal') {
      approvedPasses = allPasses.filter(p => p.principalApproval?.approved === true);
      rejectedPasses = allPasses.filter(
        p => p.status === 'Rejected' && (p.rejection?.role === 'principal' || /principal/i.test(p.rejectedBy || '') || /principal/i.test(p.rejection?.roleTitle || ''))
      );
    } else if (loggedUser.role === 'boys_warden') {
      approvedPasses = allPasses.filter(
        p => p.wardenApproval?.approved === true || (p.status === 'Approved' && p.principalApproval?.approved) || p.status === 'Exited' || p.status === 'Returned'
      );
      rejectedPasses = allPasses.filter(
        p =>
          p.status === 'Rejected' &&
          (p.rejection?.role === 'boys_warden' || p.rejection?.role === 'warden' || /warden/i.test(p.rejectedBy || ''))
      );
    } else if (loggedUser.role === 'girls_warden') {
      approvedPasses = allPasses.filter(
        p => p.wardenApproval?.approved === true || (p.status === 'Approved' && p.principalApproval?.approved) || p.status === 'Exited' || p.status === 'Returned'
      );
      rejectedPasses = allPasses.filter(
        p =>
          p.status === 'Rejected' &&
          (p.rejection?.role === 'girls_warden' || p.rejection?.role === 'warden' || /warden/i.test(p.rejectedBy || ''))
      );
    }

    cachedAllRecords = allPasses;
    cachedApprovedRecords = approvedPasses;
    cachedRejectedRecords = rejectedPasses;

    window.masterPassList = allPasses;
    window.cachedAllRecords = allPasses;

    // ── Separate GP and OD lists for extended KPI cards ──
    const gpAll = allPasses.filter(p => !p.isOD && !p.odLetter);
    const odAll = allPasses.filter(p => p.isOD || !!p.odLetter);

    // Determine pending statuses per role
    const pendingStatusMap = {
      counselor: 'Pending Counselor',
      advisor: 'Pending Advisor',
      hod: 'Pending HOD'
    };
    const myPendingStatus = pendingStatusMap[loggedUser.role] || '';

    const gpPending = gpAll.filter(p => p.status === myPendingStatus);
    const gpApproved = approvedPasses.filter(p => !p.isOD && !p.odLetter);
    const gpRejected = rejectedPasses.filter(p => !p.isOD && !p.odLetter);
    const odPending = odAll.filter(p => p.status === myPendingStatus);
    const odApproved = approvedPasses.filter(p => p.isOD || !!p.odLetter);
    const odRejected = rejectedPasses.filter(p => p.isOD || !!p.odLetter);

    // Cache for search filters
    window.cachedGPAllRecords = gpAll;
    window.cachedODAllRecords = odAll;

    // ── Update 3 COMBINED KPI cards (Pending / Approved / Rejected) ──
    const setKPI = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

    // Combined pending count
    const totalPending = gpPending.length + odPending.length;
    setKPI('kpi_pending', totalPending);
    setKPI('kpi_sub_gp_pending', gpPending.length);
    setKPI('kpi_sub_od_pending', odPending.length);

    // Combined approved count
    setKPI('kpi_approved', approvedPasses.length);
    setKPI('kpi_sub_gp_approved', gpApproved.length);
    setKPI('kpi_sub_od_approved', odApproved.length);

    // Combined rejected count
    setKPI('kpi_rejected', rejectedPasses.length);
    setKPI('kpi_sub_gp_rejected', gpRejected.length);
    setKPI('kpi_sub_od_rejected', odRejected.length);

    // Badge labels on KPI cards
    const setB = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    setB('authBadge_approved', approvedPasses.length);
    setB('authBadge_rejected', rejectedPasses.length);

    // Pending badge — pulse red when there are pending items
    const reqBadge = document.getElementById('authBadge_requests');
    if (reqBadge) {
      reqBadge.innerText = totalPending;
      reqBadge.className = totalPending > 0
        ? 'text-xs font-bold text-white bg-red-600 px-2.5 py-1 rounded-lg animate-pulse'
        : 'text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200';
    }

    // Tab bar notification badge
    setB('extBadge_requests', totalPending);

    // ── Update original 4-card KPI (Principal/Warden) ──
    const kpiTotal = document.getElementById('kpi_total');
    if (kpiTotal) kpiTotal.innerText = allPasses.length;
    const badgeAll = document.getElementById('authBadge_all');
    if (badgeAll) badgeAll.innerText = allPasses.length;

    // kpi_pending for principal/warden (re-use same id)
    const kpiPending4 = document.getElementById('kpi_pending');
    if (kpiPending4 && !['counselor','advisor','hod'].includes(loggedUser.role)) {
      kpiPending4.innerText = allPasses.filter(p => p.status && p.status.startsWith('Pending')).length;
    }
    const kpiApproved4 = document.getElementById('kpi_approved');
    if (kpiApproved4 && !['counselor','advisor','hod'].includes(loggedUser.role)) kpiApproved4.innerText = approvedPasses.length;
    const kpiRejected4 = document.getElementById('kpi_rejected');
    if (kpiRejected4 && !['counselor','advisor','hod'].includes(loggedUser.role)) kpiRejected4.innerText = rejectedPasses.length;

    // ── Render all section tables ──
    renderAuthorityApprovedSection(approvedPasses);
    renderAuthorityRejectedSection(rejectedPasses);
    renderAuthorityAllRecordsSection(allPasses);

    // Extended sections for Counselor/Advisor/HOD
    if (['counselor', 'advisor', 'hod'].includes(loggedUser.role)) {
      renderExtODPendingSection(odPending);
      renderExtODApprovedSection(odApproved);
      renderExtODRejectedSection(odRejected);
      renderExtGPAllSection(gpAll);
      renderExtODAllSection(odAll);
    }
  } catch (err) {
    console.error('Failed to load authority records:', err);
  }
}

/**
 * Section 2: Render Approved Passes
 */
function renderAuthorityApprovedSection(passes) {
  const container = document.getElementById('authorityApprovedContainer');
  if (!container) return;

  if (!passes || passes.length === 0) {
    container.innerHTML = `
      <div class="p-12 text-center bg-white space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="text-base font-bold text-slate-800">No Approved Records Yet</div>
        <p class="text-xs md:text-sm text-slate-500 max-w-sm mx-auto">Leave applications approved and endorsed at your authority level will appear here.</p>
      </div>`;
    return;
  }

  let html = `
    <table class="enterprise-table min-w-[950px]">
      <thead>
        <tr>
          <th>Student & Roll No</th>
          <th>Class & Accommodation</th>
          <th>Reason & Document</th>
          <th>Your Approval (IST)</th>
          <th>Current Status</th>
          <th class="text-right">Official PDFs</th>
        </tr>
      </thead>
      <tbody>
  `;

  passes.forEach(p => {
    let yourTime = '-';
    if (loggedUser.role === 'counselor') yourTime = p.counselorApproval?.time || p.parentCallTime || '-';
    else if (loggedUser.role === 'advisor') yourTime = p.advisorApproval?.time || '-';
    else if (loggedUser.role === 'hod') yourTime = p.hodApproval?.time || '-';
    else if (loggedUser.role === 'principal') yourTime = p.principalApproval?.time || p.approvalTime || '-';
    else if (loggedUser.role === 'boys_warden' || loggedUser.role === 'girls_warden')
      yourTime = p.wardenApproval?.time || p.approvalTime || '-';

    const isOD = p.isOD || !!p.odLetter;

    html += `
      <tr>
        <td>
          <div class="font-bold text-slate-900 text-sm">${escapeHtml(p.name)} ${isOD ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 ml-1">OD</span>' : ''}</div>
          <div class="font-mono text-xs font-bold text-red-700 bg-red-50/80 border border-red-200/60 inline-block px-2 py-0.5 rounded-md mt-0.5">${p.rollNo}</div>
          <div class="text-xs text-slate-600 mt-1">
            <div>Father: <span class="font-bold text-slate-900">${escapeHtml(p.fatherName || p.parentName || '-')}</span></div>
            <div>Parent: <a href="tel:${p.parentContact}" class="text-emerald-700 font-semibold hover:underline">${p.parentContact || '-'}</a></div>
          </div>
        </td>
        <td>
          <div class="font-semibold text-slate-800 text-xs md:text-sm">${formatClassSection(p.dept, p.yearSec, p.academicYear)}</div>
          <div class="mt-1">${formatAccommodationBadge(p.accommodation)}</div>
        </td>
        <td class="max-w-xs">
          ${!isOD && typeof renderPassScheduleInfo === 'function' ? renderPassScheduleInfo(p) : ''}
          ${isOD ? `<div class="font-semibold text-indigo-950 text-xs mb-0.5"><span class="text-indigo-600 font-bold">Venue:</span> ${escapeHtml(p.placeEvent || p.event || 'College Assignment')}</div>` : ''}
          <div class="font-medium text-slate-800 text-xs md:text-sm leading-relaxed mb-1.5 line-clamp-2">"${escapeHtml(p.reason)}"</div>
          <button onclick="${isOD ? `viewOnDutyLetter(${escapeAttr(p)})` : `viewFormalLetter(${escapeAttr(p)})`}" class="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition active:scale-95">
            View Letter
          </button>
        </td>
        <td>
          <div class="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
            ${yourTime}
          </div>
        </td>
        <td>
          ${
            p.status === 'Completed' || p.status === 'Approved'
              ? `<div class="space-y-1">
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    ${isOD ? 'COMPLETED (OD)' : 'APPROVED (FINAL)'}
                  </span>
                  <div class="text-xs text-emerald-700 font-mono font-semibold">${p.hodApproval?.time || p.approvalTime || '-'}</div>
                </div>`
              : p.status === 'Returned' || p.exitStatus === 'Returned to College'
              ? `<div class="space-y-0.5">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-900 border border-sky-300">
                    RETURNED
                  </span>
                  <div class="text-[11px] font-mono text-slate-700">Exit: ${escapeHtml(p.exitTime && p.exitTime !== '-' ? p.exitTime : '-')}</div>
                  <div class="text-[11px] font-mono text-sky-900 font-bold">Return: ${escapeHtml(p.returnTime && p.returnTime !== '-' ? p.returnTime : '-')}</div>
                </div>`
              : p.status === 'Exited' || p.exitStatus === 'Exited Campus'
              ? `<div class="space-y-0.5">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    EXITED
                  </span>
                  <div class="text-[11px] font-mono text-emerald-900 font-bold">Exit: ${escapeHtml(p.exitTime || '-')}</div>
                </div>`
              : p.status === 'Rejected'
              ? `<div class="space-y-1">
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
                    REJECTED AT LATER STAGE
                  </span>
                  <div class="text-xs text-slate-500">By: ${escapeHtml(p.rejection?.roleTitle || p.rejectedBy || 'Higher Authority')}</div>
                </div>`
              : `<div class="space-y-1">
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    APPROVED & FORWARDED
                  </span>
                  <div class="text-xs text-slate-600 font-semibold font-mono">Next: ${escapeHtml(p.status.replace('Pending ', ''))}</div>
                </div>`
          }
        </td>
        <td class="text-right">
          <div class="flex items-center justify-end gap-1.5">
            ${!isOD ? `
              <button onclick="downloadGatePassCardPDF(${escapeAttr(p)})" class="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1 active:scale-95 text-xs" title="Download Official Gate Pass Card">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                <span>Gate Pass</span>
              </button>
            ` : ''}
            <button onclick="${isOD ? `downloadOnDutyLetterPDF(${escapeAttr(p)})` : `downloadOfficialLetterOnlyPDF(${escapeAttr(p)})`}" class="px-2.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1 active:scale-95 text-xs" title="Download Official Letter">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span>${isOD ? 'OD Letter' : 'Letter'}</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

/**
 * Section 3: Render Rejected Passes
 */
function renderAuthorityRejectedSection(passes) {
  const container = document.getElementById('authorityRejectedContainer');
  if (!container) return;

  if (!passes || passes.length === 0) {
    container.innerHTML = `
      <div class="p-12 text-center bg-white space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto shadow-2xs">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="text-base font-bold text-slate-800">No Rejected Applications</div>
        <p class="text-xs md:text-sm text-slate-500 max-w-sm mx-auto">Applications rejected at your authority level will appear here with recorded reasons.</p>
      </div>`;
    return;
  }

  let html = `
    <table class="enterprise-table min-w-[950px]">
      <thead>
        <tr>
          <th>Student & Roll No</th>
          <th>Class & Accommodation</th>
          <th>Original Reason & Letter</th>
          <th>Rejection Reason & Sign-off</th>
          <th>Rejected Timestamp</th>
          <th class="text-right">Official Document</th>
        </tr>
      </thead>
      <tbody>
  `;

  passes.forEach(p => {
    const isOD = p.isOD || !!p.odLetter;
    const rejReason = p.rejection?.reason || p.rejectionReason || 'No reason specified';
    const rejTime = p.rejection?.time || p.rejectedTime || '-';
    const rejBy = p.rejection?.roleTitle || p.rejection?.rejectedBy || p.rejectedBy || 'Authority';

    html += `
      <tr>
        <td>
          <div class="font-bold text-slate-900 text-sm">${escapeHtml(p.name)} ${isOD ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 ml-1">OD</span>' : ''}</div>
          <div class="font-mono text-xs font-bold text-red-700 bg-red-50/80 border border-red-200/60 inline-block px-2 py-0.5 rounded-md mt-0.5">${p.rollNo}</div>
          <div class="text-xs text-slate-600 mt-1">
            <div>Father: <span class="font-bold text-slate-900">${escapeHtml(p.fatherName || p.parentName || '-')}</span></div>
            <div>Parent: <a href="tel:${p.parentContact}" class="text-emerald-700 font-semibold hover:underline">${p.parentContact || '-'}</a></div>
          </div>
        </td>
        <td>
          <div class="font-semibold text-slate-800 text-xs md:text-sm">${formatClassSection(p.dept, p.yearSec, p.academicYear)}</div>
          <div class="mt-1">${formatAccommodationBadge(p.accommodation)}</div>
        </td>
        <td class="max-w-xs">
          ${!isOD && typeof renderPassScheduleInfo === 'function' ? renderPassScheduleInfo(p) : ''}
          ${isOD ? `<div class="font-semibold text-indigo-950 text-xs mb-0.5"><span class="text-indigo-600 font-bold">Venue:</span> ${escapeHtml(p.placeEvent || p.event || 'College Assignment')}</div>` : ''}
          <div class="font-medium text-slate-800 text-xs md:text-sm leading-relaxed mb-1.5 line-clamp-2">"${escapeHtml(p.reason)}"</div>
          <button onclick="${isOD ? `viewOnDutyLetter(${escapeAttr(p)})` : `viewFormalLetter(${escapeAttr(p)})`}" class="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition active:scale-95">
            View Letter
          </button>
        </td>
        <td>
          <div class="space-y-1.5 bg-rose-50/90 p-3 rounded-xl border border-rose-200 max-w-sm">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
              REJECTED
            </span>
            <div class="text-xs md:text-sm text-rose-900 font-semibold leading-relaxed">"${escapeHtml(rejReason)}"</div>
            <div class="text-xs text-slate-500">By: ${escapeHtml(rejBy)}</div>
          </div>
        </td>
        <td>
          <div class="font-mono text-xs text-rose-700 font-semibold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 inline-block">
            ${rejTime}
          </div>
        </td>
        <td class="text-right">
          <button onclick="${isOD ? `downloadOnDutyLetterPDF(${escapeAttr(p)})` : `downloadOfficialLetterOnlyPDF(${escapeAttr(p)})`}" class="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5 active:scale-95" title="Download Official Letter">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span>${isOD ? 'Download OD Letter' : 'Download Letter'}</span>
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

/**
 * Section 4: Render All Records Archive
 */
function renderAuthorityAllRecordsSection(passes) {
  const container = document.getElementById('authorityAllRecordsContainer');
  if (!container) return;

  if (!passes || passes.length === 0) {
    container.innerHTML = `
      <div class="p-12 text-center bg-white space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto shadow-2xs">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div class="text-base font-bold text-slate-800">No Records Found</div>
        <p class="text-xs md:text-sm text-slate-500 max-w-sm mx-auto">All student leave requisitions within your jurisdiction will be archived here.</p>
      </div>`;
    return;
  }

  let html = `
    <table class="enterprise-table min-w-[950px]">
      <thead>
        <tr>
          <th>Student & Roll No</th>
          <th>Class & Section</th>
          <th>Father & Contacts</th>
          <th>Reason & Document</th>
          <th>Multi-Tier Audit Chain (IST)</th>
          <th>Current Status</th>
          <th class="text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  passes.forEach(p => {
    const isOD = p.isOD || !!p.odLetter;
    const rejReason = p.rejection?.reason || p.rejectionReason || 'No reason specified';
    const rejBy = p.rejection?.roleTitle || p.rejection?.rejectedBy || p.rejectedBy || 'Authority';

    html += `
      <tr>
        <td>
          <div class="font-bold text-slate-900 text-sm">${escapeHtml(p.name)} ${isOD ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 ml-1">OD</span>' : ''}</div>
          <div class="font-mono text-xs font-bold text-red-700 bg-red-50/80 border border-red-200/60 inline-block px-2 py-0.5 rounded-md mt-0.5">${p.rollNo}</div>
        </td>
        <td>
          <div class="font-semibold text-slate-800 text-xs md:text-sm">${formatClassSection(p.dept, p.yearSec, p.academicYear)}</div>
          <div class="mt-1">${formatAccommodationBadge(p.accommodation)}</div>
        </td>
        <td>
          <div class="text-xs md:text-sm text-slate-700 space-y-0.5">
            <div>Father: <span class="font-bold text-slate-900">${escapeHtml(p.fatherName || p.parentName || '-')}</span></div>
            <div>Parent: <a href="tel:${p.parentContact}" class="font-bold text-emerald-800 hover:underline">${p.parentContact || '-'}</a></div>
            <div>Student: <span class="text-slate-600">${p.mobile || '-'}</span></div>
          </div>
        </td>
        <td class="max-w-xs">
          ${!isOD && typeof renderPassScheduleInfo === 'function' ? renderPassScheduleInfo(p) : ''}
          ${isOD ? `<div class="font-semibold text-indigo-950 text-xs mb-0.5"><span class="text-indigo-600 font-bold">Venue:</span> ${escapeHtml(p.placeEvent || p.event || 'College Assignment')}</div>` : ''}
          <div class="font-medium text-slate-800 text-xs md:text-sm leading-relaxed mb-1.5 line-clamp-2">"${escapeHtml(p.reason)}"</div>
          <button onclick="${isOD ? `viewOnDutyLetter(${escapeAttr(p)})` : `viewFormalLetter(${escapeAttr(p)})`}" class="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition active:scale-95">
            View Letter
          </button>
        </td>
        <td>
          <div class="font-mono text-xs text-slate-700 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <div><span class="text-slate-500 font-sans">Applied:</span> ${p.appliedTime || '-'}</div>
            <div><span class="text-slate-500 font-sans">Counselor:</span> ${p.counselorApproval?.time || p.parentCallTime || '-'}</div>
            <div><span class="text-slate-500 font-sans">Advisor:</span> ${p.advisorApproval?.time || '-'}</div>
            <div><span class="text-slate-500 font-sans">HOD:</span> ${p.hodApproval?.time || '-'}</div>
            ${!isOD ? `<div><span class="text-slate-500 font-sans">Principal:</span> ${p.approvalTime || '-'}</div>` : ''}
            ${p.wardenApproval?.approved ? `<div><span class="text-slate-500 font-sans">Warden:</span> ${p.wardenApproval?.time || '-'}</div>` : ''}
          </div>
        </td>
        <td>
          ${
            p.status === 'Rejected'
              ? `<div class="space-y-1">
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
                    REJECTED
                  </span>
                  <div class="text-xs text-rose-800 font-semibold max-w-[180px] break-words">
                    "${escapeHtml(rejReason)}"
                  </div>
                  <div class="text-xs text-slate-500">By: ${escapeHtml(rejBy)}</div>
                </div>`
              : p.status === 'Completed' || (isOD && p.status === 'Approved')
              ? `<div class="space-y-1">
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    ${isOD ? 'COMPLETED (OD)' : 'APPROVED'}
                  </span>
                  <div class="text-xs text-emerald-700 font-mono font-semibold">${p.hodApproval?.time || p.approvalTime || '-'}</div>
                </div>`
              : p.status === 'Returned' || p.exitStatus === 'Returned to College'
              ? `<div class="space-y-0.5">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-900 border border-sky-300">
                    RETURNED
                  </span>
                  <div class="text-[11px] font-mono text-slate-700">Exit: ${escapeHtml(p.exitTime && p.exitTime !== '-' ? p.exitTime : '-')}</div>
                  <div class="text-[11px] font-mono text-sky-900 font-bold">Return: ${escapeHtml(p.returnTime && p.returnTime !== '-' ? p.returnTime : '-')}</div>
                </div>`
              : p.status === 'Exited' || p.exitStatus === 'Exited Campus'
              ? `<div class="space-y-0.5">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    EXITED
                  </span>
                  <div class="text-[11px] font-mono text-emerald-900 font-bold">Exit: ${escapeHtml(p.exitTime || '-')}</div>
                </div>`
              : `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  ${escapeHtml(p.status.toUpperCase())}
                </span>`
          }
        </td>
        <td class="text-right">
          <div class="flex items-center justify-end gap-1.5">
            ${!isOD ? `
              <button onclick="downloadGatePassCardPDF(${escapeAttr(p)})" class="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1 active:scale-95 text-xs" title="Download Official Gate Pass Card">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                <span>Gate Pass</span>
              </button>
            ` : ''}
            <button onclick="${isOD ? `downloadOnDutyLetterPDF(${escapeAttr(p)})` : `downloadOfficialLetterOnlyPDF(${escapeAttr(p)})`}" class="px-2.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1 active:scale-95 text-xs" title="Download Official Letter">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span>${isOD ? 'OD Letter' : 'Letter'}</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

/**
 * Live search filter on Section 7 (Overall Records)
 */
function filterAuthorityAllRecords() {
  const query = document.getElementById('authAllRecordsSearch')?.value?.toLowerCase().trim() || '';
  if (!query) {
    renderAuthorityAllRecordsSection(cachedAllRecords);
    return;
  }
  const filtered = cachedAllRecords.filter(p => {
    return (
      (p.rollNo && p.rollNo.toLowerCase().includes(query)) ||
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.dept && p.dept.toLowerCase().includes(query)) ||
      (p.reason && p.reason.toLowerCase().includes(query)) ||
      (p.status && p.status.toLowerCase().includes(query))
    );
  });
  renderAuthorityAllRecordsSection(filtered);
}

/* ────────────────────────────────────────────────────────────
 * EXTENDED SECTIONS (Counselor / Advisor / HOD only)
 * ──────────────────────────────────────────────────────────── */

/**
 * Helper: build a compact OD row HTML string
 */
function buildODRowHTML(od) {
  const isOD = true;
  const timingDisplay = od.mode === 'time'
    ? `<div><span class="font-bold text-indigo-800">Date:</span> ${od.specificDate || od.fromDate}</div><div class="text-slate-600 font-mono text-[11px] mt-0.5">${od.fromTime || ''} – ${od.toTime || ''}</div>`
    : `<div><span class="font-bold text-indigo-800">From:</span> ${od.fromDate || '-'}</div><div><span class="font-bold text-indigo-800">To:</span> ${od.toDate || '-'}</div>`;

  const statusBadge = od.status === 'Rejected'
    ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">REJECTED</span>`
    : od.status === 'Completed' || od.status === 'Approved'
    ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">COMPLETED (OD)</span>`
    : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">${escapeHtml(od.status || 'Pending')}</span>`;

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
        <div class="font-semibold text-slate-800 text-xs md:text-sm">${escapeHtml(od.dept || '-')} – Sec ${escapeHtml(od.yearSec || '-')}</div>
        <div class="text-[11px] text-slate-500 font-bold mt-0.5">${escapeHtml(od.academicYear || '3 Year')}</div>
      </td>
      <td>
        <div class="text-xs bg-indigo-50/70 border border-indigo-100 p-2.5 rounded-xl space-y-1">
          ${timingDisplay}
          <div class="text-[10px] text-slate-600 font-medium">Return: ${escapeHtml(od.expectedReturnTime || od.expectedReturnDateTime || '-')}</div>
        </div>
      </td>
      <td class="max-w-xs">
        <div class="font-semibold text-indigo-950 text-xs mb-0.5"><span class="text-indigo-600 font-bold">Venue:</span> ${escapeHtml(od.placeEvent || od.event || 'College Assignment')}</div>
        <div class="font-medium text-slate-800 text-xs leading-relaxed line-clamp-2">"${escapeHtml(od.reason)}"</div>
      </td>
      <td>${statusBadge}</td>
      <td class="text-right">
        <div class="flex items-center justify-end gap-1.5">
          <button onclick="viewOnDutyLetterById('${od._id}')" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold rounded-xl shadow-2xs whitespace-nowrap transition active:scale-95 text-xs">Letter</button>
          <button onclick="downloadOnDutyLetterById('${od._id}')" class="px-2.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-xl shadow-2xs whitespace-nowrap transition active:scale-95 text-xs">PDF</button>
        </div>
      </td>
    </tr>
  `;
}

/** Empty state block */
function buildEmptyState(icon, title, subtitle) {
  return `
    <div class="p-12 text-center bg-white space-y-3">
      <div class="w-12 h-12 rounded-2xl ${icon.bg} ${icon.text} flex items-center justify-center mx-auto shadow-2xs">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">${icon.path}</svg>
      </div>
      <div class="text-base font-bold text-slate-800">${title}</div>
      <p class="text-xs md:text-sm text-slate-500 max-w-sm mx-auto">${subtitle}</p>
    </div>`;
}

/** OD table wrapper HTML */
function buildODTableHTML(rows) {
  return `
    <table class="enterprise-table min-w-[900px]">
      <thead>
        <tr>
          <th>Student & Roll No</th>
          <th>Class & Section</th>
          <th>Duration / Timing</th>
          <th>Reason & Venue</th>
          <th>Status</th>
          <th class="text-right">Documents</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/**
 * Section: OD Pending (standalone)
 */
function renderExtODPendingSection(passes) {
  const container = document.getElementById('extODPendingContainer');
  if (!container) return;
  if (!passes || passes.length === 0) {
    container.innerHTML = buildEmptyState(
      { bg: 'bg-amber-50', text: 'text-amber-600', path: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />' },
      'No Pending On-Duty Requests',
      'On-Duty requests pending your action will appear here.'
    );
    return;
  }
  container.innerHTML = buildODTableHTML(passes.map(buildODRowHTML).join(''));
}

/**
 * Section: OD Approved
 */
function renderExtODApprovedSection(passes) {
  const container = document.getElementById('extODApprovedContainer');
  if (!container) return;
  if (!passes || passes.length === 0) {
    container.innerHTML = buildEmptyState(
      { bg: 'bg-indigo-50', text: 'text-indigo-600', path: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />' },
      'No Approved On-Duty Requests',
      'On-Duty requests approved at your authority level will appear here.'
    );
    return;
  }
  container.innerHTML = buildODTableHTML(passes.map(buildODRowHTML).join(''));
}

/**
 * Section: OD Rejected
 */
function renderExtODRejectedSection(passes) {
  const container = document.getElementById('extODRejectedContainer');
  if (!container) return;
  if (!passes || passes.length === 0) {
    container.innerHTML = buildEmptyState(
      { bg: 'bg-rose-50', text: 'text-rose-600', path: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />' },
      'No Rejected On-Duty Requests',
      'On-Duty requests rejected at your level with recorded reasons will appear here.'
    );
    return;
  }
  container.innerHTML = buildODTableHTML(passes.map(buildODRowHTML).join(''));
}

/**
 * Section: All Gate Passes (full GP history)
 */
function renderExtGPAllSection(passes) {
  const container = document.getElementById('extGPAllContainer');
  if (!container) return;
  if (!passes || passes.length === 0) {
    container.innerHTML = buildEmptyState(
      { bg: 'bg-emerald-50', text: 'text-emerald-600', path: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />' },
      'No Gate Pass Records Found',
      'All Gate Pass applications in your jurisdiction will appear here.'
    );
    return;
  }

  const statusBadge = (p) => {
    if (p.status === 'Rejected') return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">REJECTED</span>`;
    if (p.status === 'Approved' || p.status === 'Completed') return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">APPROVED</span>`;
    if (p.status === 'Exited') return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">EXITED</span>`;
    if (p.status === 'Returned') return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">RETURNED</span>`;
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">${escapeHtml(p.status || 'Pending').toUpperCase()}</span>`;
  };

  const rows = passes.map(p => `
    <tr>
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
        <div class="mt-1">${formatAccommodationBadge(p.accommodation)}</div>
      </td>
      <td class="max-w-xs">
        ${typeof renderPassScheduleInfo === 'function' ? renderPassScheduleInfo(p) : ''}
        <div class="font-medium text-slate-700 text-xs line-clamp-2">"${escapeHtml(p.reason)}"</div>
      </td>
      <td>
        <div class="font-mono text-xs text-slate-700 space-y-0.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <div><span class="text-slate-500">Applied:</span> ${p.appliedTime || '-'}</div>
          <div><span class="text-slate-500">Counselor:</span> ${p.counselorApproval?.time || '-'}</div>
          <div><span class="text-slate-500">Advisor:</span> ${p.advisorApproval?.time || '-'}</div>
          <div><span class="text-slate-500">HOD:</span> ${p.hodApproval?.time || '-'}</div>
        </div>
      </td>
      <td>${statusBadge(p)}</td>
      <td class="text-right">
        <div class="flex items-center justify-end gap-1.5">
          <button onclick="downloadGatePassCardPDF(${escapeAttr(p)})" class="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1 active:scale-95 text-xs">Gate Pass</button>
          <button onclick="downloadOfficialLetterOnlyPDF(${escapeAttr(p)})" class="px-2.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1 active:scale-95 text-xs">Letter</button>
        </div>
      </td>
    </tr>
  `).join('');

  const html = `
    <table class="enterprise-table min-w-[950px]">
      <thead><tr>
        <th>Student & Roll No</th>
        <th>Class & Accommodation</th>
        <th>Reason & Schedule</th>
        <th>Audit Timeline (IST)</th>
        <th>Status</th>
        <th class="text-right">Documents</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  container.innerHTML = html;
}

/**
 * Section: All OD Requests (full OD history)
 */
function renderExtODAllSection(passes) {
  const container = document.getElementById('extODAllContainer');
  if (!container) return;
  if (!passes || passes.length === 0) {
    container.innerHTML = buildEmptyState(
      { bg: 'bg-purple-50', text: 'text-purple-600', path: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />' },
      'No On-Duty Records Found',
      'All On-Duty applications within your jurisdiction will appear here.'
    );
    return;
  }
  container.innerHTML = buildODTableHTML(passes.map(buildODRowHTML).join(''));
}

function buildOfficialGatePassText(p) {
  if (!p) return '';
  const deptUpper = String(p.dept || 'ENGINEERING').toUpperCase();
  const isHostel = (/hoste?l|^h$/i.test(p.accommodation || '') && !/day/i.test(p.accommodation || ''));
  const accomStr = isHostel ? 'Hosteller (Resident Student)' : 'Day Scholar';
  const appliedDate = p.appliedTime || '-';
  const depTime = p.departureTime ? ` at ${p.departureTime}` : '';
  const retTime = p.expectedReturnTime ? ` at ${p.expectedReturnTime}` : '';
  const returnStr = p.expectedReturnDate ? `${p.expectedReturnDate}${retTime}` : (p.expectedReturnDateTime || '-');
  const leaveTime = p.approvalTime || p.appliedTime || '-';

  let movementSection = '';
  if (isHostel) {
    movementSection = `OFFICIAL HOSTELLER MOVEMENT SCHEDULE:
--------------------------------------------------------------------------------
Application Date       : ${appliedDate}
Departure Date & Time  : ${p.departureDate || '-'}${depTime}
Return Date & Time     : ${returnStr}
Department             : Department of ${p.dept || 'Engineering'}
Academic Year          : ${p.academicYear || '3 Year'}
Class Section          : Section '${p.yearSec || 'A'}'`;
  } else {
    const dsDate = p.leaveDate || p.departureDate || (p.appliedTime ? String(p.appliedTime).split(' ')[0] : appliedDate);
    const dsTime = p.leaveTime || p.departureTime || '-';
    movementSection = `OFFICIAL DAY SCHOLAR LEAVE PARTICULARS:
--------------------------------------------------------------------------------
Leave Date             : ${dsDate}
Leave Time             : ${dsTime}
Department             : Department of ${p.dept || 'Engineering'}
Academic Year          : ${p.academicYear || '3 Year'}
Class Section          : Section '${p.yearSec || 'A'}'`;
  }

  return `GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY
(Approved by AICTE, New Delhi | Affiliated to Anna University, Chennai)
(An Autonomous Institution | Accredited by NAAC with 'A++' Grade)
GRT Mahalaksmi Nagar, Chennai-Tirupati Highway, Tiruttani - 631 209.
DEPARTMENT OF ${deptUpper}

OFFICIAL COLLEGE GATE PASS / LEAVE CLEARANCE
Date: ${appliedDate}
Pass Ref: GRTIET/${deptUpper}/GP/2026/${p.rollNo}

STUDENT PARTICULARS:
--------------------------------------------------------------------------------
Name                   : ${p.name || 'Student'}
Registration / Roll No : ${p.rollNo}
Accommodation          : ${accomStr}
Father / Parent Name   : ${p.fatherName || p.parentName || '-'}
Parent Phone Number    : ${p.parentContact || '-'}
Student Mobile         : ${p.mobile || '-'}

${movementSection}

MULTI-TIER INSTITUTIONAL APPROVAL ENDORSEMENTS:
--------------------------------------------------------------------------------
[1] Class Counselor : APPROVED (${p.counselorApproval?.counselorName || p.parentCalledBy || 'Verified & Parent Call Confirmed'})
[2] Class Advisor   : APPROVED (${p.advisorApproval?.advisorName || 'Endorsed'})
[3] Head of Dept    : APPROVED (${p.hodApproval?.hodName || 'Authorized'})
[4] Principal       : APPROVED (Institutional Directorate Cleared)
${isHostel ? `[5] Hostel Warden   : APPROVED (${p.gender === 'Female' ? 'Girls' : 'Boys'} Hostel Sanctioned)\n` : ''}
STATUS: AUTHORIZED FOR CAMPUS GATE PASS
Valid Until: ${p.validUntil || 'Authorized Hours'}
--------------------------------------------------------------------------------
Campus PassPro • Official GRT Institutional Gate Pass Clearance`;
}

function viewFormalLetter(pass) {
  if (pass && (pass.isOD || pass.odLetter)) {
    if (typeof viewOnDutyLetter === 'function') {
      return viewOnDutyLetter(pass);
    }
  }
  currentModalPass = pass;
  const contentEl = document.getElementById('letterModalContent');
  const btnEl = document.getElementById('modalDownloadLetterBtn');
  const modalEl = document.getElementById('letterModal');
  const subtitleEl = document.getElementById('letterModalSubtitle');

  if (subtitleEl) {
    subtitleEl.innerText = 'Tiruttani • Formal Leave Requisition Letter';
  }

  if (contentEl) contentEl.innerText = pass.formalLetter || buildOfficialGatePassText(pass) || '';
  if (btnEl) {
    btnEl.className = 'px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs md:text-sm font-bold shadow-xs transition active:scale-95 flex items-center gap-2';
    btnEl.innerHTML = `
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      <span>Download Official Letter (PDF)</span>`;
    btnEl.onclick = () => downloadOfficialLetterOnlyPDF(pass);
  }
  if (modalEl) modalEl.classList.remove('hidden');
}

function closeLetterModal() {
  const modalEl = document.getElementById('letterModal');
  if (modalEl) modalEl.classList.add('hidden');
}

window.buildOfficialGatePassText = buildOfficialGatePassText;

// Window global bindings
window.switchAuthorityTab = switchAuthorityTab;
window.loadUniversalLogs = loadUniversalLogs;
window.filterAuthorityAllRecords = filterAuthorityAllRecords;
window.viewFormalLetter = viewFormalLetter;
window.closeLetterModal = closeLetterModal;

// Extended section bindings
window.renderExtODPendingSection = renderExtODPendingSection;
window.renderExtODApprovedSection = renderExtODApprovedSection;
window.renderExtODRejectedSection = renderExtODRejectedSection;
window.renderExtGPAllSection = renderExtGPAllSection;
window.renderExtODAllSection = renderExtODAllSection;
