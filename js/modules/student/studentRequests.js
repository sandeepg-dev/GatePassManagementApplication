/**
 * Campus PassPro • Student Requests Submodule
 * Handles status retrieval, unified requisitions table, steppers, and filters
 */

(function () {
  'use strict';

  let cachedStudentPasses = [];
  let cachedStudentODs = [];
  let currentUnifiedFilter = 'all';
  let currentUnifiedSearchQuery = '';

  // Helper Date & Time Formatters
  function formatAcademicDate(dateStr) {
    if (!dateStr) return '-';
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  }

  function formatTime12(timeStr) {
    if (!timeStr) return '';
    const parts = String(timeStr).trim().split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parts[1].slice(0, 2);
      if (!isNaN(h)) {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
      }
    }
    return timeStr;
  }

  function formatAcademicDateTime(dateStr, timeStr) {
    if (!dateStr) return '-';
    const formattedDate = formatAcademicDate(dateStr);
    if (!timeStr || timeStr === '-') return formattedDate;
    const timeFormatted = formatTime12(timeStr);
    return `${formattedDate} ${timeFormatted}`;
  }

  function formatAppliedDateStamp(appliedTime, createdAt) {
    if (appliedTime && appliedTime !== '-') return appliedTime;
    if (createdAt) {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        return `${datePart} ${String(h12).padStart(2, '0')}:${minutes} ${ampm}`;
      }
    }
    return '-';
  }

  /**
   * Full Approval Clearance Checker
   */
  function isPassFullyApproved(p) {
    if (!p || p.status === 'Rejected') return false;
    if (p.status === 'Approved' || p.status === 'Completed' || p.status === 'Exited' || p.status === 'Scanned In Campus' || p.status === 'Returned' || p.exitStatus === 'Exited Campus' || p.exitStatus === 'Returned to College') {
      return true;
    }

    if (p.requestCategory === 'leave') {
      const cOk = p.counselorApproval?.approved === true || !!p.counselorApproval?.time;
      const aOk = p.advisorApproval?.approved === true || !!p.advisorApproval?.time;
      const hOk = p.hodApproval?.approved === true || !!p.hodApproval?.time;
      return (cOk && aOk && hOk);
    }

    const isHostel = (/hoste?l|^h$/i.test(p.accommodation || '') && !/day/i.test(p.accommodation || ''));
    if (isHostel) {
      const cOk = p.counselorApproval?.approved === true || !!p.counselorApproval?.time;
      const aOk = p.advisorApproval?.approved === true || !!p.advisorApproval?.time;
      const hOk = p.hodApproval?.approved === true || !!p.hodApproval?.time;
      const wOk = p.wardenApproval?.approved === true || !!p.wardenApproval?.time;
      return (cOk && aOk && hOk && wOk);
    } else {
      const cOk = p.counselorApproval?.approved === true || !!p.counselorApproval?.time;
      const aOk = p.advisorApproval?.approved === true || !!p.advisorApproval?.time;
      const hOk = p.hodApproval?.approved === true || !!p.hodApproval?.time;
      const pOk = p.principalApproval?.approved === true || !!p.principalApproval?.time;
      return (cOk && aOk && hOk && pOk);
    }
  }

  /**
   * Helper to get user-specified exact status string and current approval authority
   */
  function getDetailedStatusInfo(p) {
    const isHosteller = (/hoste?l|^h$/i.test(p.accommodation || '') && !/day\s*scholar/i.test(p.accommodation || ''));
    const s = String(p.status || '').trim();

    if (s === 'Rejected' || p.rejection?.rejected) {
      const rejBy = p.rejection?.roleTitle || p.rejectedBy || 'Designated Authority';
      return {
        statusText: 'Rejected',
        authorityText: `Rejected by ${rejBy}`,
        statusClass: 'px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1',
        authorityClass: 'text-rose-700 font-semibold',
        isApproved: false,
        isRejected: true,
        currentStep: 'rejected'
      };
    }

    if (s === 'Exited') {
      const exitTimeStr = p.exitTime && p.exitTime !== '-' ? `Exited Campus • ${p.exitTime}` : 'Exited Campus';
      return {
        statusText: 'Exited',
        authorityText: exitTimeStr,
        statusClass: 'px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1',
        authorityClass: 'text-amber-800 font-semibold',
        isApproved: true,
        isRejected: false,
        currentStep: 'exited'
      };
    }

    if (s === 'Scanned In Campus' || s === 'Entered Campus' || s === 'Returned') {
      const returnTimeStr = p.returnTime && p.returnTime !== '-' ? `Entered Campus • ${p.returnTime}` : 'Entered Campus';
      return {
        statusText: 'Scanned In Campus',
        authorityText: returnTimeStr,
        statusClass: 'px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-300 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1',
        authorityClass: 'text-teal-800 font-semibold',
        isApproved: true,
        isRejected: false,
        currentStep: 'returned'
      };
    }

    if (s === 'Approved' || s === 'Approved – Gate Pass Ready' || s === 'Completed') {
      const isLeave = (p.requestCategory === 'leave' || p.type === 'leave' || p.isLeave);
      const isOD = (p.requestCategory === 'onduty' || p.type === 'onduty' || p._type === 'onduty' || p.mode || p.placeEvent);
      return {
        statusText: isLeave || isOD ? 'Completed' : 'Approved',
        authorityText: isLeave || isOD ? 'HOD Authorized • Request Completed' : 'All Authorities Approved • Gate Pass Ready',
        statusClass: 'px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1',
        authorityClass: 'text-emerald-700 font-semibold',
        isApproved: true,
        isRejected: false,
        currentStep: 'approved'
      };
    }

    if (s.includes('Counselor')) {
      return {
        statusText: 'Pending – Counselor Review',
        authorityText: 'Class Counselor',
        statusClass: 'px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1',
        authorityClass: 'text-slate-800 font-semibold',
        isApproved: false,
        isRejected: false,
        currentStep: 'counselor'
      };
    }

    if (s.includes('Advisor')) {
      return {
        statusText: 'Pending – Class Advisor Review',
        authorityText: 'Class Advisor',
        statusClass: 'px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1',
        authorityClass: 'text-slate-800 font-semibold',
        isApproved: false,
        isRejected: false,
        currentStep: 'advisor'
      };
    }

    if (s.includes('HOD')) {
      return {
        statusText: 'Pending – HOD Review',
        authorityText: 'Head of Department (HOD)',
        statusClass: 'px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1',
        authorityClass: 'text-slate-800 font-semibold',
        isApproved: false,
        isRejected: false,
        currentStep: 'hod'
      };
    }

    if (s.includes('Principal')) {
      return {
        statusText: 'Pending – Principal Review',
        authorityText: 'Principal Directorate',
        statusClass: 'px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1',
        authorityClass: 'text-slate-800 font-semibold',
        isApproved: false,
        isRejected: false,
        currentStep: 'principal'
      };
    }

    if (s.includes('Warden')) {
      const wardenTitle = p.gender === 'Female' ? 'Girls Hostel Warden' : 'Boys Hostel Warden';
      return {
        statusText: 'Pending – Warden Review',
        authorityText: wardenTitle,
        statusClass: 'px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1',
        authorityClass: 'text-slate-800 font-semibold',
        isApproved: false,
        isRejected: false,
        currentStep: 'warden'
      };
    }

    return {
      statusText: s || 'Pending Review',
      authorityText: 'Institutional Staff',
      statusClass: 'px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium font-mono',
      authorityClass: 'text-slate-800 font-semibold',
      isApproved: false,
      isRejected: false,
      currentStep: 'review'
    };
  }

  /**
   * Helper to determine OD status and clearance stage
   */
  function getODStatusInfo(od) {
    const s = String(od.status || '').trim();
    if (s === 'Rejected') {
      return {
        statusText: 'Rejected',
        authorityText: od.rejection?.roleTitle || od.rejectedBy || 'Department Review',
        statusClass: 'px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1',
        authorityClass: 'text-rose-700 font-semibold',
        isApproved: false,
        isRejected: true
      };
    }
    const cOk = od.counselorApproval?.approved;
    const aOk = od.advisorApproval?.approved;
    const hOk = od.hodApproval?.approved;
    if (s === 'Completed' || s === 'Approved' || (cOk && aOk && hOk)) {
      return {
        statusText: 'Completed',
        authorityText: 'HOD Authorized • Request Completed',
        statusClass: 'px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1',
        authorityClass: 'text-emerald-700 font-semibold',
        isApproved: true,
        isRejected: false
      };
    }
    if (!cOk) {
      return {
        statusText: 'Pending – Counselor Review',
        authorityText: 'Class Counselor',
        statusClass: 'px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1',
        authorityClass: 'text-slate-800 font-semibold',
        isApproved: false,
        isRejected: false
      };
    }
    if (!aOk) {
      return {
        statusText: 'Pending – Class Advisor Review',
        authorityText: 'Class Advisor',
        statusClass: 'px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1',
        authorityClass: 'text-slate-800 font-semibold',
        isApproved: false,
        isRejected: false
      };
    }
    return {
      statusText: 'Pending – HOD Review',
      authorityText: 'Head of Department (HOD)',
      statusClass: 'px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1',
      authorityClass: 'text-slate-800 font-semibold',
      isApproved: false,
      isRejected: false
    };
  }

  /**
   * Build dynamic HTML for sequential approval workflow stepper
   *
   * Workflows:
   * 1. Gate Pass (Day Scholar):
   *    Student -> Counselor -> Class Advisor -> HOD -> Principal -> Final Approval
   * 2. Gate Pass (Hosteller):
   *    Student -> Counselor -> Class Advisor -> HOD -> Principal -> Warden -> Final Approval
   * 3. Leave & OD:
   *    Student -> Counselor -> Class Advisor -> HOD -> Completed (HOD is final authority)
   */
  function buildApprovalStepperHtml(p, isHosteller) {
    const s = String(p.status || '');
    const isApproved = s === 'Approved' || s === 'Approved – Gate Pass Ready' || s === 'Completed' || s === 'Exited' || s === 'Scanned In Campus' || s === 'Returned';
    const isRejected = s === 'Rejected' || p.rejection?.rejected;
    const rejRole = String(p.rejection?.role || p.rejection?.roleTitle || p.rejectedBy || '').toLowerCase();

    const isLeave = (p.requestCategory === 'leave' || p.type === 'leave' || p.isLeave);
    const isOD = (p.requestCategory === 'onduty' || p.type === 'onduty' || p._type === 'onduty' || p.mode || p.placeEvent);

    let steps = [];
    if (isLeave || isOD) {
      // Leave and OD Requests: Student -> Counselor -> Class Advisor -> HOD -> Completed
      steps = [
        { key: 'student', label: 'Student Requisition', authority: 'Student' },
        { key: 'counselor', label: 'Counselor Review', authority: 'Class Counselor' },
        { key: 'advisor', label: 'Advisor Review', authority: 'Class Advisor' },
        { key: 'hod', label: 'HOD Approval', authority: 'Head of Department' },
        { key: 'completed', label: 'Completed', authority: 'Final Authorization' }
      ];
    } else if (isHosteller) {
      // Gate Pass Hosteller: Student -> Counselor -> Class Advisor -> HOD -> Principal -> Warden -> Final Approval
      steps = [
        { key: 'student', label: 'Student Requisition', authority: 'Student' },
        { key: 'counselor', label: 'Counselor Review', authority: 'Class Counselor' },
        { key: 'advisor', label: 'Advisor Review', authority: 'Class Advisor' },
        { key: 'hod', label: 'HOD Review', authority: 'Head of Department' },
        { key: 'principal', label: 'Principal Review', authority: 'Principal Directorate' },
        { key: 'warden', label: 'Warden Approval', authority: (/female/i.test(p.gender || '') ? 'Girls Hostel Warden' : 'Boys Hostel Warden') },
        { key: 'ready', label: 'Final Approval', authority: 'Gate Pass Ready' }
      ];
    } else {
      // Gate Pass Day Scholar: Student -> Counselor -> Class Advisor -> HOD -> Principal -> Final Approval
      steps = [
        { key: 'student', label: 'Student Requisition', authority: 'Student' },
        { key: 'counselor', label: 'Counselor Review', authority: 'Class Counselor' },
        { key: 'advisor', label: 'Advisor Review', authority: 'Class Advisor' },
        { key: 'hod', label: 'HOD Review', authority: 'Head of Department' },
        { key: 'principal', label: 'Principal Approval', authority: 'Principal Directorate' },
        { key: 'ready', label: 'Final Approval', authority: 'Gate Pass Ready' }
      ];
    }

    let activeIndex = 1;
    if (isApproved) {
      activeIndex = steps.length - 1;
    } else if (s.includes('Counselor')) {
      activeIndex = 1;
    } else if (s.includes('Advisor')) {
      activeIndex = 2;
    } else if (s.includes('HOD')) {
      activeIndex = 3;
    } else if (s.includes('Principal')) {
      activeIndex = 4;
    } else if (s.includes('Warden')) {
      activeIndex = 5;
    }

    let rejectedIndex = -1;
    if (isRejected) {
      if (rejRole.includes('counselor')) rejectedIndex = 1;
      else if (rejRole.includes('advisor')) rejectedIndex = 2;
      else if (rejRole.includes('hod')) rejectedIndex = 3;
      else if (rejRole.includes('principal')) rejectedIndex = 4;
      else if (rejRole.includes('warden')) rejectedIndex = 5;
      else rejectedIndex = activeIndex;
    }

    return `
      <div class="flex items-center justify-between w-full min-w-[500px] py-2 px-1">
        ${steps.map((step, idx) => {
          const isDone = isApproved ? true : (!isRejected && idx < activeIndex) || (isRejected && idx < rejectedIndex);
          const isActive = !isApproved && !isRejected && idx === activeIndex;
          const isThisRejected = isRejected && idx === rejectedIndex;

          let iconContent = '';
          let circleClass = '';
          let labelClass = '';

          if (isDone) {
            circleClass = 'bg-emerald-600 text-white border-2 border-emerald-600 shadow-xs';
            labelClass = 'text-emerald-800 font-bold';
            iconContent = `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`;
          } else if (isThisRejected) {
            circleClass = 'bg-rose-600 text-white border-2 border-rose-600 shadow-xs ring-4 ring-rose-100';
            labelClass = 'text-rose-700 font-bold';
            iconContent = `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/></svg>`;
          } else if (isActive) {
            circleClass = 'bg-amber-500 text-white border-2 border-amber-500 shadow-xs ring-4 ring-amber-100 animate-pulse';
            labelClass = 'text-amber-800 font-extrabold';
            iconContent = `<span class="w-2 h-2 rounded-full bg-white"></span>`;
          } else {
            circleClass = 'bg-white text-slate-400 border-2 border-slate-200';
            labelClass = 'text-slate-400 font-medium';
            iconContent = `<span class="text-[10px] font-bold">${idx + 1}</span>`;
          }

          const isLast = idx === steps.length - 1;

          return `
            <div class="flex items-center ${isLast ? '' : 'flex-1'}">
              <div class="flex flex-col items-center text-center group">
                <div class="w-7 h-7 rounded-full flex items-center justify-center transition-all ${circleClass}">
                  ${iconContent}
                </div>
                <div class="mt-1 text-[10px] whitespace-nowrap leading-tight ${labelClass}">
                  ${escapeHtml(step.label)}
                </div>
                <div class="text-[9px] text-slate-400 whitespace-nowrap">
                  ${escapeHtml(step.authority)}
                </div>
              </div>
              ${!isLast ? `
                <div class="flex-1 h-0.5 mx-1 transition-all ${isDone ? 'bg-emerald-500' : (isThisRejected ? 'bg-rose-300' : 'bg-slate-200')}"></div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Filter Unified Requests Table by Category
   */
  function setUnifiedRequestFilter(filter) {
    currentUnifiedFilter = filter;
    ['all', 'gatepass', 'leave', 'onduty'].forEach(f => {
      const btn = document.getElementById(`tabBtn_${f}`);
      if (btn) {
        if (f === filter) {
          btn.className = 'px-3 py-1.5 rounded-lg font-bold bg-white text-slate-900 shadow-2xs transition';
        } else {
          btn.className = 'px-3 py-1.5 rounded-lg font-medium text-slate-600 hover:text-slate-900 transition';
        }
      }
    });
    renderUnifiedRequestsTable();
  }

  /**
   * Filter Unified Requests Table by Search Input
   */
  function onUnifiedSearchInput(query) {
    currentUnifiedSearchQuery = String(query || '').toLowerCase().trim();
    renderUnifiedRequestsTable();
  }

  /**
   * Render Unified Requests Table
   */
  function renderUnifiedRequestsTable() {
    const tbody = document.getElementById('stuUnifiedRequestsTableBody');
    if (!tbody) return;

    const passes = cachedStudentPasses || [];
    const ods = cachedStudentODs || [];
    const items = [];

    // 1. Passes & Leaves
    passes.forEach((p, idx) => {
      const isLeave = p.requestCategory === 'leave';
      const statusInfo = getDetailedStatusInfo(p);
      const idPrefix = isLeave ? 'LV-2026' : 'GP-2026';
      const reqId = `${idPrefix}-${String(p._id || '').slice(-4).toUpperCase() || String(idx + 1).padStart(4, '0')}`;
      const appliedDate = formatAppliedDateStamp(p.appliedTime, p.createdAt);
      const timestamp = p.createdAt ? new Date(p.createdAt).getTime() : Date.now() - (idx * 60000);

      let schedule = '';
      if (isLeave) {
        schedule = `${formatAcademicDate(p.fromDate || p.departureDate)} to ${formatAcademicDate(p.toDate || p.expectedReturnDate)}`;
      } else {
        const dep = formatAcademicDateTime(p.departureDate, p.departureTime);
        const ret = formatAcademicDateTime(p.expectedReturnDate || p.returnDate, p.expectedReturnTime || p.returnTime);
        schedule = `Dep: ${dep} → Ret: ${ret}`;
      }

      items.push({
        category: isLeave ? 'leave' : 'gatepass',
        categoryLabel: isLeave ? 'Leave Request' : 'Gate Pass',
        badgeClass: isLeave ? 'badge-type-leave' : 'badge-type-gatepass',
        id: reqId,
        title: p.reason || (isLeave ? 'Leave Requisition' : 'Gate Pass Clearance'),
        schedule,
        dest: p.destination || p.placeOrEvent || '',
        appliedDate,
        timestamp,
        statusInfo,
        rejectionReason: p.rejection?.reason || p.rejectionReason || '',
        raw: p
      });
    });

    // 2. On-Duty Requests
    ods.forEach((od, idx) => {
      const statusInfo = getODStatusInfo(od);
      const reqId = `OD-2026-${String(od._id || '').slice(-4).toUpperCase() || String(idx + 1).padStart(4, '0')}`;
      const appliedDate = od.appliedDate || formatAcademicDate(od.createdAt);
      const timestamp = od.createdAt ? new Date(od.createdAt).getTime() : Date.now() - (idx * 60000);
      const title = od.eventName ? `${od.eventName}` : (od.reason || 'Academic Activity');
      const schedule = od.dates || od.schedule || formatAcademicDate(od.odDate || od.specificDate || od.fromDate);

      items.push({
        category: 'onduty',
        categoryLabel: 'OD Request',
        badgeClass: 'badge-type-od',
        id: reqId,
        title,
        schedule,
        dest: od.place || od.venue || '',
        appliedDate,
        timestamp,
        statusInfo,
        rejectionReason: od.rejection?.reason || od.rejectionReason || '',
        raw: od
      });
    });

    // Sort descending by timestamp
    items.sort((a, b) => b.timestamp - a.timestamp);

    // Update counter badges
    const cAll = document.getElementById('unifiedCount_all');
    const cGp = document.getElementById('unifiedCount_gatepass');
    const cLv = document.getElementById('unifiedCount_leave');
    const cOd = document.getElementById('unifiedCount_onduty');
    if (cAll) cAll.innerText = `(${items.length})`;
    if (cGp) cGp.innerText = `(${items.filter(i => i.category === 'gatepass').length})`;
    if (cLv) cLv.innerText = `(${items.filter(i => i.category === 'leave').length})`;
    if (cOd) cOd.innerText = `(${items.filter(i => i.category === 'onduty').length})`;

    // Update dashboard KPIs & navigation badges
    const pendingCount = items.filter(i => !i.statusInfo.isApproved && !i.statusInfo.isRejected).length;
    const approvedCount = items.filter(i => i.statusInfo.isApproved).length;
    const totalCount = items.length;

    const elPen = document.getElementById('dashKpiPending');
    const elApp = document.getElementById('dashKpiApproved');
    const elTot = document.getElementById('dashKpiTotal');
    const elBadge = document.getElementById('navReqBadge');
    if (elPen) elPen.innerText = String(pendingCount);
    if (elApp) elApp.innerText = String(approvedCount);
    if (elTot) elTot.innerText = String(totalCount);
    if (elBadge) elBadge.innerText = String(totalCount);

    // Render Dashboard Recent Requisitions preview (top 3)
    const recentContainer = document.getElementById('dashRecentRequestsContainer');
    if (recentContainer) {
      if (items.length === 0) {
        recentContainer.innerHTML = `
          <div class="p-8 text-center text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <div class="text-xs font-semibold text-slate-600">No Requisitions Submitted Yet</div>
            <div class="text-[11px] text-slate-400 mt-1">Use the left navigation menu to submit a Gate Pass, Leave, or OD request.</div>
          </div>
        `;
      } else {
        const recents = items.slice(0, 3);
        recentContainer.innerHTML = recents.map(item => `
          <div class="p-3.5 bg-slate-50/80 hover:bg-slate-100/80 rounded-xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
            <div class="flex items-center gap-3">
              <span class="${item.badgeClass}">${item.categoryLabel}</span>
              <div>
                <div class="text-xs font-bold text-slate-900">${escapeHtml(item.title)}</div>
                <div class="text-[11px] text-slate-500 font-mono">${escapeHtml(item.schedule)}</div>
              </div>
            </div>
            <div class="flex items-center gap-2.5">
              <span class="${item.statusInfo.statusClass}">${item.statusInfo.statusText}</span>
              <button
                type="button"
                onclick="switchStudentPage('requests')"
                class="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 transition shadow-2xs"
              >
                View Status
              </button>
            </div>
          </div>
        `).join('');
      }
    }

    // Filter by category
    let filtered = items;
    if (currentUnifiedFilter !== 'all') {
      filtered = filtered.filter(i => i.category === currentUnifiedFilter);
    }

    // Filter by search query
    if (currentUnifiedSearchQuery) {
      const q = currentUnifiedSearchQuery;
      filtered = filtered.filter(i =>
        i.id.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        i.schedule.toLowerCase().includes(q) ||
        i.dest.toLowerCase().includes(q) ||
        i.categoryLabel.toLowerCase().includes(q) ||
        i.statusInfo.statusText.toLowerCase().includes(q) ||
        i.statusInfo.authorityText.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="p-10 text-center text-slate-500 bg-white">
            <div class="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <div class="text-xs font-bold text-slate-700">No Requisitions Found</div>
            <div class="text-[11px] text-slate-400 mt-1">Submit your first Gate Pass, Leave, or OD request using the left navigation menu.</div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(item => {
      const isGP = item.category === 'gatepass';
      const isLeave = item.category === 'leave';
      const isOD = item.category === 'onduty';

      let actionButtons = '';
      if (isGP) {
        actionButtons = `
          <div class="inline-flex items-center gap-1.5">
            <button
              type="button"
              onclick="openStudentRequestDetailModal(${escapeAttr(item.raw)})"
              class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition active:scale-95 shadow-2xs"
              title="View Details"
            >
              View Details
            </button>
            <button
              type="button"
              onclick="viewFormalLetter(${escapeAttr(item.raw)})"
              class="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs transition active:scale-95"
              title="View Official Letter"
            >
              View Letter
            </button>
            <button
              type="button"
              onclick="downloadOfficialLetterOnlyPDF(${escapeAttr(item.raw)})"
              class="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700 shadow-2xs transition active:scale-95"
              title="Download PDF"
            >
              Download PDF
            </button>
            ${item.statusInfo.isApproved ? `
              <button
                type="button"
                onclick="openGatePassCardModal(${escapeAttr(item.raw)})"
                class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition active:scale-95"
                title="View Gate Pass Card"
              >
                View Pass
              </button>
            ` : ''}
          </div>
        `;
      } else if (isLeave) {
        actionButtons = `
          <div class="inline-flex items-center gap-1.5">
            <button
              type="button"
              onclick="openStudentRequestDetailModal(${escapeAttr(item.raw)})"
              class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition active:scale-95 shadow-2xs"
              title="View Details"
            >
              View Details
            </button>
            <button
              type="button"
              onclick="viewFormalLetter(${escapeAttr(item.raw)})"
              class="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs transition active:scale-95"
              title="View Formal Letter"
            >
              View Letter
            </button>
            <button
              type="button"
              onclick="downloadOfficialLetterOnlyPDF(${escapeAttr(item.raw)})"
              class="px-2 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-semibold text-purple-700 shadow-2xs transition active:scale-95"
              title="Download PDF"
            >
              Download PDF
            </button>
          </div>
        `;
      } else if (isOD) {
        actionButtons = `
          <div class="inline-flex items-center gap-1.5">
            <button
              type="button"
              onclick="viewOnDutyLetter(${escapeAttr(item.raw)})"
              class="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs transition active:scale-95"
              title="View Formal OD Letter"
            >
              View Letter
            </button>
            <button
              type="button"
              onclick="if(typeof downloadOnDutyLetterPDF==='function'){downloadOnDutyLetterPDF(${escapeAttr(item.raw)});}else{viewOnDutyLetter(${escapeAttr(item.raw)});}"
              class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 shadow-2xs transition active:scale-95"
              title="Download OD PDF"
            >
              Download PDF
            </button>
          </div>
        `;
      }

      return `
        <tr class="hover:bg-slate-50/70 transition-colors border-b border-slate-100">
          <td>
            <span class="${item.badgeClass}">
              ${item.categoryLabel}
            </span>
            <div class="font-mono text-[10px] text-slate-400 font-bold mt-1">${item.id}</div>
          </td>
          <td class="max-w-md py-3.5">
            <div class="font-semibold text-xs text-slate-900 leading-snug truncate" title="${escapeAttr(item.title)}">
              ${escapeHtml(item.title)}
            </div>
            ${item.dest ? `<div class="text-[11px] text-blue-700 font-medium truncate mt-0.5" title="Venue: ${escapeAttr(item.dest)}"><span class="text-slate-400 font-semibold uppercase text-[9px] mr-1">Venue:</span>${escapeHtml(item.dest)}</div>` : ''}
            <div class="text-[11px] text-slate-500 font-mono mt-0.5">
              ${escapeHtml(item.schedule)}
            </div>
            ${item.statusInfo.isRejected && item.rejectionReason ? `
              <div class="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 leading-snug">
                <strong>Rejection Reason:</strong> ${escapeHtml(item.rejectionReason)}
              </div>
            ` : ''}
          </td>
          <td class="whitespace-nowrap text-xs text-slate-600 font-mono">
            ${item.appliedDate}
          </td>
          <td>
            <div>
              <span class="${item.statusInfo.statusClass}">
                ${item.statusInfo.statusText}
              </span>
            </div>
            <div class="text-[11px] ${item.statusInfo.authorityClass} mt-1">
              ${item.statusInfo.authorityText}
            </div>
          </td>
          <td class="text-right whitespace-nowrap">
            ${actionButtons}
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Load Student Personal Status (Passes, Leaves, ODs)
   */
  async function loadStudentPersonalStatus() {
    const loggedUser = window.loggedUser;
    if (!loggedUser || !loggedUser.userId) return;

    try {
      const [passesData, odsData] = await Promise.all([
        Api.get(`/api/passes?rollNo=${encodeURIComponent(loggedUser.userId)}`),
        Api.get(`/api/onduty?rollNo=${encodeURIComponent(loggedUser.userId)}`)
      ]);

      cachedStudentPasses = passesData || [];
      cachedStudentODs = odsData || [];
      window.cachedStudentPasses = cachedStudentPasses;
      window.cachedStudentODs = cachedStudentODs;

      const leaves = cachedStudentPasses.filter(p => p.requestCategory === 'leave');
      const gatePasses = cachedStudentPasses.filter(p => p.requestCategory !== 'leave');

      // Render tables
      renderLeaveTable(leaves);
      renderGatePassTable(gatePasses);
      renderODTable(cachedStudentODs);
      renderUnifiedRequestsTable();

      // Update KPIs on dashboard tab
      const kpiLeave = document.getElementById('stuKpiLeaveTotal');
      const kpiPass = document.getElementById('stuKpiPassTotal');
      const kpiOd = document.getElementById('stuKpiOdTotal');
      if (kpiLeave) kpiLeave.innerText = String(leaves.length);
      if (kpiPass) kpiPass.innerText = String(gatePasses.length);
      if (kpiOd) kpiOd.innerText = String(cachedStudentODs.length);

      const legacyBody = document.getElementById('studentPersonalBody');
      if (legacyBody) {
        renderLegacyPassTable(legacyBody, cachedStudentPasses);
      }
    } catch (err) {
      console.error('Failed to load student personal status:', err);
    }
  }

  /**
   * Render Gate Passes Table in Student Dashboard (Legacy View)
   */
  function renderGatePassTable(passes) {
    const tbody = document.getElementById('stuGatePassTableBody');
    if (!tbody) return;

    if (!passes || passes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-8 text-center text-slate-500 bg-white">
            <div class="text-xs font-semibold text-slate-700">No Gate Pass Requests Found</div>
            <div class="text-[11px] text-slate-400 mt-1">Submit your first gate pass requisition using the form above.</div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = passes.map((p, index) => {
      const statusInfo = getDetailedStatusInfo(p);
      const reqId = `GP-2026-${String(p._id || '').slice(-4).toUpperCase() || String(index + 1).padStart(4, '0')}`;
      const appliedOnDisplay = formatAppliedDateStamp(p.appliedTime, p.createdAt);
      const depDisplay = formatAcademicDateTime(p.departureDate, p.departureTime);
      const retDisplay = formatAcademicDateTime(p.expectedReturnDate, p.expectedReturnTime);
      const reasonDisplay = p.reason || '-';
      const destDisplay = p.destination || p.placeOrEvent || '';
      const isHosteller = (/hoste?l|^h$/i.test(p.accommodation || '') && !/day\s*scholar/i.test(p.accommodation || ''));

      return `
        <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
          <td>
            <span class="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              ${reqId}
            </span>
            <div class="text-[10px] text-slate-400 font-mono mt-0.5">${isHosteller ? 'Hosteller' : 'Day Scholar'}</div>
          </td>
          <td class="whitespace-nowrap text-xs text-slate-600 font-mono">
            ${appliedOnDisplay}
          </td>
          <td class="max-w-xs">
            <div class="font-semibold text-xs text-slate-900 truncate" title="${escapeAttr(reasonDisplay)}">
              ${escapeHtml(reasonDisplay)}
            </div>
            ${destDisplay ? `<div class="text-[11px] text-blue-700 font-medium truncate" title="Destination: ${escapeAttr(destDisplay)}"><span class="text-slate-400 font-semibold uppercase text-[9px] mr-1">To:</span>${escapeHtml(destDisplay)}</div>` : ''}
            <div class="text-[11px] text-slate-500 font-mono mt-0.5">
              <span>Dep: ${depDisplay}</span> → <span>Ret: ${retDisplay}</span>
            </div>
            ${statusInfo.isRejected && (p.rejection?.reason || p.rejectionReason) ? `
              <div class="mt-1 p-1.5 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-800 leading-snug">
                <strong>Rejection Reason:</strong> ${escapeHtml(p.rejection?.reason || p.rejectionReason)}
              </div>
            ` : ''}
          </td>
          <td>
            <span class="${statusInfo.statusClass}">
              ${statusInfo.statusText}
            </span>
          </td>
          <td>
            <span class="text-xs ${statusInfo.authorityClass}">
              ${statusInfo.authorityText}
            </span>
          </td>
          <td class="text-right whitespace-nowrap">
            <div class="inline-flex items-center gap-1.5">
              <button
                type="button"
                onclick="openStudentRequestDetailModal(${escapeAttr(p)})"
                class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition active:scale-95 shadow-2xs"
                title="View full request details & approval progress"
              >
                View Request
              </button>
              <button
                type="button"
                onclick="viewFormalLetter(${escapeAttr(p)})"
                class="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-700 shadow-2xs transition active:scale-95"
                title="View generated official formal letter"
              >
                View Letter
              </button>
              <button
                type="button"
                onclick="downloadOfficialLetterOnlyPDF(${escapeAttr(p)})"
                class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-xs font-semibold text-blue-700 shadow-2xs transition active:scale-95"
                title="Download official formal letter as PDF"
              >
                Download Letter
              </button>
              ${statusInfo.isApproved ? `
                <button
                  type="button"
                  onclick="openGatePassCardModal(${escapeAttr(p)})"
                  class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-xs transition active:scale-95"
                  title="View Approved Official Gate Pass Card"
                >
                  View Gate Pass
                </button>
                <button
                  type="button"
                  onclick="downloadGatePassCardPDF(${escapeAttr(p)})"
                  class="px-2 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-xs font-bold shadow-xs transition active:scale-95"
                  title="Download Official Gate Pass PDF"
                >
                  Download Pass
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterGatePassTable(query) {
    const q = String(query || '').toLowerCase().trim();
    const passes = cachedStudentPasses.filter(p => p.requestCategory !== 'leave');
    if (!q) {
      renderGatePassTable(passes);
      return;
    }
    const filtered = passes.filter(p =>
      (p.reason && p.reason.toLowerCase().includes(q)) ||
      (p.departureDate && p.departureDate.toLowerCase().includes(q)) ||
      (p.status && p.status.toLowerCase().includes(q))
    );
    renderGatePassTable(filtered);
  }

  function renderLeaveTable(leaves) {
    const tbody = document.getElementById('stuLeaveTableBody');
    if (!tbody) return;

    if (!leaves || leaves.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="p-8 text-center text-slate-500 bg-white">
            <div class="text-xs font-semibold text-slate-700">No Leave Requests Found</div>
            <div class="text-[11px] text-slate-400 mt-1">Submit your first leave request using the form above.</div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = leaves.map((p, index) => {
      const isApproved = isPassFullyApproved(p);
      const isRejected = p.status === 'Rejected';

      let statusPill = `<span class="badge-pending-clean">Pending</span>`;
      if (isApproved) {
        statusPill = `<span class="badge-approved-clean">Approved</span>`;
      } else if (isRejected) {
        statusPill = `<span class="badge-rejected-clean">Rejected</span>`;
      }

      const fromDateDisplay = formatAcademicDate(p.fromDate || p.departureDate);
      const toDateDisplay = formatAcademicDate(p.toDate || p.expectedReturnDate);
      const reasonDisplay = p.reason || '-';
      const appliedOnDisplay = formatAppliedDateStamp(p.appliedTime, p.createdAt);

      return `
        <tr>
          <td class="text-slate-400 font-mono text-xs">${index + 1}</td>
          <td class="font-medium text-slate-700 whitespace-nowrap">${fromDateDisplay}</td>
          <td class="font-medium text-slate-700 whitespace-nowrap">${toDateDisplay}</td>
          <td class="text-slate-800 font-medium max-w-sm truncate" title="${escapeAttr(reasonDisplay)}">
            ${escapeHtml(reasonDisplay)}
          </td>
          <td>${statusPill}</td>
          <td class="text-slate-500 whitespace-nowrap text-xs">${appliedOnDisplay}</td>
          <td class="text-right whitespace-nowrap">
            <button
              type="button"
              onclick="viewFormalLetter(${escapeAttr(p)})"
              class="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-700 shadow-2xs transition active:scale-95"
            >
              View Letter
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterLeaveRequestsTable(query) {
    const q = String(query || '').toLowerCase().trim();
    const leaves = cachedStudentPasses.filter(p => p.requestCategory === 'leave');
    if (!q) {
      renderLeaveTable(leaves);
      return;
    }
    const filtered = leaves.filter(p =>
      (p.reason && p.reason.toLowerCase().includes(q)) ||
      (p.fromDate && p.fromDate.toLowerCase().includes(q)) ||
      (p.toDate && p.toDate.toLowerCase().includes(q)) ||
      (p.status && p.status.toLowerCase().includes(q))
    );
    renderLeaveTable(filtered);
  }

  function renderODTable(ods) {
    const tbody = document.getElementById('stuODTableBody');
    if (!tbody) return;

    if (!ods || ods.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="p-8 text-center text-slate-500 bg-white">
            <div class="text-xs font-semibold text-slate-700">No On-Duty Requests Found</div>
            <div class="text-[11px] text-slate-400 mt-1">Submit academic OD applications using the form above.</div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = ods.map((od, index) => {
      const isApproved = od.status === 'Approved' || (od.counselorApproval?.approved && od.advisorApproval?.approved && od.hodApproval?.approved);
      let statusPill = `<span class="badge-pending-clean">Pending</span>`;
      if (isApproved) {
        statusPill = `<span class="badge-approved-clean">Approved</span>`;
      } else if (od.status === 'Rejected') {
        statusPill = `<span class="badge-rejected-clean">Rejected</span>`;
      }

      return `
        <tr>
          <td class="text-slate-400 font-mono text-xs">${index + 1}</td>
          <td class="text-slate-500 whitespace-nowrap text-xs">${od.appliedDate || formatAcademicDate(od.createdAt)}</td>
          <td class="text-slate-800 font-medium whitespace-nowrap text-xs">${escapeHtml(od.dates || od.schedule || '-')}</td>
          <td class="text-slate-700 max-w-xs truncate text-xs" title="${escapeAttr(od.reason || '')}">${escapeHtml(od.reason || '-')}</td>
          <td>${statusPill}</td>
          <td class="text-right whitespace-nowrap">
            <button onclick="viewOnDutyLetter(${escapeAttr(od)})" class="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-700 shadow-2xs transition active:scale-95">Letter</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderLegacyPassTable(tbody, passes) {
    if (!tbody) return;
    if (!passes || passes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-xs text-slate-400">No active applications.</td></tr>`;
      return;
    }
    tbody.innerHTML = passes.map(p => `
      <tr>
        <td class="font-mono text-xs">${p.appliedTime || '-'}</td>
        <td class="text-xs">${escapeHtml(p.reason || '-')}</td>
        <td class="text-xs">${p.requestCategory === 'leave' ? 'Leave' : 'Gate Pass'}</td>
        <td class="text-xs">${p.status}</td>
        <td class="text-right">
          <button onclick="viewFormalLetter(${escapeAttr(p)})" class="px-2 py-1 bg-slate-100 rounded text-xs">View</button>
        </td>
      </tr>
    `).join('');
  }

  // Export to global scope
  window.formatAcademicDate = formatAcademicDate;
  window.formatTime12 = formatTime12;
  window.formatAcademicDateTime = formatAcademicDateTime;
  window.formatAppliedDateStamp = formatAppliedDateStamp;
  window.isPassFullyApproved = isPassFullyApproved;
  window.getDetailedStatusInfo = getDetailedStatusInfo;
  window.getODStatusInfo = getODStatusInfo;
  window.buildApprovalStepperHtml = buildApprovalStepperHtml;
  window.setUnifiedRequestFilter = setUnifiedRequestFilter;
  window.onUnifiedSearchInput = onUnifiedSearchInput;
  window.renderUnifiedRequestsTable = renderUnifiedRequestsTable;
  window.loadStudentPersonalStatus = loadStudentPersonalStatus;
  window.renderGatePassTable = renderGatePassTable;
  window.filterGatePassTable = filterGatePassTable;
  window.renderLeaveTable = renderLeaveTable;
  window.filterLeaveRequestsTable = filterLeaveRequestsTable;
  window.renderODTable = renderODTable;
  window.renderLegacyPassTable = renderLegacyPassTable;

})();
