/**
 * Campus PassPro • Student Navigation & Transition Submodule
 * Handles left-side navigation, page switching, and 1.5s institutional loader
 */

(function () {
  'use strict';

  let studentPageTransitionTimer = null;
  let isStudentTransitionActive = false;

  /**
   * Apply DOM states and active navigation highlights for the chosen student page
   */
  function applyStudentPageDOM(target) {
    const pageDash = document.getElementById('stuPage_dashboard');
    const pageReqs = document.getElementById('stuPage_requests');
    const navDash = document.getElementById('stuNav_dashboard');
    const navReqs = document.getElementById('stuNav_requests');

    if (target === 'dashboard') {
      if (pageDash) pageDash.classList.remove('hidden');
      if (pageReqs) pageReqs.classList.add('hidden');
      if (navDash) navDash.classList.add('active');
      if (navReqs) navReqs.classList.remove('active');
    } else {
      if (pageDash) pageDash.classList.add('hidden');
      if (pageReqs) pageReqs.classList.remove('hidden');
      if (navDash) navDash.classList.remove('active');
      if (navReqs) navReqs.classList.add('active');
      if (typeof window.renderUnifiedRequestsTable === 'function') {
        window.renderUnifiedRequestsTable();
      }
    }

    // Update legacy breadcrumb
    const breadcrumb = document.getElementById('stuBreadcrumb');
    if (breadcrumb) {
      breadcrumb.innerHTML = target === 'requests' ? 'Home &gt; My Requests &amp; Status' : 'Home &gt; Student Dashboard';
    }

    // Close profile dropdown if open
    const dropdown = document.getElementById('stuProfileDropdown');
    if (dropdown) dropdown.classList.add('hidden');
  }

  /**
   * Trigger Institutional Page Transition Loader with College Logo
   * Minimum 1.5s display duration to provide smooth, premium feedback
   */
  function triggerStudentPageTransition(targetPage, options = {}) {
    const target = (targetPage === 'requests') ? 'requests' : 'dashboard';
    const duration = typeof options.duration === 'number' ? Math.max(options.duration, 1000) : 1500;
    const title = options.title || (target === 'requests' ? 'Opening My Requests' : 'Loading Student Dashboard');
    const subtitle = options.subtitle || (target === 'requests' ? 'Retrieving approval statuses & official passes...' : 'Preparing overview, metrics & recent activity...');

    const loader = document.getElementById('grtPageTransitionLoader');
    const titleEl = document.getElementById('grtLoaderTitle');
    const subtitleEl = document.getElementById('grtLoaderSubtitle');
    const progressEl = document.getElementById('grtLoaderProgressBar');

    if (!loader) {
      applyStudentPageDOM(target);
      if (typeof options.onComplete === 'function') options.onComplete();
      return;
    }

    if (isStudentTransitionActive && studentPageTransitionTimer) {
      clearTimeout(studentPageTransitionTimer);
    }
    isStudentTransitionActive = true;

    if (titleEl) titleEl.innerText = title;
    if (subtitleEl) subtitleEl.innerText = subtitle;

    // Reset progress bar
    if (progressEl) {
      progressEl.style.transition = 'none';
      progressEl.style.width = '0%';
    }

    // Activate loader overlay
    loader.classList.add('active');
    loader.setAttribute('aria-hidden', 'false');

    // Trigger smooth progress animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (progressEl) {
          progressEl.style.transition = `width ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
          progressEl.style.width = '100%';
        }
      });
    });

    // Prepare page state in DOM in background
    setTimeout(() => {
      applyStudentPageDOM(target);
    }, Math.min(250, duration / 2));

    // Maintain loader for the full duration (minimum 1.5 seconds)
    studentPageTransitionTimer = setTimeout(() => {
      loader.classList.remove('active');
      loader.setAttribute('aria-hidden', 'true');
      isStudentTransitionActive = false;

      if (typeof options.onComplete === 'function') {
        options.onComplete();
      }
    }, duration);
  }

  /**
   * Professional Left-Side Navigation Page Switcher
   * Supported pages: 'dashboard', 'requests'
   */
  function switchStudentPage(page, options = {}) {
    const target = (page === 'requests') ? 'requests' : 'dashboard';

    if (options && options.immediate === true) {
      applyStudentPageDOM(target);
      return;
    }

    triggerStudentPageTransition(target, options);
  }

  /**
   * Backwards Compatibility Router for switchStudentTab
   */
  function switchStudentTab(tab) {
    if (tab === 'dashboard' || tab === 'home') {
      switchStudentPage('dashboard');
    } else if (tab === 'requests' || tab === 'my_requests' || tab === 'reports') {
      switchStudentPage('requests');
    } else if (tab === 'pass') {
      if (typeof window.openGatePassRequestModal === 'function') window.openGatePassRequestModal();
    } else if (tab === 'leave') {
      if (typeof window.openLeaveRequestModal === 'function') window.openLeaveRequestModal();
    } else if (tab === 'onduty') {
      if (typeof window.openODRequestModal === 'function') window.openODRequestModal();
    } else if (tab === 'profile') {
      if (typeof window.openStudentProfileModal === 'function') window.openStudentProfileModal();
    } else {
      switchStudentPage('dashboard');
    }
  }

  /**
   * Profile Dropdown Menu Handler
   */
  function toggleStuProfileMenu() {
    const dropdown = document.getElementById('stuProfileDropdown');
    if (dropdown) {
      dropdown.classList.toggle('hidden');
    }
  }

  // Export to global scope
  window.applyStudentPageDOM = applyStudentPageDOM;
  window.triggerStudentPageTransition = triggerStudentPageTransition;
  window.switchStudentPage = switchStudentPage;
  window.switchStudentTab = switchStudentTab;
  window.toggleStuProfileMenu = toggleStuProfileMenu;

})();
