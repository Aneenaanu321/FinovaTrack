const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

function clientIp(req) {
  return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;
}

function serialize(val) {
  if (val == null) return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object' && val._id) return String(val._id);
  if (typeof val === 'object') return JSON.parse(JSON.stringify(val));
  return val;
}

function diffFields(before, after, fields) {
  const changes = [];
  for (const field of fields) {
    const from = serialize(before?.[field]);
    const to = serialize(after?.[field]);
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push({ field, from, to });
    }
  }
  return changes;
}

async function recordAudit(req, {
  action,
  entityType,
  entityId,
  entityLabel,
  changes = [],
}) {
  if (!req?.user?.id) return;
  try {
    let userName = req.user.name || '';
    let userEmail = req.user.email || '';
    if (!userName) {
      const u = await User.findById(req.user.id).select('name email').lean();
      userName = u?.name || '';
      userEmail = u?.email || '';
    }
    await AuditLog.create({
      user: req.user.id,
      userName,
      userEmail,
      action,
      entityType,
      entityId,
      entityLabel,
      changes,
      ip: clientIp(req),
      userAgent: (req.headers['user-agent'] || '').slice(0, 500),
    });
  } catch (err) {
    console.error('[audit] failed to write log:', err.message);
  }
}

module.exports = { recordAudit, diffFields, clientIp };
