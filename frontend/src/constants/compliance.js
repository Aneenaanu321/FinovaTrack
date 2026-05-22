export const CONSENT_TYPES = [
  { key: 'dataProcessing', label: 'Data processing', description: 'Consent to store and process personal data for sales/KYC.' },
  { key: 'marketing', label: 'Marketing', description: 'Consent for promotional calls, SMS, or email.' },
  { key: 'callRecording', label: 'Call recording', description: 'Consent to record phone conversations.' },
];

export const CONSENT_METHODS = ['', 'Verbal', 'Written', 'Digital', 'In-branch', 'Other'];

export const emptyConsentEntry = () => ({
  granted: false,
  grantedAt: '',
  method: '',
  notes: '',
});

export const emptyConsents = () => ({
  dataProcessing: emptyConsentEntry(),
  marketing: emptyConsentEntry(),
  callRecording: emptyConsentEntry(),
});

export const emptyInteractionFlags = () => ({
  callRecorded: false,
  lastCallRecordedAt: '',
  smsSent: false,
  marketingContact: false,
  sensitiveDiscussed: false,
  notes: '',
});

export function consentsToForm(consents = {}) {
  const out = emptyConsents();
  for (const { key } of CONSENT_TYPES) {
    const c = consents[key] || {};
    out[key] = {
      granted: !!c.granted,
      grantedAt: c.grantedAt ? c.grantedAt.slice(0, 10) : '',
      method: c.method || '',
      notes: c.notes || '',
    };
  }
  return out;
}

export function interactionFlagsToForm(flags = {}) {
  return {
    callRecorded: !!flags.callRecorded,
    lastCallRecordedAt: flags.lastCallRecordedAt ? flags.lastCallRecordedAt.slice(0, 10) : '',
    smsSent: !!flags.smsSent,
    marketingContact: !!flags.marketingContact,
    sensitiveDiscussed: !!flags.sensitiveDiscussed,
    notes: flags.notes || '',
  };
}

export function consentsToPayload(consents) {
  const payload = {};
  for (const { key } of CONSENT_TYPES) {
    const c = consents[key];
    if (!c) continue;
    payload[key] = {
      granted: !!c.granted,
      method: c.method || '',
      notes: c.notes?.trim() || '',
      grantedAt: c.granted && c.grantedAt ? c.grantedAt : undefined,
    };
  }
  return payload;
}

export function interactionFlagsToPayload(flags) {
  return {
    callRecorded: !!flags.callRecorded,
    lastCallRecordedAt: flags.lastCallRecordedAt || undefined,
    smsSent: !!flags.smsSent,
    marketingContact: !!flags.marketingContact,
    sensitiveDiscussed: !!flags.sensitiveDiscussed,
    notes: flags.notes?.trim() || '',
  };
}
