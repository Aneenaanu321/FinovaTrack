const express = require('express');
const Task = require('../models/Task');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { buildReportData, formatSummaryText } = require('../utils/dashboardReport');
const { sendDashboardSummaryEmail } = require('../utils/email');

const router = express.Router();
router.use(auth);

async function getTodayLists(userId) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const [todayTasks, todayAppointments, upcomingAppointments] = await Promise.all([
    Task.find({
      user: userId,
      status: 'Pending',
      dueDate: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('client', 'name')
      .sort({ priority: -1 }),
    Appointment.find({
      user: userId,
      dateTime: { $gte: startOfDay, $lte: endOfDay },
      status: 'Upcoming',
    })
      .populate('client', 'name phone')
      .sort({ dateTime: 1 }),
    Appointment.find({
      user: userId,
      dateTime: { $gt: endOfDay },
      status: 'Upcoming',
    })
      .populate('client', 'name phone')
      .sort({ dateTime: 1 })
      .limit(5),
  ]);

  return { todayTasks, todayAppointments, upcomingAppointments };
}

router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('monthlyTargets name email');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const report = await buildReportData(userId, req.query, user.monthlyTargets);
    const lists = await getTodayLists(userId);

    res.json({
      ...report,
      todayTasks: lists.todayTasks,
      todayAppointments: lists.todayAppointments,
      upcomingAppointments: lists.upcomingAppointments,
      overdueTasks: report.overdueTasks,
    });
  } catch (err) {
    const status = err.message?.includes('date') ? 400 : 500;
    res.status(status).json({ message: err.message });
  }
});

router.put('/targets', async (req, res) => {
  try {
    const { clientsClosed, dealValue, revenue, commission } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (clientsClosed !== undefined) {
      const n = Number(clientsClosed);
      if (Number.isNaN(n) || n < 0)
        return res.status(400).json({ message: 'Invalid clients closed target' });
      user.monthlyTargets.clientsClosed = n;
    }
    const dealVal = dealValue !== undefined ? dealValue : revenue;
    if (dealVal !== undefined) {
      const n = Number(dealVal);
      if (Number.isNaN(n) || n < 0)
        return res.status(400).json({ message: 'Invalid deal value target' });
      user.monthlyTargets.dealValue = n;
      user.monthlyTargets.revenue = n;
    }
    if (commission !== undefined) {
      const n = Number(commission);
      if (Number.isNaN(n) || n < 0)
        return res.status(400).json({ message: 'Invalid commission target' });
      user.monthlyTargets.commission = n;
    }
    await user.save();

    res.json({
      monthlyTargets: {
        clientsClosed: user.monthlyTargets.clientsClosed,
        dealValue: user.monthlyTargets.dealValue ?? user.monthlyTargets.revenue ?? 0,
        commission: user.monthlyTargets.commission ?? 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/send-summary', async (req, res) => {
  try {
    const period = req.body.period === 'weekly' ? 'weekly' : 'monthly';
    const user = await User.findById(req.user.id).select('name email monthlyTargets');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const now = new Date();
    let startDate;
    let endDate = now;
    if (period === 'weekly') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const report = await buildReportData(
      req.user.id,
      { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      user.monthlyTargets
    );
    const periodLabel = period === 'weekly' ? 'Weekly' : 'Monthly';
    const text = formatSummaryText(report, user.name, periodLabel);
    const html = text.replace(/\n/g, '<br>');

    await sendDashboardSummaryEmail(user.email, `FinovaTrack — ${periodLabel} summary`, text, html);

    res.json({ message: `${periodLabel} summary sent to ${user.email}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
