/**
 * Gate Pass Requisition & Query Controller
 */
const Pass = require('../models/Pass');
const Student = require('../models/Student');
const User = require('../models/User');
const { getISTTimeString, extractSection, extractRollNumber } = require('../utils/formatters');
const { generateFormalLetter } = require('../utils/letterGenerator');

/**
 * Query gate passes with role-based jurisdiction filtering
 */
async function getPasses(req, res) {
  try {
    const { status, dept, rollNo, counselorName, yearSec, role, startRoll, endRoll } = req.query;
    let filter = {};

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
        if (role === 'principal') {
          const reachedPrincipal = p.hodApproval?.approved === true || p.status === 'Pending Principal';
          if (!reachedPrincipal) return false;
          if (p.status === 'Rejected' && !p.hodApproval?.approved) return false;
        }

        // Boys Warden (Tier 5):
        if (role === 'boys_warden') {
          const isHostel = /hoste?l|^h$/i.test(p.accommodation) && !/day\s*scholar/i.test(p.accommodation);
          const isNotFemale = !/^female$/i.test(String(p.gender || '').trim());
          const isNotGirlsStatus = p.status !== 'Pending Girls Warden';
          if (!isHostel || !isNotFemale || !isNotGirlsStatus) return false;

          const reachedWarden = p.principalApproval?.approved === true || p.status === 'Pending Boys Warden';
          if (!reachedWarden) return false;
          if (p.status === 'Rejected' && !p.principalApproval?.approved) return false;
        }

        // Girls Warden (Tier 5):
        if (role === 'girls_warden') {
          const isHostel = /hoste?l|^h$/i.test(p.accommodation) && !/day\s*scholar/i.test(p.accommodation);
          const isFemale = /^female$/i.test(String(p.gender || '').trim()) || p.status === 'Pending Girls Warden';
          const isNotBoysStatus = p.status !== 'Pending Boys Warden';
          if (!isHostel || !isFemale || !isNotBoysStatus) return false;

          const reachedWarden = p.principalApproval?.approved === true || p.status === 'Pending Girls Warden';
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

    const studentObj = {
      rollNo: cleanRoll,
      name: student?.name || studentUser?.name || 'Student',
      academicYear: studentYear,
      accommodation: studentAccom,
      gender: studentGender,
      dept: student?.dept || studentUser?.dept || 'CSE',
      yearSec: extractSection(student?.yearSec || studentUser?.yearSec || 'A'),
      counselorName: assignedCounselor,
      mobile: student?.mobile || '-',
      parentName: student?.parentName || '-',
      fatherName: student?.parentName || '-',
      parentContact: student?.parentContact || '-',
      email: student?.email || '-',
      address: student?.address || 'GRT College Campus'
    };

    const leaveDate = req.body.leaveDate ? String(req.body.leaveDate).trim() : (req.body.departureDate ? String(req.body.departureDate).trim() : '');
    const leaveTime = req.body.leaveTime ? String(req.body.leaveTime).trim() : (req.body.departureTime ? String(req.body.departureTime).trim() : '');
    const departureDate = req.body.departureDate ? String(req.body.departureDate).trim() : leaveDate;
    const departureTime = req.body.departureTime ? String(req.body.departureTime).trim() : leaveTime;
    const expectedReturnDate = req.body.expectedReturnDate ? String(req.body.expectedReturnDate).trim() : '';
    const expectedReturnTime = req.body.expectedReturnTime ? String(req.body.expectedReturnTime).trim() : '';
    const expectedReturnDateTime = req.body.expectedReturnDateTime
      ? String(req.body.expectedReturnDateTime).trim()
      : (expectedReturnDate && expectedReturnTime ? `${expectedReturnDate} ${expectedReturnTime}` : (expectedReturnDate || expectedReturnTime));

    const generatedLetter = generateFormalLetter(studentObj, reason, appliedTimestamp, {
      leaveDate,
      leaveTime,
      departureDate,
      departureTime,
      expectedReturnDate,
      expectedReturnTime,
      expectedReturnDateTime
    });

    const newPass = new Pass({
      ...studentObj,
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
      message: `Requisition submitted & routed to Counselor (${assignedCounselor}).`,
      passId: newPass._id,
      pass: newPass
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to submit requisition', error: err.message });
  }
}

/**
 * Clear all gate passes / leave applications from database
 */
async function clearAllPasses(req, res) {
  try {
    const result = await Pass.deleteMany({});
    res.json({
      success: true,
      message: `Successfully cleared all leave applications (${result.deletedCount} records deleted). All queues, logs, and trackers are now empty.`,
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

module.exports = {
  getPasses,
  applyPass,
  clearAllPasses
};

