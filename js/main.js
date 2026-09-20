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
  showConfirmModal({
    title: 'Purge All Leave Applications & Gate Passes?',
    message: 'This action will clear all active queues, gate passes, and audit log records from the database across the entire institution. User accounts and student profiles will remain safe.',
    confirmText: 'Purge All Passes',
    confirmColor: 'rose',
    onConfirm: async () => {
      try {
        const data = await Api.post('/api/passes/clear-all', {});
        if (data && data.success) {
          showToast(data.message || 'All leave applications and gate passes cleared successfully.', 'success', 3500);
          if (typeof refreshAllAuthorityViews === 'function') {
            refreshAllAuthorityViews();
          }
          if (typeof loadStudentPersonalStatus === 'function') {
            loadStudentPersonalStatus();
          }
        } else {
          showToast(data?.message || 'Failed to clear data from database.', 'error', 3500);
        }
      } catch (err) {
        showToast('Error connecting to server to clear passes: ' + (err.message || 'Unknown error'), 'error', 3500);
      }
    }
  });
}

// Explicitly bind all interface functions to window for HTML onclick / onsubmit compatibility
window.confirmAndClearAllData = confirmAndClearAllData;
window.requestUnlock = requestUnlock;
window.closeUnlockModal = closeUnlockModal;
window.verifyUnlockCode = verifyUnlockCode;
window.openAuthScreen = openAuthScreen;
window.backToPortals = backToPortals;
window.clearAuthInputs = clearAuthInputs;
window.updateSingleRoleRegistrationStatus = updateSingleRoleRegistrationStatus;
window.toggleAuth = toggleAuth;
window.checkRoleAvailability = checkRoleAvailability;
window.handleAuthSubmit = handleAuthSubmit;
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

