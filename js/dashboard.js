/**
 * Dynamic Dashboard Orchestrator & View Controller
 * Professional Blue & Slate Architecture • Campus PassPro
 * GRT Institute of Engineering and Technology
 */

if (typeof loggedUser === 'undefined') {
  var loggedUser = null;
}
let wardenAutoRefreshTimer = null;
let currentAuthRequestType = 'passes';

function switchAuthRequestType(type) {
  currentAuthRequestType = type;
  const passBtn = document.getElementById('authSubTab_passes');
  const odBtn = document.getElementById('authSubTab_onduty');
  const passCont = document.getElementById('authPassQueueContainer');
  const odCont = document.getElementById('authOnDutyQueueContainer');

  if (type === 'passes') {
    if (passBtn) passBtn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-blue-600 text-white shadow-sm border border-blue-500/50';
    if (odBtn) odBtn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/80';
    if (passCont) passCont.classList.remove('hidden');
    if (odCont) odCont.classList.add('hidden');
  } else {
    if (odBtn) odBtn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-blue-600 text-white shadow-sm border border-blue-500/50';
    if (passBtn) passBtn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/80';
    if (passCont) passCont.classList.add('hidden');
    if (odCont) odCont.classList.remove('hidden');
  }
}
window.switchAuthRequestType = switchAuthRequestType;

/**
 * 6-tab unified switcher for Counselor/Advisor/HOD dashboards
 * Tabs: requests | approved | rejected | gp_all | od_all | all
 */
function switchExtendedAuthorityTab(tabName) {
  const allSections = ['requests', 'approved', 'rejected', 'gp_all', 'od_all', 'all'];
  const allKpiCards = ['requests', 'approved', 'rejected'];

  // Hide all sections
  allSections.forEach(t => {
    const sec = document.getElementById(`authSec_${t}`);
    if (sec) sec.classList.add('hidden');
  });

  // Deactivate all KPI cards
  allKpiCards.forEach(k => {
    const card = document.getElementById(`kpiCard_${k}`);
    if (card) {
      card.classList.remove('active-kpi-card', 'border-blue-500');
      card.classList.add('border-slate-800', 'opacity-90');
    }
  });

  // Deactivate all tab buttons
  allSections.forEach(t => {
    const btn = document.getElementById(`extTab_btn_${t}`);
    if (btn) btn.className = 'flex-1 min-w-[110px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80';
  });

  // Activate selected section
  const activeSec = document.getElementById(`authSec_${tabName}`);
  if (activeSec) activeSec.classList.remove('hidden');

  // Activate selected tab button
  const activeBtn = document.getElementById(`extTab_btn_${tabName}`);
  if (activeBtn) activeBtn.className = 'flex-1 min-w-[110px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-blue-600 text-white shadow-md shadow-blue-900/40 border border-blue-500/50';

  // Activate matching KPI card
  const tabToCard = { requests: 'requests', approved: 'approved', rejected: 'rejected' };
  const cardKey = tabToCard[tabName];
  if (cardKey) {
    const card = document.getElementById(`kpiCard_${cardKey}`);
    if (card) {
      card.classList.add('active-kpi-card', 'border-blue-500');
      card.classList.remove('border-slate-800', 'opacity-90');
    }
  }

  currentAuthorityTab = tabName;
}
window.switchExtendedAuthorityTab = switchExtendedAuthorityTab;

/** GP All section live search */
function filterExtGPAll() {
  const query = (document.getElementById('gpAllSearch')?.value || '').toLowerCase().trim();
  const list = window.cachedGPAllRecords || [];
  if (!query) { renderExtGPAllSection(list); return; }
  renderExtGPAllSection(list.filter(p =>
    (p.rollNo && p.rollNo.toLowerCase().includes(query)) ||
    (p.name && p.name.toLowerCase().includes(query)) ||
    (p.dept && p.dept.toLowerCase().includes(query)) ||
    (p.status && p.status.toLowerCase().includes(query))
  ));
}
window.filterExtGPAll = filterExtGPAll;

/** OD All section live search */
function filterExtODAll() {
  const query = (document.getElementById('odAllSearch')?.value || '').toLowerCase().trim();
  const list = window.cachedODAllRecords || [];
  if (!query) { renderExtODAllSection(list); return; }
  renderExtODAllSection(list.filter(p =>
    (p.rollNo && p.rollNo.toLowerCase().includes(query)) ||
    (p.name && p.name.toLowerCase().includes(query)) ||
    (p.dept && p.dept.toLowerCase().includes(query)) ||
    (p.status && p.status.toLowerCase().includes(query))
  ));
}
window.filterExtODAll = filterExtODAll;

function getAuthorityDashboardHTML(user, config) {
  const role = user?.role || '';

  // ── Extended unified layout for Counselor, Advisor, HOD ──
  if (config.hasOnDutyQueue) {
    let kpi1Title = 'Pending Action';
    let kpi1Badge = 'Action Needed';
    let kpi2Title = 'Approved by You';
    let kpi2Badge = 'Approved';
    let kpi3Title = 'Declined';
    let kpi3Badge = 'Declined';

    let tab1Label = 'Pending';
    let tab2Label = 'Approved';
    let tab3Label = 'Declined';
    let tab4Label = 'All Gate Passes';
    let tab5Label = 'All OD Requests';
    let tab6Label = 'Overall Records';

    let roleGuidanceHTML = '';

    if (role === 'counselor') {
      kpi1Title = 'Pending Ward Review';
      kpi1Badge = 'Review Desk';
      kpi2Title = 'Verified by You';
      kpi2Badge = 'Pre-Screened';
      kpi3Title = 'Declined Passes';
      kpi3Badge = 'Declined';

      tab1Label = 'Ward Review Queue';
      tab2Label = 'Verified Clearances';
      tab3Label = 'Declined Passes';
      tab4Label = 'Ward Gate Passes';
      tab5Label = 'Ward OD Requests';
      tab6Label = 'Ward Master Archive';

      roleGuidanceHTML = `
        <div class="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 text-slate-300">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span class="font-bold text-white uppercase tracking-wider font-mono">Counselor Verification Desk:</span>
            <span class="text-slate-400 hidden md:inline">1. Call Parent to confirm &bull; 2. Check Attached Proofs &bull; 3. Confirm Checkbox &bull; 4. Endorse to Advisor</span>
          </div>
          <span class="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-500/30">Ward: ${user.startRoll || 'Start'} &rarr; ${user.endRoll || 'End'}</span>
        </div>
      `;
    } else if (role === 'advisor') {
      kpi1Title = 'Awaiting Class Review';
      kpi1Badge = 'Pre-Screened';
      kpi2Title = 'Endorsed to HOD';
      kpi2Badge = 'Advisor Cleared';
      kpi3Title = 'Declined Passes';
      kpi3Badge = 'Returned';

      tab1Label = 'Class Review Queue';
      tab2Label = 'Endorsed Clearances';
      tab3Label = 'Declined Passes';
      tab4Label = 'Class Gate Passes';
      tab5Label = 'Class OD Requests';
      tab6Label = 'Class Roster Archive';

      roleGuidanceHTML = `
        <div class="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 text-slate-300">
            <span class="w-2 h-2 rounded-full bg-blue-400"></span>
            <span class="font-bold text-white uppercase tracking-wider font-mono">Advisory Pipeline:</span>
            <span class="text-slate-400 hidden md:inline">Step 1: Counselor Verified &rarr; Step 2: Advisor Review (Current Queue) &rarr; Step 3: Forward to HOD</span>
          </div>
          <span class="text-[11px] font-mono font-bold text-blue-400 bg-blue-950/60 px-2.5 py-0.5 rounded border border-blue-500/30">Class: ${user.dept || 'Engineering'} - Sec ${user.yearSec || 'A'}</span>
        </div>
      `;
    } else if (role === 'hod') {
      kpi1Title = 'Department Action Queue';
      kpi1Badge = 'Sanction Required';
      kpi2Title = 'Department Authorized';
      kpi2Badge = 'Final Sanction';
      kpi3Title = 'Department Declined';
      kpi3Badge = 'Declined';

      tab1Label = 'Department Clearance Queue';
      tab2Label = 'Authorized Passes';
      tab3Label = 'Declined Records';
      tab4Label = 'Department Gate Passes';
      tab5Label = 'OD Authorizations';
      tab6Label = 'Department Master Archive';

      roleGuidanceHTML = `
        <div class="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 text-slate-300">
            <span class="w-2 h-2 rounded-full bg-indigo-400"></span>
            <span class="font-bold text-white uppercase tracking-wider font-mono">Department Authority:</span>
            <span class="text-slate-400 hidden md:inline">Final Approval Authority for Academic On-Duty (OD) &bull; Departmental Outpass Clearance Engine</span>
          </div>
          <span class="text-[11px] font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2.5 py-0.5 rounded border border-indigo-500/30">Dept: ${user.dept || 'Engineering'}</span>
        </div>
      `;
    }

    return `
    <div class="space-y-6">
      ${config.extraHeaderHTML || ''}
      ${roleGuidanceHTML}

      <!-- 3 COMBINED KPI STAT CARDS (Pending / Approved / Rejected) -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">

        <!-- Pending (GP + OD combined) -->
        <div id="kpiCard_requests" class="kpi-card active-kpi-card flex items-center justify-between p-4 md:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-95" onclick="switchExtendedAuthorityTab('requests')">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <svg class="w-6 h-6 fill-none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">${kpi1Title}</div>
              <div id="kpi_pending" class="text-2xl font-black text-white mt-0.5 font-mono">0</div>
              <div class="text-[11px] text-slate-400 mt-0.5 font-mono">
                GP: <span id="kpi_sub_gp_pending" class="font-bold text-amber-400">0</span> &nbsp;|&nbsp; OD: <span id="kpi_sub_od_pending" class="font-bold text-blue-400">0</span>
              </div>
            </div>
          </div>
          <span id="authBadge_requests" class="text-xs font-bold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-500/40">${kpi1Badge}</span>
        </div>

        <!-- Approved (GP + OD combined) -->
        <div id="kpiCard_approved" class="kpi-card flex items-center justify-between p-4 md:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg cursor-pointer transition-all hover:scale-[1.01] opacity-90 hover:opacity-100 active:scale-95" onclick="switchExtendedAuthorityTab('approved')">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <svg class="w-6 h-6 fill-none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">${kpi2Title}</div>
              <div id="kpi_approved" class="text-2xl font-black text-emerald-400 mt-0.5 font-mono">0</div>
              <div class="text-[11px] text-slate-400 mt-0.5 font-mono">
                GP: <span id="kpi_sub_gp_approved" class="font-bold text-emerald-400">0</span> &nbsp;|&nbsp; OD: <span id="kpi_sub_od_approved" class="font-bold text-blue-400">0</span>
              </div>
            </div>
          </div>
          <span id="authBadge_approved" class="text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/40">${kpi2Badge}</span>
        </div>

        <!-- Rejected (GP + OD combined) -->
        <div id="kpiCard_rejected" class="kpi-card flex items-center justify-between p-4 md:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg cursor-pointer transition-all hover:scale-[1.01] opacity-90 hover:opacity-100 active:scale-95" onclick="switchExtendedAuthorityTab('rejected')">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
              <svg class="w-6 h-6 fill-none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">${kpi3Title}</div>
              <div id="kpi_rejected" class="text-2xl font-black text-rose-400 mt-0.5 font-mono">0</div>
              <div class="text-[11px] text-slate-400 mt-0.5 font-mono">
                GP: <span id="kpi_sub_gp_rejected" class="font-bold text-rose-400">0</span> &nbsp;|&nbsp; OD: <span id="kpi_sub_od_rejected" class="font-bold text-rose-300">0</span>
              </div>
            </div>
          </div>
          <span id="authBadge_rejected" class="text-xs font-bold text-rose-300 bg-rose-950/80 px-2.5 py-1 rounded-lg border border-rose-500/40">${kpi3Badge}</span>
        </div>

      </div>

      <!-- MASTER SECTION CARD -->
      <div class="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 md:p-7 space-y-6 shadow-2xl">

        <!-- TAB NAVIGATION BAR: 6 unified tabs with role-tailored labels -->
        <nav class="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
          <button id="extTab_btn_requests" onclick="switchExtendedAuthorityTab('requests')"
            class="flex-1 min-w-[110px] px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-blue-600 text-white shadow-md shadow-blue-900/40 border border-blue-500/50">
            <svg class="w-3.5 h-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            <span>${tab1Label}</span>
            <span id="extBadge_requests" class="px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-extrabold leading-none">0</span>
          </button>

          <button id="extTab_btn_approved" onclick="switchExtendedAuthorityTab('approved')"
            class="flex-1 min-w-[110px] px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/80">
            <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
            <span>${tab2Label}</span>
          </button>

          <button id="extTab_btn_rejected" onclick="switchExtendedAuthorityTab('rejected')"
            class="flex-1 min-w-[110px] px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/80">
            <svg class="w-3.5 h-3.5 text-rose-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
            <span>${tab3Label}</span>
          </button>

          <button id="extTab_btn_gp_all" onclick="switchExtendedAuthorityTab('gp_all')"
            class="flex-1 min-w-[120px] px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/80">
            <svg class="w-3.5 h-3.5 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
            <span>${tab4Label}</span>
          </button>

          <button id="extTab_btn_od_all" onclick="switchExtendedAuthorityTab('od_all')"
            class="flex-1 min-w-[120px] px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/80">
            <svg class="w-3.5 h-3.5 shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span>${tab5Label}</span>
          </button>

          <button id="extTab_btn_all" onclick="switchExtendedAuthorityTab('all')"
            class="flex-1 min-w-[120px] px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/80">
            <svg class="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            <span>${tab6Label}</span>
          </button>
        </nav>

        <!-- ══ SECTION 1: PENDING REQUESTS (GP + OD via sub-tabs) ══ -->
        <div id="authSec_requests" class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 class="text-base md:text-lg font-bold text-white flex items-center gap-2.5">
                <span>${config.requestsTitle || 'Pending Requests'}</span>
                <span class="text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-md uppercase tracking-wider font-mono">Action Required</span>
              </h3>
              <p class="text-xs md:text-sm text-slate-400 font-medium mt-1">${config.requestsSubtitle || 'Gate Pass and On-Duty requests awaiting your review.'}</p>
            </div>
            <button onclick="refreshAllAuthorityViews(); showToast('Dashboard refreshed.', 'info', 2000);" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs md:text-sm rounded-xl border border-slate-700 transition flex items-center gap-2 active:scale-95 shadow-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Refresh Data</span>
            </button>
          </div>

          <!-- Gate Pass / OD Sub-tabs -->
          <div class="flex items-center gap-2 p-1.5 bg-slate-950/80 rounded-2xl w-fit border border-slate-800">
            <button id="authSubTab_passes" onclick="switchAuthRequestType('passes')" class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-blue-600 text-white shadow-sm border border-blue-500/50">
              <span>Gate Pass Requests</span>
              <span id="subBadge_passes" class="px-2 py-0.5 rounded-full text-[11px] bg-red-600 text-white font-bold font-mono">0</span>
            </button>
            <button id="authSubTab_onduty" onclick="switchAuthRequestType('onduty')" class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-400 hover:text-white">
              <span>On-Duty Requests</span>
              <span id="subBadge_onduty" class="px-2 py-0.5 rounded-full text-[11px] bg-blue-600 text-white font-bold font-mono">0</span>
            </button>
          </div>

          <!-- Live Search & Filter Bar on Pending Requests -->
          <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
            <div class="relative flex-1 min-w-[220px]">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </span>
              <input type="text" id="pendingQueueSearch" oninput="filterPendingQueueLive()" placeholder="Filter roll no, name, reason..." class="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono shadow-inner">
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">Filter:</span>
              <button id="chip_all" onclick="setQueueFilterChip('all')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-blue-600 text-white shadow-sm border border-blue-500/50">All</button>
              <button id="chip_hosteller" onclick="setQueueFilterChip('hosteller')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white">Hosteller</button>
              <button id="chip_dayscholar" onclick="setQueueFilterChip('dayscholar')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white">Day Scholar</button>
            </div>
          </div>

          <!-- Batch Action Floating / Sticky Toolbar -->
          <div id="batchActionBar" class="hidden flex items-center justify-between p-3.5 bg-blue-950/60 border border-blue-800/80 rounded-2xl shadow-xl">
            <div class="flex items-center gap-3">
              <span id="batchSelectedCount" class="text-xs font-black text-blue-300 uppercase tracking-wider font-mono">0 selected</span>
              <button onclick="clearBatchSelection()" class="text-xs text-slate-400 hover:text-white underline">Deselect all</button>
            </div>
            <button id="batchApproveBtn" onclick="executeBatchApproval()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/40 border border-blue-500/50 transition flex items-center gap-2 active:scale-95">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>Approve Selected</span>
            </button>
          </div>

          <!-- Pending Passes Queue -->
          <div id="authPassQueueContainer" class="overflow-x-auto rounded-2xl border border-slate-800 shadow-inner bg-slate-950/40">
            <div id="${config.queueContainerId || 'authorityRequestsQueue'}"></div>
          </div>

          <!-- Pending OD Queue -->
          <div id="authOnDutyQueueContainer" class="hidden overflow-x-auto rounded-2xl border border-slate-800 shadow-inner bg-slate-950/40">
            <div id="${config.onDutyQueueContainerId || 'authorityOnDutyQueue'}"></div>
          </div>
        </div>

        <!-- ══ SECTION 2: APPROVED REQUISITIONS (Unified GP + OD) ══ -->
        <div id="authSec_approved" class="hidden space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 class="text-base md:text-lg font-bold text-white flex items-center gap-2.5">
                <span>Approved Clearances Log</span>
                <span class="text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-md uppercase tracking-wider font-mono">Authorized</span>
              </h3>
              <p class="text-xs md:text-sm text-slate-400 font-medium mt-1">Requisitions verified by your authority level.</p>
            </div>
            <div class="flex items-center flex-wrap gap-2">
              <input type="text" id="authApprovedSearch" oninput="filterAuthorityApproved()" placeholder="Search approved..." class="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono shadow-inner">
              <button onclick="downloadApprovedCSV()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5 active:scale-95 shadow-sm">
                <span>Export CSV</span>
              </button>
            </div>
          </div>
          <div class="overflow-x-auto rounded-2xl border border-slate-800 shadow-inner bg-slate-950/40" id="authorityApprovedContainer"></div>
        </div>

        <!-- ══ SECTION 3: REJECTED REQUISITIONS (Unified GP + OD) ══ -->
        <div id="authSec_rejected" class="hidden space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 class="text-base md:text-lg font-bold text-white flex items-center gap-2.5">
                <span>Declined Applications Log</span>
                <span class="text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-md uppercase tracking-wider font-mono">Declined</span>
              </h3>
              <p class="text-xs md:text-sm text-slate-400 font-medium mt-1">Requisitions rejected with official recorded reasons.</p>
            </div>
            <input type="text" id="authRejectedSearch" oninput="filterAuthorityRejected()" placeholder="Search declined..." class="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono shadow-inner">
          </div>
          <div class="overflow-x-auto rounded-2xl border border-slate-800 shadow-inner bg-slate-950/40" id="authorityRejectedContainer"></div>
        </div>

        <!-- ══ SECTION 4: ALL GATE PASSES IN JURISDICTION ══ -->
        <div id="authSec_gp_all" class="hidden space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 class="text-base md:text-lg font-bold text-white flex items-center gap-2.5">
                <span>Complete Gate Pass Jurisdiction Dossier</span>
                <span id="extBadge_gp_all" class="text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-md uppercase font-mono">0 Passes</span>
              </h3>
              <p class="text-xs md:text-sm text-slate-400 font-medium mt-1">Full chronological audit trail of all leave passes in your jurisdiction.</p>
            </div>
            <div class="flex items-center flex-wrap gap-2">
              <input type="text" id="gpAllSearch" oninput="filterExtGPAll()" placeholder="Search roll no, name, reason..." class="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono shadow-inner">
              <button onclick="downloadGPAllCSV()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5 active:scale-95 shadow-sm">
                <span>Export CSV</span>
              </button>
            </div>
          </div>
          <div class="overflow-x-auto rounded-2xl border border-slate-800 shadow-inner bg-slate-950/40" id="extGPAllContainer"></div>
        </div>

        <!-- ══ SECTION 5: ALL OD REQUESTS IN JURISDICTION ══ -->
        <div id="authSec_od_all" class="hidden space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 class="text-base md:text-lg font-bold text-white flex items-center gap-2.5">
                <span>Complete On-Duty (OD) Jurisdiction Dossier</span>
                <span id="extBadge_od_all" class="text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 rounded-md uppercase font-mono">0 ODs</span>
              </h3>
              <p class="text-xs md:text-sm text-slate-400 font-medium mt-1">Full audit trail of all academic On-Duty requests in your jurisdiction.</p>
            </div>
            <div class="flex items-center flex-wrap gap-2">
              <input type="text" id="odAllSearch" oninput="filterExtODAll()" placeholder="Search roll no, name, reason..." class="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono shadow-inner">
              <button onclick="downloadODAllCSV()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5 active:scale-95 shadow-sm">
                <span>Export CSV</span>
              </button>
            </div>
          </div>
          <div class="overflow-x-auto rounded-2xl border border-slate-800 shadow-inner bg-slate-950/40" id="extODAllContainer"></div>
        </div>

        <!-- ══ SECTION 6: OVERALL RECORDS (GP + OD unified) ══ -->
        <div id="authSec_all" class="hidden space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 class="text-base md:text-lg font-bold text-white flex items-center gap-2.5">
                <span>Overall Records Archive</span>
                <span class="text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-md uppercase tracking-wider font-mono">Complete History</span>
              </h3>
              <p class="text-xs md:text-sm text-slate-400 font-medium mt-1">Comprehensive unified audit trail of all Gate Pass and OD requisitions in your jurisdiction.</p>
            </div>
            <div class="flex items-center flex-wrap gap-2">
              <input type="text" id="authAllRecordsSearch" oninput="filterAuthorityAllRecords()" placeholder="Search name, roll no, reason..." class="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono shadow-inner">
              <button onclick="refreshAllAuthorityViews(); showToast('Dashboard records refreshed.', 'info', 2000);" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5 active:scale-95 shadow-sm">
                <span>Refresh</span>
              </button>
            </div>
          </div>
          <div class="overflow-x-auto rounded-2xl border border-slate-800 shadow-inner bg-slate-950/40" id="authorityAllRecordsContainer"></div>
        </div>

      </div>
    </div>
  `;
  }

  // ── Executive layout for Principal and Warden ──
  const isFemale = role === 'girls_warden';
  const isWarden = role === 'boys_warden' || role === 'girls_warden';

  let kpi1Title = isWarden ? 'Active Departure Passes' : 'College Outpasses Pending';
  let kpi1Badge = isWarden ? 'Gate Clearance' : 'Executive Action';
  let kpi2Title = isWarden ? 'Cleared Hosteller Departures' : 'Executive Approvals';
  let kpi2Badge = isWarden ? 'Movement Cleared' : 'Authorized';
  let kpi3Title = isWarden ? 'Revoked / Denied Passes' : 'Declined Outpasses';
  let kpi3Badge = isWarden ? 'Revoked' : 'Declined';
  let kpi4Title = isWarden ? 'Hostel Movement Register' : 'College Outpass Volume';
  let kpi4Badge = isWarden ? 'Movement Log' : 'Master Registry';

  let tab1Label = isWarden ? 'Gate Clearance Queue' : 'College Outpass Queue';
  let tab2Label = isWarden ? 'Cleared Departures' : 'Executive Approvals';
  let tab3Label = isWarden ? 'Revoked Passes' : 'Declined Outpasses';
  let tab4Label = isWarden ? 'Hostel Movement Register' : 'College Master Archive';

  let guidanceBannerHTML = isWarden ? `
    <div class="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-2 text-slate-300">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="font-bold text-white uppercase tracking-wider font-mono">Gate Verification Desk:</span>
        <span class="text-slate-400 hidden md:inline">1. Verify Principal Approval Stamp &bull; 2. Check Hosteller Curfew & Expected Return Date/Time &bull; 3. Confirm Departure</span>
      </div>
      <span class="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-500/30">Live 3.5s Sync Active</span>
    </div>
  ` : `
    <div class="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-2 text-slate-300">
        <span class="w-2 h-2 rounded-full bg-blue-400"></span>
        <span class="font-bold text-white uppercase tracking-wider font-mono">Institutional Governance:</span>
        <span class="text-slate-400 hidden md:inline">College-Wide Outpass Final Clearance Engine &bull; Oversight across all academic engineering departments</span>
      </div>
      <span class="text-[11px] font-mono font-bold text-blue-400 bg-blue-950/60 px-2.5 py-0.5 rounded border border-blue-500/30">Institution-Wide Scope</span>
    </div>
  `;

  return `
    <div class="space-y-6">
      ${config.extraHeaderHTML || ''}
      ${guidanceBannerHTML}

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div id="kpiCard_requests" class="kpi-card active-kpi-card flex items-center justify-between p-4 md:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-95" onclick="switchAuthorityTab('requests')">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <svg class="w-6 h-6 fill-none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">${kpi1Title}</div>
              <div id="kpi_pending" class="text-2xl font-black text-white mt-0.5 font-mono">0</div>
            </div>
          </div>
          <span id="authBadge_requests" class="text-xs font-bold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-500/40">${kpi1Badge}</span>
        </div>

        <div id="kpiCard_approved" class="kpi-card flex items-center justify-between p-4 md:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg cursor-pointer transition-all hover:scale-[1.01] opacity-90 hover:opacity-100 active:scale-95" onclick="switchAuthorityTab('approved')">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <svg class="w-6 h-6 fill-none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">${kpi2Title}</div>
              <div id="kpi_approved" class="text-2xl font-black text-emerald-400 mt-0.5 font-mono">0</div>
            </div>
          </div>
          <span id="authBadge_approved" class="text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/40">${kpi2Badge}</span>
        </div>

        <div id="kpiCard_rejected" class="kpi-card flex items-center justify-between p-4 md:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg cursor-pointer transition-all hover:scale-[1.01] opacity-90 hover:opacity-100 active:scale-95" onclick="switchAuthorityTab('rejected')">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
              <svg class="w-6 h-6 fill-none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">${kpi3Title}</div>
              <div id="kpi_rejected" class="text-2xl font-black text-rose-400 mt-0.5 font-mono">0</div>
            </div>
          </div>
          <span id="authBadge_rejected" class="text-xs font-bold text-rose-300 bg-rose-950/80 px-2.5 py-1 rounded-lg border border-rose-500/40">${kpi3Badge}</span>
        </div>

        <div id="kpiCard_all" class="kpi-card flex items-center justify-between p-4 md:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg cursor-pointer transition-all hover:scale-[1.01] opacity-90 hover:opacity-100 active:scale-95" onclick="switchAuthorityTab('all')">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
              <svg class="w-6 h-6 fill-none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">${kpi4Title}</div>
              <div id="kpi_total" class="text-2xl font-black text-white mt-0.5 font-mono">0</div>
            </div>
          </div>
          <span id="authBadge_all" class="text-xs font-bold text-blue-300 bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-500/40">${kpi4Badge}</span>
        </div>
      </div>

      <div class="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 md:p-7 space-y-6 shadow-2xl">

        <!-- 4-TAB NAVIGATION BAR -->
        <nav class="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
          <button id="tab_btn_requests" onclick="switchAuthorityTab('requests')"
            class="flex-1 min-w-[120px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-blue-600 text-white shadow-md shadow-blue-900/40 border border-blue-500/50">
            <svg class="w-3.5 h-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            <span>${tab1Label}</span>
          </button>
          <button id="tab_btn_approved" onclick="switchAuthorityTab('approved')"
            class="flex-1 min-w-[120px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/80">
            <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
            <span>${tab2Label}</span>
          </button>
          <button id="tab_btn_rejected" onclick="switchAuthorityTab('rejected')"
            class="flex-1 min-w-[120px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/80">
            <svg class="w-3.5 h-3.5 text-rose-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
            <span>${tab3Label}</span>
          </button>
          <button id="tab_btn_all" onclick="switchAuthorityTab('all')"
            class="flex-1 min-w-[120px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/80">
            <svg class="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            <span>${tab4Label}</span>
          </button>
        </nav>

        <div id="authSec_requests" class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 class="text-base md:text-lg font-bold text-white flex items-center gap-2.5">
                <span>${config.requestsTitle || 'Student Leave Requests'}</span>
                <span class="text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-md uppercase tracking-wider font-mono">Action Required</span>
              </h3>
              <p class="text-xs md:text-sm text-slate-400 font-medium mt-1">${config.requestsSubtitle || 'Leave applications waiting for your action.'}</p>
            </div>
            <button onclick="refreshAllAuthorityViews(); showToast('Dashboard records refreshed.', 'info', 2000);" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs md:text-sm rounded-xl border border-slate-700 transition flex items-center gap-2 active:scale-95 shadow-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Refresh Data</span>
            </button>
          </div>
          <div id="authPassQueueContainer" class="overflow-x-auto rounded-2xl border border-slate-800 shadow-inner bg-slate-950/40">
            <div id="${config.queueContainerId || 'authorityRequestsQueue'}"></div>
          </div>
        </div>

        <div id="authSec_approved" class="hidden space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 class="text-base md:text-lg font-bold text-white flex items-center gap-2.5">
                <span>Approved Requests Log</span>
                <span class="text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-md uppercase tracking-wider font-mono">Authorized</span>
              </h3>
              <p class="text-xs md:text-sm text-slate-400 font-medium mt-1">Requisitions verified by your authority level.</p>
            </div>
            <input type="text" id="authApprovedSearch" oninput="filterAuthorityApproved()" placeholder="Search approved..." class="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono shadow-inner">
          </div>
          <div class="overflow-x-auto rounded-2xl border border-slate-800 shadow-inner bg-slate-950/40" id="authorityApprovedContainer"></div>
        </div>

        <div id="authSec_rejected" class="hidden space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 class="text-base md:text-lg font-bold text-white flex items-center gap-2.5">
                <span>Declined Applications Log</span>
                <span class="text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-md uppercase tracking-wider font-mono">Declined</span>
              </h3>
              <p class="text-xs md:text-sm text-slate-400 font-medium mt-1">Requisitions rejected with official recorded reasons.</p>
            </div>
            <input type="text" id="authRejectedSearch" oninput="filterAuthorityRejected()" placeholder="Search declined..." class="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono shadow-inner">
          </div>
          <div class="overflow-x-auto rounded-2xl border border-slate-800 shadow-inner bg-slate-950/40" id="authorityRejectedContainer"></div>
        </div>

        <div id="authSec_all" class="hidden space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 class="text-base md:text-lg font-bold text-white flex items-center gap-2.5">
                <span>Overall Historical Log</span>
                <span class="text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-md uppercase tracking-wider font-mono">History</span>
              </h3>
              <p class="text-xs md:text-sm text-slate-400 font-medium mt-1">Full chronological audit of student leave passes.</p>
            </div>
            <input type="text" id="authAllRecordsSearch" oninput="filterAuthorityAllRecords()" placeholder="Search history..." class="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono shadow-inner">
          </div>
          <div class="overflow-x-auto rounded-2xl border border-slate-800 shadow-inner bg-slate-950/40" id="authorityAllRecordsContainer"></div>
        </div>

      </div>
    </div>
  `;
}

function openDashboard(user) {
  try {
    if (!user || !user.role) {
      throw new Error('Invalid user profile or role.');
    }

    if (user.role === 'admin') {
      window.location.replace('/admin.html');
      return;
    }

    const validRoles = ['student', 'counselor', 'advisor', 'hod', 'principal', 'boys_warden', 'girls_warden'];
    if (!validRoles.includes(user.role)) {
      throw new Error(`Unrecognized authority role: ${user.role}`);
    }

    loggedUser = user;
    if (typeof window !== 'undefined') window.loggedUser = user;

    const greeting = document.getElementById('dashGreeting');
    if (greeting) greeting.innerText = `Welcome, ${user.name}`;

  const subtitles = {
    principal: 'EXECUTIVE DIRECTORATE • GRTIET Institution-Wide Clearance',
    hod: `HEAD OF DEPARTMENT • Department of ${user.dept}`,
    advisor: `CLASS ADVISOR • ${user.academicYear || '3 Year'} - ${user.dept} Sec ${user.yearSec}`,
    counselor: `CLASS COUNSELOR • Assigned Ward (${user.startRoll || 'Start'} to ${user.endRoll || 'End'})`,
    student: `STUDENT • ${user.academicYear || '3 Year'} • Dept: ${user.dept || 'Engineering'} - Sec ${user.yearSec || 'A'}`,
    boys_warden: 'HOSTEL WARDEN GOVERNANCE • Boys Hostel Clearance Portal',
    girls_warden: 'HOSTEL WARDEN GOVERNANCE • Girls Hostel Clearance Portal'
  };

  const roleSubtitle = document.getElementById('dashRoleSubtitle');
  if (roleSubtitle) roleSubtitle.innerText = subtitles[user.role] || '';

  const topPdfBtn = document.getElementById('topBulkPdfBtn');
  const topBulkLettersBtn = document.getElementById('topBulkLettersBtn');
  const clearDataBtn = document.getElementById('clearAllDataBtn');
  const studentView = document.getElementById('studentPersonalView');
  const content = document.getElementById('roleDashboardContent');

  if (wardenAutoRefreshTimer) { clearInterval(wardenAutoRefreshTimer); wardenAutoRefreshTimer = null; }
  currentAuthorityTab = 'requests';

  if (user.role === 'student') {
    if (topPdfBtn) topPdfBtn.classList.add('hidden');
    if (topBulkLettersBtn) topBulkLettersBtn.classList.add('hidden');
    if (clearDataBtn) clearDataBtn.classList.add('hidden');
    if (studentView) studentView.classList.remove('hidden');

    const nowD = new Date();
    const todayISO = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;

    if (content) {
      content.innerHTML = `
        <div class="max-w-xl mx-auto space-y-5">
          <!-- Segmented Tab Switcher (Gate Pass vs On-Duty) -->
          <div class="flex items-center justify-center p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-lg gap-2">
            <button id="stuTabBtn_pass" onclick="switchStudentPortalTab('pass')" class="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-blue-600 text-white shadow-md shadow-blue-900/40 transition flex items-center justify-center gap-2 border border-blue-500/50 active:scale-98">
              <span>Gate Pass Application</span>
            </button>
            <button id="stuTabBtn_onduty" onclick="switchStudentPortalTab('onduty')" class="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-slate-950/80 hover:bg-slate-800 text-slate-300 transition flex items-center justify-center gap-2 border border-slate-800 active:scale-98">
              <span>On-Duty Application</span>
            </button>
          </div>

          <!-- Section A: Institutional Gate Pass Form -->
          <div id="studentPassSection" class="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl text-white">
            <div class="border-b border-slate-800 pb-3">
              <h3 class="font-bold text-white text-lg">Apply for Institutional Gate Pass</h3>
              <p class="text-xs text-slate-400 mt-1">State your official reason for leaving campus during academic hours.</p>
            </div>

            <!-- Academic Standing Badge Bar -->
            <div class="flex items-center flex-wrap gap-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs sm:text-sm font-semibold text-slate-300">
              <span>Academic Standing:</span>
              <span class="font-bold text-blue-400 font-mono">${user.academicYear || '3 Year'}</span>
              <span class="text-slate-600">•</span>
              <span>Dept:</span>
              <span class="font-bold text-blue-400 font-mono">${user.dept || 'Engineering'}</span>
              <span class="text-slate-600">•</span>
              <span>Sec:</span>
              <span class="font-bold text-blue-400 font-mono">${user.yearSec || 'A'}</span>
              <span class="text-slate-600">•</span>
              ${formatAccommodationBadge(user.accommodation)}
            </div>

            ${(/hoste?l|^h$/i.test(user.accommodation || '') && !/day/i.test(user.accommodation || ''))
              ? `<div class="space-y-3.5 p-4 rounded-2xl bg-blue-950/20 border border-blue-900/40">
                  <div class="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-wider font-mono">
                    <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <span>Hosteller Gate Pass Schedule</span>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Departure Date <span class="text-blue-400">*</span></label>
                      <input type="date" id="departureDate" required class="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-blue-500 transition" />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Departure Time <span class="text-blue-400">*</span></label>
                      <input type="time" id="departureTime" required class="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-blue-500 transition" />
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Expected Return Date <span class="text-blue-400">*</span></label>
                      <input type="date" id="expectedReturnDate" required class="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-blue-500 transition" />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Expected Return Time <span class="text-blue-400">*</span></label>
                      <input type="time" id="expectedReturnTime" required class="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-blue-500 transition" />
                    </div>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Official Reason <span class="text-blue-400">*</span></label>
                  <textarea id="passReason" rows="3" placeholder="Enter reason manually..." class="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 transition text-white"></textarea>
                </div>`
              : `<div class="space-y-3.5 p-4 rounded-2xl bg-blue-950/20 border border-blue-900/40">
                  <div class="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-wider font-mono">
                    <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span>Day Scholar Gate Pass Timing</span>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Date <span class="text-blue-400">*</span></label>
                      <input type="date" id="dayScholarDate" value="${todayISO}" required class="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-blue-500 transition" />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Exit Time <span class="text-blue-400">*</span></label>
                      <input type="time" id="dayScholarTime" required class="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-blue-500 transition" />
                    </div>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Official Reason <span class="text-blue-400">*</span></label>
                  <textarea id="passReason" rows="3" placeholder="Enter reason manually..." class="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 transition text-white"></textarea>
                </div>`
            }
            <button onclick="submitStudentPass('${user.userId}')" class="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-900/40 border border-blue-500/50 transition active:scale-98 flex items-center justify-center gap-2">
              <span>Submit Gate Pass Application</span>
            </button>
          </div>

          <!-- Section B: Academic On-Duty (OD) Form -->
          <div id="studentOnDutySection" class="hidden bg-slate-900/95 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl text-white">
            <div class="border-b border-slate-800 pb-3">
              <h3 class="font-bold text-white text-lg">Apply for Academic On-Duty (OD)</h3>
              <p class="text-xs text-slate-400 mt-1">Approval pipeline: Counsellor &rarr; Class Advisor &rarr; HOD &rarr; Completed</p>
            </div>
            <div class="flex items-center flex-wrap gap-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs sm:text-sm font-semibold text-slate-300">
              <span>Academic Standing:</span>
              <span class="font-bold text-blue-400 font-mono">${user.academicYear || '3 Year'}</span>
              <span class="text-slate-600">•</span>
              <span>Dept:</span>
              <span class="font-bold text-blue-400 font-mono">${user.dept || 'Engineering'}</span>
              <span class="text-slate-600">•</span>
              <span>Sec:</span>
              <span class="font-bold text-blue-400 font-mono">${user.yearSec || 'A'}</span>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Select On-Duty Duration Format</label>
              <div class="flex gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
                <button type="button" id="odModeBtn_dates" onclick="setODTimingMode('dates')" class="flex-1 py-2 px-3 text-xs font-bold rounded-lg bg-blue-600 text-white shadow-sm transition">Date Range (From - To Date)</button>
                <button type="button" id="odModeBtn_time" onclick="setODTimingMode('time')" class="flex-1 py-2 px-3 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition">Specific Time Duration</button>
              </div>
            </div>
            <div id="odDateRangeFields" class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">From Date <span class="text-blue-400">*</span></label>
                <input type="date" id="odFromDate" class="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">To Date <span class="text-blue-400">*</span></label>
                <input type="date" id="odToDate" class="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div id="odTimeFields" class="hidden space-y-3">
              <div>
                <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Date of On-Duty <span class="text-blue-400">*</span></label>
                <input type="date" id="odSpecificDate" class="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">From Time <span class="text-blue-400">*</span></label>
                  <input type="time" id="odFromTime" class="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">To Time <span class="text-blue-400">*</span></label>
                  <input type="time" id="odToTime" class="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Academic Event / Purpose <span class="text-blue-400">*</span></label>
              <textarea id="odReason" rows="3" placeholder="Enter academic/institutional purpose..." class="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition text-white"></textarea>
            </div>
            <button onclick="submitStudentOnDuty('${user.userId}')" class="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-900/40 border border-blue-500/50 transition active:scale-98 flex items-center justify-center gap-2">
              <span>Submit On-Duty Request</span>
            </button>
          </div>
        </div>
      `;
    }
    if (typeof switchStudentPortalTab === 'function') switchStudentPortalTab('pass');
    else loadStudentPersonalStatus();
  } else {
    if (studentView) studentView.classList.add('hidden');
    if (topPdfBtn) topPdfBtn.classList.remove('hidden');
    if (topBulkLettersBtn) topBulkLettersBtn.classList.remove('hidden');
    if (clearDataBtn) clearDataBtn.classList.remove('hidden');

    if (user.role === 'counselor') {
      const counselorConfig = {
        requestsTitle: 'Counselor Review & Verification Queue',
        requestsSubtitle: 'Verify student leave reasons via parent phone call and endorse legitimate requests to Class Advisor.',
        queueContainerId: 'counselorQueue',
        hasOnDutyQueue: true,
        onDutyQueueContainerId: 'counselorODQueue',
        extraHeaderHTML: `
          <div class="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-white text-base md:text-lg">Class Counselor Verification Desk</h3>
                  <span class="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold rounded-md border border-emerald-500/30">Review Authority</span>
                </div>
                <p class="text-xs text-slate-400">Assigned Ward Jurisdiction: <span class="font-mono font-bold bg-slate-950 px-2.5 py-1 rounded-md border border-emerald-500/40 text-emerald-300">${user.startRoll || 'Start'} &rarr; ${user.endRoll || 'End'}</span></p>
              </div>
              <div class="flex items-center gap-2 text-xs text-slate-300 font-mono bg-slate-950/90 px-3.5 py-2 rounded-xl border border-slate-800">
                <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                <span>Parent Call Verification Required</span>
              </div>
            </div>
            <div class="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div class="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center gap-2.5 text-slate-300">
                <span class="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <span>Call parent via listed contact to verify reason</span>
              </div>
              <div class="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center gap-2.5 text-slate-300">
                <span class="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <span>Check supporting documents / medical proof</span>
              </div>
              <div class="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center gap-2.5 text-slate-300">
                <span class="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                <span>Confirm parent check & endorse to Advisor</span>
              </div>
            </div>
          </div>
        `
      };
      if (content) content.innerHTML = getAuthorityDashboardHTML(user, counselorConfig);
    } else if (user.role === 'advisor') {
      const advisorConfig = {
        requestsTitle: `Class Advisor Review Queue (${user.dept} - Section ${user.yearSec})`,
        requestsSubtitle: 'Students pre-screened by counselors awaiting Class Advisor endorsement to Head of Department.',
        queueContainerId: 'advisorQueue',
        hasOnDutyQueue: true,
        onDutyQueueContainerId: 'advisorODQueue',
        extraHeaderHTML: `
          <div class="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-white text-base md:text-lg">Class Advisor • Academic Roster Management</h3>
                  <span class="px-2.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-mono font-bold rounded-md border border-blue-500/30">Class Governance</span>
                </div>
                <p class="text-xs text-slate-400 font-mono">Department: <span class="font-bold text-blue-400">${user.dept}</span> &bull; Section: <span class="font-bold text-blue-400">${user.yearSec}</span> &bull; Standing: <span class="font-bold text-blue-400">${user.academicYear || '3 Year'}</span></p>
              </div>
              <div class="flex items-center gap-2 text-xs text-slate-300 font-mono bg-slate-950/90 px-3.5 py-2 rounded-xl border border-slate-800">
                <span class="w-2 h-2 rounded-full bg-blue-400"></span>
                <span>Pre-Screened by Counselors</span>
              </div>
            </div>
            <div class="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
              <div class="flex items-center gap-2">
                <span class="font-bold text-white font-mono uppercase tracking-wider">Workflow Pipeline:</span>
                <span class="px-2 py-0.5 bg-emerald-950/60 text-emerald-400 rounded border border-emerald-500/30 font-semibold">1. Counselor Verified &check;</span>
                <span class="text-slate-600">&rarr;</span>
                <span class="px-2 py-0.5 bg-blue-950/60 text-blue-300 rounded border border-blue-500/30 font-bold">2. Advisor Endorsement (Current)</span>
                <span class="text-slate-600">&rarr;</span>
                <span class="px-2 py-0.5 bg-slate-950/80 text-slate-400 rounded border border-slate-800 font-semibold">3. HOD Approval</span>
              </div>
            </div>
          </div>
        `
      };
      if (content) content.innerHTML = getAuthorityDashboardHTML(user, advisorConfig);
    } else if (user.role === 'hod') {
      const hodConfig = {
        requestsTitle: `Head of Department Queue (${user.dept} Department)`,
        requestsSubtitle: 'Department-level pass endorsements and final authorization for Academic On-Duty (OD) applications.',
        queueContainerId: 'hodQueue',
        hasOnDutyQueue: true,
        onDutyQueueContainerId: 'hodODQueue',
        extraHeaderHTML: `
          <div class="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-white text-base md:text-lg">Department Directorate &bull; ${user.dept} Engineering</h3>
                  <span class="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs font-mono font-bold rounded-md border border-indigo-500/30">Executive Sanction</span>
                </div>
                <p class="text-xs text-slate-400">Final Sanction Authority for Academic On-Duty (OD) &bull; Department Gate Pass Clearance</p>
              </div>
              <div class="flex items-center gap-2 text-xs text-slate-300 font-mono bg-slate-950/90 px-3.5 py-2 rounded-xl border border-slate-800">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Department Clearance Active</span>
              </div>
            </div>
            <div class="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div class="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center justify-between text-slate-300 font-mono">
                <span class="text-slate-400">Academic OD Sanctions:</span>
                <span class="font-bold text-indigo-400">Final Approval Tier</span>
              </div>
              <div class="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center justify-between text-slate-300 font-mono">
                <span class="text-slate-400">Gate Pass Endorsements:</span>
                <span class="font-bold text-blue-400">Forward to Principal</span>
              </div>
            </div>
          </div>
        `
      };
      if (content) content.innerHTML = getAuthorityDashboardHTML(user, hodConfig);
    } else if (user.role === 'principal') {
      const principalConfig = {
        requestsTitle: 'Executive Directorate Outpass Clearance Queue',
        requestsSubtitle: 'College-wide outpass requisitions endorsed across all departments for final Institutional clearance.',
        queueContainerId: 'principalQueue',
        extraHeaderHTML: `
          <div class="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-white text-base md:text-lg">Principal Executive Directorate</h3>
                  <span class="px-2.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-mono font-bold rounded-md border border-blue-500/30">Institutional Governance</span>
                </div>
                <p class="text-xs text-slate-400">GRT Institute of Engineering and Technology &bull; College-Wide Outpass Clearance Engine</p>
              </div>
              <div class="flex items-center gap-2 text-xs text-slate-300 font-mono bg-slate-950/90 px-3.5 py-2 rounded-xl border border-slate-800">
                <span class="w-2 h-2 rounded-full bg-blue-400"></span>
                <span>Institution-Wide Governance</span>
              </div>
            </div>
            <div class="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
              <div>Jurisdiction: <span class="font-bold text-white">All Engineering Departments (CSE, ECE, EEE, MECH, CIVIL, IT, BME, AIDS, MBA)</span></div>
              <div class="text-emerald-400 font-bold">Autonomous Institutional Authority</div>
            </div>
          </div>
        `
      };
      if (content) content.innerHTML = getAuthorityDashboardHTML(user, principalConfig);
    } else if (user.role === 'boys_warden' || user.role === 'girls_warden') {
      const isFemale = user.role === 'girls_warden';
      const wardenConfig = {
        requestsTitle: `${isFemale ? 'Girls' : 'Boys'} Hostel Student Leave Requests`,
        requestsSubtitle: `Approved leave requests received after Principal approval for ${isFemale ? 'Girls' : 'Boys'} Hostel clearance.`,
        queueContainerId: 'wardenRequestsTableContainer',
        extraHeaderHTML: `
          <div class="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-white text-base md:text-lg">${isFemale ? 'Girls' : 'Boys'} Hostel Movement & Gate Desk</h3>
                  <span class="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold rounded-md border border-emerald-500/30">Gate Clearance</span>
                </div>
                <p class="text-xs text-slate-400 font-mono">${isFemale ? 'Female' : 'Male'} Hostellers Only &bull; Gate Window & Movement Verification</p>
              </div>
              <div class="flex items-center gap-2 text-xs text-slate-300 font-mono bg-slate-950/90 px-3.5 py-2 rounded-xl border border-slate-800">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Real-Time 3.5s Movement Sync</span>
              </div>
            </div>
            <div class="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
              <div class="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center gap-2">
                <span class="font-bold text-blue-400 font-mono">1.</span>
                <span>Verify Principal Approval Stamp</span>
              </div>
              <div class="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center gap-2">
                <span class="font-bold text-blue-400 font-mono">2.</span>
                <span>Check Curfew & Return Date/Time</span>
              </div>
              <div class="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center gap-2">
                <span class="font-bold text-emerald-400 font-mono">3.</span>
                <span>Log Gate Exit & Physical Departure</span>
              </div>
            </div>
          </div>
        `
      };
      if (content) content.innerHTML = getAuthorityDashboardHTML(user, wardenConfig);
      wardenAutoRefreshTimer = setInterval(() => {
        if (loggedUser && (loggedUser.role === 'boys_warden' || loggedUser.role === 'girls_warden')) refreshAllAuthorityViews();
      }, 3500);
    }

    refreshAllAuthorityViews();
  }

  // Safely show dashboard and hide login portal only after complete successful rendering
  document.getElementById('singleLoginPortalScreen')?.classList.add('hidden');
  document.getElementById('authScreen')?.classList.add('hidden');
  document.getElementById('dashScreen')?.classList.remove('hidden');

} catch (err) {
  console.error('Fatal error initializing authorized dashboard:', err);
  document.getElementById('dashScreen')?.classList.add('hidden');
  document.getElementById('singleLoginPortalScreen')?.classList.remove('hidden');
  sessionStorage.removeItem('campusPassUser');
  localStorage.removeItem('campusPassUser');
  if (typeof showToast === 'function') {
    showToast('Failed to initialize dashboard. Returning to login.', 'error', 4000);
  }
}
}

function refreshAllAuthorityViews() {
  if (!loggedUser) return;
  if (loggedUser.role === 'counselor') { fetchCounselorQueue(); if (typeof fetchCounselorODQueue === 'function') fetchCounselorODQueue(); }
  if (loggedUser.role === 'advisor') { fetchAdvisorQueue(); if (typeof fetchAdvisorODQueue === 'function') fetchAdvisorODQueue(); }
  if (loggedUser.role === 'hod') { fetchHODQueue(); if (typeof fetchHODODQueue === 'function') fetchHODODQueue(); }
  if (loggedUser.role === 'principal') fetchPrincipalQueue();
  if (loggedUser.role === 'boys_warden' || loggedUser.role === 'girls_warden') fetchWardenLeaveRequests(loggedUser.role);
  loadUniversalLogs();
}

function logout() {
  if (wardenAutoRefreshTimer) { clearInterval(wardenAutoRefreshTimer); wardenAutoRefreshTimer = null; }
  loggedUser = null;
  sessionStorage.removeItem('campusPassUser');
  localStorage.removeItem('campusPassUser');
  sessionStorage.clear();
  const idInput = document.getElementById('commonLoginId');
  const passInput = document.getElementById('commonPassword');
  if (idInput) idInput.value = '';
  if (passInput) passInput.value = '';
  document.getElementById('dashScreen')?.classList.add('hidden');
  document.getElementById('singleLoginPortalScreen')?.classList.remove('hidden');
  if (window.history && window.history.replaceState) window.history.replaceState(null, '', '/');
  window.location.replace('/');
}

window.openDashboard = openDashboard;
window.refreshAllAuthorityViews = refreshAllAuthorityViews;
window.logout = logout;

// Live Queue Filtering & Search
let currentQueueChipFilter = 'all';

function setQueueFilterChip(chipType) {
  currentQueueChipFilter = chipType;
  const chips = ['all', 'hosteller', 'dayscholar'];
  chips.forEach(c => {
    const el = document.getElementById(`chip_${c}`);
    if (el) {
      if (c === chipType) {
        el.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-blue-600 text-white shadow-sm border border-blue-500/50';
      } else {
        el.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white';
      }
    }
  });
  filterPendingQueueLive();
}

function filterPendingQueueLive() {
  const query = (document.getElementById('pendingQueueSearch')?.value || '').toLowerCase().trim();
  const rows = document.querySelectorAll('.pending-queue-row');

  rows.forEach(row => {
    const accom = (row.getAttribute('data-accommodation') || '').toLowerCase();
    const text = (row.getAttribute('data-search') || row.innerText || '').toLowerCase();

    let matchesChip = true;
    if (currentQueueChipFilter === 'hosteller') {
      matchesChip = accom.includes('hostel') || accom.includes('hosteller');
    } else if (currentQueueChipFilter === 'dayscholar') {
      matchesChip = accom.includes('day');
    }

    let matchesQuery = true;
    if (query) {
      matchesQuery = text.includes(query);
    }

    if (matchesChip && matchesQuery) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });

  updateBatchActionBar();
}

function toggleSelectAllBatch(masterCb) {
  const isChecked = !!masterCb?.checked;
  const visibleRows = Array.from(document.querySelectorAll('.pending-queue-row')).filter(r => r.style.display !== 'none');
  visibleRows.forEach(row => {
    const cb = row.querySelector('.batch-select-cb');
    if (cb) cb.checked = isChecked;
  });
  updateBatchActionBar();
}

function updateBatchActionBar() {
  const selectedCbs = document.querySelectorAll('.batch-select-cb:checked');
  const count = selectedCbs.length;
  const bar = document.getElementById('batchActionBar');
  const countEl = document.getElementById('batchSelectedCount');
  if (!bar) return;

  if (count > 0) {
    bar.classList.remove('hidden');
    if (countEl) countEl.innerText = `${count} selected`;
  } else {
    bar.classList.add('hidden');
    const masterCbs = document.querySelectorAll('#selectAllBatch');
    masterCbs.forEach(cb => cb.checked = false);
  }
}

function clearBatchSelection() {
  document.querySelectorAll('.batch-select-cb').forEach(cb => cb.checked = false);
  const masterCbs = document.querySelectorAll('#selectAllBatch');
  masterCbs.forEach(cb => cb.checked = false);
  updateBatchActionBar();
}

async function executeBatchApproval() {
  const selectedCbs = Array.from(document.querySelectorAll('.batch-select-cb:checked'));
  const ids = selectedCbs.map(cb => cb.value).filter(Boolean);
  if (ids.length === 0) {
    showToast('No requisitions selected.', 'info', 2500);
    return;
  }

  const confirmMsg = `Are you sure you want to approve ${ids.length} selected request(s)?`;
  if (!confirm(confirmMsg)) return;

  const btn = document.getElementById('batchApproveBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>Processing...</span>`;
  }

  try {
    const res = await Api.post('/api/approvals/bulk', {
      passIds: ids,
      role: loggedUser?.role,
      authorityName: loggedUser?.name,
      parentCalled: true
    });

    if (res && res.success) {
      showToast(res.message || `Successfully approved ${ids.length} items!`, 'success', 3500);
      clearBatchSelection();
      refreshAllAuthorityViews();
    } else {
      showToast(res?.message || 'Bulk approval failed.', 'error', 3500);
    }
  } catch (err) {
    console.error('Batch approval error:', err);
    showToast('Failed to perform batch approval.', 'error', 3500);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg><span>Approve Selected</span>`;
    }
  }
}

// Global Keyboard Navigation & Accessibility Shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const rejectModal = document.getElementById('rejectModal');
    if (rejectModal && !rejectModal.classList.contains('hidden')) {
      if (typeof closeRejectModal === 'function') closeRejectModal();
    }
    const detailsModal = document.getElementById('detailsModal');
    if (detailsModal && !detailsModal.classList.contains('hidden')) {
      if (typeof closeDetailsModal === 'function') closeDetailsModal();
    }
    const formalModal = document.getElementById('letterModal');
    if (formalModal && !formalModal.classList.contains('hidden')) {
      if (typeof closeLetterModal === 'function') closeLetterModal();
    }
  }
  if ((e.key === 'a' || e.key === 'A') && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    const bar = document.getElementById('batchActionBar');
    if (bar && !bar.classList.contains('hidden')) {
      executeBatchApproval();
    }
  }
});

window.setQueueFilterChip = setQueueFilterChip;
window.filterPendingQueueLive = filterPendingQueueLive;
window.toggleSelectAllBatch = toggleSelectAllBatch;
window.updateBatchActionBar = updateBatchActionBar;
window.clearBatchSelection = clearBatchSelection;
window.executeBatchApproval = executeBatchApproval;
