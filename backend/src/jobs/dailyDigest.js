const User = require('../models/User');
const { getDailyDigestData } = require('../services/notifications');
const { buildDailyDigestContent } = require('../utils/dailyDigest');
const { sendDailyDigestEmail } = require('../utils/email');
const { sendPushToUser } = require('../utils/push');

function isSameUtcDay(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

async function processDailyDigestForUser(user, force = false) {
  if (!user.email) return false;
  if (!force && user.notificationPrefs?.dailyDigestEnabled === false) return false;

  const now = new Date();
  const hour = user.notificationPrefs?.dailyDigestHour ?? 7;
  if (!force && now.getUTCHours() !== hour) return false;
  if (!force && user.lastDailyDigestAt && isSameUtcDay(new Date(user.lastDailyDigestAt), now)) {
    return false;
  }

  const data = await getDailyDigestData(user._id);
  const { subject, text, html } = buildDailyDigestContent(data);

  await sendDailyDigestEmail(user.email, subject, text, html);

  if (user.notificationPrefs?.pushEnabled && user.pushSubscriptions?.length) {
    const overdue = data.overdueTasks.length;
    const tasks = data.todayTasks.length;
    const appts = data.todayAppointments.length;
    await sendPushToUser(user, {
      title: 'FinovaTrack daily digest',
      body: `${tasks} task(s), ${appts} appointment(s) today${overdue ? `, ${overdue} overdue` : ''}`,
      url: '/',
    });
  }

  user.lastDailyDigestAt = now;
  await user.save();
  return true;
}

async function processDailyDigests() {
  const now = new Date();
  const hour = now.getUTCHours();
  const users = await User.find({
    email: { $exists: true, $ne: '' },
    'notificationPrefs.dailyDigestEnabled': { $ne: false },
  }).select('email name notificationPrefs pushSubscriptions lastDailyDigestAt');

  let sent = 0;
  for (const user of users) {
    const digestHour = user.notificationPrefs?.dailyDigestHour ?? 7;
    if (digestHour !== hour) continue;
    if (user.lastDailyDigestAt && isSameUtcDay(new Date(user.lastDailyDigestAt), now)) continue;
    try {
      const ok = await processDailyDigestForUser(user, false);
      if (ok) sent += 1;
    } catch (err) {
      console.error('Daily digest failed:', user.email, err.message);
    }
  }
  if (sent > 0) console.log(`[daily digest] sent ${sent} digest(s)`);
}

function startDailyDigestJob() {
  const intervalMs = parseInt(process.env.DAILY_DIGEST_CHECK_MS || '3600000', 10);
  const run = () => {
    processDailyDigests().catch((err) => console.error('Daily digest job error:', err.message));
  };
  run();
  setInterval(run, intervalMs);
}

module.exports = { startDailyDigestJob, processDailyDigests, processDailyDigestForUser };
