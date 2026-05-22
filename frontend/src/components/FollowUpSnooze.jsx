import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { clientsApi } from '../services/api';
import { SNOOZE_PRESETS } from '../utils/followUp';

export default function FollowUpSnooze({ clientId, onDone, compact }) {
  const [loading, setLoading] = useState(null);

  const snooze = async (preset) => {
    setLoading(preset);
    try {
      const r = await clientsApi.snooze(clientId, { preset });
      toast.success('Follow-up rescheduled');
      onDone?.(r.data);
    } catch {
      toast.error('Could not snooze');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'mt-2'}`}>
      {SNOOZE_PRESETS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          disabled={!!loading}
          onClick={() => snooze(id)}
          className="text-xs px-2.5 py-1.5 min-h-[36px] rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-900/30 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 disabled:opacity-50"
        >
          {loading === id ? '…' : label}
        </button>
      ))}
    </div>
  );
}
