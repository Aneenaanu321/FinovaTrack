require('dotenv').config();
const mongoose = require('mongoose');
const { validateEnv } = require('./config/env');
const { createApp } = require('./app');
const { startTaskReminderJob } = require('./jobs/taskReminders');
const { startDailyDigestJob } = require('./jobs/dailyDigest');
const { startWeeklyBackupJob } = require('./jobs/weeklyBackup');

validateEnv();

const app = createApp();
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/finovatrack';

console.log('[startup] NODE_ENV=%s PORT=%s', process.env.NODE_ENV, process.env.PORT || '5000');

mongoose
  .connect(mongoUri, { serverSelectionTimeoutMS: 30000 })
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API docs: http://localhost:${PORT}/api/docs`);
      if (process.env.NODE_ENV !== 'test') {
        startTaskReminderJob();
        startDailyDigestJob();
        startWeeklyBackupJob();
      }
    });
  })
  .catch((err) => {
    console.error('[startup] MongoDB connection failed:', err.message);
    if (err.message?.includes('querySrv')) {
      console.error(
        '[startup] Tip: use the standard (non-SRV) Atlas connection string, or check Atlas Network Access allows 0.0.0.0/0'
      );
    }
    process.exit(1);
  });

module.exports = app;
