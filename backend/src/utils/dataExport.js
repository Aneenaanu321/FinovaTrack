const Task = require('../models/Task');
const Appointment = require('../models/Appointment');
const { escapeCsv } = require('./clientHelpers');

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

async function buildTasksCsvForUser(userId) {
  const tasks = await Task.find({ user: userId })
    .populate('client', 'name')
    .sort({ dueDate: 1, createdAt: -1 });
  const headers = [
    'title', 'description', 'status', 'priority', 'dueDate',
    'clientName', 'completedAt', 'recurringFrequency',
  ];
  const lines = [headers.join(',')];
  for (const t of tasks) {
    const row = {
      title: t.title,
      description: t.description || '',
      status: t.status,
      priority: t.priority,
      dueDate: formatDate(t.dueDate),
      clientName: t.client?.name || '',
      completedAt: formatDate(t.completedAt),
      recurringFrequency: t.recurringFrequency || '',
    };
    lines.push(headers.map((h) => escapeCsv(row[h])).join(','));
  }
  return { csv: lines.join('\n'), count: tasks.length };
}

async function buildAppointmentsCsvForUser(userId) {
  const appointments = await Appointment.find({ user: userId })
    .populate('client', 'name phone')
    .sort({ dateTime: 1 });
  const headers = [
    'dateTime', 'type', 'status', 'clientName', 'clientPhone', 'location', 'notes', 'durationMinutes',
  ];
  const lines = [headers.join(',')];
  for (const a of appointments) {
    const row = {
      dateTime: a.dateTime ? new Date(a.dateTime).toISOString() : '',
      type: a.type,
      status: a.status,
      clientName: a.client?.name || '',
      clientPhone: a.client?.phone || '',
      location: a.location || '',
      notes: a.notes || '',
      durationMinutes: a.durationMinutes ?? '',
    };
    lines.push(headers.map((h) => escapeCsv(row[h])).join(','));
  }
  return { csv: lines.join('\n'), count: appointments.length };
}

function buildCommissionCsv(commissionReporting, dateRange) {
  const headers = ['section', 'name', 'dealStatus', 'dealValue', 'expectedCommission', 'closedAt'];
  const lines = [headers.join(',')];
  const pushRow = (section, d) => {
    const row = {
      section,
      name: d.name || '',
      dealStatus: d.dealStatus || '',
      dealValue: d.dealValue ?? '',
      expectedCommission: d.expectedCommission ?? '',
      closedAt: d.closedAt ? new Date(d.closedAt).toISOString().slice(0, 10) : '',
    };
    lines.push(headers.map((h) => escapeCsv(row[h])).join(','));
  };
  for (const d of commissionReporting?.closedInRange?.deals || []) {
    pushRow('closed_in_range', d);
  }
  for (const row of commissionReporting?.openPipeline?.byStage || []) {
    const summary = {
      name: `${row.stage} (${row.count} deals)`,
      dealStatus: row.stage,
      dealValue: row.dealValue,
      expectedCommission: row.commission,
    };
    pushRow('open_pipeline_stage', summary);
  }
  const meta = [
    `# range_start,${dateRange?.start || ''}`,
    `# range_end,${dateRange?.end || ''}`,
    `# closed_deals,${commissionReporting?.closedInRange?.count ?? 0}`,
    `# closed_deal_value,${commissionReporting?.closedInRange?.dealValue ?? 0}`,
    `# closed_commission,${commissionReporting?.closedInRange?.commission ?? 0}`,
    `# open_pipeline_deals,${commissionReporting?.openPipeline?.count ?? 0}`,
    `# open_pipeline_value,${commissionReporting?.openPipeline?.dealValue ?? 0}`,
    `# open_pipeline_commission,${commissionReporting?.openPipeline?.commission ?? 0}`,
  ];
  return `${meta.join('\n')}\n${lines.join('\n')}`;
}

module.exports = {
  buildTasksCsvForUser,
  buildAppointmentsCsvForUser,
  buildCommissionCsv,
};
