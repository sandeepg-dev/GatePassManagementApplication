/**
 * Main Application Orchestrator & Window Global Bindings
 */

// Dismiss splash screen after 2 seconds
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 800);
    }
  }, 2000);
});

// Periodic background synchronization (every 8 seconds when active session exists)
setInterval(() => {
  if (typeof loggedUser !== 'undefined' && loggedUser) {
    if (loggedUser.role === 'student') {
      loadStudentPersonalStatus();
    } else {
      refreshAllAuthorityViews();
    }
  }
}, 8000);

// Universal Rejection Modal Functions
function openRejectModal(passId, roleLabel, isOD = false) {
  const modal = document.getElementById('rejectModal');
  const passIdInput = document.getElementById('rejectPassId');
  const roleLabelInput = document.getElementById('rejectRoleLabel');
  const isODInput = document.getElementById('rejectIsOD');
  const reasonInput = document.getElementById('rejectReasonInput');
  const title = document.getElementById('rejectModalTitle');
  const presetChips = document.getElementById('presetChipsContainer');

  if (passIdInput) passIdInput.value = passId;
  if (roleLabelInput) roleLabelInput.value = roleLabel || (typeof loggedUser !== 'undefined' && loggedUser ? loggedUser.role : 'Authority');
  if (isODInput) isODInput.value = isOD ? 'true' : 'false';
  if (reasonInput) reasonInput.value = '';
  if (title) title.innerText = isOD ? `Reject On-Duty Request (${roleLabel || 'Authority'})` : `Reject Leave Application (${roleLabel || 'Authority'})`;
  if (presetChips) {
    if (isOD) presetChips.classList.add('hidden');
    else presetChips.classList.remove('hidden');
  }
  if (modal) modal.classList.remove('hidden');
}

function closeRejectModal() {
  const modal = document.getElementById('rejectModal');
  const reasonInput = document.getElementById('rejectReasonInput');
  const isODInput = document.getElementById('rejectIsOD');
  if (reasonInput) reasonInput.value = '';
  if (isODInput) isODInput.value = 'false';
  if (modal) modal.classList.add('hidden');
}

async function submitRejectPass() {
  const passId = document.getElementById('rejectPassId')?.value;
  const isOD = document.getElementById('rejectIsOD')?.value === 'true';
  const reason = document.getElementById('rejectReasonInput')?.value?.trim();

  if (!reason) {
    return showToast(isOD ? 'Please enter a specific reason for rejecting this On-Duty request.' : 'Please enter a specific reason for rejecting this leave requisition.', 'warning', 3000);
  }
  if (!passId) return;

  try {
    let data;
    if (isOD) {
      data = await Api.post('/api/onduty/reject', {
        requestId: passId,
        reason,
        rejectedBy: typeof loggedUser !== 'undefined' && loggedUser ? loggedUser.name : 'Authority',
        role: typeof loggedUser !== 'undefined' && loggedUser ? loggedUser.role : 'authority'
      });
    } else {
      data = await Api.post('/api/approve/reject', {
        passId,
        reason,
        rejectedBy: typeof loggedUser !== 'undefined' && loggedUser ? loggedUser.name : 'Authority',
        role: typeof loggedUser !== 'undefined' && loggedUser ? loggedUser.role : 'authority'
      });
    }

    if (data && (data.success === false || data.error)) {
      showToast(data.message || data.error || 'Rejection failed.', 'error', 3500);
      return;
    }

    showToast(data.message || (isOD ? 'On-Duty request rejected successfully.' : 'Leave application rejected successfully.'), 'success', 3000);
    closeRejectModal();
    if (typeof refreshAllAuthorityViews === 'function') {
      refreshAllAuthorityViews();
    }
    if (isOD && typeof loadStudentOnDutyStatus === 'function') {
      loadStudentOnDutyStatus();
    }
  } catch (err) {
    showToast('Server error while processing rejection.', 'error', 3500);
  }
}

async function confirmAndClearAllData() {
  const u = window.loggedUser || {};
  const roleName = String(u.role || 'Authority').toUpperCase();

  showConfirmModal({
    title: `Clear All Requests (${roleName} Dashboard)?`,
    message: 'This will clear all Gate Pass and On-Duty (OD) requests and records from your dashboard only. Other authorities\' dashboards, records, and queues will remain completely unaffected.',
    confirmText: 'Clear My Dashboard',
    confirmColor: 'rose',
    onConfirm: async () => {
      try {
        // Collect all currently loaded records from in-memory arrays
        const allLoaded = [
          ...(Array.isArray(window.cachedAllRecords) ? window.cachedAllRecords : []),
          ...(Array.isArray(window.masterPassList) ? window.masterPassList : []),
          ...(Array.isArray(window.cachedApprovedRecords) ? window.cachedApprovedRecords : []),
          ...(Array.isArray(window.cachedRejectedRecords) ? window.cachedRejectedRecords : []),
          ...(Array.isArray(window.wardenCachedRecords) ? window.wardenCachedRecords : [])
        ];

        const currentlyLoadedPassIds = [];
        const currentlyLoadedODIds = [];
        const seenIds = new Set();

        allLoaded.forEach(item => {
          const id = item._id || item.id;
          if (id && !seenIds.has(String(id))) {
            seenIds.add(String(id));
            if (item.isOD || !!item.odLetter) {
              currentlyLoadedODIds.push(String(id));
            } else {
              currentlyLoadedPassIds.push(String(id));
            }
          }
        });

        const payload = {
          role: u.role,
          userId: u.userId,
          authorityUserId: u.userId,
          name: u.name,
          dept: u.dept,
          yearSec: u.yearSec,
          startRoll: u.startRoll,
          endRoll: u.endRoll,
          counselorName: u.name,
          currentlyLoadedPassIds,
          currentlyLoadedODIds
        };

        const data = await Api.post('/api/passes/clear-all', payload);
        if (data && data.success) {
          // 1. Immediately reset in-memory caches
          if (typeof resetAuditCaches === 'function') resetAuditCaches();
          if (typeof resetWardenCaches === 'function') resetWardenCaches();
          window.cachedAllRecords = [];
          window.masterPassList = [];
          window.cachedApprovedRecords = [];
          window.cachedRejectedRecords = [];
          window.wardenCachedRecords = [];

          // 2. Immediately zero out all badge and KPI counters
          const zeroIds = [
            'kpi_pending', 'kpi_approved', 'kpi_rejected', 'kpi_total',
            'kpi_gp_pending', 'kpi_gp_approved', 'kpi_gp_rejected', 'kpi_gp_all',
            'kpi_od_pending', 'kpi_od_approved', 'kpi_od_rejected', 'kpi_od_all',
            'kpi_sub_gp_pending', 'kpi_sub_od_pending',
            'kpi_sub_gp_approved', 'kpi_sub_od_approved',
            'kpi_sub_gp_rejected', 'kpi_sub_od_rejected',
            'extBadge_requests', 'extBadge_approved', 'extBadge_rejected',
            'extBadge_gp_all', 'extBadge_od_all', 'extBadge_all',
            'authBadge_requests', 'authBadge_approved', 'authBadge_rejected', 'authBadge_all',
            'subBadge_passes', 'subBadge_onduty',
            'wardenBadge_requests', 'wardenBadge_records'
          ];
          zeroIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
              el.innerText = '0';
              if (el.classList.contains('animate-pulse')) el.classList.remove('animate-pulse');
            }
          });

          // 3. Immediately render empty states across all views
          const queueEmptyHTML = (msg, sub) => `
            <div class="p-12 text-center bg-white space-y-3">
              <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto shadow-2xs">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="text-base font-bold text-slate-800">${msg}</div>
              <p class="text-xs md:text-sm text-slate-500 max-w-sm mx-auto">${sub}</p>
            </div>`;

          const queues = [
            { id: 'counselorQueue', msg: 'No Pending Leave Requests', sub: 'All requests have been cleared from your dashboard.' },
            { id: 'counselorODQueue', msg: 'No Pending On-Duty Requests', sub: 'All On-Duty requests have been cleared from your dashboard.' },
            { id: 'advisorQueue', msg: 'No Pending Leave Requests', sub: 'All requests have been cleared from your dashboard.' },
            { id: 'advisorODQueue', msg: 'No Pending On-Duty Requests', sub: 'All On-Duty requests have been cleared from your dashboard.' },
            { id: 'hodQueue', msg: 'No Pending Leave Requests', sub: 'All requests have been cleared from your dashboard.' },
            { id: 'hodODQueue', msg: 'No Pending On-Duty Requests', sub: 'All On-Duty requests have been cleared from your dashboard.' },
            { id: 'principalQueue', msg: 'No Pending Leave Requests', sub: 'All requests have been cleared from your dashboard.' },
            { id: 'wardenRequestsTableContainer', msg: 'No Pending Leave Requests', sub: 'All requests have been cleared from your dashboard.' }
          ];
          queues.forEach(q => {
            const el = document.getElementById(q.id);
            if (el) el.innerHTML = queueEmptyHTML(q.msg, q.sub);
          });

          if (typeof renderAuthorityApprovedSection === 'function') renderAuthorityApprovedSection([]);
          if (typeof renderAuthorityRejectedSection === 'function') renderAuthorityRejectedSection([]);
          if (typeof renderAuthorityAllRecordsSection === 'function') renderAuthorityAllRecordsSection([]);
          if (typeof renderExtGPAllSection === 'function') renderExtGPAllSection([]);
          if (typeof renderExtODAllSection === 'function') renderExtODAllSection([]);
          if (typeof renderExtODPendingSection === 'function') renderExtODPendingSection([]);
          if (typeof renderExtODApprovedSection === 'function') renderExtODApprovedSection([]);
          if (typeof renderExtODRejectedSection === 'function') renderExtODRejectedSection([]);
          if (typeof renderWardenRecords === 'function') renderWardenRecords([]);

          showToast(data.message || 'Dashboard requests cleared successfully.', 'success', 3500);

          // 4. Synchronize with server
          if (typeof refreshAllAuthorityViews === 'function') {
            refreshAllAuthorityViews();
          }
          if (typeof refreshWardenDashboard === 'function') {
            refreshWardenDashboard();
          }
          if (typeof loadStudentPersonalStatus === 'function') {
            loadStudentPersonalStatus();
          }
        } else {
          showToast(data?.message || 'Failed to clear dashboard data.', 'error', 3500);
        }
      } catch (err) {
        showToast('Error connecting to server to clear passes: ' + (err.message || 'Unknown error'), 'error', 3500);
      }
    }
  });
}

// Explicitly bind all interface functions to window for HTML onclick / onsubmit compatibility
window.confirmAndClearAllData = confirmAndClearAllData;
if (typeof requestUnlock !== 'undefined') window.requestUnlock = requestUnlock;
if (typeof closeUnlockModal !== 'undefined') window.closeUnlockModal = closeUnlockModal;
if (typeof verifyUnlockCode !== 'undefined') window.verifyUnlockCode = verifyUnlockCode;
if (typeof openAuthScreen !== 'undefined') window.openAuthScreen = openAuthScreen;
if (typeof backToPortals !== 'undefined') window.backToPortals = backToPortals;
if (typeof clearAuthInputs !== 'undefined') window.clearAuthInputs = clearAuthInputs;
if (typeof updateSingleRoleRegistrationStatus !== 'undefined') window.updateSingleRoleRegistrationStatus = updateSingleRoleRegistrationStatus;
if (typeof toggleAuth !== 'undefined') window.toggleAuth = toggleAuth;
if (typeof checkRoleAvailability !== 'undefined') window.checkRoleAvailability = checkRoleAvailability;
if (typeof handleAuthSubmit !== 'undefined') window.handleAuthSubmit = handleAuthSubmit;
window.openDashboard = openDashboard;
window.refreshAllAuthorityViews = refreshAllAuthorityViews;
window.submitStudentPass = submitStudentPass;
window.loadStudentPersonalStatus = loadStudentPersonalStatus;
window.fetchCounselorQueue = fetchCounselorQueue;
window.verifyCounselorPass = verifyCounselorPass;
window.fetchAdvisorQueue = fetchAdvisorQueue;
window.approveAdvisorPass = approveAdvisorPass;
window.fetchHODQueue = fetchHODQueue;
window.approveHODPass = approveHODPass;
window.fetchPrincipalQueue = fetchPrincipalQueue;
window.approveGenericPass = approveGenericPass;
window.switchWardenSection = switchWardenSection;
window.refreshWardenDashboard = refreshWardenDashboard;
window.fetchWardenLeaveRequests = fetchWardenLeaveRequests;
window.fetchWardenRecords = fetchWardenRecords;
window.filterWardenRecords = filterWardenRecords;
window.getWardenRole = getWardenRole;
window.approveBoysWardenPass = approveBoysWardenPass;
window.approveGirlsWardenPass = approveGirlsWardenPass;
window.loadUniversalLogs = loadUniversalLogs;
window.viewFormalLetter = viewFormalLetter;
window.closeLetterModal = closeLetterModal;
window.openRejectModal = openRejectModal;
window.closeRejectModal = closeRejectModal;
window.submitRejectPass = submitRejectPass;
window.formatRemainingTime = formatRemainingTime;
window.formatClassSection = formatClassSection;
window.downloadMasterPDF = downloadMasterPDF;
window.downloadAllCompleteLettersPDF = downloadAllCompleteLettersPDF;
window.downloadOfficialLetterOnlyPDF = downloadOfficialLetterOnlyPDF;
window.downloadGatePassCardPDF = typeof downloadGatePassCardPDF !== 'undefined' ? downloadGatePassCardPDF : undefined;
window.downloadGatePassPDF = typeof downloadGatePassPDF !== 'undefined' ? downloadGatePassPDF : undefined;
window.downloadSinglePassPDF = downloadSinglePassPDF;
window.downloadOnDutyLetterPDF = typeof downloadOnDutyLetterPDF !== 'undefined' ? downloadOnDutyLetterPDF : undefined;
window.downloadAllRecordsCSV = typeof downloadAllRecordsCSV !== 'undefined' ? downloadAllRecordsCSV : undefined;
window.viewOnDutyLetter = typeof viewOnDutyLetter !== 'undefined' ? viewOnDutyLetter : undefined;
window.viewOnDutyLetterById = typeof viewOnDutyLetterById !== 'undefined' ? viewOnDutyLetterById : undefined;
window.downloadOnDutyLetterById = typeof downloadOnDutyLetterById !== 'undefined' ? downloadOnDutyLetterById : undefined;
window.logout = logout;
window.escapeHtml = escapeHtml;
window.escapeAttr = escapeAttr;

