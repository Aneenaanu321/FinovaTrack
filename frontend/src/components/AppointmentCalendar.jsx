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
          <h2 className="font-semibold text-gray-900">{format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}</h2>
          <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => onCursorChange(addWeeks(cursor, 1))}>→</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const items = (byDay[key] || []).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
            return (
              <div key={key} className={`min-h-[120px] rounded-lg border p-2 ${isSameDay(day, new Date()) ? 'border-primary-300 bg-primary-50/40' : 'border-gray-100 bg-gray-50/50'}`}>
                <p className={`text-xs font-semibold mb-2 ${isSameDay(day, new Date()) ? 'text-primary-700' : 'text-gray-500'}`}>{format(day, 'EEE d')}</p>
                <div className="space-y-1">
                  {items.length === 0 ? <p className="text-xs text-gray-300">—</p> : items.map((a) => (
                    <button
                      key={a._id}
                      type="button"
                      onClick={() => onSelectAppointment(a)}
                      className="w-full text-left text-xs p-1.5 rounded bg-white border border-gray-100 hover:border-primary-200 hover:shadow-sm"
                    >
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${TYPE_DOT[a.type] || 'bg-gray-400'}`} />
                      <span className="font-medium text-gray-800">{format(new Date(a.dateTime), 'h:mm a')}</span>
                      <span className="block truncate text-gray-500">{a.client?.name}</span>
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
        <h2 className="font-semibold text-gray-900">{format(cursor, 'MMMM yyyy')}</h2>
        <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={() => onCursorChange(addMonths(cursor, 1))}>→</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 mb-1">
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
                isSameDay(day, new Date()) ? 'border-primary-400 bg-primary-50/50' : 'border-transparent hover:bg-gray-50'
              } ${!inMonth ? 'opacity-40' : ''}`}
            >
              <span className={`text-xs font-medium ${isSameDay(day, new Date()) ? 'text-primary-700' : 'text-gray-600'}`}>{format(day, 'd')}</span>
              {items.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {items.slice(0, 2).map((a) => (
                    <div key={a._id} className="text-[10px] truncate px-1 py-0.5 rounded bg-white border border-gray-100 text-gray-700">
                      {format(new Date(a.dateTime), 'h:mm')} {a.client?.name?.split(' ')[0]}
                    </div>
                  ))}
                  {items.length > 2 && <p className="text-[10px] text-primary-600">+{items.length - 2} more</p>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
