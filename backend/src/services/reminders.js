const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { sendAppointmentReminderEmail } = require('../utils/email');
const { sendAppointmentReminderSms } = require('./sms');

const REMINDER_MINUTES = parseInt(process.env.REMINDER_MINUTES_BEFORE || '60', 10);
const WINDOW_MS = 5 * 60 * 1000;

async function processAppointmentReminders() {
  const now = Date.now();
  const target = now + REMINDER_MINUTES * 60 * 1000;
  const windowStart = new Date(target - WINDOW_MS);
  const windowEnd = new Date(target + WINDOW_MS);

  const upcoming = await Appointment.find({
    status: 'Upcoming',
    dateTime: { $gte: windowStart, $lte: windowEnd },
    $or: [
      { remindEmail: true, reminderEmailSentAt: null },
      { remindSms: true, reminderSmsSentAt: null },
    ],
  }).populate('client', 'name phone');

  for (const appt of upcoming) {
    const user = await User.findById(appt.user).select('email phone');
    if (!user?.email) continue;

    if (appt.remindEmail && !appt.reminderEmailSentAt) {
      const sent = await sendAppointmentReminderEmail(user.email, {
        type: appt.type,
        clientName: appt.client?.name || 'Client',
        dateTime: appt.dateTime,
        location: appt.location,
        notes: appt.notes,
      });
      if (sent) appt.reminderEmailSentAt = new Date();
    }

    if (appt.remindSms && !appt.reminderSmsSentAt) {
      const phone = user.phone || process.env.REMINDER_SMS_TO;
      const when = new Date(appt.dateTime).toLocaleString();
      const message = `FinovaTrack: ${appt.type} with ${appt.client?.name || 'Client'} at ${when}`;
      const sent = await sendAppointmentReminderSms(phone, message);
      if (sent) appt.reminderSmsSentAt = new Date();
    }

    await appt.save();
  }

  if (upcoming.length > 0) {
    console.log(`[appointment reminders] processed ${upcoming.length}`);
  }
}

module.exports = { processAppointmentReminders };
