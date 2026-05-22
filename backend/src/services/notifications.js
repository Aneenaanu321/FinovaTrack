const Task = require('../models/Task');
const Appointment = require('../models/Appointment');
const Client = require('../models/Client');
const User = require('../models/User');
const { STALE_LEAD_DAYS } = require('../models/Client');

const ACTIVE_CLIENT = { deletedAt: null };

function startOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function isDismissed(user, key) {
  return (user.dismissedNotifications || []).some((d) => d.key === key);
}

async function fetchNotificationSources(userId) {
  const start = startOfToday();
  const end = endOfToday();
  const overdueCutoff = start;
  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - STALE_LEAD_DAYS);

  const [
    overdueTasks,
    todayTasks,
    todayAppointments,
    upcomingAppointments,
    staleClients,
  ] = await Promise.all([
    Task.find({
      user: userId,
      status: 'Pending',
      dueDate: { $lt: overdueCutoff },
    })
      .populate('client', 'name')
      .sort({ dueDate: 1 })
      .limit(15),
    Task.find({
      user: userId,
      status: 'Pending',
      dueDate: { $gte: start, $lte: end },
    })
      .populate('client', 'name')
      .sort({ priority: -1 })
      .limit(10),
    Appointment.find({
      user: userId,
      dateTime: { $gte: start, $lte: end },
      status: 'Upcoming',
    })
      .populate('client', 'name')
      .sort({ dateTime: 1 }),
    Appointment.find({
      user: userId,
      dateTime: { $gt: end },
      status: 'Upcoming',
    })
      .populate('client', 'name')
      .sort({ dateTime: 1 })
      .limit(5),
    Client.find({
      user: userId,
      ...ACTIVE_CLIENT,
      dealStatus: { $ne: 'Closed' },
      $or: [
        { lastContactedAt: { $lt: staleCutoff } },
        { lastContactedAt: null, createdAt: { $lt: staleCutoff } },
      ],
    })
      .select('name dealStatus lastContactedAt createdAt')
      .sort({ lastContactedAt: 1 })
      .limit(8),
  ]);

  return { overdueTasks, todayTasks, todayAppointments, upcomingAppointments, staleClients };
}

function buildNotificationList(user, sources) {
  const items = [];
  const { overdueTasks, todayTasks, todayAppointments, upcomingAppointments, staleClients } = sources;

  for (const task of overdueTasks) {
    const key = `overdue_task:${task._id}`;
    items.push({
      key,
      type: 'overdue_task',
      title: 'Overdue task',
      body: task.title,
      link: '/tasks',
      priority: 'high',
      createdAt: task.dueDate?.toISOString() || new Date().toISOString(),
      read: isDismissed(user, key),
      meta: { taskId: task._id, clientName: task.client?.name },
    });
  }

  for (const task of todayTasks) {
    const key = `today_task:${task._id}`;
    items.push({
      key,
      type: 'today_task',
      title: 'Due today',
      body: task.title,
      link: '/tasks',
      priority: 'medium',
      createdAt: task.dueDate?.toISOString() || new Date().toISOString(),
      read: isDismissed(user, key),
      meta: { taskId: task._id },
    });
  }

  for (const appt of todayAppointments) {
    const key = `today_appointment:${appt._id}`;
    const when = new Date(appt.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    items.push({
      key,
      type: 'today_appointment',
      title: 'Appointment today',
      body: `${appt.client?.name || 'Client'} at ${when} · ${appt.type}`,
      link: '/appointments',
      priority: 'medium',
      createdAt: appt.dateTime.toISOString(),
      read: isDismissed(user, key),
      meta: { appointmentId: appt._id },
    });
  }

  for (const appt of upcomingAppointments) {
    const key = `upcoming_appointment:${appt._id}`;
    const when = new Date(appt.dateTime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    items.push({
      key,
      type: 'upcoming_appointment',
      title: 'Upcoming appointment',
      body: `${appt.client?.name || 'Client'} — ${when}`,
      link: '/appointments',
      priority: 'low',
      createdAt: appt.dateTime.toISOString(),
      read: isDismissed(user, key),
      meta: { appointmentId: appt._id },
    });
  }

  for (const client of staleClients) {
    const key = `stale_lead:${client._id}`;
    items.push({
      key,
      type: 'stale_lead',
      title: 'Stale lead',
      body: `${client.name} (${client.dealStatus}) — no recent contact`,
      link: `/clients/${client._id}`,
      priority: 'medium',
      createdAt: (client.lastContactedAt || client.createdAt)?.toISOString?.() || new Date().toISOString(),
      read: isDismissed(user, key),
      meta: { clientId: client._id },
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => order[a.priority] - order[b.priority]);
  return items;
}

async function getNotificationsForUser(userId) {
  const user = await User.findById(userId);
  if (!user) return null;
  const sources = await fetchNotificationSources(userId);
  const notifications = buildNotificationList(user, sources);
  const unreadCount = notifications.filter((n) => !n.read).length;
  return {
    notifications,
    overdueCount: sources.overdueTasks.length,
    unreadCount,
    totalCount: notifications.length,
  };
}

async function getNotificationSummary(userId) {
  const user = await User.findById(userId).select('dismissedNotifications');
  if (!user) return { overdueCount: 0, unreadCount: 0 };
  const sources = await fetchNotificationSources(userId);
  const notifications = buildNotificationList(user, sources);
  const unreadCount = notifications.filter((n) => !n.read).length;
  return {
    overdueCount: sources.overdueTasks.length,
    unreadCount,
    badgeCount: sources.overdueTasks.length,
  };
}

async function dismissNotification(userId, key) {
  const user = await User.findById(userId);
  if (!user) return null;
  if (!user.dismissedNotifications) user.dismissedNotifications = [];
  if (!user.dismissedNotifications.some((d) => d.key === key)) {
    user.dismissedNotifications.push({ key, at: new Date() });
    if (user.dismissedNotifications.length > 200) {
      user.dismissedNotifications = user.dismissedNotifications.slice(-200);
    }
    await user.save();
  }
  return getNotificationsForUser(userId);
}

async function dismissAllNotifications(userId) {
  const user = await User.findById(userId);
  if (!user) return null;
  const sources = await fetchNotificationSources(userId);
  const notifications = buildNotificationList(user, sources);
  const keys = notifications.map((n) => n.key);
  const existing = new Set((user.dismissedNotifications || []).map((d) => d.key));
  const now = new Date();
  for (const key of keys) {
    if (!existing.has(key)) {
      user.dismissedNotifications.push({ key, at: now });
    }
  }
  if (user.dismissedNotifications.length > 200) {
    user.dismissedNotifications = user.dismissedNotifications.slice(-200);
  }
  await user.save();
  return getNotificationsForUser(userId);
}

async function getDailyDigestData(userId) {
  const start = startOfToday();
  const end = endOfToday();
  const overdueCutoff = start;

  const [todayTasks, todayAppointments, overdueTasks, user] = await Promise.all([
    Task.find({
      user: userId,
      status: 'Pending',
      dueDate: { $gte: start, $lte: end },
    })
      .populate('client', 'name')
      .sort({ priority: -1 }),
    Appointment.find({
      user: userId,
      dateTime: { $gte: start, $lte: end },
      status: 'Upcoming',
    })
      .populate('client', 'name')
      .sort({ dateTime: 1 }),
    Task.find({
      user: userId,
      status: 'Pending',
      dueDate: { $lt: overdueCutoff },
    })
      .populate('client', 'name')
      .sort({ dueDate: 1 })
      .limit(10),
    User.findById(userId).select('name email'),
  ]);

  return { user, todayTasks, todayAppointments, overdueTasks, date: start };
}

module.exports = {
  getNotificationsForUser,
  getNotificationSummary,
  dismissNotification,
  dismissAllNotifications,
  getDailyDigestData,
  fetchNotificationSources,
};
