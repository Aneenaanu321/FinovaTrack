import React, { useMemo } from 'react';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addWeeks,
  subWeeks,
  startOfWeek as sow,
  endOfWeek as eow,
} from 'date-fns';

const TYPE_DOT = { 'In-Person': 'bg-purple-500', 'Call': 'bg-blue-500', 'Video Call': 'bg-teal-500' };

const dayCellToday = 'border-primary-300 dark:border-primary-600 bg-primary-50/40 dark:bg-primary-900/30';
const dayCellDefault = 'border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50';
const apptChip = 'w-full text-left text-xs p-1.5 rounded bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-600 hover:shadow-sm';

export default function AppointmentCalendar({
  appointments,
  view,
  cursor,
  onCursorChange,
  onSelectAppointment,
}) {
  const byDay = useMemo(() => {
    const map = {};
    for (const a of appointments) {
      const key = format(new Date(a.dateTime), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return map;
  }, [appointments]);

  if (view === 'week') {
    const weekStart = sow(cursor, { weekStartsOn: 1 });
    const weekEnd = eow(cursor, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => onCursorChange(subWeeks(cursor, 1))}>←</button>
          <h2 className="heading-sm">{format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}</h2>
          <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => onCursorChange(addWeeks(cursor, 1))}>→</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const items = (byDay[key] || []).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
            return (
              <div key={key} className={`min-h-[120px] rounded-lg border p-2 ${isSameDay(day, new Date()) ? dayCellToday : dayCellDefault}`}>
                <p className={`text-xs font-semibold mb-2 ${isSameDay(day, new Date()) ? 'text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'}`}>{format(day, 'EEE d')}</p>
                <div className="space-y-1">
                  {items.length === 0 ? <p className="text-xs text-gray-300 dark:text-gray-600">—</p> : items.map((a) => (
                    <button
                      key={a._id}
                      type="button"
                      onClick={() => onSelectAppointment(a)}
                      className={apptChip}
                    >
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${TYPE_DOT[a.type] || 'bg-gray-400'}`} />
                      <span className="font-medium text-gray-800 dark:text-gray-200">{format(new Date(a.dateTime), 'h:mm a')}</span>
                      <span className="block truncate text-gray-500 dark:text-gray-400">{a.client?.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => onCursorChange(subMonths(cursor, 1))}>←</button>
        <h2 className="heading-sm">{format(cursor, 'MMMM yyyy')}</h2>
        <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => onCursorChange(addMonths(cursor, 1))}>→</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const items = byDay[key] || [];
          const inMonth = isSameMonth(day, cursor);
          return (
            <button
              key={key}
              type="button"
              onClick={() => items[0] && onSelectAppointment(items[0])}
              className={`min-h-[72px] p-1 rounded-lg text-left border transition-colors ${
                isSameDay(day, new Date()) ? 'border-primary-400 dark:border-primary-600 bg-primary-50/50 dark:bg-primary-900/20' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
              } ${!inMonth ? 'opacity-40' : ''}`}
            >
              <span className={`text-xs font-medium ${isSameDay(day, new Date()) ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400'}`}>{format(day, 'd')}</span>
              {items.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {items.slice(0, 2).map((a) => (
                    <div key={a._id} className="text-[10px] truncate px-1 py-0.5 rounded bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                      {format(new Date(a.dateTime), 'h:mm')} {a.client?.name?.split(' ')[0]}
                    </div>
                  ))}
                  {items.length > 2 && <p className="text-[10px] text-primary-600 dark:text-primary-400">+{items.length - 2} more</p>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
