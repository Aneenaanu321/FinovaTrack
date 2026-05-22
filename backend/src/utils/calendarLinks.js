/** Build Google Calendar "add event" URL (no OAuth). */
function formatGoogleDates(start, end) {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return `${fmt(start)}/${fmt(end)}`;
}

function googleCalendarUrl({ title, start, end, location, notes }) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: formatGoogleDates(start, end),
    details: notes || '',
    location: location || '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Outlook web compose deeplink (no OAuth). */
function outlookCalendarUrl({ title, start, end, location, notes }) {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: notes || '',
    location: location || '',
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}

function escapeIcs(text) {
  return String(text || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function toIcsDate(d) {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function toIcsEvent({ title, start, end, location, notes, uid }) {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
  ];
  if (location) lines.push(`LOCATION:${escapeIcs(location)}`);
  if (notes) lines.push(`DESCRIPTION:${escapeIcs(notes)}`);
  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

function appointmentToEvent(appt) {
  const start = new Date(appt.dateTime);
  const end = new Date(start.getTime() + (appt.durationMinutes || 60) * 60 * 1000);
  const clientName = appt.client?.name || 'Client';
  const title = `${appt.type} — ${clientName}`;
  const notes = [appt.notes, appt.location ? `Location: ${appt.location}` : ''].filter(Boolean).join('\n');
  return {
    title,
    start,
    end,
    location: appt.location || '',
    notes,
    uid: `finovatrack-${appt._id}@finovatrack`,
  };
}

module.exports = { googleCalendarUrl, outlookCalendarUrl, toIcsEvent, appointmentToEvent };
