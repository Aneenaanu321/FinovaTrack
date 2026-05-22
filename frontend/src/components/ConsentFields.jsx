import React from 'react';
import { CONSENT_TYPES, CONSENT_METHODS } from '../constants/compliance';

export default function ConsentFields({ consents, onChange }) {
  const setConsent = (key, field, value) => {
    onChange({
      ...consents,
      [key]: { ...consents[key], [field]: value },
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Record when and how the client gave consent. Required for compliance audits.
      </p>
      {CONSENT_TYPES.map(({ key, label, description }) => (
        <div key={key} className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!consents[key]?.granted}
              onChange={(e) => setConsent(key, 'granted', e.target.checked)}
              className="mt-1 rounded border-gray-300"
            />
            <span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">{description}</span>
            </span>
          </label>
          {consents[key]?.granted && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 ml-6">
              <div>
                <label className="label text-xs">Date</label>
                <input
                  type="date"
                  className="input text-sm"
                  value={consents[key]?.grantedAt || ''}
                  onChange={(e) => setConsent(key, 'grantedAt', e.target.value)}
                />
              </div>
              <div>
                <label className="label text-xs">Method</label>
                <select
                  className="input text-sm"
                  value={consents[key]?.method || ''}
                  onChange={(e) => setConsent(key, 'method', e.target.value)}
                >
                  {CONSENT_METHODS.map((m) => (
                    <option key={m || 'none'} value={m}>{m || '— Select —'}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label text-xs">Notes</label>
                <input
                  className="input text-sm"
                  value={consents[key]?.notes || ''}
                  onChange={(e) => setConsent(key, 'notes', e.target.value)}
                  placeholder="Reference, form ID, etc."
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function InteractionFlagFields({ flags, onChange }) {
  const set = (field, value) => onChange({ ...flags, [field]: value });

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">Track sensitive interactions for compliance review.</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!flags.callRecorded} onChange={(e) => set('callRecorded', e.target.checked)} className="rounded" />
        Call was recorded
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!flags.smsSent} onChange={(e) => set('smsSent', e.target.checked)} className="rounded" />
        SMS sent to client
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!flags.marketingContact} onChange={(e) => set('marketingContact', e.target.checked)} className="rounded" />
        Marketing contact made
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!flags.sensitiveDiscussed} onChange={(e) => set('sensitiveDiscussed', e.target.checked)} className="rounded" />
        Sensitive financial data discussed
      </label>
      {flags.callRecorded && (
        <div>
          <label className="label text-xs">Last recorded call date</label>
          <input type="date" className="input text-sm" value={flags.lastCallRecordedAt || ''} onChange={(e) => set('lastCallRecordedAt', e.target.value)} />
        </div>
      )}
      <div>
        <label className="label text-xs">Interaction notes</label>
        <textarea className="input text-sm" rows={2} value={flags.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="Optional compliance notes" />
      </div>
    </div>
  );
}
