const Client = require('../models/Client');

const CLIENT_FIELDS = [
  'name', 'phone', 'email', 'notes', 'productType', 'dealValue', 'expectedCommission',
  'leadSource', 'lastContactedAt', 'nextFollowUpDate', 'kycStatus', 'kycDocuments', 'dealStatus', 'nextAction',
];

function pickClientData(body) {
  const data = {};
  for (const key of CLIENT_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (data.email) data.email = data.email.toLowerCase().trim();
  if (data.phone) data.phone = String(data.phone).trim();
  if (data.dealValue !== undefined && data.dealValue !== '') data.dealValue = Number(data.dealValue);
  if (data.expectedCommission !== undefined && data.expectedCommission !== '') {
    data.expectedCommission = Number(data.expectedCommission);
  }
  if (data.lastContactedAt) data.lastContactedAt = new Date(data.lastContactedAt);
  if (data.nextFollowUpDate === '' || data.nextFollowUpDate === null) {
    data.nextFollowUpDate = null;
  } else if (data.nextFollowUpDate !== undefined) {
    data.nextFollowUpDate = new Date(data.nextFollowUpDate);
  }
  return data;
}

function normalizeEmail(email) {
  return email ? String(email).toLowerCase().trim() : '';
}

function normalizePhone(phone) {
  return phone ? String(phone).trim() : '';
}

async function findDuplicates(userId, { email, phone }, excludeId) {
  const normEmail = normalizeEmail(email);
  const normPhone = normalizePhone(phone);
  const or = [];
  if (normEmail) or.push({ email: normEmail });
  if (normPhone) or.push({ phone: normPhone });
  if (!or.length) return [];
  const filter = { user: userId, deletedAt: null, $or: or };
  if (excludeId) filter._id = { $ne: excludeId };
  const matches = await Client.find(filter).select('name email phone dealStatus');
  return matches.map((c) => {
    const matchedOn = [];
    if (normEmail && normalizeEmail(c.email) === normEmail) matchedOn.push('email');
    if (normPhone && normalizePhone(c.phone) === normPhone) matchedOn.push('phone');
    return {
      _id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      dealStatus: c.dealStatus,
      matchedOn,
    };
  });
}

function logStatusChange(client, field, from, to) {
  if (from === to) return;
  client.activities.push({
    type: 'status_change',
    title: `${field} updated`,
    body: `${from} → ${to}`,
    meta: { field, from, to },
  });
}

function escapeCsv(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { result.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

const HEADER_MAP = {
  name: 'name',
  phone: 'phone',
  email: 'email',
  notes: 'notes',
  producttype: 'productType',
  dealvalue: 'dealValue',
  expectedcommission: 'expectedCommission',
  leadsource: 'leadSource',
  kycstatus: 'kycStatus',
  dealstatus: 'dealStatus',
  nextaction: 'nextAction',
  nextfollowupdate: 'nextFollowUpDate',
  nextfollowup: 'nextFollowUpDate',
  lastcontacted: 'lastContactedAt',
  lastcontactedat: 'lastContactedAt',
};

function mapImportRow(row) {
  const out = { name: '' };
  for (const [key, val] of Object.entries(row)) {
    const field = HEADER_MAP[key.replace(/\s+/g, '').toLowerCase()] || key;
    if (CLIENT_FIELDS.includes(field) || field === 'name') out[field] = val;
  }
  if (!out.name && row.name) out.name = row.name;
  return out;
}

module.exports = {
  CLIENT_FIELDS,
  pickClientData,
  findDuplicates,
  normalizeEmail,
  normalizePhone,
  logStatusChange,
  escapeCsv,
  parseCsv,
  mapImportRow,
};
