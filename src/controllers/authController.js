/**
 * Authentication & Authorization Controller
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');
const { extractSection, extractYear, extractRollNumber } = require('../utils/formatters');

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'campus-passpro-institutional-secret-key-2026';

function generateSessionToken(userId, role) {
  const timestamp = Date.now();
  const raw = `${String(userId).trim().toLowerCase()}:${String(role).trim().toLowerCase()}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(raw).digest('hex');
  return Buffer.from(`${raw}:${hmac}`).toString('base64');
}

function verifySessionToken(token, expectedUserId, expectedRole) {
  if (!token || typeof token !== 'string') return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 4) return false;
    const [userId, role, timestampStr, hmac] = parts;
    if (!userId || !role || !timestampStr || !hmac) return false;

    // Check user & role match
    if (userId.toLowerCase() !== String(expectedUserId).toLowerCase().trim()) return false;
    const cleanExpectedRole = String(expectedRole).trim().toLowerCase().replace(/[\s-]+/g, '_');
    const cleanRole = String(role).trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (cleanRole !== cleanExpectedRole) return false;

    // Check expiration (24 hours = 86,400,000 ms)
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      return false; // Token expired
    }

    // Check HMAC
    const expectedRaw = `${userId}:${role}:${timestampStr}`;
    const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(expectedRaw).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac));
  } catch (e) {
    return false;
  }
}

/**
 * Check if a role is already taken or if counselor roll ranges overlap
 */
async function checkRoleExists(req, res) {
  try {
    const { role, dept, yearSec, startRoll, endRoll } = req.query;

    if (role === 'principal') {
      const exists = await User.findOne({ role: 'principal' });
      return res.json({ exists: !!exists, registeredName: exists ? exists.name : '' });
    }

    if (role === 'boys_warden' || role === 'boys warden') {
      const exists = await User.findOne({ role: { $in: ['boys_warden', 'boys warden'] } });
      return res.json({ exists: !!exists, registeredName: exists ? exists.name : '' });
    }

    if (role === 'girls_warden' || role === 'girls warden') {
      const exists = await User.findOne({ role: { $in: ['girls_warden', 'girls warden'] } });
      return res.json({ exists: !!exists, registeredName: exists ? exists.name : '' });
    }

    if (role === 'hod' && dept) {
      const exists = await User.findOne({ role: 'hod', dept: dept.toUpperCase().trim() });
      return res.json({ exists: !!exists, registeredName: exists ? exists.name : '' });
    }

    if (role === 'advisor' && dept && yearSec) {
      const secLetter = extractSection(yearSec);
      const exists = await User.findOne({
        role: 'advisor',
        dept: dept.toUpperCase().trim(),
        yearSec: secLetter
      });
      return res.json({ exists: !!exists, registeredName: exists ? exists.name : '' });
    }

    if (role === 'counselor' && startRoll && endRoll) {
      const sVal = extractRollNumber(startRoll);
      const eVal = extractRollNumber(endRoll);

      if (sVal > 0n && eVal > 0n && sVal <= eVal) {
        const counselors = await User.find({ role: 'counselor' });
        for (const c of counselors) {
          const cs = extractRollNumber(c.startRoll);
          const ce = extractRollNumber(c.endRoll);

          if (cs > 0n && ce > 0n) {
            const maxStart = sVal > cs ? sVal : cs;
            const minEnd = eVal < ce ? eVal : ce;
            if (maxStart <= minEnd) {
              return res.json({
                exists: true,
                conflictCounselor: c.name,
                registeredRange: `${c.startRoll} to ${c.endRoll}`
              });
            }
          }
        }
      }
    }

    res.json({ exists: false });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Register a new User account
 */
async function register(req, res) {
  try {
    const {
      userId,
      name,
      password,
      role,
      dept,
      yearSec,
      academicYear,
      startRoll,
      endRoll,
      accommodation,
      gender
    } = req.body;

    const cleanAccom = (/hoste?l|^h$/i.test(accommodation || '') && !/day/i.test(accommodation || '')) ? 'Hosteller' : 'Day Scholar';
    const cleanGender = (gender === 'Female' || gender === 'female') ? 'Female' : 'Male';

    if (!userId || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'All mandatory credentials must be provided.'
      });
    }

    const cleanId = userId.trim().toLowerCase();
    const cleanDept = (dept || 'CSE').trim().toUpperCase();
    const cleanSec = extractSection(yearSec || 'A');
    const cleanYear = extractYear(academicYear || '3 Year');

    const existingUser = await User.findOne({ userId: cleanId });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User ID already registered. Please log in.'
      });
    }

    if (role === 'principal') {
      const existing = await User.findOne({ role: 'principal' });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `The Principal position is already registered college-wide by ${existing.name}.`
        });
      }
    }

    if (role === 'boys_warden' || role === 'boys warden') {
      const existing = await User.findOne({ role: { $in: ['boys_warden', 'boys warden'] } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `The Boys Warden position is already registered by ${existing.name}. Only one Boys Warden account is permitted.`
        });
      }
    }

    if (role === 'girls_warden' || role === 'girls warden') {
      const existing = await User.findOne({ role: { $in: ['girls_warden', 'girls warden'] } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `The Girls Warden position is already registered by ${existing.name}. Only one Girls Warden account is permitted.`
        });
      }
    }

    if (role === 'hod') {
      const existing = await User.findOne({ role: 'hod', dept: cleanDept });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `HOD for ${cleanDept} is already registered by ${existing.name}.`
        });
      }
    }

    if (role === 'advisor') {
      const existing = await User.findOne({
        role: 'advisor',
        dept: cleanDept,
        yearSec: cleanSec
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Advisor for ${cleanDept} Sec ${cleanSec} is already registered by ${existing.name}.`
        });
      }
    }

    if (role === 'counselor') {
      const sVal = extractRollNumber(startRoll);
      const eVal = extractRollNumber(endRoll);
      if (sVal === 0n || eVal === 0n || sVal > eVal) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid numeric roll number range for the counselor.'
        });
      }

      const counselors = await User.find({ role: 'counselor' });
      for (const c of counselors) {
        const cs = extractRollNumber(c.startRoll);
        const ce = extractRollNumber(c.endRoll);
        if (cs > 0n && ce > 0n) {
          const maxStart = sVal > cs ? sVal : cs;
          const minEnd = eVal < ce ? eVal : ce;
          if (maxStart <= minEnd) {
            return res.status(400).json({
              success: false,
              message: `Roll range overlaps with existing counselor ${c.name} (${c.startRoll} - ${c.endRoll}).`
            });
          }
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const newUser = new User({
      userId: cleanId,
      name: name.trim(),
      password: hashedPassword,
      role,
      academicYear: cleanYear,
      accommodation: cleanAccom,
      gender: cleanGender,
      dept: cleanDept,
      yearSec: cleanSec,
      startRoll: (startRoll || '').trim(),
      endRoll: (endRoll || '').trim()
    });

    await newUser.save();

    if (role === 'student') {
      await Student.findOneAndUpdate(
        { rollNo: cleanId.toUpperCase() },
        {
          rollNo: cleanId.toUpperCase(),
          name: name.trim(),
          academicYear: cleanYear,
          accommodation: cleanAccom,
          gender: cleanGender,
          dept: cleanDept,
          yearSec: cleanSec,
          parentContact: '-'
        },
        { upsert: true }
      );
    }

    res.json({ success: true, message: 'Registration successful! Please log in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Authenticate User credentials and return session user object
 */
async function login(req, res) {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ success: false, message: 'Provide both ID and Password.' });
    }

    const cleanId = userId.trim().toLowerCase();
    const user = await User.findOne({ userId: cleanId });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Roll Number / Staff ID or Password.'
      });
    }

    const isMatch = await bcrypt.compare(password.trim(), user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Roll Number / Staff ID or Password.'
      });
    }

    const safeUser = user.toObject();
    delete safeUser.password;

    safeUser.loginId = safeUser.userId;
    safeUser.role = String(safeUser.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    safeUser.userType = safeUser.role === 'student' ? 'Student' : (safeUser.role === 'admin' ? 'Admin' : 'Staff');

    // Generate authenticated session token (valid 24h)
    const token = generateSessionToken(safeUser.userId, safeUser.role);
    safeUser.token = token;

    // If student, enrich with latest Student model data
    if (safeUser.role === 'student') {
      const studentProfile = await Student.findOne({ rollNo: safeUser.userId.toUpperCase() });
      if (studentProfile) {
        safeUser.parentContact = studentProfile.parentContact || safeUser.parentContact;
        safeUser.mobile = studentProfile.mobile || safeUser.mobile;
        safeUser.counselorName = studentProfile.counselorName || safeUser.counselorName;
        safeUser.accommodation = studentProfile.accommodation || safeUser.accommodation;
        safeUser.gender = studentProfile.gender || safeUser.gender;
        safeUser.dept = studentProfile.dept || safeUser.dept;
        safeUser.yearSec = studentProfile.yearSec || safeUser.yearSec;
        safeUser.academicYear = studentProfile.academicYear || safeUser.academicYear;
      }
    }

    res.json({
      success: true,
      user: safeUser,
      token,
      userId: safeUser.userId,
      loginId: safeUser.userId,
      role: safeUser.role,
      userType: safeUser.userType
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Verify if an existing session user is valid, has an active non-expired token, and exists in the database
 */
async function verifySession(req, res) {
  try {
    const { userId, role, token } = req.body;
    if (!userId || !role || !token) {
      return res.status(401).json({ success: false, message: 'Missing session credentials or session token.' });
    }

    const cleanId = String(userId).trim().toLowerCase();
    const cleanRole = String(role).trim().toLowerCase().replace(/[\s-]+/g, '_');

    // Cryptographically verify token validity and expiration (24h)
    const isValidToken = verifySessionToken(token, cleanId, cleanRole);
    if (!isValidToken) {
      return res.status(401).json({ success: false, message: 'Session token has expired or is invalid. Please sign in again.' });
    }

    const user = await User.findOne({ userId: cleanId, role: { $in: [cleanRole, role] } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Session expired or user not found.' });
    }

    const safeUser = user.toObject();
    delete safeUser.password;

    safeUser.loginId = safeUser.userId;
    safeUser.role = String(safeUser.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    safeUser.userType = safeUser.role === 'student' ? 'Student' : (safeUser.role === 'admin' ? 'Admin' : 'Staff');
    safeUser.token = token;

    if (safeUser.role === 'student') {
      const studentProfile = await Student.findOne({ rollNo: safeUser.userId.toUpperCase() });
      if (studentProfile) {
        safeUser.parentContact = studentProfile.parentContact || safeUser.parentContact;
        safeUser.mobile = studentProfile.mobile || safeUser.mobile;
        safeUser.counselorName = studentProfile.counselorName || safeUser.counselorName;
        safeUser.accommodation = studentProfile.accommodation || safeUser.accommodation;
        safeUser.gender = studentProfile.gender || safeUser.gender;
        safeUser.dept = studentProfile.dept || safeUser.dept;
        safeUser.yearSec = studentProfile.yearSec || safeUser.yearSec;
        safeUser.academicYear = studentProfile.academicYear || safeUser.academicYear;
      }
    }

    res.json({
      success: true,
      user: safeUser,
      token,
      userId: safeUser.userId,
      loginId: safeUser.userId,
      role: safeUser.role,
      userType: safeUser.userType
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  checkRoleExists,
  register,
  login,
  verifySession
};
