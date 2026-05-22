export const PRODUCT_TYPES = ['', 'Savings', 'Loan', 'Credit Card', 'Insurance', 'Investment', 'Other'];
export const LEAD_SOURCES = ['', 'Referral', 'Walk-in', 'Campaign', 'Website', 'Other'];
export const DEAL_STEPS = ['New', 'Contacted', 'Interested', 'Closed'];
export const KYC_STEPS = ['Not Started', 'In Progress', 'Completed'];
export const KYC_DOCS = [
  { key: 'id', label: 'Government ID' },
  { key: 'addressProof', label: 'Address proof' },
  { key: 'income', label: 'Income verification' },
];

export const DEAL_COLOR = {
  New: 'bg-gray-100 text-gray-600',
  Contacted: 'bg-blue-100 text-blue-700',
  Interested: 'bg-purple-100 text-purple-700',
  Closed: 'bg-green-100 text-green-700',
};

export const KYC_COLOR = {
  'Not Started': 'bg-gray-100 text-gray-600',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  Completed: 'bg-green-100 text-green-700',
};

export const emptyClientForm = {
  name: '',
  phone: '',
  email: '',
  notes: '',
  productType: '',
  dealValue: '',
  expectedCommission: '',
  leadSource: '',
  lastContactedAt: '',
  kycStatus: 'Not Started',
  kycDocuments: { id: false, addressProof: false, income: false },
  dealStatus: 'New',
  nextAction: '',
};

export function clientToForm(c) {
  return {
    name: c.name,
    phone: c.phone || '',
    email: c.email || '',
    notes: c.notes || '',
    productType: c.productType || '',
    dealValue: c.dealValue ?? '',
    expectedCommission: c.expectedCommission ?? '',
    leadSource: c.leadSource || '',
    lastContactedAt: c.lastContactedAt ? c.lastContactedAt.slice(0, 10) : '',
    kycStatus: c.kycStatus,
    kycDocuments: { id: false, addressProof: false, income: false, ...c.kycDocuments },
    dealStatus: c.dealStatus,
    nextAction: c.nextAction || '',
  };
}

export function isStaleClient(c, staleDays = 14) {
  if (c.dealStatus === 'Closed') return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - staleDays);
  const ref = c.lastContactedAt ? new Date(c.lastContactedAt) : new Date(c.createdAt);
  return ref < cutoff;
}
