import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { clientsApi } from '../services/api';

export default function AiSuggestCard({ clientId, onApplied }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const suggest = async () => {
    setLoading(true);
    try {
      const r = await clientsApi.suggestNextAction(clientId);
      setResult(r.data);
    } catch {
      toast.error('Could not get suggestion');
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!result?.suggestion) return;
    try {
      await clientsApi.update(clientId, { nextAction: result.suggestion });
      toast.success('Next action updated');
      onApplied?.();
    } catch {
      toast.error('Failed to apply');
    }
  };

  return (
    <div className="card bg-gradient-to-br from-primary-50 to-white dark:from-primary-950/40 dark:to-gray-900 border-primary-100 dark:border-primary-900">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">AI assistant</h2>
          <p className="text-xs text-gray-500 mt-0.5">Suggests next steps from deal stage, KYC, and notes</p>
        </div>
        <button type="button" className="btn-primary text-sm" onClick={suggest} disabled={loading}>
          {loading ? 'Thinking…' : 'Suggest'}
        </button>
      </div>
      {result && (
        <div className="space-y-3">
          <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{result.suggestion}</p>
          {result.suggestedDealStatus && (
            <p className="text-xs text-gray-500">Suggested deal stage: <span className="font-medium">{result.suggestedDealStatus}</span></p>
          )}
          <ul className="text-xs text-gray-500 list-disc list-inside space-y-0.5">
            {result.reasons?.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          <p className="text-xs text-gray-400">Source: {result.source === 'openai' ? 'OpenAI' : 'Smart rules'}</p>
          <button type="button" className="btn-secondary text-sm" onClick={apply}>Apply as next action</button>
        </div>
      )}
    </div>
  );
}
