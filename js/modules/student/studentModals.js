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

    // Action Buttons - Strict separation between Gate Pass and Leave Letter
    const isLeave = (pass.requestCategory === 'leave' || pass.type === 'leave' || pass.isLeave);
    const isOD = (pass.requestCategory === 'onduty' || pass.isOD || pass.type === 'onduty');

    const viewLetterBtn = document.getElementById('stuModalViewLetterBtn');
    const dlLetterBtn = document.getElementById('stuModalDownloadLetterBtn');
    const passCardBtn = document.getElementById('stuModalPassCardBtn');

    if (isLeave) {
      if (viewLetterBtn) {
        viewLetterBtn.classList.remove('hidden');
        viewLetterBtn.innerHTML = `
          <svg class="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          <span>View Leave Letter</span>
        `;
        viewLetterBtn.onclick = () => {
          if (typeof window.openLeaveLetterModal === 'function') {
            window.openLeaveLetterModal(pass);
          }
        };
      }
      if (dlLetterBtn) {
        dlLetterBtn.classList.remove('hidden');
        dlLetterBtn.innerHTML = `
          <svg class="w-3.5 h-3.5 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          <span>Download Leave Letter (PDF)</span>
        `;
        dlLetterBtn.onclick = () => {
          if (typeof window.downloadLeaveLetterPDF === 'function') {
            window.downloadLeaveLetterPDF(pass);
          }
        };
      }
      if (passCardBtn) {
        passCardBtn.classList.add('hidden');
      }
    } else if (isOD) {
      if (viewLetterBtn) {
        viewLetterBtn.classList.remove('hidden');
        viewLetterBtn.innerHTML = `<span>View OD Letter</span>`;
        viewLetterBtn.onclick = () => {
          if (typeof window.viewOnDutyLetter === 'function') window.viewOnDutyLetter(pass);
        };
      }
      if (dlLetterBtn) {
        dlLetterBtn.classList.remove('hidden');
        dlLetterBtn.innerHTML = `<span>Download OD (PDF)</span>`;
        dlLetterBtn.onclick = () => {
          if (typeof window.downloadOnDutyLetterPDF === 'function') window.downloadOnDutyLetterPDF(pass);
        };
      }
      if (passCardBtn) passCardBtn.classList.add('hidden');
    } else {
      // Gate Pass: NEVER show Leave Letter buttons
      if (viewLetterBtn) viewLetterBtn.classList.add('hidden');
      if (dlLetterBtn) dlLetterBtn.classList.add('hidden');
      if (passCardBtn) {
        if (statusInfo.isApproved) {
          passCardBtn.classList.remove('hidden');
          passCardBtn.onclick = () => openGatePassCardModal(pass);
        } else {
          passCardBtn.classList.add('hidden');
        }
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
  /**
  * Open Official Digital Gate Pass Document Modal (When Approved - Gate Pass Ready)
  */
  async function openGatePassCardModal(pass) {
    if (!pass) return;

    const modal = document.getElementById('gatePassCardModal');
    if (!modal) return;

    // Fetch the latest fresh pass record directly from the database API to guarantee all approval records
    // are current and dynamic from MongoDB rather than stale or mock values.
    const passId = pass._id || pass.id;
    const passRoll = pass.rollNo || pass.registrationNumber;
    if (passId || passRoll) {
      try {
        const queryParam = passId ? `_id=${encodeURIComponent(passId)}` : `rollNo=${encodeURIComponent(passRoll)}`;
        const res = await fetch(`/api/passes?${queryParam}`);
        if (res.ok) {
          const json = await res.json();
          const records = Array.isArray(json) ? json : (json.data || json.passes || []);
          const fresh = (passId && records.find(p => String(p._id) === String(passId))) || records[0];
          if (fresh) {
            pass = { ...pass, ...fresh };
          }
        }
      } catch (e) {
        console.warn('Could not refresh pass from API, using current record:', e);
      }
    }

    window.currentActivePass = pass;

    const isHosteller = (/hoste?l|^h$/i.test(pass.accommodation || '') && !/day\s*scholar/i.test(pass.accommodation || ''));
    
    // Gate Pass ID
    const yr = new Date(pass.createdAt || Date.now()).getFullYear();
    const fallbackId = `GRT-GP-${yr}-${String(pass._id || '').slice(-4).toUpperCase() || '1048'}`;
    const gatePassId = pass.gatePassId || fallbackId;
    pass.gatePassId = gatePassId;

    // Movement details
    const studentName = String(pass.studentName || pass.name || 'Student').trim();
    const rollNo = String(pass.rollNo || pass.registrationNumber || '-').trim();
    const deptStr = pass.dept ? `Dept of ${pass.dept}` : 'Engineering';
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

    // Dynamic Approver Names from Database Records (Principal and Warden preserved)
    const counselorName = String(pass.counselorApproval?.counselorName || pass.counselorName || 'Mrs shanmugavalli').trim();
    const advisorName = String(pass.advisorApproval?.advisorName || pass.advisorName || 'shanmugavalli').trim();
    const hodName = String(pass.hodApproval?.hodName || pass.hodName || 'Dr kamal').trim();
    const principalName = String(pass.principalApproval?.principalName || 'Dr Arumugam').trim();
    const wardenName = String(pass.wardenApproval?.wardenName || (pass.gender === 'Female' ? 'Mrs Kanya' : 'Mr Arul Prasad')).trim();

    // Final Approving Authority string
    let finalAuth = pass.finalApprovingAuthority;
    if (!finalAuth) {
      if (isHosteller) {
        finalAuth = `${wardenName} (Hostel Warden)`;
      } else {
        finalAuth = `Principal (${principalName})`;
      }
      pass.finalApprovingAuthority = finalAuth;
    }

    const approvalTime = pass.finalApprovalTime || pass.approvalTime || pass.principalApproval?.time || pass.wardenApproval?.time || pass.appliedTime || '-';
    const verifyCode = `GRT-VERIFY-${rollNo}-${String(gatePassId).replace(/[^A-Za-z0-9]/g, '')}`;

    function cleanDate(str) {
      if (!str || str === '-') return '-';
      const s = String(str).trim();
      if (s.includes(',')) return s.split(',')[0].trim();
      if (s.includes(' ')) return s.split(' ')[0].trim();
      return s;
    }

    const cDate = cleanDate(pass.counselorApproval?.time || pass.parentCallTime);
    const aDate = cleanDate(pass.advisorApproval?.time);
    const hDate = cleanDate(pass.hodApproval?.time);
    const pDate = cleanDate(pass.principalApproval?.time || pass.approvalTime);
    const wDate = cleanDate(pass.wardenApproval?.time);

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

    // Multi-Tier Clearances
    setTxt('gpDocCounselorName', counselorName);
    setTxt('gpDocCounselorTime', cDate);
    setTxt('gpDocAdvisorName', advisorName);
    setTxt('gpDocAdvisorTime', aDate);
    setTxt('gpDocHodName', hodName);
    setTxt('gpDocHodTime', hDate);
    setTxt('gpDocPrincipalName', principalName);
    setTxt('gpDocPrincipalTime', pDate);
    setTxt('gpDocWardenName', wardenName);
    setTxt('gpDocWardenTime', wDate);

    // Show/Hide Warden Tier based on Student Category
    const wardenBox = document.getElementById('gpDocWardenBox');
    const clearanceGrid = document.getElementById('gpDocClearanceGrid');
    if (wardenBox && clearanceGrid) {
      if (isHosteller) {
        wardenBox.classList.remove('hidden');
        clearanceGrid.className = 'grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs';
      } else {
        wardenBox.classList.add('hidden');
        clearanceGrid.className = 'grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs';
      }
    }

    const reasonEl = document.getElementById('gpDocReason');
    if (reasonEl) {
      const dest = pass.destination || pass.placeOrEvent ? ` | Destination: ${pass.destination || pass.placeOrEvent}` : '';
      reasonEl.innerText = `${pass.reason || '-'}${dest}`;
    }

    const exitTimeEl = document.getElementById('gpDocGateExitTime');
    if (exitTimeEl) {
      exitTimeEl.innerText = (pass.exitTime && pass.exitTime !== '-') ? `Actual Departure Time: ${pass.exitTime}` : 'Actual Departure Time: ___________________________';
    }

    const returnTimeEl = document.getElementById('gpDocGateReturnTime');
    if (returnTimeEl) {
      returnTimeEl.innerText = (pass.returnTime && pass.returnTime !== '-') ? `Actual Return Time: ${pass.returnTime}` : 'Actual Return Time: ______________________________';
    }

    const accomBadge = document.getElementById('gpDocAccomBadge');
    if (accomBadge) {
      accomBadge.innerText = isHosteller ? 'HOSTELLER' : 'DAY SCHOLAR';
      accomBadge.className = 'px-2.5 py-1 bg-white border border-black text-black rounded-xs font-mono text-xs font-bold';
    }

    const approverRoleLabel = document.getElementById('gpDocApproverRoleLabel');
    if (approverRoleLabel) {
      approverRoleLabel.innerText = isHosteller ? 'Hostel Warden Final Approval' : 'Principal Final Approval';
    }

    // Dynamic QR Code Generation
    const qrImg = document.getElementById('gpDocQrImage');
    if (qrImg) {
      const qrPayload = encodeURIComponent(`GRT_INSTITUTIONAL_GATE_PASS|ID:${gatePassId}|STUDENT:${studentName}|ROLL:${rollNo}|STATUS:APPROVED|AUTHORITY:${finalAuth}|DEPARTURE:${depDate} ${depTime}`);
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrPayload}`;
      qrImg.onerror = function() {
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

  function openLeaveLetterModal(pass) {
    if (!pass) return;
    const modal = document.getElementById('leaveLetterModal');
    if (!modal) return;

    window.currentActiveLeave = pass;

    const u = window.loggedUser;
    const studentName = String(pass.studentName || pass.name || u?.name || 'Student').trim();
    const rollNo = String(pass.rollNo || pass.registrationNumber || u?.userId || '-').trim();
    const deptUpper = String(pass.dept || u?.dept || 'COMPUTER SCIENCE AND ENGINEERING').toUpperCase();
    const academicYear = pass.academicYear || u?.academicYear || 'III Year';
    const yearSec = pass.yearSec || u?.yearSec || 'A';
    const fatherName = pass.fatherName || pass.parentName || u?.fatherName || u?.parentName || '-';
    const parentContact = pass.parentContact || pass.parentPhone || pass.contactNumber || u?.parentContact || '-';
    const isHosteller = (/hoste?l|^h$/i.test(pass.accommodation || u?.accommodation || '') && !/day/i.test(pass.accommodation || u?.accommodation || ''));
    const accomStr = isHosteller ? 'Hosteller (Resident Student)' : 'Day Scholar';

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val || '-';
    };

    const appliedDate = (typeof formatLetterDate === 'function') 
      ? formatLetterDate(pass.appliedTime || pass.createdAt) 
      : (String(pass.appliedTime || new Date().toLocaleDateString('en-GB')).split(' ')[0]);

    setTxt('leaveLetterDocDept', `DEPARTMENT OF ${deptUpper}`);
    setTxt('leaveLetterDocRef', `GRTIET/${deptUpper.slice(0, 4)}/LEAVE/2026/${rollNo}`);
    setTxt('leaveLetterDocDate', appliedDate);
    setTxt('leaveLetterDocStudentName', studentName);
    setTxt('leaveLetterDocRollNo', rollNo);
    setTxt('leaveLetterDocClassInfo', `${academicYear}, Department of ${pass.dept || u?.dept || 'Engineering'} (Section '${yearSec}')`);
    setTxt('leaveLetterDocAccom', accomStr);
    setTxt('leaveLetterDocParentContact', parentContact);
    setTxt('leaveLetterDocToDept', `Department of ${deptUpper},`);

    // Dynamic Content based on reason
    const dyn = (typeof window.generateDynamicLeaveContent === 'function') 
      ? window.generateDynamicLeaveContent(pass) 
      : {
          subject: 'Application for Leave of Absence - Regarding.',
          bodyPara1: `I am writing this application to respectfully request permission to take leave of absence from college from ${pass.fromDate || pass.departureDate || '-'} to ${pass.toDate || pass.expectedReturnDate || '-'} due to: "${pass.reason || '-'}"`,
          bodyPara2: 'I have informed my parents regarding this leave and will ensure that all missed coursework is completed promptly.',
          fromDate: pass.fromDate || pass.departureDate || '-',
          toDate: pass.toDate || pass.expectedReturnDate || '-',
          daysText: '',
          reason: pass.reason || '-'
        };

    setTxt('leaveLetterDocSubject', `Subject: ${dyn.subject}`);
    setTxt('leaveLetterDocBody1', dyn.bodyPara1);
    setTxt('leaveLetterDocFromDate', dyn.fromDate);
    setTxt('leaveLetterDocToDate', dyn.toDate);
    setTxt('leaveLetterDocTotalDays', dyn.daysText || ' (1 day)');
    setTxt('leaveLetterDocReason', `"${dyn.reason}"`);
    setTxt('leaveLetterDocBody2', dyn.bodyPara2);
    setTxt('leaveLetterDocSignName', `(${studentName})`);
    setTxt('leaveLetterDocSignRoll', rollNo);
    setTxt('leaveLetterDocSignDept', `Department of ${deptUpper.slice(0, 16)} (${yearSec})`);

    // Clearances
    const cApp = pass.counselorApproval?.approved || !!pass.parentCallTime;
    const aApp = pass.advisorApproval?.approved;
    const hApp = pass.hodApproval?.approved || pass.status === 'Approved' || pass.status === 'Completed';

    const counselorName = pass.counselorApproval?.counselorName || pass.counselorName || 'Mrs shanmugavalli';
    const advisorName = pass.advisorApproval?.advisorName || pass.advisorName || 'shanmugavalli';
    const hodName = pass.hodApproval?.hodName || pass.hodName || 'Dr kamal';

    const counselorStatus = cApp ? 'Verified (Parent Call)' : (pass.status === 'Rejected' && /counselor/i.test(pass.rejection?.role || '') ? 'REJECTED' : 'Pending');
    const advisorStatus = aApp ? 'Endorsed' : (pass.status === 'Rejected' && /advisor/i.test(pass.rejection?.role || '') ? 'REJECTED' : (cApp ? 'Pending' : 'Queued'));
    const hodStatus = hApp ? 'Sanctioned & Approved' : (pass.status === 'Rejected' && /hod/i.test(pass.rejection?.role || '') ? 'REJECTED' : (aApp ? 'Pending' : 'Queued'));

    const cDate = pass.counselorApproval?.time ? ((typeof formatLetterDate === 'function') ? formatLetterDate(pass.counselorApproval.time) : pass.counselorApproval.time) : '-';
    const aDate = pass.advisorApproval?.time ? ((typeof formatLetterDate === 'function') ? formatLetterDate(pass.advisorApproval.time) : pass.advisorApproval.time) : '-';
    const hDate = pass.hodApproval?.time ? ((typeof formatLetterDate === 'function') ? formatLetterDate(pass.hodApproval.time) : pass.hodApproval.time) : '-';

    setTxt('leaveLetterClearanceStudent', 'Submitted');
    setTxt('leaveLetterClearanceStudentDate', appliedDate);
    setTxt('leaveLetterClearanceCounselor', `${counselorName} • ${cStatus}`);
    setTxt('leaveLetterClearanceCounselorDate', cDate !== '-' ? `Date: ${cDate}` : 'In Review');
    setTxt('leaveLetterClearanceAdvisor', `${advisorName} • ${aStatus}`);
    setTxt('leaveLetterClearanceAdvisorDate', aDate !== '-' ? `Date: ${aDate}` : 'Queued');
    setTxt('leaveLetterClearanceHOD', `${hodName} • ${hodStatus}`);
    setTxt('leaveLetterClearanceHODDate', hDate !== '-' ? `Date: ${hDate}` : 'Queued');

    // Buttons
    const topDlBtn = document.getElementById('leaveLetterModalTopDlBtn');
    if (topDlBtn) {
      topDlBtn.onclick = () => {
        if (typeof window.downloadLeaveLetterPDF === 'function') {
          window.downloadLeaveLetterPDF(pass);
        }
      };
    }
    const btmDlBtn = document.getElementById('leaveLetterModalBottomDlBtn');
    if (btmDlBtn) {
      btmDlBtn.onclick = () => {
        if (typeof window.downloadLeaveLetterPDF === 'function') {
          window.downloadLeaveLetterPDF(pass);
        }
      };
    }

    modal.classList.remove('hidden');
  }

  function closeLeaveLetterModal() {
    const modal = document.getElementById('leaveLetterModal');
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
  window.openLeaveLetterModal = openLeaveLetterModal;
  window.closeLeaveLetterModal = closeLeaveLetterModal;

})();
