import React, { useEffect, useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import toast from 'react-hot-toast';
import { tasksApi, clientsApi } from '../services/api';
import Modal from '../components/Modal';

const PRIORITY_COLOR = { High: 'bg-red-100 text-red-700', Medium: 'bg-yellow-100 text-yellow-700', Low: 'bg-green-100 text-green-700' };
const empty = { title: '', description: '', dueDate: '', priority: 'Medium', status: 'Pending', client: '' };

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      tasksApi.list(filters),
      clients.length === 0 ? clientsApi.list() : Promise.resolve({ data: clients }),
    ])
      .then(([t, c]) => { setTasks(t.data); setClients(c.data); })
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters]);

  const openAdd = () => { setForm(empty); setEditing(null); setModal(true); };
  const openEdit = (t) => {
    setForm({ title: t.title, description: t.description || '', priority: t.priority, status: t.status, client: t.client?._id || '', dueDate: t.dueDate ? format(new Date(t.dueDate), "yyyy-MM-dd'T'HH:mm") : '' });
    setEditing(t._id); setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, client: form.client || null };
      if (editing) { await tasksApi.update(editing, payload); toast.success('Task updated'); }
      else { await tasksApi.create(payload); toast.success('Task created'); }
      setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const complete = async (id) => { try { await tasksApi.complete(id); toast.success('Task completed!'); load(); } catch { toast.error('Failed'); } };
  const remove = async (id) => { if (!confirm('Delete this task?')) return; try { await tasksApi.delete(id); toast.success('Task deleted'); load(); } catch { toast.error('Failed'); } };
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const pending = tasks.filter(t => t.status === 'Pending');
  const completed = tasks.filter(t => t.status === 'Completed');

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <button className="btn-primary" onClick={openAdd}>+ Add Task</button>
      </div>
      <div className="card p-4 flex gap-3">
        <select className="input flex-1" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Status</option><option>Pending</option><option>Completed</option>
        </select>
        <select className="input flex-1" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All Priority</option><option>High</option><option>Medium</option><option>Low</option>
        </select>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Pending ({pending.length})</h2>
              <div className="space-y-2">
                {pending.map(task => {
                  const overdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));
                  return (
                    <div key={task._id} className={`card p-4 flex items-start gap-3 ${overdue ? 'border-red-100 bg-red-50/30' : ''}`}>
                      <button onClick={() => complete(task._id)} className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 flex-shrink-0 transition-colors" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-gray-900">{task.title}</p>
                            {task.description && <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>}
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                              {task.dueDate && <span className={overdue ? 'text-red-500 font-medium' : ''}>Due {format(new Date(task.dueDate), 'MMM d, h:mm a')}{overdue && ' (Overdue)'}</span>}
                              {task.client && <span>Client: {task.client.name}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className={`badge ${PRIORITY_COLOR[task.priority]}`}>{task.priority}</span>
                            <button onClick={() => openEdit(task)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                            <button onClick={() => remove(task._id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Completed ({completed.length})</h2>
              <div className="space-y-2">
                {completed.map(task => (
                  <div key={task._id} className="card p-4 flex items-start gap-3 opacity-60">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-500 line-through">{task.title}</p>
                      {task.completedAt && <p className="text-xs text-gray-400 mt-0.5">Completed {format(new Date(task.completedAt), 'MMM d')}</p>}
                    </div>
                    <button onClick={() => remove(task._id)} className="p-1.5 hover:bg-red-50 rounded text-gray-300 hover:text-red-400"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tasks.length === 0 && (<div className="card text-center py-16 text-gray-400"><p className="text-lg font-medium">No tasks found</p><p className="text-sm mt-1">Create your first task to stay on track</p></div>)}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Task' : 'New Task'}>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label">Title *</label><input name="title" value={form.title} onChange={handle} className="input" required /></div>
          <div><label className="label">Description</label><textarea name="description" value={form.description} onChange={handle} className="input" rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Priority</label><select name="priority" value={form.priority} onChange={handle} className="input"><option>Low</option><option>Medium</option><option>High</option></select></div>
            <div><label className="label">Status</label><select name="status" value={form.status} onChange={handle} className="input"><option>Pending</option><option>Completed</option></select></div>
          </div>
          <div><label className="label">Due Date</label><input name="dueDate" type="datetime-local" value={form.dueDate} onChange={handle} className="input" /></div>
          <div><label className="label">Linked Client</label><select name="client" value={form.client} onChange={handle} className="input"><option value="">— No client —</option>{clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Task'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
