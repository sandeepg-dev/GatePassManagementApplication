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

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  if (typeof str === 'object') {
    try {
      str = JSON.stringify(str);
    } catch (e) {
      str = '';
    }
  }
  return escapeHtml(str);
}

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
    case 'boys_warden': return 'Boys Hostel Residents';
    case 'girls_warden': return 'Girls Hostel Residents';
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

  const roleKey = String(user.role).trim().toLowerCase().replace(/[\s-]+/g, '_');
  const isCounselor = roleKey === 'counselor';
  const isAdvisor = roleKey === 'advisor';
  const isHod = roleKey === 'hod';
  const isPrincipal = roleKey === 'principal';
  const isWarden = roleKey.includes('warden');

  // Requirement: Top Navigation removed completely from all staff portals (Navigation strictly in Left Sidebar)
  const topNavContainer = document.getElementById('authTopNavContainer');
  if (topNavContainer) {
    topNavContainer.innerHTML = '';
    topNavContainer.classList.add('hidden');
    topNavContainer.style.display = 'none';
  }

  // Requirement: Principal & Warden Portals focus on Gate Passes - Leave & OD are completely omitted
  if (isPrincipal || isWarden) {
    const sideLeaveBtn = document.getElementById('authSideBtn_leave');
    if (sideLeaveBtn) { sideLeaveBtn.classList.add('hidden'); sideLeaveBtn.style.display = 'none'; }
    const sideOdBtn = document.getElementById('authSideBtn_onduty');
    if (sideOdBtn) { sideOdBtn.classList.add('hidden'); sideOdBtn.style.display = 'none'; }

    const tabLeaveBtn = document.getElementById('authTabBtn_leave');
    if (tabLeaveBtn) { tabLeaveBtn.classList.add('hidden'); tabLeaveBtn.style.display = 'none'; }
    const tabOdBtn = document.getElementById('authTabBtn_onduty');
    if (tabOdBtn) { tabOdBtn.classList.add('hidden'); tabOdBtn.style.display = 'none'; }
    const tabAllBtn = document.getElementById('authTabBtn_all');
    if (tabAllBtn) { tabAllBtn.classList.add('hidden'); tabAllBtn.style.display = 'none'; }
  } else {
    // Requirement: Hide "All Requests" filter button for Counselor, Advisor, and HOD (replaced with Gate Pass Request)
    const allReqsTabBtn = document.getElementById('authTabBtn_all');
    if (allReqsTabBtn) {
      if (isCounselor || isAdvisor || isHod) {
        allReqsTabBtn.classList.add('hidden');
        allReqsTabBtn.style.display = 'none';
      } else {
        allReqsTabBtn.classList.remove('hidden');
        allReqsTabBtn.style.display = '';
      }
    }
  }

  // Pre-fetch student roster for Counselor, Advisor, HOD, and Warden
  if (isCounselor || isAdvisor || isHod || isWarden) {
    fetchAuthorityStudents();
  }

  // Set default view tab: Counselor, Advisor, HOD, Principal, and Warden open directly with Gate Pass Request
  if (isCounselor || isAdvisor || isHod || isPrincipal || isWarden) {
    switchAuthorityMainTab('gatepass');
    setAuthoritySubFilter('gatepass');
  } else {
    switchAuthorityMainTab('verification');
  }

  // Fetch live database records
  fetchAuthorityData();
}

/**
 * Switch main view (Verification Desk | Ward | Student List | Gate Pass | Leave | OD | Approved | Reports)
 */
function switchAuthorityMainTab(tab) {
  const user = window.loggedUser;
  const roleKey = user && user.role ? String(user.role).trim().toLowerCase().replace(/[\s-]+/g, '_') : '';
  const isCounselor = roleKey === 'counselor';
  const isAdvisor = roleKey === 'advisor';
  const isHod = roleKey === 'hod';
  const isPrincipal = roleKey === 'principal';
  const isWarden = roleKey.includes('warden');

  let targetTab = tab;
  // When Counselor, Advisor, HOD, Principal, or Warden opens/clicks Verification Desk, default directly to Gate Pass Request
  if ((isCounselor || isAdvisor || isHod || isPrincipal || isWarden) && (tab === 'verification' || ((isPrincipal || isWarden) && (tab === 'leave' || tab === 'onduty')))) {
    targetTab = 'gatepass';
  } else if (tab === 'ward') {
    targetTab = 'roster';
  }

  authState.activeTab = targetTab;
  authState.searchQuery = '';
  authState.page = 1;

  const searchInput = document.getElementById('authSearchInput');
  if (searchInput) searchInput.value = '';

  // Update sidebar active buttons
  const sideBtns = ['verification', 'roster', 'gatepass', 'leave', 'onduty', 'approved', 'reports'];
  sideBtns.forEach(b => {
    const btn = document.getElementById(`authSideBtn_${b}`);
    if (btn) {
      const isSelected = (b === targetTab) || (b === tab) || ((isCounselor || isAdvisor || isHod || isPrincipal || isWarden) && targetTab === 'gatepass' && b === 'verification');
      if (isSelected) {
        btn.className = 'w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold transition text-left auth-side-active shadow-2xs';
      } else {
        btn.className = 'w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition text-left font-semibold';
      }
    }
  });

  // Toggle visible section
  const secRequests = document.getElementById('authSection_requests');
  const secRoster = document.getElementById('authSection_roster');
  const secReports = document.getElementById('authSection_reports');

  if (targetTab === 'roster') {
    if (secRequests) secRequests.classList.add('hidden');
    if (secRoster) secRoster.classList.remove('hidden');
    if (secReports) secReports.classList.add('hidden');
    fetchAuthorityStudents();
  } else if (targetTab === 'reports') {
    if (secRequests) secRequests.classList.add('hidden');
    if (secRoster) secRoster.classList.add('hidden');
    if (secReports) secReports.classList.remove('hidden');
    renderAuthorityReports();
  } else {
    if (secRequests) secRequests.classList.remove('hidden');
    if (secRoster) secRoster.classList.add('hidden');
    if (secReports) secReports.classList.add('hidden');

    // Set subFilter based on targetTab
    if (targetTab === 'gatepass') setAuthoritySubFilter('gatepass');
    else if (targetTab === 'leave') setAuthoritySubFilter('leave');
    else if (targetTab === 'onduty') setAuthoritySubFilter('onduty');
    else if (targetTab === 'approved') setAuthoritySubFilter('approved');
    else setAuthoritySubFilter(isCounselor ? 'gatepass' : 'all');
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
    } else if (role === 'boys_warden' || role.includes('boys')) {
      passUrl += `&accommodation=Hosteller&role=boys_warden&gender=Male`;
    } else if (role === 'girls_warden' || role.includes('girls')) {
      passUrl += `&accommodation=Hosteller&role=girls_warden&gender=Female`;
    }

    const [passesRes, odRes] = await Promise.all([
      Api.get(passUrl).catch(() => []),
      (role === 'principal' || role.includes('warden')) ? Promise.resolve([]) : Api.get(odUrl).catch(() => [])
    ]);

    let passes = Array.isArray(passesRes) ? passesRes : (passesRes?.passes || []);
    let odRequests = (role === 'principal' || role.includes('warden')) ? [] : (Array.isArray(odRes) ? odRes : (odRes?.requests || []));

    // Client-side guard: Principal only receives Gate Passes
    if (role === 'principal') {
      passes = passes.filter(p => p.requestCategory !== 'leave' && p.type !== 'leave' && !(!p.departureDate && (p.fromDate || p.leaveDate)) && p.requestCategory !== 'onduty' && p._type !== 'onduty');
      odRequests = [];
    } else if (role === 'boys_warden' || role.includes('boys')) {
      passes = passes.filter(p => p.requestCategory !== 'leave' && p.type !== 'leave' && !(!p.departureDate && (p.fromDate || p.leaveDate)) && p.requestCategory !== 'onduty' && p._type !== 'onduty' && String(p.gender || '').trim().toLowerCase() === 'male');
      odRequests = [];
    } else if (role === 'girls_warden' || role.includes('girls')) {
      passes = passes.filter(p => p.requestCategory !== 'leave' && p.type !== 'leave' && !(!p.departureDate && (p.fromDate || p.leaveDate)) && p.requestCategory !== 'onduty' && p._type !== 'onduty' && String(p.gender || '').trim().toLowerCase() === 'female');
      odRequests = [];
    }

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
  const isPostApproval = item.status === 'Approved' || item.status === 'Exited' || item.status === 'Scanned In Campus' || item.status === 'Returned';

  if (isOD) {
    if (role === 'counselor') return item.counselorApproval?.approved === true;
    if (role === 'advisor') return item.advisorApproval?.approved === true;
    if (role === 'hod') return item.hodApproval?.approved === true || item.status === 'Approved';
    return false;
  }

  if (role === 'counselor') return item.counselorApproval?.approved === true || isPostApproval;
  if (role === 'advisor') return item.advisorApproval?.approved === true || isPostApproval;
  if (role === 'hod') return item.hodApproval?.approved === true || isPostApproval;
  if (role === 'principal') return item.principalApproval?.approved === true || isPostApproval;
  if (role.includes('warden')) return item.wardenApproval?.approved === true || isPostApproval;

  return isPostApproval;
}

/**
 * Update all badge counters across top nav, filter tabs, and sidebar
 */
function updateAuthorityBadges() {
  const user = window.loggedUser;
  if (!user) return;

  const passes = authState.passes || [];
  const ods = authState.odRequests || [];

  // Categorize with strict request separation
  const isLeavePass = p => (p.requestCategory === 'leave' || p.type === 'leave' || (!p.departureDate && (p.fromDate || p.leaveDate)));
  const isGatePass = p => !isLeavePass(p) && p.requestCategory !== 'onduty' && p._type !== 'onduty';

  const pendingLeave = passes.filter(p => isLeavePass(p) && isPendingForRole(p, false));
  const pendingGatePass = passes.filter(p => isGatePass(p) && isPendingForRole(p, false));
  const pendingOD = ods.filter(o => isPendingForRole(o, true));
  const totalPending = pendingLeave.length + pendingGatePass.length + pendingOD.length;

  const approvedLeave = passes.filter(p => isLeavePass(p) && isApprovedByRole(p, false));
  const approvedGatePass = passes.filter(p => isGatePass(p) && isApprovedByRole(p, false));
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
 * Filter and sort requests for the currently active tab & search query with strict separation
 */
function getFilteredRequests() {
  const sub = authState.subFilter;
  const q = (authState.searchQuery || '').trim().toLowerCase();

  const isLeavePass = p => (p.requestCategory === 'leave' || p.type === 'leave' || (!p.departureDate && (p.fromDate || p.leaveDate)));
  const isGatePass = p => !isLeavePass(p) && p.requestCategory !== 'onduty' && p._type !== 'onduty';

  let list = [];

  const user = window.loggedUser;
  const roleKey = user && user.role ? String(user.role).trim().toLowerCase().replace(/[\s-]+/g, '_') : '';
  const isCounselor = roleKey === 'counselor';
  const isAdvisor = roleKey === 'advisor';
  const isHod = roleKey === 'hod';
  const isPrincipal = roleKey === 'principal';
  const isWarden = roleKey.includes('warden');
  const isBoysWarden = roleKey === 'boys_warden' || roleKey.includes('boys');
  const isGirlsWarden = roleKey === 'girls_warden' || roleKey.includes('girls');

  // Requirement: Principal Portal displays ONLY Gate Pass Requests (No Leave, No OD)
  if (isPrincipal) {
    if (sub === 'approved') {
      list = authState.passes
        .filter(p => isGatePass(p) && isApprovedByRole(p, false))
        .map(p => ({ ...p, _type: 'gatepass' }));
    } else {
      list = authState.passes
        .filter(p => isGatePass(p) && isPendingForRole(p, false))
        .map(p => ({ ...p, _type: 'gatepass' }));
    }
  } else if (isWarden) {
    // Requirement: Warden Portal displays ONLY Hosteller Gate Pass requests strictly isolated by gender
    const wardenPasses = authState.passes.filter(p => {
      if (!isGatePass(p)) return false;
      const isHostel = (/hoste?l|^h$/i.test(p.accommodation || '') && !/day\s*scholar/i.test(p.accommodation || ''));
      if (!isHostel) return false;
      const g = String(p.gender || '').trim().toLowerCase();
      if (isBoysWarden && g !== 'male') return false;
      if (isGirlsWarden && g !== 'female') return false;
      return true;
    });

    if (sub === 'approved') {
      list = wardenPasses
        .filter(p => isApprovedByRole(p, false))
        .map(p => ({ ...p, _type: 'gatepass' }));
    } else {
      list = wardenPasses
        .filter(p => isPendingForRole(p, false))
        .map(p => ({ ...p, _type: 'gatepass' }));
    }
  } else if (sub === 'leave') {
    list = authState.passes
      .filter(p => isLeavePass(p) && isPendingForRole(p, false))
      .map(p => ({ ...p, _type: 'leave' }));
  } else if (sub === 'gatepass') {
    list = authState.passes
      .filter(p => isGatePass(p) && isPendingForRole(p, false))
      .map(p => ({ ...p, _type: 'gatepass' }));
  } else if (sub === 'onduty') {
    list = (authState.odRequests || [])
      .filter(o => isPendingForRole(o, true))
      .map(o => ({ ...o, _type: 'onduty' }));
  } else if (sub === 'approved') {
    const appPasses = authState.passes
      .filter(p => isApprovedByRole(p, false))
      .map(p => ({ ...p, _type: isLeavePass(p) ? 'leave' : 'gatepass' }));
    const appOD = (authState.odRequests || [])
      .filter(o => isApprovedByRole(o, true))
      .map(o => ({ ...o, _type: 'onduty' }));
    list = [...appPasses, ...appOD];
  } else {
    // All Pending (for non-counselor roles)
    const pendPasses = authState.passes
      .filter(p => isPendingForRole(p, false))
      .map(p => ({ ...p, _type: isLeavePass(p) ? 'leave' : 'gatepass' }));
    const pendOD = (authState.odRequests || [])
      .filter(o => isPendingForRole(o, true))
      .map(o => ({ ...o, _type: 'onduty' }));
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

  const items = getFilteredRequests();
  const sub = authState.subFilter;

  const user = window.loggedUser;
  const roleKey = user && user.role ? String(user.role).trim().toLowerCase().replace(/[\s-]+/g, '_') : '';
  const isCounselor = roleKey === 'counselor';
  const isAdvisor = roleKey === 'advisor';
  const isHod = roleKey === 'hod';
  const isPrincipal = roleKey === 'principal';
  const isWarden = roleKey.includes('warden');
  // Requirement: Principal & Warden Portals use the exact same modern, spacious card layout as HOD Portal
  const usesCardsView = isCounselor || isAdvisor || isHod || isPrincipal || isWarden;

  const tableContainer = document.getElementById('authTableContainer');
  const counselorCardsContainer = document.getElementById('counselorCardsContainer');

  // Requirement: Dedicated spacious card layout for all authority roles
  if (usesCardsView) {
    if (tableContainer) tableContainer.classList.add('hidden');
    if (counselorCardsContainer) {
      counselorCardsContainer.classList.remove('hidden');
      renderCounselorCardsView(items, counselorCardsContainer, sub);
      return;
    }
  } else {
    if (tableContainer) tableContainer.classList.remove('hidden');
    if (counselorCardsContainer) counselorCardsContainer.classList.add('hidden');
  }

  if (!container) return;

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
          ${destDisplay ? `<div class="text-[11px] text-blue-700 font-medium truncate" title="Destination: ${escapeAttr(destDisplay)}"><span class="text-slate-400 font-semibold uppercase text-[9px] mr-1">To:</span>${escapeHtml(destDisplay)}</div>` : ''}
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
 * Dedicated Counselor Portal Request Cards View
 * Displays all student details directly on the card without "View Request",
 * provides click-to-call action with active calling UI status indicator,
 * enforces mandatory "Talked to Parent" confirmation before enabling approval,
 * and automatically adjusts layout to show Return Date/Time only for Hostellers.
 */
function renderCounselorCardsView(items, container, sub) {
  const user = window.loggedUser;
  const roleKey = user && user.role ? String(user.role).trim().toLowerCase().replace(/[\s-]+/g, '_') : '';
  const isCounselor = roleKey === 'counselor';
  const isAdvisor = roleKey === 'advisor';
  const isHod = roleKey === 'hod';

  const categoryTitles = {
    gatepass: 'Gate Pass Requests',
    leave: 'Leave Requests',
    onduty: 'OD Requests',
    approved: 'Approved Records'
  };
  const categorySubtitles = {
    gatepass: isCounselor
      ? 'Review student gate pass requests, contact parents directly for verification, and endorse clearance.'
      : (isAdvisor
        ? 'Review student gate pass requests pre-screened by counselors and endorse to Head of Department.'
        : 'Review student gate pass requests and authorize departmental campus clearance.'),
    leave: isCounselor
      ? 'Review student leave applications, contact parents directly for verification, and endorse clearance.'
      : (isAdvisor
        ? 'Review student leave applications pre-screened by counselors and endorse to Head of Department.'
        : 'Review student leave applications and sanction departmental leave clearance.'),
    onduty: 'Review official institutional on-duty requisition endorsements.',
    approved: 'Chronological record of student passes cleared by this authority.'
  };

  const currentTitle = categoryTitles[sub] || 'Gate Pass Requests';
  const currentSubtitle = categorySubtitles[sub] || 'Review and take action on student requisitions.';

  // If no items in this filter
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="auth-card p-5 sm:p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 mb-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight">${escapeHtml(currentTitle)} (0)</h3>
          <p class="text-xs text-slate-500">${escapeHtml(currentSubtitle)}</p>
        </div>
        <button
          type="button"
          onclick="fetchAuthorityData()"
          class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
        >
          <svg class="w-3.5 h-3.5 auth-refresh-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          <span>Refresh</span>
        </button>
      </div>
      <div class="auth-card p-8 sm:p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div class="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-200">
          <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h3 class="text-base font-bold text-slate-800">No ${escapeHtml(currentTitle)} Pending</h3>
        <p class="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">There are currently no requests requiring action in this section.</p>
      </div>
    `;
    return;
  }

  // Pagination calculation
  const total = items.length;
  const totalPages = Math.ceil(total / authState.pageSize) || 1;
  if (authState.page > totalPages) authState.page = totalPages;
  const startIdx = (authState.page - 1) * authState.pageSize;
  const pageItems = items.slice(startIdx, startIdx + authState.pageSize);

  const cardsHtml = pageItems.map((item) => {
    const isOD = item._type === 'onduty';
    const isLeave = item._type === 'leave' || item.requestCategory === 'leave';
    const isPending = isPendingForRole(item, isOD);

    // Cross-match student profile from roster
    const st = (authState.students || []).find(s => String(s.rollNo || '').trim().toUpperCase() === String(item.rollNo || '').trim().toUpperCase());
    const studentName = item.name || item.studentName || st?.name || 'Student';
    const rollNo = item.rollNo || st?.rollNo || '-';
    const dept = item.dept || st?.dept || '-';
    const section = item.yearSec || item.section || st?.yearSec || st?.section || 'A';
    const accomRaw = item.accommodation || st?.accommodation || 'Day Scholar';
    const isHostel = (/hoste?l|^h$/i.test(accomRaw) && !/day\s*scholar/i.test(accomRaw));

    const parentName = item.parentName || item.fatherName || st?.parentName || st?.fatherName || 'Parent / Guardian';
    const parentPhone = item.parentContact || item.parentPhone || st?.parentContact || st?.mobile || '';
    const reason = item.reason || 'No reason specified';

    // Departure & Return formatted fields
    let depDate = '-';
    let depTime = '-';
    let retDate = '-';
    let retTime = '-';

    if (isOD) {
      depDate = item.specificDate || item.fromDate || '-';
      depTime = item.fromTime || '-';
      retDate = item.toDate || '-';
      retTime = item.toTime || '-';
    } else if (isLeave) {
      depDate = item.fromDate || item.departureDate || item.leaveDate || '-';
      retDate = item.toDate || item.expectedReturnDate || item.returnDate || '-';
    } else {
      depDate = item.departureDate || item.leaveDate || item.date || '-';
      depTime = item.departureTime || item.leaveTime || item.time || '-';
      retDate = item.expectedReturnDate || item.returnDate || item.toDate || '-';
      retTime = item.expectedReturnTime || item.returnTime || '-';
    }

    const statusInfo = typeof getDetailedStatusInfo === 'function' ? getDetailedStatusInfo(item) : {
      statusText: item.status || 'Pending',
      statusClass: item.status === 'Approved' ? 'badge-status-approved' : (item.status === 'Rejected' ? 'badge-status-rejected' : 'badge-status-pending')
    };

    return `
      <div class="auth-card p-6 sm:p-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition space-y-6" id="counselorCard_${item._id}">
        <!-- Top Row: Student Name, Roll No, Student Type Badge, Department, Section, Status -->
        <div class="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div class="space-y-1.5">
            <div class="flex flex-wrap items-center gap-2.5">
              <h3 class="text-base sm:text-lg font-black text-slate-900 tracking-tight">${escapeHtml(studentName)}</h3>
              <span class="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                ${escapeHtml(rollNo)}
              </span>
              <!-- Student Type Badge: Hosteller / Day Scholar / On-Duty -->
              ${isOD ? `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                  <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                  On-Duty Requisition
                </span>
              ` : (isHostel ? `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                  Hosteller
                </span>
              ` : `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                  Day Scholar
                </span>
              `)}
            </div>
            <div class="text-xs font-semibold text-slate-500 flex items-center gap-2">
              <span>Department: <strong class="text-slate-700">${escapeHtml(dept)}</strong></span>
              <span>•</span>
              <span>Section: <strong class="text-slate-700">${escapeHtml(section)}</strong></span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="${statusInfo.statusClass}">
              ${statusInfo.statusText}
            </span>
          </div>
        </div>

        <!-- Middle Details Grid (Strict Hosteller / Day Scholar Display Logic) -->
        ${isOD ? `
          <!-- OD Specific Details -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90">
            <!-- 1. Duty / Event Title -->
            <div class="space-y-1">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Duty / Event Title</div>
              <div class="text-xs sm:text-sm font-bold text-slate-900">${escapeHtml(item.purpose || item.eventTitle || 'Official Institutional Duty')}</div>
            </div>

            <!-- 2. Venue / Destination -->
            <div class="space-y-1">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Venue / Destination</div>
              <div class="text-xs sm:text-sm font-bold text-slate-900">${escapeHtml(item.destination || item.placeOrEvent || 'Campus Authorized')}</div>
            </div>

            <!-- 3. Duty Schedule -->
            <div class="space-y-1">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Duty Schedule</div>
              <div class="text-xs sm:text-sm font-bold text-slate-900 font-mono">${escapeHtml(depDate)} ${item.fromTime ? `<span class="text-slate-400 font-normal">|</span> ${escapeHtml(item.fromTime)} - ${escapeHtml(item.toTime || '')}` : ''}</div>
            </div>
          </div>
        ` : `
          <!-- Gate Pass & Leave Details: Direct Parent details & Hosteller/Day Scholar schedule -->
          <div class="grid grid-cols-1 sm:grid-cols-2 ${isLeave ? 'lg:grid-cols-4' : (isHostel ? 'lg:grid-cols-3 xl:grid-cols-6' : 'lg:grid-cols-4')} gap-5 p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90">
            <!-- 1. Parent Name -->
            <div class="space-y-1">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Parent Name</div>
              <div class="text-xs sm:text-sm font-bold text-slate-900">${escapeHtml(parentName)}</div>
            </div>

            <!-- 2. Parent Phone Number -->
            <div class="space-y-1">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Parent Phone Number</div>
              ${parentPhone && parentPhone !== '-' ? (isCounselor ? `
                <a
                  href="tel:${escapeAttr(parentPhone)}"
                  id="counselorCallLink_${item._id}"
                  onclick="startCounselorParentCall('${item._id}', '${escapeAttr(parentPhone)}', '${escapeAttr(parentName)}', event)"
                  class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-xs font-bold transition shadow-2xs group"
                  title="Click to initiate phone call to parent"
                >
                  <svg class="w-4 h-4 text-emerald-600 group-hover:scale-110 transition shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  <span>${escapeHtml(parentPhone)}</span>
                  <span class="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Call Parent</span>
                </a>
              ` : `
                <a
                  href="tel:${escapeAttr(parentPhone)}"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-xs font-bold transition"
                  title="Parent Contact Number"
                >
                  <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  <span>${escapeHtml(parentPhone)}</span>
                </a>
              `) : `
                <span class="text-xs text-slate-400 font-mono">Not Provided</span>
              `}
            </div>

            <!-- 3. Departure Date (or From Date for Leave) -->
            <div class="space-y-1">
              <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">${isLeave ? 'From Date' : 'Departure Date'}</div>
              <div class="text-xs sm:text-sm font-bold text-slate-800 font-mono">${escapeHtml(depDate)}</div>
            </div>

            <!-- 4. Departure Time (Gate Pass only) -->
            ${!isLeave ? `
              <div class="space-y-1">
                <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Departure Time</div>
                <div class="text-xs sm:text-sm font-bold text-slate-800 font-mono">${escapeHtml(depTime)}</div>
              </div>
            ` : ''}

            ${isLeave ? `
              <div class="space-y-1">
                <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">To Date</div>
                <div class="text-xs sm:text-sm font-bold text-slate-800 font-mono">${escapeHtml(retDate)}</div>
              </div>
            ` : (isHostel ? `
              <div class="space-y-1">
                <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Return Date</div>
                <div class="text-xs sm:text-sm font-bold text-slate-800 font-mono">${escapeHtml(retDate)}</div>
              </div>
              <div class="space-y-1">
                <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Return Time</div>
                <div class="text-xs sm:text-sm font-bold text-slate-800 font-mono">${escapeHtml(retTime)}</div>
              </div>
            ` : '')}
          </div>
        `}

        <!-- Reason Section Directly Visible -->
        <div class="p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90">
          <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">${isOD ? 'Duty Description &amp; Objectives' : 'Reason for the Gate Pass'}</div>
          <div class="text-xs sm:text-sm font-medium text-slate-900 leading-relaxed">${escapeHtml(reason)}</div>
          ${item.destination && !isOD ? `<div class="mt-1 text-xs text-blue-700 font-semibold"><span class="text-slate-500 font-medium">Destination:</span> ${escapeHtml(item.destination)}</div>` : ''}
        </div>

        ${((item.exitTime && item.exitTime !== '-') || (item.returnTime && item.returnTime !== '-')) ? `
          <div class="p-4 rounded-xl bg-slate-50/90 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            ${item.exitTime && item.exitTime !== '-' ? `
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Campus Exit Scanned:</span>
                <span class="font-bold text-slate-800">${escapeHtml(item.exitTime)}</span>
              </div>
            ` : ''}
            ${item.returnTime && item.returnTime !== '-' ? `
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Campus Return Scanned:</span>
                <span class="font-bold text-teal-800">${escapeHtml(item.returnTime)}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Calling Parent In-Progress Banner (Counselor only for Gate Pass / Leave upon clicking phone number) -->
        ${isCounselor && !isOD ? `
          <div id="callingIndicator_${item._id}" class="hidden p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between transition-all">
            <div class="flex items-center gap-3">
              <span class="relative flex h-3 w-3">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <span class="text-xs font-bold">Calling Parent:</span>
                <span class="text-xs font-semibold text-emerald-950">${escapeHtml(parentName)} (${escapeHtml(parentPhone)})</span>
              </div>
            </div>
            <span class="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">Call In Progress</span>
          </div>
        ` : ''}

        <!-- Bottom Action Bar: Role Actions -->
        ${isPending ? (isOD ? `
          <!-- OD Action Bar -->
          <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-slate-500">${roleKey === 'advisor' ? 'Class Advisor Endorsement' : (roleKey === 'hod' ? 'Department Head Sanction' : 'Official OD Requisition Endorsement')}</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick="downloadOnDutyLetterPDF(${escapeAttr(item)})"
                class="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold text-blue-700 transition active:scale-95 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="Download official OD letter"
              >
                <svg class="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                <span>Download Letter</span>
              </button>
              <button
                type="button"
                onclick="viewOnDutyLetter(${escapeAttr(item)})"
                class="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition active:scale-95 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="View official formal college OD letter"
              >
                <svg class="w-4 h-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <span>View Letter</span>
              </button>
              <button
                type="button"
                onclick="promptRejectCurrentItem('${item._id}', true)"
                class="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition active:scale-95 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="Reject OD request"
              >
                <svg class="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                <span>Reject</span>
              </button>
              <button
                type="button"
                id="roleApproveBtn_${item._id}"
                onclick="executeRoleApprove('${item._id}', true)"
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
                title="Approve and endorse OD request"
              >
                <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span>Approve &amp; Forward</span>
              </button>
            </div>
          </div>
        ` : (isCounselor ? `
          <!-- Counselor Gate Pass & Leave Action Bar (Requires Talked to Parent confirmation) -->
          <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <!-- Left: Talked to Parent Checkbox -->
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-amber-50/80 border border-amber-200 hover:bg-amber-100/80 transition cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="counselorTalkedParent_${item._id}"
                  onchange="toggleCounselorParentTalked('${item._id}', this.checked)"
                  class="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span class="text-xs font-bold text-slate-800">Talked to Parent</span>
              </label>
              <span id="counselorTalkedHelp_${item._id}" class="text-[11px] text-amber-700 font-medium inline-flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <span>Mandatory before approval</span>
              </span>
            </div>

            <!-- Right: Action Buttons -->
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick="${isOD ? `downloadOnDutyLetterPDF(${escapeAttr(item)})` : `downloadOfficialLetterOnlyPDF(${escapeAttr(item)})`}"
                class="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold text-blue-700 transition active:scale-95 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="Download letter as PDF"
              >
                <svg class="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                <span>Download Letter</span>
              </button>
              <button
                type="button"
                onclick="${isOD ? `viewOnDutyLetter(${escapeAttr(item)})` : `viewFormalLetter(${escapeAttr(item)})`}"
                class="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition active:scale-95 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="View official formal college letter"
              >
                <svg class="w-4 h-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <span>View Letter</span>
              </button>
              <button
                type="button"
                onclick="promptRejectCurrentItem('${item._id}', false)"
                class="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition active:scale-95 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="Reject request with comments"
              >
                <svg class="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                <span>Reject</span>
              </button>
              <button
                type="button"
                id="counselorApproveBtn_${item._id}"
                disabled
                onclick="executeRoleApprove('${item._id}', false)"
                class="px-4 py-2 bg-slate-200 text-slate-400 rounded-xl text-xs font-bold transition cursor-not-allowed opacity-60 shadow-none flex items-center gap-1.5"
                title="Approve and forward (requires Talked to Parent confirmation)"
              >
                <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span>Approve &amp; Forward</span>
              </button>
            </div>
          </div>
        ` : `
          <!-- Class Advisor, HOD, Principal & Warden Action Bar -->
          <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-slate-500">${
                roleKey === 'advisor' ? 'Class Advisor Clearance &amp; Endorsement' :
                (roleKey === 'hod' ? 'Department Head Gate Pass Sanction' :
                (roleKey === 'principal' ? 'Principal Gate Pass Final Review &amp; Sanction' :
                (roleKey.includes('warden') ? 'Hostel Warden Security Gate Pass Clearance' : 'Clearance Verification')))
              }</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick="${isOD ? `downloadOnDutyLetterPDF(${escapeAttr(item)})` : `downloadOfficialLetterOnlyPDF(${escapeAttr(item)})`}"
                class="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold text-blue-700 transition active:scale-95 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="Download letter as PDF"
              >
                <svg class="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                <span>Download Letter</span>
              </button>
              <button
                type="button"
                onclick="${isOD ? `viewOnDutyLetter(${escapeAttr(item)})` : `viewFormalLetter(${escapeAttr(item)})`}"
                class="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition active:scale-95 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="View official formal college letter"
              >
                <svg class="w-4 h-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <span>View Letter</span>
              </button>
              <button
                type="button"
                onclick="promptRejectCurrentItem('${item._id}', false)"
                class="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition active:scale-95 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="Reject request with comments"
              >
                <svg class="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                <span>Reject</span>
              </button>
              <button
                type="button"
                id="roleApproveBtn_${item._id}"
                onclick="executeRoleApprove('${item._id}', false)"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
                title="${
                  roleKey === 'advisor' ? 'Approve and endorse request to Head of Department' :
                  (roleKey === 'hod' ? 'Approve and sanction departmental clearance' :
                  (roleKey === 'principal' ? 'Approve and sanction Gate Pass' : 'Approve and issue Hostel Gate Pass'))
                }"
              >
                <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span>${
                  roleKey === 'advisor' ? 'Approve &amp; Forward' :
                  (roleKey === 'hod' ? 'Approve Clearance' :
                  (roleKey === 'principal' ? 'Approve Gate Pass' : 'Approve &amp; Issue Pass'))
                }</span>
              </button>
            </div>
          </div>
        `)) : `
          <!-- Non-pending Records Action Bar -->
          <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <span class="text-xs font-semibold text-slate-500">Current Status: <strong class="text-slate-800">${escapeHtml(item.status)}</strong></span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick="${isOD ? `downloadOnDutyLetterPDF(${escapeAttr(item)})` : `downloadOfficialLetterOnlyPDF(${escapeAttr(item)})`}"
                class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold text-blue-700 transition flex items-center gap-1.5 cursor-pointer"
                title="Download letter as PDF"
              >
                <svg class="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                <span>Download Letter</span>
              </button>
              <button
                type="button"
                onclick="${isOD ? `viewOnDutyLetter(${escapeAttr(item)})` : `viewFormalLetter(${escapeAttr(item)})`}"
                class="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <svg class="w-3.5 h-3.5 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <span>View Letter</span>
              </button>
            </div>
          </div>
        `}
      </div>
    `;
  }).join('');

  // Assemble container with Header, Cards, and Pagination
  container.innerHTML = `
    <!-- Header Summary -->
    <div class="auth-card p-6 sm:p-7 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 mb-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
      <div class="space-y-1">
        <h3 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight">${escapeHtml(currentTitle)} (${items.length})</h3>
        <p class="text-xs text-slate-500">${escapeHtml(currentSubtitle)}</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick="fetchAuthorityData()"
          class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
        >
          <svg class="w-3.5 h-3.5 auth-refresh-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Cards List -->
    <div class="space-y-6 sm:space-y-7">
      ${cardsHtml}
    </div>

    <!-- Pagination -->
    ${totalPages > 1 ? `
      <div class="p-4 bg-white rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shadow-xs mt-4">
        <div>Showing ${startIdx + 1} to ${Math.min(startIdx + authState.pageSize, total)} of ${total} requests</div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick="prevAuthorityPage()"
            ${authState.page <= 1 ? 'disabled class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 cursor-not-allowed"' : 'class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"'}
          >
            Previous
          </button>
          <span class="font-bold text-slate-800">Page ${authState.page} of ${totalPages}</span>
          <button
            type="button"
            onclick="nextAuthorityPage()"
            ${authState.page >= totalPages ? 'disabled class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 cursor-not-allowed"' : 'class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"'}
          >
            Next
          </button>
        </div>
      </div>
    ` : ''}
  `;
}

/**
 * Counselor Parent Call Action
 * Initiates phone call and displays dynamic active calling status indicator on the card
 */
function startCounselorParentCall(itemId, parentPhone, parentName, evt) {
  if (!parentPhone || parentPhone === '-') {
    if (typeof showToast === 'function') {
      showToast('Parent phone number is not available for this student.', 'warning');
    }
    return;
  }

  // Display clear UI calling indicator on that request card
  const indicator = document.getElementById(`callingIndicator_${itemId}`);
  if (indicator) {
    indicator.classList.remove('hidden');
    indicator.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (typeof showToast === 'function') {
    showToast(`Calling parent ${parentName || ''} at ${parentPhone}...`, 'info');
  }
}

/**
 * Counselor Talked to Parent Toggle
 * Enables/disables Approve button and updates visual confirmation
 */
function toggleCounselorParentTalked(itemId, isChecked) {
  const approveBtn = document.getElementById(`counselorApproveBtn_${itemId}`) || document.getElementById(`roleApproveBtn_${itemId}`);
  const helpText = document.getElementById(`counselorTalkedHelp_${itemId}`);
  const indicator = document.getElementById(`callingIndicator_${itemId}`);

  if (approveBtn) {
    if (isChecked) {
      approveBtn.disabled = false;
      approveBtn.className = 'px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5';
      if (helpText) {
        helpText.innerHTML = '<span class="inline-flex items-center gap-1 text-emerald-700 font-bold"><svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg><span>Parent verification confirmed</span></span>';
      }
      if (indicator) {
        indicator.innerHTML = `
          <div class="flex items-center gap-2 text-emerald-900 text-xs font-bold">
            <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            <span>Parent Contact Verified</span>
          </div>
          <span class="text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-300">Verified</span>
        `;
      }
    } else {
      approveBtn.disabled = true;
      approveBtn.className = 'px-4 py-2 bg-slate-200 text-slate-400 rounded-xl text-xs font-bold transition cursor-not-allowed opacity-60 shadow-none flex items-center gap-1.5';
      if (helpText) {
        helpText.innerHTML = '<span class="inline-flex items-center gap-1 text-amber-700 font-medium"><svg class="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><span>Mandatory before approval</span></span>';
      }
    }
  }
}

/**
 * Universal Authority Role Approval Handler (Counselor, Advisor, HOD, Principal, Warden)
 * Enforces mandatory "Talked to Parent" check strictly for Counselor Gate Pass & Leave.
 * Allows direct approval for Advisor and HOD, and for Counselor OD requests.
 */
async function executeRoleApprove(itemId, isOD) {
  const user = window.loggedUser;
  if (!user || !user.role) return;

  const role = String(user.role).toLowerCase().replace(/[\s-]+/g, '_');

  // Guard for Counselor: Ensure Talked to Parent is checked for Gate Pass and Leave
  if (role === 'counselor' && !isOD) {
    const cb = document.getElementById(`counselorTalkedParent_${itemId}`);
    if (!cb || !cb.checked) {
      if (typeof showToast === 'function') {
        showToast('You must select "Talked to Parent" before approving this request.', 'warning');
      }
      return;
    }
  }

  const approveBtn = document.getElementById(`roleApproveBtn_${itemId}`) || document.getElementById(`counselorApproveBtn_${itemId}`);
  if (approveBtn) {
    approveBtn.disabled = true;
    approveBtn.innerText = 'Approving...';
  }

  try {
    if (isOD) {
      let endpoint = '/api/onduty/approve/counselor';
      let payload = { id: itemId, counselorName: user?.name };

      if (role === 'advisor') {
        endpoint = '/api/onduty/approve/advisor';
        payload = { id: itemId, advisorName: user?.name };
      } else if (role === 'hod') {
        endpoint = '/api/onduty/approve/hod';
        payload = { id: itemId, hodName: user?.name };
      }

      await Api.post(endpoint, payload);
    } else {
      let endpoint = '/api/approvals/counselor';
      let payload = { passId: itemId, counselorName: user?.name, parentCalled: true };

      if (role === 'advisor') {
        endpoint = '/api/approvals/advisor';
        payload = { passId: itemId, advisorName: user?.name, parentCalledFallback: true };
      } else if (role === 'hod') {
        endpoint = '/api/approvals/hod';
        payload = { passId: itemId, hodName: user?.name };
      } else if (role === 'principal') {
        endpoint = '/api/approvals/principal';
        payload = { passId: itemId, principalName: user?.name };
      } else if (role.includes('warden')) {
        endpoint = '/api/approvals/warden';
        payload = { passId: itemId, wardenName: user?.name };
      }

      await Api.post(endpoint, payload);
    }

    if (typeof showToast === 'function') {
      const nextRole = role === 'counselor' ? 'Class Advisor' : (role === 'advisor' ? 'Head of Department' : 'final clearance');
      showToast(`Request approved successfully and forwarded to ${nextRole}!`, 'success');
    }

    fetchAuthorityData();
  } catch (err) {
    console.error('Role approval error:', err);
    if (typeof showToast === 'function') {
      showToast('Approval error: ' + (err.message || 'Unknown error'), 'error');
    }
    if (approveBtn) {
      approveBtn.disabled = false;
      approveBtn.innerText = role === 'hod' ? 'Approve Clearance' : 'Approve & Forward';
    }
  }
}

// Backward compatible alias
const executeCounselorApprove = executeRoleApprove;

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
    let q = '?limit=5000&all=true';

    if (role === 'counselor') {
      // Counselors filter by their assigned roll range or counselor name
      q += `&search=${encodeURIComponent(user.name || '')}`;
    } else if (role === 'advisor') {
      q += `&dept=${encodeURIComponent(user.dept || '')}&yearSec=${encodeURIComponent(user.yearSec || '')}`;
    } else if (role === 'hod') {
      q += `&dept=${encodeURIComponent(user.dept || '')}`;
    } else if (role === 'boys_warden' || role.includes('boys')) {
      q += `&accommodation=Hosteller&role=boys_warden&gender=Male`;
    } else if (role === 'girls_warden' || role.includes('girls')) {
      q += `&accommodation=Hosteller&role=girls_warden&gender=Female`;
    } else if (role.includes('warden')) {
      q += `&accommodation=Hosteller&role=${encodeURIComponent(role)}`;
    }

    const res = await Api.get(`/api/admin/students${q}`);
    let students = Array.isArray(res) ? res : (res?.students || []);

    // Filter warden students strictly by gender and hosteller accommodation at data level
    if (role === 'boys_warden' || role.includes('boys')) {
      students = students.filter(st => {
        const g = String(st.gender || '').trim().toLowerCase();
        const isHostel = (/hoste?l|^h$/i.test(st.accommodation || '') && !/day\s*scholar/i.test(st.accommodation || ''));
        return g === 'male' && isHostel;
      });
    } else if (role === 'girls_warden' || role.includes('girls')) {
      students = students.filter(st => {
        const g = String(st.gender || '').trim().toLowerCase();
        const isHostel = (/hoste?l|^h$/i.test(st.accommodation || '') && !/day\s*scholar/i.test(st.accommodation || ''));
        return g === 'female' && isHostel;
      });
    }

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

  const role = String(window.loggedUser?.role || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (role === 'boys_warden' || role.includes('boys')) {
    students = students.filter(s => String(s.gender || '').trim().toLowerCase() === 'male');
  } else if (role === 'girls_warden' || role.includes('girls')) {
    students = students.filter(s => String(s.gender || '').trim().toLowerCase() === 'female');
  }

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

  // Toggle Counselor Daily Attendance Excel generator card
  const user = window.loggedUser;
  const role = String(user?.role || '').toLowerCase().replace(/[\s-]+/g, '_');
  const counselorAttCard = document.getElementById('authCounselorAttendanceReportCard');
  if (counselorAttCard) {
    if (role === 'counselor') {
      counselorAttCard.classList.remove('hidden');
      const batchInput = document.getElementById('attReportBatch');
      if (batchInput && (!batchInput.value || batchInput.value === '2023-2027')) {
        const sr = String(user.startRoll || '').trim();
        if (sr.length >= 6) {
          const yy = parseInt(sr.slice(4, 6), 10);
          if (!isNaN(yy)) {
            const startYear = 2000 + yy;
            batchInput.value = `${startYear}-${startYear + 4}`;
          }
        }
      }
    } else {
      counselorAttCard.classList.add('hidden');
    }
  }
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
    if (item.exitTime && item.exitTime !== '-') {
      dateText += ` | Exit Scanned: ${item.exitTime}`;
    }
    if (item.returnTime && item.returnTime !== '-') {
      dateText += ` | Entry Scanned: ${item.returnTime}`;
    }
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

  // Guard for Counselor: Ensure Talked to Parent is checked
  if (role === 'counselor') {
    const cb = document.getElementById(`counselorTalkedParent_${id}`);
    if (cb && !cb.checked) {
      if (typeof showToast === 'function') {
        showToast('Approval blocked: You must confirm "Talked to Parent" before approving.', 'warning');
      }
      return;
    }
  }

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
window.renderCounselorCardsView = renderCounselorCardsView;
window.renderAuthorityCardsView = renderCounselorCardsView;
window.startCounselorParentCall = startCounselorParentCall;
window.toggleCounselorParentTalked = toggleCounselorParentTalked;
window.executeCounselorApprove = executeCounselorApprove;
window.executeRoleApprove = executeRoleApprove;
window.getFilteredRequests = getFilteredRequests;
window.downloadCounselorAttendanceExcel = typeof downloadCounselorAttendanceExcel !== 'undefined' ? downloadCounselorAttendanceExcel : (window.downloadCounselorAttendanceExcel || null);
window.authState = authState;

