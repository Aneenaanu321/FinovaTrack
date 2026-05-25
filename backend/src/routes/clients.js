const express = require('express');
const Client = require('../models/Client');
const Task = require('../models/Task');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errors');
const { STALE_LEAD_DAYS } = require('../models/Client');
const auth = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { clientCreateSchema } = require('../validation/schemas');
const {
  pickClientData,
  findDuplicates,
  logStatusChange,
  escapeCsv,
  parseCsv,
  mapImportRow,
} = require('../utils/clientHelpers');
const { buildPipelinePdf } = require('../utils/pipelinePdf');
const { buildClientsCsvForUser } = require('../utils/clientExport');
const { processWeeklyBackupForUser } = require('../jobs/weeklyBackup');

const router = express.Router();
router.use(auth);

const activeFilter = (userId) => ({ user: userId, deletedAt: null });

router.get('/export/csv', async (req, res) => {
  try {
    const { csv, count } = await buildClientsCsvForUser(req.user.id);
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="finovatrack-clients-${date}.csv"`);
    res.setHeader('X-Export-Count', String(count));
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/export/full', async (req, res) => {
  try {
    const { csv, count } = await buildClientsCsvForUser(req.user.id);
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="finovatrack-clients-full-${date}.csv"`);
    res.setHeader('X-Export-Count', String(count));
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/export/pipeline-pdf', async (req, res) => {
  try {
    const clients = await Client.find(activeFilter(req.user.id)).sort({ dealStatus: 1, name: 1 });
    const pdf = await buildPipelinePdf(clients, req.user.name);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="pipeline-report.pdf"');
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/deleted', async (req, res) => {
  try {
    const clients = await Client.find({ user: req.user.id, deletedAt: { $ne: null } })
      .sort({ deletedAt: -1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/stale', async (req, res) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - STALE_LEAD_DAYS);
    const clients = await Client.find({
      ...activeFilter(req.user.id),
      dealStatus: { $ne: 'Closed' },
      $or: [
        { lastContactedAt: { $lt: cutoff } },
        { lastContactedAt: null, createdAt: { $lt: cutoff } },
      ],
    }).sort({ lastContactedAt: 1, createdAt: 1 });
    res.json({ staleDays: STALE_LEAD_DAYS, clients });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/check-duplicates', async (req, res) => {
  try {
    const { email, phone, excludeId } = req.body;
    const duplicates = await findDuplicates(req.user.id, { email, phone }, excludeId);
    res.json({ duplicates });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/import/preview', async (req, res) => {
  try {
    const { csv } = req.body;
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ message: 'CSV text is required' });
    }
    const rows = parseCsv(csv);
    const preview = [];
    const seenEmails = new Set();
    const seenPhones = new Set();

    for (const raw of rows) {
      const mapped = mapImportRow(raw);
      if (!mapped.name) {
        preview.push({ name: mapped.name || '(empty)', status: 'error', reason: 'Name is required' });
        continue;
      }
      const data = pickClientData(mapped);
      const normEmail = data.email ? data.email.toLowerCase().trim() : '';
      const normPhone = data.phone ? String(data.phone).trim() : '';

      if (normEmail && seenEmails.has(normEmail)) {
        preview.push({ name: data.name, status: 'duplicate', reason: 'Duplicate email in file', matchedOn: ['email'] });
        continue;
      }
      if (normPhone && seenPhones.has(normPhone)) {
        preview.push({ name: data.name, status: 'duplicate', reason: 'Duplicate phone in file', matchedOn: ['phone'] });
        continue;
      }

      const dups = await findDuplicates(req.user.id, data);
      if (dups.length) {
        const matchedOn = [...new Set(dups.flatMap((d) => d.matchedOn))];
        preview.push({
          name: data.name,
          status: 'duplicate',
          reason: `Matches existing client (${matchedOn.join(' & ')})`,
          matchedOn,
          duplicates: dups,
        });
        continue;
      }

      if (normEmail) seenEmails.add(normEmail);
      if (normPhone) seenPhones.add(normPhone);
      preview.push({ name: data.name, status: 'ok', email: data.email, phone: data.phone });
    }

    const ok = preview.filter((p) => p.status === 'ok').length;
    const duplicate = preview.filter((p) => p.status === 'duplicate').length;
    const error = preview.filter((p) => p.status === 'error').length;
    res.json({ preview, summary: { total: preview.length, ok, duplicate, error } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/import', async (req, res) => {
  try {
    const { csv } = req.body;
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ message: 'CSV text is required' });
    }
    const rows = parseCsv(csv);
    const created = [];
    const skipped = [];
    const errors = [];
    const seenEmails = new Set();
    const seenPhones = new Set();

    for (const raw of rows) {
      const mapped = mapImportRow(raw);
      if (!mapped.name) {
        errors.push({ row: raw, reason: 'Name is required' });
        continue;
      }
      const data = pickClientData(mapped);
      const normEmail = data.email ? data.email.toLowerCase().trim() : '';
      const normPhone = data.phone ? String(data.phone).trim() : '';

      if (normEmail && seenEmails.has(normEmail)) {
        skipped.push({ name: data.name, reason: 'Duplicate email in import file', matchedOn: ['email'] });
        continue;
      }
      if (normPhone && seenPhones.has(normPhone)) {
        skipped.push({ name: data.name, reason: 'Duplicate phone in import file', matchedOn: ['phone'] });
        continue;
      }

      const dups = await findDuplicates(req.user.id, data);
      if (dups.length) {
        const matchedOn = [...new Set(dups.flatMap((d) => d.matchedOn))];
        skipped.push({
          name: data.name,
          reason: `Matches existing client by ${matchedOn.join(' & ')}`,
          matchedOn,
          duplicates: dups,
        });
        continue;
      }

      if (normEmail) seenEmails.add(normEmail);
      if (normPhone) seenPhones.add(normPhone);
      const client = await Client.create({ user: req.user.id, ...data });
      created.push(client);
    }

    res.json({ created: created.length, skipped, errors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/backup/preferences', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('backupPrefs lastWeeklyBackupAt');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      weeklyBackupEnabled: user.backupPrefs?.weeklyBackupEnabled !== false,
      weeklyBackupWeekday: user.backupPrefs?.weeklyBackupWeekday ?? 1,
      weeklyBackupHour: user.backupPrefs?.weeklyBackupHour ?? 8,
      lastWeeklyBackupAt: user.lastWeeklyBackupAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/backup/preferences', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.backupPrefs) user.backupPrefs = {};

    const { weeklyBackupEnabled, weeklyBackupWeekday, weeklyBackupHour } = req.body;
    if (weeklyBackupEnabled !== undefined) {
      user.backupPrefs.weeklyBackupEnabled = !!weeklyBackupEnabled;
    }
    if (weeklyBackupWeekday !== undefined) {
      const d = Number(weeklyBackupWeekday);
      if (Number.isNaN(d) || d < 0 || d > 6) {
        return res.status(400).json({ message: 'weeklyBackupWeekday must be 0–6 (Sun–Sat UTC)' });
      }
      user.backupPrefs.weeklyBackupWeekday = d;
    }
    if (weeklyBackupHour !== undefined) {
      const h = Number(weeklyBackupHour);
      if (Number.isNaN(h) || h < 0 || h > 23) {
        return res.status(400).json({ message: 'weeklyBackupHour must be 0–23' });
      }
      user.backupPrefs.weeklyBackupHour = h;
    }
    await user.save();
    res.json({
      weeklyBackupEnabled: user.backupPrefs.weeklyBackupEnabled !== false,
      weeklyBackupWeekday: user.backupPrefs.weeklyBackupWeekday ?? 1,
      weeklyBackupHour: user.backupPrefs.weeklyBackupHour ?? 8,
      lastWeeklyBackupAt: user.lastWeeklyBackupAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/backup/send-now', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('email name backupPrefs lastWeeklyBackupAt');
    if (!user?.email) return res.status(400).json({ message: 'No email on account' });
    const sent = await processWeeklyBackupForUser(user, true);
    res.json({
      message: sent
        ? `Backup sent to ${user.email}`
        : 'Backup logged to server console (configure SMTP for email delivery)',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { search, dealStatus, kycStatus, includeDeleted, page, limit } = req.query;
    const filter = { user: req.user.id };
    if (includeDeleted !== 'true') filter.deletedAt = null;
    if (dealStatus) filter.dealStatus = dealStatus;
    if (kycStatus) filter.kycStatus = kycStatus;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    const sort = { createdAt: -1 };

    if (page) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
      const skip = (pageNum - 1) * limitNum;
      const [clients, total] = await Promise.all([
        Client.find(filter).sort(sort).skip(skip).limit(limitNum),
        Client.countDocuments(filter),
      ]);
      return res.json({
        clients,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      });
    }

    let query = Client.find(filter).sort(sort);
    if (limit) {
      const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));
      query = query.limit(limitNum);
    }
    const clients = await query;
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', validate(clientCreateSchema), asyncHandler(async (req, res) => {
    const data = pickClientData(req.validated.body);

    const duplicates = await findDuplicates(req.user.id, data);
    if (duplicates.length) {
      throw new AppError('A client with this email or phone already exists', 409, duplicates);
    }

    const client = await Client.create({ user: req.user.id, ...data });
    if (data.dealStatus && data.dealStatus !== 'New') {
      client.activities.push({ type: 'status_change', title: 'Deal status set', body: `New → ${data.dealStatus}`, meta: { field: 'dealStatus', from: 'New', to: data.dealStatus } });
      await client.save();
    }
    res.status(201).json(client);
}));

router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, user: req.user.id });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await Client.findOne({ _id: req.params.id, user: req.user.id, deletedAt: null });
    if (!existing) return res.status(404).json({ message: 'Client not found' });

    const data = pickClientData(req.body);
    const duplicates = await findDuplicates(req.user.id, { ...existing.toObject(), ...data }, req.params.id);
    if (duplicates.length) {
      return res.status(409).json({
        message: 'A client with this email or phone already exists',
        duplicates,
      });
    }

    if (data.dealStatus) logStatusChange(existing, 'Deal status', existing.dealStatus, data.dealStatus);
    if (data.kycStatus) logStatusChange(existing, 'KYC status', existing.kycStatus, data.kycStatus);

    Object.assign(existing, data);
    await existing.save();
    res.json(existing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', asyncHandler(async (req, res) => {
  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id, deletedAt: null },
    { deletedAt: new Date() },
    { new: true }
  );
  if (!client) throw new AppError('Client not found', 404);

  await Task.updateMany(
    { user: req.user.id, client: client._id },
    { $set: { client: null } }
  );
  await Appointment.updateMany(
    { user: req.user.id, client: client._id, status: 'Upcoming' },
    { $set: { status: 'Cancelled' } }
  );

  res.json({
    message: 'Client archived. Linked tasks were unlinked; upcoming appointments were cancelled.',
    client,
  });
}));

router.post('/:id/restore', async (req, res) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id, deletedAt: { $ne: null } },
      { deletedAt: null },
      { new: true }
    );
    if (!client) return res.status(404).json({ message: 'Client not found or not deleted' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const CALL_OUTCOMES = {
  reached: { title: 'Call — Reached', defaultAction: 'Follow up on conversation' },
  no_answer: { title: 'Call — No answer', defaultAction: 'Try calling again' },
  callback: { title: 'Call — Callback requested', defaultAction: 'Return their callback' },
};

router.patch('/:id/contact', async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, user: req.user.id, deletedAt: null });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const now = new Date();
    client.lastContactedAt = now;

    const { outcome, note } = req.body;
    if (outcome) {
      if (!CALL_OUTCOMES[outcome]) {
        return res.status(400).json({ message: 'Invalid call outcome' });
      }
      const meta = CALL_OUTCOMES[outcome];
      client.activities.push({
        type: 'call',
        title: meta.title,
        body: note?.trim() || meta.title,
        meta: { outcome },
      });
      if (!client.nextAction?.trim()) client.nextAction = meta.defaultAction;
      if (outcome === 'reached' && client.dealStatus === 'New') {
        logStatusChange(client, 'dealStatus', 'New', 'Contacted');
        client.dealStatus = 'Contacted';
      }
    } else {
      const body = note?.trim() || 'Contact logged';
      client.activities.push({ type: 'contact', title: 'Contact logged', body });
    }

    if (req.body.nextAction !== undefined) client.nextAction = String(req.body.nextAction).trim();
    if (req.body.nextFollowUpDate !== undefined) {
      client.nextFollowUpDate = req.body.nextFollowUpDate
        ? new Date(req.body.nextFollowUpDate)
        : null;
    }

    await client.save();
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/activities', async (req, res) => {
  try {
    const { type, title, body } = req.body;
    if (!type || !title) return res.status(400).json({ message: 'Type and title are required' });

    const client = await Client.findOne({ _id: req.params.id, user: req.user.id, deletedAt: null });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    client.activities.push({ type, title, body });
    if (type === 'call' || type === 'contact') client.lastContactedAt = new Date();
    await client.save();
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
