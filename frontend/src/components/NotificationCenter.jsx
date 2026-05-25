import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import useNotifications from '../hooks/useNotifications';

const TYPE_STYLE = {
  overdue_task: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  today_task: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  today_appointment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  upcoming_appointment: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  stale_lead: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const { summary, notifications, loading, loadFull, dismiss, dismissAll } = useNotifications(true);

  useEffect(() => {
    if (open) loadFull();
  }, [open, loadFull]);

  useEffect(() => {
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const badge = summary.badgeCount > 0 ? summary.badgeCount : summary.unreadCount;

  const go = (n) => {
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2.5 min-h-[44px] min-w-[44px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center justify-center"
        title="Notifications"
        aria-label={`Notifications${badge ? `, ${badge} overdue` : ''}`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(100vw-2rem,22rem)] bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
            {summary.overdueCount > 0 && (
              <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">{summary.overdueCount} overdue</span>
            )}
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">You&apos;re all caught up</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
              {notifications.map((n) => (
                <li
                  key={n.key}
                  className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${n.read ? 'opacity-60' : ''}`}
                >
                  <button type="button" className="w-full text-left" onClick={() => go(n)}>
                    <div className="flex items-start gap-2">
                      <span className={`badge flex-shrink-0 ${TYPE_STYLE[n.type] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                        {n.title}
                      </span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1" />}
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">{n.body}</p>
                    {n.createdAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    )}
                  </button>
                  {!n.read && (
                    <button
                      type="button"
                      className="text-xs text-primary-600 hover:underline mt-1"
                      onClick={() => dismiss(n.key)}
                    >
                      Dismiss
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex gap-2 justify-between bg-gray-50/80 dark:bg-gray-800/80">
            {notifications.some((n) => !n.read) && (
              <button type="button" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100" onClick={dismissAll}>
                Mark all read
              </button>
            )}
            <Link to="/tasks" className="text-xs text-primary-600 hover:underline ml-auto" onClick={() => setOpen(false)}>
              View tasks
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
