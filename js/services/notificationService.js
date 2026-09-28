/**
 * Campus PassPro • Notification Center Service
 * Manages clean white-theme notification drawer, real-time unread alerts, and badges
 */

let notificationsList = [];
let activeNotificationFilter = 'all';

/**
 * Initialize Notification System
 */
function initNotificationSystem() {
  loadNotificationsFromStorage();
  refreshNotificationFeed();
}

/**
 * Load notifications for currently logged user
 */
function loadNotificationsFromStorage() {
  try {
    const user = window.loggedUser;
    if (!user) return;
    const storageKey = `passpro_notifications_${user.userId || user.rollNo || 'guest'}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      notificationsList = JSON.parse(stored);
    } else {
      notificationsList = [];
    }
  } catch (e) {
    notificationsList = [];
  }
}

/**
 * Save notifications to storage
 */
function saveNotificationsToStorage() {
  try {
    const user = window.loggedUser;
    if (!user) return;
    const storageKey = `passpro_notifications_${user.userId || user.rollNo || 'guest'}`;
    localStorage.setItem(storageKey, JSON.stringify(notificationsList));
  } catch (e) {
    // Graceful fallback
  }
}

/**
 * Add a notification to the drawer
 */
function addSystemNotification({ title, message, category = 'system', timestamp = new Date(), isUnread = true, id = null }) {
  const notifId = id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  // Avoid duplicate notifications with same ID or content within 5 seconds
  const existing = notificationsList.find(n => n.id === notifId || (n.title === title && n.message === message && Math.abs(new Date(n.timestamp).getTime() - new Date(timestamp).getTime()) < 5000));
  if (existing) return;

  notificationsList.unshift({
    id: notifId,
    title,
    message,
    category,
    timestamp: new Date(timestamp).toISOString(),
    isUnread
  });

  // Cap at 30 notifications
  if (notificationsList.length > 30) {
    notificationsList = notificationsList.slice(0, 30);
  }

  saveNotificationsToStorage();
  refreshNotificationFeed();
}

/**
 * Toggle the side drawer open / closed
 */
function toggleNotificationDrawer() {
  const wrapper = document.getElementById('notificationDrawerWrapper');
  const drawer = document.getElementById('notificationSideDrawer');
  if (!wrapper || !drawer) return;

  const isHidden = wrapper.classList.contains('hidden');
  if (isHidden) {
    openNotificationDrawer();
  } else {
    closeNotificationDrawer();
  }
}

/**
 * Open the side drawer with smooth transition
 */
function openNotificationDrawer() {
  const wrapper = document.getElementById('notificationDrawerWrapper');
  const drawer = document.getElementById('notificationSideDrawer');
  if (!wrapper || !drawer) return;

  // Sync latest notifications
  syncLiveNotificationsFromState();

  wrapper.classList.remove('hidden');
  // Trigger slide-in animation on next frame
  requestAnimationFrame(() => {
    drawer.classList.remove('translate-x-full');
  });

  refreshNotificationFeed();
}

/**
 * Close the side drawer
 */
function closeNotificationDrawer() {
  const wrapper = document.getElementById('notificationDrawerWrapper');
  const drawer = document.getElementById('notificationSideDrawer');
  if (!wrapper || !drawer) return;

  drawer.classList.add('translate-x-full');
  setTimeout(() => {
    wrapper.classList.add('hidden');
  }, 300);
}

/**
 * Mark a single notification as read
 */
function markNotificationAsRead(id) {
  const notif = notificationsList.find(n => n.id === id);
  if (notif) {
    notif.isUnread = false;
    saveNotificationsToStorage();
    refreshNotificationFeed();
  }
}

/**
 * Mark all notifications as read
 */
function markAllNotificationsAsRead() {
  notificationsList.forEach(n => n.isUnread = false);
  saveNotificationsToStorage();
  refreshNotificationFeed();
  if (typeof showToast === 'function') {
    showToast('All notifications marked as read.', 'info');
  }
}

/**
 * Clear all read notifications
 */
function clearAllNotifications() {
  notificationsList = notificationsList.filter(n => n.isUnread);
  saveNotificationsToStorage();
  refreshNotificationFeed();
  if (typeof showToast === 'function') {
    showToast('Cleared read notifications.', 'info');
  }
}

/**
 * Set filter: 'all' or 'unread'
 */
function setNotificationFilter(filter) {
  activeNotificationFilter = filter;
  
  const allBtn = document.getElementById('notifTabBtn_all');
  const unreadBtn = document.getElementById('notifTabBtn_unread');

  if (filter === 'unread') {
    if (allBtn) {
      allBtn.className = 'px-3 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold transition';
    }
    if (unreadBtn) {
      unreadBtn.className = 'px-3 py-1 rounded-lg bg-white text-slate-900 shadow-2xs border border-slate-200 font-bold transition';
    }
  } else {
    if (allBtn) {
      allBtn.className = 'px-3 py-1 rounded-lg bg-white text-slate-900 shadow-2xs border border-slate-200 font-bold transition';
    }
    if (unreadBtn) {
      unreadBtn.className = 'px-3 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold transition';
    }
  }

  renderNotificationsList();
}

/**
 * Format relative time
 */
function formatNotifRelativeTime(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch (e) {
    return 'Recently';
  }
}

/**
 * Render the notifications list inside drawer
 */
function renderNotificationsList() {
  const container = document.getElementById('notifDrawerListContainer');
  if (!container) return;

  let items = [...notificationsList];
  if (activeNotificationFilter === 'unread') {
    items = items.filter(n => n.isUnread);
  }

  // Update counts in header & badges
  const unreadCount = notificationsList.filter(n => n.isUnread).length;
  const unreadBadge = document.getElementById('notifDrawerUnreadBadge');
  if (unreadBadge) {
    unreadBadge.innerText = `${unreadCount} Unread`;
    if (unreadCount === 0) {
      unreadBadge.className = 'px-2 py-0.5 text-[11px] font-bold font-mono rounded-full bg-slate-100 text-slate-600 border border-slate-200';
    } else {
      unreadBadge.className = 'px-2 py-0.5 text-[11px] font-bold font-mono rounded-full bg-blue-50 text-blue-700 border border-blue-200 animate-pulse';
    }
  }

  const allCountEl = document.getElementById('notifCount_all');
  if (allCountEl) allCountEl.innerText = `(${notificationsList.length})`;

  const unreadCountEl = document.getElementById('notifCount_unread');
  if (unreadCountEl) unreadCountEl.innerText = `(${unreadCount})`;

  // Update top header bell badges across Student & Authority headers
  updateHeaderBellBadges(unreadCount);

  // If empty
  if (items.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2 my-auto">
        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 border border-blue-200 flex items-center justify-center mx-auto mb-3 shadow-2xs">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </div>
        <div class="text-sm font-bold text-slate-800">
          ${activeNotificationFilter === 'unread' ? 'No unread notifications' : 'No notifications right now'}
        </div>
        <p class="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
          ${activeNotificationFilter === 'unread'
            ? 'All notifications have been reviewed. You can toggle to "All" to view previous records.'
            : "You're all caught up! Updates regarding gate passes, leaves, and approvals will appear here."}
        </p>
      </div>
    `;
    return;
  }

  // Icons and badges by category
  const categoryConfig = {
    gatepass: {
      badge: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase font-mono">Gate Pass</span>',
      icon: '<div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0 shadow-2xs"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg></div>'
    },
    leave: {
      badge: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 uppercase font-mono">Leave</span>',
      icon: '<div class="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0 shadow-2xs"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>'
    },
    onduty: {
      badge: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase font-mono">On-Duty</span>',
      icon: '<div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>'
    },
    scan: {
      badge: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 uppercase font-mono">Gate Scan</span>',
      icon: '<div class="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center shrink-0 shadow-2xs"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg></div>'
    },
    system: {
      badge: '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase font-mono">Notice</span>',
      icon: '<div class="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>'
    }
  };

  container.innerHTML = items.map(item => {
    const conf = categoryConfig[item.category] || categoryConfig.system;
    const timeFormatted = formatNotifRelativeTime(item.timestamp);
    const cardClass = item.isUnread ? 'notif-card is-unread' : 'notif-card is-read';

    return `
      <div
        class="${cardClass} p-3.5 sm:p-4 rounded-xl border flex items-start gap-3 cursor-pointer"
        onclick="markNotificationAsRead('${escapeAttr(item.id)}')"
      >
        ${conf.icon}
        <div class="flex-1 min-w-0 space-y-1">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${conf.badge}
              ${item.isUnread ? '<span class="w-2 h-2 rounded-full bg-blue-600 shrink-0 animate-pulse" title="Unread notification"></span>' : ''}
            </div>
            <span class="text-[10px] font-mono text-slate-400 font-medium shrink-0">${timeFormatted}</span>
          </div>
          <div class="text-xs sm:text-sm font-bold text-slate-900 leading-snug break-words">
            ${escapeHtml(item.title)}
          </div>
          <div class="text-xs text-slate-600 font-medium leading-relaxed break-words">
            ${escapeHtml(item.message)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Update bell badges on both headers
 */
function updateHeaderBellBadges(unreadCount) {
  // Student portal dot
  const stuDot = document.getElementById('studentNotifDot');
  if (stuDot) {
    if (unreadCount > 0) {
      stuDot.classList.remove('hidden');
    } else {
      stuDot.classList.add('hidden');
    }
  }

  // Authority portal bell badge
  const authBadge = document.getElementById('authBellBadge');
  if (authBadge) {
    if (unreadCount > 0) {
      authBadge.innerText = String(unreadCount);
      authBadge.classList.remove('hidden');
      authBadge.classList.add('flex');
    } else {
      authBadge.classList.add('hidden');
      authBadge.classList.remove('flex');
    }
  }
}

/**
 * Sync real-time notifications from user's live requests
 */
function syncLiveNotificationsFromState() {
  const user = window.loggedUser;
  if (!user) return;

  const isStudent = user.role === 'student' || (!user.role && user.rollNo);
  if (isStudent && Array.isArray(window.cachedStudentPasses)) {
    window.cachedStudentPasses.forEach(pass => {
      const isApproved = pass.status === 'Approved' || pass.status === 'Cleared' || pass.status === 'Gate Pass Ready';
      const isExited = pass.status === 'Exited';
      const isReturned = pass.status === 'Scanned In Campus' || pass.status === 'Returned';
      const passId = String(pass._id || '').slice(-4).toUpperCase();

      if (isReturned) {
        addSystemNotification({
          id: `notif_ret_${pass._id}`,
          title: 'Campus Return Confirmed',
          message: `Your return scan has been recorded. Gate pass GP-${passId} completed successfully.`,
          category: 'scan',
          timestamp: pass.actualReturnTime || pass.updatedAt || pass.createdAt
        });
      } else if (isExited) {
        addSystemNotification({
          id: `notif_exit_${pass._id}`,
          title: 'Campus Exit Logged',
          message: `Your ID was scanned at Main Gate. Status updated to Exited at ${pass.exitTime || 'gate'}.`,
          category: 'scan',
          timestamp: pass.actualExitTime || pass.updatedAt || pass.createdAt
        });
      } else if (isApproved) {
        addSystemNotification({
          id: `notif_appr_${pass._id}`,
          title: pass.requestCategory === 'leave' ? 'Leave Request Approved' : 'Gate Pass Approved & Issued',
          message: pass.requestCategory === 'leave'
            ? 'Your formal leave application has been sanctioned by Department Authority.'
            : `Your Gate Pass (GP-${passId}) is cleared. Present your ID card at the security gate for scanning.`,
          category: pass.requestCategory === 'leave' ? 'leave' : 'gatepass',
          timestamp: pass.updatedAt || pass.createdAt
        });
      }
    });
  }
}

/**
 * Refresh full feed
 */
function refreshNotificationFeed() {
  renderNotificationsList();
}

// Global exports
window.toggleNotificationDrawer = toggleNotificationDrawer;
window.openNotificationDrawer = openNotificationDrawer;
window.closeNotificationDrawer = closeNotificationDrawer;
window.markNotificationAsRead = markNotificationAsRead;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.clearAllNotifications = clearAllNotifications;
window.setNotificationFilter = setNotificationFilter;
window.addSystemNotification = addSystemNotification;
window.initNotificationSystem = initNotificationSystem;

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initNotificationSystem();
});
