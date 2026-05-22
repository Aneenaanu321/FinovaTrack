async function sendAppointmentReminderSms(phone, message) {
  if (!phone) {
    console.log(`[sms reminder] No phone configured. Message: ${message}`);
    return false;
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;

  if (!sid || !token || !from) {
    console.log(`[sms reminder] To: ${phone} | ${message}`);
    return true;
  }

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const body = new URLSearchParams({ To: phone, From: from, Body: message });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[sms reminder]', err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[sms reminder]', err.message);
    return false;
  }
}

module.exports = { sendAppointmentReminderSms };
