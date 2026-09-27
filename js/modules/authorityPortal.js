/**
 * Authority Portal Module (Counselor, Advisor, HOD, Principal, Warden)
 * Production-ready role-aware dashboard modeled after institutional governance reference.
 * Completely driven by live MongoDB data - NO dummy/mock data.
 */

let authState = {
  activeTab: 'verification', // 'verification' | 'roster' | 'gatepass' | 'leave' | 'onduty' | 'approved' | 'reports'
  subFilter: 'leave', // 'gatepass' | 'leave' | 'onduty' | 'all'
  passes: [],
  odRequests: [],
  students: [],
  loading: false,
  searchQuery: '',
  selectedPassId: null,
  activeDetailItem: null,
  page: 1,
  pageSize: 10
};

/**
 * Format role name for executive presentation
 */
function getRoleDisplay(role) {
  const r = String(role || '').toLowerCase().replace(/[\s-]+/g, '_');
  switch (r) {
    case 'counselor': return 'Class Counselor';
    case 'advisor': return 'Class Advisor';
    case 'hod': return 'Head of Department';
    case 'principal': return 'Principal Directorate';
    case 'boys_warden': return 'Boys Hostel Warden';
    case 'girls_warden': return 'Girls Hostel Warden';
    case 'warden': return 'Hostel Warden';
    default: return 'Staff Authority';
  }
}

/**
 * Format jurisdiction subtitle for the active role
 */
function getRoleJurisdiction(user) {
  const role = String(user?.role || '').toLowerCase().replace(/[\s-]+/g, '_');
  switch (role) {
    case 'counselor':
      return `Ward: ${user.startRoll || 'Start'} - ${user.endRoll || 'End'}`;
    case 'advisor':
      return `${user.academicYear || '3 Year'} • Dept: ${user.dept || 'Engineering'} - Sec ${user.yearSec || 'A'}`;
    case 'hod':
      return `Department of ${user.dept || 'Engineering'} Engineering`;
    case 'principal':
      return 'GRTIET Institution-Wide Clearance';
    case 'boys_warden':
      return 'Boys Hostel Movement & Gate Governance';
    case 'girls_warden':
      return 'Girls Hostel Movement & Gate Governance';
    case 'warden':
      return 'Hostel Movement & Gate Clearance';
    default:
      return 'Institutional Clearance';
  }
}

/**
 * Format role-specific welcome guidance text (clean, professional, no fake fluff)
 */
function getRoleWelcomeSubtitle(user) {
  const role = String(user?.role || '').toLowerCase().replace(/[\s-]+/g, '_');
  switch (role) {
    case 'counselor':
      return 'Review and verify student requests (Gate Pass, Leave & OD) for your assigned ward before forwarding to Class Advisor.';
    case 'advisor':
      return 'Review student requests pre-screened by counselors and endorse legitimate requisitions to Head of Department.';
    case 'hod':
      return 'Department-level pass authorizations, final closure for Leave requests, and sanction for Academic On-Duty.';
    case 'principal':
      return 'Institutional Directorate gate clearance for Day Scholar students across all engineering departments.';
    case 'boys_warden':
    case 'girls_warden':
    case 'warden':
      return 'Hostel student movement governance, gate pass sanction, and campus entry/exit audit.';
    default:
      return 'Review and manage authorized student requests.';
  }
}

/**
 * Label for the roster tab
 */
function getRosterTabLabel(role) {
  const r = String(role || '').toLowerCase().replace(/[\s-]+/g, '_');
  switch (r) {
    case 'counselor': return 'Ward Student List';
    case 'advisor': return 'Class Student List';
    case 'hod': return 'Department Student Roster';
    case 'principal': return 'Institutional Directory';
    case 'boys_warden':
    case 'girls_warden':
    case 'warden': return 'Hostel Resident Roster';
    default: return 'Student Roster';
  }
}

/**
 * Initialize Authority Portal for the logged-in user
 */
function initAuthorityPortal(user) {
  if (!user || !user.role) return;

  // Set body theme
  document.body.classList.remove('theme-student');
  document.body.classList.add('theme-authority');

  const authLayout = document.getElementById('authorityDashboardLayout');
  const stuPortal = document.getElementById('studentPortalContainer');
  if (stuPortal) {
    stuPortal.classList.add('hidden');
    stuPortal.style.display = 'none';
  }
  if (authLayout) {
    authLayout.classList.remove('hidden');
    authLayout.style.display = 'flex';
    authLayout.style.visibility = 'visible';
  }

  // Setup user profile header details
  const name = user.name || 'Staff Member';
  const roleDisplay = getRoleDisplay(user.role);
  const initials = name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || 'ST';

  const avatarEl = document.getElementById('authAvatarInitials');
  if (avatarEl) avatarEl.innerText = initials;

  const profNameEl = document.getElementById('authProfileName');
  if (profNameEl) profNameEl.innerText = name;

  const profRoleEl = document.getElementById('authProfileRole');
  if (profRoleEl) profRoleEl.innerText = roleDisplay;

  // Personalized Welcome Section: Dynamically display logged-in student/staff name
  const welcomeHeading = document.getElementById('authWelcomeHeading');
  if (welcomeHeading) {
    welcomeHeading.innerText = `Welcome, ${name}`;
  }

  const welcomeSub = document.getElementById('authWelcomeSubtitle');
  if (welcomeSub) {
    welcomeSub.innerText = getRoleWelcomeSubtitle(user);
  }

  const welcomeBadge = document.getElementById('authWelcomeBadge');
  if (welcomeBadge) {
    welcomeBadge.innerText = getRoleJurisdiction(user);
  }

  // Sidebar Role & Jurisdiction
  const sideRoleTitle = document.getElementById('authSidebarRoleTitle');
  if (sideRoleTitle) sideRoleTitle.innerText = roleDisplay;

  const sideJurisdiction = document.getElementById('authSidebarJurisdictionBadge');
  if (sideJurisdiction) sideJurisdiction.innerText = getRoleJurisdiction(user);

  const sideRosterLabel = document.getElementById('authSidebarRosterLabel');
  if (sideRosterLabel) sideRosterLabel.innerText = getRosterTabLabel(user.role);

  const topRosterLabel = document.getElementById('authTopNavRosterLabel');
  if (topRosterLabel) topRosterLabel.innerText = getRosterTabLabel(user.role);

  // Set default view tab
  switchAuthorityMainTab('verification');

  // Fetch live database records
  fetchAuthorityData();
}

/**
 * Switch main view (Verification Desk | Student List | Gate Pass | Leave | OD | Approved | Reports)
 */
function switchAuthorityMainTab(tab) {
  authState.activeTab = tab;
  authState.searchQuery = '';
  authState.page = 1;

  const searchInput = document.getElementById('authSearchInput');
  if (searchInput) searchInput.value = '';

  // Update sidebar active buttons
  const sideBtns = ['verification', 'roster', 'gatepass', 'leave', 'onduty', 'approved', 'reports'];
  sideBtns.forEach(b => {
    const btn = document.getElementById(`authSideBtn_${b}`);
    if (btn) {
      if (b === tab) {
        btn.className = 'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold transition text-left auth-side-active shadow-2xs';
      } else {
        btn.className = 'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition text-left font-medium';
      }
    }
  });

  // Update top nav active items
  const topNavMap = {
    verification: 'dashboard',
    roster: 'roster',
    gatepass: 'pass',
    leave: 'leave',
    onduty: 'onduty',
    reports: 'reports'
  };
  const currentTop = topNavMap[tab] || 'dashboard';
  ['dashboard', 'pass', 'leave', 'onduty', 'roster', 'reports'].forEach(tn => {
    const el = document.getElementById(`authTopNav_${tn}`);
    if (el) {
      if (tn === currentTop) {
        el.className = 'auth-top-btn py-1.5 text-blue-700 border-b-2 border-blue-700 font-bold';
      } else {
        el.className = 'auth-top-btn py-1.5 text-slate-600 hover:text-slate-900 transition font-medium';
      }
    }
  });

  // Toggle visible section
  const secRequests = document.getElementById('authSection_requests');
  const secRoster = document.getElementById('authSection_roster');
  const secReports = document.getElementById('authSection_reports');

  if (tab === 'roster') {
    if (secRequests) secRequests.classList.add('hidden');
    if (secRoster) secRoster.classList.remove('hidden');
    if (secReports) secReports.classList.add('hidden');
    fetchAuthorityStudents();
  } else if (tab === 'reports') {
    if (secRequests) secRequests.classList.add('hidden');
    if (secRoster) secRoster.classList.add('hidden');
    if (secReports) secReports.classList.remove('hidden');
    renderAuthorityReports();
  } else {
    if (secRequests) secRequests.classList.remove('hidden');
    if (secRoster) secRoster.classList.add('hidden');
    if (secReports) secReports.classList.add('hidden');

    // Set subFilter based on tab
    if (tab === 'gatepass') setAuthoritySubFilter('gatepass');
    else if (tab === 'leave') setAuthoritySubFilter('leave');
    else if (tab === 'onduty') setAuthoritySubFilter('onduty');
    else if (tab === 'approved') setAuthoritySubFilter('approved');
    else setAuthoritySubFilter('all'); // Show all pending student requisitions by default
  }
}

/**
 * Switch Sub-filter tabs (Gate Pass Requests | Leave Requests | OD Requests | All Requests)
 */
function setAuthoritySubFilter(sub) {
  authState.subFilter = sub;
  authState.page = 1;

  const filters = ['gatepass', 'leave', 'onduty', 'all', 'approved'];
  filters.forEach(f => {
    const btn = document.getElementById(`authTabBtn_${f}`);
    if (btn) {
      if (f === sub) {
        btn.className = 'auth-filter-tab px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 auth-tab-active shadow-sm';
      } else {
        btn.className = 'auth-filter-tab px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 auth-tab-inactive';
      }
    }
  });

  renderAuthorityRequestsTable();
}

/**
 * Fetch all relevant requests from backend database for the current logged-in authority
 */
async function fetchAuthorityData() {
  const user = window.loggedUser;
  if (!user || !user.role) return;

  authState.loading = true;
  updateRefreshSpinners(true);

  try {
    const role = String(user.role).toLowerCase().replace(/[\s-]+/g, '_');
    const uid = encodeURIComponent(user.userId || '');

    let passUrl = `/api/passes?authorityUserId=${uid}&role=${encodeURIComponent(role)}`;
    let odUrl = `/api/onduty?authorityUserId=${uid}&role=${encodeURIComponent(role)}`;

    if (role === 'counselor') {
      passUrl += `&counselorName=${encodeURIComponent(user.name || '')}&startRoll=${encodeURIComponent(user.startRoll || '')}&endRoll=${encodeURIComponent(user.endRoll || '')}`;
      odUrl += `&counselorName=${encodeURIComponent(user.name || '')}&startRoll=${encodeURIComponent(user.startRoll || '')}&endRoll=${encodeURIComponent(user.endRoll || '')}`;
    } else if (role === 'advisor') {
      passUrl += `&dept=${encodeURIComponent(user.dept || '')}&yearSec=${encodeURIComponent(user.yearSec || '')}`;
      odUrl += `&dept=${encodeURIComponent(user.dept || '')}&yearSec=${encodeURIComponent(user.yearSec || '')}`;
    } else if (role === 'hod') {
      passUrl += `&dept=${encodeURIComponent(user.dept || '')}`;
      odUrl += `&dept=${encodeURIComponent(user.dept || '')}`;
    }

    const [passesRes, odRes] = await Promise.all([
      Api.get(passUrl).catch(() => []),
      Api.get(odUrl).catch(() => [])
    ]);

    const passes = Array.isArray(passesRes) ? passesRes : (passesRes?.passes || []);
    const odRequests = Array.isArray(odRes) ? odRes : (odRes?.requests || []);

    authState.passes = passes;
    authState.odRequests = odRequests;

    // Update real counts in badges
    updateAuthorityBadges();

    // Re-render table if on requests section
    if (authState.activeTab !== 'roster' && authState.activeTab !== 'reports') {
      renderAuthorityRequestsTable();
    }
  } catch (err) {
    console.error('Error fetching authority data:', err);
    if (typeof showToast === 'function') {
      showToast('Error syncing requests with database: ' + err.message, 'error');
    }
  } finally {
    authState.loading = false;
    updateRefreshSpinners(false);
  }
}

/**
 * Filter items that are currently pending this role's review
 */
function isPendingForRole(item, isOD) {
  const role = String(window.loggedUser?.role || '').toLowerCase().replace(/[\s-]+/g, '_');
  const status = String(item.status || '');

  if (isOD) {
    if (role === 'counselor') return status === 'Pending Counselor';
    if (role === 'advisor') return status === 'Pending Advisor';
    if (role === 'hod') return status === 'Pending HOD';
    return false;
  }

  if (role === 'counselor') return status === 'Pending Counselor';
  if (role === 'advisor') return status === 'Pending Advisor';
  if (role === 'hod') return status === 'Pending HOD';
  if (role === 'principal') return status === 'Pending Principal';
  if (role === 'boys_warden') return status === 'Pending Boys Warden' || status === 'Pending Warden';
  if (role === 'girls_warden') return status === 'Pending Girls Warden' || status === 'Pending Warden';
  if (role === 'warden') return status.includes('Warden');

  return status.toLowerCase().includes('pending');
}

/**
 * Filter items that have been approved/endorsed by this role
 */
function isApprovedByRole(item, isOD) {
  const role = String(window.loggedUser?.role || '').toLowerCase().replace(/[\s-]+/g, '_');

  if (isOD) {
    if (role === 'counselor') return item.counselorApproval?.approved === true;
    if (role === 'advisor') return item.advisorApproval?.approved === true;
    if (role === 'hod') return item.hodApproval?.approved === true || item.status === 'Approved';
    return false;
  }

  if (role === 'counselor') return item.counselorApproval?.approved === true;
  if (role === 'advisor') return item.advisorApproval?.approved === true;
  if (role === 'hod') return item.hodApproval?.approved === true;
  if (role === 'principal') return item.principalApproval?.approved === true || item.status === 'Approved';
  if (role.includes('warden')) return item.wardenApproval?.approved === true || item.status === 'Approved';

  return item.status === 'Approved';
}

/**
 * Update all badge counters across top nav, filter tabs, and sidebar
 */
function updateAuthorityBadges() {
  const user = window.loggedUser;
  if (!user) return;

  const passes = authState.passes || [];
  const ods = authState.odRequests || [];

  // Categorize
  const pendingLeave = passes.filter(p => p.requestCategory === 'leave' && isPendingForRole(p, false));
  const pendingGatePass = passes.filter(p => p.requestCategory !== 'leave' && isPendingForRole(p, false));
  const pendingOD = ods.filter(o => isPendingForRole(o, true));
  const totalPending = pendingLeave.length + pendingGatePass.length + pendingOD.length;

  const approvedLeave = passes.filter(p => p.requestCategory === 'leave' && isApprovedByRole(p, false));
  const approvedGatePass = passes.filter(p => p.requestCategory !== 'leave' && isApprovedByRole(p, false));
  const approvedOD = ods.filter(o => isApprovedByRole(o, true));
  const totalApproved = approvedLeave.length + approvedGatePass.length + approvedOD.length;

  // Notification Bell Badge
  const bellBadge = document.getElementById('authBellBadge');
  if (bellBadge) {
    bellBadge.innerText = totalPending;
    bellBadge.style.display = totalPending > 0 ? 'flex' : 'none';
  }

  // Filter Tab Badges
  const badgeGp = document.getElementById('authCountBadge_gatepass');
  if (badgeGp) badgeGp.innerText = pendingGatePass.length;

  const badgeLeave = document.getElementById('authCountBadge_leave');
  if (badgeLeave) badgeLeave.innerText = pendingLeave.length;

  const badgeOd = document.getElementById('authCountBadge_onduty');
  if (badgeOd) badgeOd.innerText = pendingOD.length;

  const badgeAll = document.getElementById('authCountBadge_all');
  if (badgeAll) badgeAll.innerText = totalPending;

  const badgeApproved = document.getElementById('authCountBadge_approved');
  if (badgeApproved) badgeApproved.innerText = totalApproved;

  // Sidebar Badges
  const sideDeskBadge = document.getElementById('authSideBadge_verification');
  if (sideDeskBadge) sideDeskBadge.innerText = totalPending;

  const sideGpBadge = document.getElementById('authSideBadge_gatepass');
  if (sideGpBadge) sideGpBadge.innerText = pendingGatePass.length;

  const sideLeaveBadge = document.getElementById('authSideBadge_leave');
  if (sideLeaveBadge) sideLeaveBadge.innerText = pendingLeave.length;

  const sideOdBadge = document.getElementById('authSideBadge_onduty');
  if (sideOdBadge) sideOdBadge.innerText = pendingOD.length;

  const sideApprovedBadge = document.getElementById('authSideBadge_approved');
  if (sideApprovedBadge) sideApprovedBadge.innerText = totalApproved;
}

/**
 * Filter and sort requests for the currently active tab & search query
 */
function getFilteredRequests() {
  const sub = authState.subFilter;
  const q = (authState.searchQuery || '').trim().toLowerCase();

  let list = [];

  if (sub === 'leave') {
    list = authState.passes.filter(p => p.requestCategory === 'leave' && isPendingForRole(p, false)).map(p => ({ ...p, _type: 'leave' }));
  } else if (sub === 'gatepass') {
    list = authState.passes.filter(p => p.requestCategory !== 'leave' && isPendingForRole(p, false)).map(p => ({ ...p, _type: 'gatepass' }));
  } else if (sub === 'onduty') {
    list = authState.odRequests.filter(o => isPendingForRole(o, true)).map(o => ({ ...o, _type: 'onduty' }));
  } else if (sub === 'approved') {
    const appPasses = authState.passes.filter(p => isApprovedByRole(p, false)).map(p => ({ ...p, _type: p.requestCategory === 'leave' ? 'leave' : 'gatepass' }));
    const appOD = authState.odRequests.filter(o => isApprovedByRole(o, true)).map(o => ({ ...o, _type: 'onduty' }));
    list = [...appPasses, ...appOD];
  } else {
    // All Pending
    const pendPasses = authState.passes.filter(p => isPendingForRole(p, false)).map(p => ({ ...p, _type: p.requestCategory === 'leave' ? 'leave' : 'gatepass' }));
    const pendOD = authState.odRequests.filter(o => isPendingForRole(o, true)).map(o => ({ ...o, _type: 'onduty' }));
    list = [...pendPasses, ...pendOD];
  }

  // Apply search query
  if (q) {
    list = list.filter(item => {
      const matchName = String(item.name || '').toLowerCase().includes(q);
      const matchRoll = String(item.rollNo || '').toLowerCase().includes(q);
      const matchReason = String(item.reason || '').toLowerCase().includes(q);
      const matchDept = String(item.dept || '').toLowerCase().includes(q);
      return matchName || matchRoll || matchReason || matchDept;
    });
  }

  // Sort by createdAt descending
  list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return list;
}

/**
 * Render the main requests table matching the reference design
 */
function renderAuthorityRequestsTable() {
  const container = document.getElementById('authRequestsTableBody');
  const titleEl = document.getElementById('authTableHeadingTitle');
  const subEl = document.getElementById('authTableHeadingSubtitle');
  const paginationInfo = document.getElementById('authTablePaginationInfo');
  if (!container) return;

  const items = getFilteredRequests();
  const sub = authState.subFilter;

  // Title configuration
  const titles = {
    leave: `Leave Requests (${items.length})`,
    gatepass: `Gate Pass Requests (${items.length})`,
    onduty: `On-Duty (OD) Requests (${items.length})`,
    all: `All Pending Requests (${items.length})`,
    approved: `Approved & Endorsed Clearances (${items.length})`
  };
  const subtitles = {
    leave: 'Review student leave requests and verify details before forwarding.',
    gatepass: 'Review student campus gate pass clearance applications.',
    onduty: 'Review official institutional on-duty requisition endorsements.',
    all: 'Complete queue of all pending student requisitions in your jurisdiction.',
    approved: 'Chronological record of all student passes cleared by this authority.'
  };

  if (titleEl) titleEl.innerText = titles[sub] || `Requests (${items.length})`;
  if (subEl) subEl.innerText = subtitles[sub] || 'Review and take action on student requisitions.';

  if (items.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="11" class="py-12 text-center text-slate-500 bg-white">
          <div class="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-200">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div class="text-sm font-bold text-slate-800">No requests found</div>
          <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">There are currently no requisitions matching this category in your jurisdiction.</p>
        </td>
      </tr>
    `;
    if (paginationInfo) paginationInfo.innerText = 'Showing 0 to 0 of 0 requests';
    return;
  }

  // Pagination calculation
  const total = items.length;
  const totalPages = Math.ceil(total / authState.pageSize) || 1;
  if (authState.page > totalPages) authState.page = totalPages;
  const startIdx = (authState.page - 1) * authState.pageSize;
  const pageItems = items.slice(startIdx, startIdx + authState.pageSize);

  if (paginationInfo) {
    paginationInfo.innerText = `Showing ${startIdx + 1} to ${Math.min(startIdx + authState.pageSize, total)} of ${total} requests`;
  }

  // Render rows matching the institutional authority table layout
  container.innerHTML = pageItems.map((item, idx) => {
    const rowNum = startIdx + idx + 1;
    const isOD = item._type === 'onduty';
    const isHostel = (/hoste?l|^h$/i.test(item.accommodation || '') && !/day\s*scholar/i.test(item.accommodation || ''));

    // Departure & Return formatting
    let depDisplay = '-';
    let retDisplay = '-';
    if (isOD) {
      if (item.mode === 'time') {
        depDisplay = item.specificDate || item.fromDate || '-';
        retDisplay = `${item.fromTime || ''} - ${item.toTime || ''}`;
      } else {
        depDisplay = item.fromDate || '-';
        retDisplay = item.toDate || '-';
      }
    } else {
      depDisplay = formatAcademicDateTime(item.departureDate || item.leaveDate, item.departureTime || item.leaveTime);
      retDisplay = formatAcademicDateTime(item.expectedReturnDate || item.returnDate || item.toDate, item.expectedReturnTime || item.returnTime);
    }

    const reasonDisplay = item.reason || '-';
    const destDisplay = item.destination || item.placeOrEvent || '';
    const statusInfo = typeof getDetailedStatusInfo === 'function' ? getDetailedStatusInfo(item) : {
      statusText: item.status || 'Pending',
      statusClass: item.status === 'Approved' ? 'badge-status-approved' : (item.status === 'Rejected' ? 'badge-status-rejected' : 'badge-status-pending')
    };

    const isPending = isPendingForRole(item, isOD);

    return `
      <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
        <!-- 1. # -->
        <td class="text-xs font-semibold text-slate-500 text-center">${rowNum}</td>

        <!-- 2. Student Name -->
        <td>
          <div class="font-bold text-slate-900 text-sm">${escapeHtml(item.name || item.studentName || 'Student')}</div>
          <div class="text-[10px] text-slate-500 font-mono">${isHostel ? 'Hosteller' : 'Day Scholar'}</div>
        </td>

        <!-- 3. Registration Number -->
        <td>
          <span class="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
            ${escapeHtml(item.rollNo || '-')}
          </span>
        </td>

        <!-- 4. Department & Year/Sec -->
        <td class="text-xs font-semibold text-slate-800 whitespace-nowrap">
          ${escapeHtml(item.dept || '-')} - Sec ${escapeHtml(item.yearSec || '-')}
        </td>

        <!-- 5. Parent's Phone -->
        <td class="whitespace-nowrap">
          <a href="tel:${escapeAttr(item.parentContact || item.parentPhone || '')}" class="text-xs font-mono font-semibold text-emerald-700 hover:underline">
            ${escapeHtml(item.parentContact || item.parentPhone || '-')}
          </a>
        </td>

        <!-- 6. Departure Date & Time -->
        <td class="text-xs text-slate-700 whitespace-nowrap font-mono">
          ${escapeHtml(depDisplay)}
        </td>

        <!-- 7. Return Date & Time -->
        <td class="text-xs text-slate-700 whitespace-nowrap font-mono">
          ${escapeHtml(retDisplay)}
        </td>

        <!-- 8. Reason / Destination -->
        <td class="max-w-[180px]">
          <div class="text-xs text-slate-800 font-medium truncate" title="${escapeAttr(reasonDisplay)}">
            ${escapeHtml(reasonDisplay)}
          </div>
          ${destDisplay ? `<div class="text-[11px] text-blue-700 font-medium truncate" title="Destination: ${escapeAttr(destDisplay)}">📍 ${escapeHtml(destDisplay)}</div>` : ''}
        </td>

        <!-- 9. Current Status -->
        <td>
          <span class="${statusInfo.statusClass}">
            ${statusInfo.statusText}
          </span>
        </td>

        <!-- 10. Actions -->
        <td class="text-right whitespace-nowrap">
          <div class="inline-flex items-center gap-1">
            <!-- View Request -->
            <button
              type="button"
              onclick="openAuthorityDetailModal('${item._id}', ${isOD})"
              class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition active:scale-95 shadow-2xs"
              title="View full request details"
            >
              View Request
            </button>

            <!-- View Letter -->
            <button
              type="button"
              onclick="${isOD ? `viewOnDutyLetter(${escapeAttr(item)})` : `viewFormalLetter(${escapeAttr(item)})`}"
              class="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-700 shadow-2xs transition active:scale-95"
              title="View formal generated letter"
            >
              View Letter
            </button>

            <!-- Download Letter -->
            <button
              type="button"
              onclick="${isOD ? `downloadOnDutyLetterPDF(${escapeAttr(item)})` : `downloadOfficialLetterOnlyPDF(${escapeAttr(item)})`}"
              class="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-xs font-semibold text-blue-700 shadow-2xs transition active:scale-95"
              title="Download letter as PDF"
            >
              Download
            </button>

            <!-- Direct Approve & Reject when pending -->
            ${isPending ? `
              <button
                type="button"
                onclick="promptRejectCurrentItem('${item._id}', ${isOD})"
                class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-semibold transition active:scale-95 shadow-2xs"
                title="Reject request with reason"
              >
                Reject
              </button>
              <button
                type="button"
                onclick="executeApproveCurrentItem('${item._id}', ${isOD})"
                class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition active:scale-95 shadow-xs"
                title="Approve and forward request"
              >
                Approve
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Fetch and render student roster for the authority
 */
async function fetchAuthorityStudents() {
  const user = window.loggedUser;
  if (!user || !user.role) return;

  const container = document.getElementById('authRosterTableBody');
  const rosterCount = document.getElementById('authRosterTotalCount');
  if (!container) return;

  container.innerHTML = `
    <tr>
      <td colspan="8" class="py-10 text-center text-slate-500">
        <div class="inline-block animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></div>
        <div class="text-xs">Loading assigned student roster from database...</div>
      </td>
    </tr>
  `;

  try {
    const role = String(user.role).toLowerCase().replace(/[\s-]+/g, '_');
    let q = '?limit=1000';

    if (role === 'counselor') {
      // Counselors filter by their assigned roll range or counselor name
      q += `&search=${encodeURIComponent(user.name || '')}`;
    } else if (role === 'advisor') {
      q += `&dept=${encodeURIComponent(user.dept || '')}&yearSec=${encodeURIComponent(user.yearSec || '')}`;
    } else if (role === 'hod') {
      q += `&dept=${encodeURIComponent(user.dept || '')}`;
    } else if (role.includes('warden')) {
      q += `&accommodation=Hosteller`;
    }

    const res = await Api.get(`/api/admin/students${q}`);
    let students = Array.isArray(res) ? res : (res?.students || []);

    // Filter counselor ward by startRoll & endRoll strictly if set
    if (role === 'counselor' && user.startRoll && user.endRoll) {
      const s = String(user.startRoll).trim().toUpperCase();
      const e = String(user.endRoll).trim().toUpperCase();
      students = students.filter(st => {
        const r = String(st.rollNo || '').trim().toUpperCase();
        return r >= s && r <= e;
      });
    }

    authState.students = students;
    if (rosterCount) rosterCount.innerText = `${students.length} Enrolled Students`;

    renderAuthorityStudentsTable();
  } catch (err) {
    console.error('Error fetching student roster:', err);
    container.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-rose-500 text-xs font-semibold">Failed to load student roster: ${err.message}</td></tr>`;
  }
}

/**
 * Render Student Roster Table
 */
function renderAuthorityStudentsTable() {
  const container = document.getElementById('authRosterTableBody');
  if (!container) return;

  const q = (authState.searchQuery || '').trim().toLowerCase();
  let students = authState.students || [];

  if (q) {
    students = students.filter(s =>
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.rollNo || '').toLowerCase().includes(q) ||
      String(s.parentContact || '').includes(q)
    );
  }

  if (students.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="8" class="py-12 text-center text-slate-500 bg-white">
          <div class="text-sm font-bold text-slate-800">No students found</div>
          <p class="text-xs text-slate-500 mt-1">No enrolled students in this jurisdiction.</p>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = students.map((s, idx) => {
    const isHostel = (/hoste?l|^h$/i.test(s.accommodation || '') && !/day/i.test(s.accommodation || ''));
    const accomBadge = isHostel
      ? '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Hosteller</span>'
      : '<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Day Scholar</span>';

    return `
      <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
        <td class="text-xs font-semibold text-slate-500 text-center py-3">${idx + 1}</td>
        <td>
          <span class="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
            ${escapeHtml(s.rollNo || '-')}
          </span>
        </td>
        <td>
          <div class="font-bold text-slate-900 text-sm">${escapeHtml(s.name || '-')}</div>
        </td>
        <td class="text-xs text-slate-600">${escapeHtml(s.gender || '-')}</td>
        <td class="text-xs font-semibold text-slate-800">${s.dept || ''} - Sec ${s.yearSec || ''}</td>
        <td>${accomBadge}</td>
        <td class="text-xs text-slate-700">${escapeHtml(s.parentName || s.fatherName || '-')}</td>
        <td>
          <a href="tel:${s.parentContact}" class="text-xs font-mono font-semibold text-emerald-700 hover:underline">
            ${escapeHtml(s.parentContact || '-')}
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render Reports section
 */
function renderAuthorityReports() {
  const passes = authState.passes || [];
  const ods = authState.odRequests || [];

  const total = passes.length + ods.length;
  const approved = passes.filter(p => isApprovedByRole(p, false)).length + ods.filter(o => isApprovedByRole(o, true)).length;
  const rejected = passes.filter(p => p.status === 'Rejected').length + ods.filter(o => o.status === 'Rejected').length;
  const pending = total - approved - rejected;

  const totalEl = document.getElementById('repTotalProcessed');
  if (totalEl) totalEl.innerText = total;

  const appEl = document.getElementById('repTotalApproved');
  if (appEl) appEl.innerText = approved;

  const rejEl = document.getElementById('repTotalRejected');
  if (rejEl) rejEl.innerText = rejected;

  const pendEl = document.getElementById('repTotalPending');
  if (pendEl) pendEl.innerText = pending;
}

/**
 * Open detail modal for inspecting and approving/rejecting a student request
 */
function openAuthorityDetailModal(id, isOD) {
  let item = null;
  if (isOD) {
    item = authState.odRequests.find(o => String(o._id) === String(id));
  } else {
    item = authState.passes.find(p => String(p._id) === String(id));
  }

  if (!item) return;
  authState.activeDetailItem = { item, isOD };

  const modal = document.getElementById('authDetailModal');
  if (!modal) return;

  const user = window.loggedUser;
  const role = String(user?.role || '').toLowerCase().replace(/[\s-]+/g, '_');

  // Fill in modal fields
  const nameEl = document.getElementById('authModalStudentName');
  if (nameEl) nameEl.innerText = item.name || 'Student';

  const rollEl = document.getElementById('authModalRollNo');
  if (rollEl) rollEl.innerText = item.rollNo || '-';

  const classEl = document.getElementById('authModalClass');
  if (classEl) classEl.innerText = `${item.dept || ''} - Sec ${item.yearSec || ''} (${item.academicYear || '3 Year'})`;

  const accomEl = document.getElementById('authModalAccom');
  if (accomEl) {
    const isH = (/hoste?l|^h$/i.test(item.accommodation || '') && !/day/i.test(item.accommodation || ''));
    accomEl.innerText = isH ? 'Hosteller' : 'Day Scholar';
    accomEl.className = isH
      ? 'px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200';
  }

  const parentEl = document.getElementById('authModalParentName');
  if (parentEl) parentEl.innerText = item.parentName || item.fatherName || '-';

  const phoneEl = document.getElementById('authModalParentPhone');
  if (phoneEl) {
    phoneEl.innerText = item.parentContact || '-';
    phoneEl.href = `tel:${item.parentContact || ''}`;
  }

  const reasonEl = document.getElementById('authModalReason');
  if (reasonEl) reasonEl.innerText = item.reason || '-';

  // Schedule dates
  let dateText = '';
  if (isOD) {
    if (item.mode === 'time') {
      dateText = `Date: ${item.specificDate || item.fromDate || '-'} | Time: ${item.fromTime || ''} to ${item.toTime || ''}`;
    } else {
      dateText = `From Date: ${item.fromDate || '-'} to ${item.toDate || '-'}`;
    }
  } else if (item.requestCategory === 'leave') {
    dateText = `From Date: ${item.fromDate || item.leaveDate || '-'} to ${item.toDate || '-'}`;
  } else {
    dateText = `Departure: ${item.departureDate || item.leaveDate || '-'} at ${item.departureTime || item.leaveTime || '-'} | Return: ${item.expectedReturnDate || '-'} at ${item.expectedReturnTime || '-'}`;
  }
  const dateEl = document.getElementById('authModalDates');
  if (dateEl) dateEl.innerText = dateText;

  // Formal Letter buttons (Available for Gate Passes, Leaves & OD)
  const letterBtn = document.getElementById('authModalViewLetterBtn');
  if (letterBtn) {
    letterBtn.onclick = () => {
      if (isOD) {
        if (typeof viewOnDutyLetter === 'function') viewOnDutyLetter(item);
      } else {
        if (typeof viewFormalLetter === 'function') viewFormalLetter(item);
      }
    };
  }

  const dlLetterBtn = document.getElementById('authModalDownloadLetterBtn');
  if (dlLetterBtn) {
    dlLetterBtn.onclick = () => {
      if (isOD) {
        if (typeof downloadOnDutyLetterPDF === 'function') downloadOnDutyLetterPDF(item);
      } else {
        if (typeof downloadOfficialLetterOnlyPDF === 'function') downloadOfficialLetterOnlyPDF(item);
      }
    };
  }

  // Setup Dynamic Action Buttons based on Role & Request Workflow
  const actionsContainer = document.getElementById('authModalActionButtons');
  if (actionsContainer) {
    let approveBtnText = 'Approve Request';
    let approveBtnClass = 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs';

    if (role === 'counselor') {
      approveBtnText = 'Verify & Forward to Advisor';
    } else if (role === 'advisor') {
      approveBtnText = 'Endorse & Forward to HOD';
    } else if (role === 'hod') {
      if (item.requestCategory === 'leave') {
        approveBtnText = 'Approve & Close Leave Request'; // HOD IS FINAL AUTHORITY FOR LEAVE
        approveBtnClass = 'px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs';
      } else if (isOD) {
        approveBtnText = 'Approve OD Sanction'; // HOD IS FINAL FOR OD
        approveBtnClass = 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs';
      } else {
        // Gate passes move to Principal
        approveBtnText = 'Endorse & Forward to Principal';
      }
    } else if (role === 'principal') {
      const isH = (/hoste?l|^h$/i.test(item.accommodation || '') && !/day/i.test(item.accommodation || ''));
      approveBtnText = isH ? 'Endorse & Forward to Warden' : 'Grant Final Approval (Gate Pass Ready)';
      approveBtnClass = 'px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs';
    } else if (role.includes('warden')) {
      approveBtnText = 'Grant Final Approval (Gate Pass Ready)';
      approveBtnClass = 'px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs';
    }

    const isPending = isPendingForRole(item, isOD);

    if (isPending) {
      actionsContainer.innerHTML = `
        <button
          type="button"
          onclick="closeAuthorityDetailModal()"
          class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
        >
          Close
        </button>
        <button
          type="button"
          onclick="promptRejectCurrentItem('${item._id}', ${isOD})"
          class="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition"
        >
          Reject Request
        </button>
        <button
          type="button"
          onclick="executeApproveCurrentItem('${item._id}', ${isOD})"
          class="${approveBtnClass}"
        >
          ${approveBtnText}
        </button>
      `;
    } else {
      actionsContainer.innerHTML = `
        <button
          type="button"
          onclick="closeAuthorityDetailModal()"
          class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
        >
          Close
        </button>
      `;
    }
  }

  modal.classList.remove('hidden');
}

/**
 * Close detail modal
 */
function closeAuthorityDetailModal() {
  const modal = document.getElementById('authDetailModal');
  if (modal) modal.classList.add('hidden');
  authState.activeDetailItem = null;
}

/**
 * Execute Approval for current item
 */
async function executeApproveCurrentItem(id, isOD) {
  const user = window.loggedUser;
  if (!user || !user.role) return;

  const role = String(user.role).toLowerCase().replace(/[\s-]+/g, '_');

  try {
    if (isOD) {
      let endpoint = '/api/onduty/approve/counselor';
      let payload = { id, counselorName: user.name };

      if (role === 'advisor') {
        endpoint = '/api/onduty/approve/advisor';
        payload = { id, advisorName: user.name };
      } else if (role === 'hod') {
        endpoint = '/api/onduty/approve/hod';
        payload = { id, hodName: user.name };
      }

      await Api.post(endpoint, payload);
    } else {
      let endpoint = '/api/approvals/counselor';
      let payload = { passId: id, counselorName: user.name, parentCalled: true };

      if (role === 'advisor') {
        endpoint = '/api/approvals/advisor';
        payload = { passId: id, advisorName: user.name, parentCalledFallback: true };
      } else if (role === 'hod') {
        endpoint = '/api/approvals/hod';
        payload = { passId: id, hodName: user.name };
      } else if (role === 'principal') {
        endpoint = '/api/approvals/principal';
        payload = { passId: id, principalName: user.name };
      } else if (role.includes('warden')) {
        endpoint = '/api/approvals/warden';
        payload = { passId: id, wardenName: user.name };
      }

      await Api.post(endpoint, payload);
    }

    if (typeof showToast === 'function') {
      showToast('Request approved successfully!', 'success');
    }
    closeAuthorityDetailModal();
    fetchAuthorityData();
  } catch (err) {
    console.error('Approval failed:', err);
    if (typeof showToast === 'function') {
      showToast('Approval error: ' + (err.message || 'Unknown error'), 'error');
    }
  }
}

/**
 * Prompt rejection modal for the active item
 */
function promptRejectCurrentItem(id, isOD) {
  closeAuthorityDetailModal();
  if (typeof openRejectModal === 'function') {
    openRejectModal(id, isOD ? 'onduty' : 'pass');
  }
}

/**
 * Handle search input changes
 */
function onAuthoritySearchInput(val) {
  authState.searchQuery = val;
  authState.page = 1;

  if (authState.activeTab === 'roster') {
    renderAuthorityStudentsTable();
  } else {
    renderAuthorityRequestsTable();
  }
}

/**
 * Pagination Controls
 */
function prevAuthorityPage() {
  if (authState.page > 1) {
    authState.page--;
    renderAuthorityRequestsTable();
  }
}

function nextAuthorityPage() {
  const items = getFilteredRequests();
  const totalPages = Math.ceil(items.length / authState.pageSize);
  if (authState.page < totalPages) {
    authState.page++;
    renderAuthorityRequestsTable();
  }
}

/**
 * Update refresh spinner icons
 */
function updateRefreshSpinners(spinning) {
  const icons = document.querySelectorAll('.auth-refresh-icon');
  icons.forEach(i => {
    if (spinning) i.classList.add('animate-spin');
    else i.classList.remove('animate-spin');
  });
}

// Global Exports
window.initAuthorityPortal = initAuthorityPortal;
window.switchAuthorityMainTab = switchAuthorityMainTab;
window.setAuthoritySubFilter = setAuthoritySubFilter;
window.fetchAuthorityData = fetchAuthorityData;
window.fetchAuthorityStudents = fetchAuthorityStudents;
window.openAuthorityDetailModal = openAuthorityDetailModal;
window.closeAuthorityDetailModal = closeAuthorityDetailModal;
window.executeApproveCurrentItem = executeApproveCurrentItem;
window.promptRejectCurrentItem = promptRejectCurrentItem;
window.onAuthoritySearchInput = onAuthoritySearchInput;
window.prevAuthorityPage = prevAuthorityPage;
window.nextAuthorityPage = nextAuthorityPage;
window.authState = authState;

