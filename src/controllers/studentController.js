/**
 * Student Directory & Roster Controller
 */
const xlsx = require('xlsx');
const Student = require('../models/Student');

function cleanPhoneNumber(val) {
  if (val === null || val === undefined || val === '') return '-';
  let s = String(val).trim();
  if (s.endsWith('.0')) s = s.slice(0, -2);
  if (/^\d+(\.\d+)?e\+?\d+$/i.test(s)) {
    try { s = Number(s).toFixed(0); } catch (_) {}
  }
  const digits = s.replace(/[^\d+]/g, '');
  return digits || s || '-';
}

function parseGender(val) {
  const g = String(val || '').trim().toLowerCase();
  if (g.startsWith('f') || g === 'female' || g === 'girl' || g === 'woman') return 'Female';
  if (g === 'other') return 'Other';
  return 'Male';
}

/**
 * Upload student batch via Excel/CSV spreadsheet
 */
async function uploadStudents(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an Excel file' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
      header: 1,
      defval: ''
    });

    let headerIdx = rows.findIndex(r =>
      r.some(c => String(c).toLowerCase().replace(/[^a-z0-9]/g, '').includes('roll'))
    );
    if (headerIdx === -1) headerIdx = 0;

    const rawHeaders = rows[headerIdx].map(h =>
      String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    );
    const getCol = keys => rawHeaders.findIndex(h => keys.some(k => h.includes(k)));

    const rollIdx = getCol(['roll', 'reg', 'id', 'register']);
    const parentContactIdx = getCol([
      'parentcontact', 'parentphone', 'parentmobile', 'parentnumber', 'parentno', 'parentcell',
      'fatherphone', 'fathermobile', 'fathercontact',
      'motherphone', 'mothermobile', 'mothercontact',
      'guardianphone', 'guardianmobile', 'guardiancontact',
      'contactnumber', 'contactno', 'mobilenumber', 'mobileno', 'phonenumber', 'phoneno',
      'parent', 'father', 'guardian', 'contact', 'mobile', 'phone'
    ]);
    const genderIdx = getCol(['gender', 'sex']);

    const bulkOps = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const rollNo =
        rollIdx !== -1 && row[rollIdx] ? String(row[rollIdx]).trim().toUpperCase() : '';
      if (!rollNo || rollNo.toLowerCase().includes('roll') || rollNo.toLowerCase().includes('register')) continue;

      const rawContact = parentContactIdx !== -1 && row[parentContactIdx] ? row[parentContactIdx] : '-';
      const parentContact = cleanPhoneNumber(rawContact);
      
      const updateData = {
        parentContact,
        mobile: '-' // Student mobile number excluded per policy
      };

      if (genderIdx !== -1 && row[genderIdx]) {
        updateData.gender = parseGender(row[genderIdx]);
      }

      bulkOps.push({
        updateOne: {
          filter: { rollNo },
          update: { $set: updateData },
          upsert: false
        }
      });
    }

    if (bulkOps.length > 0) {
      await Student.bulkWrite(bulkOps);
    }

    res.json({
      success: true,
      message: `Successfully registered/updated ${bulkOps.length} students!`,
      count: bulkOps.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get total student count for dashboard statistics
 */
async function getStudentCount(req, res) {
  try {
    const count = await Student.countDocuments();
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  uploadStudents,
  getStudentCount
};
