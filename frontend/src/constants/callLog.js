export const CALL_OUTCOMES = [
  {
    id: 'reached',
    label: 'Reached',
    shortLabel: 'Reached',
    color: 'bg-green-600 hover:bg-green-700 text-white',
    defaultAction: 'Follow up on conversation',
    defaultFollowUpDays: 3,
  },
  {
    id: 'no_answer',
    label: 'No answer',
    shortLabel: 'No answer',
    color: 'bg-gray-600 hover:bg-gray-700 text-white',
    defaultAction: 'Try calling again',
    defaultFollowUpDays: 1,
  },
  {
    id: 'callback',
    label: 'Callback',
    shortLabel: 'Callback',
    color: 'bg-amber-600 hover:bg-amber-700 text-white',
    defaultAction: 'Return their callback',
    defaultFollowUpDays: 1,
  },
];

export const CALL_OUTCOME_IDS = CALL_OUTCOMES.map((o) => o.id);

export function outcomeMeta(id) {
  return CALL_OUTCOMES.find((o) => o.id === id);
}
