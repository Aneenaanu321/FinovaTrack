const express = require('express');
const Client = require('../models/Client');
const Task = require('../models/Task');
const Appointment = require('../models/Appointment');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const [totalClients, activeDeals, completedTasks, todayTasks, overdueTasks, todayAppointments, upcomingAppointments] = await Promise.all([
      Client.countDocuments({ user: userId }),
      Client.countDocuments({ user: userId, dealStatus: { $in: ['New', 'Contacted', 'Interested'] } }),
      Task.countDocuments({ user: userId, status: 'Completed' }),
      Task.find({ user: userId, status: 'Pending', dueDate: { $gte: startOfDay, $lte: endOfDay } }).populate('client', 'name').sort({ priority: -1 }),
      Task.find({ user: userId, status: 'Pending', dueDate: { $lt: startOfDay } }).populate('client', 'name').sort({ dueDate: 1 }),
      Appointment.find({ user: userId, dateTime: { $gte: startOfDay, $lte: endOfDay }, status: 'Upcoming' }).populate('client', 'name phone').sort({ dateTime: 1 }),
      Appointment.find({ user: userId, dateTime: { $gt: endOfDay }, status: 'Upcoming' }).populate('client', 'name phone').sort({ dateTime: 1 }).limit(5),
    ]);

    res.json({
      stats: { totalClients, activeDeals, completedTasks, overdueTasks: overdueTasks.length },
      todayTasks, overdueTasks, todayAppointments, upcomingAppointments,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
