/**
 * Campus PassPro • Student Modals Submodule
 * Handles modal dialogs for Gate Pass, Leave, On-Duty, Profile, and Detail Views
 */

(function () {
  'use strict';

  /**
   * Open Gate Pass Request Modal with auto-populated profile info
   */
  function openGatePassRequestModal() {
    const modal = document.getElementById('modalGatePassRequest');
    if (!modal) return;

    const u = window.loggedUser || {};
    const isHosteller = (/hoste?l|^h$/i.test(u.accommodation || '') && !/day\s*scholar/i.test(u.accommodation || ''));

    const nameEl = document.getElementById('gpModalStudentName');
    const regEl = document.getElementById('gpModalRegNo');
    const fatherEl = document.getElementById('gpModalFatherName');
    const phoneEl = document.getElementById('gpModalParentPhone');
    const deptEl = document.getElementById('gpModalDept');
    const yearSecEl = document.getElementById('gpModalYearSec');
    const accomEl = document.getElementById('gpModalAccom');

    if (nameEl) nameEl.innerText = u.name || 'Student';
    if (regEl) regEl.innerText = u.userId || '-';
    if (fatherEl) fatherEl.innerText = u.fatherName || u.parentName || 'Parent / Guardian';
    if (phoneEl) phoneEl.innerText = u.parentContact || 'Contact on record';
    if (deptEl) deptEl.innerText = u.dept || 'Engineering';
    if (yearSecEl) yearSecEl.innerText = `${u.academicYear || 'III Year'} - Sec ${u.yearSec || 'A'}`;
    if (accomEl) {
      accomEl.innerText = isHosteller ? 'Hosteller (Resident Scholar)' : 'Day Scholar';
      accomEl.className = isHosteller ? 'font-bold text-emerald-700 block' : 'font-bold text-blue-700 block';
    }

    // Reset required input fields (ONLY Departure Date, Time, Return Date, Time, Reason)
    const dD = document.getElementById('gpDepDate');
    const dT = document.getElementById('gpDepTime');
    const rD = document.getElementById('gpRetDate');
    const rT = document.getElementById('gpRetTime');
    const r = document.getElementById('gatePassReason');
    if (dD) dD.value = '';
    if (dT) dT.value = '';
    if (rD) rD.value = '';
    if (rT) rT.value = '';
    if (r) r.value = '';

    modal.classList.remove('hidden');
  }

  function closeGatePassRequestModal() {
    const modal = document.getElementById('modalGatePassRequest');
    if (modal) modal.classList.add('hidden');
  }

  /**
   * Open Leave Request Modal with auto-populated profile info
   */
  function openLeaveRequestModal() {
    const modal = document.getElementById('modalLeaveRequest');
    if (!modal) return;

    const u = window.loggedUser || {};
    const nameEl = document.getElementById('leaveModalStudentName');
    const regEl = document.getElementById('leaveModalRegNo');
    const deptYearEl = document.getElementById('leaveModalDeptYear');

    if (nameEl) nameEl.innerText = u.name || 'Student';
    if (regEl) regEl.innerText = u.userId || '-';
    if (deptYearEl) deptYearEl.innerText = `${u.academicYear || 'III Year'} - ${u.dept || 'Engineering'} (Sec ${u.yearSec || 'A'})`;

    // Reset inputs (ONLY Leave From Date, Leave To Date, Reason)
    const fD = document.getElementById('leaveFromDate');
    const tD = document.getElementById('leaveToDate');
    const r = document.getElementById('leaveReason');
    if (fD) fD.value = '';
    if (tD) tD.value = '';
    if (r) r.value = '';

    modal.classList.remove('hidden');
  }

  function closeLeaveRequestModal() {
    const modal = document.getElementById('modalLeaveRequest');
    if (modal) modal.classList.add('hidden');
  }

  /**
   * Open OD (On Duty) Request Modal with auto-populated profile info
   */
  function openODRequestModal() {
    const modal = document.getElementById('modalODRequest');
    if (!modal) return;

    const u = window.loggedUser || {};
    const nameEl = document.getElementById('odModalStudentName');
    const regEl = document.getElementById('odModalRegNo');
    const deptYearEl = document.getElementById('odModalDeptYear');

    if (nameEl) nameEl.innerText = u.name || 'Student';
    if (regEl) regEl.innerText = u.userId || '-';
    if (deptYearEl) deptYearEl.innerText = `${u.academicYear || 'III Year'} - ${u.dept || 'Engineering'} (Sec ${u.yearSec || 'A'})`;

    // Set default format to Single Date
    const rSingle = document.getElementById('odRadioSingle');
    if (rSingle) rSingle.checked = true;
    if (typeof window.toggleODFormatType === 'function') {
      window.toggleODFormatType('single');
    }

    // Reset inputs
    const sDate = document.getElementById('odSingleDate');
    const sFrom = document.getElementById('odSingleFromTime');
    const sTo = document.getElementById('odSingleToTime');
    const rFromD = document.getElementById('odRangeFromDate');
    const rToD = document.getElementById('odRangeToDate');
    const rFromT = document.getElementById('odRangeFromTime');
    const rToT = document.getElementById('odRangeToTime');
    const r = document.getElementById('odReason');
    if (sDate) sDate.value = '';
    if (sFrom) sFrom.value = '';
    if (sTo) sTo.value = '';
    if (rFromD) rFromD.value = '';
    if (rToD) rToD.value = '';
    if (rFromT) rFromT.value = '';
    if (rToT) rToT.value = '';
    if (r) r.value = '';

    modal.classList.remove('hidden');
  }

  function closeODRequestModal() {
    const modal = document.getElementById('modalODRequest');
    if (modal) modal.classList.add('hidden');
  }

  /**
   * Open Student Profile Modal
   */
  function openStudentProfileModal() {
    populateStudentProfileTab();
    const modal = document.getElementById('studentProfileModal');
    if (modal) modal.classList.remove('hidden');
    const dropdown = document.getElementById('stuProfileDropdown');
    if (dropdown) dropdown.classList.add('hidden');
  }

  function closeStudentProfileModal() {
    const modal = document.getElementById('studentProfileModal');
    if (modal) modal.classList.add('hidden');
  }

  /**
   * Populate Student Profile Modal / Tab fields
   */
  function populateStudentProfileTab() {
    const loggedUser = window.loggedUser;
    if (!loggedUser) return;
    const profName = document.getElementById('profName');
    const profRoll = document.getElementById('profRoll');
    const profDeptSec = document.getElementById('profDeptSec');
    const profAccom = document.getElementById('profAccom');
    const profCounselor = document.getElementById('profCounselor');
    const profParent = document.getElementById('profParent');

    if (profName) profName.innerText = loggedUser.name || 'Student';
    if (profRoll) profRoll.innerText = loggedUser.userId || '-';
    if (profDeptSec) profDeptSec.innerText = `${loggedUser.academicYear || 'III Year'} - ${loggedUser.dept || 'Engineering'} (Sec ${loggedUser.yearSec || 'A'})`;
    if (profAccom) profAccom.innerText = loggedUser.accommodation || 'Day Scholar';
    if (profCounselor) profCounselor.innerText = loggedUser.counselorName || loggedUser.counselor || 'Assigned Faculty Mentor';
    if (profParent) profParent.innerText = `${loggedUser.fatherName || loggedUser.parentName || 'Parent'} (${loggedUser.parentContact || 'Contact on file'})`;
  }

  /**
   * Open Student Request Detail Modal
   */
  function openStudentRequestDetailModal(pass) {
    if (!pass) return;

    const modal = document.getElementById('stuRequestDetailModal');
    if (!modal) return;

    const isHosteller = (/hoste?l|^h$/i.test(pass.accommodation || '') && !/day\s*scholar/i.test(pass.accommodation || ''));
    const statusInfo = typeof window.getDetailedStatusInfo === 'function'
      ? window.getDetailedStatusInfo(pass)
      : { statusText: pass.status || 'Pending', authorityText: 'Institutional Staff', isApproved: false, isRejected: false };

    const reqId = `GP-2026-${String(pass._id || '').slice(-4).toUpperCase() || '0001'}`;
    const appliedOnDisplay = typeof window.formatAppliedDateStamp === 'function'
      ? window.formatAppliedDateStamp(pass.appliedTime, pass.createdAt)
      : (pass.appliedTime || '-');
    const depDisplay = typeof window.formatAcademicDateTime === 'function'
      ? window.formatAcademicDateTime(pass.departureDate, pass.departureTime)
      : `${pass.departureDate || ''} ${pass.departureTime || ''}`;
    const retDisplay = typeof window.formatAcademicDateTime === 'function'
      ? window.formatAcademicDateTime(pass.expectedReturnDate || pass.returnDate, pass.expectedReturnTime || pass.returnTime)
      : `${pass.expectedReturnDate || pass.returnDate || ''} ${pass.expectedReturnTime || pass.returnTime || ''}`;

    // Header info
    const reqIdEl = document.getElementById('stuModalReqId');
    if (reqIdEl) reqIdEl.innerText = reqId;

    const accomBadgeEl = document.getElementById('stuModalAccomBadge');
    if (accomBadgeEl) {
      accomBadgeEl.innerText = isHosteller ? 'Hostel Resident' : 'Day Scholar';
      accomBadgeEl.className = isHosteller
        ? 'px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200'
        : 'px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200';
    }

    const appliedOnEl = document.getElementById('stuModalAppliedOn');
    if (appliedOnEl) appliedOnEl.innerText = `Requisition Applied: ${appliedOnDisplay}`;

    // Current Status Banner
    const curStatusEl = document.getElementById('stuModalCurrentStatus');
    if (curStatusEl) curStatusEl.innerText = statusInfo.statusText;

    const curAuthEl = document.getElementById('stuModalCurrentAuthority');
    if (curAuthEl) curAuthEl.innerText = statusInfo.authorityText;

    const bannerEl = document.getElementById('stuModalStatusBanner');
    if (bannerEl) {
      if (statusInfo.isApproved) {
        bannerEl.className = 'p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50/90 border-emerald-300 text-emerald-950';
      } else if (statusInfo.isRejected) {
        bannerEl.className = 'p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-rose-50 border-rose-300 text-rose-950';
      } else {
        bannerEl.className = 'p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50/90 border-amber-300 text-amber-950';
      }
    }

    // Rejection Box
    const rejBox = document.getElementById('stuModalRejectionBox');
    const rejTitle = document.getElementById('stuModalRejectionTitle');
    const rejReason = document.getElementById('stuModalRejectionReason');
    if (statusInfo.isRejected && (pass.rejection?.reason || pass.rejectionReason)) {
      if (rejBox) rejBox.classList.remove('hidden');
      const rejBy = pass.rejection?.roleTitle || pass.rejectedBy || 'Designated Authority';
      if (rejTitle) rejTitle.innerText = `Requisition Rejected by ${rejBy}`;
      if (rejReason) rejReason.innerText = pass.rejection?.reason || pass.rejectionReason || 'Institutional review criteria not fulfilled.';
    } else {
      if (rejBox) rejBox.classList.add('hidden');
    }

    // Workflow Stepper
    const stepperContainer = document.getElementById('stuModalWorkflowStepper');
    if (stepperContainer && typeof window.buildApprovalStepperHtml === 'function') {
      stepperContainer.innerHTML = window.buildApprovalStepperHtml(pass, isHosteller);
    }

    // Student Particulars
    const rollEl = document.getElementById('stuModalRoll');
    if (rollEl) rollEl.innerText = pass.rollNo || pass.registrationNumber || '-';

    const nameEl = document.getElementById('stuModalName');
    if (nameEl) nameEl.innerText = pass.studentName || pass.name || '-';

    const fatherEl = document.getElementById('stuModalFather');
    if (fatherEl) fatherEl.innerText = pass.fatherName || pass.parentName || '-';

    const phoneEl = document.getElementById('stuModalPhone');
    if (phoneEl) phoneEl.innerText = pass.parentPhone || pass.parentContact || '-';

    const depEl = document.getElementById('stuModalDeparture');
    if (depEl) depEl.innerText = depDisplay;

    const retEl = document.getElementById('stuModalReturn');
    if (retEl) retEl.innerText = retDisplay;

    const destEl = document.getElementById('stuModalDestination');
    if (destEl) destEl.innerText = pass.destination || pass.placeOrEvent || 'Not Specified';

    const reasonEl = document.getElementById('stuModalReason');
    if (reasonEl) reasonEl.innerText = pass.reason || '-';

    // Hostel Information
    const hostelRow = document.getElementById('stuModalHostelInfoRow');
    const hostelDetails = document.getElementById('stuModalHostelDetails');
    if (isHosteller) {
      if (hostelRow) hostelRow.classList.remove('hidden');
      if (hostelDetails) {
        const room = pass.hostelRoom || pass.hostelBlock || 'Resident';
        const notes = pass.hostelDepartureInfo || pass.hostelReturnInfo || '';
        hostelDetails.innerText = `Block & Room: ${room}${notes ? ` • Note: ${notes}` : ''}`;
      }
    } else {
      if (hostelRow) hostelRow.classList.add('hidden');
    }

    // Action Buttons
    const viewLetterBtn = document.getElementById('stuModalViewLetterBtn');
    if (viewLetterBtn) {
      viewLetterBtn.onclick = () => {
        if (typeof window.viewFormalLetter === 'function') {
          window.viewFormalLetter(pass);
        }
      };
    }

    const dlLetterBtn = document.getElementById('stuModalDownloadLetterBtn');
    if (dlLetterBtn) {
      dlLetterBtn.onclick = () => {
        if (typeof window.downloadOfficialLetterOnlyPDF === 'function') {
          window.downloadOfficialLetterOnlyPDF(pass);
        }
      };
    }

    const passCardBtn = document.getElementById('stuModalPassCardBtn');
    if (passCardBtn) {
      if (statusInfo.isApproved) {
        passCardBtn.classList.remove('hidden');
        passCardBtn.onclick = () => openGatePassCardModal(pass);
      } else {
        passCardBtn.classList.add('hidden');
      }
    }

    modal.classList.remove('hidden');
  }

  function closeStudentRequestDetailModal() {
    const modal = document.getElementById('stuRequestDetailModal');
    if (modal) modal.classList.add('hidden');
  }

  /**
   * Open Digital Gate Pass Card Modal (When Approved - Gate Pass Ready)
   */
  function openGatePassCardModal(pass) {
    if (!pass) return;

    const modal = document.getElementById('gatePassCardModal');
    if (!modal) return;

    const isHosteller = (/hoste?l|^h$/i.test(pass.accommodation || '') && !/day\s*scholar/i.test(pass.accommodation || ''));
    const depDisplay = typeof window.formatAcademicDateTime === 'function'
      ? window.formatAcademicDateTime(pass.departureDate, pass.departureTime)
      : `${pass.departureDate || ''} ${pass.departureTime || ''}`;
    const retDisplay = typeof window.formatAcademicDateTime === 'function'
      ? window.formatAcademicDateTime(pass.expectedReturnDate || pass.returnDate, pass.expectedReturnTime || pass.returnTime)
      : `${pass.expectedReturnDate || pass.returnDate || ''} ${pass.expectedReturnTime || pass.returnTime || ''}`;

    const nameEl = document.getElementById('gpCardName');
    if (nameEl) nameEl.innerText = pass.studentName || pass.name || '-';

    const rollEl = document.getElementById('gpCardRoll');
    if (rollEl) rollEl.innerText = pass.rollNo || pass.registrationNumber || '-';

    const deptEl = document.getElementById('gpCardDept');
    if (deptEl) deptEl.innerText = `${pass.dept || 'Engineering'} - Sec ${pass.yearSec || 'A'} (${pass.academicYear || 'III Year'})`;

    const accomEl = document.getElementById('gpCardAccom');
    if (accomEl) accomEl.innerText = isHosteller ? 'Hosteller (Resident)' : 'Day Scholar';

    const depEl = document.getElementById('gpCardDep');
    if (depEl) depEl.innerText = depDisplay;

    const retEl = document.getElementById('gpCardRet');
    if (retEl) retEl.innerText = retDisplay;

    const reasonEl = document.getElementById('gpCardReason');
    if (reasonEl) {
      const dest = pass.destination || pass.placeOrEvent ? ` | Destination: ${pass.destination || pass.placeOrEvent}` : '';
      reasonEl.innerText = `${pass.reason || '-'}${dest}`;
    }

    const dlBtn = document.getElementById('gpCardDownloadBtn');
    if (dlBtn) {
      dlBtn.onclick = () => {
        if (typeof window.downloadGatePassCardPDF === 'function') {
          window.downloadGatePassCardPDF(pass);
        }
      };
    }

    modal.classList.remove('hidden');
  }

  function closeGatePassCardModal() {
    const modal = document.getElementById('gatePassCardModal');
    if (modal) modal.classList.add('hidden');
  }

  // Export to global scope
  window.openGatePassRequestModal = openGatePassRequestModal;
  window.closeGatePassRequestModal = closeGatePassRequestModal;
  window.openLeaveRequestModal = openLeaveRequestModal;
  window.closeLeaveRequestModal = closeLeaveRequestModal;
  window.openODRequestModal = openODRequestModal;
  window.closeODRequestModal = closeODRequestModal;
  window.openStudentProfileModal = openStudentProfileModal;
  window.closeStudentProfileModal = closeStudentProfileModal;
  window.populateStudentProfileTab = populateStudentProfileTab;
  window.openStudentRequestDetailModal = openStudentRequestDetailModal;
  window.closeStudentRequestDetailModal = closeStudentRequestDetailModal;
  window.openGatePassCardModal = openGatePassCardModal;
  window.closeGatePassCardModal = closeGatePassCardModal;

})();
