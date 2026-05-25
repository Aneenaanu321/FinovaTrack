require('dotenv').config();
const mongoose = require('mongoose');
const { validateEnv } = require('./config/env');
const { createApp } = require('./app');
const { startTaskReminderJob } = require('./jobs/taskReminders');
const { startDailyDigestJob } = require('./jobs/dailyDigest');
const { startWeeklyBackupJob } = require('./jobs/weeklyBackup');

validateEnv();

const app = createApp();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finovatrack')
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
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;
