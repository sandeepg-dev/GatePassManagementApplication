/**
 * Campus PassPro • Dynamic Dashboard Orchestrator & View Controller
 * GRT Institute of Engineering and Technology (Autonomous)
 * Bespoke Role-Based Layouts: Student, Counselor, Advisor, HOD, Principal, Warden
 */

let wardenAutoRefreshTimer = null;
let currentAuthorityTab = 'requests';
let currentQueueChipFilter = 'all';

/**
 * Universal Authority Tab Switcher
 * Handles Counselor, Advisor, HOD, Principal, and Warden tabs
 */
function switchAuthorityTab(tabName) {
  currentAuthorityTab = tabName;

  // Deactivate all tab buttons
  document.querySelectorAll('.role-tab-btn').forEach(btn => {
    btn.classList.remove('active-tab', 'bg-white', 'text-slate-900', 'shadow-xs');
    btn.classList.add('text-slate-600');
  });

  // Activate selected tab button
  const activeBtn = document.getElementById(`roleTabBtn_${tabName}`) || document.getElementById(`extTab_btn_${tabName}`);
  if (activeBtn) {
    activeBtn.classList.add('active-tab', 'bg-white', 'text-slate-900', 'shadow-xs');
    activeBtn.classList.remove('text-slate-600');
  }

  // Hide all authority sections
  const sections = ['requests', 'onduty', 'approved', 'rejected', 'gp_all', 'od_all', 'all'];
  sections.forEach(sec => {
    const secEl = document.getElementById(`authSec_${sec}`);
    if (secEl) secEl.classList.add('hidden');
  });

  // Show selected section
  const targetSec = document.getElementById(`authSec_${tabName}`);
  if (targetSec) {
    targetSec.classList.remove('hidden');
  }

  // If selecting OD tab for Counselor/Advisor/HOD, ensure OD queue is rendered
  if (tabName === 'onduty' && typeof window.refreshAllAuthorityViews === 'function') {
    if (window.loggedUser) {
      if (window.loggedUser.role === 'counselor' && typeof fetchCounselorODQueue === 'function') fetchCounselorODQueue();
      if (window.loggedUser.role === 'advisor' && typeof fetchAdvisorODQueue === 'function') fetchAdvisorODQueue();
      if (window.loggedUser.role === 'hod' && typeof fetchHODODQueue === 'function') fetchHODODQueue();
    }
  }
}

// Backward-compatibility aliases
function switchExtendedAuthorityTab(tabName) {
  switchAuthorityTab(tabName);
}

window.switchAuthorityTab = switchAuthorityTab;
window.switchExtendedAuthorityTab = switchExtendedAuthorityTab;

/**
 * Student 3-View Segmented Switcher:
 * 'pass' -> Gate Pass Application
 * 'onduty' -> On-Duty Application
 * 'status' -> My Requests & Live Sign-Off Tracker
 */
function switchStudentPortalTab(tab) {
  const passBtn = document.getElementById('stuTabBtn_pass');
  const odBtn = document.getElementById('stuTabBtn_onduty');
  const statusBtn = document.getElementById('stuTabBtn_status');

  const passSec = document.getElementById('studentPassSection');
  const odSec = document.getElementById('studentOnDutySection');
  const personalView = document.getElementById('studentPersonalView');
  const odHistoryView = document.getElementById('studentOnDutyHistoryView');

  // Reset tab button states
  [passBtn, odBtn, statusBtn].forEach(b => {
    if (b) {
      b.className = 'flex-1 py-2 px-3 text-xs md:text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1.5';
    }
  });

  // Hide all views
  if (passSec) passSec.classList.add('hidden');
  if (odSec) odSec.classList.add('hidden');
  if (personalView) personalView.classList.add('hidden');
  if (odHistoryView) odHistoryView.classList.add('hidden');

  if (tab === 'pass') {
    if (passBtn) passBtn.className = 'flex-1 py-2 px-3 text-xs md:text-sm font-bold rounded-lg bg-white text-slate-900 shadow-xs border border-slate-200/80 transition flex items-center justify-center gap-1.5';
    if (passSec) passSec.classList.remove('hidden');
  } else if (tab === 'onduty') {
    if (odBtn) odBtn.className = 'flex-1 py-2 px-3 text-xs md:text-sm font-bold rounded-lg bg-white text-indigo-700 shadow-xs border border-slate-200/80 transition flex items-center justify-center gap-1.5';
    if (odSec) odSec.classList.remove('hidden');
  } else if (tab === 'status') {
    if (statusBtn) statusBtn.className = 'flex-1 py-2 px-3 text-xs md:text-sm font-bold rounded-lg bg-white text-slate-900 shadow-xs border border-slate-200/80 transition flex items-center justify-center gap-1.5';
    if (personalView) personalView.classList.remove('hidden');
    if (odHistoryView) odHistoryView.classList.remove('hidden');

    if (typeof loadStudentPersonalStatus === 'function') loadStudentPersonalStatus();
    if (typeof loadStudentOnDutyStatus === 'function') loadStudentOnDutyStatus();
  }
}
window.switchStudentPortalTab = switchStudentPortalTab;

/**
 * Filter live search for All Gate Passes in jurisdiction
 */
function filterExtGPAll() {
  const query = (document.getElementById('gpAllSearch')?.value || '').toLowerCase().trim();
  const list = window.cachedGPAllRecords || [];
  if (!query) { if (typeof renderExtGPAllSection === 'function') renderExtGPAllSection(list); return; }
  if (typeof renderExtGPAllSection === 'function') {
    renderExtGPAllSection(list.filter(p =>
      (p.rollNo && p.rollNo.toLowerCase().includes(query)) ||
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.dept && p.dept.toLowerCase().includes(query)) ||
      (p.status && p.status.toLowerCase().includes(query))
    ));
  }
}
window.filterExtGPAll = filterExtGPAll;

/**
 * Filter live search for All OD Requests in jurisdiction
 */
function filterExtODAll() {
  const query = (document.getElementById('odAllSearch')?.value || '').toLowerCase().trim();
  const list = window.cachedODAllRecords || [];
  if (!query) { if (typeof renderExtODAllSection === 'function') renderExtODAllSection(list); return; }
  if (typeof renderExtODAllSection === 'function') {
    renderExtODAllSection(list.filter(p =>
      (p.rollNo && p.rollNo.toLowerCase().includes(query)) ||
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.dept && p.dept.toLowerCase().includes(query)) ||
      (p.status && p.status.toLowerCase().includes(query))
    ));
  }
}
window.filterExtODAll = filterExtODAll;

/* ═════════════════════════════════════════════════════════════════════════
   BESPOKE ROLE DASHBOARD RENDERERS
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * 1. STUDENT DASHBOARD
 */
function getStudentDashboardHTML(user) {
  const nowD = new Date();
  const todayISO = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(nowD.getDate()).padStart(2, '0')}`;
  const isHosteller = (/hoste?l|^h$/i.test(user.accommodation || '') && !/day/i.test(user.accommodation || ''));

  return `
    <div class="space-y-6">
      <!-- Student Profile & Standing Strip -->
      <div class="jurisdiction-card flex flex-wrap items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h3 class="text-base sm:text-lg font-bold text-slate-900">${escapeHtml(user.name)}</h3>
            <span class="font-mono text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">${escapeHtml(user.userId)}</span>
          </div>
          <p class="text-xs text-slate-500 font-medium">
            ${escapeHtml(user.academicYear || '3 Year')} • Department of ${escapeHtml(user.dept || 'CSE')} (Section ${escapeHtml(user.yearSec || 'A')})
          </p>
        </div>
        <div class="flex items-center gap-2">
          ${formatAccommodationBadge(user.accommodation)}
        </div>
      </div>

      <!-- Segmented Navigation (3 Clear Actions) -->
      <div class="max-w-xl mx-auto flex p-1 bg-slate-200/80 rounded-xl border border-slate-300/80 gap-1">
        <button id="stuTabBtn_pass" onclick="switchStudentPortalTab('pass')"
          class="flex-1 py-2 px-3 text-xs md:text-sm font-bold rounded-lg bg-white text-slate-900 shadow-xs border border-slate-200/80 transition flex items-center justify-center gap-1.5">
          <span>Apply Gate Pass</span>
        </button>
        <button id="stuTabBtn_onduty" onclick="switchStudentPortalTab('onduty')"
          class="flex-1 py-2 px-3 text-xs md:text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1.5">
          <span>Apply On-Duty (OD)</span>
        </button>
        <button id="stuTabBtn_status" onclick="switchStudentPortalTab('status')"
          class="flex-1 py-2 px-3 text-xs md:text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1.5">
          <span>Live Status & History</span>
        </button>
      </div>

      <!-- VIEW 1: GATE PASS APPLICATION FORM -->
      <div id="studentPassSection" class="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div class="border-b border-slate-100 pb-3">
          <h4 class="font-bold text-slate-900 text-base">Gate Pass Application</h4>
          <p class="text-xs text-slate-500 mt-0.5">Clearance routes to your Class Counselor & Class Advisor for verification.</p>
        </div>

        ${isHosteller
          ? `<!-- Hosteller Schedule Fields -->
            <div class="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
              <div class="text-xs font-bold text-amber-900 uppercase tracking-wider">Hosteller Schedule Details</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Departure Date <span class="text-red-600">*</span></label>
                  <input type="date" id="departureDate" required class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Departure Time <span class="text-red-600">*</span></label>
                  <input type="time" id="departureTime" required class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition" />
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Expected Return Date <span class="text-red-600">*</span></label>
                  <input type="date" id="expectedReturnDate" required class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Expected Return Time <span class="text-red-600">*</span></label>
                  <input type="time" id="expectedReturnTime" required class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition" />
                </div>
              </div>
            </div>`
          : `<!-- Day Scholar Schedule Fields -->
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div class="text-xs font-bold text-slate-800 uppercase tracking-wider">Day Scholar Schedule</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Date <span class="text-red-600">*</span></label>
                  <input type="date" id="dayScholarDate" value="${todayISO}" required class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Outpass Time <span class="text-red-600">*</span></label>
                  <input type="time" id="dayScholarTime" required class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-red-600 transition" />
                </div>
              </div>
            </div>`
        }

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Official Reason for Outpass <span class="text-red-600">*</span></label>
          <textarea id="passReason" rows="3" placeholder="Provide accurate and specific reason..." class="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-red-600 focus:bg-white transition text-slate-800"></textarea>
        </div>

        <button onclick="submitStudentPass('${escapeHtml(user.userId)}')" class="w-full py-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition active:scale-98 flex items-center justify-center gap-2">
          <span>Submit Gate Pass Application</span>
        </button>
      </div>

      <!-- VIEW 2: ON-DUTY (OD) APPLICATION FORM -->
      <div id="studentOnDutySection" class="hidden max-w-xl mx-auto bg-white border border-indigo-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div class="border-b border-slate-100 pb-3">
          <h4 class="font-bold text-slate-900 text-base">Academic On-Duty (OD) Requisition</h4>
          <p class="text-xs text-slate-500 mt-0.5">Approval Hierarchy: Counselor &rarr; Class Advisor &rarr; Head of Department (HOD).</p>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Duration Format</label>
          <div class="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button type="button" id="odModeBtn_dates" onclick="setODTimingMode('dates')" class="flex-1 py-1.5 px-3 text-xs font-bold rounded-lg bg-indigo-600 text-white shadow-xs transition">Date Range</button>
            <button type="button" id="odModeBtn_time" onclick="setODTimingMode('time')" class="flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition">Specific Time Duration</button>
          </div>
        </div>

        <div id="odDateRangeFields" class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">From Date <span class="text-red-500">*</span></label>
            <input type="date" id="odFromDate" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">To Date <span class="text-red-500">*</span></label>
            <input type="date" id="odToDate" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white" />
          </div>
        </div>

        <div id="odTimeFields" class="hidden space-y-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Date of OD <span class="text-red-500">*</span></label>
            <input type="date" id="odSpecificDate" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">From Time <span class="text-red-500">*</span></label>
              <input type="time" id="odFromTime" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">To Time <span class="text-red-500">*</span></label>
              <input type="time" id="odToTime" class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white" />
            </div>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Official Academic Duty Purpose <span class="text-red-500">*</span></label>
          <textarea id="odReason" rows="3" placeholder="State the academic purpose, competition, or departmental assignment..." class="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition text-slate-800"></textarea>
        </div>

        <button onclick="submitStudentOnDuty('${escapeHtml(user.userId)}')" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition active:scale-98 flex items-center justify-center gap-2">
          <span>Submit On-Duty Application</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * 2. COUNSELOR DASHBOARD
 * Core Mission: Parent Call Verification & First-Tier Review
 */
function getCounselorDashboardHTML(user) {
  return `
    <div class="space-y-6">
      <!-- Counselor Ward Jurisdiction Banner -->
      <div class="jurisdiction-card flex flex-wrap items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h3 class="text-base sm:text-lg font-bold text-slate-900">Class Counselor Ward Jurisdiction</h3>
            <span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">Tier 1 Verification</span>
          </div>
          <p class="text-xs text-slate-600 font-mono">
            Assigned Ward: <span class="font-bold text-slate-900">${user.startRoll || 'Start'}</span> to <span class="font-bold text-slate-900">${user.endRoll || 'End'}</span> • Mandatory Parent Call Confirmation
          </p>
        </div>
        <button onclick="refreshAllAuthorityViews(); showToast('Counselor queue refreshed.', 'info', 2000);"
          class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center gap-1.5 active:scale-95">
          <span>Refresh Queue</span>
        </button>
      </div>

      <!-- Navigation Tabs (Dedicated 5 Sections) -->
      <div class="role-tab-bar">
        <button id="roleTabBtn_requests" onclick="switchAuthorityTab('requests')" class="role-tab-btn active-tab bg-white text-slate-900 shadow-xs">
          <span>Pending Parent Calls</span>
          <span id="authBadge_requests" class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white leading-none">0</span>
        </button>
        <button id="roleTabBtn_onduty" onclick="switchAuthorityTab('onduty')" class="role-tab-btn text-slate-600">
          <span>On-Duty Queue</span>
          <span id="subBadge_onduty" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 leading-none">0</span>
        </button>
        <button id="roleTabBtn_approved" onclick="switchAuthorityTab('approved')" class="role-tab-btn text-slate-600">
          <span>Forwarded to Advisor</span>
          <span id="authBadge_approved" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 leading-none">0</span>
        </button>
        <button id="roleTabBtn_rejected" onclick="switchAuthorityTab('rejected')" class="role-tab-btn text-slate-600">
          <span>Declined Requests</span>
          <span id="authBadge_rejected" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 leading-none">0</span>
        </button>
        <button id="roleTabBtn_all" onclick="switchAuthorityTab('all')" class="role-tab-btn text-slate-600">
          <span>Ward Audit Ledger</span>
        </button>
      </div>

      <!-- Main Section Container -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
        <!-- SECTION 1: PENDING PARENT CALLS -->
        <div id="authSec_requests" class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div class="relative flex-1 min-w-[220px]">
              <input type="text" id="pendingQueueSearch" oninput="filterPendingQueueLive()" placeholder="Filter roll, student name, reason..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white transition" />
            </div>
            <div class="flex items-center gap-1 text-xs font-bold">
              <button onclick="setQueueFilterChip('all')" id="chip_all" class="px-3 py-1.5 rounded-lg bg-slate-900 text-white transition">All</button>
              <button onclick="setQueueFilterChip('hosteller')" id="chip_hosteller" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Hosteller</button>
              <button onclick="setQueueFilterChip('dayscholar')" id="chip_dayscholar" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Day Scholar</button>
            </div>
          </div>
          <div id="authPassQueueContainer" class="overflow-x-auto rounded-xl border border-slate-200">
            <div id="counselorQueue"></div>
          </div>

          <!-- Batch Action Bar -->
          <div id="batchActionBar" class="hidden sticky bottom-4 z-40 max-w-md mx-auto bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 flex items-center justify-between gap-3">
            <div class="text-xs font-semibold flex items-center gap-2">
              <span id="batchSelectedCount" class="px-2 py-0.5 rounded-full bg-red-600 font-bold text-white text-xs">0 selected</span>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="clearBatchSelection()" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold">Cancel</button>
              <button id="batchApproveBtn" onclick="executeBatchApproval()" class="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95">
                <span>Approve Selected</span>
              </button>
            </div>
          </div>
        </div>

        <!-- SECTION 2: ON-DUTY QUEUE -->
        <div id="authSec_onduty" class="hidden space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h4 class="font-bold text-slate-900 text-sm">Ward On-Duty Requisitions</h4>
            <p class="text-xs text-slate-500 mt-0.5">Review academic on-duty requests before forwarding to Class Advisor.</p>
          </div>
          <div id="authOnDutyQueueContainer" class="overflow-x-auto rounded-xl border border-slate-200">
            <div id="counselorODQueue"></div>
          </div>
        </div>

        <!-- SECTION 3: APPROVED (Forwarded to Advisor) -->
        <div id="authSec_approved" class="hidden space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h4 class="font-bold text-slate-900 text-sm">Forwarded to Class Advisor</h4>
            <p class="text-xs text-slate-500 mt-0.5">Requests parent-verified and recommended for Tier 2 clearance.</p>
          </div>
          <div class="overflow-x-auto rounded-xl border border-slate-200" id="authorityApprovedContainer"></div>
        </div>

        <!-- SECTION 4: DECLINED -->
        <div id="authSec_rejected" class="hidden space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h4 class="font-bold text-slate-900 text-sm">Declined Applications</h4>
            <p class="text-xs text-slate-500 mt-0.5">Requisitions rejected at counselor level with logged reasons.</p>
          </div>
          <div class="overflow-x-auto rounded-xl border border-slate-200" id="authorityRejectedContainer"></div>
        </div>

        <!-- SECTION 5: WARD AUDIT LEDGER -->
        <div id="authSec_all" class="hidden space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 class="font-bold text-slate-900 text-sm">Ward Complete Audit Trail</h4>
              <p class="text-xs text-slate-500 mt-0.5">Historical archive of all student requisitions in your ward.</p>
            </div>
            <input type="text" id="authAllRecordsSearch" oninput="filterAuthorityAllRecords()" placeholder="Search records..." class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold w-48 focus:outline-none focus:border-red-600" />
          </div>
          <div class="overflow-x-auto rounded-xl border border-slate-200" id="authorityAllRecordsContainer"></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 3. CLASS ADVISOR DASHBOARD
 * Core Mission: Class Attendance & Academic Standing Endorsement
 */
function getAdvisorDashboardHTML(user) {
  return `
    <div class="space-y-6">
      <!-- Advisor Class Jurisdiction Banner -->
      <div class="jurisdiction-card flex flex-wrap items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h3 class="text-base sm:text-lg font-bold text-slate-900">Class Advisory Jurisdiction</h3>
            <span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 uppercase">Tier 2 Academic Review</span>
          </div>
          <p class="text-xs text-slate-600 font-mono">
            Department: <span class="font-bold text-slate-900">${user.dept}</span> • Section: <span class="font-bold text-slate-900">${user.yearSec}</span> • Academic Year: <span class="font-bold text-slate-900">${user.academicYear || '3 Year'}</span>
          </p>
        </div>
        <button onclick="refreshAllAuthorityViews(); showToast('Advisor queue refreshed.', 'info', 2000);"
          class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center gap-1.5 active:scale-95">
          <span>Refresh Queue</span>
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="role-tab-bar">
        <button id="roleTabBtn_requests" onclick="switchAuthorityTab('requests')" class="role-tab-btn active-tab bg-white text-slate-900 shadow-xs">
          <span>Class Gate Pass Queue</span>
          <span id="authBadge_requests" class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white leading-none">0</span>
        </button>
        <button id="roleTabBtn_onduty" onclick="switchAuthorityTab('onduty')" class="role-tab-btn text-slate-600">
          <span>Class On-Duty Queue</span>
          <span id="subBadge_onduty" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 leading-none">0</span>
        </button>
        <button id="roleTabBtn_approved" onclick="switchAuthorityTab('approved')" class="role-tab-btn text-slate-600">
          <span>Endorsed to HOD</span>
          <span id="authBadge_approved" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 leading-none">0</span>
        </button>
        <button id="roleTabBtn_rejected" onclick="switchAuthorityTab('rejected')" class="role-tab-btn text-slate-600">
          <span>Declined Applications</span>
          <span id="authBadge_rejected" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 leading-none">0</span>
        </button>
        <button id="roleTabBtn_all" onclick="switchAuthorityTab('all')" class="role-tab-btn text-slate-600">
          <span>Section Ledger</span>
        </button>
      </div>

      <!-- Main Container -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
        <!-- SECTION 1: PENDING GATE PASSES -->
        <div id="authSec_requests" class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div class="relative flex-1 min-w-[220px]">
              <input type="text" id="pendingQueueSearch" oninput="filterPendingQueueLive()" placeholder="Filter roll, student name, reason..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white transition" />
            </div>
            <div class="flex items-center gap-1 text-xs font-bold">
              <button onclick="setQueueFilterChip('all')" id="chip_all" class="px-3 py-1.5 rounded-lg bg-slate-900 text-white transition">All</button>
              <button onclick="setQueueFilterChip('hosteller')" id="chip_hosteller" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Hosteller</button>
              <button onclick="setQueueFilterChip('dayscholar')" id="chip_dayscholar" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Day Scholar</button>
            </div>
          </div>
          <div id="authPassQueueContainer" class="overflow-x-auto rounded-xl border border-slate-200">
            <div id="advisorQueue"></div>
          </div>

          <!-- Batch Action Bar -->
          <div id="batchActionBar" class="hidden sticky bottom-4 z-40 max-w-md mx-auto bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 flex items-center justify-between gap-3">
            <div class="text-xs font-semibold flex items-center gap-2">
              <span id="batchSelectedCount" class="px-2 py-0.5 rounded-full bg-red-600 font-bold text-white text-xs">0 selected</span>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="clearBatchSelection()" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold">Cancel</button>
              <button id="batchApproveBtn" onclick="executeBatchApproval()" class="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95">
                <span>Endorse Selected</span>
              </button>
            </div>
          </div>
        </div>

        <!-- SECTION 2: ON-DUTY QUEUE -->
        <div id="authSec_onduty" class="hidden space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h4 class="font-bold text-slate-900 text-sm">Class On-Duty Applications</h4>
            <p class="text-xs text-slate-500 mt-0.5">Endorse academic duty requisitions before forwarding to Head of Department.</p>
          </div>
          <div id="authOnDutyQueueContainer" class="overflow-x-auto rounded-xl border border-slate-200">
            <div id="advisorODQueue"></div>
          </div>
        </div>

        <!-- SECTION 3: APPROVED -->
        <div id="authSec_approved" class="hidden space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h4 class="font-bold text-slate-900 text-sm">Endorsed to Head of Department (HOD)</h4>
            <p class="text-xs text-slate-500 mt-0.5">Applications approved at advisory level and forwarded for departmental clearance.</p>
          </div>
          <div class="overflow-x-auto rounded-xl border border-slate-200" id="authorityApprovedContainer"></div>
        </div>

        <!-- SECTION 4: DECLINED -->
        <div id="authSec_rejected" class="hidden space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h4 class="font-bold text-slate-900 text-sm">Declined Applications</h4>
            <p class="text-xs text-slate-500 mt-0.5">Requisitions declined due to academic, attendance, or disciplinary reasons.</p>
          </div>
          <div class="overflow-x-auto rounded-xl border border-slate-200" id="authorityRejectedContainer"></div>
        </div>

        <!-- SECTION 5: SECTION LEDGER -->
        <div id="authSec_all" class="hidden space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 class="font-bold text-slate-900 text-sm">Section Complete Audit Ledger</h4>
              <p class="text-xs text-slate-500 mt-0.5">Full historical audit record of Section ${user.yearSec} student movements.</p>
            </div>
            <input type="text" id="authAllRecordsSearch" oninput="filterAuthorityAllRecords()" placeholder="Search records..." class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold w-48 focus:outline-none focus:border-red-600" />
          </div>
          <div class="overflow-x-auto rounded-xl border border-slate-200" id="authorityAllRecordsContainer"></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 4. HEAD OF DEPARTMENT (HOD) DASHBOARD
 * Core Mission: Department Executive Clearance & Final On-Duty Sign-Off
 */
function getHODDashboardHTML(user) {
  return `
    <div class="space-y-6">
      <!-- HOD Department Command Banner -->
      <div class="jurisdiction-card flex flex-wrap items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h3 class="text-base sm:text-lg font-bold text-slate-900">Department of ${user.dept} Engineering</h3>
            <span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200 uppercase">Tier 3 Department Clearance</span>
          </div>
          <p class="text-xs text-slate-600 font-mono">
            Gate Pass Clearance (to Principal) &nbsp;|&nbsp; <span class="font-bold text-indigo-700">Final Signing Authority for On-Duty (OD)</span>
          </p>
        </div>
        <button onclick="refreshAllAuthorityViews(); showToast('HOD queue refreshed.', 'info', 2000);"
          class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center gap-1.5 active:scale-95">
          <span>Refresh Queue</span>
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="role-tab-bar">
        <button id="roleTabBtn_requests" onclick="switchAuthorityTab('requests')" class="role-tab-btn active-tab bg-white text-slate-900 shadow-xs">
          <span>Gate Pass Queue</span>
          <span id="authBadge_requests" class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white leading-none">0</span>
        </button>
        <button id="roleTabBtn_onduty" onclick="switchAuthorityTab('onduty')" class="role-tab-btn text-slate-600">
          <span>Final OD Approval</span>
          <span id="subBadge_onduty" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 leading-none">0</span>
        </button>
        <button id="roleTabBtn_approved" onclick="switchAuthorityTab('approved')" class="role-tab-btn text-slate-600">
          <span>Approved Clearances</span>
          <span id="authBadge_approved" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 leading-none">0</span>
        </button>
        <button id="roleTabBtn_rejected" onclick="switchAuthorityTab('rejected')" class="role-tab-btn text-slate-600">
          <span>Declined Requisitions</span>
          <span id="authBadge_rejected" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 leading-none">0</span>
        </button>
        <button id="roleTabBtn_all" onclick="switchAuthorityTab('all')" class="role-tab-btn text-slate-600">
          <span>Department Master Records</span>
        </button>
      </div>

      <!-- Main Container -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
        <!-- SECTION 1: GATE PASS QUEUE -->
        <div id="authSec_requests" class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div class="relative flex-1 min-w-[220px]">
              <input type="text" id="pendingQueueSearch" oninput="filterPendingQueueLive()" placeholder="Filter roll, student name, reason..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white transition" />
            </div>
            <div class="flex items-center gap-1 text-xs font-bold">
              <button onclick="setQueueFilterChip('all')" id="chip_all" class="px-3 py-1.5 rounded-lg bg-slate-900 text-white transition">All</button>
              <button onclick="setQueueFilterChip('hosteller')" id="chip_hosteller" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Hosteller</button>
              <button onclick="setQueueFilterChip('dayscholar')" id="chip_dayscholar" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Day Scholar</button>
            </div>
          </div>
          <div id="authPassQueueContainer" class="overflow-x-auto rounded-xl border border-slate-200">
            <div id="hodQueue"></div>
          </div>

          <!-- Batch Action Bar -->
          <div id="batchActionBar" class="hidden sticky bottom-4 z-40 max-w-md mx-auto bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 flex items-center justify-between gap-3">
            <div class="text-xs font-semibold flex items-center gap-2">
              <span id="batchSelectedCount" class="px-2 py-0.5 rounded-full bg-red-600 font-bold text-white text-xs">0 selected</span>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="clearBatchSelection()" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold">Cancel</button>
              <button id="batchApproveBtn" onclick="executeBatchApproval()" class="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95">
                <span>Clear to Principal</span>
              </button>
            </div>
          </div>
        </div>

        <!-- SECTION 2: ON-DUTY FINAL APPROVAL -->
        <div id="authSec_onduty" class="hidden space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h4 class="font-bold text-slate-900 text-sm">On-Duty Department Clearances (Final Authorization)</h4>
            <p class="text-xs text-slate-500 mt-0.5">Head of Department sign-off concludes the On-Duty academic clearance cycle.</p>
          </div>
          <div id="authOnDutyQueueContainer" class="overflow-x-auto rounded-xl border border-slate-200">
            <div id="hodODQueue"></div>
          </div>
        </div>

        <!-- SECTION 3: APPROVED -->
        <div id="authSec_approved" class="hidden space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h4 class="font-bold text-slate-900 text-sm">Department Endorsed Applications</h4>
            <p class="text-xs text-slate-500 mt-0.5">Gate passes forwarded to Principal and completed On-Duty clearances.</p>
          </div>
          <div class="overflow-x-auto rounded-xl border border-slate-200" id="authorityApprovedContainer"></div>
        </div>

        <!-- SECTION 4: DECLINED -->
        <div id="authSec_rejected" class="hidden space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h4 class="font-bold text-slate-900 text-sm">Department Declined Requests</h4>
            <p class="text-xs text-slate-500 mt-0.5">Requisitions declined at department level with official justification.</p>
          </div>
          <div class="overflow-x-auto rounded-xl border border-slate-200" id="authorityRejectedContainer"></div>
        </div>

        <!-- SECTION 5: DEPARTMENT MASTER RECORDS -->
        <div id="authSec_all" class="hidden space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 class="font-bold text-slate-900 text-sm">Department Complete Audit Records</h4>
              <p class="text-xs text-slate-500 mt-0.5">Total historical archive for ${user.dept} Engineering.</p>
            </div>
            <input type="text" id="authAllRecordsSearch" oninput="filterAuthorityAllRecords()" placeholder="Search records..." class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold w-48 focus:outline-none focus:border-red-600" />
          </div>
          <div class="overflow-x-auto rounded-xl border border-slate-200" id="authorityAllRecordsContainer"></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 5. PRINCIPAL DASHBOARD
 * Core Mission: College-Wide Executive Clearance & Final Pass Issuance
 */
function getPrincipalDashboardHTML(user) {
  return `
    <div class="space-y-6">
      <!-- Principal Directorate Banner -->
      <div class="jurisdiction-card flex flex-wrap items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h3 class="text-base sm:text-lg font-bold text-slate-900">Office of the Principal • Executive Directorate</h3>
            <span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-800 border border-red-200 uppercase">Institutional Sign-Off Authority</span>
          </div>
          <p class="text-xs text-slate-600 font-mono">
            College-Wide Gate Pass Issuance • Multi-Department Governance (CSE, ECE, MECH, IT, AI&DS)
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="refreshAllAuthorityViews(); showToast('Directorate queue refreshed.', 'info', 2000);"
            class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center gap-1.5 active:scale-95">
            <span>Refresh Directorate</span>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="role-tab-bar">
        <button id="roleTabBtn_requests" onclick="switchAuthorityTab('requests')" class="role-tab-btn active-tab bg-white text-slate-900 shadow-xs">
          <span>Institutional Clearance Queue</span>
          <span id="authBadge_requests" class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white leading-none">0</span>
        </button>
        <button id="roleTabBtn_approved" onclick="switchAuthorityTab('approved')" class="role-tab-btn text-slate-600">
          <span>Officially Issued Gate Passes</span>
          <span id="authBadge_approved" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 leading-none">0</span>
        </button>
        <button id="roleTabBtn_rejected" onclick="switchAuthorityTab('rejected')" class="role-tab-btn text-slate-600">
          <span>Declined Applications</span>
          <span id="authBadge_rejected" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 leading-none">0</span>
        </button>
        <button id="roleTabBtn_all" onclick="switchAuthorityTab('all')" class="role-tab-btn text-slate-600">
          <span>College Audit Trail</span>
        </button>
      </div>

      <!-- Main Container -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
        <!-- SECTION 1: PRINCIPAL QUEUE -->
        <div id="authSec_requests" class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div class="relative flex-1 min-w-[220px]">
              <input type="text" id="pendingQueueSearch" oninput="filterPendingQueueLive()" placeholder="Filter roll, student, department, reason..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white transition" />
            </div>
            <div class="flex items-center gap-1 text-xs font-bold">
              <button onclick="setQueueFilterChip('all')" id="chip_all" class="px-3 py-1.5 rounded-lg bg-slate-900 text-white transition">All</button>
              <button onclick="setQueueFilterChip('hosteller')" id="chip_hosteller" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Hosteller</button>
              <button onclick="setQueueFilterChip('dayscholar')" id="chip_dayscholar" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Day Scholar</button>
            </div>
          </div>
          <div id="authPassQueueContainer" class="overflow-x-auto rounded-xl border border-slate-200">
            <div id="principalQueue"></div>
          </div>

          <!-- Batch Action Bar -->
          <div id="batchActionBar" class="hidden sticky bottom-4 z-40 max-w-md mx-auto bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 flex items-center justify-between gap-3">
            <div class="text-xs font-semibold flex items-center gap-2">
              <span id="batchSelectedCount" class="px-2 py-0.5 rounded-full bg-red-600 font-bold text-white text-xs">0 selected</span>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="clearBatchSelection()" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold">Cancel</button>
              <button id="batchApproveBtn" onclick="executeBatchApproval()" class="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95">
                <span>Issue Gate Passes</span>
              </button>
            </div>
          </div>
        </div>

        <!-- SECTION 2: APPROVED -->
        <div id="authSec_approved" class="hidden space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h4 class="font-bold text-slate-900 text-sm">Officially Issued Gate Passes</h4>
            <p class="text-xs text-slate-500 mt-0.5">Endorsed institutional passes verified across all tiers.</p>
          </div>
          <div class="overflow-x-auto rounded-xl border border-slate-200" id="authorityApprovedContainer"></div>
        </div>

        <!-- SECTION 3: DECLINED -->
        <div id="authSec_rejected" class="hidden space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h4 class="font-bold text-slate-900 text-sm">Declined Applications</h4>
            <p class="text-xs text-slate-500 mt-0.5">Requisitions declined at executive directorate level.</p>
          </div>
          <div class="overflow-x-auto rounded-xl border border-slate-200" id="authorityRejectedContainer"></div>
        </div>

        <!-- SECTION 4: AUDIT TRAIL -->
        <div id="authSec_all" class="hidden space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 class="font-bold text-slate-900 text-sm">Institution-Wide Audit Trail</h4>
              <p class="text-xs text-slate-500 mt-0.5">Comprehensive institutional movement archive across all academic departments.</p>
            </div>
            <input type="text" id="authAllRecordsSearch" oninput="filterAuthorityAllRecords()" placeholder="Search records..." class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold w-48 focus:outline-none focus:border-red-600" />
          </div>
          <div class="overflow-x-auto rounded-xl border border-slate-200" id="authorityAllRecordsContainer"></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 6. HOSTEL WARDEN DASHBOARD
 * Core Mission: Hostel Student Gate Exit & Return Verification
 */
function getWardenDashboardHTML(user) {
  const isFemale = user.role === 'girls_warden';
  const hostelTitle = isFemale ? 'Girls Hostel Warden Governance' : 'Boys Hostel Warden Governance';

  return `
    <div class="space-y-6">
      <!-- Warden Hostel Jurisdiction Banner -->
      <div class="jurisdiction-card flex flex-wrap items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h3 class="text-base sm:text-lg font-bold text-slate-900">${hostelTitle}</h3>
            <span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">${isFemale ? 'Female' : 'Male'} Hostellers</span>
          </div>
          <p class="text-xs text-slate-600 font-mono">
            Hostel Gate Clearance & Movement Tracking (Departure & Return Verification)
          </p>
        </div>
        <button onclick="refreshWardenDashboard(); showToast('Warden dashboard refreshed.', 'info', 2000);"
          class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center gap-1.5 active:scale-95">
          <span>Refresh Movement</span>
        </button>
      </div>

      <!-- 2 Dedicated Warden Tabs -->
      <div class="role-tab-bar">
        <button id="wardenTabBtn_requests" onclick="switchWardenSection('requests')" class="role-tab-btn active-tab bg-white text-slate-900 shadow-xs">
          <span>Hostel Leave Requests</span>
          <span id="wardenBadge_requests" class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white leading-none">0</span>
        </button>
        <button id="wardenTabBtn_records" onclick="switchWardenSection('records')" class="role-tab-btn text-slate-600">
          <span>Hostel Movement Records</span>
          <span id="wardenBadge_records" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 leading-none">0</span>
        </button>
      </div>

      <!-- Main Container -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
        <!-- SECTION 1: LEAVE REQUESTS -->
        <div id="wardenSec_requests" class="space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h4 class="font-bold text-slate-900 text-sm">Approved Leave Requests Awaiting Hostel Exit Sign-Off</h4>
            <p class="text-xs text-slate-500 mt-0.5">Students who have received full Principal clearance and are leaving the hostel.</p>
          </div>
          <div class="overflow-x-auto rounded-xl border border-slate-200">
            <div id="wardenRequestsTableContainer"></div>
          </div>
        </div>

        <!-- SECTION 2: MOVEMENT RECORDS -->
        <div id="wardenSec_records" class="hidden space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h4 class="font-bold text-slate-900 text-sm">Hostel Movement Records & Return Tracking</h4>
            <p class="text-xs text-slate-500 mt-0.5">Track hostellers currently outside campus and record returns.</p>
          </div>
          <div class="overflow-x-auto rounded-xl border border-slate-200">
            <div id="wardenRecordsTableContainer"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ═════════════════════════════════════════════════════════════════════════
   DASHBOARD LIFECYCLE CONTROLLER
   ═════════════════════════════════════════════════════════════════════════ */

function openDashboard(user) {
  document.getElementById('singleLoginPortalScreen')?.classList.add('hidden');
  document.getElementById('authScreen')?.classList.add('hidden');
  document.getElementById('dashScreen')?.classList.remove('hidden');

  const greeting = document.getElementById('dashGreeting');
  if (greeting) greeting.innerText = `Welcome, ${user.name}`;

  const subtitles = {
    principal: 'Executive Directorate • Institution-Wide Clearance',
    hod: `Head of Department • Department of ${user.dept}`,
    advisor: `Class Advisor • ${user.academicYear || '3 Year'} - ${user.dept} (Sec ${user.yearSec})`,
    counselor: `Class Counselor • Assigned Ward (${user.startRoll || 'Start'} to ${user.endRoll || 'End'})`,
    student: `Student • ${user.academicYear || '3 Year'} - ${user.dept || 'Engineering'} (Sec ${user.yearSec || 'A'})`,
    boys_warden: 'Hostel Warden • Boys Hostel Clearance Portal',
    girls_warden: 'Hostel Warden • Girls Hostel Clearance Portal'
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

    if (content) {
      content.innerHTML = getStudentDashboardHTML(user);
    }
    // Switch to first tab: apply pass
    switchStudentPortalTab('pass');
  } else {
    if (studentView) studentView.classList.add('hidden');
    if (topPdfBtn) topPdfBtn.classList.remove('hidden');
    if (topBulkLettersBtn) topBulkLettersBtn.classList.remove('hidden');
    if (clearDataBtn) clearDataBtn.classList.remove('hidden');

    if (user.role === 'counselor') {
      if (content) content.innerHTML = getCounselorDashboardHTML(user);
    } else if (user.role === 'advisor') {
      if (content) content.innerHTML = getAdvisorDashboardHTML(user);
    } else if (user.role === 'hod') {
      if (content) content.innerHTML = getHODDashboardHTML(user);
    } else if (user.role === 'principal') {
      if (content) content.innerHTML = getPrincipalDashboardHTML(user);
    } else if (user.role === 'boys_warden' || user.role === 'girls_warden') {
      if (content) content.innerHTML = getWardenDashboardHTML(user);
      wardenAutoRefreshTimer = setInterval(() => {
        if (loggedUser && (loggedUser.role === 'boys_warden' || loggedUser.role === 'girls_warden')) {
          if (typeof refreshWardenDashboard === 'function') refreshWardenDashboard();
        }
      }, 4000);
    }

    refreshAllAuthorityViews();
  }
}

function refreshAllAuthorityViews() {
  if (!loggedUser) return;
  if (loggedUser.role === 'counselor') {
    if (typeof fetchCounselorQueue === 'function') fetchCounselorQueue();
    if (typeof fetchCounselorODQueue === 'function') fetchCounselorODQueue();
  } else if (loggedUser.role === 'advisor') {
    if (typeof fetchAdvisorQueue === 'function') fetchAdvisorQueue();
    if (typeof fetchAdvisorODQueue === 'function') fetchAdvisorODQueue();
  } else if (loggedUser.role === 'hod') {
    if (typeof fetchHODQueue === 'function') fetchHODQueue();
    if (typeof fetchHODODQueue === 'function') fetchHODODQueue();
  } else if (loggedUser.role === 'principal') {
    if (typeof fetchPrincipalQueue === 'function') fetchPrincipalQueue();
  } else if (loggedUser.role === 'boys_warden' || loggedUser.role === 'girls_warden') {
    if (typeof refreshWardenDashboard === 'function') refreshWardenDashboard();
  }

  if (typeof loadUniversalLogs === 'function') loadUniversalLogs();
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

/* ═════════════════════════════════════════════════════════════════════════
   LIVE QUEUE FILTERING & SEARCH
   ═════════════════════════════════════════════════════════════════════════ */

function setQueueFilterChip(chipType) {
  currentQueueChipFilter = chipType;
  const chips = ['all', 'hosteller', 'dayscholar'];
  chips.forEach(c => {
    const el = document.getElementById(`chip_${c}`);
    if (el) {
      if (c === chipType) {
        el.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-slate-900 text-white shadow-2xs';
      } else {
        el.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200';
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
      btn.innerHTML = `<span>Approve Selected</span>`;
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
    const letterModal = document.getElementById('letterModal');
    if (letterModal && !letterModal.classList.contains('hidden')) {
      if (typeof closeLetterModal === 'function') closeLetterModal();
    }
  }
});

window.setQueueFilterChip = setQueueFilterChip;
window.filterPendingQueueLive = filterPendingQueueLive;
window.toggleSelectAllBatch = toggleSelectAllBatch;
window.updateBatchActionBar = updateBatchActionBar;
window.clearBatchSelection = clearBatchSelection;
window.executeBatchApproval = executeBatchApproval;
