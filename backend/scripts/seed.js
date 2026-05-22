require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const DEMO = {
  name: 'Demo Advisor',
  email: 'demo@finovatrack.com',
  password: 'Demo123!',
  branch: 'Main Street Branch',
  employeeId: 'EMP-1001',
};

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/finovatrack';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ email: DEMO.email });
  if (existing) {
    existing.name = DEMO.name;
    existing.branch = DEMO.branch;
    existing.employeeId = DEMO.employeeId;
    existing.password = DEMO.password;
    existing.refreshTokens = [];
    existing.resetPasswordToken = undefined;
    existing.resetPasswordExpires = undefined;
    await existing.save();
    console.log('Updated demo user:', DEMO.email);
  } else {
    await User.create(DEMO);
    console.log('Created demo user:', DEMO.email);
  }

  console.log('Password:', DEMO.password);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
