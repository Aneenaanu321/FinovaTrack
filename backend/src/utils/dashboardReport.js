const Client = require('../models/Client');
const Task = require('../models/Task');
const { STALE_LEAD_DAYS } = require('../models/Client');

const ACTIVE_CLIENT = { deletedAt: null };
const DEAL_STAGES = ['New', 'Contacted', 'Interested', 'Closed'];
const KYC_STATUSES = ['Not Started', 'In Progress', 'Completed'];

function parseDateRange(query) {
  const now = new Date();
  let start;
  let end;

  if (query.startDate && query.endDate) {
    start = new Date(query.startDate);
    end = new Date(query.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error('Invalid date range');
    }
    end.setHours(23, 59, 59, 999);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  if (start > end) throw new Error('Start date must be before end date');
  return { start, end };
}

function monthBounds(date) {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function weekKey(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

async function getDealsByStage(userId) {
  const rows = await Client.aggregate([
    { $match: { user: userId, ...ACTIVE_CLIENT } },
    { $group: { _id: '$dealStatus', count: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return DEAL_STAGES.map((stage) => ({ stage, count: map[stage] || 0 }));
}

async function getKycBreakdown(userId) {
  const rows = await Client.aggregate([
    { $match: { user: userId, ...ACTIVE_CLIENT } },
    { $group: { _id: '$kycStatus', count: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const breakdown = KYC_STATUSES.map((status) => ({
    status,
    count: map[status] || 0,
  }));
  const total = breakdown.reduce((s, b) => s + b.count, 0);
  const completed = map.Completed || 0;
  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { breakdown, total, percentComplete };
}

async function getTasksCompletedPerWeek(userId, start, end) {
  const tasks = await Task.find({
    user: userId,
    status: 'Completed',
    completedAt: { $gte: start, $lte: end },
  }).select('completedAt');

  const byWeek = {};
  for (const task of tasks) {
    const key = weekKey(task.completedAt);
    byWeek[key] = (byWeek[key] || 0) + 1;
  }

  const weeks = [];
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    weeks.push({ weekStart: key, count: byWeek[key] || 0 });
    cursor.setDate(cursor.getDate() + 7);
    if (weeks.length > 52) break;
  }
  return weeks.slice(-12);
}

function sumField(clients, field) {
  return clients.reduce((sum, c) => sum + (Number(c[field]) || 0), 0);
}

async function getMonthlyActuals(userId, monthStart, monthEnd) {
  const closedClients = await Client.find({
    user: userId,
    ...ACTIVE_CLIENT,
    dealStatus: 'Closed',
    updatedAt: { $gte: monthStart, $lte: monthEnd },
  }).select('dealValue expectedCommission name updatedAt');

  return {
    clientsClosed: closedClients.length,
    dealValue: sumField(closedClients, 'dealValue'),
    commission: sumField(closedClients, 'expectedCommission'),
    closedDeals: closedClients.map((c) => ({
      _id: c._id,
      name: c.name,
      dealValue: c.dealValue ?? 0,
      expectedCommission: c.expectedCommission ?? 0,
      closedAt: c.updatedAt,
    })),
  };
}

async function getCommissionReporting(userId, rangeStart, rangeEnd) {
  const base = { user: userId, ...ACTIVE_CLIENT };

  const [closedInRange, pipelineClients] = await Promise.all([
    Client.find({
      ...base,
      dealStatus: 'Closed',
      updatedAt: { $gte: rangeStart, $lte: rangeEnd },
    }).select('name dealValue expectedCommission dealStatus productType updatedAt'),
    Client.find({
      ...base,
      dealStatus: { $in: ['New', 'Contacted', 'Interested'] },
    }).select('dealValue expectedCommission dealStatus'),
  ]);

  const pipelineByStage = DEAL_STAGES.filter((s) => s !== 'Closed').map((stage) => {
    const list = pipelineClients.filter((c) => c.dealStatus === stage);
    return {
      stage,
      count: list.length,
      dealValue: sumField(list, 'dealValue'),
      commission: sumField(list, 'expectedCommission'),
    };
  });

  return {
    closedInRange: {
      count: closedInRange.length,
      dealValue: sumField(closedInRange, 'dealValue'),
      commission: sumField(closedInRange, 'expectedCommission'),
      deals: closedInRange.slice(0, 10).map((c) => ({
        _id: c._id,
        name: c.name,
        dealValue: c.dealValue ?? 0,
        expectedCommission: c.expectedCommission ?? 0,
        productType: c.productType,
        closedAt: c.updatedAt,
      })),
    },
    openPipeline: {
      count: pipelineClients.length,
      dealValue: sumField(pipelineClients, 'dealValue'),
      commission: sumField(pipelineClients, 'expectedCommission'),
      byStage: pipelineByStage,
    },
  };
}

function normalizeTargets(userTargets) {
  const dealValueTarget =
    userTargets?.dealValue ?? userTargets?.revenue ?? 0;
  return {
    clientsClosed: userTargets?.clientsClosed ?? 5,
    dealValue: dealValueTarget,
    commission: userTargets?.commission ?? 0,
  };
}

async function getFocusList(userId, limit = 8) {
  const staleCutoff = new Date();
  staleCutoff.setDate(staleCutoff.getDate() - STALE_LEAD_DAYS);

  const clients = await Client.find({
    user: userId,
    ...ACTIVE_CLIENT,
    dealStatus: { $ne: 'Closed' },
  })
    .select('name phone email dealStatus kycStatus lastContactedAt createdAt nextAction')
    .lean();

  const scored = clients.map((c) => {
    let score = 0;
    const reasons = [];
    const lastTouch = c.lastContactedAt || c.createdAt;
    const daysSince = Math.floor((Date.now() - new Date(lastTouch)) / 86400000);

    if (c.dealStatus === 'Interested') {
      score += 40;
      reasons.push('Hot lead — interested');
    } else if (c.dealStatus === 'Contacted') {
      score += 25;
      reasons.push('Follow up on contact');
    } else if (c.dealStatus === 'New') {
      score += 20;
      reasons.push('New lead');
    }

    if (daysSince >= STALE_LEAD_DAYS) {
      score += 35;
      reasons.push(`No contact in ${daysSince} days`);
    } else if (daysSince >= 7) {
      score += 15;
      reasons.push(`Last contact ${daysSince}d ago`);
    }

    if (c.kycStatus === 'In Progress') {
      score += 20;
      reasons.push('KYC in progress');
    }

    if (c.nextAction) {
      score += 10;
      reasons.push(c.nextAction);
    }

    return {
      _id: c._id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      dealStatus: c.dealStatus,
      kycStatus: c.kycStatus,
      score,
      reason: reasons[0] || 'Reach out today',
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function buildReportData(userId, query, userTargets) {
  const { start, end } = parseDateRange(query);
  const { start: monthStart, end: monthEnd } = monthBounds(end);

  const clientFilter = { user: userId, ...ACTIVE_CLIENT };

  const [
    dealsByStage,
    kyc,
    tasksCompletedPerWeek,
    monthlyActual,
    commissionReporting,
    focusList,
    totalClients,
    activeDeals,
    completedTasksInRange,
    overdueTasks,
  ] = await Promise.all([
    getDealsByStage(userId),
    getKycBreakdown(userId),
    getTasksCompletedPerWeek(userId, start, end),
    getMonthlyActuals(userId, monthStart, monthEnd),
    getCommissionReporting(userId, start, end),
    getFocusList(userId),
    Client.countDocuments(clientFilter),
    Client.countDocuments({
      ...clientFilter,
      dealStatus: { $in: ['New', 'Contacted', 'Interested'] },
    }),
    Task.countDocuments({
      user: userId,
      status: 'Completed',
      completedAt: { $gte: start, $lte: end },
    }),
    Task.find({
      user: userId,
      status: 'Pending',
      dueDate: { $lt: new Date(new Date().setHours(0, 0, 0, 0)) },
    })
      .populate('client', 'name')
      .sort({ dueDate: 1 })
      .limit(20),
  ]);

  const targets = normalizeTargets(userTargets);

  return {
    dateRange: { start: start.toISOString(), end: end.toISOString() },
    stats: {
      totalClients,
      activeDeals,
      completedTasks: completedTasksInRange,
      overdueTasks: overdueTasks.length,
    },
    dealsByStage,
    kyc,
    tasksCompletedPerWeek,
    monthlyTargets: {
      ...targets,
      actual: monthlyActual,
      month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
    },
    commissionReporting,
    focusList,
    overdueTasks,
  };
}

function formatSummaryText(report, userName, periodLabel) {
  const { stats, dealsByStage, kyc, monthlyTargets, focusList } = report;
  const pipeline = dealsByStage.map((d) => `${d.stage}: ${d.count}`).join(', ');
  const focus = focusList
    .slice(0, 5)
    .map((c, i) => `${i + 1}. ${c.name} (${c.dealStatus}) — ${c.reason}`)
    .join('\n');

  return `FinovaTrack ${periodLabel} Summary for ${userName}

Stats (${periodLabel}):
- Total clients: ${stats.totalClients}
- Active deals: ${stats.activeDeals}
- Tasks completed: ${stats.completedTasks}
- Overdue tasks: ${stats.overdueTasks}

Pipeline: ${pipeline}
KYC completion: ${kyc.percentComplete}%

Monthly targets (${monthlyTargets.month}):
- Deals closed: ${monthlyTargets.actual.clientsClosed} / ${monthlyTargets.clientsClosed}
- Deal value: $${monthlyTargets.actual.dealValue?.toLocaleString?.() ?? monthlyTargets.actual.dealValue} / $${monthlyTargets.dealValue?.toLocaleString?.() ?? monthlyTargets.dealValue}
- Commission: $${monthlyTargets.actual.commission?.toLocaleString?.() ?? monthlyTargets.actual.commission} / $${monthlyTargets.commission?.toLocaleString?.() ?? monthlyTargets.commission}

Top clients to contact:
${focus || 'None flagged'}
`;
}

module.exports = {
  parseDateRange,
  buildReportData,
  formatSummaryText,
  monthBounds,
};
