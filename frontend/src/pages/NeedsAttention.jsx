import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { clientsApi, tasksApi } from '../services/api';
import { ListSkeleton } from '../components/ui/Skeleton';
import FollowUpSnooze from '../components/FollowUpSnooze';
import { formatFollowUpDate, isFollowUpOverdue } from '../utils/followUp';
import { isStaleClient } from '../constants/clients';

function Section({ title, count, description, children }) {
  if (!count) return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          {title}
          <span className="text-sm font-normal text-gray-500">({count})</span>
        </h2>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ClientRow({ client, reason, onRefresh }) {
  const overdue = client.nextFollowUpDate && isFollowUpOverdue(client.nextFollowUpDate);
  return (
    <div className="card p-4 flex flex-col sm:flex-row sm:items-start gap-3">
      <div className="flex-1 min-w-0">
        <Link to={`/clients/${client._id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600">
          {client.name}
        </Link>
        {client.phone && <p className="text-sm text-gray-500">{client.phone}</p>}
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{reason}</p>
        {client.nextAction && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{client.nextAction}</p>}
        {client.nextFollowUpDate && (
          <p className={`text-xs mt-1 ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            Follow-up: {formatFollowUpDate(client.nextFollowUpDate)}
          </p>
        )}
        {isStaleClient(client) && (
          <span className="badge bg-amber-100 text-amber-800 mt-2 inline-block">Stale lead</span>
        )}
      </div>
      <FollowUpSnooze clientId={client._id} onDone={onRefresh} compact />
    </div>
  );
}

export default function NeedsAttention() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    clientsApi
      .needsAttention()
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const completeTask = async (id) => {
    try {
      await tasksApi.complete(id);
      toast.success('Task completed');
      load();
    } catch {
      toast.error('Failed');
    }
  };

  if (loading) return <div className="max-w-3xl"><ListSkeleton rows={6} /></div>;

  const {
    overdueTasks = [],
    staleClients = [],
    dueFollowUps = [],
    unscheduledFollowUps = [],
    staleDays,
    counts,
  } = data || {};

  const allClear = counts?.total === 0;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Needs attention today</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Overdue tasks, follow-ups due, stale leads ({staleDays}+ days without contact), and actions missing a date.
        </p>
      </div>

      {allClear ? (
        <div className="card text-center py-16">
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">You're all caught up</p>
          <p className="text-sm text-gray-500 mt-2">Nothing needs your attention right now.</p>
          <Link to="/clients" className="btn-primary inline-flex mt-6">View clients</Link>
        </div>
      ) : (
        <>
          <Section
            title="Overdue tasks"
            count={overdueTasks.length}
            description="Pending tasks past their due date."
          >
            <div className="space-y-2">
              {overdueTasks.map((task) => (
                <div key={task._id} className="card p-4 flex items-start gap-3 border-red-100 dark:border-red-900/40 bg-red-50/30 dark:bg-red-900/10">
                  <button
                    type="button"
                    onClick={() => completeTask(task._id)}
                    className="mt-1 w-5 h-5 rounded-full border-2 border-red-300 hover:border-green-500 flex-shrink-0"
                    aria-label="Complete"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{task.title}</p>
                    <p className="text-xs text-red-600">Due {format(new Date(task.dueDate), 'MMM d, yyyy')}</p>
                    {task.client && (
                      <Link to={`/clients/${task.client._id}`} className="text-xs text-primary-600 hover:underline">
                        {task.client.name}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Follow-ups due"
            count={dueFollowUps.length}
            description="Clients with a scheduled follow-up today or earlier."
          >
            <div className="space-y-2">
              {dueFollowUps.map((c) => (
                <ClientRow
                  key={c._id}
                  client={c}
                  reason={isFollowUpOverdue(c.nextFollowUpDate) ? 'Follow-up overdue' : 'Follow-up due today'}
                  onRefresh={load}
                />
              ))}
            </div>
          </Section>

          <Section
            title="Stale leads"
            count={staleClients.length}
            description={`No contact in ${staleDays} or more days (open deals only).`}
          >
            <div className="space-y-2">
              {staleClients.map((c) => (
                <ClientRow
                  key={c._id}
                  client={c}
                  reason={`Last contact: ${c.lastContactedAt ? format(new Date(c.lastContactedAt), 'MMM d, yyyy') : 'never'}`}
                  onRefresh={load}
                />
              ))}
            </div>
          </Section>

          <Section
            title="Action without a date"
            count={unscheduledFollowUps.length}
            description="Has a next action written but no follow-up date — easy to forget."
          >
            <div className="space-y-2">
              {unscheduledFollowUps.map((c) => (
                <ClientRow
                  key={c._id}
                  client={c}
                  reason="Next action set — schedule a follow-up date"
                  onRefresh={load}
                />
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
