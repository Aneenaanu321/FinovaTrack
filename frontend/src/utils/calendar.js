function formatGoogleDates(start, end) {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return `${fmt(start)}/${fmt(end)}`;
}

export function appointmentEvent(appt) {
  const start = new Date(appt.dateTime);
  const end = new Date(start.getTime() + (appt.durationMinutes || 60) * 60 * 1000);
  const clientName = appt.client?.name || 'Client';
  const title = `${appt.type} — ${clientName}`;
  const notes = [appt.notes, appt.location ? `Location: ${appt.location}` : ''].filter(Boolean).join('\n');
  return { title, start, end, location: appt.location || '', notes };
}

export function googleCalendarUrl(appt) {
  const e = appointmentEvent(appt);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: formatGoogleDates(e.start, e.end),
    details: e.notes,
    location: e.location,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function outlookCalendarUrl(appt) {
  const e = appointmentEvent(appt);
  const params = new URLSearchParams({
    rru: 'addevent',
    subject: e.title,
    startdt: e.start.toISOString(),
    enddt: e.end.toISOString(),
    body: e.notes,
    location: e.location,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}

export async function downloadAppointmentIcs(id) {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/appointments/${id}/ics`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to download calendar file');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `appointment-${id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
