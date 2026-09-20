/**
 * Gate Physical Barcode Scanner & Departure Controller
 */
const Pass = require('../models/Pass');
const { getISTTimeString } = require('../utils/formatters');

/**
 * Scan pass barcode at security gate, verify 20-minute validity, and record campus exit
 */
/**
 * Hosteller Gate Barcode & Roll Number Scanner Controller
 * Restricts Exit/Return scanner to HOSTELLER students only.
 * Records actual scanned exit date & time and return date & time in IST.
 */
async function scanPass(req, res) {
  try {
    const cleanRollNo = (req.body.rollNo || '').trim().toUpperCase();
    const scanType = req.body.scanType || 'auto'; // 'auto' | 'exit' | 'return' | 'entry'
    if (!cleanRollNo) {
      return res.status(400).json({ success: false, message: 'Please provide roll number' });
    }

    const now = new Date();
    const nowIST = getISTTimeString(now);

    // 1. Fetch student pass records to verify accommodation
    const studentPasses = await Pass.find({ rollNo: cleanRollNo }).sort({ createdAt: -1 });

    if (!studentPasses || studentPasses.length === 0) {
      return res.status(404).json({
        success: false,
        action: 'not_found',
        message: `No gate pass record found for Roll No: ${cleanRollNo}.`
      });
    }

    // 2. ENFORCE REQUIREMENT: Only Hostellers can use the Exit/Return scanner
    const latestPass = studentPasses[0];
    const isHosteller = (/hoste?l|^h$/i.test(latestPass.accommodation || '') && !/day/i.test(latestPass.accommodation || ''));

    if (!isHosteller) {
      const studentName = latestPass.name || cleanRollNo;
      return res.status(403).json({
        success: false,
        action: 'denied',
        isHosteller: false,
        message: `Access Denied: Exit & Return scanner is restricted to HOSTELLER students only. Student ${studentName} (${cleanRollNo}) is registered as Day Scholar.`
      });
    }

    // 3. Find active passes for this hosteller
    const exitedPass = studentPasses.find(p => p.status === 'Exited');
    const approvedPass = studentPasses.find(p => p.status === 'Approved');
    const returnedPass = studentPasses.find(p => p.status === 'Returned');

    // =========================================================================
    // CASE A: Explicit Return Scan OR Auto Scan when student is currently Exited
    // =========================================================================
    if (scanType === 'return' || scanType === 'entry' || (scanType === 'auto' && exitedPass)) {
      if (exitedPass) {
        exitedPass.status = 'Returned';
        exitedPass.exitStatus = 'Returned to College';
        exitedPass.returnStatus = 'Returned';
        exitedPass.returnTime = nowIST; // Actual scanned return date and time in IST
        await exitedPass.save();

        return res.json({
          success: true,
          action: 'return',
          message: `Hostel Return recorded for ${exitedPass.name} (${cleanRollNo}) at ${nowIST}. Safely returned to campus.`,
          pass: exitedPass
        });
      }

      // If explicit return requested but student is not in 'Exited' state
      if (scanType === 'return' || scanType === 'entry') {
        if (approvedPass) {
          return res.status(400).json({
            success: false,
            message: `Cannot record return: Student ${approvedPass.name} (${cleanRollNo}) has not scanned for exit yet (Status is Approved). Please scan for Campus Exit first.`
          });
        }
        if (returnedPass) {
          return res.status(400).json({
            success: false,
            message: `Student ${returnedPass.name} (${cleanRollNo}) has already returned to campus on ${returnedPass.returnTime || 'N/A'}.`
          });
        }
        return res.status(400).json({
          success: false,
          message: `No active exited gate pass found for Roll No: ${cleanRollNo}.`
        });
      }
    }

    // =========================================================================
    // CASE B: Explicit Exit Scan OR Auto Scan when student is currently Approved
    // =========================================================================
    if (scanType === 'exit' || (scanType === 'auto' && approvedPass)) {
      if (approvedPass) {
        approvedPass.status = 'Exited';
        approvedPass.exitStatus = 'Exited Campus';
        approvedPass.exitTime = nowIST; // Actual scanned exit date and time in IST
        await approvedPass.save();

        return res.json({
          success: true,
          action: 'exit',
          message: `Hostel Campus Exit recorded for ${approvedPass.name} (${cleanRollNo}) at ${nowIST}.`,
          pass: approvedPass
        });
      }

      // If explicit exit requested but student is already Exited
      if (scanType === 'exit') {
        if (exitedPass) {
          return res.status(400).json({
            success: false,
            message: `Student ${exitedPass.name} (${cleanRollNo}) already exited campus on ${exitedPass.exitTime || 'recorded exit time'}. Switch scanner to Return Mode when student arrives back.`
          });
        }
        if (returnedPass) {
          return res.status(400).json({
            success: false,
            message: `Previous gate pass was already completed and returned on ${returnedPass.returnTime || 'N/A'}. No new approved pass found.`
          });
        }
        return res.status(400).json({
          success: false,
          message: `No approved gate pass found to exit campus for Roll No: ${cleanRollNo}.`
        });
      }
    }

    // =========================================================================
    // CASE C: Already Returned / Pending / Inactive
    // =========================================================================
    if (returnedPass) {
      return res.status(400).json({
        success: false,
        message: `Student ${returnedPass.name} (${cleanRollNo}) already marked returned to college on ${returnedPass.returnTime || 'N/A'}.`
      });
    }

    const pendingPass = studentPasses.find(p => String(p.status).startsWith('Pending'));
    if (pendingPass) {
      return res.status(400).json({
        success: false,
        message: `Gate pass for ${cleanRollNo} is still pending clearance (${pendingPass.status}). Authority approval required before gate movement scan.`
      });
    }

    return res.status(400).json({
      success: false,
      message: `No active approved or exited gate pass found for Roll No: ${cleanRollNo}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Scan verification failed', error: err.message });
  }
}

module.exports = {
  scanPass
};
