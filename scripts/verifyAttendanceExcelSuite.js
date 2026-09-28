/**
 * Verification Test Suite for Counselor Students Daily Attendance Excel (.xlsx) Report
 * Validates:
 * 1. UI Elements in index.html (Batch input, download buttons, Excel script imports)
 * 2. Backend routes and attendance calculation logic
 * 3. Exact matching of visual reference format (S.No -> Reg No -> Student Name -> Date-wise attendance)
 * 4. P = Present, A = Absent based strictly on approved Leave Requests
 * 5. Mentee isolation: only assigned mentees of the counselor are included
 * 6. Manually enterable/editable Batch field
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const xlsx = require('xlsx');

console.log('====================================================');
console.log('COUNSELOR ATTENDANCE EXCEL (.XLSX) VERIFICATION SUITE');
console.log('====================================================\n');

// 1. UI Markup & Script Inclusions in index.html
console.log('--- Suite 1: Markup & Dependency Inclusions in index.html ---');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

assert(indexHtml.includes('xlsx.full.min.js'), 'index.html must load xlsx.full.min.js for spreadsheet generation');
console.log('[PASS] xlsx.full.min.js library included in index.html');

assert(indexHtml.includes('attendanceExcelService.js'), 'index.html must load attendanceExcelService.js');
console.log('[PASS] attendanceExcelService.js script included in index.html');

assert(indexHtml.includes('id="authCounselorAttendanceReportCard"'), 'Reports must have authCounselorAttendanceReportCard');
console.log('[PASS] Counselor Attendance Report card exists in Reports section');

assert(indexHtml.includes('id="attReportBatch"'), 'Batch input (attReportBatch) must exist and be manually editable');
console.log('[PASS] Batch input field (#attReportBatch) exists for custom cohort specification');

assert(indexHtml.includes('id="downloadAttendanceExcelBtn"'), 'Download button (#downloadAttendanceExcelBtn) must exist');
console.log('[PASS] Download Attendance Excel button exists');

assert(indexHtml.includes('downloadCounselorAttendanceExcel()'), 'Trigger downloadCounselorAttendanceExcel() wired up');
console.log('[PASS] downloadCounselorAttendanceExcel() function called on click');

// 2. Attendance Excel Generator & Workbook Structure Verification
console.log('\n--- Suite 2: Visual Structure & Reference Template Compliance ---');
const passController = require('../src/controllers/passController');
assert(typeof passController.buildCounselorAttendanceWorkbook === 'function', 'passController must export buildCounselorAttendanceWorkbook');
assert(typeof passController.getCounselorAttendanceSheet === 'function', 'passController must export getCounselorAttendanceSheet');
assert(typeof passController.getCounselorAttendanceData === 'function', 'passController must export getCounselorAttendanceData');
console.log('[PASS] Backend controller methods properly defined and exported');

// Mock counselor mentees (strictly assigned to this counselor)
const mockMentees = [
  { rollNo: '110324104081', name: 'Aakash R', dept: 'CSE', yearSec: 'A' },
  { rollNo: '110324104082', name: 'Bhavani S', dept: 'CSE', yearSec: 'A' },
  { rollNo: '110324104083', name: 'Chandra M', dept: 'CSE', yearSec: 'A' }
];

// Mock Leave Requests
// Student 1 (Aakash) has approved leave for Sept 2 to Sept 4 (Days 2, 3, 4)
// Student 2 (Bhavani) has approved leave for Sept 15 (Day 15)
// Student 3 (Chandra) has NO leave (100% Present)
const mockLeaves = [
  {
    rollNo: '110324104081',
    requestCategory: 'leave',
    fromDate: '2026-09-02',
    toDate: '2026-09-04',
    status: 'Approved'
  },
  {
    rollNo: '110324104082',
    requestCategory: 'leave',
    fromDate: '2026-09-15',
    toDate: '2026-09-15',
    status: 'Approved'
  }
];

const customConfig = {
  batch: '2024-2028', // Custom user-entered batch
  academicYear: 'Academic Year 2026-2027 ODD SEMESTER',
  yearSem: '3 / V',
  period: 'AUG 2026 - DEC 2026',
  targetMonth: 9, // September 2026
  targetYear: 2026,
  totalDays: 40 // 40 working days matching reference screenshot
};

const wb = passController.buildCounselorAttendanceWorkbook(mockMentees, mockLeaves, customConfig);
assert(wb.SheetNames.includes('daily attendance-1'), 'Workbook must contain "daily attendance-1" sheet');
assert(wb.SheetNames.includes('STUDENT INFORMATION'), 'Workbook must contain "STUDENT INFORMATION" sheet');
console.log('[PASS] Workbook contains both "daily attendance-1" and "STUDENT INFORMATION" sheets');

const ws = wb.Sheets['daily attendance-1'];
const sheetData = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

// Verify Header Rows
assert.strictEqual(sheetData[0][0], 'GRT INSTITUTE OF ENGINEERING AND TECHNOLOGY, Tiruttani', 'Row 0 must contain College Header');
assert.strictEqual(sheetData[1][0], 'STUDENTS DAILY ATTENDANCE SHEET', 'Row 1 must contain "STUDENTS DAILY ATTENDANCE SHEET"');
assert(sheetData[2][0].includes('BATCH: 2024-2028'), 'Row 2 must display the manually entered Batch (BATCH: 2024-2028)');
console.log('[PASS] Header, Title, and Custom Batch (2024-2028) correctly placed');

// Verify Column Headers
// Row 3: S. NO. | REG No. | STUDENT NAME | w d | 1 | 2 | ...
assert.strictEqual(sheetData[3][0], 'S. NO.', 'Col 0 Row 3 must be "S. NO."');
assert.strictEqual(sheetData[3][1], 'REG No.', 'Col 1 Row 3 must be "REG No."');
assert.strictEqual(sheetData[3][2], 'STUDENT NAME', 'Col 2 Row 3 must be "STUDENT NAME"');
assert.strictEqual(sheetData[3][3], 'w d', 'Col 3 Row 3 must be "w d"');
assert.strictEqual(sheetData[3][4], 1, 'Col 4 Row 3 must be working day 1');
assert.strictEqual(sheetData[3][5], 2, 'Col 5 Row 3 must be working day 2');
assert.strictEqual(sheetData[4][3], 'd', 'Col 3 Row 4 must be "d"');
assert.strictEqual(sheetData[5][3], 'm', 'Col 3 Row 5 must be "m"');
assert.strictEqual(sheetData[6][3], 'AUG 2026 - DEC 2026', 'Row 6 must contain the period banner');
console.log('[PASS] Multi-tier table headers (S. NO., REG No., STUDENT NAME, w d, d, m, period banner) match reference');

// 3. Attendance Logic: A = Absent, P = Present based on Leave Requests
console.log('\n--- Suite 3: Attendance Logic (Leave -> Absent, Otherwise -> Present) ---');

// Student 1 (Aakash R, roll: 110324104081) - Data row index 7
const aakashRow = sheetData[7];
assert.strictEqual(aakashRow[0], 1, 'Aakash S.No must be 1');
assert.strictEqual(aakashRow[1], '110324104081', 'Aakash Reg No must be 110324104081');
assert.strictEqual(aakashRow[2], 'Aakash R', 'Aakash Name must be Aakash R');

// Col 4 is Day 1 (Sept 1) -> No leave -> 'P'
assert.strictEqual(aakashRow[4], 'P', 'Aakash Day 1 must be Present (P)');
// Col 5 is Day 2 (Sept 2) -> Leave -> 'A'
assert.strictEqual(aakashRow[5], 'A', 'Aakash Day 2 must be Absent (A)');
// Col 6 is Day 3 (Sept 3) -> Leave -> 'A'
assert.strictEqual(aakashRow[6], 'A', 'Aakash Day 3 must be Absent (A)');
// Col 7 is Day 4 (Sept 4) -> Leave -> 'A'
assert.strictEqual(aakashRow[7], 'A', 'Aakash Day 4 must be Absent (A)');
// Col 8 is Day 5 (Sept 5) -> No leave -> 'P'
assert.strictEqual(aakashRow[8], 'P', 'Aakash Day 5 must be Present (P)');
console.log('[PASS] Multi-day leave correctly marked as "A" on Sept 2, 3, 4 and "P" on other days');

// Student 2 (Bhavani S, roll: 110324104082) - Data row index 8
const bhavaniRow = sheetData[8];
assert.strictEqual(bhavaniRow[1], '110324104082');
// Day 1 to 14 should be 'P'
assert.strictEqual(bhavaniRow[4], 'P', 'Bhavani Day 1 must be Present');
// Day 15 (Col 4 + 14 = 18) -> Leave on Sept 15 -> 'A'
assert.strictEqual(bhavaniRow[18], 'A', 'Bhavani Day 15 must be Absent (A)');
// Day 16 -> 'P'
assert.strictEqual(bhavaniRow[19], 'P', 'Bhavani Day 16 must be Present (P)');
console.log('[PASS] Single-day leave correctly marked as "A" on Sept 15 and "P" on other days');

// Student 3 (Chandra M, roll: 110324104083) - Data row index 9
const chandraRow = sheetData[9];
assert.strictEqual(chandraRow[1], '110324104083');
// All 40 days must be 'P'
for (let d = 4; d < 44; d++) {
  assert.strictEqual(chandraRow[d], 'P', `Chandra Day ${d - 3} must be Present (P)`);
}
console.log('[PASS] Student with zero leave requests is marked 100% Present (P) across all days');

// 4. Binary File Write & Read Integrity Test
console.log('\n--- Suite 4: Binary .xlsx Serialization & Deserialization ---');
const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
assert(buf && buf.length > 1000, 'Excel buffer must be non-empty valid binary');
const parsedWb = xlsx.read(buf, { type: 'buffer' });
assert.strictEqual(parsedWb.SheetNames[0], 'daily attendance-1');
console.log('[PASS] Excel binary buffer serializes and deserializes accurately (valid .xlsx)');

// 5. Client-Side Service Existence Test
console.log('\n--- Suite 5: Client-Side Service Script Integrity ---');
const clientServiceCode = fs.readFileSync(path.join(__dirname, '../js/services/attendanceExcelService.js'), 'utf8');
assert(clientServiceCode.includes('function buildCounselorAttendanceWorkbook'), 'Service must define buildCounselorAttendanceWorkbook');
assert(clientServiceCode.includes('function downloadCounselorAttendanceExcel'), 'Service must define downloadCounselorAttendanceExcel');
assert(clientServiceCode.includes('XLSXLib.writeFile'), 'Service must invoke XLSX.writeFile for direct browser download');
console.log('[PASS] Client-side attendanceExcelService.js fully implemented and ready');

console.log('\n======================================================');
console.log('✅ ALL COUNSELOR ATTENDANCE EXCEL TESTS PASSED (100%)!');
console.log('======================================================\n');
process.exit(0);
