/**
 * Counselor Students Daily Attendance Excel (.xlsx) Generation Service
 * Produces institutional Excel report matching the official GRTIET reference sheet.
 * Fully driven by live MongoDB student mentees and student Leave Requests.
 */

(function () {
  'use strict';

  /**
   * Helper to normalize various date formats to standard YYYY-MM-DD
   */
  function normalizeDateYMD(val) {
    if (!val) return null;
    const s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    } catch (_) {}
    return null;
  }

  /**
   * Builds the official Excel workbook matching the visual reference sheet
   * @param {Array} students - Counselor's assigned mentees
   * @param {Array} leavePasses - Student Leave Requests
   * @param {Object} config - Configurable Batch, Academic Year, Semester, Period, etc.
   * @returns {XLSX.Workbook}
   */
  function buildCounselorAttendanceWorkbook(students, leavePasses, config = {}) {
    const XLSXLib = (typeof XLSX !== 'undefined' ? XLSX : (typeof window !== 'undefined' ? window.XLSX : null));
    if (!XLSXLib) {
      throw new Error('XLSX library is not loaded. Please ensure xlsx.full.min.js is present.');
    }

    const batch = (config.batch || '2023-2027').trim();
    const acadYear = (config.academicYear || 'Academic Year 2024-2027 ODD SEMESTER').trim();
    const yearSem = (config.yearSem || '2 / III').trim();
    const period = (config.period || 'AUG 2024 - DEC 2024').trim();
    const totalDays = parseInt(config.totalDays, 10) || 40; // Reference sheet uses 40 working day columns
    const targetYear = parseInt(config.targetYear, 10) || 2026;
    const targetMonth = parseInt(config.targetMonth, 10) || 9; // September (1-indexed)

    // Pre-calculate date string for each working day column
    const dayDates = [];
    for (let d = 1; d <= totalDays; d++) {
      let m = targetMonth;
      let y = targetYear;
      let dayInMonth = d;
      if (dayInMonth > 30) {
        m = targetMonth + 1;
        dayInMonth = d - 30;
        if (m > 12) {
          m = 1;
          y++;
        }
      }
      dayDates.push(`${y}-${String(m).padStart(2, '0')}-${String(dayInMonth).padStart(2, '0')}`);
    }

    // Row 0: College Header (matching screenshot)
    const r0 = ['GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY, Tiruttani'];
    // Row 1: Document Title
    const r1 = ['STUDENTS DAILY ATTENDANCE SHEET'];
    // Row 2: Metadata (Batch, Academic Year, Year/Sem)
    const r2 = [
      'BATCH: ' + batch, '', '', '', '', '',
      acadYear, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'YEAR / SEM: ' + yearSem
    ];

    // Row 3-6: Multi-tier Table Column Headers (Col D is "w d", Col E.. are days 1..totalDays)
    const r3 = ['S. NO.', 'REG No.', 'STUDENT NAME', 'w d'];
    const r4 = ['', '', '', 'd'];
    const r5 = ['', '', '', 'm'];
    const r6 = ['', '', '', period];

    for (let i = 1; i <= totalDays; i++) {
      r3.push(i);
      r4.push(i);
      r5.push('');
      r6.push('');
    }

    const aoa = [r0, r1, r2, r3, r4, r5, r6];

    // Index leave requests strictly by student roll number
    const leavesByRoll = {};
    (leavePasses || []).forEach(p => {
      const r = String(p.rollNo || '').trim().toUpperCase();
      if (!leavesByRoll[r]) leavesByRoll[r] = [];
      const from = normalizeDateYMD(p.fromDate || p.leaveDate || p.departureDate);
      const to = normalizeDateYMD(p.toDate || p.expectedReturnDate || p.fromDate || p.leaveDate);
      if (from || to) {
        leavesByRoll[r].push({
          from: from || to,
          to: to || from,
          status: p.status || 'Approved'
        });
      }
    });

    // Student Data Rows
    students.forEach((s, idx) => {
      const roll = String(s.rollNo || '').trim().toUpperCase();
      const row = [idx + 1, s.rollNo, s.name, ''];
      const studentLeaves = leavesByRoll[roll] || [];

      for (let i = 0; i < totalDays; i++) {
        const targetYMD = dayDates[i];
        let isAbsent = false;

        // Check if student has submitted or approved leave covering this date
        for (const lv of studentLeaves) {
          if (targetYMD >= lv.from && targetYMD <= lv.to) {
            isAbsent = true;
            break;
          }
        }

        // Attendance Logic: A = Absent, P = Present
        row.push(isAbsent ? 'A' : 'P');
      }
      aoa.push(row);
    });

    const wb = XLSXLib.utils.book_new();
    const ws = XLSXLib.utils.aoa_to_sheet(aoa);

    // Column Widths: S.No (6), Reg No (16), Student Name (26), 'w d' (5), Day cols (3.8 each)
    const lastColIdx = 3 + totalDays;
    const cols = [{ wch: 6 }, { wch: 16 }, { wch: 26 }, { wch: 5 }];
    for (let i = 0; i < totalDays; i++) {
      cols.push({ wch: 3.8 });
    }
    ws['!cols'] = cols;

    // Institutional Cell Merges matching visual reference
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } }, // Header: GRT Institute
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } }, // Title: Students Daily Attendance Sheet
      { s: { r: 3, c: 0 }, e: { r: 5, c: 0 } },          // S. NO. (rows 3 to 5)
      { s: { r: 3, c: 1 }, e: { r: 5, c: 1 } },          // REG No. (rows 3 to 5)
      { s: { r: 3, c: 2 }, e: { r: 5, c: 2 } },          // STUDENT NAME (rows 3 to 5)
      { s: { r: 6, c: 3 }, e: { r: 6, c: lastColIdx } }  // Period banner across date columns
    ];

    // Primary Attendance Sheet Tab
    XLSXLib.utils.book_append_sheet(wb, ws, 'daily attendance-1');

    // Secondary Sheet Tab: STUDENT INFORMATION (Counselor Mentee Master Roster)
    const infoAoa = [
      ['STUDENT INFORMATION - COUNSELOR MENTEE ROSTER'],
      ['BATCH: ' + batch, 'ACADEMIC YEAR: ' + acadYear, 'YEAR / SEM: ' + yearSem],
      ['S.NO', 'REG NO', 'STUDENT NAME', 'DEPARTMENT', 'SECTION', 'ACCOMMODATION', 'PARENT NAME', 'PARENT CONTACT']
    ];
    students.forEach((s, idx) => {
      infoAoa.push([
        idx + 1,
        s.rollNo,
        s.name,
        s.dept || 'CSE',
        s.yearSec || 'A',
        s.accommodation || 'Day Scholar',
        s.parentName || s.fatherName || '-',
        s.parentContact || s.mobile || '-'
      ]);
    });
    const wsInfo = XLSXLib.utils.aoa_to_sheet(infoAoa);
    wsInfo['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 26 }, { wch: 14 }, { wch: 10 }, { wch: 15 }, { wch: 22 }, { wch: 16 }];
    XLSXLib.utils.book_append_sheet(wb, wsInfo, 'STUDENT INFORMATION');

    return wb;
  }

  /**
   * Main Trigger: Generates and downloads the Counselor Attendance Excel (.xlsx) file
   */
  async function downloadCounselorAttendanceExcel(customConfig = {}) {
    const user = window.loggedUser;
    if (!user) {
      if (typeof showToast === 'function') showToast('Please sign in to export attendance reports.', 'error');
      return;
    }

    // Read form values if present in the DOM
    const batchInput = document.getElementById('attReportBatch');
    const acadYearInput = document.getElementById('attReportAcadYear');
    const yearSemInput = document.getElementById('attReportYearSem');
    const periodInput = document.getElementById('attReportPeriod');
    const daysSelect = document.getElementById('attReportDaysCount');
    const monthSelect = document.getElementById('attReportMonth');
    const yearSelect = document.getElementById('attReportYear');

    const batch = (customConfig.batch || (batchInput ? batchInput.value : '') || '2023-2027').trim();
    const academicYear = (customConfig.academicYear || (acadYearInput ? acadYearInput.value : '') || 'Academic Year 2024-2027 ODD SEMESTER').trim();
    const yearSem = (customConfig.yearSem || (yearSemInput ? yearSemInput.value : '') || '2 / III').trim();
    const period = (customConfig.period || (periodInput ? periodInput.value : '') || 'AUG 2024 - DEC 2024').trim();
    const totalDays = parseInt(customConfig.totalDays || (daysSelect ? daysSelect.value : 40), 10) || 40;
    const targetMonth = parseInt(customConfig.targetMonth || (monthSelect ? monthSelect.value : 9), 10) || 9;
    const targetYear = parseInt(customConfig.targetYear || (yearSelect ? yearSelect.value : 2026), 10) || 2026;

    if (typeof showToast === 'function') {
      showToast('Generating Counselor Attendance Sheet (.xlsx)...', 'info');
    }

    try {
      // 1. Gather Counselor's assigned mentees
      let mentees = [];
      const start = String(user.startRoll || '').trim().toUpperCase();
      const end = String(user.endRoll || '').trim().toUpperCase();
      const cName = String(user.name || '').trim().toLowerCase();

      // Check if students are already loaded in authState
      if (window.authState && Array.isArray(window.authState.students) && window.authState.students.length > 0) {
        mentees = window.authState.students.filter(st => {
          const r = String(st.rollNo || '').trim().toUpperCase();
          const inRange = (start && end) ? (r >= start && r <= end) : false;
          const nameMatch = cName && String(st.counselorName || '').trim().toLowerCase() === cName;
          return inRange || nameMatch || (!start && !cName);
        });
      }

      // If not loaded or empty, fetch from backend API
      if (!mentees || mentees.length === 0) {
        let q = '?limit=1000&all=true';
        if (cName) q += `&search=${encodeURIComponent(user.name || '')}`;
        const res = await Api.get(`/api/admin/students${q}`).catch(() => []);
        const allStudents = Array.isArray(res) ? res : (res?.students || []);
        mentees = allStudents.filter(st => {
          const r = String(st.rollNo || '').trim().toUpperCase();
          const inRange = (start && end) ? (r >= start && r <= end) : false;
          const nameMatch = cName && String(st.counselorName || '').trim().toLowerCase() === cName;
          return inRange || nameMatch || (!start && !cName);
        });
      }

      // Sort mentees by Roll Number ascending
      mentees.sort((a, b) => String(a.rollNo || '').localeCompare(String(b.rollNo || '')));

      if (mentees.length === 0) {
        if (typeof showToast === 'function') {
          showToast('No assigned mentees found for this counselor account.', 'warning');
        }
        return;
      }

      // 2. Gather student Leave Requests
      let leavePasses = [];
      if (window.authState && Array.isArray(window.authState.passes)) {
        leavePasses = window.authState.passes.filter(p =>
          p.requestCategory === 'leave' || p.isLeave === true || p.type === 'leave' || (!p.departureDate && (p.fromDate || p.leaveDate))
        );
      }

      // Also query live backend leave passes for accuracy
      try {
        const passRes = await Api.get(`/api/passes?status=ALL&limit=1000`).catch(() => []);
        const fetchedPasses = Array.isArray(passRes) ? passRes : (passRes?.passes || []);
        const menteeRollSet = new Set(mentees.map(m => String(m.rollNo || '').trim().toUpperCase()));
        const additionalLeaves = fetchedPasses.filter(p => {
          const r = String(p.rollNo || '').trim().toUpperCase();
          const isLv = (p.requestCategory === 'leave' || p.isLeave === true || p.type === 'leave');
          return isLv && menteeRollSet.has(r);
        });
        if (additionalLeaves.length > 0) {
          leavePasses = additionalLeaves;
        }
      } catch (_) {}

      // 3. Check for XLSX in browser
      const XLSXLib = (typeof XLSX !== 'undefined' ? XLSX : (typeof window !== 'undefined' ? window.XLSX : null));
      if (XLSXLib) {
        // Direct Client-Side Excel Generation (Fast & Deterministic)
        const wb = buildCounselorAttendanceWorkbook(mentees, leavePasses, {
          batch,
          academicYear,
          yearSem,
          period,
          totalDays,
          targetMonth,
          targetYear
        });

        const cleanBatch = batch.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `COUNSELLING_DETAILS_${cleanBatch}_${targetYear}.xlsx`;
        XLSXLib.writeFile(wb, filename);

        if (typeof showToast === 'function') {
          showToast(`Exported Attendance Sheet (.xlsx) for ${mentees.length} assigned mentees!`, 'success');
        }
      } else {
        // Fallback: Trigger Backend Stream Download
        const queryParams = new URLSearchParams({
          counselorName: user.name || '',
          startRoll: user.startRoll || '',
          endRoll: user.endRoll || '',
          batch,
          academicYear,
          yearSem,
          period,
          totalDays,
          targetMonth,
          targetYear
        });
        window.location.href = `/api/counselor/attendance-sheet?${queryParams.toString()}`;
        if (typeof showToast === 'function') {
          showToast('Downloading Attendance Sheet (.xlsx)...', 'success');
        }
      }
    } catch (err) {
      console.error('Error generating counselor attendance Excel:', err);
      if (typeof showToast === 'function') {
        showToast('Error generating attendance sheet: ' + err.message, 'error');
      }
    }
  }

  // Global Exports
  window.buildCounselorAttendanceWorkbook = buildCounselorAttendanceWorkbook;
  window.downloadCounselorAttendanceExcel = downloadCounselorAttendanceExcel;
})();
