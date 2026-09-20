/**
 * Gate Physical Barcode Scanner & Departure Controller
 */
const Pass = require('../models/Pass');
const { getISTTimeString } = require('../utils/formatters');

/**
 * Scan pass barcode at security gate, verify 20-minute validity, and record campus exit
 */
async function scanPass(req, res) {
  try {
    const cleanRollNo = (req.body.rollNo || '').trim().toUpperCase();
    const scanType = req.body.scanType; // optional: 'exit' | 'entry' | 'return'
    if (!cleanRollNo) {
      return res.status(400).json({ success: false, message: 'Please provide roll number' });
    }

    const now = new Date();
    const nowIST = getISTTimeString(now);

    // 1. Check for student with an 'Approved' pass (Departure / Campus Exit Scan)
    if (!scanType || scanType === 'exit') {
      const approvedPass = await Pass.findOne({
        rollNo: cleanRollNo,
        status: 'Approved'
      }).sort({ createdAt: -1 });

      if (approvedPass) {
        // Expiration verification (20-minute departure gate pass window)
        if (approvedPass.expiresAt && now > approvedPass.expiresAt) {
          approvedPass.status = 'Expired';
          await approvedPass.save();
          return res.status(400).json({
            success: false,
            message: 'Gate pass expired! 20-minute departure validity elapsed.'
          });
        }

        approvedPass.status = 'Exited';
        approvedPass.exitStatus = 'Exited Campus';
        approvedPass.exitTime = nowIST;
        await approvedPass.save();

        return res.json({
          success: true,
          action: 'exit',
          message: `Campus exit recorded for ${approvedPass.name} (${cleanRollNo}) at ${nowIST}.`,
          pass: approvedPass
        });
      }
    }

    // 2. Check for student with an 'Exited' pass (Return to College Scan)
    if (!scanType || scanType === 'entry' || scanType === 'return') {
      const exitedPass = await Pass.findOne({
        rollNo: cleanRollNo,
        status: 'Exited'
      }).sort({ createdAt: -1 });

      if (exitedPass) {
        exitedPass.status = 'Returned';
        exitedPass.exitStatus = 'Returned to College';
        exitedPass.returnStatus = 'Returned';
        exitedPass.returnTime = nowIST; // Exact date, time, and seconds in IST
        await exitedPass.save();

        return res.json({
          success: true,
          action: 'return',
          message: `Student ${exitedPass.name} (${cleanRollNo}) safely RETURNED to college at ${nowIST}.`,
          pass: exitedPass
        });
      }
    }

    // 3. Check if most recent pass was already returned
    const returnedPass = await Pass.findOne({
      rollNo: cleanRollNo,
      status: 'Returned'
    }).sort({ createdAt: -1 });

    if (returnedPass) {
      return res.status(400).json({
        success: false,
        message: `Student already marked returned to college on ${returnedPass.returnTime || 'N/A'}.`
      });
    }

    return res.status(400).json({
      success: false,
      message: `No active ${scanType ? scanType : 'approved or exited'} pass found for Roll No: ${cleanRollNo}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Scan verification failed', error: err.message });
  }
}

module.exports = {
  scanPass
};
