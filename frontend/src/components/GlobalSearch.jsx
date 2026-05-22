import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { clientsApi, tasksApi, appointmentsApi } from '../services/api';

export default function GlobalSearch({ open, onClose }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ clients: [], tasks: [], appointments: [] });
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQ('');
      setResults({ clients: [], tasks: [], appointments: [] });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setResults({ clients: [], tasks: [], appointments: [] });
      return undefined;
    }
    const t = setTimeout(() => {
      setLoading(true);
      const search = q.trim();
      Promise.all([
        clientsApi.list({ search, limit: 5 }),
        tasksApi.list({ search, limit: 5 }),
        appointmentsApi.list({ search, limit: 5 }),
      ])
        .then(([cRes, tRes, aRes]) => {
          const clients = Array.isArray(cRes.data) ? cRes.data : cRes.data.clients || [];
          const tasks = Array.isArray(tRes.data) ? tRes.data : tRes.data.tasks || [];
          const appointments = Array.isArray(aRes.data) ? aRes.data : aRes.data.items || [];
          setResults({ clients, tasks, appointments });
        })
        .catch(() => setResults({ clients: [], tasks: [], appointments: [] }))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q, open]);

  if (!open) return null;

  const hasResults =
    results.clients.length + results.tasks.length + results.appointments.length > 0;

  const go = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-w-xl mx-auto mt-16 md:mt-24 px-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none text-base min-h-[44px]"
              placeholder="Search clients, tasks, appointments…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && onClose()}
            />
            <kbd className="hidden sm:inline text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Esc</kbd>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {q.trim().length < 2 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 px-3 py-6 text-center">Type at least 2 characters</p>
            ) : loading ? (
              <p className="text-sm text-gray-400 px-3 py-6 text-center">Searching…</p>
            ) : !hasResults ? (
              <p className="text-sm text-gray-400 px-3 py-6 text-center">No results found</p>
            ) : (
              <>
                {results.clients.length > 0 && (
                  <section className="mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase px-3 py-1">Clients</p>
                    {results.clients.map((c) => (
                      <button
                        key={c._id}
                        type="button"
                        className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => go(`/clients/${c._id}`)}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.dealStatus} · {c.kycStatus}</p>
                      </button>
                    ))}
                  </section>
                )}
                {results.tasks.length > 0 && (
                  <section className="mb-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase px-3 py-1">Tasks</p>
                    {results.tasks.map((t) => (
                      <button
                        key={t._id}
                        type="button"
                        className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => go('/tasks')}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.title}</p>
                        <p className="text-xs text-gray-500">{t.status}{t.client?.name ? ` · ${t.client.name}` : ''}</p>
                      </button>
                    ))}
                  </section>
                )}
                {results.appointments.length > 0 && (
                  <section>
                    <p className="text-xs font-semibold text-gray-400 uppercase px-3 py-1">Appointments</p>
                    {results.appointments.map((a) => (
                      <button
                        key={a._id}
                        type="button"
                        className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => go('/appointments')}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.client?.name}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(a.dateTime), 'MMM d, h:mm a')} · {a.type}
                        </p>
                      </button>
                    ))}
                  </section>
                )}
              </>
            )}
          </div>
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 flex justify-between">
            <span>
              <Link to="/clients" onClick={onClose} className="text-primary-600 hover:underline">Clients</Link>
              {' · '}
              <Link to="/tasks" onClick={onClose} className="text-primary-600 hover:underline">Tasks</Link>
            </span>
            <span>Ctrl+K to open</span>
          </div>
        </div>
      </div>
    </div>
  );
}
