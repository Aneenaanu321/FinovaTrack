const Task = require('../models/Task');
const User = require('../models/User');
const { sendTaskReminderEmail } = require('../utils/email');
const { processAppointmentReminders } = require('../services/reminders');

async function processTaskEmailReminders() {
  const now = new Date();
  const tasks = await Task.find({
    status: 'Pending',
    emailReminderEnabled: true,
    dueDate: { $ne: null },
    $or: [{ emailReminderSentAt: null }, { emailReminderSentAt: { $exists: false } }],
  }).populate('client', 'name');

  for (const task of tasks) {
    const hoursBefore = task.emailReminderHoursBefore || 24;
    const remindAt = new Date(task.dueDate.getTime() - hoursBefore * 60 * 60 * 1000);
    if (now < remindAt || now > task.dueDate) continue;

    const user = await User.findById(task.user).select('email name');
    if (!user?.email) continue;

    try {
      await sendTaskReminderEmail(user.email, {
        title: task.title,
        dueDate: task.dueDate,
        clientName: task.client?.name,
      });
      task.emailReminderSentAt = new Date();
      await task.save();
    } catch (err) {
      console.error('Task email reminder failed:', task._id, err.message);
    }
  }
}

function startTaskReminderJob() {
  const intervalMs = parseInt(process.env.TASK_REMINDER_INTERVAL_MS || '900000', 10);
  const run = () => {
    processTaskEmailReminders().catch((err) => console.error('Task reminder job error:', err.message));
    processAppointmentReminders().catch((err) => console.error('Appointment reminder job error:', err.message));
  };
  run();
  setInterval(run, intervalMs);
}

module.exports = { startTaskReminderJob, processTaskEmailReminders };
