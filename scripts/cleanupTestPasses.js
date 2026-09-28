const connectDB = require('../src/config/db');
const Pass = require('../src/models/Pass');

async function clean() {
  await connectDB();
  const res = await Pass.deleteMany({
    $or: [
      { 'counselorApproval.counselorName': 'Dr Saravanan' },
      { 'advisorApproval.advisorName': 'Mrs Preethi' },
      { 'hodApproval.hodName': 'Dr Balaji' }
    ]
  });
  console.log('Deleted mock test passes:', res.deletedCount);

  const remaining = await Pass.find({ rollNo: '110324104091' });
  console.log('Remaining passes for 110324104091:');
  remaining.forEach(p => {
    console.log('ID:', p._id, 'Status:', p.status);
    console.log('Counselor:', p.counselorApproval?.counselorName);
    console.log('Advisor:', p.advisorApproval?.advisorName);
    console.log('HOD:', p.hodApproval?.hodName);
    console.log('Principal:', p.principalApproval?.principalName);
    console.log('Warden:', p.wardenApproval?.wardenName);
  });
  process.exit(0);
}

clean().catch(err => {
  console.error(err);
  process.exit(1);
});
