/**
 * Campus PassPro Enterprise UI Utilities & Feedback Engine
 * GRT Institute of Engineering and Technology
 */

/**
 * Escapes HTML characters to prevent XSS in template strings
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Safely serializes objects into HTML attribute values
 * @param {object} obj
 * @returns {string}
 */
function escapeAttr(obj) {
  return JSON.stringify(obj).replace(/"/g, '&quot;');
}

/**
 * Standardizes display of Department, Section, and Academic Year
 * @param {string} dept
 * @param {string} rawSec
 * @param {string} academicYear
 * @returns {string}
 */
function formatClassSection(dept, rawSec, academicYear) {
  const yearStr = academicYear || 'III Year';
  if (!rawSec) return `${yearStr} • ${dept || 'CSE'} - Section A`;
  const match = String(rawSec).trim().toUpperCase().match(/\b([A-D])\b/);
  const letter = match ? match[1] : 'A';
  return `${yearStr} • ${dept || 'CSE'} - Sec ${letter}`;
}

/**
 * Calculates remaining validity countdown for approved gate passes
 * @param {string|Date} expiresAt
 * @returns {string}
 */
function formatRemainingTime(expiresAt) {
  if (!expiresAt) return '<span class="text-slate-400 font-mono text-xs">-</span>';
  const diff = new Date(expiresAt).getTime() - new Date().getTime();
  if (diff <= 0) return '<span class="inline-flex items-center gap-1 text-rose-600 font-bold font-mono text-xs">Expired</span>';
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold font-mono text-xs">${m}m ${s < 10 ? '0' : ''}${s}s Window</span>`;
}

/**
 * Formats accommodation status badge (Hosteller vs Day Scholar)
 * @param {string} accommodation
 * @returns {string} HTML badge markup
 */
function formatAccommodationBadge(accommodation) {
  if (
    typeof loggedUser !== 'undefined' &&
    loggedUser &&
    (loggedUser.role === 'boys_warden' || loggedUser.role === 'girls_warden')
  ) {
    return '<span class="badge-pill badge-hosteller">Hosteller</span>';
  }

  const isHostel = /hoste?l|^h$/i.test(accommodation || '') && !/day/i.test(accommodation || '');
  if (isHostel) {
    return '<span class="badge-pill badge-hosteller">Hosteller</span>';
  }
  return '<span class="badge-pill badge-dayscholar">Days Scholar</span>';
}

/**
 * Displays a non-blocking modern toast notification
 * @param {string} message 
 * @param {'success' | 'error' | 'info' | 'warning'} type 
 * @param {number} duration 
 */
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;

  const icons = {
    success: `<div class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0"><svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg></div>`,
    error: `<div class="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0"><svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg></div>`,
    info: `<div class="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0"><svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg></div>`,
    warning: `<div class="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0"><svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg></div>`
  };

  toast.innerHTML = `
    ${icons[type] || icons.info}
    <div class="flex-1 text-xs md:text-sm font-semibold text-slate-800 leading-snug">${escapeHtml(message)}</div>
    <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-700 p-1 rounded-md transition" aria-label="Close notification"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
  `;

  container.appendChild(toast);

  const removeTimer = setTimeout(() => {
    toast.classList.add('toast-leaving');
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 250);
  }, duration);

  toast.onclick = () => {
    clearTimeout(removeTimer);
    toast.classList.add('toast-leaving');
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 250);
  };
}

/**
 * Modern Confirmation Modal
 * @param {object} opts
 */
function showConfirmModal({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', confirmColor = 'rose', onConfirm }) {
  let modal = document.getElementById('universalConfirmModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'universalConfirmModal';
    modal.className = 'fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-200">
      <div class="w-12 h-12 rounded-2xl bg-${confirmColor === 'rose' ? 'rose' : 'blue'}-50 text-${confirmColor === 'rose' ? 'rose' : 'blue'}-600 flex items-center justify-center font-bold">
        <svg class="w-6 h-6 fill-current" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      </div>
      <div>
        <h3 class="text-base font-bold text-slate-900">${escapeHtml(title)}</h3>
        <p class="text-xs md:text-sm text-slate-600 mt-1 leading-relaxed">${escapeHtml(message)}</p>
      </div>
      <div class="flex gap-2.5 pt-2">
        <button id="confirmCancelBtn" class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs md:text-sm rounded-xl transition">
          ${escapeHtml(cancelText)}
        </button>
        <button id="confirmActionBtn" class="flex-1 py-2.5 bg-${confirmColor === 'rose' ? 'rose-600 hover:bg-rose-700' : 'indigo-600 hover:bg-indigo-700'} text-white font-semibold text-xs md:text-sm rounded-xl shadow-xs transition active:scale-95">
          ${escapeHtml(confirmText)}
        </button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');

  const close = () => {
    modal.classList.add('hidden');
  };

  document.getElementById('confirmCancelBtn').onclick = close;
  document.getElementById('confirmActionBtn').onclick = () => {
    close();
    if (typeof onConfirm === 'function') onConfirm();
  };
}

/**
 * Renders the movement schedule badge for leave requests (Hosteller vs Day Scholar)
 * @param {object} p Pass record
 * @returns {string} HTML markup
 */
function renderPassScheduleInfo(p) {
  if (!p) return '';
  const isHostel = /hoste?l|^h$/i.test(p.accommodation || '') && !/day/i.test(p.accommodation || '');
  if (isHostel) {
    return `
      <div class="mb-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1 text-slate-800 font-medium">
        <div class="flex items-center gap-1.5 text-amber-950 font-bold">
          <span class="text-amber-700 uppercase tracking-wider text-[10px]">Departure:</span>
          <span class="font-mono text-slate-900">${escapeHtml(p.departureDate || '-')} ${p.departureTime ? 'at ' + escapeHtml(p.departureTime) : ''}</span>
        </div>
        <div class="flex items-center gap-1.5 text-amber-950 font-bold">
          <span class="text-amber-700 uppercase tracking-wider text-[10px]">Expected Return:</span>
          <span class="font-mono text-slate-900">${escapeHtml(p.expectedReturnDate ? p.expectedReturnDate + (p.expectedReturnTime ? ' at ' + p.expectedReturnTime : '') : (p.expectedReturnDateTime || '-'))}</span>
        </div>
      </div>
    `;
  }

  const dateStr = p.leaveDate || p.departureDate || (p.appliedTime ? String(p.appliedTime).split(' ')[0] : '-');
  const timeStr = p.leaveTime || p.departureTime || '-';

  return `
    <div class="mb-2 p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs space-y-1 text-slate-800 font-medium">
      <div class="flex items-center gap-1.5 text-indigo-950 font-bold">
        <span class="text-indigo-700 uppercase tracking-wider text-[10px]">Date:</span>
        <span class="font-mono text-slate-900">${escapeHtml(dateStr)}</span>
      </div>
      <div class="flex items-center gap-1.5 text-indigo-950 font-bold">
        <span class="text-indigo-700 uppercase tracking-wider text-[10px]">Time:</span>
        <span class="font-mono text-slate-900">${escapeHtml(timeStr)}</span>
      </div>
    </div>
  `;
}

// Global window bindings
window.escapeHtml = escapeHtml;
window.escapeAttr = escapeAttr;
window.formatClassSection = formatClassSection;
window.formatRemainingTime = formatRemainingTime;
window.formatAccommodationBadge = formatAccommodationBadge;
window.renderPassScheduleInfo = renderPassScheduleInfo;
window.showToast = showToast;
window.showConfirmModal = showConfirmModal;
