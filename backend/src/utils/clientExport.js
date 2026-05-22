const Client = require('../models/Client');
const { escapeCsv } = require('./clientHelpers');

const FULL_EXPORT_HEADERS = [
  'id',
  'createdAt',
  'updatedAt',
  'name',
  'phone',
  'email',
  'productType',
  'dealValue',
  'expectedCommission',
  'leadSource',
  'dealStatus',
  'kycStatus',
  'kycId',
  'kycAddressProof',
  'kycIncome',
  'lastContactedAt',
  'nextFollowUpDate',
  'nextAction',
  'notes',
  'activityCount',
];

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

function clientToExportRow(c) {
  return {
    id: String(c._id),
    createdAt: formatDate(c.createdAt),
    updatedAt: formatDate(c.updatedAt),
    name: c.name || '',
    phone: c.phone || '',
    email: c.email || '',
    productType: c.productType || '',
    dealValue: c.dealValue ?? '',
    expectedCommission: c.expectedCommission ?? '',
    leadSource: c.leadSource || '',
    dealStatus: c.dealStatus || '',
    kycStatus: c.kycStatus || '',
    kycId: c.kycDocuments?.id ? 'yes' : 'no',
    kycAddressProof: c.kycDocuments?.addressProof ? 'yes' : 'no',
    kycIncome: c.kycDocuments?.income ? 'yes' : 'no',
    lastContactedAt: formatDate(c.lastContactedAt),
    nextFollowUpDate: formatDate(c.nextFollowUpDate),
    nextAction: c.nextAction || '',
    notes: c.notes || '',
    activityCount: Array.isArray(c.activities) ? c.activities.length : 0,
  };
}

async function buildClientsCsvForUser(userId, { includeDeleted = false } = {}) {
  const filter = { user: userId };
  if (!includeDeleted) filter.deletedAt = null;

  const clients = await Client.find(filter).sort({ name: 1 });
  const lines = [FULL_EXPORT_HEADERS.join(',')];
  for (const c of clients) {
    const row = clientToExportRow(c);
    lines.push(FULL_EXPORT_HEADERS.map((h) => escapeCsv(row[h])).join(','));
  }
  return { csv: lines.join('\n'), count: clients.length };
}

module.exports = {
  FULL_EXPORT_HEADERS,
  buildClientsCsvForUser,
  clientToExportRow,
};
