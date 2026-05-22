const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const {
  getNotificationsForUser,
  getNotificationSummary,
  dismissNotification,
  dismissAllNotifications,
} = require('../services/notifications');
const { isPushConfigured } = require('../utils/push');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const data = await getNotificationsForUser(req.user.id);
    if (!data) return res.status(404).json({ message: 'User not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const summary = await getNotificationSummary(req.user.id);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/dismiss/:key', async (req, res) => {
  try {
    const data = await dismissNotification(req.user.id, req.params.key);
    if (!data) return res.status(404).json({ message: 'User not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/dismiss-all', async (req, res) => {
  try {
    const data = await dismissAllNotifications(req.user.id);
    if (!data) return res.status(404).json({ message: 'User not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/preferences', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notificationPrefs pushSubscriptions');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      dailyDigestEnabled: user.notificationPrefs?.dailyDigestEnabled !== false,
      dailyDigestHour: user.notificationPrefs?.dailyDigestHour ?? 7,
      pushEnabled: user.notificationPrefs?.pushEnabled === true,
      pushSubscribed: (user.pushSubscriptions?.length || 0) > 0,
      pushConfigured: isPushConfigured(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/preferences', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.notificationPrefs) user.notificationPrefs = {};

    const { dailyDigestEnabled, dailyDigestHour, pushEnabled } = req.body;
    if (dailyDigestEnabled !== undefined) {
      user.notificationPrefs.dailyDigestEnabled = !!dailyDigestEnabled;
    }
    if (dailyDigestHour !== undefined) {
      const h = Number(dailyDigestHour);
      if (Number.isNaN(h) || h < 0 || h > 23) {
        return res.status(400).json({ message: 'dailyDigestHour must be 0–23' });
      }
      user.notificationPrefs.dailyDigestHour = h;
    }
    if (pushEnabled !== undefined) {
      user.notificationPrefs.pushEnabled = !!pushEnabled;
    }
    await user.save();

    res.json({
      dailyDigestEnabled: user.notificationPrefs.dailyDigestEnabled !== false,
      dailyDigestHour: user.notificationPrefs.dailyDigestHour ?? 7,
      pushEnabled: user.notificationPrefs.pushEnabled === true,
      pushSubscribed: (user.pushSubscriptions?.length || 0) > 0,
      pushConfigured: isPushConfigured(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/push/subscribe', async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: 'Invalid push subscription' });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.pushSubscriptions) user.pushSubscriptions = [];
    user.pushSubscriptions = user.pushSubscriptions.filter((s) => s.endpoint !== endpoint);
    user.pushSubscriptions.push({ endpoint, keys, createdAt: new Date() });
    if (user.pushSubscriptions.length > 5) {
      user.pushSubscriptions = user.pushSubscriptions.slice(-5);
    }
    if (!user.notificationPrefs) user.notificationPrefs = {};
    user.notificationPrefs.pushEnabled = true;
    await user.save();

    res.json({ message: 'Push subscription saved', pushSubscribed: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/push/subscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (endpoint) {
      user.pushSubscriptions = (user.pushSubscriptions || []).filter((s) => s.endpoint !== endpoint);
    } else {
      user.pushSubscriptions = [];
    }
    await user.save();
    res.json({ message: 'Push subscription removed', pushSubscribed: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/vapid-public-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ message: 'Push notifications not configured on server' });
  res.json({ publicKey: key });
});

router.post('/digest/send-now', async (req, res) => {
  try {
    const { processDailyDigestForUser } = require('../jobs/dailyDigest');
    const user = await User.findById(req.user.id).select('email name notificationPrefs');
    if (!user?.email) return res.status(400).json({ message: 'No email on account' });
    const sent = await processDailyDigestForUser(user, true);
    res.json({ message: sent ? 'Daily digest sent' : 'Digest could not be sent (check SMTP)' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
