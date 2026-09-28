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

    // Student Type Specific Form Fields:
    // Day Scholar -> Departure Date + Departure Time + Reason (Return Date & Return Time strictly hidden)
    // Hosteller   -> Departure Date + Departure Time + Return Date + Return Time + Reason
    const returnRow = document.getElementById('gpHostelReturnFields');
    if (returnRow) {
      if (isHosteller) {
        returnRow.classList.remove('hidden');
      } else {
        returnRow.classList.add('hidden');
      }
    }

    // Reset required input fields
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
   * Open Official Digital Gate Pass Document Modal (When Approved - Gate Pass Ready)
   */
  function openGatePassCardModal(pass) {
    if (!pass) return;

    const modal = document.getElementById('gatePassCardModal');
    if (!modal) return;

    window.currentActivePass = pass;

    const isHosteller = (/hoste?l|^h$/i.test(pass.accommodation || '') && !/day\s*scholar/i.test(pass.accommodation || ''));
    
    // Gate Pass ID
    const yr = new Date(pass.createdAt || Date.now()).getFullYear();
    const fallbackId = `GRT-GP-${yr}-${String(pass._id || '').slice(-4).toUpperCase() || '1048'}`;
    const gatePassId = pass.gatePassId || fallbackId;
    pass.gatePassId = gatePassId;

    // Movement details
    const studentName = pass.studentName || pass.name || 'Student';
    const rollNo = pass.rollNo || pass.registrationNumber || '-';
    const deptStr = pass.dept ? `Dept of ${pass.dept.toUpperCase()}` : 'Engineering';
    const yearSecStr = `${pass.academicYear || 'III Year'} / Section '${pass.yearSec || 'A'}'`;
    const accomStr = isHosteller ? 'Hosteller (Resident)' : 'Day Scholar';
    const parentContact = pass.parentContact || pass.contactNumber || pass.mobile || '-';
    
    const depDate = pass.departureDate || pass.leaveDate || '-';
    const depTime = pass.departureTime || pass.leaveTime || '-';
    const depTimeFormatted = typeof formatTime12 === 'function' ? formatTime12(depTime) : depTime;

    const retDate = pass.expectedReturnDate || pass.returnDate || '';
    const retTime = pass.expectedReturnTime || pass.returnTime || '';
    let retDisplay = 'N/A (Day Scholar Outpass)';
    if (isHosteller) {
      if (retDate && retTime) {
        retDisplay = `${retDate} at ${retTime}`;
      } else if (retDate) {
        retDisplay = retDate;
      } else if (pass.expectedReturnDateTime) {
        retDisplay = pass.expectedReturnDateTime;
      } else {
        retDisplay = 'Authorized Institutional Hours';
      }
    }

    // Final Approving Authority
    let finalAuth = pass.finalApprovingAuthority;
    if (!finalAuth) {
      if (isHosteller) {
        const wName = pass.wardenApproval?.wardenName || (pass.gender === 'Female' ? 'Girls Hostel Warden' : 'Boys Hostel Warden');
        finalAuth = `${wName} (Hostel Warden)`;
      } else {
        const pName = pass.principalApproval?.principalName || 'Principal';
        finalAuth = `Principal (${pName})`;
      }
      pass.finalApprovingAuthority = finalAuth;
    }

    const approvalTime = pass.finalApprovalTime || pass.approvalTime || pass.principalApproval?.time || pass.wardenApproval?.time || pass.appliedTime || '-';
    const verifyCode = `GRT-VERIFY-${rollNo}-${String(gatePassId).replace(/[^A-Za-z0-9]/g, '')}`;

    // Populate Official Document Elements
    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };

    setTxt('gpDocPassId', gatePassId);
    setTxt('gpDocName', studentName);
    setTxt('gpDocRoll', rollNo);
    setTxt('gpDocDept', deptStr);
    setTxt('gpDocYearSec', yearSecStr);
    setTxt('gpDocAccom', accomStr);
    setTxt('gpDocParentContact', parentContact);
    setTxt('gpDocDate', depDate);
    setTxt('gpDocTime', depTimeFormatted);
    setTxt('gpDocReturnTime', retDisplay);
    setTxt('gpDocFinalAuthority', finalAuth);
    setTxt('gpDocApprovalTime', approvalTime);
    setTxt('gpDocVerifyCode', verifyCode);
    setTxt('gpDocStudentSignName', studentName);
    setTxt('gpDocFinalAuthoritySign', finalAuth);

    const reasonEl = document.getElementById('gpDocReason');
    if (reasonEl) {
      const dest = pass.destination || pass.placeOrEvent ? ` | Destination: ${pass.destination || pass.placeOrEvent}` : '';
      reasonEl.innerText = `${pass.reason || '-'}${dest}`;
    }

    const accomBadge = document.getElementById('gpDocAccomBadge');
    if (accomBadge) {
      accomBadge.innerText = isHosteller ? 'HOSTELLER' : 'DAY SCHOLAR';
      accomBadge.className = isHosteller 
        ? 'px-2.5 py-1 bg-amber-50 border border-amber-300 text-amber-900 rounded font-mono text-xs font-bold'
        : 'px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded font-mono text-xs font-bold';
    }

    const approverRoleLabel = document.getElementById('gpDocApproverRoleLabel');
    if (approverRoleLabel) {
      approverRoleLabel.innerText = isHosteller ? 'Hostel Warden Clearance' : 'Principal Final Approval';
    }

    // Dynamic QR Code Generation
    const qrImg = document.getElementById('gpDocQrImage');
    if (qrImg) {
      const qrPayload = encodeURIComponent(`GRT_INSTITUTIONAL_GATE_PASS|ID:${gatePassId}|STUDENT:${studentName}|ROLL:${rollNo}|STATUS:APPROVED|AUTHORITY:${finalAuth}|DEPARTURE:${depDate} ${depTime}`);
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrPayload}`;
      qrImg.onerror = function() {
        // Fallback placeholder pattern if offline
        this.onerror = null;
        this.src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='white'/%3E%3Crect x='10' y='10' width='25' height='25' fill='black'/%3E%3Crect x='15' y='15' width='15' height='15' fill='white'/%3E%3Crect x='18' y='18' width='9' height='9' fill='black'/%3E%3Crect x='65' y='10' width='25' height='25' fill='black'/%3E%3Crect x='70' y='15' width='15' height='15' fill='white'/%3E%3Crect x='73' y='18' width='9' height='9' fill='black'/%3E%3Crect x='10' y='65' width='25' height='25' fill='black'/%3E%3Crect x='15' y='70' width='15' height='15' fill='white'/%3E%3Crect x='18' y='73' width='9' height='9' fill='black'/%3E%3Crect x='45' y='15' width='10' height='10' fill='black'/%3E%3Crect x='45' y='45' width='10' height='10' fill='black'/%3E%3Crect x='45' y='75' width='10' height='10' fill='black'/%3E%3Crect x='75' y='45' width='15' height='15' fill='black'/%3E%3Crect x='75' y='75' width='15' height='15' fill='black'/%3E%3C/svg%3E";
      };
    }

    // Maintain backward-compatibility elements
    setTxt('gpCardName', studentName);
    setTxt('gpCardRoll', rollNo);
    setTxt('gpCardDept', `${pass.dept || 'Engineering'} - Sec ${pass.yearSec || 'A'} (${pass.academicYear || 'III Year'})`);
    setTxt('gpCardAccom', accomStr);
    setTxt('gpCardDep', `${depDate} ${depTimeFormatted}`);
    setTxt('gpCardRet', retDisplay);
    setTxt('gpCardReason', pass.reason || '-');

    // Download Button Handlers
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
