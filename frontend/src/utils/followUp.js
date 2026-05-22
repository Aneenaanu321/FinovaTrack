import { startOfDay, isBefore, isToday, format } from 'date-fns';

export const SNOOZE_PRESETS = [
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: '3days', label: '3 days' },
  { id: 'week', label: 'Next week' },
];

export function formatFollowUpDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isBefore(d, startOfDay(new Date()))) return `Overdue · ${format(d, 'MMM d')}`;
  return format(d, 'MMM d, yyyy');
}

export function followUpDateInputValue(date) {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
}

export function isFollowUpOverdue(date) {
  if (!date) return false;
  return isBefore(new Date(date), startOfDay(new Date()));
}
