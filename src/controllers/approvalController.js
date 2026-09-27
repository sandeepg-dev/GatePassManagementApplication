/**
 * Multi-Tier Authority Approval Workflow Controller
 */
const mongoose = require('mongoose');
const Pass = require('../models/Pass');
const OnDuty = require('../models/OnDuty');
const Student = require('../models/Student');
const User = require('../models/User');
const { getISTTimeString } = require('../utils/formatters');
const { generateFormalLetter, generateOnDutyLetter } = require('../utils/letterGenerator');

/**
 * Tier 1: Class Counselor Phone Verification & Clearance
 */
async function approveCounselor(req, res) {
  try {
    const { passId, parentCalled, counselorName } = req.body;
    if (!mongoose.Types.ObjectId.isValid(passId)) {
      return res.status(400).json({ success: false, message: 'Invalid pass ID' });
    }

    const pass = await Pass.findById(passId);
    if (!pass) return res.status(404).json({ success: false, message: 'Pass not found' });

    const cName = counselorName || 'Assigned Counselor';
    const now = getISTTimeString();

    pass.status = 'Pending Advisor';
    pass.parentCallVerified = !!parentCalled;
    pass.parentCalledBy = `I talked to their parents (Counselor: ${cName})`;
    pass.parentCallTime = now;
    pass.counselorApproval = {
      counselorName: cName,
      approved: true,
      time: now
    };
    if (typeof generateFormalLetter === 'function') {
      pass.formalLetter = generateFormalLetter(pass, pass.reason, pass.appliedTime, pass);
    }

    await pass.save();
    res.json({
      success: true,
      message: `Verified by Counselor (${cName}) & forwarded to Class Advisor.`,
      pass
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Counselor verification failed', error: err.message });
  }
}

/**
 * Tier 2: Class Advisor Review & Verification
 */
async function approveAdvisor(req, res) {
  try {
    const { passId, advisorName, parentCalledFallback } = req.body;
    if (!mongoose.Types.ObjectId.isValid(passId)) {
      return res.status(400).json({ success: false, message: 'Invalid pass ID' });
    }

    const pass = await Pass.findById(passId);
    if (!pass) return res.status(404).json({ success: false, message: 'Pass not found' });

    const aName = advisorName || 'Class Advisor';
    const now = getISTTimeString();

    if (!pass.parentCallVerified && parentCalledFallback) {
      pass.parentCallVerified = true;
      pass.parentCalledBy = `I talked to their parents (Class Advisor: ${aName}) [Counselor Absent]`;
      pass.parentCallTime = now;
    }

    if (!pass.parentCallVerified) {
      return res.status(400).json({
        success: false,
        message: 'Parent verification is required before sending to HOD.'
      });
    }

    pass.status = 'Pending HOD';
    pass.advisorApproval = {
      advisorName: aName,
      approved: true,
      time: now
    };
    if (typeof generateFormalLetter === 'function') {
      pass.formalLetter = generateFormalLetter(pass, pass.reason, pass.appliedTime, pass);
    }

    await pass.save();
    res.json({
      success: true,
      message: `Approved by Class Advisor (${aName}) & routed to HOD.`,
      pass
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Advisor approval failed', error: err.message });
  }
}

/**
 * Tier 3: Department Head (HOD) Authorization
 * Workflow Rules:
 * 1. Leave Request: Student -> Counselor -> Class Advisor -> HOD -> CLOSED
 * 2. Gate Pass (Both Day Scholar & Hosteller): Student -> Counselor -> Class Advisor -> HOD -> Principal -> (Warden if Hosteller) -> Final Approval
 */
async function approveHod(req, res) {
  try {
    const { passId, hodName } = req.body;
    if (!mongoose.Types.ObjectId.isValid(passId)) {
      return res.status(400).json({ success: false, message: 'Invalid pass ID' });
    }

    const pass = await Pass.findById(passId);
    if (!pass) return res.status(404).json({ success: false, message: 'Pass not found' });

    const hName = hodName || 'Department HOD';
    const now = getISTTimeString();
    pass.hodApproval = {
      hodName: hName,
      approved: true,
      time: now
    };

    // 1. Leave Request: Ends at HOD -> CLOSED
    if (pass.requestCategory === 'leave') {
      pass.status = 'Approved';
      pass.approvalTime = now;
      if (typeof generateFormalLetter === 'function') {
        pass.formalLetter = generateFormalLetter(pass, pass.reason, pass.appliedTime, pass);
      }
      await pass.save();
      return res.json({
        success: true,
        message: `Leave Request authorized by HOD (${hName}) and successfully closed.`,
        pass
      });
    }

    // 2. Gate Pass:
    // ALL Gate Passes (Day Scholar and Hosteller) route to Principal for Institutional Directorate Clearance
    pass.status = 'Pending Principal';
    if (typeof generateFormalLetter === 'function') {
      pass.formalLetter = generateFormalLetter(pass, pass.reason, pass.appliedTime, pass);
    }
    await pass.save();
    return res.json({
      success: true,
      message: `Gate Pass authorized by HOD (${hName}) & routed to Principal.`,
      pass
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'HOD authorization failed', error: err.message });
  }
}

/**
 * Tier 4: Principal Directorate Clearance
 * Day Scholar: Student -> Counselor -> Advisor -> HOD -> Principal -> FINAL APPROVAL (Gate Pass Ready)
 * Hosteller  : Student -> Counselor -> Advisor -> HOD -> Principal -> Warden -> FINAL APPROVAL (Gate Pass Ready)
 */
async function approvePrincipal(req, res) {
  try {
    const { passId, principalName } = req.body;
    if (!mongoose.Types.ObjectId.isValid(passId)) {
      return res.status(400).json({ success: false, message: 'Invalid pass ID' });
    }

    const pass = await Pass.findById(passId);
    if (!pass) return res.status(404).json({ success: false, message: 'Pass not found' });

    const now = new Date();
    const expiry = new Date(now.getTime() + 20 * 60 * 1000);
    const pName = principalName || 'Principal';

    pass.principalApproval = { principalName: pName, approved: true, time: getISTTimeString(now) };

    const isHostel = (/hoste?l|^h$/i.test(pass.accommodation || '') && !/day/i.test(pass.accommodation || ''));
    if (isHostel) {
      // Hosteller Gate Pass routes to Warden for hostel clearance
      const isFemale = /^female$/i.test(String(pass.gender || '').trim());
      pass.status = isFemale ? 'Pending Girls Warden' : 'Pending Boys Warden';
      if (typeof generateFormalLetter === 'function') {
        pass.formalLetter = generateFormalLetter(pass, pass.reason, pass.appliedTime, pass);
      }
      await pass.save();
      return res.json({
        success: true,
        message: `Gate Pass approved by Principal (${pName}) & forwarded to ${isFemale ? 'Girls' : 'Boys'} Hostel Warden.`,
        pass
      });
    } else {
      // Day Scholar: Principal is Final Clearance -> Gate Pass Ready
      pass.status = 'Approved';
      pass.approvalTime = getISTTimeString(now);
      pass.validUntil = getISTTimeString(expiry);
      pass.expiresAt = expiry;
      if (typeof generateFormalLetter === 'function') {
        pass.formalLetter = generateFormalLetter(pass, pass.reason, pass.appliedTime, pass);
      }
      await pass.save();
      return res.json({
        success: true,
        message: 'Principal final authorization granted! Gate Pass is ready.',
        pass
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Principal approval failed', error: err.message });
  }
}

/**
 * Generic Hostel Warden Clearance
 */
async function approveWarden(req, res) {
  try {
    const { passId, wardenName } = req.body;
    if (!mongoose.Types.ObjectId.isValid(passId)) {
      return res.status(400).json({ success: false, message: 'Invalid pass ID' });
    }

    const pass = await Pass.findById(passId);
    if (!pass) return res.status(404).json({ success: false, message: 'Pass not found' });

    const now = new Date();
    const expiry = new Date(now.getTime() + 20 * 60 * 1000);
    const wName = wardenName || 'Hostel Warden';

    pass.wardenApproval = { wardenName: wName, approved: true, time: getISTTimeString(now) };
    pass.status = 'Approved';
    pass.approvalTime = getISTTimeString(now);
    pass.validUntil = getISTTimeString(expiry);
    pass.expiresAt = expiry;
    if (typeof generateFormalLetter === 'function') {
      pass.formalLetter = generateFormalLetter(pass, pass.reason, pass.appliedTime, pass);
    }

    await pass.save();
    return res.json({
      success: true,
      message: `Hostel Warden clearance granted by ${wName}! Gate Pass is ready.`,
      pass
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Hostel Warden clearance failed', error: err.message });
  }
}

/**
 * Boys Hostel Warden Final Clearance (20-Minute Departure Window)
 */
async function approveBoysWarden(req, res) {
  try {
    const { passId, wardenName } = req.body;
    if (!mongoose.Types.ObjectId.isValid(passId)) {
      return res.status(400).json({ success: false, message: 'Invalid pass ID' });
    }

    const pass = await Pass.findById(passId);
    if (!pass) return res.status(404).json({ success: false, message: 'Pass not found' });

    const now = new Date();
    const expiry = new Date(now.getTime() + 20 * 60 * 1000);
    const wName = wardenName || 'Boys Hostel Warden';

    pass.wardenApproval = { wardenName: wName, approved: true, time: getISTTimeString(now) };
    pass.status = 'Approved';
    pass.approvalTime = getISTTimeString(now);
    pass.validUntil = getISTTimeString(expiry);
    pass.expiresAt = expiry;
    if (typeof generateFormalLetter === 'function') {
      pass.formalLetter = generateFormalLetter(pass, pass.reason, pass.appliedTime, pass);
    }

    await pass.save();
    return res.json({
      success: true,
      message: 'Boys Hostel Warden final approval granted! Gate Pass is ready.',
      pass
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Boys Hostel Warden approval failed', error: err.message });
  }
}

/**
 * Girls Hostel Warden Final Clearance (20-Minute Departure Window)
 */
async function approveGirlsWarden(req, res) {
  try {
    const { passId, wardenName } = req.body;
    if (!mongoose.Types.ObjectId.isValid(passId)) {
      return res.status(400).json({ success: false, message: 'Invalid pass ID' });
    }

    const pass = await Pass.findById(passId);
    if (!pass) return res.status(404).json({ success: false, message: 'Pass not found' });

    const now = new Date();
    const expiry = new Date(now.getTime() + 20 * 60 * 1000);
    const wName = wardenName || 'Girls Hostel Warden';

    pass.wardenApproval = { wardenName: wName, approved: true, time: getISTTimeString(now) };
    pass.status = 'Approved';
    pass.approvalTime = getISTTimeString(now);
    pass.validUntil = getISTTimeString(expiry);
    pass.expiresAt = expiry;
    if (typeof generateFormalLetter === 'function') {
      pass.formalLetter = generateFormalLetter(pass, pass.reason, pass.appliedTime, pass);
    }

    await pass.save();
    return res.json({
      success: true,
      message: 'Girls Hostel Warden final approval granted! Gate Pass is ready.',
      pass
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Girls Hostel Warden approval failed', error: err.message });
  }
}

/**
 * Universal Gate Pass / Leave Application Rejection Handler across all authority levels
 * (Counselor, Class Advisor, HOD, Principal, Warden)
 */
async function rejectPass(req, res) {
  try {
    const { passId, reason, rejectedBy, role } = req.body;
    if (!mongoose.Types.ObjectId.isValid(passId)) {
      return res.status(400).json({ success: false, message: 'Invalid pass ID' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a reason for rejection.' });
    }

    const pass = await Pass.findById(passId);
    if (!pass) return res.status(404).json({ success: false, message: 'Pass not found' });

    const now = getISTTimeString();
    const roleTitles = {
      counselor: 'Class Counselor',
      advisor: 'Class Advisor',
      hod: 'Head of Department (HOD)',
      principal: 'Principal',
      boys_warden: 'Boys Hostel Warden',
      girls_warden: 'Girls Hostel Warden',
      warden: 'Hostel Warden'
    };
    const roleTitle = roleTitles[role] || (role ? role.toUpperCase() : 'Authority');
    const approverName = rejectedBy || 'Designated Authority';

    pass.status = 'Rejected';
    pass.rejectionReason = reason.trim();
    pass.rejectedBy = `${roleTitle} (${approverName})`;
    pass.rejectedTime = now;
    pass.rejection = {
      rejected: true,
      rejectedBy: approverName,
      role: role || 'authority',
      roleTitle: roleTitle,
      reason: reason.trim(),
      time: now
    };
    if (typeof generateFormalLetter === 'function') {
      pass.formalLetter = generateFormalLetter(pass, pass.reason, pass.appliedTime, pass);
    }

    await pass.save();
    return res.json({
      success: true,
      message: `Requisition rejected by ${roleTitle}. Rejection reason recorded and returned to student.`,
      pass
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to reject pass', error: err.message });
  }
}

/**
 * Record student campus/hostel exit by Hostel Warden
 */
async function markWardenExit(req, res) {
  try {
    const { passId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(passId)) {
      return res.status(400).json({ success: false, message: 'Invalid pass ID' });
    }

    const pass = await Pass.findById(passId);
    if (!pass) return res.status(404).json({ success: false, message: 'Pass not found' });

    const nowIST = getISTTimeString();
    pass.status = 'Exited';
    pass.exitStatus = 'Exited Campus';
    pass.exitTime = nowIST;

    await pass.save();
    return res.json({
      success: true,
      message: `Campus exit recorded for ${pass.name} (${pass.rollNo}) at ${nowIST}.`,
      pass
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to record exit' });
  }
}

/**
 * Record student hostel/campus return by Hostel Warden
 */
async function markWardenReturn(req, res) {
  try {
    const { passId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(passId)) {
      return res.status(400).json({ success: false, message: 'Invalid pass ID' });
    }

    const pass = await Pass.findById(passId);
    if (!pass) return res.status(404).json({ success: false, message: 'Pass not found' });

    const nowIST = getISTTimeString();
    pass.status = 'Returned';
    pass.exitStatus = 'Returned to College';
    pass.returnStatus = 'Returned';
    pass.returnTime = nowIST;

    await pass.save();
    return res.json({
      success: true,
      message: `Student ${pass.name} (${pass.rollNo}) marked safely RETURNED at ${nowIST}.`,
      pass
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to record return' });
  }
}

/**
 * Bulk Multi-Pass Approval for Authority Queues
 */
async function bulkApprovePasses(req, res) {
  try {
    const { passIds, role, authorityName, parentCalled } = req.body;
    if (!Array.isArray(passIds) || passIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No pass IDs provided for bulk approval' });
    }

    const validIds = passIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid pass IDs provided' });
    }

    const now = getISTTimeString();
    const expiry = new Date(Date.now() + 20 * 60 * 1000);
    const authName = authorityName || 'Authorized Official';
    let processedCount = 0;

    for (const id of validIds) {
      const pass = await Pass.findById(id);
      if (pass) {
        if (role === 'counselor') {
          pass.status = 'Pending Advisor';
          pass.parentCallVerified = !!parentCalled;
          pass.parentCalledBy = `Bulk parent call verification (Counselor: ${authName})`;
          pass.parentCallTime = now;
          pass.counselorApproval = { counselorName: authName, approved: true, time: now };
        } else if (role === 'advisor') {
          pass.status = 'Pending HOD';
          pass.advisorApproval = { advisorName: authName, approved: true, time: now };
          if (!pass.parentCallVerified && parentCalled) {
            pass.parentCallVerified = true;
            pass.parentCallTime = now;
          }
        } else if (role === 'hod') {
          pass.hodApproval = { hodName: authName, approved: true, time: now };
          if (pass.requestCategory === 'leave') {
            pass.status = 'Approved';
            pass.approvalTime = now;
          } else {
            pass.status = 'Pending Principal';
          }
        } else if (role === 'principal') {
          pass.principalApproval = { principalName: authName, approved: true, time: now };
          const isHosteller = (/hoste?l|^h$/i.test(pass.accommodation || '') && !/day/i.test(pass.accommodation || ''));
          if (isHosteller) {
            const isFemale = /^female$/i.test(String(pass.gender || '').trim());
            pass.status = isFemale ? 'Pending Girls Warden' : 'Pending Boys Warden';
          } else {
            pass.status = 'Approved';
            pass.approvalTime = now;
            pass.validUntil = getISTTimeString(expiry);
            pass.expiresAt = expiry;
          }
        } else if (role === 'warden' || role === 'boys_warden' || role === 'girls_warden') {
          pass.wardenApproval = { wardenName: authName, approved: true, time: now };
          pass.status = 'Approved';
          pass.approvalTime = now;
          pass.validUntil = getISTTimeString(expiry);
          pass.expiresAt = expiry;
        }
        await pass.save();
        processedCount++;
        continue;
      }

      const od = await OnDuty.findById(id);
      if (od) {
        if (role === 'counselor') {
          od.status = 'Pending Advisor';
          od.counselorApproval = { counselorName: authName, approved: true, time: now };
        } else if (role === 'advisor') {
          od.status = 'Pending HOD';
          od.advisorApproval = { advisorName: authName, approved: true, time: now };
        } else if (role === 'hod') {
          od.status = 'Completed';
          od.hodApproval = { hodName: authName, approved: true, time: now };
        }
        od.odLetter = generateOnDutyLetter(od);
        await od.save();
        processedCount++;
      }
    }

    return res.json({
      success: true,
      count: processedCount,
      message: `Successfully approved ${processedCount} requisition(s) in batch.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Bulk approval failed', error: err.message });
  }
}

module.exports = {
  approveCounselor,
  approveAdvisor,
  approveHod,
  approvePrincipal,
  approveWarden,
  approveBoysWarden,
  approveGirlsWarden,
  bulkApprovePasses,
  rejectPass,
  markWardenExit,
  markWardenReturn
};
