/**
 * Main Application Orchestrator & Window Global Bindings
 */

// Clean up splash screen if still present
window.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splashScreen');
  if (splash) {
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 400);
  }
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
            <div class="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
              <div class="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-2xs border border-slate-700">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="text-base font-bold text-white">${msg}</div>
              <p class="text-xs md:text-sm text-slate-400 max-w-sm mx-auto">${sub}</p>
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

// Slide-over Drawers & Preferences Controller
function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getRoleLabel(role) {
  const map = {
    student: 'Student Scholar',
    counselor: 'Faculty Counselor',
    advisor: 'Class Advisor',
    hod: 'Head of Department (HOD)',
    principal: 'Institutional Principal',
    warden: 'Hostel Executive Warden',
    admin: 'System Administrator'
  };
  return map[role?.toLowerCase()] || (role ? role.toUpperCase() : 'Authenticated User');
}

function openProfileDrawer() {
  const user = (typeof loggedUser !== 'undefined' && loggedUser) ? loggedUser : (typeof Auth !== 'undefined' && Auth.getUser ? Auth.getUser() : null);
  if (!user) {
    if (typeof showToast === 'function') showToast('No active user session found.', 'info');
    return;
  }

  const drawer = document.getElementById('profileDrawer');
  const backdrop = document.getElementById('profileDrawerBackdrop');
  const nameEl = document.getElementById('drawerUserName');
  const roleEl = document.getElementById('drawerUserRoleBadge');
  const avatarEl = document.getElementById('drawerAvatarInitials');
  const detailsEl = document.getElementById('drawerProfileDetailsContainer');

  if (nameEl) nameEl.textContent = user.name || 'User';
  if (roleEl) roleEl.textContent = getRoleLabel(user.role);
  if (avatarEl) avatarEl.textContent = getInitials(user.name);

  if (detailsEl) {
    const isStudent = user.role === 'student';
    let rows = [];

    if (isStudent) {
      rows = [
        { label: 'Register Number', value: user.regNo || 'N/A', mono: true },
        { label: 'Department / Branch', value: user.dept || 'Engineering' },
        { label: 'Year & Section', value: `Year ${user.year || '-'}, Section ${user.sec || '-'}` },
        { label: 'Accommodation Type', value: user.studentType || user.stayType || (user.hostel ? 'Hosteller' : 'Day Scholar'), badge: true },
        { label: 'Student Mobile', value: user.phone || 'Not recorded', mono: true },
        { label: 'Parent / Guardian Contact', value: user.parentPhone || 'Not recorded', mono: true },
        { label: 'Designated Counselor', value: user.counselorName || user.counselor || 'Assigned by Dept' }
      ];
    } else {
      rows = [
        { label: 'Staff Identification ID', value: user.staffId || user.regNo || 'STAFF-AUTH', mono: true },
        { label: 'Designated Role', value: getRoleLabel(user.role) },
        { label: 'Department', value: user.dept || 'Institutional Administration' }
      ];

      if (user.role === 'counselor' || user.role === 'advisor') {
        if (user.year) rows.push({ label: 'Assigned Year / Cohort', value: `Year ${user.year}` });
        if (user.sec) rows.push({ label: 'Assigned Class Section', value: `Section ${user.sec}` });
      }

      if (user.role === 'warden') {
        rows.push({ label: 'Hostel Jurisdiction', value: `${user.hostelType || 'Executive'} Campus Hostel` });
      }

      if (user.phone) {
        rows.push({ label: 'Official Contact', value: user.phone, mono: true });
      }
    }

    detailsEl.innerHTML = rows.map(r => `
      <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
        <span class="text-xs font-semibold text-slate-400">${r.label}</span>
        <span class="text-xs font-bold text-white ${r.mono ? 'font-mono' : ''} text-right">
          ${r.badge ? `<span class="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800 font-mono">${r.value}</span>` : r.value}
        </span>
      </div>
    `).join('');
  }

  if (backdrop) backdrop.classList.remove('hidden');
  if (drawer) {
    drawer.classList.remove('drawer-closed');
    drawer.classList.add('drawer-open');
  }
}

function closeProfileDrawer() {
  const drawer = document.getElementById('profileDrawer');
  const backdrop = document.getElementById('profileDrawerBackdrop');
  if (drawer) {
    drawer.classList.remove('drawer-open');
    drawer.classList.add('drawer-closed');
  }
  if (backdrop) backdrop.classList.add('hidden');
}

function openNotificationsDrawer() {
  const drawer = document.getElementById('notificationsDrawer');
  const backdrop = document.getElementById('notificationsDrawerBackdrop');
  const list = document.getElementById('notificationsListContainer');
  const user = (typeof loggedUser !== 'undefined' && loggedUser) ? loggedUser : null;

  if (list) {
    const items = [];
    if (user) {
      items.push({
        type: 'info',
        title: `Active Session: ${user.name}`,
        desc: `Operating as ${getRoleLabel(user.role)}. Institutional telemetry active.`,
        time: 'Live'
      });

      if (user.role === 'student') {
        items.push({
          type: 'success',
          title: 'Gate Pass & OD Services Online',
          desc: 'Real-time multi-tier digital tracking for Outing, Leave, and On-Duty requests is active.',
          time: 'Ready'
        });
      } else {
        items.push({
          type: 'pending',
          title: 'Automated 8s Queue Refresh Active',
          desc: 'Incoming student requests and workflow updates are polled continuously in the background.',
          time: 'Active'
        });
      }
    }

    list.innerHTML = items.map(it => `
      <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex gap-3 items-start">
        <div class="w-8 h-8 rounded-xl ${it.type === 'pending' ? 'bg-amber-950 text-amber-300 border border-amber-800' : it.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-blue-950 text-blue-300 border border-blue-800'} flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs font-mono">
          ${it.type === 'pending' ? '⏳' : it.type === 'success' ? '✓' : 'ℹ'}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <h5 class="text-xs font-bold text-white truncate">${it.title}</h5>
            <span class="text-[10px] text-slate-400 font-mono shrink-0">${it.time}</span>
          </div>
          <p class="text-xs text-slate-400 mt-1 leading-relaxed">${it.desc}</p>
        </div>
      </div>
    `).join('');
  }

  if (backdrop) backdrop.classList.remove('hidden');
  if (drawer) {
    drawer.classList.remove('drawer-closed');
    drawer.classList.add('drawer-open');
  }
}

function closeNotificationsDrawer() {
  const drawer = document.getElementById('notificationsDrawer');
  const backdrop = document.getElementById('notificationsDrawerBackdrop');
  if (drawer) {
    drawer.classList.remove('drawer-open');
    drawer.classList.add('drawer-closed');
  }
  if (backdrop) backdrop.classList.add('hidden');
}

function openSettingsDrawer() {
  const drawer = document.getElementById('settingsDrawer');
  const backdrop = document.getElementById('settingsDrawerBackdrop');
  const toggle = document.getElementById('compactModeToggle');
  if (toggle) {
    toggle.checked = localStorage.getItem('compactTableMode') === 'true';
  }
  if (backdrop) backdrop.classList.remove('hidden');
  if (drawer) {
    drawer.classList.remove('drawer-closed');
    drawer.classList.add('drawer-open');
  }
}

function closeSettingsDrawer() {
  const drawer = document.getElementById('settingsDrawer');
  const backdrop = document.getElementById('settingsDrawerBackdrop');
  if (drawer) {
    drawer.classList.remove('drawer-open');
    drawer.classList.add('drawer-closed');
  }
  if (backdrop) backdrop.classList.add('hidden');
}

function toggleCompactTableMode(checked) {
  localStorage.setItem('compactTableMode', checked ? 'true' : 'false');
  if (checked) {
    document.body.classList.add('compact-table-density');
  } else {
    document.body.classList.remove('compact-table-density');
  }
  if (typeof showToast === 'function') {
    showToast(checked ? 'Compact table density enabled' : 'Standard table density restored', 'info', 2000);
  }
}

// Global Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeProfileDrawer();
    closeNotificationsDrawer();
    closeSettingsDrawer();
    if (typeof closeRejectModal === 'function') closeRejectModal();
    if (typeof closeLetterModal === 'function') closeLetterModal();
    if (typeof closeUnlockModal === 'function') closeUnlockModal();
  } else if ((e.altKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
    e.preventDefault();
    const drawer = document.getElementById('profileDrawer');
    if (drawer && drawer.classList.contains('drawer-open')) closeProfileDrawer();
    else openProfileDrawer();
  } else if ((e.altKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
    e.preventDefault();
    const drawer = document.getElementById('notificationsDrawer');
    if (drawer && drawer.classList.contains('drawer-open')) closeNotificationsDrawer();
    else openNotificationsDrawer();
  }
});

// Explicitly bind all interface functions to window for HTML onclick / onsubmit compatibility
if (typeof openProfileDrawer !== 'undefined') window.openProfileDrawer = openProfileDrawer;
if (typeof closeProfileDrawer !== 'undefined') window.closeProfileDrawer = closeProfileDrawer;
if (typeof openNotificationsDrawer !== 'undefined') window.openNotificationsDrawer = openNotificationsDrawer;
if (typeof closeNotificationsDrawer !== 'undefined') window.closeNotificationsDrawer = closeNotificationsDrawer;
if (typeof openSettingsDrawer !== 'undefined') window.openSettingsDrawer = openSettingsDrawer;
if (typeof closeSettingsDrawer !== 'undefined') window.closeSettingsDrawer = closeSettingsDrawer;
if (typeof toggleCompactTableMode !== 'undefined') window.toggleCompactTableMode = toggleCompactTableMode;
if (typeof confirmAndClearAllData !== 'undefined') window.confirmAndClearAllData = confirmAndClearAllData;
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
if (typeof openDashboard !== 'undefined') window.openDashboard = openDashboard;
if (typeof refreshAllAuthorityViews !== 'undefined') window.refreshAllAuthorityViews = refreshAllAuthorityViews;
if (typeof submitStudentPass !== 'undefined') window.submitStudentPass = submitStudentPass;
if (typeof loadStudentPersonalStatus !== 'undefined') window.loadStudentPersonalStatus = loadStudentPersonalStatus;
if (typeof fetchCounselorQueue !== 'undefined') window.fetchCounselorQueue = fetchCounselorQueue;
if (typeof verifyCounselorPass !== 'undefined') window.verifyCounselorPass = verifyCounselorPass;
if (typeof fetchAdvisorQueue !== 'undefined') window.fetchAdvisorQueue = fetchAdvisorQueue;
if (typeof approveAdvisorPass !== 'undefined') window.approveAdvisorPass = approveAdvisorPass;
if (typeof fetchHODQueue !== 'undefined') window.fetchHODQueue = fetchHODQueue;
if (typeof approveHODPass !== 'undefined') window.approveHODPass = approveHODPass;
if (typeof fetchPrincipalQueue !== 'undefined') window.fetchPrincipalQueue = fetchPrincipalQueue;
if (typeof approveGenericPass !== 'undefined') window.approveGenericPass = approveGenericPass;
if (typeof switchWardenSection !== 'undefined') window.switchWardenSection = switchWardenSection;
if (typeof refreshWardenDashboard !== 'undefined') window.refreshWardenDashboard = refreshWardenDashboard;
if (typeof fetchWardenLeaveRequests !== 'undefined') window.fetchWardenLeaveRequests = fetchWardenLeaveRequests;
if (typeof fetchWardenRecords !== 'undefined') window.fetchWardenRecords = fetchWardenRecords;
if (typeof filterWardenRecords !== 'undefined') window.filterWardenRecords = filterWardenRecords;
if (typeof getWardenRole !== 'undefined') window.getWardenRole = getWardenRole;
if (typeof approveBoysWardenPass !== 'undefined') window.approveBoysWardenPass = approveBoysWardenPass;
if (typeof approveGirlsWardenPass !== 'undefined') window.approveGirlsWardenPass = approveGirlsWardenPass;
if (typeof loadUniversalLogs !== 'undefined') window.loadUniversalLogs = loadUniversalLogs;
if (typeof viewFormalLetter !== 'undefined') window.viewFormalLetter = viewFormalLetter;
if (typeof closeLetterModal !== 'undefined') window.closeLetterModal = closeLetterModal;
if (typeof openRejectModal !== 'undefined') window.openRejectModal = openRejectModal;
if (typeof closeRejectModal !== 'undefined') window.closeRejectModal = closeRejectModal;
if (typeof submitRejectPass !== 'undefined') window.submitRejectPass = submitRejectPass;
if (typeof formatRemainingTime !== 'undefined') window.formatRemainingTime = formatRemainingTime;
if (typeof formatClassSection !== 'undefined') window.formatClassSection = formatClassSection;
if (typeof downloadMasterPDF !== 'undefined') window.downloadMasterPDF = downloadMasterPDF;
if (typeof downloadAllCompleteLettersPDF !== 'undefined') window.downloadAllCompleteLettersPDF = downloadAllCompleteLettersPDF;
if (typeof downloadOfficialLetterOnlyPDF !== 'undefined') window.downloadOfficialLetterOnlyPDF = downloadOfficialLetterOnlyPDF;
if (typeof downloadGatePassCardPDF !== 'undefined') window.downloadGatePassCardPDF = downloadGatePassCardPDF;
if (typeof downloadGatePassPDF !== 'undefined') window.downloadGatePassPDF = downloadGatePassPDF;
if (typeof downloadSinglePassPDF !== 'undefined') window.downloadSinglePassPDF = downloadSinglePassPDF;
if (typeof downloadOnDutyLetterPDF !== 'undefined') window.downloadOnDutyLetterPDF = downloadOnDutyLetterPDF;
if (typeof downloadAllRecordsCSV !== 'undefined') window.downloadAllRecordsCSV = downloadAllRecordsCSV;
if (typeof viewOnDutyLetter !== 'undefined') window.viewOnDutyLetter = viewOnDutyLetter;
if (typeof viewOnDutyLetterById !== 'undefined') window.viewOnDutyLetterById = viewOnDutyLetterById;
if (typeof downloadOnDutyLetterById !== 'undefined') window.downloadOnDutyLetterById = downloadOnDutyLetterById;
if (typeof logout !== 'undefined') window.logout = logout;
if (typeof escapeHtml !== 'undefined') window.escapeHtml = escapeHtml;
if (typeof escapeAttr !== 'undefined') window.escapeAttr = escapeAttr;

