require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { validateEnv } = require('./config/env');

validateEnv();

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const taskRoutes = require('./routes/tasks');
const appointmentRoutes = require('./routes/appointments');
const dashboardRoutes = require('./routes/dashboard');
const integrationsRoutes = require('./routes/integrations');
const notificationRoutes = require('./routes/notifications');
const auditRoutes = require('./routes/audit');
const { startTaskReminderJob } = require('./jobs/taskReminders');
const { startDailyDigestJob } = require('./jobs/dailyDigest');
const { startWeeklyBackupJob } = require('./jobs/weeklyBackup');

const app = express();
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-log', auditRoutes);

app.get('/api/health', async (req, res) => {
  const db = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: db === 'connected' ? 'ok' : 'degraded', db });
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finovatrack')
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startTaskReminderJob();
      startDailyDigestJob();
      startWeeklyBackupJob();
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
