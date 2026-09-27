/**
 * Campus PassPro • Student Portal Main Orchestrator
 * Modular barrel linking navigation, modals, forms, and requests submodules.
 * GRT Institute of Engineering and Technology
 */

(function () {
  'use strict';

  // Global event listener for dismissing user profile dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('stuProfileDropdown');
    const btn = e.target.closest('#stuAvatarInitials') ||
      e.target.closest('#stuProfileName') ||
      e.target.closest('[onclick="toggleStuProfileMenu()"]');
    if (!btn && dropdown && !dropdown.contains(e.target) && !dropdown.classList.contains('hidden')) {
      dropdown.classList.add('hidden');
    }
  });

  // Global initialization hook for student portal
  function initStudentPortal() {
    if (typeof window.applyStudentPageDOM === 'function') {
      window.applyStudentPageDOM('dashboard');
    }
  }

  // Export module lifecycle
  window.initStudentPortal = initStudentPortal;

  // Auto-run if student portal container is active
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const container = document.getElementById('studentPortalContainer');
      if (container && !container.classList.contains('hidden')) {
        initStudentPortal();
      }
    });
  }
})();
