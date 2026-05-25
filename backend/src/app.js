const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { notFoundHandler, errorHandler } = require('./middleware/errors');
const { initSentry } = require('./instrument/sentry');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const taskRoutes = require('./routes/tasks');
const appointmentRoutes = require('./routes/appointments');
const dashboardRoutes = require('./routes/dashboard');
const integrationsRoutes = require('./routes/integrations');
const notificationRoutes = require('./routes/notifications');
const auditRoutes = require('./routes/audit');
const docsRoutes = require('./routes/docs');
const configRoutes = require('./routes/config');

initSentry();

function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', async (_req, res) => {
    const db = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({ status: db === 'connected' ? 'ok' : 'degraded', db });
  });

  app.use('/api/config', configRoutes);
  app.use('/api/docs', docsRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/clients', clientRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/integrations', integrationsRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/audit-log', auditRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
