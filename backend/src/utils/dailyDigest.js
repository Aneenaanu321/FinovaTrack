function formatTaskLine(task) {
  const due = task.dueDate
    ? new Date(task.dueDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'no time';
  const client = task.client?.name ? ` (${task.client.name})` : '';
  return `• ${task.title}${client} — ${due}`;
}

function formatAppointmentLine(appt) {
  const when = new Date(appt.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `• ${when} — ${appt.type} with ${appt.client?.name || 'Client'}`;
}

function buildDailyDigestContent({ user, todayTasks, todayAppointments, overdueTasks, date }) {
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const lines = [`Good morning, ${user.name}!`, '', `Your FinovaTrack digest for ${dateStr}:`, ''];

  lines.push(`OVERDUE TASKS (${overdueTasks.length})`);
  if (overdueTasks.length === 0) lines.push('  None — great job!');
  else overdueTasks.forEach((t) => lines.push(`  ${formatTaskLine(t)}`));

  lines.push('');
  lines.push(`TODAY'S TASKS (${todayTasks.length})`);
  if (todayTasks.length === 0) lines.push('  None scheduled');
  else todayTasks.forEach((t) => lines.push(`  ${formatTaskLine(t)}`));

  lines.push('');
  lines.push(`TODAY'S APPOINTMENTS (${todayAppointments.length})`);
  if (todayAppointments.length === 0) lines.push('  None scheduled');
  else todayAppointments.forEach((a) => lines.push(`  ${formatAppointmentLine(a)}`));

  lines.push('');
  lines.push('Open FinovaTrack to manage your day.');

  const text = lines.join('\n');
  const html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return { subject: `FinovaTrack — Daily digest (${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`, text, html };
}

module.exports = { buildDailyDigestContent };
