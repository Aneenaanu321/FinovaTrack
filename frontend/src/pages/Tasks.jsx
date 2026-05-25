import React, { useEffect, useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import toast from 'react-hot-toast';
import { tasksApi, clientsApi, parseTaskList } from '../services/api';
import { useConfirm } from '../context/ConfirmContext';
import Modal from '../components/Modal';
import FormField from '../components/ui/FormField';
import EmptyState from '../components/ui/EmptyState';
import { ListSkeleton } from '../components/ui/Skeleton';
import { validateTaskForm } from '../utils/validation';
import useTaskBrowserReminders, { requestNotificationPermission } from '../hooks/useTaskBrowserReminders';

const PRIORITY_COLOR = { High: 'bg-red-100 text-red-700', Medium: 'bg-yellow-100 text-yellow-700', Low: 'bg-green-100 text-green-700' };
const PAGE_SIZE = 10;

const empty = {
  title: '',
  description: '',
  dueDate: '',
  priority: 'Medium',
  status: 'Pending',
  client: '',
  recurringFrequency: '',
  emailReminderEnabled: false,
  emailReminderHoursBefore: 24,
  browserReminderEnabled: false,
};

export default function Tasks() {
  const confirmDialog = useConfirm();
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    clientId: '',
    dueFrom: '',
    dueTo: '',
    sortBy: 'dueDate',
    sortDir: 'asc',
    page: 1,
  });
  const [selected, setSelected] = useState(new Set());
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  useTaskBrowserReminders(tasks);

  const load = () => {
    setLoading(true);
    const params = {
      ...filters,
      page: filters.page,
      limit: PAGE_SIZE,
      clientId: filters.clientId || undefined,
      dueFrom: filters.dueFrom || undefined,
      dueTo: filters.dueTo || undefined,
      status: filters.status || undefined,
      priority: filters.priority || undefined,
    };
    Promise.all([
      tasksApi.list(params),
      clients.length === 0 ? clientsApi.list() : Promise.resolve({ data: clients }),
      templates.length === 0 ? tasksApi.templates() : Promise.resolve({ data: templates }),
    ])
      .then(([t, c, tpl]) => {
        const parsed = parseTaskList(t.data);
        setTasks(parsed.tasks);
        setTotal(parsed.total);
        setPages(parsed.pages);
        setClients(c.data);
        if (tpl.data) setTemplates(tpl.data);
        setSelected(new Set());
      })
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters]);

  const openAdd = () => { setForm(empty); setErrors({}); setEditing(null); setModal(true); };
  const openEdit = (t) => {
    setForm({
      title: t.title,
      description: t.description || '',
      priority: t.priority,
      status: t.status,
      client: t.client?._id || '',
      dueDate: t.dueDate ? format(new Date(t.dueDate), "yyyy-MM-dd'T'HH:mm") : '',
      recurringFrequency: t.recurringFrequency || '',
      emailReminderEnabled: !!t.emailReminderEnabled,
      emailReminderHoursBefore: t.emailReminderHoursBefore ?? 24,
      browserReminderEnabled: !!t.browserReminderEnabled,
    });
    setErrors({});
    setEditing(t._id);
    setModal(true);
  };

  const applyTemplate = (tpl) => {
    setForm((f) => ({
      ...f,
      title: tpl.title,
      description: tpl.description || '',
      priority: tpl.priority || 'Medium',
    }));
  };

  const enableBrowserReminders = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') toast.success('Browser reminders enabled');
    else if (perm === 'denied') toast.error('Notifications blocked in browser settings');
    else if (perm === 'unsupported') toast.error('Browser notifications not supported');
  };

  const submit = async (e) => {
    e.preventDefault();
    const validation = validateTaskForm(form);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        client: form.client || null,
        recurringFrequency: form.recurringFrequency || null,
        emailReminderEnabled: form.emailReminderEnabled,
        emailReminderHoursBefore: Number(form.emailReminderHoursBefore) || 24,
        browserReminderEnabled: form.browserReminderEnabled,
      };
      if (editing) {
        await tasksApi.update(editing, payload);
        toast.success('Task updated');
      } else {
        await tasksApi.create(payload);
        toast.success('Task created');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const complete = async (id) => {
    try {
      await tasksApi.complete(id);
      toast.success('Task completed!');
      load();
    } catch {
      toast.error('Failed');
    }
  };

  const remove = async (id) => {
    const ok = await confirmDialog({
      title: 'Delete task?',
      message: 'This task will be permanently removed.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await tasksApi.delete(id);
      toast.success('Task deleted');
      load();
    } catch {
      toast.error('Failed');
    }
  };

  const bulkComplete = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      const res = await tasksApi.bulkComplete(ids);
      toast.success(`${res.data.completed} task(s) completed`);
      load();
    } catch {
      toast.error('Bulk complete failed');
    }
  };

  const bulkDelete = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    const ok = await confirmDialog({
      title: `Delete ${ids.length} task(s)?`,
      message: 'Selected tasks will be permanently removed.',
      confirmLabel: 'Delete all',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await tasksApi.bulkDelete(ids);
      toast.success(`${res.data.deleted} task(s) deleted`);
      load();
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (list) => {
    if (list.every((t) => selected.has(t._id))) {
      setSelected((prev) => {
        const next = new Set(prev);
        list.forEach((t) => next.delete(t._id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        list.forEach((t) => next.add(t._id));
        return next;
      });
    }
  };

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    if (errors[name]) setErrors({ ...errors, [name]: undefined });
  };

  const pending = tasks.filter((t) => t.status === 'Pending');
  const completed = tasks.filter((t) => t.status === 'Completed');
  const hasSelection = selected.size > 0;

  const renderTask = (task, showComplete) => {
    const overdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status === 'Pending';
    const isSelected = selected.has(task._id);
    return (
      <div key={task._id} className={`card p-4 flex items-start gap-3 ${overdue ? 'border-red-100 bg-red-50/30' : ''} ${isSelected ? 'ring-2 ring-primary-200' : ''}`}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelect(task._id)}
          className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-600"
          aria-label={`Select ${task.title}`}
        />
        {showComplete ? (
          <button onClick={() => complete(task._id)} className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 flex-shrink-0 transition-colors" aria-label="Complete task" />
        ) : (
          <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`font-medium ${showComplete ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 line-through'}`}>{task.title}</p>
              {task.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{task.description}</p>}
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 flex-wrap">
                {task.dueDate && (
                  <span className={overdue ? 'text-red-500 font-medium' : ''}>
                    Due {format(new Date(task.dueDate), 'MMM d, h:mm a')}
                    {overdue && ' (Overdue)'}
                  </span>
                )}
                {task.client && <span>Client: {task.client.name}</span>}
                {task.recurringFrequency && (
                  <span className="badge bg-indigo-50 text-indigo-700 capitalize">{task.recurringFrequency}</span>
                )}
                {task.emailReminderEnabled && <span className="badge bg-blue-50 text-blue-600">Email reminder</span>}
                {task.browserReminderEnabled && <span className="badge bg-violet-50 text-violet-600">Browser reminder</span>}
              </div>
              {!showComplete && task.completedAt && (
                <p className="text-xs text-gray-400 mt-0.5">Completed {format(new Date(task.completedAt), 'MMM d')}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className={`badge ${PRIORITY_COLOR[task.priority]}`}>{task.priority}</span>
              {showComplete && (
                <button onClick={() => openEdit(task)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 dark:text-gray-500" aria-label="Edit">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
              )}
              <button onClick={() => remove(task._id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500" aria-label="Delete">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
        <div className="flex flex-wrap gap-2">
          {notifPermission !== 'granted' && (
            <button type="button" className="btn-secondary text-sm" onClick={enableBrowserReminders}>
              Enable browser reminders
            </button>
          )}
          <button className="btn-primary" onClick={openAdd}>+ Add Task</button>
        </div>
      </div>

      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <select className="input" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">All Status</option>
          <option>Pending</option>
          <option>Completed</option>
        </select>
        <select className="input" value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)}>
          <option value="">All Priority</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <select className="input" value={filters.clientId} onChange={(e) => setFilter('clientId', e.target.value)}>
          <option value="">All Clients</option>
          {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <input type="date" className="input" value={filters.dueFrom} onChange={(e) => setFilter('dueFrom', e.target.value)} title="Due from" />
        <input type="date" className="input" value={filters.dueTo} onChange={(e) => setFilter('dueTo', e.target.value)} title="Due to" />
        <select className="input" value={`${filters.sortBy}-${filters.sortDir}`} onChange={(e) => {
          const [sortBy, sortDir] = e.target.value.split('-');
          setFilters((f) => ({ ...f, sortBy, sortDir, page: 1 }));
        }}>
          <option value="dueDate-asc">Due date (earliest)</option>
          <option value="dueDate-desc">Due date (latest)</option>
          <option value="priority-asc">Priority (high first)</option>
          <option value="priority-desc">Priority (low first)</option>
          <option value="title-asc">Title A–Z</option>
          <option value="title-desc">Title Z–A</option>
          <option value="createdAt-desc">Newest first</option>
          <option value="status-asc">Status</option>
        </select>
      </div>

      {hasSelection && (
        <div className="card p-3 flex flex-wrap items-center gap-3 bg-primary-50/50 border-primary-100">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selected.size} selected</span>
          <button type="button" className="btn-primary text-sm py-1.5" onClick={bulkComplete}>Complete selected</button>
          <button type="button" className="btn-secondary text-sm py-1.5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/30" onClick={bulkDelete}>Delete selected</button>
          <button type="button" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-auto" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pending ({pending.length})</h2>
                <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={pending.every((t) => selected.has(t._id))} onChange={() => toggleSelectAll(pending)} />
                  Select all on page
                </label>
              </div>
              <div className="space-y-2">{pending.map((task) => renderTask(task, true))}</div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Completed ({completed.length})</h2>
                <label className="text-xs text-gray-400 flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={completed.length > 0 && completed.every((t) => selected.has(t._id))} onChange={() => toggleSelectAll(completed)} />
                  Select all on page
                </label>
              </div>
              <div className="space-y-2 opacity-90">{completed.map((task) => renderTask(task, false))}</div>
            </div>
          )}
          {tasks.length === 0 && (
            <EmptyState
              title="No tasks found"
              description="Create your first task to stay on track with follow-ups and deadlines."
              action={<button type="button" className="btn-primary" onClick={openAdd}>+ Add Task</button>}
            />
          )}
          {total > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-2">
              <span>
                Showing {(filters.page - 1) * PAGE_SIZE + 1}–{Math.min(filters.page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary text-sm py-1 px-3"
                  disabled={filters.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                >
                  Previous
                </button>
                <span className="py-1 px-2">Page {filters.page} of {pages}</span>
                <button
                  type="button"
                  className="btn-secondary text-sm py-1 px-3"
                  disabled={filters.page >= pages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Task' : 'New Task'}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {!editing && templates.length > 0 && (
            <div>
              <label className="label">Template</label>
              <select
                className="input"
                defaultValue=""
                onChange={(e) => {
                  const tpl = templates.find((t) => t.id === e.target.value);
                  if (tpl) applyTemplate(tpl);
                  e.target.value = '';
                }}
              >
                <option value="">— Choose a template —</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
          )}
          <FormField label="Title" name="title" required error={errors.title}>
            <input id="field-title" name="title" value={form.title} onChange={handle} className={`input ${errors.title ? 'input-error' : ''}`} />
          </FormField>
          <div><label className="label">Description</label><textarea name="description" value={form.description} onChange={handle} className="input" rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Priority</label><select name="priority" value={form.priority} onChange={handle} className="input"><option>Low</option><option>Medium</option><option>High</option></select></div>
            <div><label className="label">Status</label><select name="status" value={form.status} onChange={handle} className="input"><option>Pending</option><option>Completed</option></select></div>
          </div>
          <div><label className="label">Due Date</label><input name="dueDate" type="datetime-local" value={form.dueDate} onChange={handle} className="input" /></div>
          <div>
            <label className="label">Repeat</label>
            <select name="recurringFrequency" value={form.recurringFrequency} onChange={handle} className="input">
              <option value="">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">When completed, the next occurrence is created automatically.</p>
          </div>
          <div><label className="label">Linked Client</label><select name="client" value={form.client} onChange={handle} className="input"><option value="">— No client —</option>{clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
          <div className="space-y-2 border-t border-gray-100 pt-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Reminders</p>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input type="checkbox" name="emailReminderEnabled" checked={form.emailReminderEnabled} onChange={handle} />
              Email reminder before due date
            </label>
            {form.emailReminderEnabled && (
              <div>
                <label className="label">Hours before due</label>
                <input name="emailReminderHoursBefore" type="number" min={1} max={168} value={form.emailReminderHoursBefore} onChange={handle} className="input w-32" />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input type="checkbox" name="browserReminderEnabled" checked={form.browserReminderEnabled} onChange={handle} />
              Browser notification (~15 min before due)
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Task'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
