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

    // 1. Fetch student pass records
    const studentPasses = await Pass.find({ rollNo: cleanRollNo }).sort({ createdAt: -1 });

    if (!studentPasses || studentPasses.length === 0) {
      return res.status(404).json({
        success: false,
        action: 'not_found',
        message: `No gate pass record found for Roll No: ${cleanRollNo}.`
      });
    }

    // 2. Identify Student Accommodation (Hosteller vs Day Scholar)
    const latestPass = studentPasses[0];
    const isHosteller = (/hoste?l|^h$/i.test(latestPass.accommodation || '') && !/day/i.test(latestPass.accommodation || ''));
    const accommodation = isHosteller ? 'Hosteller' : 'Day Scholar';

    // 3. Find active passes in various states
    const exitedPass = studentPasses.find(p => p.status === 'Exited');
    const approvedPass = studentPasses.find(p => p.status === 'Approved');
    const returnedPass = studentPasses.find(p => p.status === 'Returned');

    // =========================================================================
    // CASE 1: DAY SCHOLARS (Exit Scan Only; Return Scan Not Required)
    // =========================================================================
    if (!isHosteller) {
      // Day Scholars do NOT require a return scan
      if (scanType === 'return' || scanType === 'entry') {
        return res.status(400).json({
          success: false,
          action: 'invalid_mode',
          accommodation: 'Day Scholar',
          requiresReturn: false,
          message: `Return scan is not applicable for Day Scholars. Student ${latestPass.name || cleanRollNo} (${cleanRollNo}) scans for Campus Exit only.`
        });
      }

      // If already exited, their day pass is complete
      if (exitedPass && !approvedPass) {
        return res.status(400).json({
          success: false,
          action: 'completed',
          accommodation: 'Day Scholar',
          requiresReturn: false,
          message: `Day Scholar ${exitedPass.name} (${cleanRollNo}) already exited campus on ${exitedPass.exitTime || 'recorded exit time'}. Day Scholar pass lifecycle complete.`
        });
      }

      // Execute Exit Scan for Day Scholar
      if (approvedPass) {
        approvedPass.status = 'Exited';
        approvedPass.exitStatus = 'Exited Campus';
        approvedPass.exitTime = nowIST;
        approvedPass.returnStatus = 'Not Applicable (Day Scholar)';
        approvedPass.returnTime = '-';
        await approvedPass.save();

        return res.json({
          success: true,
          action: 'exit',
          accommodation: 'Day Scholar',
          requiresReturn: false,
          message: `Campus Exit recorded for Day Scholar ${approvedPass.name} (${cleanRollNo}) at ${nowIST}. No return scan required.`,
          pass: approvedPass
        });
      }
    }

    // =========================================================================
    // CASE 2: HOSTELLERS (Must scan Exit when leaving and Return when coming back)
    // =========================================================================
    if (isHosteller) {
      // Subcase 2A: Return Scan (explicit return or auto when student is Exited)
      if (scanType === 'return' || scanType === 'entry' || (scanType === 'auto' && exitedPass)) {
        if (exitedPass) {
          exitedPass.status = 'Returned';
          exitedPass.exitStatus = 'Exited Campus';
          exitedPass.returnStatus = 'Returned to Campus';
          exitedPass.returnTime = nowIST;
          await exitedPass.save();

          return res.json({
            success: true,
            action: 'return',
            accommodation: 'Hosteller',
            requiresReturn: true,
            message: `Campus Return recorded for Hosteller ${exitedPass.name} (${cleanRollNo}) at ${nowIST}. Safely returned to campus.`,
            pass: exitedPass
          });
        }

        if (scanType === 'return' || scanType === 'entry') {
          if (approvedPass) {
            return res.status(400).json({
              success: false,
              accommodation: 'Hosteller',
              message: `Cannot record return: Hosteller ${approvedPass.name} (${cleanRollNo}) has not scanned for Campus Exit yet. Please scan for Exit first.`
            });
          }
          if (returnedPass) {
            return res.status(400).json({
              success: false,
              accommodation: 'Hosteller',
              message: `Hosteller ${returnedPass.name} (${cleanRollNo}) has already returned to campus on ${returnedPass.returnTime || 'N/A'}.`
            });
          }
          return res.status(400).json({
            success: false,
            accommodation: 'Hosteller',
            message: `No active exited gate pass found for Roll No: ${cleanRollNo}.`
          });
        }
      }

      // Subcase 2B: Exit Scan (explicit exit or auto when student is Approved)
      if (scanType === 'exit' || (scanType === 'auto' && approvedPass)) {
        if (approvedPass) {
          approvedPass.status = 'Exited';
          approvedPass.exitStatus = 'Exited Campus';
          approvedPass.exitTime = nowIST;
          approvedPass.returnStatus = 'Awaiting Return';
          await approvedPass.save();

          return res.json({
            success: true,
            action: 'exit',
            accommodation: 'Hosteller',
            requiresReturn: true,
            message: `Campus Exit recorded for Hosteller ${approvedPass.name} (${cleanRollNo}) at ${nowIST}. Return scan required upon arrival.`,
            pass: approvedPass
          });
        }

        if (scanType === 'exit') {
          if (exitedPass) {
            return res.status(400).json({
              success: false,
              accommodation: 'Hosteller',
              message: `Hosteller ${exitedPass.name} (${cleanRollNo}) already exited campus on ${exitedPass.exitTime || 'recorded exit time'}. Switch scanner to Return Mode when student arrives back.`
            });
          }
          if (returnedPass) {
            return res.status(400).json({
              success: false,
              accommodation: 'Hosteller',
              message: `Previous gate pass was already completed and returned on ${returnedPass.returnTime || 'N/A'}. No new approved pass found.`
            });
          }
          return res.status(400).json({
            success: false,
            accommodation: 'Hosteller',
            message: `No approved gate pass found to exit campus for Roll No: ${cleanRollNo}.`
          });
        }
      }
    }

    // =========================================================================
    // CASE 3: Common Inactive / Pending / Expired Checks
    // =========================================================================
    if (returnedPass) {
      return res.status(400).json({
        success: false,
        accommodation,
        message: `Student ${returnedPass.name} (${cleanRollNo}) pass was already completed on ${returnedPass.returnTime || 'recorded time'}.`
      });
    }

    const pendingPass = studentPasses.find(p => String(p.status).startsWith('Pending'));
    if (pendingPass) {
      return res.status(400).json({
        success: false,
        accommodation,
        message: `Gate pass for ${cleanRollNo} is still pending clearance (${pendingPass.status}). Authority approval required before gate movement scan.`
      });
    }

    return res.status(400).json({
      success: false,
      accommodation,
      message: `No active approved or exited gate pass found for Roll No: ${cleanRollNo}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Scan verification failed', error: err.message });
  }
}

module.exports = {
  scanPass
};
