const mongoose = require('mongoose');
const xlsx = require('xlsx');
const Pass = require('../models/Pass');
const OnDuty = require('../models/OnDuty');
const Student = require('../models/Student');
const User = require('../models/User');
const { getISTTimeString, extractSection, extractRollNumber } = require('../utils/formatters');
const { generateFormalLetter } = require('../utils/letterGenerator');

/**
 * Query gate passes with role-based jurisdiction filtering
 */
async function getPasses(req, res) {
  try {
    const { status, dept, rollNo, counselorName, yearSec, role, startRoll, endRoll, authorityUserId, userId } = req.query;
    let filter = {};

    const cleanRole = role ? role.toLowerCase().trim() : '';
    const cleanAuthUid = (authorityUserId || userId || '').toLowerCase().trim();
    const authorityKey = (cleanRole && cleanAuthUid) ? `${cleanRole}:${cleanAuthUid}` : '';

    if (authorityKey) {
      filter.clearedByAuthorities = { $ne: authorityKey };
    }

    if (status) {
      if (status.includes(',')) {
        filter.status = { $in: status.split(',').map(s => s.trim()) };
      } else {
        filter.status = status;
      }
    }
    if (rollNo) filter.rollNo = rollNo.trim().toUpperCase();

    const cleanDept = dept ? dept.toUpperCase().trim() : '';

    if (role === 'hod' && cleanDept) {
      filter.dept = cleanDept;
    } else if (role === 'advisor' && cleanDept) {
      filter.dept = cleanDept;
      if (yearSec) filter.yearSec = extractSection(yearSec);
    } else if (role === 'boys_warden') {
      filter.accommodation = { $regex: /hoste?l|^h$/i, $not: /day\s*scholar/i };
      filter.$and = [
        {
          $or: [
            { gender: { $regex: /^male$/i } },
            { status: 'Pending Boys Warden' }
          ]
        },
        { gender: { $not: { $regex: /^female$/i } } },
        { status: { $ne: 'Pending Girls Warden' } }
      ];
    } else if (role === 'girls_warden') {
      filter.accommodation = { $regex: /hoste?l|^h$/i, $not: /day\s*scholar/i };
      filter.$and = [
        {
          $or: [
            { gender: { $regex: /^female$/i } },
            { status: 'Pending Girls Warden' }
          ]
        },
        { gender: { $not: { $regex: /^male$/i } } },
        { status: { $ne: 'Pending Boys Warden' } }
      ];
    } else if (role === 'counselor') {
      const conditions = [];
      if (counselorName) {
        conditions.push({ counselorName: new RegExp(`^${counselorName.trim()}$`, 'i') });
      }
      if (startRoll && endRoll) {
        conditions.push({
          rollNo: {
            $gte: startRoll.trim().toUpperCase(),
            $lte: endRoll.trim().toUpperCase()
          }
        });
      }
      if (conditions.length > 0) {
        filter.$or = conditions;
      }
    }

    const passes = await Pass.find(filter).sort({ createdAt: -1 }).limit(300);
    const rollNos = [...new Set(passes.map(p => p.rollNo).filter(Boolean))];
    const students = await Student.find({ rollNo: { $in: rollNos } }).lean();
    const studentMap = {};
    students.forEach(s => {
      studentMap[s.rollNo] = s;
    });

    const normalizedPasses = passes
      .map(p => {
        const passObj = p.toObject();
        const st = studentMap[passObj.rollNo];
        if (st) {
          if (st.parentName && st.parentName !== '-') {
            passObj.parentName = st.parentName;
            passObj.fatherName = st.parentName;
          }
          if (st.parentContact && st.parentContact !== '-') {
            passObj.parentContact = st.parentContact;
          }
        }
        if (!passObj.fatherName) {
          passObj.fatherName = passObj.parentName || '-';
        }
        passObj.accommodation = (/hoste?l|^h$/i.test(passObj.accommodation || '') && !/day\s*scholar/i.test(passObj.accommodation || '')) ? 'Hosteller' : 'Day Scholar';
        return passObj;
      })
      .filter(p => {
        if (authorityKey && p.clearedByAuthorities && p.clearedByAuthorities.includes(authorityKey)) {
          return false;
        }

        // Sequential clearance visibility hierarchy:
        // Counsellor (Tier 1) → Class Advisor (Tier 2) → HOD (Tier 3) → Principal (Tier 4) → Warden (Tier 5)
        // Rule 1: A leave application must only be displayed to the current authority once forwarded.
        // Rule 2: Once rejected at an authority level, it must NOT appear on any subsequent authority's dashboard.

        // Advisor (Tier 2):
        if (role === 'advisor') {
          const reachedAdvisor = p.counselorApproval?.approved === true || p.status === 'Pending Advisor';
          if (!reachedAdvisor) return false;
          if (p.status === 'Rejected' && !p.counselorApproval?.approved) return false;
        }

        // HOD (Tier 3):
        if (role === 'hod') {
          const reachedHod = p.advisorApproval?.approved === true || p.status === 'Pending HOD';
          if (!reachedHod) return false;
          if (p.status === 'Rejected' && !p.advisorApproval?.approved) return false;
        }

        // Principal (Tier 4):
        // Reviews both Day Scholar and Hosteller Gate Passes after HOD has approved!
        // Leave requests end at HOD.
        if (role === 'principal') {
          if (p.requestCategory === 'leave') return false;

          const reachedPrincipal = p.hodApproval?.approved === true || p.status === 'Pending Principal';
          if (!reachedPrincipal) return false;
          if (p.status === 'Rejected' && !p.hodApproval?.approved) return false;
        }

        // Boys Warden:
        // Hosteller Gate Passes only! Reaches Warden after Principal approval.
        if (role === 'boys_warden') {
          if (p.requestCategory === 'leave') return false;
          const isHostel = /hoste?l|^h$/i.test(p.accommodation) && !/day\s*scholar/i.test(p.accommodation);
          const isNotFemale = !/^female$/i.test(String(p.gender || '').trim());
          const isNotGirlsStatus = p.status !== 'Pending Girls Warden';
          if (!isHostel || !isNotFemale || !isNotGirlsStatus) return false;

          const reachedWarden = p.principalApproval?.approved === true || p.status === 'Pending Boys Warden' || p.status === 'Pending Warden';
          if (!reachedWarden) return false;
          if (p.status === 'Rejected' && !p.principalApproval?.approved) return false;
        }

        // Girls Warden:
        // Hosteller Gate Passes only! Reaches Warden after Principal approval.
        if (role === 'girls_warden') {
          if (p.requestCategory === 'leave') return false;
          const isHostel = /hoste?l|^h$/i.test(p.accommodation) && !/day\s*scholar/i.test(p.accommodation);
          const isFemale = /^female$/i.test(String(p.gender || '').trim()) || p.status === 'Pending Girls Warden';
          const isNotBoysStatus = p.status !== 'Pending Boys Warden';
          if (!isHostel || !isFemale || !isNotBoysStatus) return false;

          const reachedWarden = p.principalApproval?.approved === true || p.status === 'Pending Girls Warden' || p.status === 'Pending Warden';
          if (!reachedWarden) return false;
          if (p.status === 'Rejected' && !p.principalApproval?.approved) return false;
        }

        // General Warden:
        if (role === 'warden') {
          if (p.requestCategory === 'leave') return false;
          const isHostel = /hoste?l|^h$/i.test(p.accommodation) && !/day\s*scholar/i.test(p.accommodation);
          if (!isHostel) return false;

          const reachedWarden = p.principalApproval?.approved === true || p.status === 'Pending Warden' || p.status.includes('Warden');
          if (!reachedWarden) return false;
          if (p.status === 'Rejected' && !p.principalApproval?.approved) return false;
        }

        return true;
      });
    res.json(normalizedPasses);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch passes', error: err.message });
  }
}

/**
 * Student outpass application requisition submission
 */
async function applyPass(req, res) {
  try {
    const { rollNo, reason } = req.body;
    if (!rollNo || !reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Valid roll number and specific reason are required'
      });
    }

    const cleanRoll = rollNo.trim().toUpperCase();
    const student = await Student.findOne({ rollNo: cleanRoll });
    const studentUser = await User.findOne({
      userId: cleanRoll.toLowerCase(),
      role: 'student'
    });

    let assignedCounselor = student?.counselorName || 'Class Counselor';
    if (!student || assignedCounselor === 'Class Counselor' || assignedCounselor === 'Counselor') {
      const rollNum = extractRollNumber(cleanRoll);
      const counselors = await User.find({ role: 'counselor' });
      for (const c of counselors) {
        const sVal = extractRollNumber(c.startRoll);
        const eVal = extractRollNumber(c.endRoll);
        if (sVal > 0n && eVal > 0n && rollNum >= sVal && rollNum <= eVal) {
          assignedCounselor = c.name;
          break;
        }
        if (c.extraRolls && Array.isArray(c.extraRolls) && c.extraRolls.includes(cleanRoll)) {
          assignedCounselor = c.name;
          break;
        }
      }
    }

    const studentYear = req.body.academicYear || student?.academicYear || studentUser?.academicYear || '3 Year';
    const rawAccom = req.body.accommodation || student?.accommodation || studentUser?.accommodation || '';
    const studentAccom = (/hoste?l|^h$/i.test(rawAccom) && !/day\s*scholar/i.test(rawAccom)) ? 'Hosteller' : 'Day Scholar';
    const rawGender = req.body.gender || student?.gender || studentUser?.gender || 'Male';
    const studentGender = /^female$/i.test(String(rawGender).trim()) ? 'Female' : 'Male';
    const appliedTimestamp = getISTTimeString();

    const studentName = req.body.studentName || req.body.name || student?.name || studentUser?.name || 'Student';
    const fatherName = req.body.fatherName || req.body.parentName || student?.fatherName || student?.parentName || '-';
    const parentContact = req.body.parentPhone || req.body.parentContact || student?.parentContact || '-';
    const destination = req.body.destination ? String(req.body.destination).trim() : (req.body.placeOrEvent ? String(req.body.placeOrEvent).trim() : '');
    const hostelRoom = req.body.hostelRoom ? String(req.body.hostelRoom).trim() : (student?.hostelRoom || '');
    const hostelBlock = req.body.hostelBlock ? String(req.body.hostelBlock).trim() : (student?.hostelBlock || '');
    const hostelDepartureInfo = req.body.hostelDepartureInfo ? String(req.body.hostelDepartureInfo).trim() : '';
    const hostelReturnInfo = req.body.hostelReturnInfo ? String(req.body.hostelReturnInfo).trim() : '';

    const studentObj = {
      rollNo: cleanRoll,
      name: studentName,
      academicYear: studentYear,
      accommodation: studentAccom,
      gender: studentGender,
      dept: student?.dept || studentUser?.dept || 'CSE',
      yearSec: extractSection(student?.yearSec || studentUser?.yearSec || 'A'),
      counselorName: assignedCounselor,
      mobile: student?.mobile || '-',
      parentName: fatherName,
      fatherName: fatherName,
      parentContact: parentContact,
      email: student?.email || '-',
      address: student?.address || 'GRT College Campus'
    };

    const requestCategory = req.body.requestCategory === 'leave' ? 'leave' : 'gate_pass';
    const leaveType = req.body.leaveType ? String(req.body.leaveType).trim() : 'Personal Leave';
    const placeOrEvent = destination;
    const contactNumber = req.body.contactNumber ? String(req.body.contactNumber).trim() : (parentContact !== '-' ? parentContact : studentObj.mobile);
    const fromDate = req.body.fromDate ? String(req.body.fromDate).trim() : (req.body.leaveDate || req.body.departureDate || '');
    const toDate = req.body.toDate ? String(req.body.toDate).trim() : (req.body.expectedReturnDate || '');
    const additionalDetails = req.body.additionalDetails ? String(req.body.additionalDetails).trim() : '';

    const leaveDate = fromDate || (req.body.leaveDate ? String(req.body.leaveDate).trim() : (req.body.departureDate ? String(req.body.departureDate).trim() : ''));
    const leaveTime = req.body.leaveTime ? String(req.body.leaveTime).trim() : (req.body.departureTime ? String(req.body.departureTime).trim() : '');
    const departureDate = req.body.departureDate ? String(req.body.departureDate).trim() : leaveDate;
    const departureTime = req.body.departureTime ? String(req.body.departureTime).trim() : leaveTime;
    const expectedReturnDate = toDate || (req.body.expectedReturnDate ? String(req.body.expectedReturnDate).trim() : (req.body.returnDate ? String(req.body.returnDate).trim() : ''));
    const expectedReturnTime = req.body.expectedReturnTime ? String(req.body.expectedReturnTime).trim() : (req.body.returnTime ? String(req.body.returnTime).trim() : '');
    const expectedReturnDateTime = req.body.expectedReturnDateTime
      ? String(req.body.expectedReturnDateTime).trim()
      : (expectedReturnDate && expectedReturnTime ? `${expectedReturnDate} ${expectedReturnTime}` : (expectedReturnDate || expectedReturnTime));

    const generatedLetter = generateFormalLetter(studentObj, reason, appliedTimestamp, {
      requestCategory,
      leaveType,
      placeOrEvent,
      destination,
      leaveDate,
      leaveTime,
      departureDate,
      departureTime,
      expectedReturnDate,
      expectedReturnTime,
      expectedReturnDateTime,
      hostelRoom,
      hostelBlock,
      hostelDepartureInfo,
      hostelReturnInfo
    });

    const newPass = new Pass({
      ...studentObj,
      requestCategory,
      leaveType,
      placeOrEvent,
      destination,
      hostelRoom,
      hostelBlock,
      hostelDepartureInfo,
      hostelReturnInfo,
      contactNumber,
      fromDate,
      toDate,
      additionalDetails,
      reason: reason.trim(),
      leaveDate,
      leaveTime,
      departureDate,
      departureTime,
      expectedReturnDate,
      expectedReturnTime,
      expectedReturnDateTime,
      formalLetter: generatedLetter,
      status: 'Pending Counselor',
      appliedTime: appliedTimestamp,
      exitStatus: 'Inside Campus',
      exitTime: '-'
    });

    await newPass.save();
    res.json({
      success: true,
      message: `${requestCategory === 'leave' ? 'Leave Request' : 'Gate Pass'} submitted & routed to Counselor (${assignedCounselor}).`,
      passId: newPass._id,
      pass: newPass
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to submit requisition', error: err.message });
  }
}

/**
 * Clear all gate passes and OD requisitions from current authority dashboard
 * Ensures independence across Counselor, Class Advisor, HOD, Principal, and Warden
 */
async function clearAllPasses(req, res) {
  try {
    const {
      role,
      userId,
      authorityUserId,
      dept,
      yearSec,
      startRoll,
      endRoll,
      counselorName,
      currentlyLoadedPassIds = [],
      currentlyLoadedODIds = []
    } = req.body || {};

    const cleanRole = (role || '').toLowerCase().trim();
    const cleanUid = (authorityUserId || userId || '').toLowerCase().trim();

    if (cleanRole && cleanUid) {
      const authorityKey = `${cleanRole}:${cleanUid}`;

      // Retrieve authoritative user record directly from database
      const authorityUser = await User.findOne({ userId: cleanUid }).lean();

      const authDept = (dept || authorityUser?.dept || '').toUpperCase().trim();
      const authYearSec = yearSec || authorityUser?.yearSec || '';
      const authStartRoll = (startRoll || authorityUser?.startRoll || '').toUpperCase().trim();
      const authEndRoll = (endRoll || authorityUser?.endRoll || '').toUpperCase().trim();
      const authExtraRolls = Array.isArray(authorityUser?.extraRolls) ? authorityUser.extraRolls : [];
      const authName = (counselorName || authorityUser?.name || '').trim();

      // Normalize currently loaded Pass and OD ObjectIds
      const passIdList = (Array.isArray(currentlyLoadedPassIds) ? currentlyLoadedPassIds : [])
        .filter(Boolean)
        .map(id => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id));

      const odIdList = (Array.isArray(currentlyLoadedODIds) ? currentlyLoadedODIds : [])
        .filter(Boolean)
        .map(id => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id));

      // 1. Build Pass filter
      const passConditions = [];

      // Include all IDs currently displayed on the authority's screen
      if (passIdList.length > 0) {
        passConditions.push({ _id: { $in: passIdList } });
      }

      if (cleanRole === 'principal') {
        // Principal has institution-wide jurisdiction
        passConditions.push({});
      } else if (cleanRole === 'hod') {
        if (authDept) {
          passConditions.push({ dept: new RegExp(`^${authDept}$`, 'i') });
        }
      } else if (cleanRole === 'advisor') {
        const advCond = {};
        if (authDept) advCond.dept = new RegExp(`^${authDept}$`, 'i');
        if (authYearSec) {
          const sec = extractSection(authYearSec);
          advCond.yearSec = { $in: [authYearSec, sec, new RegExp(`^${sec}$`, 'i')] };
        }
        if (Object.keys(advCond).length > 0) {
          passConditions.push(advCond);
        }
      } else if (cleanRole === 'counselor') {
        if (authName) {
          passConditions.push({ counselorName: new RegExp(`^${authName}$`, 'i') });
        }
        if (authStartRoll && authEndRoll) {
          passConditions.push({
            rollNo: { $gte: authStartRoll, $lte: authEndRoll }
          });
        }
        if (authExtraRolls.length > 0) {
          passConditions.push({ rollNo: { $in: authExtraRolls } });
        }
      } else if (cleanRole === 'boys_warden') {
        passConditions.push({
          accommodation: { $regex: /hoste?l|^h$/i, $not: /day\s*scholar/i },
          $and: [
            { $or: [{ gender: { $regex: /^male$/i } }, { status: 'Pending Boys Warden' }] },
            { gender: { $not: { $regex: /^female$/i } } },
            { status: { $ne: 'Pending Girls Warden' } }
          ]
        });
      } else if (cleanRole === 'girls_warden') {
        passConditions.push({
          accommodation: { $regex: /hoste?l|^h$/i, $not: /day\s*scholar/i },
          $and: [
            { $or: [{ gender: { $regex: /^female$/i } }, { status: 'Pending Girls Warden' }] },
            { gender: { $not: { $regex: /^male$/i } } },
            { status: { $ne: 'Pending Boys Warden' } }
          ]
        });
      }

      let passFilter = {};
      if (cleanRole === 'principal') {
        passFilter = {};
      } else if (passConditions.length > 0) {
        passFilter = { $or: passConditions };
      } else {
        passFilter = { _id: null };
      }

      // 2. Build OD filter
      const odConditions = [];

      // Include all OD IDs currently displayed on the authority's screen
      if (odIdList.length > 0) {
        odConditions.push({ _id: { $in: odIdList } });
      }

      if (cleanRole === 'principal') {
        odConditions.push({});
      } else if (cleanRole === 'hod') {
        if (authDept) {
          odConditions.push({ dept: new RegExp(`^${authDept}$`, 'i') });
        }
      } else if (cleanRole === 'advisor') {
        const advODCond = {};
        if (authDept) advODCond.dept = new RegExp(`^${authDept}$`, 'i');
        if (authYearSec) {
          const sec = extractSection(authYearSec);
          advODCond.yearSec = { $in: [authYearSec, sec, new RegExp(`^${sec}$`, 'i')] };
        }
        if (Object.keys(advODCond).length > 0) {
          odConditions.push(advODCond);
        }
      } else if (cleanRole === 'counselor') {
        if (authName) {
          odConditions.push({ counselorName: new RegExp(`^${authName}$`, 'i') });
        }
        if (authStartRoll && authEndRoll) {
          odConditions.push({
            rollNo: { $gte: authStartRoll, $lte: authEndRoll }
          });
        }
        if (authExtraRolls.length > 0) {
          odConditions.push({ rollNo: { $in: authExtraRolls } });
        }
      }

      let odFilter = {};
      if (cleanRole === 'principal') {
        odFilter = {};
      } else if (odConditions.length > 0) {
        odFilter = { $or: odConditions };
      } else {
        // Roles like warden do not clear OD records unless specific loaded OD IDs were present
        odFilter = { _id: null };
      }

      const [passResult, odResult] = await Promise.all([
        Pass.updateMany(passFilter, { $addToSet: { clearedByAuthorities: authorityKey } }),
        OnDuty.updateMany(odFilter, { $addToSet: { clearedByAuthorities: authorityKey } })
      ]);

      const totalCleared = (passResult.modifiedCount || 0) + (odResult.modifiedCount || 0);

      return res.json({
        success: true,
        message: `Successfully cleared ${totalCleared} requests (${passResult.modifiedCount || 0} Gate Passes, ${odResult.modifiedCount || 0} On-Duty requests) from your dashboard. Other authorities' dashboards remain unaffected.`,
        deletedCount: totalCleared,
        gatePassesCleared: passResult.modifiedCount || 0,
        onDutyCleared: odResult.modifiedCount || 0
      });
    }

    // Fallback if no specific authority specified
    const result = await Pass.deleteMany({});
    res.json({
      success: true,
      message: `Successfully cleared all leave applications (${result.deletedCount} records deleted).`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to clear passes',
      error: err.message
    });
  }
}

/**
 * Helper to normalize date strings to YYYY-MM-DD
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
 * Builds the official Counselor Daily Attendance Workbook matching the institutional reference sheet
 */
function buildCounselorAttendanceWorkbook(students, leavePasses, config = {}) {
  const wb = xlsx.utils.book_new();

  const batch = config.batch || '2023-2027';
  const acadYear = config.academicYear || 'Academic Year 2024-2027 ODD SEMESTER';
  const yearSem = config.yearSem || '2 / III';
  const period = config.period || 'AUG 2024 - DEC 2024';
  const totalDays = parseInt(config.totalDays, 10) || 40;
  const targetYear = parseInt(config.targetYear, 10) || 2026;
  const targetMonth = parseInt(config.targetMonth, 10) || 9;

  // Pre-calculate date string for each working day
  const dayDates = [];
  for (let d = 1; d <= totalDays; d++) {
    let m = targetMonth;
    let y = targetYear;
    let dayInMonth = d;
    if (dayInMonth > 30) {
      m = targetMonth + 1;
      dayInMonth = d - 30;
      if (m > 12) { m = 1; y++; }
    }
    dayDates.push(`${y}-${String(m).padStart(2, '0')}-${String(dayInMonth).padStart(2, '0')}`);
  }

  // Row 0: College Header
  const r0 = ['GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY, Tiruttani'];
  // Row 1: Document Title
  const r1 = ['STUDENTS DAILY ATTENDANCE SHEET'];
  // Row 2: Metadata (Batch, Academic Year, Year/Sem)
  const r2 = ['BATCH: ' + batch, '', '', '', '', '', acadYear, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'YEAR / SEM: ' + yearSem];

  // Row 3-6: Column headers matching reference
  // Col A: S. NO. | Col B: REG No. | Col C: STUDENT NAME | Col D: 'w d' | Col E..: 1, 2, ...
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

  // Index leave requests by roll number
  const leavesByRoll = {};
  (leavePasses || []).forEach(p => {
    const r = String(p.rollNo || '').trim().toUpperCase();
    if (!leavesByRoll[r]) leavesByRoll[r] = [];
    const from = normalizeDateYMD(p.fromDate || p.leaveDate || p.departureDate);
    const to = normalizeDateYMD(p.toDate || p.expectedReturnDate || p.fromDate || p.leaveDate);
    if (from || to) {
      leavesByRoll[r].push({ from: from || to, to: to || from });
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

      for (const lv of studentLeaves) {
        if (targetYMD >= lv.from && targetYMD <= lv.to) {
          isAbsent = true;
          break;
        }
      }

      // P = Present, A = Absent
      row.push(isAbsent ? 'A' : 'P');
    }
    aoa.push(row);
  });

  const ws = xlsx.utils.aoa_to_sheet(aoa);

  // Column widths: S.No (6), Reg No (16), Student Name (26), 'w d' (5), Day cols (3.8 each)
  const lastColIdx = 3 + totalDays;
  const cols = [{ wch: 6 }, { wch: 16 }, { wch: 26 }, { wch: 5 }];
  for (let i = 0; i < totalDays; i++) {
    cols.push({ wch: 3.8 });
  }
  ws['!cols'] = cols;

  // Institutional cell merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } }, // Header
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } }, // Title
    { s: { r: 3, c: 0 }, e: { r: 5, c: 0 } },          // S. NO.
    { s: { r: 3, c: 1 }, e: { r: 5, c: 1 } },          // REG No.
    { s: { r: 3, c: 2 }, e: { r: 5, c: 2 } },          // STUDENT NAME
    { s: { r: 6, c: 3 }, e: { r: 6, c: lastColIdx } }  // AUG 2024 - DEC 2024 period banner
  ];

  xlsx.utils.book_append_sheet(wb, ws, 'daily attendance-1');

  // Sheet 2: STUDENT INFORMATION
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
  const wsInfo = xlsx.utils.aoa_to_sheet(infoAoa);
  wsInfo['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 26 }, { wch: 14 }, { wch: 10 }, { wch: 15 }, { wch: 22 }, { wch: 16 }];
  xlsx.utils.book_append_sheet(wb, wsInfo, 'STUDENT INFORMATION');

  return wb;
}

/**
 * Downloads the official Counselor Attendance Sheet as an Excel (.xlsx) file
 */
async function getCounselorAttendanceSheet(req, res) {
  try {
    const {
      counselorName,
      startRoll,
      endRoll,
      batch = '2023-2027',
      academicYear = 'Academic Year 2024-2027 ODD SEMESTER',
      yearSem = '2 / III',
      period = 'AUG 2024 - DEC 2024',
      targetMonth = 9,
      targetYear = 2026,
      totalDays = 40
    } = req.query;

    let studentFilter = {};
    if (startRoll && endRoll) {
      studentFilter.rollNo = {
        $gte: String(startRoll).trim().toUpperCase(),
        $lte: String(endRoll).trim().toUpperCase()
      };
    } else if (counselorName) {
      studentFilter.counselorName = { $regex: counselorName.trim(), $options: 'i' };
    }

    const students = await Student.find(studentFilter).sort({ rollNo: 1 });
    const studentRolls = students.map(s => s.rollNo);

    const leavePasses = await Pass.find({
      rollNo: { $in: studentRolls },
      $or: [
        { requestCategory: 'leave' },
        { isLeave: true }
      ]
    });

    const wb = buildCounselorAttendanceWorkbook(students, leavePasses, {
      batch,
      academicYear,
      yearSem,
      period,
      targetMonth: parseInt(targetMonth, 10) || 9,
      targetYear: parseInt(targetYear, 10) || 2026,
      totalDays: parseInt(totalDays, 10) || 40
    });

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const safeBatch = String(batch).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `COUNSELLING_DETAILS_${safeBatch}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);
  } catch (err) {
    console.error('Error generating counselor attendance sheet:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate attendance sheet: ' + err.message });
  }
}

/**
 * Returns raw attendance data for Counselor's mentees and leave requests
 */
async function getCounselorAttendanceData(req, res) {
  try {
    const { counselorName, startRoll, endRoll } = req.query;
    let studentFilter = {};
    if (startRoll && endRoll) {
      studentFilter.rollNo = {
        $gte: String(startRoll).trim().toUpperCase(),
        $lte: String(endRoll).trim().toUpperCase()
      };
    } else if (counselorName) {
      studentFilter.counselorName = { $regex: counselorName.trim(), $options: 'i' };
    }

    const students = await Student.find(studentFilter).sort({ rollNo: 1 });
    const studentRolls = students.map(s => s.rollNo);

    const leavePasses = await Pass.find({
      rollNo: { $in: studentRolls },
      $or: [
        { requestCategory: 'leave' },
        { isLeave: true }
      ]
    });

    return res.json({
      success: true,
      students,
      leavePasses,
      count: students.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getPasses,
  applyPass,
  clearAllPasses,
  buildCounselorAttendanceWorkbook,
  getCounselorAttendanceSheet,
  getCounselorAttendanceData
};

