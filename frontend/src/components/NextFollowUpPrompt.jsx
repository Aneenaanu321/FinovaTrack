import React, { useState } from 'react';
import { addDays, format } from 'date-fns';
import Modal from './Modal';
import { clientsApi } from '../services/api';
import toast from 'react-hot-toast';
import { followUpDateInputValue } from '../utils/followUp';

const QUICK_DATES = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
];

export default function NextFollowUpPrompt({
  open,
  onClose,
  clientId,
  clientName,
  defaultAction = '',
  onSaved,
}) {
  const [nextAction, setNextAction] = useState(defaultAction);
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      setNextAction(defaultAction || '');
      setNextFollowUpDate('');
    }
  }, [open, defaultAction]);

  const pickQuick = (days) => {
    setNextFollowUpDate(format(addDays(new Date(), days), 'yyyy-MM-dd'));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!nextFollowUpDate) {
      toast.error('Pick a follow-up date so this client stays on your radar');
      return;
    }
    setSaving(true);
    try {
      const r = await clientsApi.update(clientId, {
        nextAction: nextAction.trim() || undefined,
        nextFollowUpDate,
      });
      toast.success('Next follow-up scheduled');
      onSaved?.(r.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="When's the next follow-up?">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        You logged contact with <strong>{clientName}</strong>. Schedule the next step so they don't slip through the cracks.
      </p>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label">Next action</label>
          <input
            className="input"
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="e.g. Send proposal, call back"
          />
        </div>
        <div>
          <label className="label">Follow-up date *</label>
          <input
            type="date"
            className="input"
            value={nextFollowUpDate}
            onChange={(e) => setNextFollowUpDate(e.target.value)}
            min={followUpDateInputValue(new Date())}
            required
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {QUICK_DATES.map(({ label, days }) => (
              <button
                key={days}
                type="button"
                className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                onClick={() => pickQuick(days)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Skip for now
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Schedule follow-up'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
