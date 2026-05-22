const User = require('../models/User');
const { buildClientsCsvForUser } = require('../utils/clientExport');
const { sendBackupEmail } = require('../utils/email');

function isSameUtcWeek(a, b) {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const startA = Math.floor(a.getTime() / weekMs);
  const startB = Math.floor(b.getTime() / weekMs);
  return startA === startB;
}

async function processWeeklyBackupForUser(user, force = false) {
  if (!user.email) return false;
  const prefs = user.backupPrefs || {};
  if (!force && prefs.weeklyBackupEnabled === false) return false;

  const now = new Date();
  const weekday = prefs.weeklyBackupWeekday ?? 1;
  const hour = prefs.weeklyBackupHour ?? 8;

  if (!force && now.getUTCDay() !== weekday) return false;
  if (!force && now.getUTCHours() !== hour) return false;
  if (!force && user.lastWeeklyBackupAt && isSameUtcWeek(new Date(user.lastWeeklyBackupAt), now)) {
    return false;
  }

  const { csv, count } = await buildClientsCsvForUser(user._id);
  const dateStr = now.toISOString().slice(0, 10);
  const filename = `finovatrack-clients-backup-${dateStr}.csv`;
  const subject = `FinovaTrack — Weekly client backup (${dateStr})`;
  const text = `Your weekly FinovaTrack backup is attached.\n\n${count} active client record(s) exported on ${dateStr} UTC.\n\nKeep this file in a safe place — it is your data backup.`;

  await sendBackupEmail(user.email, subject, text, csv, filename);

  user.lastWeeklyBackupAt = now;
  await user.save();
  return true;
}

async function processWeeklyBackups() {
  const now = new Date();
  const weekday = now.getUTCDay();
  const hour = now.getUTCHours();

  const users = await User.find({
    email: { $exists: true, $ne: '' },
    'backupPrefs.weeklyBackupEnabled': { $ne: false },
  }).select('email name backupPrefs lastWeeklyBackupAt');

  let sent = 0;
  for (const user of users) {
    const uDay = user.backupPrefs?.weeklyBackupWeekday ?? 1;
    const uHour = user.backupPrefs?.weeklyBackupHour ?? 8;
    if (uDay !== weekday || uHour !== hour) continue;
    if (user.lastWeeklyBackupAt && isSameUtcWeek(new Date(user.lastWeeklyBackupAt), now)) continue;
    try {
      const ok = await processWeeklyBackupForUser(user, false);
      if (ok) sent += 1;
    } catch (err) {
      console.error('Weekly backup failed:', user.email, err.message);
    }
  }
  if (sent > 0) console.log(`[weekly backup] sent ${sent} backup(s)`);
}

function startWeeklyBackupJob() {
  const intervalMs = parseInt(process.env.WEEKLY_BACKUP_CHECK_MS || '3600000', 10);
  const run = () => {
    processWeeklyBackups().catch((err) => console.error('Weekly backup job error:', err.message));
  };
  run();
  setInterval(run, intervalMs);
}

module.exports = { startWeeklyBackupJob, processWeeklyBackups, processWeeklyBackupForUser };
