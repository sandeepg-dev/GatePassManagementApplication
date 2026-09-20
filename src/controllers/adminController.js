/**
 * Centralized Administrator Management Controller
 * Handles user provisioning, staff role assignments, student rosters & analytics
 */
const bcrypt = require('bcryptjs');
const xlsx = require('xlsx');
const User = require('../models/User');
const Student = require('../models/Student');
const Pass = require('../models/Pass');
const mongoose = require('mongoose');
const { extractSection, extractYear, extractRollNumber } = require('../utils/formatters');

/**
 * Standardize Gender string from diverse spreadsheet and form inputs
 */
function parseGender(val) {
  const g = String(val || '').trim().toLowerCase();
  if (g.startsWith('f') || g === 'female' || g === 'girl' || g === 'woman') return 'Female';
  if (g === 'other') return 'Other';
  return 'Male';
}

/**
 * Clean and format parent contact number (handles Excel float .0 and scientific notations)
 */
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

/**
 * Standardize Accommodation string from diverse spreadsheet and form inputs
 * Preserves Hosteller and Days Scholar exactly as uploaded
 */
function parseAccommodation(val) {
  if (!val && val !== 0) return 'Days Scholar';
  const s = String(val).trim();
  if (/hoste?l|^h$/i.test(s) && !/day/i.test(s)) {
    return 'Hosteller';
  }
  if (/days?\s*scholar|^ds$/i.test(s)) {
    return 'Days Scholar';
  }
  return s;
}

/**
 * Ensure default Administrator account exists on system initialization
 */
async function seedDefaultAdmin() {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      const defaultAdmin = new User({
        userId: 'admin',
        name: 'System Administrator',
        password: hashedPassword,
        role: 'admin',
        dept: 'ALL',
        academicYear: 'N/A',
        accommodation: 'N/A'
      });
      await defaultAdmin.save();
      console.log('[Admin] Default Admin account initialized: [User ID: admin]');
    }
  } catch (err) {
    console.error('Failed to seed default admin:', err.message);
  }
}

// Run seed when MongoDB connects
mongoose.connection.on('connected', seedDefaultAdmin);
if (mongoose.connection.readyState === 1) {
  seedDefaultAdmin();
}

/**
 * Admin Login Authentication (Password Verification Only)
 */
async function adminLogin(req, res) {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both Admin ID and Password.' });
    }

    const cleanId = userId.trim().toLowerCase();
    const user = await User.findOne({ userId: cleanId });

    if (!user || user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Invalid Administrator credentials or unauthorized account.' });
    }

    const isMatch = await bcrypt.compare(password.trim(), user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid Administrator credentials.' });
    }

    const safeAdmin = user.toObject();
    delete safeAdmin.password;

    res.json({
      success: true,
      message: 'Admin authentication successful.',
      admin: safeAdmin
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Overview & Analytics KPI Statistics
 */
async function getAdminStats(req, res) {
  try {
    const [
      totalStudents,
      totalStaff,
      counselorsCount,
      advisorsCount,
      hodsCount,
      wardensCount,
      totalPasses,
      approvedPasses,
      pendingPasses,
      exitedPasses
    ] = await Promise.all([
      Student.countDocuments(),
      User.countDocuments({ role: { $ne: 'student' } }),
      User.countDocuments({ role: 'counselor' }),
      User.countDocuments({ role: 'advisor' }),
      User.countDocuments({ role: 'hod' }),
      User.countDocuments({ role: { $in: ['boys_warden', 'girls_warden', 'boys warden', 'girls warden'] } }),
      Pass.countDocuments(),
      Pass.countDocuments({ status: { $in: ['Approved', 'Exited', 'Returned'] } }),
      Pass.countDocuments({ status: { $regex: /^Pending/i } }),
      Pass.countDocuments({ status: 'Exited' })
    ]);

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalStaff,
        counselorsCount,
        advisorsCount,
        hodsCount,
        wardensCount,
        totalPasses,
        approvedPasses,
        pendingPasses,
        exitedPasses
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Find matching counselor for a given roll number
 */
async function findCounselorForRoll(rollNo) {
  if (!rollNo) return 'Class Counselor';
  const cleanRoll = rollNo.trim().toUpperCase();
  const rollNum = extractRollNumber(cleanRoll);
  if (rollNum === 0n) return 'Class Counselor';

  const counselors = await User.find({ role: 'counselor' });
  for (const c of counselors) {
    const sVal = extractRollNumber(c.startRoll);
    const eVal = extractRollNumber(c.endRoll);
    if (sVal > 0n && eVal > 0n && rollNum >= sVal && rollNum <= eVal) {
      return c.name;
    }
    if (c.extraRolls && Array.isArray(c.extraRolls) && c.extraRolls.includes(cleanRoll)) {
      return c.name;
    }
  }
  return 'Class Counselor';
}

/**
 * Get Students List with Search & Filtering
 */
async function getStudents(req, res) {
  try {
    const { search, dept, academicYear, year, yearSec, accommodation, page = 1, limit = 100, all } = req.query;
    const filter = {};

    if (dept && dept !== 'ALL') filter.dept = dept.toUpperCase().trim();
    const targetYear = academicYear || year;
    if (targetYear && targetYear !== 'ALL') filter.academicYear = extractYear(targetYear);
    if (yearSec && yearSec !== 'ALL') filter.yearSec = extractSection(yearSec);
    if (accommodation && accommodation !== 'ALL') {
      if (/hoste?l|^h$/i.test(accommodation) && !/day/i.test(accommodation)) {
        filter.accommodation = { $regex: /hoste?l|^h$/i, $not: /day\s*scholar/i };
      } else {
        filter.accommodation = { $regex: /day/i };
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { rollNo: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
        { counselorName: { $regex: q, $options: 'i' } },
        { parentName: { $regex: q, $options: 'i' } },
        { parentContact: { $regex: q, $options: 'i' } }
      ];
    }

    const isAll = all === 'true' || all === true;
    const actualLimit = isAll ? 5000 : parseInt(limit);
    const skip = isAll ? 0 : (parseInt(page) - 1) * actualLimit;

    const [students, total] = await Promise.all([
      Student.find(filter).sort({ rollNo: 1 }).skip(skip).limit(actualLimit),
      Student.countDocuments(filter)
    ]);

    res.json({
      success: true,
      students,
      total,
      page: isAll ? 1 : parseInt(page),
      totalPages: isAll ? 1 : Math.ceil(total / actualLimit)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Add Single Student & Generate Login Credentials
 */
async function createStudent(req, res) {
  try {
    const {
      name,
      rollNo,
      dept,
      academicYear,
      yearSec,
      accommodation,
      gender,
      counselorName,
      parentName,
      parentContact,
      email,
      address,
      password
    } = req.body;

    if (!rollNo || !name || !password) {
      return res.status(400).json({ success: false, message: 'Student Name, Registration Number, and Password are required.' });
    }
    const cleanRoll = rollNo.trim().toUpperCase();
    const cleanId = cleanRoll.toLowerCase();
    const cleanDept = (dept || 'CSE').trim().toUpperCase();
    const cleanSec = extractSection(yearSec || 'A');
    const cleanYear = extractYear(academicYear || '3 Year');
    const cleanAccom = parseAccommodation(accommodation);
    const cleanGender = parseGender(gender);
    const manualCounselor = (counselorName && counselorName.trim()) ? counselorName.trim() : '-';
    const cleanParentName = (parentName && parentName.trim()) ? parentName.trim() : '-';
    const cleanParentContact = cleanPhoneNumber(parentContact);

    const existingStudent = await Student.findOne({ rollNo: cleanRoll });
    const existingUser = await User.findOne({ userId: cleanId });

    if (existingStudent || existingUser) {
      return res.status(400).json({ success: false, message: `Student with Registration Number ${cleanRoll} already exists.` });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    // Save Student profile
    const newStudent = new Student({
      rollNo: cleanRoll,
      name: name.trim(),
      dept: cleanDept,
      academicYear: cleanYear,
      yearSec: cleanSec,
      accommodation: cleanAccom,
      gender: cleanGender,
      counselorName: manualCounselor,
      parentName: cleanParentName,
      parentContact: cleanParentContact,
      mobile: '-',
      email: (email || '-').trim(),
      address: (address || 'GRT College Campus').trim()
    });
    await newStudent.save();

    // Save User login credential
    const newUser = new User({
      userId: cleanId,
      name: name.trim(),
      password: hashedPassword,
      role: 'student',
      academicYear: cleanYear,
      dept: cleanDept,
      yearSec: cleanSec,
      accommodation: cleanAccom,
      gender: cleanGender
    });
    await newUser.save();

    res.json({
      success: true,
      message: `Student ${name} (${cleanRoll}) created successfully! Counsellor: ${manualCounselor}.`,
      student: newStudent
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Update Student Information & Profile
 */
async function updateStudent(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      dept,
      academicYear,
      yearSec,
      accommodation,
      gender,
      counselorName,
      parentName,
      parentContact,
      email,
      address
    } = req.body;

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ success: false, message: 'Student record not found.' });

    const cleanDept = (dept || student.dept).trim().toUpperCase();
    const cleanSec = extractSection(yearSec || student.yearSec);
    const cleanYear = extractYear(academicYear || student.academicYear);
    const cleanAccom = parseAccommodation(accommodation || student.accommodation);
    const cleanGender = parseGender(gender !== undefined ? gender : student.gender);

    student.name = (name || student.name).trim();
    student.dept = cleanDept;
    student.academicYear = cleanYear;
    student.yearSec = cleanSec;
    student.accommodation = cleanAccom;
    student.gender = cleanGender;
    if (counselorName !== undefined) student.counselorName = counselorName.trim() || '-';
    if (parentName !== undefined) student.parentName = parentName.trim() || '-';
    if (parentContact !== undefined) student.parentContact = cleanPhoneNumber(parentContact);
    if (email !== undefined) student.email = email.trim();
    if (address !== undefined) student.address = address.trim();

    await student.save();

    // Update corresponding User record
    await User.findOneAndUpdate(
      { userId: student.rollNo.toLowerCase() },
      {
        name: student.name,
        dept: cleanDept,
        academicYear: cleanYear,
        yearSec: cleanSec,
        accommodation: cleanAccom,
        gender: cleanGender
      }
    );

    res.json({ success: true, message: `Student ${student.name} updated successfully!`, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Reset Student Password
 */
async function resetStudentPassword(req, res) {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ success: false, message: 'Student record not found.' });

    const newPassword = (req.body.password || '').trim() || 'Student@123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findOneAndUpdate(
      { userId: student.rollNo.toLowerCase() },
      { password: hashedPassword }
    );

    res.json({
      success: true,
      message: `Password reset successfully for student ${student.name} (${student.rollNo}).`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Delete Student Record & Login Account
 */
async function deleteStudent(req, res) {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    await Student.findByIdAndDelete(id);
    await User.findOneAndDelete({ userId: student.rollNo.toLowerCase() });

    res.json({ success: true, message: `Student ${student.name} (${student.rollNo}) deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Clear All Students and Student Login Accounts
 */
async function clearAllStudents(req, res) {
  try {
    await Student.deleteMany({});
    await User.deleteMany({ role: 'student' });

    res.json({
      success: true,
      message: 'All student records and login accounts have been permanently cleared from the database.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Bulk Import Students via Excel/CSV
 */
async function importStudentsExcel(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an Excel or CSV file to upload.' });
    }

    const { dept: formDept, academicYear: formYear, yearSec: formSec } = req.body;

    if (!formDept || !formYear || !formSec) {
      return res.status(400).json({
        success: false,
        message: 'Please select Academic Year, Department, and Section before uploading the student file.'
      });
    }

    const selectedDept = formDept.trim().toUpperCase();
    const selectedYear = extractYear(formYear);
    const selectedSec = extractSection(formSec);
    const defaultPassword = (req.body.defaultPassword || '').trim() || 'Student@123';
    const defaultHashedPassword = await bcrypt.hash(defaultPassword, 10);

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });

    if (!rows || rows.length <= 1) {
      return res.status(400).json({ success: false, message: 'The uploaded spreadsheet is empty or contains no student rows.' });
    }

    // Find header index
    let headerIdx = rows.findIndex(r =>
      r.some(c => String(c).toLowerCase().replace(/[^a-z0-9]/g, '').includes('roll') ||
                  String(c).toLowerCase().replace(/[^a-z0-9]/g, '').includes('reg'))
    );
    if (headerIdx === -1) headerIdx = 0;

    const rawHeaders = rows[headerIdx].map(h => String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    const getCol = keys => rawHeaders.findIndex(h => keys.some(k => h.includes(k)));

    const rollIdx = getCol(['roll', 'reg', 'id', 'register']);
    const nameIdx = getCol(['name', 'studentname', 'fullname']);
    const deptColIdx = getCol(['department', 'dept', 'branch']);
    const yearColIdx = getCol(['academicyear', 'academic', 'year', 'batch']);
    const secColIdx = getCol(['section', 'sec']);
    let accomIdx = getCol([
      'accommodation', 'accomodation', 'hosteller', 'hostel',
      'daysscholar', 'dayscholar', 'scholar', 'residence', 'residential',
      'stay', 'boarding', 'boarder', 'living', 'natureofstay', 'studenttype', 'type'
    ]);

    // Fallback: If header match wasn't found, auto-detect column containing Hosteller or Days Scholar
    if (accomIdx === -1) {
      const candidateCols = {};
      const scanLimit = Math.min(rows.length, headerIdx + 30);
      for (let r = headerIdx + 1; r < scanLimit; r++) {
        const row = rows[r];
        if (!row || !Array.isArray(row)) continue;
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || '').trim().toLowerCase();
          if (
            /hoste?l/i.test(val) ||
            /day\s*scholar/i.test(val) ||
            /days\s*scholar/i.test(val) ||
            val === 'ds' ||
            val === 'h'
          ) {
            candidateCols[c] = (candidateCols[c] || 0) + 1;
          }
        }
      }
      let bestCol = -1;
      let maxScore = 0;
      for (const [colStr, score] of Object.entries(candidateCols)) {
        if (score > maxScore) {
          maxScore = score;
          bestCol = Number(colStr);
        }
      }
      if (bestCol !== -1 && maxScore >= 1) {
        accomIdx = bestCol;
      }
    }

    const parentNameIdx = getCol([
      'fathername', 'fathersname', 'father_name', 'father',
      'parentname', 'parentsname', 'parent_name', 'parent',
      'mothername', 'mothersname', 'mother_name',
      'guardianname', 'guardian_name', 'guardian'
    ]);
    const parentContactIdx = getCol([
      'parentcontact', 'parentphone', 'parentmobile', 'parentnumber', 'parentno', 'parentcell',
      'fatherphone', 'fathermobile', 'fathercontact', 'fatherno',
      'motherphone', 'mothermobile', 'mothercontact', 'motherno',
      'guardianphone', 'guardianmobile', 'guardiancontact',
      'contactnumber', 'contactno', 'mobilenumber', 'mobileno', 'phonenumber', 'phoneno',
      'contact', 'mobile', 'phone'
    ]);
    const genderIdx = getCol(['gender', 'sex']);

    if (rollIdx === -1) {
      return res.status(400).json({ success: false, message: 'Could not detect a "Roll Number" or "Register Number" column in spreadsheet.' });
    }

    const studentBulkOps = [];
    const userBulkOps = [];
    let count = 0;

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const rollNo = row[rollIdx] ? String(row[rollIdx]).trim().toUpperCase() : '';
      if (!rollNo || rollNo.toLowerCase().includes('roll') || rollNo.toLowerCase().includes('register')) continue;

      const name = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : `Student ${rollNo}`;
      
      const rawDept = deptColIdx !== -1 && row[deptColIdx] ? String(row[deptColIdx]).trim() : '';
      const rowDept = rawDept ? rawDept.toUpperCase() : selectedDept;

      const rawYear = yearColIdx !== -1 && row[yearColIdx] ? String(row[yearColIdx]).trim() : '';
      const rowYear = rawYear ? extractYear(rawYear) : selectedYear;

      const rawSec = secColIdx !== -1 && row[secColIdx] ? String(row[secColIdx]).trim() : '';
      const rowSec = rawSec ? extractSection(rawSec) : selectedSec;

      const rawAccom = accomIdx !== -1 && row[accomIdx] !== undefined && row[accomIdx] !== null ? String(row[accomIdx]).trim() : '';
      const accommodation = parseAccommodation(rawAccom);
      
      const rawGender = genderIdx !== -1 && row[genderIdx] ? String(row[genderIdx]) : 'Male';
      const gender = parseGender(rawGender);
      
      const parentName = parentNameIdx !== -1 && row[parentNameIdx] ? String(row[parentNameIdx]).trim() : '-';
      const rawContact = parentContactIdx !== -1 && row[parentContactIdx] ? row[parentContactIdx] : '-';
      const parentContact = cleanPhoneNumber(rawContact);

      // Counsellor is assigned separately by Admin after import
      const counselorName = '-';

      studentBulkOps.push({
        updateOne: {
          filter: { rollNo },
          update: {
            $set: {
              rollNo,
              name,
              dept: rowDept,
              academicYear: rowYear,
              yearSec: rowSec,
              accommodation,
              gender,
              counselorName,
              parentName,
              parentContact,
              mobile: '-'
            }
          },
          upsert: true
        }
      });

      userBulkOps.push({
        updateOne: {
          filter: { userId: rollNo.toLowerCase() },
          update: {
            $set: {
              userId: rollNo.toLowerCase(),
              name,
              role: 'student',
              dept: rowDept,
              academicYear: rowYear,
              yearSec: rowSec,
              accommodation,
              gender
            },
            $setOnInsert: {
              password: defaultHashedPassword
            }
          },
          upsert: true
        }
      });

      count++;
    }

    if (studentBulkOps.length > 0) {
      await Promise.all([
        Student.bulkWrite(studentBulkOps),
        User.bulkWrite(userBulkOps)
      ]);
    }

    res.json({
      success: true,
      message: `Successfully uploaded and mapped ${count} student records to Department: ${selectedDept}, Section: ${selectedSec} (${selectedYear})!`,
      importedCount: count,
      details: {
        academicYear: selectedYear,
        dept: selectedDept,
        yearSec: selectedSec
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Get All Staff Members
 */
async function getAllStaff(req, res) {
  try {
    const { role } = req.query;
    const filter = { role: { $nin: ['student'] } };
    if (role && role !== 'ALL') {
      if (role === 'warden') {
        filter.role = { $in: ['boys_warden', 'girls_warden', 'boys warden', 'girls warden'] };
      } else {
        filter.role = role;
      }
    }

    const staff = await User.find(filter).select('-password').sort({ role: 1, name: 1 });
    res.json({ success: true, staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Assign / Provision Counsellor (with Roll Number Range)
 */
async function assignCounselor(req, res) {
  try {
    const { name, userId, password, startRoll, endRoll, dept, extraRolls = [] } = req.body;

    if (!name || !userId || !password || !startRoll || !endRoll) {
      return res.status(400).json({
        success: false,
        message: 'Counselor Name, Staff ID, Password, Starting Roll No, and Ending Roll No are required.'
      });
    }

    const sVal = extractRollNumber(startRoll);
    const eVal = extractRollNumber(endRoll);
    if (sVal === 0n || eVal === 0n || sVal > eVal) {
      return res.status(400).json({
        success: false,
        message: 'Starting Roll Number must be less than or equal to Ending Roll Number.'
      });
    }

    const cleanId = userId.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanStart = startRoll.trim().toUpperCase();
    const cleanEnd = endRoll.trim().toUpperCase();
    const cleanDept = (dept || 'CSE').trim().toUpperCase();
    const cleanExtraRolls = (Array.isArray(extraRolls) ? extraRolls : [extraRolls])
      .map(r => String(r || '').trim().toUpperCase())
      .filter(Boolean);

    // Check for roll range overlaps with other counselors
    const existingCounselors = await User.find({ role: 'counselor', userId: { $ne: cleanId } });
    for (const c of existingCounselors) {
      const cs = extractRollNumber(c.startRoll);
      const ce = extractRollNumber(c.endRoll);
      if (cs > 0n && ce > 0n) {
        const maxStart = sVal > cs ? sVal : cs;
        const minEnd = eVal < ce ? eVal : ce;
        if (maxStart <= minEnd) {
          return res.status(400).json({
            success: false,
            message: `Roll range (${cleanStart} - ${cleanEnd}) overlaps with Counselor ${c.name} (${c.startRoll} - ${c.endRoll}).`
          });
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const user = await User.findOneAndUpdate(
      { userId: cleanId },
      {
        userId: cleanId,
        name: cleanName,
        password: hashedPassword,
        role: 'counselor',
        dept: cleanDept,
        startRoll: cleanStart,
        endRoll: cleanEnd,
        extraRolls: cleanExtraRolls
      },
      { upsert: true, new: true }
    );

    // Auto-update all matching students within this roll range AND extra roll numbers
    const studentQueryConditions = [
      { rollNo: { $gte: cleanStart, $lte: cleanEnd } }
    ];
    if (cleanExtraRolls.length > 0) {
      studentQueryConditions.push({ rollNo: { $in: cleanExtraRolls } });
    }

    await Student.updateMany(
      { $or: studentQueryConditions },
      {
        $set: { counselorName: cleanName }
      }
    );

    const extraSummary = cleanExtraRolls.length > 0 ? ` (+ ${cleanExtraRolls.length} extra: ${cleanExtraRolls.join(', ')})` : '';

    res.json({
      success: true,
      message: `Counselor ${cleanName} successfully assigned to Roll Range ${cleanStart} - ${cleanEnd}${extraSummary}!`,
      counselor: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        startRoll: user.startRoll,
        endRoll: user.endRoll,
        extraRolls: user.extraRolls,
        dept: user.dept
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Assign / Provision Class Advisor
 */
async function assignAdvisor(req, res) {
  try {
    const { name, userId, password, dept, yearSec, academicYear } = req.body;

    if (!name || !userId || !password || !dept || !yearSec) {
      return res.status(400).json({
        success: false,
        message: 'Advisor Name, Staff ID, Password, Department, and Class Section are required.'
      });
    }

    const cleanId = userId.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanDept = dept.trim().toUpperCase();
    const cleanSec = extractSection(yearSec);
    const cleanYear = extractYear(academicYear || '3 Year');

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const user = await User.findOneAndUpdate(
      { userId: cleanId },
      {
        userId: cleanId,
        name: cleanName,
        password: hashedPassword,
        role: 'advisor',
        dept: cleanDept,
        yearSec: cleanSec,
        academicYear: cleanYear
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `Class Advisor ${cleanName} assigned to ${cleanDept} Section ${cleanSec} (${cleanYear})!`,
      advisor: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        dept: user.dept,
        yearSec: user.yearSec,
        academicYear: user.academicYear
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Assign / Provision Department Head (HOD)
 */
async function assignHod(req, res) {
  try {
    const { name, userId, password, dept } = req.body;

    if (!name || !userId || !password || !dept) {
      return res.status(400).json({
        success: false,
        message: 'HOD Name, Staff ID, Password, and Department are required.'
      });
    }

    const cleanId = userId.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanDept = dept.trim().toUpperCase();

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const user = await User.findOneAndUpdate(
      { userId: cleanId },
      {
        userId: cleanId,
        name: cleanName,
        password: hashedPassword,
        role: 'hod',
        dept: cleanDept
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `Head of Department (HOD) ${cleanName} assigned to Department of ${cleanDept}!`,
      hod: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        dept: user.dept
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Assign / Provision Principal
 */
async function assignPrincipal(req, res) {
  try {
    const { name, userId, password } = req.body;

    if (!name || !userId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Principal Name, Staff ID, and Password are required.'
      });
    }

    const cleanId = userId.trim().toLowerCase();
    const cleanName = name.trim();

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const user = await User.findOneAndUpdate(
      { userId: cleanId },
      {
        userId: cleanId,
        name: cleanName,
        password: hashedPassword,
        role: 'principal',
        dept: 'COLLEGE'
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `Principal Directorate assigned to ${cleanName}!`,
      principal: {
        userId: user.userId,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Assign / Provision Hostel Warden (Boys or Girls)
 */
async function assignWarden(req, res) {
  try {
    const { name, userId, password, wardenType } = req.body;

    if (!name || !userId || !password || !wardenType) {
      return res.status(400).json({
        success: false,
        message: 'Warden Name, Staff ID, Password, and Warden Type (boys_warden/girls_warden) are required.'
      });
    }

    const cleanRole = (wardenType === 'girls_warden' || wardenType === 'girls warden') ? 'girls_warden' : 'boys_warden';
    const cleanId = userId.trim().toLowerCase();
    const cleanName = name.trim();

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const user = await User.findOneAndUpdate(
      { userId: cleanId },
      {
        userId: cleanId,
        name: cleanName,
        password: hashedPassword,
        role: cleanRole,
        accommodation: 'Hostel'
      },
      { upsert: true, new: true }
    );

    const title = cleanRole === 'girls_warden' ? 'Girls Hostel Warden' : 'Boys Hostel Warden';

    res.json({
      success: true,
      message: `${title} successfully assigned to ${cleanName}!`,
      warden: {
        userId: user.userId,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Reset Staff Password
 */
async function resetStaffPassword(req, res) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters long.' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'Staff user not found.' });

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: `Password reset successfully for staff member ${user.name} (${user.userId}).` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Delete Staff Account
 */
async function deleteStaff(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'Staff user not found.' });

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot delete the master Administrator account.' });
    }

    await User.findByIdAndDelete(id);
    res.json({ success: true, message: `Staff member ${user.name} (${user.userId}) removed successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  adminLogin,
  getAdminStats,
  getStudents,
  createStudent,
  updateStudent,
  resetStudentPassword,
  deleteStudent,
  clearAllStudents,
  importStudentsExcel,
  getAllStaff,
  assignCounselor,
  assignAdvisor,
  assignHod,
  assignPrincipal,
  assignWarden,
  resetStaffPassword,
  deleteStaff
};
