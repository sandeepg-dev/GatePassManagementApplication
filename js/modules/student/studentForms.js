/**
 * Campus PassPro • Student Forms Submodule
 * Handles form validation, submissions, and inputs for Gate Pass, Leave, and OD
 */

(function () {
  'use strict';

  let currentODMode = 'date';

  /**
   * OD Format Switcher (Date-Based vs Time-Based legacy)
   */
  function setStudentODMode(mode) {
    currentODMode = mode;
    const dateBtn = document.getElementById('odTabBtn_date');
    const timeBtn = document.getElementById('odTabBtn_time');
    const dateSec = document.getElementById('stuOdDateSection');
    const timeSec = document.getElementById('stuOdTimeSection');

    if (mode === 'date') {
      if (dateBtn) dateBtn.className = 'flex-1 py-1.5 px-3 rounded-md text-xs font-bold bg-white text-slate-900 shadow-2xs transition';
      if (timeBtn) timeBtn.className = 'flex-1 py-1.5 px-3 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 transition';
      if (dateSec) dateSec.classList.remove('hidden');
      if (timeSec) timeSec.classList.add('hidden');
    } else {
      if (timeBtn) timeBtn.className = 'flex-1 py-1.5 px-3 rounded-md text-xs font-bold bg-white text-slate-900 shadow-2xs transition';
      if (dateBtn) dateBtn.className = 'flex-1 py-1.5 px-3 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 transition';
      if (dateSec) dateSec.classList.add('hidden');
      if (timeSec) timeSec.classList.remove('hidden');
    }
  }

  /**
   * Modern OD Duration Option Toggle (Single Date vs Date Range)
   */
  function toggleODFormatType(type) {
    const isSingle = type === 'single';
    const secSingle = document.getElementById('odSectionSingle');
    const secRange = document.getElementById('odSectionRange');
    if (secSingle) {
      if (isSingle) secSingle.classList.remove('hidden');
      else secSingle.classList.add('hidden');
    }
    if (secRange) {
      if (!isSingle) secRange.classList.remove('hidden');
      else secRange.classList.add('hidden');
    }
  }

  /**
   * Submit Gate Pass Request from Popup Modal
   * Student enters ONLY: Departure Date, Departure Time, Return Date, Return Time, Reason
   */
  async function submitPopupGatePassRequest() {
    const u = window.loggedUser;
    if (!u || !u.userId) {
      return showToast('Session invalid. Please re-authenticate.', 'error');
    }

    const depDate = document.getElementById('gpDepDate')?.value || '';
    const depTime = document.getElementById('gpDepTime')?.value || '';
    const retDate = document.getElementById('gpRetDate')?.value || '';
    const retTime = document.getElementById('gpRetTime')?.value || '';
    const reason = document.getElementById('gatePassReason')?.value.trim() || '';

    if (!depDate) return showToast('Please select Departure Date.', 'warning');
    if (!depTime) return showToast('Please select Departure Time.', 'warning');
    if (!retDate) return showToast('Please select Return Date.', 'warning');
    if (!retTime) return showToast('Please select Return Time.', 'warning');
    if (!reason) return showToast('Please enter your reason for gate pass.', 'warning');

    const isH = (/hoste?l|^h$/i.test(u.accommodation || '') && !/day\s*scholar/i.test(u.accommodation || ''));

    const payload = {
      rollNo: u.userId,
      studentName: u.name,
      fatherName: u.fatherName || u.parentName || '',
      parentPhone: u.parentContact || '',
      departureDate: depDate,
      departureTime: depTime,
      expectedReturnDate: retDate,
      expectedReturnTime: retTime,
      returnDate: retDate,
      returnTime: retTime,
      expectedReturnDateTime: `${retDate} ${retTime}`,
      reason,
      destination: 'Authorized Destination',
      placeOrEvent: 'Authorized Destination',
      accommodation: isH ? 'Hosteller' : 'Day Scholar',
      hostelBlock: u.hostelBlock || '',
      hostelRoom: u.hostelRoom || '',
      requestCategory: 'gate_pass'
    };

    try {
      const data = await Api.post('/api/apply-pass', payload);
      if (data.success) {
        showToast(data.message || 'Gate pass request submitted successfully! Formal letter generated.', 'success');
        if (typeof window.closeGatePassRequestModal === 'function') {
          window.closeGatePassRequestModal();
        }
        if (typeof window.loadStudentPersonalStatus === 'function') {
          window.loadStudentPersonalStatus();
        }
        if (typeof window.switchStudentPage === 'function') {
          window.switchStudentPage('requests', {
            title: 'Processing Gate Pass',
            subtitle: 'Requisition submitted. Opening My Requests...',
            duration: 1500
          });
        }
      } else {
        showToast(data.message || data.error || 'Failed to submit gate pass request.', 'error');
      }
    } catch (err) {
      showToast('Failed to submit gate pass request: ' + err.message, 'error');
    }
  }

  /**
   * Submit Leave Request from Popup Modal
   * Student enters ONLY: Leave From Date, Leave To Date, Reason
   */
  async function submitPopupLeaveRequest() {
    const u = window.loggedUser;
    if (!u || !u.userId) {
      return showToast('Session invalid. Please re-authenticate.', 'error');
    }

    const fromDate = document.getElementById('leaveFromDate')?.value || '';
    const toDate = document.getElementById('leaveToDate')?.value || '';
    const reason = document.getElementById('leaveReason')?.value.trim() || '';

    if (!fromDate) return showToast('Please select Leave From Date.', 'warning');
    if (!toDate) return showToast('Please select Leave To Date.', 'warning');
    if (!reason) return showToast('Please enter your reason for leave.', 'warning');

    const payload = {
      rollNo: u.userId,
      requestCategory: 'leave',
      leaveType: 'Personal Leave',
      fromDate,
      toDate,
      departureDate: fromDate,
      departureTime: '09:00',
      expectedReturnDate: toDate,
      expectedReturnTime: '18:00',
      expectedReturnDateTime: `${toDate} 18:00`,
      reason
    };

    try {
      const data = await Api.post('/api/apply-pass', payload);
      if (data.success) {
        showToast(data.message || 'Leave request submitted successfully!', 'success');
        if (typeof window.closeLeaveRequestModal === 'function') {
          window.closeLeaveRequestModal();
        }
        if (typeof window.loadStudentPersonalStatus === 'function') {
          window.loadStudentPersonalStatus();
        }
        if (typeof window.switchStudentPage === 'function') {
          window.switchStudentPage('requests', {
            title: 'Processing Leave Request',
            subtitle: 'Leave request recorded. Opening My Requests...',
            duration: 1500
          });
        }
      } else {
        showToast(data.message || data.error || 'Failed to submit leave request.', 'error');
      }
    } catch (err) {
      showToast('Failed to submit leave request: ' + err.message, 'error');
    }
  }

  /**
   * Submit OD Request from Popup Modal
   * Supports: Option 1 – Single Date / Time OR Option 2 – Date Range / Time Range, plus Reason
   */
  async function submitPopupODRequest() {
    const u = window.loggedUser;
    if (!u || !u.userId) {
      return showToast('Session invalid. Please re-authenticate.', 'error');
    }

    const isSingle = document.getElementById('odRadioSingle')?.checked ?? true;
    const reason = document.getElementById('odReason')?.value.trim() || '';

    if (!reason) {
      return showToast('Please enter your reason / purpose for the OD request.', 'warning');
    }

    let scheduleText = '';
    let fromDate = '';
    let toDate = '';
    let startTime = '';
    let endTime = '';

    const formatAcademicDate = window.formatAcademicDate || (d => d);
    const formatTime12 = window.formatTime12 || (t => t);

    if (isSingle) {
      const singleDate = document.getElementById('odSingleDate')?.value || '';
      startTime = document.getElementById('odSingleFromTime')?.value || '';
      endTime = document.getElementById('odSingleToTime')?.value || '';

      if (!singleDate) return showToast('Please select Date for OD.', 'warning');
      if (!startTime) return showToast('Please select From Time.', 'warning');
      if (!endTime) return showToast('Please select To Time.', 'warning');

      fromDate = singleDate;
      toDate = singleDate;
      scheduleText = `Date: ${formatAcademicDate(singleDate)} (${formatTime12(startTime)} - ${formatTime12(endTime)})`;
    } else {
      fromDate = document.getElementById('odRangeFromDate')?.value || '';
      toDate = document.getElementById('odRangeToDate')?.value || '';
      startTime = document.getElementById('odRangeFromTime')?.value || '';
      endTime = document.getElementById('odRangeToTime')?.value || '';

      if (!fromDate) return showToast('Please select From Date for OD.', 'warning');
      if (!toDate) return showToast('Please select To Date for OD.', 'warning');
      if (!startTime) return showToast('Please select From Time.', 'warning');
      if (!endTime) return showToast('Please select To Time.', 'warning');

      scheduleText = `From: ${formatAcademicDate(fromDate)} to ${formatAcademicDate(toDate)} (${formatTime12(startTime)} - ${formatTime12(endTime)})`;
    }

    const payload = {
      rollNo: u.userId,
      eventName: 'Academic On-Duty',
      place: 'Campus / Approved Location',
      venue: 'Campus / Approved Location',
      odDate: fromDate,
      specificDate: fromDate,
      date: fromDate,
      fromDate,
      toDate,
      startTime,
      endTime,
      schedule: scheduleText,
      dates: scheduleText,
      reason,
      purpose: reason,
      mode: isSingle ? 'time' : 'dates'
    };

    try {
      const data = await Api.post('/api/onduty/apply', payload);
      if (data.success) {
        showToast(data.message || 'OD request submitted successfully!', 'success');
        if (typeof window.closeODRequestModal === 'function') {
          window.closeODRequestModal();
        }
        if (typeof window.loadStudentPersonalStatus === 'function') {
          window.loadStudentPersonalStatus();
        }
        if (typeof window.switchStudentPage === 'function') {
          window.switchStudentPage('requests', {
            title: 'Processing On-Duty Request',
            subtitle: 'OD requisition recorded. Opening My Requests...',
            duration: 1500
          });
        }
      } else {
        showToast(data.message || data.error || 'Failed to submit OD request.', 'error');
      }
    } catch (err) {
      showToast('Failed to submit OD request: ' + err.message, 'error');
    }
  }

  /**
   * Submit Student Leave Request (Legacy Support)
   */
  async function submitStudentLeaveRequest() {
    const loggedUser = window.loggedUser;
    if (!loggedUser || !loggedUser.userId) {
      return showToast('Session invalid. Please re-authenticate.', 'error');
    }

    const fromDate = document.getElementById('leaveFromDate')?.value || '';
    const toDate = document.getElementById('leaveToDate')?.value || '';
    const reason = document.getElementById('leaveReason')?.value.trim() || '';

    if (!fromDate) return showToast('Please select From Date.', 'warning');
    if (!toDate) return showToast('Please select To Date.', 'warning');
    if (!reason) return showToast('Please enter your reason for leave.', 'warning');

    const payload = {
      rollNo: loggedUser.userId,
      requestCategory: 'leave',
      leaveType: 'Personal Leave',
      fromDate,
      toDate,
      departureDate: fromDate,
      departureTime: '09:00',
      expectedReturnDate: toDate,
      expectedReturnTime: '18:00',
      expectedReturnDateTime: `${toDate} 18:00`,
      reason
    };

    try {
      const data = await Api.post('/api/apply-pass', payload);
      if (data.success) {
        showToast(data.message || 'Leave request submitted successfully!', 'success');
        const fromEl = document.getElementById('leaveFromDate');
        const toEl = document.getElementById('leaveToDate');
        const reasonEl = document.getElementById('leaveReason');
        if (fromEl) fromEl.value = '';
        if (toEl) toEl.value = '';
        if (reasonEl) reasonEl.value = '';
        if (typeof window.loadStudentPersonalStatus === 'function') {
          window.loadStudentPersonalStatus();
        }
      } else {
        showToast(data.message || data.error || 'Failed to submit leave request.', 'error');
      }
    } catch (err) {
      showToast('Failed to submit leave request.', 'error');
    }
  }

  /**
   * Populate Gate Pass application form with student profile information
   */
  function populateGatePassFormWithStudentInfo() {
    const loggedUser = window.loggedUser;
    if (!loggedUser) return;
    const regEl = document.getElementById('gpRegNo');
    const nameEl = document.getElementById('gpStudentName');
    const fatherEl = document.getElementById('gpFatherName');
    const phoneEl = document.getElementById('gpParentPhone');
    const hostelCard = document.getElementById('hostelStudentInfoCard');
    const hostelRoomBlock = document.getElementById('gpHostelRoomBlock');

    if (regEl && !regEl.value) regEl.value = loggedUser.userId || '';
    if (nameEl && !nameEl.value) nameEl.value = loggedUser.name || '';
    if (fatherEl && !fatherEl.value) fatherEl.value = loggedUser.fatherName || loggedUser.parentName || '';
    if (phoneEl && !phoneEl.value) phoneEl.value = loggedUser.parentContact || '';

    const isH = (/hoste?l|^h$/i.test(loggedUser.accommodation || '') && !/day/i.test(loggedUser.accommodation || ''));
    if (hostelCard) {
      if (isH) {
        hostelCard.classList.remove('hidden');
        if (hostelRoomBlock && !hostelRoomBlock.value && (loggedUser.hostelBlock || loggedUser.hostelRoom)) {
          hostelRoomBlock.value = `Block ${loggedUser.hostelBlock || 'A'} - Room ${loggedUser.hostelRoom || '-'}`;
        }
      } else {
        hostelCard.classList.add('hidden');
      }
    }
  }

  /**
   * Submit Student Gate Pass Request (Legacy Form)
   */
  async function submitStudentGatePass() {
    const loggedUser = window.loggedUser;
    if (!loggedUser || !loggedUser.userId) {
      return showToast('Session invalid. Please re-authenticate.', 'error');
    }

    const regNo = document.getElementById('gpRegNo')?.value.trim() || loggedUser.userId;
    const studentName = document.getElementById('gpStudentName')?.value.trim() || loggedUser.name;
    const fatherName = document.getElementById('gpFatherName')?.value.trim() || '';
    const parentPhone = document.getElementById('gpParentPhone')?.value.trim() || '';
    const depDate = document.getElementById('gpDepDate')?.value || '';
    const depTime = document.getElementById('gpDepTime')?.value || '';
    const retDate = document.getElementById('gpRetDate')?.value || '';
    const retTime = document.getElementById('gpRetTime')?.value || '';
    const reason = document.getElementById('gatePassReason')?.value.trim() || '';
    const destination = document.getElementById('gpDestination')?.value.trim() || '';
    const hostelRoomBlock = document.getElementById('gpHostelRoomBlock')?.value.trim() || '';
    const hostelNotes = document.getElementById('gpHostelNotes')?.value.trim() || '';

    if (!regNo) return showToast('Please enter your Registration Number.', 'warning');
    if (!studentName) return showToast('Please enter your Student Name.', 'warning');
    if (!fatherName) return showToast("Please enter Father's Name.", 'warning');
    if (!parentPhone) return showToast("Please enter Parent's Phone Number.", 'warning');
    if (!depDate) return showToast('Please select Departure Date.', 'warning');
    if (!depTime) return showToast('Please select Departure Time.', 'warning');
    if (!retDate) return showToast('Please select Return Date.', 'warning');
    if (!retTime) return showToast('Please select Return Time.', 'warning');
    if (!reason) return showToast('Please state your Reason / Purpose for gate pass.', 'warning');

    const isH = (/hoste?l|^h$/i.test(loggedUser.accommodation || '') && !/day/i.test(loggedUser.accommodation || ''));

    const payload = {
      rollNo: regNo,
      studentName,
      fatherName,
      parentPhone,
      departureDate: depDate,
      departureTime: depTime,
      expectedReturnDate: retDate,
      expectedReturnTime: retTime,
      returnDate: retDate,
      returnTime: retTime,
      expectedReturnDateTime: `${retDate} ${retTime}`,
      reason,
      destination,
      placeOrEvent: destination,
      accommodation: isH ? 'Hosteller' : 'Day Scholar',
      hostelBlock: hostelRoomBlock,
      hostelRoom: hostelRoomBlock,
      hostelDepartureInfo: hostelNotes,
      hostelReturnInfo: hostelNotes,
      requestCategory: 'gate_pass'
    };

    try {
      const data = await Api.post('/api/apply-pass', payload);
      if (data.success) {
        showToast(data.message || 'Gate pass request submitted successfully! Formal letter generated.', 'success');
        const r = document.getElementById('gatePassReason');
        const dD = document.getElementById('gpDepDate');
        const dT = document.getElementById('gpDepTime');
        const rD = document.getElementById('gpRetDate');
        const rT = document.getElementById('gpRetTime');
        const dest = document.getElementById('gpDestination');
        const hNotes = document.getElementById('gpHostelNotes');
        if (r) r.value = '';
        if (dD) dD.value = '';
        if (dT) dT.value = '';
        if (rD) rD.value = '';
        if (rT) rT.value = '';
        if (dest) dest.value = '';
        if (hNotes) hNotes.value = '';
        if (typeof window.loadStudentPersonalStatus === 'function') {
          window.loadStudentPersonalStatus();
        }
      } else {
        showToast(data.message || data.error || 'Failed to submit gate pass request.', 'error');
      }
    } catch (err) {
      showToast('Failed to submit gate pass request: ' + err.message, 'error');
    }
  }

  /**
   * Submit Student OD Form (Legacy Form)
   */
  async function submitStudentODForm() {
    const loggedUser = window.loggedUser;
    if (!loggedUser || !loggedUser.userId) {
      return showToast('Session invalid. Please re-authenticate.', 'error');
    }

    const reason = document.getElementById('stuOdReason')?.value.trim() || '';
    if (!reason) {
      return showToast('Please specify the academic purpose / event details.', 'warning');
    }

    let dates = '';
    let fromDate = '';
    let toDate = '';
    const formatAcademicDate = window.formatAcademicDate || (d => d);
    const formatTime12 = window.formatTime12 || (t => t);

    if (currentODMode === 'date') {
      fromDate = document.getElementById('stuOdFromDate')?.value || '';
      toDate = document.getElementById('stuOdToDate')?.value || '';

      if (!fromDate) return showToast('Please select From Date for OD.', 'warning');
      if (!toDate) return showToast('Please select To Date for OD.', 'warning');

      dates = `${formatAcademicDate(fromDate)} to ${formatAcademicDate(toDate)}`;
    } else {
      const specificDate = document.getElementById('stuOdSpecificDate')?.value || '';
      const fromTime = document.getElementById('stuOdFromTime')?.value || '';
      const toTime = document.getElementById('stuOdToTime')?.value || '';

      if (!specificDate) return showToast('Please select Date of On-Duty.', 'warning');
      if (!fromTime) return showToast('Please select From Time for OD.', 'warning');
      if (!toTime) return showToast('Please select To Time for OD.', 'warning');

      fromDate = specificDate;
      toDate = specificDate;
      dates = `${formatAcademicDate(specificDate)} (${formatTime12(fromTime)} to ${formatTime12(toTime)})`;
    }

    const payload = {
      rollNo: loggedUser.userId,
      reason,
      dates,
      fromDate,
      toDate,
      schedule: dates
    };

    try {
      const data = await Api.post('/api/onduty/apply', payload);
      if (data.success) {
        showToast(data.message || 'On-Duty request submitted successfully!', 'success');
        const r = document.getElementById('stuOdReason');
        const fD = document.getElementById('stuOdFromDate');
        const tD = document.getElementById('stuOdToDate');
        const sD = document.getElementById('stuOdSpecificDate');
        const fT = document.getElementById('stuOdFromTime');
        const tT = document.getElementById('stuOdToTime');
        if (r) r.value = '';
        if (fD) fD.value = '';
        if (tD) tD.value = '';
        if (sD) sD.value = '';
        if (fT) fT.value = '';
        if (tT) tT.value = '';
        if (typeof window.loadStudentPersonalStatus === 'function') {
          window.loadStudentPersonalStatus();
        }
      } else {
        showToast(data.message || data.error || 'Failed to submit OD request.', 'error');
      }
    } catch (err) {
      showToast('Failed to submit OD request.', 'error');
    }
  }

  // Export to global scope
  window.setStudentODMode = setStudentODMode;
  window.toggleODFormatType = toggleODFormatType;
  window.submitPopupGatePassRequest = submitPopupGatePassRequest;
  window.submitPopupLeaveRequest = submitPopupLeaveRequest;
  window.submitPopupODRequest = submitPopupODRequest;
  window.submitStudentLeaveRequest = submitStudentLeaveRequest;
  window.populateGatePassFormWithStudentInfo = populateGatePassFormWithStudentInfo;
  window.submitStudentGatePass = submitStudentGatePass;
  window.submitStudentODForm = submitStudentODForm;

})();
