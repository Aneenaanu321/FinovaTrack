const Task = require('../models/Task');
const Client = require('../models/Client');
const { STALE_LEAD_DAYS } = require('../models/Client');

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfToday() {
  const s = startOfToday();
  return new Date(s.getFullYear(), s.getMonth(), s.getDate(), 23, 59, 59, 999);
}

function snoozeToDate(preset) {
  const base = startOfToday();
  const map = { tomorrow: 1, '3days': 3, week: 7 };
  const days = map[preset];
  if (!days) return null;
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

async function getNeedsAttention(userId) {
  const start = startOfToday();
  const end = endOfToday();
  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - STALE_LEAD_DAYS);

  const activeClientFilter = {
    user: userId,
    deletedAt: null,
    dealStatus: { $ne: 'Closed' },
  };

  const [
    overdueTasks,
    staleClients,
    dueFollowUps,
    unscheduledFollowUps,
  ] = await Promise.all([
    Task.find({
      user: userId,
      status: 'Pending',
      dueDate: { $lt: start },
    })
      .populate('client', 'name phone dealStatus')
      .sort({ dueDate: 1 }),
    Client.find({
      ...activeClientFilter,
      $or: [
        { lastContactedAt: { $lt: staleCutoff } },
        { lastContactedAt: null, createdAt: { $lt: staleCutoff } },
      ],
    })
      .sort({ lastContactedAt: 1, createdAt: 1 })
      .select('name phone email dealStatus kycStatus lastContactedAt nextAction nextFollowUpDate createdAt'),
    Client.find({
      ...activeClientFilter,
      nextFollowUpDate: { $lte: end },
    })
      .sort({ nextFollowUpDate: 1 })
      .select('name phone email dealStatus nextAction nextFollowUpDate lastContactedAt'),
    Client.find({
      ...activeClientFilter,
      nextAction: { $exists: true, $ne: '' },
      $or: [
        { nextFollowUpDate: null },
        { nextFollowUpDate: { $exists: false } },
      ],
    })
      .sort({ updatedAt: -1 })
      .select('name phone email dealStatus nextAction nextFollowUpDate lastContactedAt'),
  ]);

  const followUpIds = new Set(dueFollowUps.map((c) => String(c._id)));
  const unscheduled = unscheduledFollowUps.filter((c) => !followUpIds.has(String(c._id)));

  return {
    staleDays: STALE_LEAD_DAYS,
    overdueTasks,
    staleClients,
    dueFollowUps,
    unscheduledFollowUps: unscheduled,
    counts: {
      overdueTasks: overdueTasks.length,
      staleClients: staleClients.length,
      dueFollowUps: dueFollowUps.length,
      unscheduledFollowUps: unscheduled.length,
      total:
        overdueTasks.length +
        staleClients.length +
        dueFollowUps.length +
        unscheduled.length,
    },
  };
}

module.exports = { getNeedsAttention, snoozeToDate, startOfToday, endOfToday, STALE_LEAD_DAYS };
