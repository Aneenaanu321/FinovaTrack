const webpush = require('web-push');

let configured = false;

function configureVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:support@finovatrack.local',
      publicKey,
      privateKey
    );
    configured = true;
  }
  return true;
}

async function sendPushToUser(user, payload) {
  if (!configureVapid() || !user.pushSubscriptions?.length) return { sent: 0, failed: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  const stale = [];

  for (const sub of user.pushSubscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        body
      );
      sent += 1;
    } catch (err) {
      failed += 1;
      if (err.statusCode === 404 || err.statusCode === 410) {
        stale.push(sub.endpoint);
      }
    }
  }

  if (stale.length) {
    user.pushSubscriptions = user.pushSubscriptions.filter(
      (s) => !stale.includes(s.endpoint)
    );
    await user.save();
  }

  return { sent, failed };
}

module.exports = { configureVapid, sendPushToUser, isPushConfigured: () => configureVapid() };
