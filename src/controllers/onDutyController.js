/**
 * On-Duty (OD) Requisition & Approval Workflow Controller
 * Separate from Gate Pass (Pass)
 * Approval Pipeline: Student -> Counsellor -> Class Advisor -> HOD -> Completed
 */
const mongoose = require('mongoose');
const OnDuty = require('../models/OnDuty');
const Student = require('../models/Student');
const User = require('../models/User');
const { getISTTimeString, extractSection, extractRollNumber } = require('../utils/formatters');
const { generateOnDutyLetter } = require('../utils/letterGenerator');

/**
 * Student submits new On-Duty application
 */
async function applyOnDuty(req, res) {
  try {
    const {
      rollNo,
      mode = 'dates',
      fromDate,
      toDate,
      specificDate,
      fromTime,
      toTime,
      reason,
      placeEvent,
      expectedReturnTime
    } = req.body;

    if (!rollNo || !rollNo.trim()) {
      return res.status(400).json({ success: false, message: 'Student Registration Number is required.' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Detailed Reason for On-Duty is required.' });
    }

    const cleanMode = mode === 'time' ? 'time' : 'dates';

    if (cleanMode === 'dates') {
      if (!fromDate || !toDate) {
        return res.status(400).json({ success: false, message: 'Both From Date and To Date are required for Date Range On-Duty.' });
      }
    } else {
      if (!fromTime || !toTime) {
        return res.status(400).json({ success: false, message: 'Both From Time and To Time are required for specific time On-Duty.' });
      }
    }

    const cleanRoll = rollNo.trim().toUpperCase();

    // Lookup student record to autofill verified institutional details
    const student = await Student.findOne({ rollNo: cleanRoll });
    const studentUser = await User.findOne({ userId: cleanRoll.toLowerCase(), role: 'student' });

    const studentName = student?.name || studentUser?.name || 'Student';
    const studentYear = student?.academicYear || studentUser?.academicYear || '3 Year';
    const studentDept = (student?.dept || studentUser?.dept || 'CSE').toUpperCase().trim();
    const studentSec = extractSection(student?.yearSec || studentUser?.yearSec || 'A');
    const studentAccom = (/hoste?l|^h$/i.test(student?.accommodation || studentUser?.accommodation || '') && !/day/i.test(student?.accommodation || studentUser?.accommodation || '')) ? 'Hosteller' : 'Day Scholar';
    const studentGender = student?.gender || studentUser?.gender || 'Male';
    let counselor = student?.counselorName || 'Assigned Counselor';
    if (!student || counselor === 'Assigned Counselor' || counselor === 'Class Counselor' || counselor === 'Counselor' || counselor === '-') {
      const rollNum = extractRollNumber(cleanRoll);
      const counselors = await User.find({ role: 'counselor' });
      for (const c of counselors) {
        const sVal = extractRollNumber(c.startRoll);
        const eVal = extractRollNumber(c.endRoll);
        if (sVal > 0n && eVal > 0n && rollNum >= sVal && rollNum <= eVal) {
          counselor = c.name;
          break;
        }
        if (c.extraRolls && Array.isArray(c.extraRolls) && c.extraRolls.includes(cleanRoll)) {
          counselor = c.name;
          break;
        }
      }
    }
    const parentName = student?.parentName || '-';
    const parentContact = student?.parentContact || student?.mobile || '-';

    const newOD = new OnDuty({
      rollNo: cleanRoll,
      name: studentName,
      academicYear: studentYear,
      dept: studentDept,
      yearSec: studentSec,
      accommodation: studentAccom,
      gender: studentGender,
      counselorName: counselor,
      parentName: parentName,
      parentContact: parentContact,
      mode: cleanMode,
      fromDate: fromDate || '',
      toDate: toDate || '',
      specificDate: specificDate || fromDate || '',
      fromTime: fromTime || '',
      toTime: toTime || '',
      reason: reason.trim(),
      placeEvent: (placeEvent || '').trim() || '-',
      expectedReturnTime: (expectedReturnTime || '').trim() || '-',
      status: 'Pending Counselor',
      appliedTime: getISTTimeString()
    });

    newOD.odLetter = generateOnDutyLetter(newOD);

    await newOD.save();

    res.json({
      success: true,
      message: `On-Duty request submitted successfully! Forwarded to Counsellor (${counselor}).`,
      onDuty: newOD
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to submit On-Duty request', error: err.message });
  }
}

/**
 * Query On-Duty requests with role-based jurisdiction filtering
 */
async function getOnDutyRequests(req, res) {
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

    if (role === 'counselor') {
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
    } else if (role === 'advisor' && cleanDept) {
      filter.dept = cleanDept;
      if (yearSec) filter.yearSec = extractSection(yearSec);
    } else if (role === 'hod' && cleanDept) {
      filter.dept = cleanDept;
    }

    const requests = await OnDuty.find(filter).sort({ createdAt: -1 }).limit(300);
    const rollNos = [...new Set(requests.map(r => r.rollNo).filter(Boolean))];
    const students = await Student.find({ rollNo: { $in: rollNos } }).lean();
    const studentMap = {};
    students.forEach(s => {
      studentMap[s.rollNo] = s;
    });

    const enrichedRequests = requests.map(r => {
      const obj = r.toObject ? r.toObject() : { ...r };
      const st = studentMap[obj.rollNo];
      if (st) {
        if (st.parentName && st.parentName !== '-') {
          obj.parentName = st.parentName;
          obj.fatherName = st.parentName;
        }
        if (st.parentContact && st.parentContact !== '-') {
          obj.parentContact = st.parentContact;
        }
      }
      if (!obj.fatherName) {
        obj.fatherName = obj.parentName || '-';
      }
      return obj;
    });

    // Sequential clearance visibility hierarchy:
    // Student -> Counsellor (Tier 1) -> Class Advisor (Tier 2) -> HOD (Tier 3) -> Completed
    const normalized = enrichedRequests.filter(od => {
      if (authorityKey && (od.clearedByAuthorities || []).includes(authorityKey)) {
        return false;
      }

      // Advisor (Tier 2): must have been approved by counselor
      if (role === 'advisor') {
        const reachedAdvisor = od.counselorApproval?.approved === true || od.status === 'Pending Advisor';
        if (!reachedAdvisor) return false;
        if (od.status === 'Rejected' && !od.counselorApproval?.approved) return false;
      }

      // HOD (Tier 3): must have been approved by advisor
      if (role === 'hod') {
        const reachedHod = od.advisorApproval?.approved === true || od.status === 'Pending HOD';
        if (!reachedHod) return false;
        if (od.status === 'Rejected' && !od.advisorApproval?.approved) return false;
      }

      return true;
    }).map(od => {
      const doc = od.toObject ? od.toObject() : od;
      if (!doc.odLetter) {
        doc.odLetter = generateOnDutyLetter(doc);
      }
      return doc;
    });

    res.json(normalized);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch On-Duty requests', error: err.message });
  }
}

/**
 * Get single On-Duty requisition by ID
 */
async function getOnDutyById(req, res) {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid On-Duty ID.' });
    }
    const od = await OnDuty.findById(id);
    if (!od) return res.status(404).json({ success: false, message: 'On-Duty record not found.' });

    const doc = od.toObject ? od.toObject() : od;
    if (!doc.odLetter) {
      doc.odLetter = generateOnDutyLetter(doc);
    }

    res.json({ success: true, onDuty: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Tier 1: Class Counsellor Endorsement
 */
async function approveCounselorOD(req, res) {
  try {
    const targetId = req.body.odId || req.body.requestId || req.body.id;
    const { counselorName, remarks } = req.body;
    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid On-Duty ID.' });
    }

    const od = await OnDuty.findById(targetId);
    if (!od) return res.status(404).json({ success: false, message: 'On-Duty request not found.' });

    const cName = counselorName || 'Class Counsellor';
    const now = getISTTimeString();

    od.status = 'Pending Advisor';
    od.counselorApproval = {
      counselorName: cName,
      approved: true,
      time: now,
      remarks: (remarks || '').trim()
    };

    od.odLetter = generateOnDutyLetter(od);

    await od.save();
    res.json({
      success: true,
      message: `On-Duty approved by Counsellor (${cName}) & forwarded to Class Advisor.`,
      onDuty: od
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Counselor approval failed', error: err.message });
  }
}

/**
 * Tier 2: Class Advisor Endorsement
 */
async function approveAdvisorOD(req, res) {
  try {
    const targetId = req.body.odId || req.body.requestId || req.body.id;
    const { advisorName, remarks } = req.body;
    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid On-Duty ID.' });
    }

    const od = await OnDuty.findById(targetId);
    if (!od) return res.status(404).json({ success: false, message: 'On-Duty request not found.' });

    const aName = advisorName || 'Class Advisor';
    const now = getISTTimeString();

    od.status = 'Pending HOD';
    od.advisorApproval = {
      advisorName: aName,
      approved: true,
      time: now,
      remarks: (remarks || '').trim()
    };

    od.odLetter = generateOnDutyLetter(od);

    await od.save();
    res.json({
      success: true,
      message: `On-Duty approved by Class Advisor (${aName}) & forwarded to Department HOD.`,
      onDuty: od
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Advisor approval failed', error: err.message });
  }
}

/**
 * Tier 3: Department Head (HOD) Authorization (Workflow Ends Here)
 */
async function approveHodOD(req, res) {
  try {
    const targetId = req.body.odId || req.body.requestId || req.body.id;
    const { hodName, remarks } = req.body;
    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid On-Duty ID.' });
    }

    const od = await OnDuty.findById(targetId);
    if (!od) return res.status(404).json({ success: false, message: 'On-Duty request not found.' });

    const hName = hodName || 'Department HOD';
    const now = getISTTimeString();

    od.status = 'Completed';
    od.hodApproval = {
      hodName: hName,
      approved: true,
      time: now,
      remarks: (remarks || '').trim()
    };

    od.odLetter = generateOnDutyLetter(od);

    await od.save();
    res.json({
      success: true,
      message: `On-Duty authorized by HOD (${hName})! Status marked as Completed.`,
      onDuty: od
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'HOD approval failed', error: err.message });
  }
}

/**
 * Universal Rejection for On-Duty requests (Counselor, Advisor, HOD)
 */
async function rejectOnDuty(req, res) {
  try {
    const targetId = req.body.odId || req.body.requestId || req.body.id;
    const { reason, rejectedBy, role } = req.body;
    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid On-Duty ID.' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a reason for rejecting the On-Duty request.' });
    }

    const od = await OnDuty.findById(targetId);
    if (!od) return res.status(404).json({ success: false, message: 'On-Duty request not found.' });

    const now = getISTTimeString();
    const roleTitles = {
      counselor: 'Class Counsellor',
      advisor: 'Class Advisor',
      hod: 'Head of Department (HOD)'
    };
    const roleTitle = roleTitles[role] || (role ? role.toUpperCase() : 'Authority');
    const approverName = rejectedBy || 'Designated Authority';

    od.status = 'Rejected';
    od.rejection = {
      rejected: true,
      rejectedBy: approverName,
      role: role || 'authority',
      roleTitle: roleTitle,
      reason: reason.trim(),
      time: now
    };

    od.odLetter = generateOnDutyLetter(od);

    await od.save();
    res.json({
      success: true,
      message: `On-Duty request rejected by ${roleTitle}.`,
      onDuty: od
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to reject On-Duty request', error: err.message });
  }
}

module.exports = {
  applyOnDuty,
  getOnDutyRequests,
  getOnDutyById,
  approveCounselorOD,
  approveAdvisorOD,
  approveHodOD,
  rejectOnDuty
};
