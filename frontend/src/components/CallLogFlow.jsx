import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { clientsApi } from '../services/api';
import { CALL_OUTCOMES, outcomeMeta } from '../constants/callLog';
import NextFollowUpPrompt from './NextFollowUpPrompt';

/**
 * Two-tap call logging: tap "Called" → tap outcome → follow-up prompt.
 * Mobile-first: large touch targets (min 48px).
 */
export default function CallLogFlow({
  clientId,
  clientName,
  onUpdated,
  className = '',
  compact = false,
}) {
  const [step, setStep] = useState('idle');
  const [logging, setLogging] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [lastOutcome, setLastOutcome] = useState(null);

  const reset = () => setStep('idle');

  const submitOutcome = async (outcomeId) => {
    const meta = outcomeMeta(outcomeId);
    if (!meta) return;
    setLogging(true);
    try {
      const r = await clientsApi.logContact(clientId, { outcome: outcomeId });
      setLastOutcome(outcomeId);
      onUpdated?.(r.data);
      setStep('idle');
      toast.success('Call logged');
      setFollowUpOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log call');
    } finally {
      setLogging(false);
    }
  };

  const outcomeMetaForPrompt = lastOutcome ? outcomeMeta(lastOutcome) : null;

  if (step === 'outcome') {
    return (
      <>
        <div
          className={`space-y-2 ${className}`}
          role="group"
          aria-label="Call outcome"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
            How did it go?
          </p>
          <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
            {CALL_OUTCOMES.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={logging}
                onClick={() => submitOutcome(o.id)}
                className={`min-h-[48px] px-3 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${o.color}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={reset}
            disabled={logging}
            className="w-full min-h-[44px] text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            Cancel
          </button>
        </div>
        <NextFollowUpPrompt
          open={followUpOpen}
          onClose={() => setFollowUpOpen(false)}
          clientId={clientId}
          clientName={clientName}
          defaultAction={outcomeMetaForPrompt?.defaultAction}
          defaultFollowUpDays={outcomeMetaForPrompt?.defaultFollowUpDays}
          onSaved={onUpdated}
        />
      </>
    );
  }

  return (
    <>
      <div
        className={className}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setStep('outcome')}
          className={`w-full min-h-[48px] rounded-xl font-semibold text-sm transition-colors ${
            compact
              ? 'bg-primary-600 hover:bg-primary-700 text-white'
              : 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm'
          }`}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Called
          </span>
        </button>
      </div>
      <NextFollowUpPrompt
        open={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        clientId={clientId}
        clientName={clientName}
        defaultAction={outcomeMetaForPrompt?.defaultAction}
        defaultFollowUpDays={outcomeMetaForPrompt?.defaultFollowUpDays}
        onSaved={onUpdated}
      />
    </>
  );
}
