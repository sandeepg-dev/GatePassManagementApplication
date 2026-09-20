/**
 * jsPDF Report Generation Service - Enterprise Institutional Formats
 */

/**
 * Resolves pass records from window.masterPassList, window.cachedAllRecords, or live API query
 */
async function getEffectivePassList() {
  if (window.masterPassList && Array.isArray(window.masterPassList) && window.masterPassList.length > 0) {
    const nonOD = window.masterPassList.filter(p => !p.isOD);
    if (nonOD.length > 0) return nonOD;
  }
  if (window.cachedAllRecords && Array.isArray(window.cachedAllRecords) && window.cachedAllRecords.length > 0) {
    const nonOD = window.cachedAllRecords.filter(p => !p.isOD);
    if (nonOD.length > 0) {
      window.masterPassList = nonOD;
      return nonOD;
    }
  }

  try {
    let url = '/api/passes';
    const u = window.loggedUser;
    if (u) {
      const params = new URLSearchParams();
      params.append('role', u.role);
      if (u.role === 'counselor') {
        if (u.name) params.append('counselorName', u.name);
        if (u.startRoll) params.append('startRoll', u.startRoll);
        if (u.endRoll) params.append('endRoll', u.endRoll);
      } else if (u.role === 'advisor') {
        if (u.dept) params.append('dept', u.dept);
        if (u.yearSec) params.append('yearSec', u.yearSec);
      } else if (u.role === 'hod') {
        if (u.dept) params.append('dept', u.dept);
      } else if (u.role === 'boys_warden' || u.role === 'girls_warden') {
        params.append('accommodation', 'Hosteller');
        params.append('gender', u.role === 'girls_warden' ? 'Female' : 'Male');
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.passes || []);
    const nonOD = list.filter(p => !p.isOD);
    window.masterPassList = nonOD;
    return nonOD;
  } catch (err) {
    console.error('Failed to load pass list for PDF export:', err);
    return [];
  }
}

/**
 * Resolves OD (On-Duty) records for Counselor, Advisor, and HOD
 */
async function getEffectiveODList() {
  const u = window.loggedUser;
  if (!u || !['counselor', 'advisor', 'hod'].includes(u.role)) {
    return [];
  }

  if (window.cachedAllRecords && Array.isArray(window.cachedAllRecords) && window.cachedAllRecords.length > 0) {
    const odRecords = window.cachedAllRecords.filter(p => p.isOD === true);
    if (odRecords.length > 0) return odRecords;
  }

  try {
    let url = '/api/onduty';
    const params = new URLSearchParams();
    params.append('role', u.role);
    if (u.role === 'counselor') {
      if (u.name) params.append('counselorName', u.name);
      if (u.startRoll) params.append('startRoll', u.startRoll);
      if (u.endRoll) params.append('endRoll', u.endRoll);
    } else if (u.role === 'advisor') {
      if (u.dept) params.append('dept', u.dept);
      if (u.yearSec) params.append('yearSec', u.yearSec);
    } else if (u.role === 'hod') {
      if (u.dept) params.append('dept', u.dept);
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const res = await fetch(url);
    const data = await res.json();
    return Array.isArray(data) ? data : (data.requests || []);
  } catch (err) {
    console.error('Failed to load OD list for PDF export:', err);
    return [];
  }
}

/**
 * Downloads an official landscape master audit dossier PDF.
 * Contains both Gate Pass Audit and OD Audit for Counselor, Advisor, and HOD.
 * Contains Gate Pass Audit only for Principal and Warden.
 * Incorporates GRT Institute of Engineering and Technology branding and official college logo.
 */
async function downloadMasterPDF() {
  const u = window.loggedUser;
  const includeOD = ['counselor', 'advisor', 'hod'].includes(u?.role);

  const passes = await getEffectivePassList();
  const odList = includeOD ? await getEffectiveODList() : [];

  if ((!passes || passes.length === 0) && (!odList || odList.length === 0)) {
    return showToast('No audit records found to export.', 'warning');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logoBase64 = await getCollegeLogoBase64();
  const watermarkBase64 = await getCollegeLogoWatermarkBase64();
  const bannerBase64 = await getCollegeBannerBase64();

  const roleUpper = String(u?.role || 'OFFICIAL').toUpperCase();
  const deptStr = u?.dept ? String(u.dept).toUpperCase() : 'ALL DEPARTMENTS';
  const secStr = u?.yearSec ? ` - Sec '${u.yearSec}'` : '';
  const jurisdictionStr = `${roleUpper} (${deptStr}${secStr})`;

  const nowString = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  /**
   * Internal helper to draw the official college header banner on a section start page
   */
  function drawMasterHeader(sectionNum, sectionTitle, summaryText, accentRgb) {
    const banner = bannerBase64 || cachedCollegeBannerBase64;
    const logo = logoBase64 || cachedCollegeLogoBase64;

    if (banner) {
      // Clean white header background for official college banner
      doc.setFillColor(255, 255, 255);
      doc.rect(9.5, 9.5, 278, 27, 'F');
      try {
        const bH = 25;
        const bW = bH * 2.914; // ~72.85mm
        const bX = 9.5 + (278 - bW) / 2;
        doc.addImage(banner, 'PNG', bX, 10.5, bW, bH);
      } catch (e) {
        console.warn('Could not add banner image to Master Audit PDF:', e);
      }
    } else {
      // Top banner background (Deep Navy)
      doc.setFillColor(15, 23, 42);
      doc.rect(9.5, 9.5, 278, 27, 'F');

      // Official College Logo Badge
      if (logo) {
        try {
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(12, 11, 24, 24, 2, 2, 'F');
          doc.addImage(logo, 'PNG', 13, 12, 22, 22);
        } catch (e) {
          console.warn('Could not add logo to Master Audit PDF:', e);
        }
      }

      // College Header Typography
      const centerX = 154;
      doc.setFont('times', 'bold');
      doc.setFontSize(13.5);
      doc.setTextColor(255, 255, 255);
      doc.text('GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY', centerX, 16.5, { align: 'center' });

      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(226, 232, 240);
      doc.text('(An Autonomous Institution | Accredited by NAAC with \'A++\' Grade | Approved by AICTE, New Delhi)', centerX, 21.5, { align: 'center' });

      doc.setFontSize(7.5);
      doc.setTextColor(203, 213, 225);
      doc.text('Affiliated to Anna University, Chennai • Chennai-Tirupati Highway, Tiruttani - 631 209', centerX, 26, { align: 'center' });

      doc.setFont('times', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(253, 224, 71); // Gold accent
      doc.text(`MASTER REPOSITORY AUDIT • JURISDICTION: ${jurisdictionStr}`, centerX, 31.5, { align: 'center' });
    }

    // Maroon accent bar
    doc.setFillColor(185, 28, 28);
    doc.rect(9.5, 36.5, 278, 1.5, 'F');

    // Gold accent separator bar
    doc.setFillColor(217, 119, 6);
    doc.rect(9.5, 38, 278, 0.8, 'F');

    // Sub-Bar: Metadata & Generated IST
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(9.5, 40.5, 278, 6.5, 'FD');

    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated By: ${u?.name || 'Authorized Official'} (${roleUpper}) | Jurisdiction: ${jurisdictionStr} | Dossier Ref: GRTIET/AUDIT/2026/${u?.role || 'OFFICIAL'}`, 13, 45);
    doc.text(`Audit Export Date: ${nowString} IST`, 284, 45, { align: 'right' });

    // Section Bar
    doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.setDrawColor(accentRgb[3] || 15, accentRgb[4] || 23, accentRgb[5] || 42);
    doc.setLineWidth(0.4);
    doc.roundedRect(9.5, 48.5, 278, 7.5, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(accentRgb[6] || 255, accentRgb[7] || 255, accentRgb[8] || 255);
    doc.text(sectionTitle, 13, 53.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(summaryText, 284, 53.5, { align: 'right' });
  }

  // ==========================================
  // SECTION 1: GATE PASS AUDIT
  // ==========================================
  const gpApproved = passes.filter(p => p.status === 'Approved' || p.exitStatus === 'Exited Campus' || p.status === 'Completed').length;
  const gpExited = passes.filter(p => p.exitStatus === 'Exited Campus' || p.status === 'Exited').length;
  const gpRejected = passes.filter(p => p.status === 'Rejected').length;
  const gpPending = passes.length - gpApproved - gpRejected;
  const gpSummaryStr = `Total Gate Passes: ${passes.length} | Approved: ${gpApproved} | Exited: ${gpExited} | Rejected: ${gpRejected} | In Review: ${gpPending}`;

  drawMasterHeader(
    1,
    'SECTION 1: CAMPUS GATE PASS MASTER AUDIT & CLEARANCE REQUISITIONS',
    gpSummaryStr,
    [240, 253, 244, 34, 197, 94, 22, 101, 52] // light emerald fill, green border, dark green text
  );

  const gatePassTableData = (passes || []).map((p, idx) => {
    const isHosteller = (/hoste?l|^h$/i.test(p.accommodation || '') && !/day/i.test(p.accommodation || ''));
    const accomLabel = isHosteller ? 'Hosteller' : 'Day Scholar';
    const standing = `${formatClassSection(p.dept, p.yearSec, p.academicYear)} [${accomLabel}]`;

    let movement = '-';
    if (isHosteller) {
      const dep = `${p.departureDate || '-'}${p.departureTime ? ' at ' + p.departureTime : ''}`;
      const ret = p.expectedReturnDate ? `${p.expectedReturnDate}${p.expectedReturnTime ? ' at ' + p.expectedReturnTime : ''}` : (p.expectedReturnDateTime || '-');
      movement = `Dep: ${dep}\nRet: ${ret}`;
    } else {
      const lDate = p.leaveDate || p.departureDate || (p.appliedTime ? String(p.appliedTime).split(' ')[0] : '-');
      const lTime = p.leaveTime || p.departureTime || '';
      movement = `Date: ${lDate}\nTime: ${lTime || '-'}`;
    }

    const cApp = p.counselorApproval?.time || p.parentCallTime || (p.counselorApproval?.approved ? 'Verified' : '-');
    const aApp = p.advisorApproval?.time || (p.advisorApproval?.approved ? 'Endorsed' : '-');
    const hApp = p.hodApproval?.time || (p.hodApproval?.approved ? 'Authorized' : '-');
    const pApp = p.principalApproval?.time || p.approvalTime || (p.principalApproval?.approved ? 'Approved' : '-');
    const wApp = p.wardenApproval?.time || (p.wardenApproval?.approved ? 'Cleared' : '-');

    let statusDisplay = p.status || '-';
    if (p.exitStatus === 'Exited Campus' || p.status === 'Exited') {
      statusDisplay = `EXITED (${p.exitTime || 'Recorded'})`;
    } else if (p.status === 'Rejected') {
      statusDisplay = `REJECTED (${p.rejectedBy || p.rejection?.roleTitle || 'Authority'})`;
    } else if (p.status === 'Approved') {
      statusDisplay = 'APPROVED';
    }

    return [
      idx + 1,
      p.rollNo,
      p.name || 'Student',
      standing,
      movement,
      p.appliedTime || '-',
      cApp,
      aApp,
      hApp,
      pApp,
      wApp,
      statusDisplay
    ];
  });

  doc.autoTable({
    startY: 58,
    margin: { left: 9.5, right: 9.5, bottom: 15 },
    head: [
      [
        '#',
        'Roll No',
        'Student Name',
        'Standing & Accom',
        'Movement Schedule',
        '1. Applied',
        '2. Counselor',
        '3. Advisor',
        '4. HOD',
        '5. Principal',
        '6. Warden',
        'Status'
      ]
    ],
    body: gatePassTableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    styles: { fontSize: 6.6, cellPadding: 1.8, textColor: [30, 41, 59], valign: 'middle', overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 22, fontStyle: 'bold' },
      2: { cellWidth: 28 },
      3: { cellWidth: 34 },
      4: { cellWidth: 38 },
      5: { cellWidth: 22, fontSize: 6.1 },
      6: { cellWidth: 20, fontSize: 6.1 },
      7: { cellWidth: 20, fontSize: 6.1 },
      8: { cellWidth: 20, fontSize: 6.1 },
      9: { cellWidth: 20, fontSize: 6.1 },
      10: { cellWidth: 20, fontSize: 6.1 },
      11: { fontStyle: 'bold', halign: 'center' }
    }
  });

  // ==========================================
  // SECTION 2: ON-DUTY (OD) AUDIT (COUNSELOR, ADVISOR, HOD ONLY)
  // ==========================================
  if (includeOD) {
    doc.addPage();

    const odApproved = odList.filter(o => o.status === 'Completed').length;
    const odRejected = odList.filter(o => o.status === 'Rejected').length;
    const odPending = odList.length - odApproved - odRejected;
    const odSummaryStr = `Total OD: ${odList.length} | Completed: ${odApproved} | Rejected: ${odRejected} | In Review: ${odPending}`;

    drawMasterHeader(
      2,
      'SECTION 2: ACADEMIC ON-DUTY (OD) MASTER AUDIT & CLEARANCE REQUISITIONS',
      odSummaryStr,
      [238, 242, 255, 99, 102, 241, 67, 56, 202] // light indigo fill, indigo border, dark indigo text
    );

    if (!odList || odList.length === 0) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(9.5, 60, 278, 22, 2, 2, 'FD');
      doc.setFont('times', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`No On-Duty requisitions registered under active jurisdiction (${jurisdictionStr}).`, 148, 72, { align: 'center' });
    } else {
      const odTableData = odList.map((od, idx) => {
        const standing = `${od.dept || 'CSE'} - Sec '${od.yearSec || 'A'}' (${od.academicYear || '3 Year'})`;
        const categoryVenue = `${od.placeEvent || od.event || 'Technical Assignment'}`;
        let timing = '-';
        if (od.mode === 'dates') {
          timing = `From: ${od.fromDate || '-'}\nTo: ${od.toDate || '-'}`;
        } else {
          timing = `Date: ${od.specificDate || '-'}\nTime: ${od.fromTime || '-'}-${od.toTime || '-'}`;
        }

        const cApp = od.counselorApproval?.time || (od.counselorApproval?.approved ? 'Verified' : '-');
        const aApp = od.advisorApproval?.time || (od.advisorApproval?.approved ? 'Endorsed' : '-');
        const hApp = od.hodApproval?.time || (od.hodApproval?.approved ? 'Authorized' : '-');

        let statusDisplay = od.status || '-';
        if (od.status === 'Completed') {
          statusDisplay = 'COMPLETED';
        } else if (od.status === 'Rejected') {
          statusDisplay = `REJECTED (${od.rejectedBy || od.rejection?.roleTitle || 'Authority'})`;
        }

        return [
          idx + 1,
          od.rollNo,
          od.name || 'Student',
          standing,
          categoryVenue,
          timing,
          od.appliedTime || '-',
          cApp,
          aApp,
          hApp,
          statusDisplay
        ];
      });

      doc.autoTable({
        startY: 58,
        margin: { left: 9.5, right: 9.5, bottom: 15 },
        head: [
          [
            '#',
            'Roll No',
            'Student Name',
            'Dept & Class Section',
            'OD Category / Venue / Event',
            'OD Schedule & Timing',
            '1. Applied',
            '2. Counselor',
            '3. Advisor',
            '4. HOD',
            'Status'
          ]
        ],
        body: odTableData,
        theme: 'grid',
        headStyles: { fillColor: [67, 56, 202], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 6.6, cellPadding: 1.8, textColor: [30, 41, 59], valign: 'middle', overflow: 'linebreak' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 22, fontStyle: 'bold' },
          2: { cellWidth: 30 },
          3: { cellWidth: 28 },
          4: { cellWidth: 44 },
          5: { cellWidth: 38 },
          6: { cellWidth: 22, fontSize: 6.1 },
          7: { cellWidth: 22, fontSize: 6.1 },
          8: { cellWidth: 22, fontSize: 6.1 },
          9: { cellWidth: 22, fontSize: 6.1 },
          10: { fontStyle: 'bold', halign: 'center' }
        }
      });
    }
  }

  // ==========================================
  // RUNNING INSTITUTIONAL FOOTER & OUTER FRAMES ON ALL PAGES
  // ==========================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Subtle institutional GRT College Logo watermark on every page
    renderPageWatermark(doc, watermarkBase64, 105);

    // Double institutional border
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.rect(8, 8, 281, 194);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.rect(9.5, 9.5, 278, 191);

    // Running footer divider line
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(10, 198, 287, 198);

    // Running footer typography
    doc.setFont('times', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text('GRT Institute of Engineering and Technology, Tiruttani • Master Institutional Repository Audit Dossier', 13, 202);
    doc.text('Official Confidential Audit Record • Campus PassPro Engine', 148, 202, { align: 'center' });
    doc.text(`Page ${i} of ${totalPages}`, 284, 202, { align: 'right' });
  }

  const filenameRole = (u?.role || 'OFFICIAL').toUpperCase();
  doc.save(`GRTIET_Master_Audit_${filenameRole}_${Date.now()}.pdf`);

  if (includeOD) {
    showToast('Master Audit PDF (Gate Pass + OD Audit) downloaded successfully!', 'success');
  } else {
    showToast('Master Audit PDF (Gate Pass Audit) downloaded successfully!', 'success');
  }
}

/**
 * Renders an official formal Gate Pass letter onto the given jsPDF doc page
 * @param {jsPDF} doc
 * @param {object} pass
 * @param {string|null} logoBase64
 * @param {string|null} [watermarkBase64]
 */
function renderOfficialGatePassLetterPage(doc, pass, logoBase64, watermarkBase64, bannerBase64) {
  const banner = bannerBase64 || cachedCollegeBannerBase64;
  const logo = logoBase64 || cachedCollegeLogoBase64;
  const watermark = watermarkBase64 || cachedCollegeLogoWatermarkBase64;

  // 1. Elegant Double Institutional Border
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.rect(10, 10, 190, 277);

  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.2);
  doc.rect(12, 12, 186, 273);

  // Render Subtle Institutional College Logo Watermark
  renderPageWatermark(doc, watermark, 95);

  // 2. Official College Letterhead & Banner / Logo
  if (banner) {
    try {
      const bH = 26.5;
      const bW = bH * 2.914; // ~77.2mm
      const bX = (210 - bW) / 2;
      doc.addImage(banner, 'PNG', bX, 13.5, bW, bH);
    } catch (e) {
      console.warn('Could not render banner in Gate Pass Letter PDF:', e);
    }
  } else {
    if (logo) {
      try {
        doc.addImage(logo, 'PNG', 15, 15, 22, 22);
      } catch (e) {
        console.warn('Could not render logo in PDF:', e);
      }
    }

    // College Letterhead Typography
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // Deep Navy
    doc.text('GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY', 114, 19.5, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(71, 85, 105);
    doc.text('(Approved by AICTE, New Delhi | Affiliated to Anna University, Chennai)', 114, 24.5, { align: 'center' });

    doc.setFont('times', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(185, 28, 28); // Official Maroon Accent
    doc.text('(An Autonomous Institution | Accredited by NAAC with \'A++\' Grade)', 114, 29, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text('GRT Mahalaksmi Nagar, Chennai-Tirupati Highway, Tiruttani - 631 209.', 114, 33.5, { align: 'center' });

    const deptUpper = String(pass.dept || 'ENGINEERING').toUpperCase();
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`DEPARTMENT OF ${deptUpper}`, 114, 38, { align: 'center' });
  }

  // Letterhead Horizontal Divider Line (Deep Navy + Gold Accent)
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(14, 41, 196, 41);

  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.3);
  doc.line(14, 42, 196, 42);

  // 3. Date & Reference Number
  let curY = 48.5;
  const appliedDate = formatLetterDate(pass.appliedTime);
  const refNum = `GRTIET/${deptUpper}/GP/2026/${pass.rollNo}`;

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Ref: ${refNum}`, 16, curY);

  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Date: ${appliedDate}`, 194, curY, { align: 'right' });

  // 4. From Section
  curY = 55.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('From:', 16, curY);

  const isHosteller = (/hoste?l|^h$/i.test(pass.accommodation || '') && !/day/i.test(pass.accommodation || ''));
  const accommodationStr = isHosteller ? 'Hosteller (Resident Student)' : 'Day Scholar';

  curY += 4.5;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${pass.name || 'Student'} (Register No: ${pass.rollNo}),`, 20, curY);
  curY += 4.5;
  doc.text(`${pass.academicYear || '3 Year'}, Department of ${pass.dept || 'Engineering'} (Section '${pass.yearSec || 'A'}'),`, 20, curY);
  curY += 4.5;
  doc.text(`Accommodation: ${accommodationStr} | Father: ${pass.fatherName || pass.parentName || '-'} | Parent: ${pass.parentContact || '-'},`, 20, curY);
  curY += 4.5;
  doc.text('GRT Institute of Engineering and Technology, Tiruttani - 631 209.', 20, curY);

  // 5. Through Section
  curY += 5.5;
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('(Through: Respective Class Counselor, Class Advisor, and Head of Department)', 20, curY);

  // 6. To Section
  curY += 5.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('To:', 16, curY);

  curY += 4.5;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('The Principal / Institutional Directorate,', 20, curY);
  curY += 4.5;
  doc.text('GRT Institute of Engineering and Technology,', 20, curY);
  curY += 4.5;
  doc.text('Tiruttani - 631 209.', 20, curY);

  // 7. Salutation & Subject
  curY += 7;
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Respected Sir / Madam,', 16, curY);

  curY += 6;
  doc.text('Subject: Requisition for Authorized Campus Gate Pass / Leave Clearance - Regarding.', 20, curY);

  // 8. Formal Letter Body (Shorter, universal, with Gate Pass Reason clearly displayed in the middle)
  curY += 7;
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);

  const body1 = 'I am writing to request permission for a Gate Pass to leave the college campus due to the following reason:';
  doc.text(body1, 16, curY);
  curY += 9;

  // Gate Pass Reason clearly highlighted in the middle
  const gatePassReason = String(pass.reason || '-').trim();
  const reasonText = `"${gatePassReason}"`;
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const reasonLines = doc.splitTextToSize(reasonText, 150);
  doc.text(reasonLines, 105, curY, { align: 'center', lineHeightFactor: 1.3 });
  curY += reasonLines.length * 6 + 4;

  if (isHosteller) {
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    const appDateStr = `Application Date: ${appliedDate}   |   Department: ${pass.dept || 'Engineering'} (${pass.academicYear || '3 Year'} - Sec ${pass.yearSec || 'A'})`;
    doc.text(appDateStr, 105, curY, { align: 'center' });
    curY += 5;
    const depStr = `Departure: ${pass.departureDate || '-'}${pass.departureTime ? ' at ' + pass.departureTime : ''}`;
    const retStr = `Return: ${pass.expectedReturnDate ? pass.expectedReturnDate + (pass.expectedReturnTime ? ' at ' + pass.expectedReturnTime : '') : (pass.expectedReturnDateTime || '-')}`;
    doc.text(`${depStr}   |   ${retStr}`, 105, curY, { align: 'center' });
    curY += 6;
  } else {
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    const leaveTimeStr = pass.leaveDate ? `${pass.leaveDate}${pass.leaveTime ? ' at ' + pass.leaveTime : ''}` : (pass.departureDate ? `${pass.departureDate}${pass.departureTime ? ' at ' + pass.departureTime : ''}` : (pass.approvalTime || pass.appliedTime || appliedDate));
    doc.text(`Leave Date & Time: ${leaveTimeStr}`, 105, curY, { align: 'center' });
    curY += 5;
    doc.text(`Department: ${pass.dept || 'Engineering'}   |   Year & Section: ${pass.academicYear || '3 Year'} (Section '${pass.yearSec || 'A'}')`, 105, curY, { align: 'center' });
    curY += 6;
  }

  // Short concluding declaration suitable for all reasons
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  const body2 = 'I have informed my parents and assure you that I will abide by all institutional rules and return to the campus on time. Kindly grant me permission.';
  const body2Lines = doc.splitTextToSize(body2, 178);
  doc.text(body2Lines, 16, curY, { lineHeightFactor: 1.35 });
  curY += body2Lines.length * 4.6 + 6;

  // 11. Thank You & Yours Faithfully
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Thanking You,', 16, curY);

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Yours faithfully,', 148, curY);
  curY += 8.5;
  doc.setFont('times', 'bold');
  doc.text(`(${pass.name || 'Student'})`, 148, curY);
  curY += 4.2;
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(`Roll No: ${pass.rollNo}`, 148, curY);

  // 12. Signature & Multi-Tier Institutional Clearance Section
  curY = Math.max(curY + 6, 206);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(16, curY, 194, curY);
  curY += 4.5;

  doc.setFont('times', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(71, 85, 105);
  doc.text('OFFICIAL MULTI-TIER CLEARANCE & APPROVAL ENDORSEMENT', 16, curY);

  // Clearances
  const cApp = pass.counselorApproval?.approved || !!pass.parentCallTime;
  const aApp = pass.advisorApproval?.approved;
  const hApp = pass.hodApproval?.approved;
  const pApp = pass.principalApproval?.approved || pass.status === 'Approved' || pass.status === 'Completed' || pass.exitStatus === 'Exited Campus' || pass.exitStatus === 'Returned to College' || !!pass.approvalTime;
  const wApp = pass.wardenApproval?.approved;

  const counselorName = pass.counselorApproval?.counselorName || pass.counselorName || 'Class Counselor';
  const advisorName = pass.advisorApproval?.advisorName || 'Class Advisor';
  const hodName = pass.hodApproval?.hodName || 'Head of Department';
  const principalName = pass.principalApproval?.principalName || 'Principal Directorate';
  const wardenName = pass.wardenApproval?.wardenName || (pass.gender === 'Female' ? 'Girls Hostel Warden' : 'Boys Hostel Warden');

  const counselorStatus = cApp ? 'Verified (Parent Call)' : (pass.status === 'Rejected' && /counselor/i.test(pass.rejection?.role || '') ? 'REJECTED' : 'Pending');
  const advisorStatus = aApp ? 'Endorsed' : (pass.status === 'Rejected' && /advisor/i.test(pass.rejection?.role || '') ? 'REJECTED' : (cApp ? 'Pending' : 'Queued'));
  const hodStatus = hApp ? 'Authorized' : (pass.status === 'Rejected' && /hod/i.test(pass.rejection?.role || '') ? 'REJECTED' : (aApp ? 'Pending' : 'Queued'));
  const principalStatus = pApp ? 'Approved (Sanctioned)' : (pass.status === 'Rejected' && /principal/i.test(pass.rejection?.role || '') ? 'REJECTED' : (hApp ? 'Pending' : 'Queued'));
  const wardenStatus = wApp ? 'Gate Cleared' : (pass.status === 'Rejected' && /warden/i.test(pass.rejection?.role || '') ? 'REJECTED' : (pApp ? 'Pending' : 'Queued'));

  const cDate = pass.counselorApproval?.time || pass.parentCallTime ? formatLetterDate(pass.counselorApproval?.time || pass.parentCallTime) : '-';
  const aDate = pass.advisorApproval?.time ? formatLetterDate(pass.advisorApproval.time) : '-';
  const hDate = pass.hodApproval?.time ? formatLetterDate(pass.hodApproval.time) : '-';
  const pDate = pass.principalApproval?.time || pass.approvalTime ? formatLetterDate(pass.principalApproval?.time || pass.approvalTime) : '-';
  const wDate = pass.wardenApproval?.time ? formatLetterDate(pass.wardenApproval.time) : '-';

  const sigY = curY + 18;
  const colWidth = 33;

  const cols = isHosteller
    ? [
        { title: 'Student Signature', name: pass.name || 'Student', status: 'Submitted', isApproved: true, date: appliedDate, x: 16 },
        { title: 'Class Counselor', name: counselorName, status: counselorStatus, isApproved: cApp, date: cDate, x: 16 + colWidth + 2 },
        { title: 'Class Advisor', name: advisorName, status: advisorStatus, isApproved: aApp, date: aDate, x: 16 + (colWidth + 2) * 2 },
        { title: 'Head of Dept', name: hodName, status: hodStatus, isApproved: hApp, date: hDate, x: 16 + (colWidth + 2) * 3 },
        { title: 'Principal / Warden', name: (wApp ? wardenName : principalName), status: (wApp ? wardenStatus : principalStatus), isApproved: (wApp || pApp), date: (wApp ? wDate : pDate), x: 16 + (colWidth + 2) * 4 }
      ]
    : [
        { title: 'Student Signature', name: pass.name || 'Student', status: 'Submitted', isApproved: true, date: appliedDate, x: 16 },
        { title: 'Class Counselor', name: counselorName, status: counselorStatus, isApproved: cApp, date: cDate, x: 16 + colWidth + 2 },
        { title: 'Class Advisor', name: advisorName, status: advisorStatus, isApproved: aApp, date: aDate, x: 16 + (colWidth + 2) * 2 },
        { title: 'Head of Dept', name: hodName, status: hodStatus, isApproved: hApp, date: hDate, x: 16 + (colWidth + 2) * 3 },
        { title: 'Principal Directorate', name: principalName, status: principalStatus, isApproved: pApp, date: pDate, x: 16 + (colWidth + 2) * 4 }
      ];

  cols.forEach(col => {
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(col.x, sigY, col.x + colWidth, sigY);
    doc.setFont('times', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text(col.title, col.x, sigY + 3.8);

    doc.setFont('times', 'bold');
    doc.setFontSize(7.5);
    if (col.isApproved) doc.setTextColor(22, 101, 52);
    else if (col.status === 'REJECTED') doc.setTextColor(190, 18, 60);
    else doc.setTextColor(100, 116, 139);
    doc.text(col.status, col.x, sigY + 7.4);

    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(col.name, col.x, sigY + 10.8, { maxWidth: colWidth });
    if (col.isApproved && col.date !== '-') doc.text(`Date: ${col.date}`, col.x, sigY + 14.2);
  });

  // Institutional Clearance Endorsement Box
  const endY = sigY + 18;
  if (pass.status === 'Rejected') {
    doc.setDrawColor(244, 63, 94);
    doc.setFillColor(255, 241, 242);
    doc.roundedRect(16, endY, 178, 11, 1.5, 1.5, 'FD');
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(159, 18, 57);
    doc.text(
      `Rejection Endorsement: Requisition declined by ${pass.rejection?.roleTitle || pass.rejectedBy || 'Authority'}. Reason: "${pass.rejection?.reason || pass.rejectionReason || 'Not approved'}"`,
      19,
      endY + 6.8,
      { maxWidth: 172 }
    );
  } else if (pApp || pass.status === 'Approved' || pass.status === 'Completed' || pass.exitStatus === 'Exited Campus' || pass.exitStatus === 'Returned to College') {
    doc.setDrawColor(34, 197, 94);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(16, endY, 178, 11, 1.5, 1.5, 'FD');
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    doc.text(
      'Official Endorsement: Gate Pass authorized under GRT Institutional Clearance Regulations. Campus security is instructed to permit egress/ingress per recorded departure and expected return schedule.',
      19,
      endY + 5.2,
      { maxWidth: 172 }
    );
    if (pass.exitTime) {
      doc.setFont('times', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Gate Movement Log: Departed at ${pass.exitTime}${pass.returnTime ? ` | Returned at ${pass.returnTime}` : ''} | Barcode Token: ${pass.rollNo}`,
        19,
        endY + 9.2
      );
    }
  }

  // 13. Institutional Footer
  doc.setFont('times', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'GRT Institute of Engineering and Technology • Official Campus Gate Pass Letter • Campus PassPro',
    105,
    284,
    { align: 'center' }
  );
}

/**
 * Downloads a dossier of all official requisition letters in current jurisdiction
 */
async function downloadAllCompleteLettersPDF() {
  const passes = await getEffectivePassList();
  if (!passes || passes.length === 0) {
    return showToast('No requisition letters found to export.', 'warning');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = await getCollegeLogoBase64();
  const watermarkBase64 = await getCollegeLogoWatermarkBase64();
  const bannerBase64 = await getCollegeBannerBase64();

  passes.forEach((pass, index) => {
    if (index > 0) doc.addPage();
    renderOfficialGatePassLetterPage(doc, pass, logoBase64, watermarkBase64, bannerBase64);
  });

  doc.save(`GRTIET_All_Gate_Pass_Letters_${loggedUser?.role || 'dossier'}_${Date.now()}.pdf`);
  showToast('All formal gate pass letters exported to PDF dossier!', 'success');
}

/**
 * Renders an official professional Gate Pass / Pass Card (NOT a letter)
 * Includes official college branding, logo, barcode, student identity,
 * movement schedule (Hosteller vs Day Scholar), approval endorsements, and gate security check stamps.
 * @param {jsPDF} doc
 * @param {object} pass
 * @param {string} logoBase64
 * @param {string} [watermarkBase64]
 */
function renderProfessionalGatePassCardPage(doc, pass, logoBase64, watermarkBase64, bannerBase64) {
  const banner = bannerBase64 || cachedCollegeBannerBase64;
  const logo = logoBase64 || cachedCollegeLogoBase64;
  const watermark = watermarkBase64 || cachedCollegeLogoWatermarkBase64;

  const isHosteller = (/hoste?l|^h$/i.test(pass.accommodation || '') && !/day/i.test(pass.accommodation || ''));
  const deptUpper = String(pass.dept || 'ENGINEERING').toUpperCase();
  const appliedDate = formatLetterDate(pass.appliedTime);
  const leaveTimeStr = pass.leaveDate ? `${pass.leaveDate}${pass.leaveTime ? ' at ' + pass.leaveTime : ''}` : (pass.departureDate ? `${pass.departureDate}${pass.departureTime ? ' at ' + pass.departureTime : ''}` : (pass.approvalTime || pass.appliedTime || appliedDate));

  // 1. Outer Background & Security Frame
  const cardX = 12;
  const cardY = 12;
  const cardWidth = 186;
  const cardHeight = 273;

  // Card Outer Double Border
  doc.setDrawColor(15, 23, 42); // Deep Navy
  doc.setLineWidth(0.8);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3.5, 3.5, 'D');

  doc.setDrawColor(203, 213, 225); // Subtle Slate Inner Frame
  doc.setLineWidth(0.3);
  doc.roundedRect(cardX + 1.5, cardY + 1.5, cardWidth - 3, cardHeight - 3, 2.5, 2.5, 'D');

  // 2. Official Header Banner
  if (banner) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cardX + 2, cardY + 2, cardWidth - 4, 29.5, 2, 2, 'F');
      const bH = 26;
      const bW = bH * 2.914; // ~75.8mm
      const bX = cardX + 2 + ((cardWidth - 4) - bW) / 2;
      doc.addImage(banner, 'PNG', bX, cardY + 3.8, bW, bH);
    } catch (e) {
      console.warn('Could not add banner to Gate Pass card:', e);
    }
  } else {
    doc.setFillColor(15, 23, 42); // Navy Banner
    doc.roundedRect(cardX + 2, cardY + 2, cardWidth - 4, 30, 2.5, 2.5, 'F');

    // College Logo in White Badge
    if (logo) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(cardX + 4.5, cardY + 4, 25, 25, 2, 2, 'F');
        doc.addImage(logo, 'PNG', cardX + 5.5, cardY + 5, 23, 23);
      } catch (e) {
        console.warn('Could not add logo to Gate Pass card:', e);
      }
    }

    // College Header Text
    const headerCenterX = cardX + 28 + (cardWidth - 32) / 2;
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY', headerCenterX, cardY + 10, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text('(An Autonomous Institution | Accredited by NAAC with \'A++\' Grade | Approved by AICTE)', headerCenterX, cardY + 15.5, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    doc.text('Affiliated to Anna University, Chennai • Tiruttani-Chennai Highway, Tiruttani - 631 209', headerCenterX, cardY + 20, { align: 'center' });

    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(253, 224, 71); // Gold accent
    doc.text(`DEPARTMENT OF ${deptUpper}`, headerCenterX, cardY + 26, { align: 'center' });
  }

  // Maroon/Gold Accent Bar
  doc.setFillColor(185, 28, 28); // Maroon
  doc.rect(cardX + 2, cardY + 31.5, cardWidth - 4, 1.8, 'F');

  // 3. Pass Card Title Bar & Security Token
  let curY = cardY + 37;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(0.4);
  doc.roundedRect(cardX + 4, curY, 70, 11, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(22, 101, 52);
  doc.text('CAMPUS GATE PASS', cardX + 7, curY + 7.5);

  // Barcode & Token
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`TOKEN: GP-${pass.rollNo}`, cardX + 80, curY + 4.5);

  const barX = cardX + 80;
  const barY = curY + 5.5;
  const barWidths = [1.2, 0.6, 1.8, 0.8, 1.4, 0.5, 1.2, 2, 0.7, 1.3, 0.6, 1.8, 1, 0.8, 1.5, 0.6, 1.2, 0.8, 1.6];
  let curBx = barX;
  doc.setFillColor(15, 23, 42);
  barWidths.forEach(w => {
    doc.rect(curBx, barY, w, 5.2, 'F');
    curBx += w + 0.8;
  });

  // Accommodation & Approved Badge
  doc.setFillColor(isHosteller ? 254 : 238, isHosteller ? 243 : 242, isHosteller ? 199 : 255);
  doc.setDrawColor(isHosteller ? 217 : 99, isHosteller ? 119 : 102, isHosteller ? 6 : 241);
  doc.roundedRect(cardX + 132, curY, 49, 11, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(isHosteller ? 146 : 67, isHosteller ? 64 : 56, isHosteller ? 14 : 202);
  doc.text(isHosteller ? 'HOSTELLER' : 'DAY SCHOLAR', cardX + 156.5, curY + 5, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(22, 101, 52);
  doc.text('APPROVED & VALIDATED', cardX + 156.5, curY + 9.2, { align: 'center' });

  // 4. Student Information Grid
  curY += 14;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(cardX + 4, curY, cardWidth - 8, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('STUDENT INFORMATION', cardX + 8, curY + 6);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(cardX + 8, curY + 8, cardX + cardWidth - 8, curY + 8);

  const col1X = cardX + 8;
  const col2X = cardX + 70;
  const col3X = cardX + 130;
  let infoY = curY + 14;

  // Row 1
  doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
  doc.text('Name:', col1X, infoY);
  doc.setFont('times', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
  doc.text(String(pass.name || 'Student'), col1X + 22, infoY);

  doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
  doc.text('Year / Sec:', col2X, infoY);
  doc.setFont('times', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
  doc.text(`${pass.academicYear || 'III Year'} - Sec '${pass.yearSec || 'A'}'`, col2X + 20, infoY);

  doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
  doc.text('Applied:', col3X, infoY);
  doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(15, 23, 42);
  doc.text(appliedDate, col3X + 16, infoY);

  // Row 2
  infoY += 7.5;
  doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
  doc.text('Roll No:', col1X, infoY);
  doc.setFont('courier', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
  doc.text(String(pass.rollNo || '-'), col1X + 22, infoY);

  doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
  doc.text('Father:', col2X, infoY);
  doc.setFont('times', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
  doc.text(String(pass.fatherName || pass.parentName || '-'), col2X + 20, infoY);

  doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
  doc.text('Parent Ph:', col3X, infoY);
  doc.setFont('courier', 'bold'); doc.setFontSize(8.5); doc.setTextColor(15, 23, 42);
  doc.text(String(pass.parentContact || '-'), col3X + 16, infoY);

  // Row 3
  infoY += 7.5;
  doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
  doc.text('Dept:', col1X, infoY);
  doc.setFont('times', 'normal'); doc.setFontSize(8.5); doc.setTextColor(15, 23, 42);
  doc.text(`Dept of ${pass.dept || 'Engineering'}`, col1X + 22, infoY);

  doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
  doc.text('Mobile:', col2X, infoY);
  doc.setFont('courier', 'normal'); doc.setFontSize(8.5); doc.setTextColor(15, 23, 42);
  doc.text(String(pass.mobile || '-'), col2X + 20, infoY);

  doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
  doc.text('Validity:', col3X, infoY);
  doc.setFont('courier', 'bold'); doc.setFontSize(8.5); doc.setTextColor(22, 101, 52);
  doc.text(String(pass.validUntil || 'Authorized Hours'), col3X + 16, infoY);

  // 5. Schedule & Movement Specifics Box (Hosteller vs Day Scholar)
  curY += 41.5;
  if (isHosteller) {
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.4);
    doc.roundedRect(cardX + 4, curY, cardWidth - 8, 38, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14);
    doc.text('HOSTELLER MOVEMENT SCHEDULE (SECURITY CLEARANCE PARTICULARS)', cardX + 8, curY + 6);

    doc.setDrawColor(251, 191, 36);
    doc.setLineWidth(0.2);
    doc.line(cardX + 8, curY + 8, cardX + cardWidth - 8, curY + 8);

    let schY = curY + 14.5;
    doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(120, 53, 15);
    doc.text('1. Application Date:', cardX + 8, schY);
    doc.setFont('times', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(appliedDate, cardX + 42, schY);

    doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(120, 53, 15);
    doc.text('2. Departure Date & Time:', cardX + 90, schY);
    const depStr = `${pass.departureDate || '-'}${pass.departureTime ? ' at ' + pass.departureTime : ''}`;
    doc.setFont('courier', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(depStr, cardX + 133, schY);

    schY += 8;
    doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(120, 53, 15);
    doc.text('3. Return Date & Time:', cardX + 8, schY);
    const retStr = pass.expectedReturnDate ? `${pass.expectedReturnDate}${pass.expectedReturnTime ? ' at ' + pass.expectedReturnTime : ''}` : (pass.expectedReturnDateTime || '-');
    doc.setFont('courier', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(retStr, cardX + 42, schY);

    doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(120, 53, 15);
    doc.text('4. Department:', cardX + 90, schY);
    doc.setFont('times', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(`Dept of ${pass.dept || 'Engineering'}`, cardX + 133, schY);

    schY += 8;
    doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(120, 53, 15);
    doc.text('5. Academic Year:', cardX + 8, schY);
    doc.setFont('times', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(String(pass.academicYear || 'III Year'), cardX + 42, schY);

    doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(120, 53, 15);
    doc.text('6. Section:', cardX + 90, schY);
    doc.setFont('times', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(`Section '${pass.yearSec || 'A'}'`, cardX + 133, schY);

    curY += 41.5;
  } else {
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.4);
    doc.roundedRect(cardX + 4, curY, cardWidth - 8, 32, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(67, 56, 202);
    doc.text('DAY SCHOLAR LEAVE PARTICULARS (CAMPUS CLEARANCE)', cardX + 8, curY + 6);

    doc.setDrawColor(165, 180, 252);
    doc.setLineWidth(0.2);
    doc.line(cardX + 8, curY + 8, cardX + cardWidth - 8, curY + 8);

    let schY = curY + 15;
    doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(67, 56, 202);
    doc.text('1. Leave Date & Time:', cardX + 8, schY);
    doc.setFont('courier', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(leaveTimeStr, cardX + 44, schY);

    doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(67, 56, 202);
    doc.text('2. Department:', cardX + 95, schY);
    doc.setFont('times', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(`Dept of ${pass.dept || 'Engineering'}`, cardX + 125, schY);

    schY += 8;
    doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(67, 56, 202);
    doc.text('3. Academic Year:', cardX + 8, schY);
    doc.setFont('times', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(String(pass.academicYear || 'III Year'), cardX + 44, schY);

    doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(67, 56, 202);
    doc.text('4. Class Section:', cardX + 95, schY);
    doc.setFont('times', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(`Section '${pass.yearSec || 'A'}'`, cardX + 125, schY);

    curY += 38;
  }

  // 6. Multi-Tier Institutional Clearance Badges (Reason is strictly excluded from Gate Pass)
  curY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('INSTITUTIONAL CLEARANCES & DIGITAL VERIFICATIONS', cardX + 4, curY);

  curY += 4.5;
  const numSigners = isHosteller ? 5 : 4;
  const colW = (cardWidth - 8 - (numSigners - 1) * 3) / numSigners;

  const counselorName = pass.counselorApproval?.counselorName || pass.counselorName || 'Class Counselor';
  const advisorName = pass.advisorApproval?.advisorName || 'Class Advisor';
  const hodName = pass.hodApproval?.hodName || 'Head of Department';
  const principalName = pass.principalApproval?.principalName || 'Principal Directorate';
  const wardenName = pass.wardenApproval?.wardenName || (pass.gender === 'Female' ? 'Girls Warden' : 'Boys Warden');

  const cDate = pass.counselorApproval?.time || pass.parentCallTime ? formatLetterDate(pass.counselorApproval?.time || pass.parentCallTime) : '-';
  const aDate = pass.advisorApproval?.time ? formatLetterDate(pass.advisorApproval.time) : '-';
  const hDate = pass.hodApproval?.time ? formatLetterDate(pass.hodApproval.time) : '-';
  const pDate = pass.principalApproval?.time || pass.approvalTime ? formatLetterDate(pass.principalApproval?.time || pass.approvalTime) : '-';
  const wDate = pass.wardenApproval?.time ? formatLetterDate(pass.wardenApproval.time) : '-';

  const approvalBlocks = isHosteller
    ? [
        { role: 'Counselor', name: counselorName, status: 'APPROVED', date: cDate },
        { role: 'Advisor', name: advisorName, status: 'APPROVED', date: aDate },
        { role: 'HOD', name: hodName, status: 'APPROVED', date: hDate },
        { role: 'Principal', name: principalName, status: 'APPROVED', date: pDate },
        { role: 'Warden', name: wardenName, status: 'APPROVED', date: wDate }
      ]
    : [
        { role: 'Counselor', name: counselorName, status: 'APPROVED', date: cDate },
        { role: 'Advisor', name: advisorName, status: 'APPROVED', date: aDate },
        { role: 'HOD', name: hodName, status: 'APPROVED', date: hDate },
        { role: 'Principal', name: principalName, status: 'APPROVED', date: pDate }
      ];

  approvalBlocks.forEach((b, idx) => {
    const bx = cardX + 4 + idx * (colW + 3);
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, curY, colW, 25, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52);
    doc.text(b.role, bx + colW / 2, curY + 5.2, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(21, 128, 61);
    doc.text('APPROVED', bx + colW / 2, curY + 10.5, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(b.name, bx + colW / 2, curY + 15.5, { align: 'center', maxWidth: colW - 2 });

    if (b.date !== '-') {
      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(b.date, bx + colW / 2, curY + 20.8, { align: 'center' });
    }
  });

  curY += 31;

  // 7. Main Gate Security Ingress / Egress Log
  const secBoxW = (cardWidth - 8 - 4) / 2;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(cardX + 4, curY, secBoxW, 30, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text('SECURITY GATE EXIT (OUT)', cardX + 8, curY + 6);

  doc.setFont('times', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(148, 163, 184);
  doc.text('Actual Departure: ___________________________', cardX + 8, curY + 14.5);
  doc.text('Security Officer Signature: __________________', cardX + 8, curY + 23);

  doc.roundedRect(cardX + 4 + secBoxW + 4, curY, secBoxW, 30, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text('SECURITY GATE INGRESS (IN)', cardX + 8 + secBoxW + 4, curY + 6);

  doc.setFont('times', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(148, 163, 184);
  doc.text('Actual Return: ______________________________', cardX + 8 + secBoxW + 4, curY + 14.5);
  doc.text('Security Officer Signature: __________________', cardX + 8 + secBoxW + 4, curY + 23);

  // Subtle Institutional College Logo Watermark across the pass card
  renderPageWatermark(doc, watermarkBase64, 92);

  // 8. Card Footer Warning / Terms
  doc.setFont('times', 'italic');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  const noticeText = 'NOTICE: This Gate Pass is official institutional property of GRT Institute of Engineering and Technology. It is non-transferable and strictly valid for the named student. Present this pass at the Main Security Gate upon exit and return.';
  const nLines = doc.splitTextToSize(noticeText, cardWidth - 8);
  doc.text(nLines, cardX + cardWidth / 2, cardY + cardHeight - 6, { align: 'center' });
}

/**
 * Downloads official professional Gate Pass (Pass card design, NOT a letter)
 * @param {object} pass
 */
async function downloadGatePassCardPDF(pass) {
  if (!pass) return showToast('No pass record provided for Gate Pass download.', 'warning');

  if (loggedUser?.role === 'student' && typeof isPassFullyApproved === 'function' && !isPassFullyApproved(pass)) {
    return showToast('Gate Pass is hidden until all required institutional approvals are completed.', 'warning');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = await getCollegeLogoBase64();
  const watermarkBase64 = await getCollegeLogoWatermarkBase64();
  const bannerBase64 = await getCollegeBannerBase64();

  renderProfessionalGatePassCardPage(doc, pass, logoBase64, watermarkBase64, bannerBase64);

  doc.save(`GRTIET_Gate_Pass_${pass.rollNo}.pdf`);
  showToast(`Official Gate Pass card downloaded for Roll No: ${pass.rollNo}`, 'success');
}

/**
 * Downloads single official formal Gate Pass letter PDF with full institutional letterhead,
 * college logo, From/To, Subject, Reason, Departure & Expected Return schedule, formal body,
 * Thank You, and multi-tier approval signature section.
 * @param {object} pass
 */
async function downloadOfficialLetterOnlyPDF(pass) {
  if (!pass) return showToast('No pass record provided for PDF download.', 'warning');

  if (loggedUser?.role === 'student' && typeof isPassFullyApproved === 'function' && !isPassFullyApproved(pass)) {
    return showToast('Gate Pass is hidden until all required institutional approvals are completed.', 'warning');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = await getCollegeLogoBase64();
  const watermarkBase64 = await getCollegeLogoWatermarkBase64();
  const bannerBase64 = await getCollegeBannerBase64();

  renderOfficialGatePassLetterPage(doc, pass, logoBase64, watermarkBase64, bannerBase64);

  doc.save(`GRTIET_Gate_Pass_Letter_${pass.rollNo}.pdf`);
  showToast(`Official Gate Pass letter PDF downloaded for Roll No: ${pass.rollNo}`, 'success');
}

/**
 * Downloads official student pass letter PDF (aliases to official formal letter)
 * @param {object} pass
 */
async function downloadSinglePassPDF(pass) {
  return await downloadGatePassCardPDF(pass);
}

let cachedCollegeLogoBase64 = null;
let cachedCollegeLogoWatermarkBase64 = null;
let cachedCollegeBannerBase64 = null;

/**
 * Fetches the official GRT College banner as Base64 PNG for institutional header bands
 */
function getCollegeBannerBase64() {
  if (cachedCollegeBannerBase64) return Promise.resolve(cachedCollegeBannerBase64);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxW = 2000;
        const scale = (img.naturalWidth && img.naturalWidth > maxW) ? (maxW / img.naturalWidth) : 1;
        canvas.width = Math.round((img.naturalWidth || img.width || 1200) * scale);
        canvas.height = Math.round((img.naturalHeight || img.height || 412) * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        cachedCollegeBannerBase64 = canvas.toDataURL('image/png');
        resolve(cachedCollegeBannerBase64);
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = '/public/grt-banner.png';
  });
}

/**
 * Fetches the official GRT College logo as Base64 PNG for crisp letterheads and badge crests
 */
function getCollegeLogoBase64() {
  if (cachedCollegeLogoBase64) return Promise.resolve(cachedCollegeLogoBase64);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 200;
        canvas.height = img.naturalHeight || img.height || 200;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        cachedCollegeLogoBase64 = canvas.toDataURL('image/png');
        resolve(cachedCollegeLogoBase64);
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = '/public/grt-logo.png';
  });
}

/**
 * Generates an ultra-clean, subtle watermark image of the GRT College Logo.
 * Uses an offscreen HTML canvas with a precisely calibrated opacity (0.075)
 * to ensure that the watermark:
 * 1. Appears authentically on every page as an official institutional seal.
 * 2. Does not compromise readability of text, barcodes, signatures, or tables.
 * 3. Works consistently across all PDF viewers, mobile devices, and print previews.
 */
function getCollegeLogoWatermarkBase64() {
  if (cachedCollegeLogoWatermarkBase64) return Promise.resolve(cachedCollegeLogoWatermarkBase64);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 600;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, size, size);
        ctx.globalAlpha = 0.075; // 7.5% subtle institutional watermark opacity
        ctx.drawImage(img, 0, 0, size, size);
        cachedCollegeLogoWatermarkBase64 = canvas.toDataURL('image/png');
        resolve(cachedCollegeLogoWatermarkBase64);
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = '/public/grt-logo.png';
  });
}

/**
 * Renders the GRT College Logo subtle watermark centered on the current jsPDF page
 * @param {jsPDF} doc The active jsPDF document instance
 * @param {string} [watermarkBase64] The base64 PNG data of the subtle watermark
 * @param {number} [customSize] Custom diameter/size in mm (defaults based on orientation)
 */
function renderPageWatermark(doc, watermarkBase64, customSize) {
  const wm = watermarkBase64 || cachedCollegeLogoWatermarkBase64;
  if (!doc || !wm) return;
  try {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const isLandscape = pageWidth > pageHeight;

    // Proportional size: ~95mm in portrait A4, ~105mm in landscape A4
    const size = customSize || (isLandscape ? 105 : 95);
    const x = (pageWidth - size) / 2;
    const y = (pageHeight - size) / 2;

    doc.addImage(wm, 'PNG', x, y, size, size, undefined, 'FAST');
  } catch (err) {
    console.warn('Could not render page watermark:', err);
  }
}

function formatLetterDate(dateStr) {
  if (!dateStr) return new Date().toLocaleDateString('en-GB');
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  } catch (e) {}
  return String(dateStr).split(' ')[0] || new Date().toLocaleDateString('en-GB');
}

/**
 * Downloads official institutional On-Duty (OD) formal letter PDF
 * @param {object} od On-Duty record
 */
async function downloadOnDutyLetterPDF(od) {
  if (!od) return showToast('No On-Duty record selected.', 'warning');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const logoBase64 = await getCollegeLogoBase64();
  const watermarkBase64 = await getCollegeLogoWatermarkBase64();
  const bannerBase64 = await getCollegeBannerBase64();

  const banner = bannerBase64 || cachedCollegeBannerBase64;
  const logo = logoBase64 || cachedCollegeLogoBase64;
  const watermark = watermarkBase64 || cachedCollegeLogoWatermarkBase64;

  // 1. Outer Border / Elegant Institutional Frame
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.rect(10, 10, 190, 277);

  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.2);
  doc.rect(12, 12, 186, 273);

  // Render Subtle Institutional College Logo Watermark
  renderPageWatermark(doc, watermark, 95);

  // 2. Official College Letterhead & Banner / Logo
  if (banner) {
    try {
      const bH = 26.5;
      const bW = bH * 2.914; // ~77.2mm
      const bX = (210 - bW) / 2;
      doc.addImage(banner, 'PNG', bX, 13.5, bW, bH);
    } catch (e) {
      console.warn('Could not render banner in On-Duty Letter PDF:', e);
    }
  } else {
    if (logo) {
      try {
        doc.addImage(logo, 'PNG', 15, 15, 22, 22);
      } catch (e) {
        console.warn('Could not render logo in PDF:', e);
      }
    }

    // College Letterhead Text
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // Deep Navy
    doc.text('GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY', 114, 19.5, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(71, 85, 105);
    doc.text('(Approved by AICTE, New Delhi | Affiliated to Anna University, Chennai)', 114, 24.5, { align: 'center' });

    doc.setFont('times', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(185, 28, 28); // Official Maroon Accent
    doc.text('(An Autonomous Institution | Accredited by NAAC with \'A++\' Grade)', 114, 29, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text('GRT Mahalaksmi Nagar, Chennai-Tirupati Highway, Tiruttani - 631 209.', 114, 33.5, { align: 'center' });

    const deptUpper = String(od.dept || 'ENGINEERING').toUpperCase();
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`DEPARTMENT OF ${deptUpper}`, 114, 38, { align: 'center' });
  }

  // Letterhead Horizontal Divider Line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(14, 41, 196, 41);

  doc.setDrawColor(217, 119, 6); // Subtle Gold Accent
  doc.setLineWidth(0.3);
  doc.line(14, 42, 196, 42);

  // 3. Date & Reference Number
  let curY = 48.5;
  const appliedDate = formatLetterDate(od.appliedTime);
  const refNum = `GRTIET/${deptUpper}/OD/2026/${od.rollNo}`;

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Ref: ${refNum}`, 16, curY);

  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Date: ${appliedDate}`, 194, curY, { align: 'right' });

  // 4. From Section
  curY = 55.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('From:', 16, curY);

  curY += 4.5;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${od.name || 'Student'} (Register No: ${od.rollNo}),`, 20, curY);
  curY += 4.5;
  doc.text(`${od.academicYear || '3 Year'}, Department of ${od.dept || 'Engineering'} (Section '${od.yearSec || 'A'}'),`, 20, curY);
  curY += 4.5;
  doc.text('GRT Institute of Engineering and Technology,', 20, curY);
  curY += 4.5;
  doc.text('Tiruttani - 631 209.', 20, curY);

  // 5. To Section
  curY += 6;
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('To:', 16, curY);

  curY += 4.5;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('The Head of the Department,', 20, curY);
  curY += 4.5;
  doc.text(`Department of ${od.dept || 'Engineering'},`, 20, curY);
  curY += 4.5;
  doc.text('GRT Institute of Engineering and Technology,', 20, curY);
  curY += 4.5;
  doc.text('Tiruttani - 631 209.', 20, curY);

  // 6. Through Section
  curY += 5.5;
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('(Through: Respective Class Counselor and Class Advisor)', 20, curY);

  // 7. Salutation & Subject
  curY += 7;
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Respected Sir / Madam,', 16, curY);

  curY += 6;
  doc.text('Subject: Requisition for Academic On-Duty (OD) Permission - Regarding.', 20, curY);

  // 8. Body Paragraph 1
  curY += 6;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  const body1 = 'I am writing to formally request On-Duty (OD) permission for myself to participate in / attend the specified academic engagement. The particulars of the proposed On-Duty engagement are detailed below:';
  const body1Lines = doc.splitTextToSize(body1, 178);
  doc.text(body1Lines, 16, curY, { lineHeightFactor: 1.35 });
  curY += body1Lines.length * 4.6 + 2;

  // 9. OD Particulars (Clean, formal institutional letter specification table)
  const scheduleText = od.mode === 'time'
    ? `${od.specificDate || od.fromDate || '-'} (from ${od.fromTime || '-'} to ${od.toTime || '-'})`
    : `From ${od.fromDate || '-'} to ${od.toDate || '-'}`;

  const placeEvent = String(od.placeEvent || od.event || '-').trim();
  const odReason = String(od.reason || '-').trim();
  const expectedReturn = String(od.expectedReturnTime || '-').trim();

  doc.autoTable({
    startY: curY,
    margin: { left: 16, right: 16 },
    body: [
      [
        { content: 'Place / Event', styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: placeEvent }
      ],
      [
        { content: 'OD Date & Time', styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: scheduleText }
      ],
      [
        { content: 'OD Reason / Purpose', styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: odReason }
      ],
      [
        { content: 'Expected Return Time', styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: expectedReturn }
      ]
    ],
    theme: 'grid',
    tableLineColor: [203, 213, 225],
    tableLineWidth: 0.2,
    styles: { font: 'times', fontSize: 9.2, cellPadding: 2.8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { width: 44, fillColor: [248, 250, 252], fontStyle: 'bold' },
      1: { width: 134 }
    }
  });

  curY = doc.lastAutoTable.finalY + 5;

  // 10. Body Paragraph 2
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  const body2 = 'I kindly request you to consider this requisition favorably, grant me On-Duty permission for the duration stated above, and award academic attendance for the same. I assure you that I will observe all institutional rules and proactively complete all lectures, assignments, and laboratory coursework missed during my absence.';
  const body2Lines = doc.splitTextToSize(body2, 178);
  doc.text(body2Lines, 16, curY, { lineHeightFactor: 1.35 });
  curY += body2Lines.length * 4.6 + 4;

  // 11. Thank You & Yours Faithfully
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Thanking You,', 16, curY);

  // Student Subscription (Right Side)
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Yours faithfully,', 148, curY);
  curY += 9;
  doc.setFont('times', 'bold');
  doc.text(`(${od.name || 'Student'})`, 148, curY);
  curY += 4.2;
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(`Roll No: ${od.rollNo}`, 148, curY);

  // 12. Proper Signature & Academic Endorsement Section
  curY = Math.max(curY + 7, 204);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(16, curY, 194, curY);
  curY += 4.5;

  doc.setFont('times', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(71, 85, 105);
  doc.text('OFFICIAL VERIFICATION & ACADEMIC ENDORSEMENT', 16, curY);

  const cApp = od.counselorApproval?.approved;
  const aApp = od.advisorApproval?.approved;
  const hApp = od.hodApproval?.approved;

  const counselorName = od.counselorApproval?.counselorName || od.counselorName || 'Assigned Counselor';
  const advisorName = od.advisorApproval?.advisorName || 'Class Advisor';
  const hodName = od.hodApproval?.hodName || 'Head of Department';

  const counselorStatus = cApp
    ? 'Recommended'
    : (od.status === 'Rejected' && /counselor/i.test(od.rejection?.role || '') ? 'REJECTED' : 'Pending');
  const advisorStatus = aApp
    ? 'Recommended'
    : (od.status === 'Rejected' && /advisor/i.test(od.rejection?.role || '') ? 'REJECTED' : (cApp ? 'Pending' : 'Queued'));
  const hodStatus = hApp
    ? 'Sanctioned & Approved'
    : (od.status === 'Rejected' && /hod/i.test(od.rejection?.role || '') ? 'REJECTED' : (aApp ? 'Pending' : 'Queued'));

  const cDate = od.counselorApproval?.time ? formatLetterDate(od.counselorApproval.time) : '-';
  const aDate = od.advisorApproval?.time ? formatLetterDate(od.advisorApproval.time) : '-';
  const hDate = od.hodApproval?.time ? formatLetterDate(od.hodApproval.time) : '-';

  const sigY = curY + 20;

  // Column 1: Student
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(16, sigY, 52, sigY);
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Signature of Student', 16, sigY + 4);
  doc.setFont('times', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text(od.name || 'Student', 16, sigY + 7.8);
  doc.text(`Date: ${appliedDate}`, 16, sigY + 11.4);

  // Column 2: Counselor
  doc.line(62, sigY, 98, sigY);
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Class Counselor', 62, sigY + 4);
  doc.setFont('times', 'bold');
  doc.setFontSize(7.8);
  if (cApp) doc.setTextColor(22, 101, 52);
  else if (counselorStatus === 'REJECTED') doc.setTextColor(190, 18, 60);
  else doc.setTextColor(100, 116, 139);
  doc.text(counselorStatus, 62, sigY + 7.8);
  doc.setFont('times', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(counselorName, 62, sigY + 11.4, { maxWidth: 36 });
  if (cApp && cDate !== '-') doc.text(`Date: ${cDate}`, 62, sigY + 15);

  // Column 3: Advisor
  doc.line(110, sigY, 146, sigY);
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Class Advisor', 110, sigY + 4);
  doc.setFont('times', 'bold');
  doc.setFontSize(7.8);
  if (aApp) doc.setTextColor(22, 101, 52);
  else if (advisorStatus === 'REJECTED') doc.setTextColor(190, 18, 60);
  else doc.setTextColor(100, 116, 139);
  doc.text(advisorStatus, 110, sigY + 7.8);
  doc.setFont('times', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(advisorName, 110, sigY + 11.4, { maxWidth: 36 });
  if (aApp && aDate !== '-') doc.text(`Date: ${aDate}`, 110, sigY + 15);

  // Column 4: HOD
  doc.line(156, sigY, 194, sigY);
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Head of Department', 156, sigY + 4);
  doc.setFont('times', 'bold');
  doc.setFontSize(7.8);
  if (hApp) doc.setTextColor(22, 101, 52);
  else if (hodStatus === 'REJECTED') doc.setTextColor(190, 18, 60);
  else doc.setTextColor(100, 116, 139);
  doc.text(hodStatus, 156, sigY + 7.8);
  doc.setFont('times', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(hodName, 156, sigY + 11.4, { maxWidth: 38 });
  if (hApp && hDate !== '-') doc.text(`Date: ${hDate}`, 156, sigY + 15);

  // Rejection Banner if rejected
  if (od.status === 'Rejected') {
    const rejY = sigY + 19;
    doc.setDrawColor(244, 63, 94);
    doc.setFillColor(255, 241, 242);
    doc.roundedRect(16, rejY, 178, 11, 1.5, 1.5, 'FD');
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(159, 18, 57);
    doc.text(
      `Rejection Endorsement: Requisition was declined by ${od.rejection?.roleTitle || 'Authority'} (${od.rejection?.rejectedBy || '-'}). Reason: "${od.rejection?.reason || '-'}" (${od.rejection?.time || '-'})`,
      19,
      rejY + 6.8,
      { maxWidth: 172 }
    );
  } else if (hApp) {
    const appY = sigY + 19;
    doc.setDrawColor(34, 197, 94);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(16, appY, 178, 9, 1.5, 1.5, 'FD');
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    doc.text(
      'Official Endorsement: On-Duty (OD) is fully authorized under GRT Autonomous Regulations. Attendance granted for stated duration.',
      19,
      appY + 5.8
    );
  }

  // 13. Institutional Footer
  doc.setFont('times', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'GRT Institute of Engineering and Technology • Official Academic On-Duty Letter • Campus PassPro',
    105,
    284,
    { align: 'center' }
  );

  doc.save(`GRTIET_OD_Letter_${od.rollNo}_${Date.now()}.pdf`);
  showToast(`Official OD letter PDF downloaded for Roll No: ${od.rollNo}`, 'success');
}

/**
 * Export all pass records within authority jurisdiction as CSV
 */
async function downloadAllRecordsCSV() {
  const passes = await getEffectivePassList();
  if (!passes || passes.length === 0) {
    return showToast('No pass records found to export.', 'warning');
  }

  const headers = [
    'Roll No',
    'Student Name',
    'Department',
    'Section',
    'Academic Year',
    'Gender',
    'Accommodation',
    'Parent Contact',
    'Student Mobile',
    'Applied Time (IST)',
    'Reason for Leave',
    'Counselor Clearance',
    'Advisor Clearance',
    'HOD Clearance',
    'Principal Clearance',
    'Warden Clearance',
    'Overall Status'
  ];

  const escapeCSV = val => {
    const s = String(val === null || val === undefined ? '' : val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = passes.map(p => [
    escapeCSV(p.rollNo),
    escapeCSV(p.name),
    escapeCSV(p.dept),
    escapeCSV(p.yearSec),
    escapeCSV(p.academicYear || '3 Year'),
    escapeCSV(p.gender || 'Male'),
    escapeCSV(p.accommodation || 'Day Scholar'),
    escapeCSV(p.parentContact || '-'),
    escapeCSV(p.mobile || '-'),
    escapeCSV(p.appliedTime || '-'),
    escapeCSV(p.reason || ''),
    escapeCSV(p.counselorApproval?.time || p.parentCallTime || '-'),
    escapeCSV(p.advisorApproval?.time || '-'),
    escapeCSV(p.hodApproval?.time || '-'),
    escapeCSV(p.principalApproval?.time || p.approvalTime || '-'),
    escapeCSV(p.wardenApproval?.time || '-'),
    escapeCSV(p.status || '-')
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `GRTIET_All_Records_${loggedUser?.role || 'export'}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('All records CSV exported successfully!', 'success');
}

window.downloadMasterPDF = downloadMasterPDF;
window.downloadAllCompleteLettersPDF = downloadAllCompleteLettersPDF;
window.downloadOfficialLetterOnlyPDF = downloadOfficialLetterOnlyPDF;
window.downloadGatePassCardPDF = downloadGatePassCardPDF;
window.downloadGatePassPDF = downloadGatePassCardPDF;
window.renderProfessionalGatePassCardPage = renderProfessionalGatePassCardPage;
window.renderOfficialGatePassLetterPage = renderOfficialGatePassLetterPage;
window.downloadSinglePassPDF = downloadSinglePassPDF;
window.downloadOnDutyLetterPDF = downloadOnDutyLetterPDF;
window.downloadAllRecordsCSV = downloadAllRecordsCSV;
window.getCollegeLogoBase64 = getCollegeLogoBase64;
window.getCollegeLogoWatermarkBase64 = getCollegeLogoWatermarkBase64;
window.getCollegeBannerBase64 = getCollegeBannerBase64;
window.renderPageWatermark = renderPageWatermark;

// Pre-cache official college logo, watermark & banner upon script load
try {
  getCollegeLogoBase64().catch(() => {});
  getCollegeLogoWatermarkBase64().catch(() => {});
  getCollegeBannerBase64().catch(() => {});
} catch (e) {}
