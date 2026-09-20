/**
 * Application Constants and Enums
 */

const ROLE_PINS = {
  student: '1111',
  counselor: '2222',
  advisor: '3333',
  hod: '4444',
  principal: '5555',
  boys_warden: '6661',
  girls_warden: '6662'
};

const VALID_ROLES = [
  'admin',
  'student',
  'counselor',
  'advisor',
  'hod',
  'principal',
  'boys_warden',
  'girls warden', // preserved for backward-compatibility with existing records
  'girls_warden'
];

const PASS_STATUS = {
  PENDING_COUNSELOR: 'Pending Counselor',
  PENDING_ADVISOR: 'Pending Advisor',
  PENDING_HOD: 'Pending HOD',
  PENDING_PRINCIPAL: 'Pending Principal',
  PENDING_BOYS_WARDEN: 'Pending Boys Warden',
  PENDING_GIRLS_WARDEN: 'Pending Girls Warden',
  APPROVED: 'Approved',
  EXITED: 'Exited',
  RETURNED: 'Returned',
  EXPIRED: 'Expired',
  REJECTED: 'Rejected'
};

const DEPARTMENTS = ['CSE', 'ECE', 'MECH', 'IT', 'AI&DS'];

const ACADEMIC_YEARS = ['I Year', 'II Year', 'III Year', 'IV Year'];

module.exports = {
  ROLE_PINS,
  VALID_ROLES,
  PASS_STATUS,
  DEPARTMENTS,
  ACADEMIC_YEARS
};
