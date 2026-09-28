/**
 * jsPDF Report Generation Service - Enterprise Institutional Formats
 */

function safeFormatClassSection(dept, rawSec, academicYear) {
  if (typeof window !== 'undefined' && typeof window.formatClassSection === 'function') {
    return window.formatClassSection(dept, rawSec, academicYear);
  }
  if (typeof formatClassSection === 'function') {
    return formatClassSection(dept, rawSec, academicYear);
  }
  const yearStr = academicYear || 'III Year';
  if (!rawSec) return `${yearStr} • ${dept || 'CSE'} - Section A`;
  const match = String(rawSec).trim().toUpperCase().match(/\b([A-D])\b/);
  const letter = match ? match[1] : 'A';
  return `${yearStr} • ${dept || 'CSE'} - Sec ${letter}`;
}

/**
 * Resolves pass records from window.masterPassList, window.cachedAllRecords, or live API query
 */
async function getEffectivePassList() {
  if (window.masterPassList && Array.isArray(window.masterPassList) && window.masterPassList.length > 0) {
    const nonOD = window.masterPassList.filter(p => !p.isOD && !p.odLetter);
    if (nonOD.length > 0) return nonOD;
  }
  if (window.cachedAllRecords && Array.isArray(window.cachedAllRecords) && window.cachedAllRecords.length > 0) {
    const nonOD = window.cachedAllRecords.filter(p => !p.isOD && !p.odLetter);
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
      if (u.userId) params.append('authorityUserId', u.userId);
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
    const nonOD = list.filter(p => !p.isOD && !p.odLetter);
    window.masterPassList = nonOD;
    return nonOD;
  } catch (err) {
    console.error('Failed to load pass list for PDF export:', err);
    return [];
  }
}

/**
 * Resolves OD (On-Duty) records for all authorities (Counselor, Advisor, HOD, Principal, Warden)
 */
async function getEffectiveODList() {
  const u = window.loggedUser;
  if (!u || u.role === 'student') {
    return [];
  }

  if (window.cachedAllRecords && Array.isArray(window.cachedAllRecords) && window.cachedAllRecords.length > 0) {
    const odRecords = window.cachedAllRecords.filter(p => p.isOD === true || !!p.odLetter);
    if (odRecords.length > 0) return odRecords;
  }

  try {
    let url = '/api/onduty';
    const params = new URLSearchParams();
    params.append('role', u.role);
    if (u.userId) params.append('authorityUserId', u.userId);
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
 * One PDF containing separate Gate Pass List and OD List sections.
 * Incorporates GRT Institute of Engineering and Technology branding and official college logo.
 */
async function downloadMasterPDF() {
  const u = window.loggedUser;

  const passes = await getEffectivePassList();
  const odList = await getEffectiveODList();

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
    const logo = logoBase64 || cachedCollegeLogoBase64;
    const watermark = watermarkBase64 || cachedCollegeLogoWatermarkBase64;

    // Render subtle official watermark centered in landscape page
    if (watermark) {
      renderPageWatermark(doc, watermark, 105);
    }

    // Top banner background (Deep Institutional Navy)
    doc.setFillColor(15, 23, 42);
    doc.rect(9.5, 9.5, 278, 27, 'F');

    // Official College Logo Badge specifications (vertically centered in 27mm header with 1.7mm breathing room)
    const badgeW = 23.6;
    const badgeH = 23.6;
    const badgeY = 11.2;
    const badgeR = 2.5;
    const logoSize = 21.0;

    if (logo) {
      try {
        // Left Badge & Official Logo (proportional 1:1, 1.3mm padding all around inside badge)
        const leftBadgeX = 14.0;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(leftBadgeX, badgeY, badgeW, badgeH, badgeR, badgeR, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(leftBadgeX, badgeY, badgeW, badgeH, badgeR, badgeR, 'D');

        const leftLogoX = leftBadgeX + (badgeW - logoSize) / 2;
        const logoY = badgeY + (badgeH - logoSize) / 2;
        doc.addImage(logo, 'PNG', leftLogoX, logoY, logoSize, logoSize);

        // Symmetrical Right Badge & Official Logo (balanced bilateral crest alignment across 278mm landscape)
        const rightBadgeX = 287.5 - 4.5 - badgeW;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(rightBadgeX, badgeY, badgeW, badgeH, badgeR, badgeR, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(rightBadgeX, badgeY, badgeW, badgeH, badgeR, badgeR, 'D');

        const rightLogoX = rightBadgeX + (badgeW - logoSize) / 2;
        doc.addImage(logo, 'PNG', rightLogoX, logoY, logoSize, logoSize);
      } catch (e) {
        console.warn('Could not add logo to Master Audit PDF:', e);
      }
    }

    // College Header Typography - Mathematically centered in landscape page (X = 148.5mm)
    const centerX = 148.5;
    doc.setFont('times', 'bold');
    doc.setFontSize(13.8);
    doc.setTextColor(255, 255, 255);
    doc.text('GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY', centerX, 16.8, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(226, 232, 240);
    doc.text('(An Autonomous Institution | Accredited by NAAC with \'A++\' Grade | Approved by AICTE, New Delhi)', centerX, 21.8, { align: 'center' });

    doc.setFontSize(7.6);
    doc.setTextColor(203, 213, 225);
    doc.text('Affiliated to Anna University, Chennai • Chennai-Tirupati Highway, Tiruttani - 631 209', centerX, 26.2, { align: 'center' });

    doc.setFont('times', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(253, 224, 71); // Official Gold accent
    doc.text(`MASTER AUDITING DOSSIER • JURISDICTION: ${jurisdictionStr}`, centerX, 31.8, { align: 'center' });

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
    const standing = `${safeFormatClassSection(p.dept, p.yearSec, p.academicYear)} [${accomLabel}]`;

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

  if (!passes || passes.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(9.5, 60, 278, 22, 2, 2, 'FD');
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`No Gate Pass requisitions registered under active jurisdiction (${jurisdictionStr}).`, 148, 72, { align: 'center' });
  } else {
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
  }

  // ==========================================
  // SECTION 2: ON-DUTY (OD) AUDIT LIST
  // ==========================================
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
  const logo = logoBase64 || cachedCollegeLogoBase64;
  const watermark = watermarkBase64 || cachedCollegeLogoWatermarkBase64;

  const deptUpper = String(pass.dept || 'ENGINEERING').toUpperCase();

  // 1. Elegant Double Institutional Border
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.rect(10, 10, 190, 277);

  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.2);
  doc.rect(12, 12, 186, 273);

  // Render Subtle Institutional College Logo Watermark
  renderPageWatermark(doc, watermark, 95);

  // 2. Official College Letterhead - GRT Logo on left with centered institutional typography
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 15, 14.5, 22, 22);
    } catch (e) {
      console.warn('Could not render logo in PDF:', e);
    }
  }

  // College Letterhead Typography (Centered)
  doc.setFont('times', 'bold');
  doc.setFontSize(13.8);
  doc.setTextColor(15, 23, 42); // Deep Navy
  doc.text('GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY', 114, 18.5, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text('(Approved by AICTE, New Delhi | Affiliated to Anna University, Chennai)', 114, 23.2, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(185, 28, 28); // Official Maroon Accent
  doc.text('(An Autonomous Institution | Accredited by NAAC with \'A++\' Grade)', 114, 27.6, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(100, 116, 139);
  doc.text('GRT Mahalakshmi Nagar, Chennai-Tirupati Highway, Tiruttani - 631 209.', 114, 31.8, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`DEPARTMENT OF ${deptUpper}`, 114, 36.2, { align: 'center' });

  // Clearly mention GATE PASS LETTER
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('GATE PASS LETTER', 114, 41.5, { align: 'center' });

  // Letterhead Horizontal Divider Line (Deep Navy + Gold Accent)
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(14, 45, 196, 45);

  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.3);
  doc.line(14, 46, 196, 46);

  // 3. Date & Reference Number
  let curY = 52.5;
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

  // 4. From Section - Formal student letter
  curY = 57.5;
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
  doc.text(`${pass.studentName || pass.name || 'Student'} (Register No: ${pass.rollNo || pass.registrationNumber || '-'}),`, 20, curY);
  curY += 4.5;
  doc.text(`Father's Name: ${pass.fatherName || pass.parentName || '-'}   |   Parent Phone: ${pass.parentPhone || pass.parentContact || '-'},`, 20, curY);
  curY += 4.5;
  doc.text(`${pass.academicYear || '3 Year'}, Department of ${pass.dept || 'Engineering'} (Section '${pass.yearSec || 'A'}'),`, 20, curY);
  curY += 4.5;
  doc.text(`Accommodation: ${accommodationStr},`, 20, curY);
  curY += 4.5;
  doc.text('GRT Institute of Engineering and Technology, Tiruttani - 631 209.', 20, curY);

  // 5. Through Section
  curY += 5.5;
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('(Through: Respective Class Counselor, Class Advisor, and Head of Department)', 20, curY);

  // 6. To Section - Strictly The Principal
  curY += 5.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('To:', 16, curY);

  curY += 4.5;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('The Principal,', 20, curY);
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
  doc.text('Subject: Requisition for Authorized Campus Gate Pass Clearance - Regarding.', 20, curY);

  // 8. Formal Letter Body
  curY += 7;
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);

  const body1 = 'I am writing to request permission for an official Gate Pass to leave the college campus due to the following purpose:';
  const body1Lines = doc.splitTextToSize(body1, 178);
  doc.text(body1Lines, 16, curY, { lineHeightFactor: 1.3 });
  curY += body1Lines.length * 4.6 + 4.4;

  // Gate Pass Reason clearly highlighted in the middle
  const gatePassReason = String(pass.reason || '-').trim();
  const reasonText = `"${gatePassReason}"`;
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const reasonLines = doc.splitTextToSize(reasonText, 150);
  doc.text(reasonLines, 105, curY, { align: 'center', lineHeightFactor: 1.3 });
  curY += reasonLines.length * 5.2 + 3.8;

  const depStr = `Departure: ${pass.departureDate || '-'}${pass.departureTime ? ' at ' + pass.departureTime : ''}`;
  const retStr = `Return: ${pass.expectedReturnDate || pass.returnDate || '-'}${pass.expectedReturnTime || pass.returnTime ? ' at ' + (pass.expectedReturnTime || pass.returnTime) : ''}`;
  const destStr = pass.destination || pass.placeOrEvent ? `Destination: ${pass.destination || pass.placeOrEvent}` : '';
  const hostelStr = isHosteller && (pass.hostelRoom || pass.hostelBlock) ? `Hostel: Block ${pass.hostelBlock || 'A'}, Room ${pass.hostelRoom || '-'}` : '';

  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  const schedLine = `${depStr}   |   ${retStr}`;
  doc.text(schedLine, 105, curY, { align: 'center' });
  curY += 5;

  if (destStr || hostelStr) {
    const extraLine = [destStr, hostelStr].filter(Boolean).join('   |   ');
    doc.text(extraLine, 105, curY, { align: 'center' });
    curY += 5;
  }

  // Short concluding declaration
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
  curY += 7.5;
  doc.setFont('times', 'bold');
  doc.text(`(${pass.studentName || pass.name || 'Student'})`, 148, curY);
  curY += 4.2;
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(`Roll No: ${pass.rollNo || pass.registrationNumber || '-'}`, 148, curY);

  // 12. Signature & Multi-Tier Institutional Clearance Section
  curY = Math.max(curY + 5, 202);

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

  const sigY = curY + 16;

  // Day Scholar = 5 columns, Hosteller = 6 columns (Warden NEVER rendered for Day Scholar!)
  let cols = [];
  if (isHosteller) {
    const colWidth = 26.5;
    const colGap = 3.5;
    cols = [
      { title: 'Student Signature', name: pass.studentName || pass.name || 'Student', status: 'Submitted', isApproved: true, date: appliedDate, x: 16 },
      { title: 'Class Counselor', name: counselorName, status: counselorStatus, isApproved: cApp, date: cDate, x: 16 + (colWidth + colGap) },
      { title: 'Class Advisor', name: advisorName, status: advisorStatus, isApproved: aApp, date: aDate, x: 16 + (colWidth + colGap) * 2 },
      { title: 'Head of Dept', name: hodName, status: hodStatus, isApproved: hApp, date: hDate, x: 16 + (colWidth + colGap) * 3 },
      { title: 'Principal Directorate', name: principalName, status: principalStatus, isApproved: pApp, date: pDate, x: 16 + (colWidth + colGap) * 4 },
      { title: 'Hostel Warden', name: wardenName, status: wardenStatus, isApproved: wApp, date: wDate, x: 16 + (colWidth + colGap) * 5 }
    ];
  } else {
    const colWidth = 33.2;
    const colGap = 3.0;
    cols = [
      { title: 'Student Signature', name: pass.studentName || pass.name || 'Student', status: 'Submitted', isApproved: true, date: appliedDate, x: 16 },
      { title: 'Class Counselor', name: counselorName, status: counselorStatus, isApproved: cApp, date: cDate, x: 16 + (colWidth + colGap) },
      { title: 'Class Advisor', name: advisorName, status: advisorStatus, isApproved: aApp, date: aDate, x: 16 + (colWidth + colGap) * 2 },
      { title: 'Head of Dept', name: hodName, status: hodStatus, isApproved: hApp, date: hDate, x: 16 + (colWidth + colGap) * 3 },
      { title: 'Principal Directorate', name: principalName, status: principalStatus, isApproved: pApp, date: pDate, x: 16 + (colWidth + colGap) * 4 }
    ];
  }

  cols.forEach(col => {
    const colW = isHosteller ? 26.5 : 33.2;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(col.x, sigY, col.x + colW, sigY);
    doc.setFont('times', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text(col.title, col.x, sigY + 3.8);

    doc.setFont('times', 'bold');
    doc.setFontSize(7.2);
    if (col.isApproved) doc.setTextColor(22, 101, 52);
    else if (col.status === 'REJECTED') doc.setTextColor(190, 18, 60);
    else doc.setTextColor(100, 116, 139);
    doc.text(col.status, col.x, sigY + 7.4);

    doc.setFont('times', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text(col.name, col.x, sigY + 10.8, { maxWidth: colW });
    if (col.isApproved && col.date !== '-') doc.text(`Date: ${col.date}`, col.x, sigY + 14.2);
  });

  // Institutional Clearance Endorsement Box
  const endY = sigY + 17;
  if (pass.status === 'Rejected') {
    doc.setDrawColor(244, 63, 94);
    doc.setFillColor(255, 241, 242);
    doc.roundedRect(16, endY, 178, 11, 1.5, 1.5, 'FD');
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(159, 18, 57);
    const rejMsg = `Rejection Endorsement: Requisition declined by ${pass.rejection?.roleTitle || pass.rejectedBy || 'Authority'}. Reason: "${pass.rejection?.reason || pass.rejectionReason || 'Not approved'}"`;
    const rejLines = doc.splitTextToSize(rejMsg, 172);
    doc.text(rejLines, 19, endY + 4.8);
  } else if (pApp || pass.status === 'Approved' || pass.status === 'Completed' || pass.exitStatus === 'Exited Campus' || pass.exitStatus === 'Returned to College') {
    doc.setDrawColor(34, 197, 94);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(16, endY, 178, 11, 1.5, 1.5, 'FD');
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    const appMsg = 'Official Endorsement: Gate Pass authorized under GRT Institutional Clearance Regulations. Campus security is instructed to permit egress/ingress per recorded departure and expected return schedule.';
    const appLines = doc.splitTextToSize(appMsg, 172);
    doc.text(appLines, 19, endY + 4.5);
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

  // 13. Institutional Footer (Clean 4mm breathing room above inner border at 285)
  doc.setFont('times', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'GRT Institute of Engineering and Technology • Official Campus Gate Pass Letter • Campus PassPro',
    105,
    281,
    { align: 'center' }
  );
}

/**
 * Downloads a unified dossier of all official requisition letters in current jurisdiction
 * (One single PDF containing both Gate Pass Letters and OD Letters)
 */
async function downloadAllCompleteLettersPDF() {
  const passes = await getEffectivePassList();
  const odList = await getEffectiveODList();

  const totalLetters = (passes?.length || 0) + (odList?.length || 0);
  if (totalLetters === 0) {
    return showToast('No requisition letters found to export.', 'warning');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = await getCollegeLogoBase64();
  const watermarkBase64 = await getCollegeLogoWatermarkBase64();
  const bannerBase64 = await getCollegeBannerBase64();

  let pageIndex = 0;

  // 1. Render all Gate Pass Letters
  (passes || []).forEach(pass => {
    if (pageIndex > 0) doc.addPage();
    renderOfficialGatePassLetterPage(doc, pass, logoBase64, watermarkBase64, bannerBase64);
    pageIndex++;
  });

  // 2. Render all On-Duty (OD) Letters
  (odList || []).forEach(od => {
    if (pageIndex > 0) doc.addPage();
    renderOfficialODLetterPage(doc, od, logoBase64, watermarkBase64, bannerBase64);
    pageIndex++;
  });

  const uRole = window.loggedUser?.role || 'dossier';
  doc.save(`GRTIET_All_Letters_${uRole}_${Date.now()}.pdf`);
  showToast(`All letters exported (${passes?.length || 0} Gate Passes, ${odList?.length || 0} OD Letters)!`, 'success');
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
/**
 * Helper to generate QR code data URL for official Gate Pass verification
 */
function getGatePassQrBase64(pass, gatePassId, rollNo, finalAuth, depDate, depTime) {
  return new Promise((resolve) => {
    try {
      const studentName = pass.studentName || pass.name || 'Student';
      const qrPayload = encodeURIComponent(`GRT_INSTITUTIONAL_GATE_PASS|ID:${gatePassId}|STUDENT:${studentName}|ROLL:${rollNo}|STATUS:APPROVED|AUTHORITY:${finalAuth}|DEPARTURE:${depDate} ${depTime}`);
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      const timeoutId = setTimeout(() => resolve(null), 1500);
      img.onload = () => {
        clearTimeout(timeoutId);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 140;
          canvas.height = img.naturalHeight || 140;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(null);
      };
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qrPayload}`;
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * Renders an Authentic, Official College Gate Pass Document
 * Follows genuine institutional certificate standards:
 * - Proper typography, spacing, borders, and authorization sections
 * - Pure white background, zero artificial neon colors or emojis
 * - Fully incorporates all 16 required particulars and movement details
 */
function renderProfessionalGatePassCardPage(doc, pass, logoBase64, watermarkBase64, bannerBase64, qrBase64) {
  const logo = logoBase64 || cachedCollegeLogoBase64;
  const watermark = watermarkBase64 || cachedCollegeLogoWatermarkBase64;

  const isHosteller = (/hoste?l|^h$/i.test(pass.accommodation || '') && !/day\s*scholar/i.test(pass.accommodation || ''));
  const deptUpper = String(pass.dept || 'ENGINEERING').toUpperCase();
  const studentName = pass.studentName || pass.name || 'Student';
  const rollNo = pass.rollNo || pass.registrationNumber || '-';

  // Gate Pass ID
  const yr = new Date(pass.createdAt || Date.now()).getFullYear();
  const fallbackId = `GRT-GP-${yr}-${String(pass._id || '').slice(-4).toUpperCase() || '1048'}`;
  const gatePassId = pass.gatePassId || fallbackId;

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
  }

  const depDate = pass.departureDate || pass.leaveDate || '-';
  const depTime = pass.departureTime || pass.leaveTime || '-';
  const depTimeFormatted = typeof formatTime12 === 'function' ? formatTime12(depTime) : depTime;

  let retDisplay = 'N/A (Day Scholar Outpass)';
  if (isHosteller) {
    const retDate = pass.expectedReturnDate || pass.returnDate || '';
    const retTime = pass.expectedReturnTime || pass.returnTime || '';
    if (retDate && retTime) {
      retDisplay = `${retDate} at ${typeof formatTime12 === 'function' ? formatTime12(retTime) : retTime}`;
    } else if (retDate) {
      retDisplay = retDate;
    } else if (pass.expectedReturnDateTime) {
      retDisplay = pass.expectedReturnDateTime;
    } else {
      retDisplay = 'Authorized Institutional Hours';
    }
  }

  const parentContact = pass.parentContact || pass.contactNumber || pass.mobile || '-';
  const approvalTime = pass.finalApprovalTime || pass.approvalTime || pass.principalApproval?.time || pass.wardenApproval?.time || pass.appliedTime || '-';
  const verifyCode = `GRT-VERIFY-${rollNo}-${String(gatePassId).replace(/[^A-Za-z0-9]/g, '')}`;

  // 1. Page & Border Geometry
  const cardX = 14;
  const cardY = 13;
  const cardWidth = 182;
  const cardHeight = 271;
  const centerX = cardX + cardWidth / 2;

  // Outer Deep Border
  doc.setDrawColor(15, 23, 42); // Formal Slate-900
  doc.setLineWidth(0.8);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'D');

  // Inner Hairline Frame
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.25);
  doc.roundedRect(cardX + 1.2, cardY + 1.2, cardWidth - 2.4, cardHeight - 2.4, 1.5, 1.5, 'D');

  // Watermark
  if (watermark) {
    renderPageWatermark(doc, watermark, 85);
  }

  // 2. Official College Masthead Header
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', cardX + 4, cardY + 4, 21, 21);
    } catch (e) {
      console.warn('Could not add logo to Gate Pass PDF:', e);
    }
  }

  // QR Code on top right (if available)
  if (qrBase64) {
    try {
      doc.addImage(qrBase64, 'PNG', cardX + cardWidth - 25, cardY + 4, 21, 21);
    } catch (e) {
      console.warn('Could not add QR to Gate Pass PDF:', e);
    }
  } else {
    // Crisp formal security validation block if QR unavailable
    const qBoxX = cardX + cardWidth - 25;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.rect(qBoxX, cardY + 4, 21, 21, 'FD');
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    doc.text('INSTITUTE', qBoxX + 10.5, cardY + 11, { align: 'center' });
    doc.text('GATE PASS', qBoxX + 10.5, cardY + 15, { align: 'center' });
    doc.text('SECURITY', qBoxX + 10.5, cardY + 19, { align: 'center' });
  }

  // Centered Institution Text
  doc.setFont('times', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  doc.text('GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY', centerX, cardY + 8.5, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('(An Autonomous Institution | Approved by AICTE, New Delhi | Affiliated to Anna University, Chennai)', centerX, cardY + 13, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 41, 59);
  doc.text('Accredited by NAAC with \'A++\' Grade', centerX, cardY + 17, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('GRT Mahalaksmi Nagar, Tiruttani - 631 209, Tiruvallur District, Tamil Nadu', centerX, cardY + 21, { align: 'center' });

  // Divider Rules
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(cardX + 3, cardY + 27, cardX + cardWidth - 3, cardY + 27);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(cardX + 3, cardY + 28, cardX + cardWidth - 3, cardY + 28);

  // 3. Document Title & Identity Bar
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('GATE PASS', centerX, cardY + 34, { align: 'center' });

  // Sub-bar Box
  const subBoxY = cardY + 36.5;
  const subBoxH = 7.5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(cardX + 3, subBoxY, cardWidth - 6, subBoxH, 'FD');

  doc.setFont('times', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('PASS ID: ', cardX + 6, subBoxY + 5.2);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(gatePassId, cardX + 22, subBoxY + 5.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(isHosteller ? 146 : 30, isHosteller ? 64 : 58, isHosteller ? 14 : 138);
  doc.text(isHosteller ? 'CATEGORY: HOSTELLER' : 'CATEGORY: DAY SCHOLAR', centerX, subBoxY + 5.2, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text('OFFICIALLY APPROVED & ISSUED', cardX + cardWidth - 6, subBoxY + 5.2, { align: 'right' });

  // 4. Tabular Particulars Grid (Official College Document Table)
  const tblX = cardX + 3;
  let curY = cardY + 47;
  const tblW = cardWidth - 6; // 176mm
  const col1W = 42;
  const col2W = 46;
  const col3W = 42;
  const col4W = 46;

  function renderTableRow(label1, val1, label2, val2, rowH, isFontMono1 = false, isFontMono2 = false) {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);

    // Col 1 (Label)
    doc.setFillColor(248, 250, 252);
    doc.rect(tblX, curY, col1W, rowH, 'FD');
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(label1, tblX + 2.5, curY + rowH / 2 + 1.5);

    // Col 2 (Value)
    doc.setFillColor(255, 255, 255);
    doc.rect(tblX + col1W, curY, col2W, rowH, 'FD');
    doc.setFont(isFontMono1 ? 'courier' : 'times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(val1 || '-'), tblX + col1W + 2.5, curY + rowH / 2 + 1.5, { maxWidth: col2W - 4 });

    // Col 3 (Label)
    doc.setFillColor(248, 250, 252);
    doc.rect(tblX + col1W + col2W, curY, col3W, rowH, 'FD');
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(label2, tblX + col1W + col2W + 2.5, curY + rowH / 2 + 1.5);

    // Col 4 (Value)
    doc.setFillColor(255, 255, 255);
    doc.rect(tblX + col1W + col2W + col3W, curY, col4W, rowH, 'FD');
    doc.setFont(isFontMono2 ? 'courier' : 'times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(val2 || '-'), tblX + col1W + col2W + col3W + 2.5, curY + rowH / 2 + 1.5, { maxWidth: col4W - 4 });

    curY += rowH;
  }

  // Row 1: Student Name | Register Number
  renderTableRow('Student Name', studentName, 'Register Number', rollNo, 7.8, false, true);

  // Row 2: Department | Year and Section
  renderTableRow('Department', `Dept of ${pass.dept || 'Engineering'}`, 'Year and Section', `${pass.academicYear || 'III Year'} / Sec '${pass.yearSec || 'A'}'`, 7.8);

  // Row 3: Day Scholar / Hosteller status | Parent Contact
  renderTableRow('Student Status', isHosteller ? 'Hosteller (Resident)' : 'Day Scholar', 'Parent / Guardian Contact', parentContact, 7.8, false, true);

  // Row 4: Date of Leaving | Time of Leaving
  renderTableRow('Date of Leaving', depDate, 'Time of Leaving', depTimeFormatted, 7.8, true, true);

  // Row 5: Expected Return Time | Final Approving Authority
  renderTableRow('Expected Return Time', retDisplay, 'Final Approving Authority', finalAuth, 7.8, true, false);

  // Row 6: Reason for Leaving (Spanning full width across Cols 2-4)
  const reasonH = 12.5;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.setFillColor(248, 250, 252);
  doc.rect(tblX, curY, col1W, reasonH, 'FD');
  doc.setFont('times', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Reason for Leaving', tblX + 2.5, curY + 5);

  doc.setFillColor(255, 255, 255);
  doc.rect(tblX + col1W, curY, tblW - col1W, reasonH, 'FD');
  doc.setFont('times', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  const destStr = pass.destination || pass.placeOrEvent ? ` (Destination: ${pass.destination || pass.placeOrEvent})` : '';
  const fullReason = `${pass.reason || '-'}${destStr}`;
  const rLines = doc.splitTextToSize(fullReason, tblW - col1W - 5);
  doc.text(rLines, tblX + col1W + 2.5, curY + 4.5);
  curY += reasonH;

  // Row 7: Approval Date and Time | Verification Code
  renderTableRow('Approval Date & Time', approvalTime, 'Verification Code', verifyCode, 7.8, true, true);

  // 5. Multi-Tier Institutional Clearance Badges
  curY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('INSTITUTIONAL CLEARANCES & DIGITAL VERIFICATIONS', tblX, curY);

  curY += 3.5;
  const numSigners = isHosteller ? 5 : 4;
  const colW = (tblW - (numSigners - 1) * 3) / numSigners;

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
        { role: 'Warden (Final)', name: wardenName, status: 'APPROVED', date: wDate }
      ]
    : [
        { role: 'Counselor', name: counselorName, status: 'APPROVED', date: cDate },
        { role: 'Advisor', name: advisorName, status: 'APPROVED', date: aDate },
        { role: 'HOD', name: hodName, status: 'APPROVED', date: hDate },
        { role: 'Principal (Final)', name: principalName, status: 'APPROVED', date: pDate }
      ];

  approvalBlocks.forEach((b, idx) => {
    const bx = tblX + idx * (colW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.rect(bx, curY, colW, 23, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(30, 41, 59);
    doc.text(b.role, bx + colW / 2, curY + 4.8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52);
    doc.text('APPROVED', bx + colW / 2, curY + 9.5, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text(b.name, bx + colW / 2, curY + 14.5, { align: 'center', maxWidth: colW - 2 });

    if (b.date !== '-') {
      doc.setFont('courier', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(b.date, bx + colW / 2, curY + 19.5, { align: 'center' });
    }
  });

  curY += 28;

  // 6. Security Gate Ingress & Egress Clearance Records
  const secBoxW = (tblW - 4) / 2;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(tblX, curY, secBoxW, 25, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text('CAMPUS EXIT CLEARANCE (MAIN GATE OUT)', tblX + 3.5, curY + 5.5);

  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);
  if (pass.exitTime && pass.exitTime !== '-') {
    doc.setTextColor(15, 23, 42);
    doc.text(`Actual Departure Time: ${pass.exitTime}`, tblX + 3.5, curY + 12.5);
  } else {
    doc.setTextColor(148, 163, 184);
    doc.text('Actual Departure: ___________________________', tblX + 3.5, curY + 12.5);
  }
  doc.setTextColor(148, 163, 184);
  doc.text('Security Officer Signature: __________________', tblX + 3.5, curY + 20);

  // Return Box
  doc.rect(tblX + secBoxW + 4, curY, secBoxW, 25, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text('CAMPUS RE-ENTRY CLEARANCE (MAIN GATE IN)', tblX + secBoxW + 7.5, curY + 5.5);

  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);
  if (pass.returnTime && pass.returnTime !== '-') {
    doc.setTextColor(15, 23, 42);
    doc.text(`Actual Return Time: ${pass.returnTime}`, tblX + secBoxW + 7.5, curY + 12.5);
  } else {
    doc.setTextColor(148, 163, 184);
    doc.text('Actual Return: ______________________________', tblX + secBoxW + 7.5, curY + 12.5);
  }
  doc.setTextColor(148, 163, 184);
  doc.text('Security Officer Signature: __________________', tblX + secBoxW + 7.5, curY + 20);

  curY += 30;

  // 7. Authorized Signature Section (3-Column Authentic College Layout)
  const sigColW = (tblW - 6) / 3;

  // Column 1: Student Signature
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.rect(tblX, curY, sigColW, 24, 'FD');
  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(studentName, tblX + sigColW / 2, curY + 9, { align: 'center', maxWidth: sigColW - 4 });
  doc.setDrawColor(148, 163, 184);
  doc.line(tblX + 5, curY + 14, tblX + sigColW - 5, curY + 14);
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Signature of Student', tblX + sigColW / 2, curY + 19, { align: 'center' });

  // Column 2: Final Approving Authority
  const col2X = tblX + sigColW + 3;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(col2X, curY, sigColW, 24, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text('DIGITALLY AUTHENTICATED', col2X + sigColW / 2, curY + 6.5, { align: 'center' });
  doc.setFont('times', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(finalAuth, col2X + sigColW / 2, curY + 11.5, { align: 'center', maxWidth: sigColW - 4 });
  doc.setDrawColor(148, 163, 184);
  doc.line(col2X + 5, curY + 14, col2X + sigColW - 5, curY + 14);
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(isHosteller ? 'Warden Final Approval' : 'Principal Final Approval', col2X + sigColW / 2, curY + 19, { align: 'center' });

  // Column 3: Security Gate Officer
  const col3X = col2X + sigColW + 3;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.rect(col3X, curY, sigColW, 24, 'FD');
  doc.setFont('times', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Gate Clearance Seal / Stamp', col3X + sigColW / 2, curY + 9, { align: 'center' });
  doc.setDrawColor(148, 163, 184);
  doc.line(col3X + 5, curY + 14, col3X + sigColW - 5, curY + 14);
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Main Gate Security Officer', col3X + sigColW / 2, curY + 19, { align: 'center' });

  // 8. Institutional Footer Notice
  doc.setFont('times', 'italic');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  const noticeText = 'NOTICE: This Gate Pass is official institutional property of GRT Institute of Engineering and Technology. It is non-transferable and strictly valid for the named student. Present this pass at the Main Security Gate upon exit and return.';
  const nLines = doc.splitTextToSize(noticeText, tblW);
  doc.text(nLines, centerX, cardY + cardHeight - 5, { align: 'center' });
}

/**
 * Downloads official professional Gate Pass (Pass card design, NOT a letter)
 * @param {object} pass
 */
async function downloadGatePassCardPDF(pass) {
  if (!pass) return showToast('No pass record provided for Gate Pass download.', 'warning');

  // If passed an ID or roll number string, resolve the pass object
  if (typeof pass === 'string') {
    if (window.cachedAllRecords && Array.isArray(window.cachedAllRecords)) {
      const found = window.cachedAllRecords.find(p => p._id === pass || p.id === pass || p.rollNo === pass);
      if (found) pass = found;
    }
  }

  const u = window.loggedUser;
  const isApprovedChecker = window.isPassFullyApproved || (typeof isPassFullyApproved === 'function' ? isPassFullyApproved : null);
  if (u?.role === 'student' && isApprovedChecker && !isApprovedChecker(pass)) {
    return showToast('Gate Pass is hidden until all required institutional approvals are completed.', 'warning');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = await getCollegeLogoBase64();
  const watermarkBase64 = await getCollegeLogoWatermarkBase64();
  const bannerBase64 = await getCollegeBannerBase64();

  const isHosteller = (/hoste?l|^h$/i.test(pass.accommodation || '') && !/day\s*scholar/i.test(pass.accommodation || ''));
  const yr = new Date(pass.createdAt || Date.now()).getFullYear();
  const fallbackId = `GRT-GP-${yr}-${String(pass._id || '').slice(-4).toUpperCase() || '1048'}`;
  const gatePassId = pass.gatePassId || fallbackId;
  pass.gatePassId = gatePassId;

  const rollNo = pass.rollNo || pass.registrationNumber || '-';
  const depDate = pass.departureDate || pass.leaveDate || '-';
  const depTime = pass.departureTime || pass.leaveTime || '-';
  const finalAuth = pass.finalApprovingAuthority || (isHosteller ? 'Hostel Warden' : 'Principal Directorate');

  // Fetch QR Code for authentic college document
  const qrBase64 = await getGatePassQrBase64(pass, gatePassId, rollNo, finalAuth, depDate, depTime);

  renderProfessionalGatePassCardPage(doc, pass, logoBase64, watermarkBase64, bannerBase64, qrBase64);

  doc.save(`GRTIET_Gate_Pass_${gatePassId}_${pass.rollNo || 'Student'}.pdf`);
  showToast(`Official Gate Pass PDF downloaded (${gatePassId})`, 'success');
}

/**
 * Downloads single official formal Gate Pass letter PDF with full institutional letterhead,
 * college logo, From/To, Subject, Reason, Departure & Expected Return schedule, formal body,
 * Thank You, and multi-tier approval signature section.
 * @param {object} pass
 */
async function downloadOfficialLetterOnlyPDF(pass) {
  if (!pass) return showToast('No pass record provided for PDF download.', 'warning');

  // If passed an ID or roll number string, resolve the pass object
  if (typeof pass === 'string') {
    if (window.cachedAllRecords && Array.isArray(window.cachedAllRecords)) {
      const found = window.cachedAllRecords.find(p => p._id === pass || p.id === pass || p.rollNo === pass);
      if (found) pass = found;
    }
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = await getCollegeLogoBase64();
  const watermarkBase64 = await getCollegeLogoWatermarkBase64();
  const bannerBase64 = await getCollegeBannerBase64();

  renderOfficialGatePassLetterPage(doc, pass, logoBase64, watermarkBase64, bannerBase64);

  doc.save(`GRTIET_Gate_Pass_Letter_${pass.rollNo || 'Letter'}.pdf`);
  showToast(`Official Gate Pass letter PDF downloaded for Roll No: ${pass.rollNo || ''}`, 'success');
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
    img.onerror = () => {
      if (img.src.includes('/public/')) {
        img.src = '/grt-banner.png';
      } else if (!img.src.includes('/assets/')) {
        img.src = '/assets/grt-banner.png';
      } else {
        resolve(null);
      }
    };
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
    img.onerror = () => {
      if (img.src.includes('/public/')) {
        img.src = '/grt-logo.png';
      } else if (!img.src.includes('/assets/')) {
        img.src = '/assets/grt-logo.png';
      } else {
        resolve(null);
      }
    };
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
    img.onerror = () => {
      if (img.src.includes('/public/')) {
        img.src = '/grt-logo.png';
      } else if (!img.src.includes('/assets/')) {
        img.src = '/assets/grt-logo.png';
      } else {
        resolve(null);
      }
    };
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
 * Renders an official institutional On-Duty (OD) formal letter page on a jsPDF document
 * @param {jsPDF} doc
 * @param {object} od On-Duty record
 * @param {string} [logoBase64]
 * @param {string} [watermarkBase64]
 * @param {string} [bannerBase64]
 */
function renderOfficialODLetterPage(doc, od, logoBase64, watermarkBase64, bannerBase64) {
  if (!od) return;

  const logo = logoBase64 || cachedCollegeLogoBase64;
  const watermark = watermarkBase64 || cachedCollegeLogoWatermarkBase64;

  const deptUpper = String(od.dept || 'ENGINEERING').toUpperCase();

  // 1. Outer Border / Elegant Institutional Frame
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.rect(10, 10, 190, 277);

  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.2);
  doc.rect(12, 12, 186, 273);

  // Render Subtle Institutional College Logo Watermark
  renderPageWatermark(doc, watermark, 95);

  // 2. Official College Letterhead - GRT Logo on left with centered institutional typography
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 15, 14.5, 22, 22);
    } catch (e) {
      console.warn('Could not render logo in PDF:', e);
    }
  }

  // College Letterhead Typography (Centered in institutional space)
  const headerCenterX = 114;
  doc.setFont('times', 'bold');
  doc.setFontSize(13.8);
  doc.setTextColor(15, 23, 42); // Deep Navy
  doc.text('GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY', headerCenterX, 18.5, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text('(Approved by AICTE, New Delhi | Affiliated to Anna University, Chennai)', headerCenterX, 23.2, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(185, 28, 28); // Official Maroon Accent
  doc.text('(An Autonomous Institution | Accredited by NAAC with \'A++\' Grade)', headerCenterX, 27.6, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(100, 116, 139);
  doc.text('GRT Mahalakshmi Nagar, Chennai-Tirupati Highway, Tiruttani - 631 209.', headerCenterX, 31.8, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`DEPARTMENT OF ${deptUpper}`, headerCenterX, 36.2, { align: 'center' });

  // Clearly mention OD LETTER
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('OD LETTER', headerCenterX, 41.5, { align: 'center' });

  // Letterhead Horizontal Divider Line (Deep Navy + Gold Accent)
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(14, 45, 196, 45);

  doc.setDrawColor(217, 119, 6); // Subtle Gold Accent
  doc.setLineWidth(0.3);
  doc.line(14, 46, 196, 46);

  // 3. Date & Reference Number
  let curY = 52.5;
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

  // 4. From Section (OD Letter: Parent Mobile Number may be included; do NOT show Parent Name)
  curY = 57.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('From:', 16, curY);

  const parentPhone = od.parentContact || od.parentPhone || od.mobile || '-';

  curY += 4.5;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${od.name || 'Student'} (Register No: ${od.rollNo}),`, 20, curY);
  curY += 4.5;
  doc.text(`${od.academicYear || '3 Year'}, Department of ${od.dept || 'Engineering'} (Section '${od.yearSec || 'A'}'),`, 20, curY);
  curY += 4.5;
  doc.text(`Parent Contact: ${parentPhone},`, 20, curY);
  curY += 4.5;
  doc.text('GRT Institute of Engineering and Technology, Tiruttani - 631 209.', 20, curY);

  // 5. Through Section
  curY += 5.5;
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('(Through: Respective Class Counselor, Class Advisor, and Head of Department)', 20, curY);

  // 6. To Section - Strictly The Principal (NO Institutional Directorate / Directory)
  curY += 5.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('To:', 16, curY);

  curY += 4.5;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('The Principal,', 20, curY);
  curY += 4.5;
  doc.text('GRT Institute of Engineering and Technology,', 20, curY);
  curY += 4.5;
  doc.text('Tiruttani - 631 209.', 20, curY);

  // 7. Salutation & Subject
  curY += 6.5;
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Respected Sir / Madam,', 16, curY);

  curY += 5.8;
  doc.text('Subject: Requisition for Academic On-Duty (OD) Leave Permission - Regarding.', 20, curY);

  // 8. Formal Letter Body (Cleanly wrapped inside 178mm width)
  curY += 6.5;
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  const body1 = 'I am writing to request permission for Academic On-Duty (OD) leave from the college campus due to the following reason / academic engagement:';
  const body1Lines = doc.splitTextToSize(body1, 178);
  doc.text(body1Lines, 16, curY, { lineHeightFactor: 1.3 });
  curY += body1Lines.length * 4.6 + 3.5;

  // Highlighted Reason in quotes (Centered, wrapped)
  const odReason = String(od.reason || od.placeEvent || od.event || 'Academic Engagement').trim();
  const reasonText = `"${odReason}"`;
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const reasonLines = doc.splitTextToSize(reasonText, 160);
  doc.text(reasonLines, 105, curY, { align: 'center', lineHeightFactor: 1.3 });
  curY += reasonLines.length * 5.0 + 3.5;

  // Schedule & Particulars (Centered, safe widths)
  const scheduleText = od.mode === 'time'
    ? `${od.specificDate || od.fromDate || '-'} (${od.fromTime || '-'} to ${od.toTime || '-'})`
    : `From ${od.fromDate || '-'} to ${od.toDate || '-'}`;
  const placeEvent = String(od.placeEvent || od.event || '-').trim();
  const expectedReturn = String(od.expectedReturnTime || '-').trim();

  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  const scheduleLine = `OD Schedule: ${scheduleText}   |   Department: ${od.dept || 'Engineering'} (${od.academicYear || '3 Year'} - Sec '${od.yearSec || 'A'}')`;
  const scheduleLines = doc.splitTextToSize(scheduleLine, 172);
  doc.text(scheduleLines, 105, curY, { align: 'center', lineHeightFactor: 1.25 });
  curY += scheduleLines.length * 4.6 + 1.2;

  if (placeEvent && placeEvent !== '-') {
    const venueLine = `Event / Venue: ${placeEvent}`;
    const venueLines = doc.splitTextToSize(venueLine, 172);
    doc.text(venueLines, 105, curY, { align: 'center', lineHeightFactor: 1.25 });
    curY += venueLines.length * 4.6 + 1.2;
  }

  if (expectedReturn && expectedReturn !== '-') {
    doc.text(`Expected Return to Campus: ${expectedReturn}`, 105, curY, { align: 'center' });
    curY += 4.8;
  }
  curY += 2;

  // Assurance declaration
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  const body2 = 'I assure you that I will abide by all institutional rules and proactively complete all lectures, assignments, and coursework missed during my absence. Kindly grant me OD permission and attendance.';
  const body2Lines = doc.splitTextToSize(body2, 178);
  doc.text(body2Lines, 16, curY, { lineHeightFactor: 1.32 });
  curY += body2Lines.length * 4.6 + 4.5;

  // 9. Thank You & Yours Faithfully
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Thanking You,', 16, curY);

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Yours faithfully,', 148, curY);
  curY += 7.5;
  doc.setFont('times', 'bold');
  doc.text(`(${od.name || 'Student'})`, 148, curY);
  curY += 4.2;
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text(`Roll No: ${od.rollNo}`, 148, curY);

  // 10. Clearance & Endorsement Section (Student, Counselor, Advisor, HOD, Principal)
  curY = Math.max(curY + 5, 202);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(16, curY, 194, curY);
  curY += 4.5;

  doc.setFont('times', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(71, 85, 105);
  doc.text('OFFICIAL MULTI-TIER CLEARANCE & ACADEMIC ENDORSEMENT', 16, curY);

  const cApp = od.counselorApproval?.approved;
  const aApp = od.advisorApproval?.approved;
  const hApp = od.hodApproval?.approved;
  const pApp = od.principalApproval?.approved || od.status === 'Approved' || !!od.approvalTime;

  const counselorName = od.counselorApproval?.counselorName || od.counselorName || 'Class Counselor';
  const advisorName = od.advisorApproval?.advisorName || 'Class Advisor';
  const hodName = od.hodApproval?.hodName || 'Head of Department';
  const principalName = od.principalApproval?.principalName || 'Principal';

  const counselorStatus = cApp ? 'Recommended' : (od.status === 'Rejected' && /counselor/i.test(od.rejection?.role || '') ? 'REJECTED' : 'Pending');
  const advisorStatus = aApp ? 'Recommended' : (od.status === 'Rejected' && /advisor/i.test(od.rejection?.role || '') ? 'REJECTED' : (cApp ? 'Pending' : 'Queued'));
  const hodStatus = hApp ? 'Authorized' : (od.status === 'Rejected' && /hod/i.test(od.rejection?.role || '') ? 'REJECTED' : (aApp ? 'Pending' : 'Queued'));
  const principalStatus = (pApp || hApp) ? 'Sanctioned & Approved' : (od.status === 'Rejected' && /principal/i.test(od.rejection?.role || '') ? 'REJECTED' : (hApp ? 'Pending' : 'Queued'));

  const cDate = od.counselorApproval?.time ? formatLetterDate(od.counselorApproval.time) : '-';
  const aDate = od.advisorApproval?.time ? formatLetterDate(od.advisorApproval.time) : '-';
  const hDate = od.hodApproval?.time ? formatLetterDate(od.hodApproval.time) : '-';
  const pDate = od.principalApproval?.time || od.approvalTime ? formatLetterDate(od.principalApproval?.time || od.approvalTime) : (hApp && hDate !== '-' ? hDate : '-');

  const sigY = curY + 16;
  const colWidth = 33.2;
  const colGap = 3.0;

  const cols = [
    { title: 'Student Signature', name: od.name || 'Student', status: 'Submitted', isApproved: true, date: appliedDate, x: 16 },
    { title: 'Class Counselor', name: counselorName, status: counselorStatus, isApproved: cApp, date: cDate, x: 16 + (colWidth + colGap) },
    { title: 'Class Advisor', name: advisorName, status: advisorStatus, isApproved: aApp, date: aDate, x: 16 + (colWidth + colGap) * 2 },
    { title: 'Head of Dept', name: hodName, status: hodStatus, isApproved: hApp, date: hDate, x: 16 + (colWidth + colGap) * 3 },
    { title: 'Principal Approval', name: principalName, status: principalStatus, isApproved: (pApp || hApp), date: pDate, x: 16 + (colWidth + colGap) * 4 }
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
  const endY = sigY + 17;
  if (od.status === 'Rejected') {
    doc.setDrawColor(244, 63, 94);
    doc.setFillColor(255, 241, 242);
    doc.roundedRect(16, endY, 178, 11, 1.5, 1.5, 'FD');
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(159, 18, 57);
    const rejMsg = `Rejection Endorsement: Requisition declined by ${od.rejection?.roleTitle || od.rejectedBy || 'Authority'}. Reason: "${od.rejection?.reason || od.rejectionReason || 'Not approved'}"`;
    const rejLines = doc.splitTextToSize(rejMsg, 172);
    doc.text(rejLines, 19, endY + 4.8);
  } else if (hApp || pApp || od.status === 'Approved') {
    doc.setDrawColor(34, 197, 94);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(16, endY, 178, 9.5, 1.5, 1.5, 'FD');
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    const appMsg = 'Official Endorsement: On-Duty (OD) authorized under GRT Autonomous Academic Regulations. Official attendance sanctioned for the stated duration.';
    const appLines = doc.splitTextToSize(appMsg, 172);
    doc.text(appLines, 19, endY + 4.5);
  }

  // 11. Footer (Clean 4mm breathing room above inner border at 285)
  doc.setFont('times', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'GRT Institute of Engineering and Technology • Official Academic On-Duty Letter • Campus PassPro',
    105,
    281,
    { align: 'center' }
  );
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

  renderOfficialODLetterPage(doc, od, logoBase64, watermarkBase64, bannerBase64);

  const cleanRoll = od.rollNo || 'Student';
  doc.save(`GRTIET_OD_Letter_${cleanRoll}_${Date.now()}.pdf`);
  showToast(`Official OD letter PDF downloaded for Roll No: ${cleanRoll}`, 'success');
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
  const uRole = window.loggedUser?.role || 'export';
  link.setAttribute('download', `GRTIET_All_Records_${uRole}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('All records CSV exported successfully!', 'success');
}

/**
 * Downloads all On-Duty (OD) letters compiled into a single PDF
 */
async function downloadAllODLettersPDF() {
  const odList = await getEffectiveODList();
  if (!odList || odList.length === 0) {
    return showToast('No On-Duty letters found to export.', 'warning');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = await getCollegeLogoBase64();
  const watermarkBase64 = await getCollegeLogoWatermarkBase64();
  const bannerBase64 = await getCollegeBannerBase64();

  odList.forEach((od, idx) => {
    if (idx > 0) doc.addPage();
    renderOfficialODLetterPage(doc, od, logoBase64, watermarkBase64, bannerBase64);
  });

  const uRole = window.loggedUser?.role || 'od_letters';
  doc.save(`GRTIET_OD_Letters_${uRole}_${Date.now()}.pdf`);
  showToast(`Exported ${odList.length} On-Duty letters successfully!`, 'success');
}

/**
 * Downloads all Gate Pass clearance letters compiled into a single PDF
 */
async function downloadAllGatePassLettersPDF() {
  const allPasses = await getEffectivePassList();
  const passes = (allPasses || []).filter(p => p.requestCategory !== 'leave' && p.type !== 'leave');
  if (!passes || passes.length === 0) {
    return showToast('No Gate Pass letters found to export.', 'warning');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = await getCollegeLogoBase64();
  const watermarkBase64 = await getCollegeLogoWatermarkBase64();
  const bannerBase64 = await getCollegeBannerBase64();

  passes.forEach((pass, idx) => {
    if (idx > 0) doc.addPage();
    renderOfficialGatePassLetterPage(doc, pass, logoBase64, watermarkBase64, bannerBase64);
  });

  const uRole = window.loggedUser?.role || 'gatepass_letters';
  doc.save(`GRTIET_GatePass_Letters_${uRole}_${Date.now()}.pdf`);
  showToast(`Exported ${passes.length} Gate Pass letters successfully!`, 'success');
}

/**
 * Downloads all Leave requisition letters compiled into a single PDF
 */
async function downloadAllLeaveLettersPDF() {
  const allPasses = await getEffectivePassList();
  const leaves = (allPasses || []).filter(p => p.requestCategory === 'leave' || p.type === 'leave' || (!p.departureDate && (p.fromDate || p.leaveDate)));
  if (!leaves || leaves.length === 0) {
    return showToast('No Leave letters found to export.', 'warning');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = await getCollegeLogoBase64();
  const watermarkBase64 = await getCollegeLogoWatermarkBase64();
  const bannerBase64 = await getCollegeBannerBase64();

  leaves.forEach((leave, idx) => {
    if (idx > 0) doc.addPage();
    renderOfficialGatePassLetterPage(doc, leave, logoBase64, watermarkBase64, bannerBase64);
  });

  const uRole = window.loggedUser?.role || 'leave_letters';
  doc.save(`GRTIET_Leave_Letters_${uRole}_${Date.now()}.pdf`);
  showToast(`Exported ${leaves.length} Leave letters successfully!`, 'success');
}

/**
 * Downloads comprehensive institutional Auditing PDF
 */
async function downloadAuditingPDF(includeOD = true) {
  return downloadMasterPDF(includeOD);
}

window.downloadMasterPDF = downloadMasterPDF;
window.downloadAuditingPDF = downloadAuditingPDF;
window.downloadAllCompleteLettersPDF = downloadAllCompleteLettersPDF;
window.downloadAllODLettersPDF = downloadAllODLettersPDF;
window.downloadAllGatePassLettersPDF = downloadAllGatePassLettersPDF;
window.downloadAllLeaveLettersPDF = downloadAllLeaveLettersPDF;
window.downloadOfficialLetterOnlyPDF = downloadOfficialLetterOnlyPDF;
window.downloadGatePassCardPDF = downloadGatePassCardPDF;
window.downloadGatePassPDF = downloadGatePassCardPDF;
window.renderProfessionalGatePassCardPage = renderProfessionalGatePassCardPage;
window.renderOfficialGatePassLetterPage = renderOfficialGatePassLetterPage;
window.renderOfficialODLetterPage = renderOfficialODLetterPage;
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
