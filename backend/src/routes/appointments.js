const express = require('express');
const Appointment = require('../models/Appointment');
const Client = require('../models/Client');
const auth = require('../middleware/auth');
const { appointmentToEvent, toIcsEvent, googleCalendarUrl, outlookCalendarUrl } = require('../utils/calendarLinks');
const { recordAudit } = require('../utils/audit');

const router = express.Router();
router.use(auth);

const ALLOWED_UPDATE = ['client', 'dateTime', 'durationMinutes', 'type', 'location', 'notes', 'status', 'remindEmail', 'remindSms'];

function buildFilter(req) {
  const { status, from, to, clientId, search } = req.query;
  const filter = { user: req.user.id };
  if (status) filter.status = status;
  if (clientId) filter.client = clientId;
  if (from || to) {
    filter.dateTime = {};
    if (from) filter.dateTime.$gte = new Date(from);
    if (to) filter.dateTime.$lte = new Date(to);
  }
  return filter;
}

router.get('/', async (req, res) => {
  try {
    const { search, limit: limitQuery } = req.query;
    let filter = buildFilter(req);
    const sort = { dateTime: 1 };
    const populate = { path: 'client', select: 'name phone email dealStatus' };

    if (search) {
      const clientIds = await Client.find({
        user: req.user.id,
        deletedAt: null,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ],
      }).distinct('_id');
      filter = {
        ...filter,
        $or: [
          { notes: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
          { client: { $in: clientIds } },
        ],
      };
    }

    if (req.query.page) {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        Appointment.find(filter).populate(populate).sort(sort).skip(skip).limit(limit),
        Appointment.countDocuments(filter),
      ]);
      return res.json({
        items,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      });
    }

    let query = Appointment.find(filter).populate(populate).sort(sort);
    if (limitQuery && !req.query.page) {
      const limitNum = Math.min(50, Math.max(1, parseInt(limitQuery, 10) || 20));
      query = query.limit(limitNum);
    }
    const appointments = await query;
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/calendar-links', async (req, res) => {
  try {
    const appt = await Appointment.findOne({ _id: req.params.id, user: req.user.id })
      .populate('client', 'name phone email');
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    const event = appointmentToEvent(appt);
    res.json({
      google: googleCalendarUrl(event),
      outlook: outlookCalendarUrl(event),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/ics', async (req, res) => {
  try {
    const appt = await Appointment.findOne({ _id: req.params.id, user: req.user.id })
      .populate('client', 'name phone email');
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    const event = appointmentToEvent(appt);
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FinovaTrack//EN', toIcsEvent(event), 'END:VCALENDAR'].join('\r\n');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="appointment-${appt._id}.ics"`);
    res.send(ics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { client, dateTime, type, location, notes, durationMinutes, remindEmail, remindSms } = req.body;
    if (!client || !dateTime)
      return res.status(400).json({ message: 'Client and dateTime are required' });
    const appointment = await Appointment.create({
      user: req.user.id,
      client,
      dateTime,
      type,
      location,
      notes,
      durationMinutes,
      remindEmail: remindEmail !== false,
      remindSms: !!remindSms,
    });
    await appointment.populate('client', 'name phone email dealStatus');
    await recordAudit(req, {
      action: 'create',
      entityType: 'appointment',
      entityId: appointment._id,
      entityLabel: appointment.client?.name || 'Appointment',
      changes: [{ field: 'dateTime', from: null, to: appointment.dateTime }],
    });
    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function applyClientFollowUp(userId, clientId, { nextFollowUpDate, nextAction, note }) {
  if (!clientId) return null;
  const client = await Client.findOne({ _id: clientId, user: userId, deletedAt: null });
  if (!client) return null;
  client.lastContactedAt = new Date();
  if (note) {
    client.activities.push({ type: 'call', title: 'Call logged', body: note });
  }
  if (nextAction !== undefined && nextAction !== null) {
    client.nextAction = String(nextAction).trim();
  }
  if (nextFollowUpDate !== undefined) {
    client.nextFollowUpDate = nextFollowUpDate ? new Date(nextFollowUpDate) : null;
  }
  await client.save();
  return client;
}

async function applyCallRecordingFlags(userId, clientId, { callRecorded, recordingDisclosed }) {
  if (!callRecorded || !clientId) return;
  const client = await Client.findOne({ _id: clientId, user: userId, deletedAt: null });
  if (!client) return;
  client.interactionFlags = client.interactionFlags || {};
  client.interactionFlags.callRecorded = true;
  client.interactionFlags.lastCallRecordedAt = new Date();
  if (recordingDisclosed) {
    client.consents = client.consents || {};
    client.consents.callRecording = client.consents.callRecording || {};
    client.consents.callRecording.granted = true;
    if (!client.consents.callRecording.grantedAt) {
      client.consents.callRecording.grantedAt = new Date();
    }
  }
  await client.save();
}

router.post('/:id/log-call', async (req, res) => {
  try {
    const { notes, callRecorded, recordingDisclosed, nextFollowUpDate, nextAction } = req.body;
    if (!notes?.trim()) return res.status(400).json({ message: 'Call notes are required' });
    const appointment = await Appointment.findOne({ _id: req.params.id, user: req.user.id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    appointment.callLogs.push({
      notes: notes.trim(),
      callRecorded: !!callRecorded,
      recordingDisclosed: !!recordingDisclosed,
    });
    await applyCallRecordingFlags(req.user.id, appointment.client, { callRecorded, recordingDisclosed });
    await applyClientFollowUp(req.user.id, appointment.client, {
      nextFollowUpDate,
      nextAction,
      note: notes.trim(),
    });
    await appointment.save();
    await appointment.populate('client', 'name phone email dealStatus');
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/complete', async (req, res) => {
  try {
    const { callNotes, dealStatus, callRecorded, recordingDisclosed } = req.body;
    const appointment = await Appointment.findOne({ _id: req.params.id, user: req.user.id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    appointment.status = 'Completed';
    if (callNotes?.trim()) {
      appointment.callLogs.push({
        notes: callNotes.trim(),
        callRecorded: !!callRecorded,
        recordingDisclosed: !!recordingDisclosed,
      });
      await applyCallRecordingFlags(req.user.id, appointment.client, { callRecorded, recordingDisclosed });
      await applyClientFollowUp(req.user.id, appointment.client, {
        nextFollowUpDate: req.body.nextFollowUpDate,
        nextAction: req.body.nextAction,
        note: callNotes.trim(),
      });
    } else if (req.body.nextFollowUpDate || req.body.nextAction) {
      await applyClientFollowUp(req.user.id, appointment.client, {
        nextFollowUpDate: req.body.nextFollowUpDate,
        nextAction: req.body.nextAction,
      });
    }
    await appointment.save();

    if (dealStatus) {
      const client = await Client.findOne({ _id: appointment.client, user: req.user.id });
      if (client) {
        const allowed = ['New', 'Contacted', 'Interested', 'Closed'];
        if (allowed.includes(dealStatus)) {
          client.dealStatus = dealStatus;
          await client.save();
        }
      }
    }

    await appointment.populate('client', 'name phone email dealStatus');
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const update = {};
    for (const key of ALLOWED_UPDATE) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    if (update.status && update.status !== 'Upcoming') {
      update.reminderEmailSentAt = undefined;
      update.reminderSmsSentAt = undefined;
    }
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      update,
      { new: true, runValidators: true }
    ).populate('client', 'name phone email dealStatus');
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    await recordAudit(req, {
      action: 'update',
      entityType: 'appointment',
      entityId: appointment._id,
      entityLabel: appointment.client?.name || 'Appointment',
      changes: [{ field: 'update', from: null, to: 'modified' }],
    });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    await recordAudit(req, {
      action: 'delete',
      entityType: 'appointment',
      entityId: appointment._id,
      entityLabel: 'Appointment',
      changes: [{ field: 'deleted', from: appointment.dateTime, to: null }],
    });
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
