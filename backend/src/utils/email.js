const sendPasswordResetEmail = async (to, resetUrl) => {
  const hasSmtp =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (hasSmtp) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: 'FinovaTrack — Reset your password',
      text: `Reset your password by visiting this link (expires in 1 hour):\n\n${resetUrl}`,
      html: `<p>Reset your password by clicking the link below (expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
    return;
  }

  console.log('\n--- Password reset (no SMTP configured) ---');
  console.log(`To: ${to}`);
  console.log(`Reset link: ${resetUrl}\n`);
};

const sendTaskReminderEmail = async (to, { title, dueDate, clientName }) => {
  const dueStr = dueDate
    ? new Date(dueDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : 'No due date set';
  const clientLine = clientName ? `\nClient: ${clientName}` : '';
  const subject = `FinovaTrack — Task reminder: ${title}`;
  const text = `Your task "${title}" is due soon.\n\nDue: ${dueStr}${clientLine}\n\nLog in to FinovaTrack to view and complete it.`;
  const html = `<p>Your task <strong>${title}</strong> is due soon.</p><p><strong>Due:</strong> ${dueStr}${clientName ? `<br><strong>Client:</strong> ${clientName}` : ''}</p><p>Log in to FinovaTrack to view and complete it.</p>`;

  const hasSmtp =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (hasSmtp) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    return;
  }

  console.log('\n--- Task reminder (no SMTP configured) ---');
  console.log(`To: ${to}`);
  console.log(`Task: ${title}`);
  console.log(`Due: ${dueStr}${clientLine}\n`);
};

const sendAppointmentReminderEmail = async (to, { type, clientName, dateTime, location, notes }) => {
  const when = new Date(dateTime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const subject = `FinovaTrack — ${type} with ${clientName} soon`;
  const text = `Reminder: ${type} with ${clientName} at ${when}.${location ? `\nLocation: ${location}` : ''}${notes ? `\nNotes: ${notes}` : ''}`;
  const html = `<p>Reminder: <strong>${type}</strong> with <strong>${clientName}</strong></p><p><strong>When:</strong> ${when}</p>${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}`;

  const hasSmtp =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (hasSmtp) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    return true;
  }

  console.log('\n--- Appointment reminder (no SMTP configured) ---');
  console.log(`To: ${to}`);
  console.log(`${subject}\n${text}\n`);
  return true;
};

const sendDashboardSummaryEmail = async (to, subject, text, html) => {
  const hasSmtp =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (hasSmtp) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html: html || text,
    });
    return;
  }

  console.log('\n--- Dashboard summary (no SMTP configured) ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(text);
  console.log('---\n');
};

const sendDailyDigestEmail = async (to, subject, text, html) => {
  const hasSmtp =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (hasSmtp) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    });
    return true;
  }

  console.log('\n--- Daily digest (no SMTP configured) ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(text);
  console.log('---\n');
  return true;
};

const sendBackupEmail = async (to, subject, text, csvContent, filename) => {
  const hasSmtp =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (hasSmtp) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
      attachments: [{
        filename,
        content: csvContent,
        contentType: 'text/csv',
      }],
    });
    return true;
  }

  console.log('\n--- Weekly backup (no SMTP configured) ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Attachment: ${filename} (${csvContent.length} bytes)`);
  console.log(text);
  console.log('---\n');
  return true;
};

module.exports = {
  sendPasswordResetEmail,
  sendTaskReminderEmail,
  sendAppointmentReminderEmail,
  sendDashboardSummaryEmail,
  sendDailyDigestEmail,
  sendBackupEmail,
};
