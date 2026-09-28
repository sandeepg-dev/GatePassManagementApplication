/**
 * Gate Physical Barcode Scanner & Movement Controller
 * Campus PassPro • GRT Institute of Engineering and Technology
 * Supports Hosteller Exit / Return (Scanned In Campus) and Day Scholar Exit
 */
const Pass = require('../models/Pass');
const Student = require('../models/Student');
const { getISTTimeString } = require('../utils/formatters');

/**
 * Scan pass barcode / ID card at security gate, verify approval, and record campus movement
 */
async function scanPass(req, res) {
  try {
    const cleanRollNo = (req.body.rollNo || '').trim().toUpperCase();
    const scanType = req.body.scanType || 'auto'; // 'auto' | 'exit' | 'return' | 'entry'

    if (!cleanRollNo) {
      return res.status(400).json({ success: false, message: 'Please provide student ID or roll number.' });
    }

    const now = new Date();
    const nowIST = getISTTimeString(now);

    // 1. Fetch student registered information and pass records
    const [studentPasses, registeredStudent] = await Promise.all([
      Pass.find({ rollNo: cleanRollNo }).sort({ createdAt: -1 }),
      Student.findOne({ rollNo: cleanRollNo }).lean()
    ]);

    // Handle unregistered ID cards with a clear message
    if ((!studentPasses || studentPasses.length === 0) && !registeredStudent) {
      return res.status(404).json({
        success: false,
        action: 'unregistered',
        message: `Invalid / Unregistered ID Card: No student record found for Register No "${cleanRollNo}". Access denied.`
      });
    }

    // Handle registered student with zero gate passes
    if (!studentPasses || studentPasses.length === 0) {
      const studentName = registeredStudent?.name || 'Student';
      const studentDept = registeredStudent?.dept || 'Engineering';
      const studentType = registeredStudent?.accommodation || 'Day Scholar';
      return res.status(404).json({
        success: false,
        action: 'no_pass',
        student: registeredStudent,
        message: `Student ${studentName} (${cleanRollNo}, ${studentDept} • ${studentType}) is registered, but has no active gate pass application on file.`
      });
    }

    // 2. Identify Student Accommodation (Hosteller vs Day Scholar)
    const latestPass = studentPasses[0];
    const accommodationSource = latestPass.accommodation || registeredStudent?.accommodation || '';
    const isHosteller = (/hoste?l|^h$/i.test(accommodationSource) && !/day/i.test(accommodationSource));
    const accommodation = isHosteller ? 'Hosteller' : 'Day Scholar';
    const studentName = latestPass.name || registeredStudent?.name || 'Student';

    // 3. Find active passes in various movement lifecycle states
    const exitedPass = studentPasses.find(p => p.status === 'Exited');
    const approvedPass = studentPasses.find(p => p.status === 'Approved');
    const returnedPass = studentPasses.find(p => p.status === 'Scanned In Campus' || p.status === 'Returned');
    const pendingPass = studentPasses.find(p => String(p.status || '').toLowerCase().includes('pending'));
    const rejectedPass = studentPasses.find(p => p.status === 'Rejected' || p.rejection?.rejected);

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
          message: `Return scan is not applicable for Day Scholars. Student ${studentName} (${cleanRollNo}) scans for Campus Exit only.`
        });
      }

      // If already exited and no new approved pass exists, prevent duplicate exit scan
      if (exitedPass && !approvedPass) {
        return res.status(400).json({
          success: false,
          action: 'already_exited',
          accommodation: 'Day Scholar',
          requiresReturn: false,
          message: `Day Scholar ${studentName} (${cleanRollNo}) already exited campus on ${exitedPass.exitTime || 'recorded exit time'}. Day Scholar pass lifecycle complete.`
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
          status: 'Exited',
          accommodation: 'Day Scholar',
          requiresReturn: false,
          message: `Campus Exit recorded for Day Scholar ${studentName} (${cleanRollNo}) at ${nowIST}. No return scan required.`,
          pass: approvedPass
        });
      }
    }

    // =========================================================================
    // CASE 2: HOSTELLERS (Must scan Exit when leaving and Return when coming back)
    // Status Flow: Approved Gate Pass → Scan ID → Exited → Scan ID Again → Scanned In Campus
    // =========================================================================
    if (isHosteller) {
      // Subcase 2A: Return / Entry Scan (explicit return or auto when student is Exited)
      if (scanType === 'return' || scanType === 'entry' || (scanType === 'auto' && exitedPass)) {
        if (exitedPass) {
          exitedPass.status = 'Scanned In Campus';
          exitedPass.exitStatus = 'Exited Campus';
          exitedPass.returnStatus = 'Scanned In Campus';
          exitedPass.returnTime = nowIST;
          await exitedPass.save();

          return res.json({
            success: true,
            action: 'return',
            status: 'Scanned In Campus',
            accommodation: 'Hosteller',
            requiresReturn: false,
            message: `Campus Return recorded for Hosteller ${studentName} (${cleanRollNo}) at ${nowIST}. Safely entered campus.`,
            pass: exitedPass
          });
        }

        if (scanType === 'return' || scanType === 'entry') {
          if (approvedPass) {
            return res.status(400).json({
              success: false,
              accommodation: 'Hosteller',
              message: `Cannot record campus return: Hosteller ${studentName} (${cleanRollNo}) has not scanned for Campus Exit yet. Please scan for Exit first.`
            });
          }
          if (returnedPass) {
            return res.status(400).json({
              success: false,
              accommodation: 'Hosteller',
              message: `Hosteller ${studentName} (${cleanRollNo}) has already completed campus entry at ${returnedPass.returnTime || 'N/A'}.`
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
            status: 'Exited',
            accommodation: 'Hosteller',
            requiresReturn: true,
            message: `Campus Exit recorded for Hosteller ${studentName} (${cleanRollNo}) at ${nowIST}. Return scan required upon arrival.`,
            pass: approvedPass
          });
        }

        if (scanType === 'exit') {
          if (exitedPass) {
            return res.status(400).json({
              success: false,
              accommodation: 'Hosteller',
              message: `Hosteller ${studentName} (${cleanRollNo}) already exited campus on ${exitedPass.exitTime || 'recorded exit time'}. Switch to Return Mode when student arrives back.`
            });
          }
          if (returnedPass) {
            return res.status(400).json({
              success: false,
              accommodation: 'Hosteller',
              message: `Previous gate pass for ${studentName} (${cleanRollNo}) was completed on ${returnedPass.returnTime || 'N/A'}. No new approved pass found.`
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
    // CASE 3: Common Inactive / Pending / Rejected Checks
    // =========================================================================
    if (returnedPass && !approvedPass && !exitedPass) {
      return res.status(400).json({
        success: false,
        accommodation,
        message: `Student ${studentName} (${cleanRollNo}) completed campus entry on ${returnedPass.returnTime || 'recorded time'}. Gate pass lifecycle is complete.`
      });
    }

    if (pendingPass) {
      return res.status(400).json({
        success: false,
        accommodation,
        message: `Gate pass for ${studentName} (${cleanRollNo}) is still pending clearance (${pendingPass.status}). Authority approval required before gate exit scan.`
      });
    }

    if (rejectedPass) {
      const rejReason = rejectedPass.rejectionReason || rejectedPass.rejection?.reason || 'Clearance not granted';
      return res.status(400).json({
        success: false,
        accommodation,
        message: `Gate pass for ${studentName} (${cleanRollNo}) was rejected: "${rejReason}". Clearance denied.`
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

/**
 * Get recent scanning & campus movement history
 * Provides complete scan history with:
 * Student Name, Register Number, Student Type, Exit Date & Time, Entry/Return Date & Time, Current Status
 */
async function getScanHistory(req, res) {
  try {
    const limit = Math.min(parseInt(req.query?.limit) || 30, 100);

    const passes = await Pass.find({
      $or: [
        { status: { $in: ['Exited', 'Scanned In Campus', 'Returned'] } },
        { exitTime: { $exists: true, $nin: ['', '-'] } }
      ]
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const history = passes.map(p => {
      const isHostel = (/hoste?l|^h$/i.test(p.accommodation || '') && !/day/i.test(p.accommodation || ''));
      return {
        _id: p._id,
        name: p.name || 'Student',
        rollNo: p.rollNo || '-',
        accommodation: isHostel ? 'Hosteller' : 'Day Scholar',
        dept: p.dept || '-',
        yearSec: p.yearSec || '-',
        exitTime: p.exitTime || '-',
        returnTime: isHostel ? (p.returnTime || '-') : 'Not Applicable (Day Scholar)',
        status: p.status === 'Returned' ? 'Scanned In Campus' : (p.status || 'Exited'),
        updatedAt: p.updatedAt || p.createdAt
      };
    });

    return res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch scan history' });
  }
}

module.exports = {
  scanPass,
  getScanHistory
};
