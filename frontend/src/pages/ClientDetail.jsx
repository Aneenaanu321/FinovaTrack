import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { clientsApi, tasksApi, appointmentsApi } from '../services/api';
import Modal from '../components/Modal';
import {
  DEAL_COLOR, KYC_COLOR, DEAL_STEPS, KYC_DOCS, PRODUCT_TYPES, LEAD_SOURCES,
  clientToForm, isStaleClient,
} from '../constants/clients';
import CallLogFlow from '../components/CallLogFlow';
import ClientPhoneActions from '../components/ClientPhoneActions';

const ACTIVITY_ICONS = {
  call: '📞',
  note: '📝',
  status_change: '🔄',
  contact: '✓',
};

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const reload = () => {
    setLoading(true);
    Promise.all([clientsApi.get(id), tasksApi.list({ clientId: id }), appointmentsApi.list({ clientId: id })])
      .then(([c, t, a]) => { setClient(c.data); setTasks(t.data); setAppointments(a.data); })
      .catch(() => toast.error('Failed to load client'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [id]);

  const completeTask = async (taskId) => {
    try {
      await tasksApi.complete(taskId);
      setTasks(tasks.map((t) => (t._id === taskId ? { ...t, status: 'Completed' } : t)));
      toast.success('Task completed');
    } catch { toast.error('Failed'); }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      const r = await clientsApi.addActivity(id, { type: 'note', title: 'Note added', body: noteText.trim() });
      setClient(r.data);
      setNoteText('');
      setNoteOpen(false);
      toast.success('Note added');
    } catch { toast.error('Failed to add note'); }
  };

  const toggleKycDoc = async (key) => {
    const next = { ...client.kycDocuments, [key]: !client.kycDocuments?.[key] };
    try {
      const r = await clientsApi.update(id, { kycDocuments: next });
      setClient(r.data);
    } catch { toast.error('Failed to update KYC docs'); }
  };

  const openEdit = () => { setForm(clientToForm(client)); setEditOpen(true); };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await clientsApi.update(id, {
        ...form,
        dealValue: form.dealValue === '' ? undefined : Number(form.dealValue),
        expectedCommission: form.expectedCommission === '' ? undefined : Number(form.expectedCommission),
        lastContactedAt: form.lastContactedAt || undefined,
      });
      setClient(r.data);
      setEditOpen(false);
      toast.success('Client updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!client) return <div className="text-center py-16 text-gray-400 dark:text-gray-500">Client not found</div>;

  const dealIdx = DEAL_STEPS.indexOf(client.dealStatus);
  const stale = isStaleClient(client);
  const activities = [...(client.activities || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const kycDone = KYC_DOCS.filter((d) => client.kycDocuments?.[d.key]).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/clients" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex-1">{client.name}</h1>
        <button type="button" className="btn-secondary text-sm" onClick={() => setNoteOpen(true)}>Add note</button>
        <button type="button" className="btn-primary text-sm" onClick={openEdit}>Edit</button>
      </div>

      {stale && (
        <div className="card bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm">
          Stale lead — no contact in 14+ days. Log a call or update last contacted date.
        </div>
      )}

      <div className="card p-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Log a call</p>
        {client.phone && (
          <ClientPhoneActions phone={client.phone} clientName={client.name} className="mb-3" />
        )}
        <CallLogFlow clientId={id} clientName={client.name} onUpdated={setClient} />
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            {client.phone && <p><span className="font-medium">Phone:</span> {client.phone}</p>}
            {client.email && <p><span className="font-medium">Email:</span> {client.email}</p>}
            {client.productType && <p><span className="font-medium">Product:</span> {client.productType}</p>}
            {client.leadSource && <p><span className="font-medium">Lead source:</span> {client.leadSource}</p>}
            {(client.dealValue != null || client.expectedCommission != null) && (
              <p>
                {client.dealValue != null && <span><span className="font-medium">Deal value:</span> ${Number(client.dealValue).toLocaleString()}</span>}
                {client.expectedCommission != null && <span className="ml-4"><span className="font-medium">Commission:</span> ${Number(client.expectedCommission).toLocaleString()}</span>}
              </p>
            )}
            {client.lastContactedAt && (
              <p><span className="font-medium">Last contacted:</span> {format(new Date(client.lastContactedAt), 'MMM d, yyyy')}</p>
            )}
            {client.notes && <p><span className="font-medium">Notes:</span> {client.notes}</p>}
            {client.nextAction && <p className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg"><span className="font-medium">Next Action:</span> {client.nextAction}</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className={`badge ${DEAL_COLOR[client.dealStatus]}`}>{client.dealStatus}</span>
            <span className={`badge ${KYC_COLOR[client.kycStatus]}`}>KYC: {client.kycStatus}</span>
            {stale && <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Stale</span>}
          </div>
        </div>
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Deal Progress</p>
          <div className="flex items-center gap-2">
            {DEAL_STEPS.map((step, i) => (
              <React.Fragment key={step}>
                <div className={`flex flex-col items-center ${i <= dealIdx ? 'text-primary-600 dark:text-primary-400' : 'text-gray-300 dark:text-gray-600'}`}>
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold ${i <= dealIdx ? 'border-primary-500 bg-primary-50' : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'}`}>
                    {i < dealIdx ? '✓' : i + 1}
                  </div>
                  <span className="text-xs mt-1 hidden sm:block">{step}</span>
                </div>
                {i < DEAL_STEPS.length - 1 && (<div className={`flex-1 h-0.5 ${i < dealIdx ? 'bg-primary-400' : 'bg-gray-200 dark:bg-gray-700'}`} />)}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">KYC documents ({kycDone}/{KYC_DOCS.length})</h2>
        </div>
        <div className="space-y-2">
          {KYC_DOCS.map((d) => (
            <label key={d.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={!!client.kycDocuments?.[d.key]}
                onChange={() => toggleKycDoc(d.key)}
                className="rounded border-gray-300"
              />
              <span className={`text-sm ${client.kycDocuments?.[d.key] ? 'text-gray-900 dark:text-gray-100 line-through decoration-green-500 dark:decoration-green-400' : 'text-gray-700 dark:text-gray-300'}`}>{d.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Activity timeline</h2>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No activity yet — log a contact or add a note</p>
        ) : (
          <ul className="space-y-3 border-l-2 border-gray-100 dark:border-gray-700 ml-2 pl-4">
            {activities.map((a) => (
              <li key={a._id} className="relative">
                <span className="absolute -left-[1.35rem] top-1 w-5 h-5 bg-white dark:bg-gray-900 flex items-center justify-center text-xs">
                  {ACTIVITY_ICONS[a.type] || '•'}
                </span>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.title}</p>
                {a.body && <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{a.body}</p>}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {format(new Date(a.createdAt), 'MMM d, yyyy h:mm a')}
                  {' · '}
                  {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Tasks ({tasks.length})</h2>
          {tasks.length === 0 ? <p className="text-sm text-gray-400 py-4 text-center">No tasks for this client</p> : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t._id} className={`flex items-start gap-3 p-2 rounded-lg ${t.status === 'Completed' ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  {t.status === 'Pending' ? (
                    <button type="button" onClick={() => completeTask(t._id)} className="mt-0.5 w-4 h-4 rounded border-2 border-gray-300 hover:border-green-500 flex-shrink-0" />
                  ) : (
                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  )}
                  <div>
                    <p className={`text-sm font-medium ${t.status === 'Completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>{t.title}</p>
                    {t.dueDate && <p className="text-xs text-gray-400">{format(new Date(t.dueDate), 'MMM d, yyyy')}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Appointments ({appointments.length})</h2>
          {appointments.length === 0 ? <p className="text-sm text-gray-400 py-4 text-center">No appointments for this client</p> : (
            <ul className="space-y-2">
              {appointments.map((a) => (
                <li key={a._id} className="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary-600">{format(new Date(a.dateTime), 'MMM')}</span>
                    <span className="text-sm font-bold text-primary-700">{format(new Date(a.dateTime), 'd')}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{format(new Date(a.dateTime), 'h:mm a')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{a.type}{a.location ? ` · ${a.location}` : ''}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="Add note">
        <form onSubmit={addNote} className="space-y-4">
          <textarea className="input" rows={4} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Call summary, follow-up details…" required />
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setNoteOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save note</button>
          </div>
        </form>
      </Modal>

      {form && (
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit client">
          <form onSubmit={saveEdit} className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div><label className="label">Name</label><input name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Product</label><select value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })} className="input"><option value="">—</option>{PRODUCT_TYPES.filter(Boolean).map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className="label">Lead source</label><select value={form.leadSource} onChange={(e) => setForm({ ...form, leadSource: e.target.value })} className="input"><option value="">—</option>{LEAD_SOURCES.filter(Boolean).map((s) => <option key={s}>{s}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Deal status</label><select value={form.dealStatus} onChange={(e) => setForm({ ...form, dealStatus: e.target.value })} className="input">{DEAL_STEPS.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className="label">KYC status</label><select value={form.kycStatus} onChange={(e) => setForm({ ...form, kycStatus: e.target.value })} className="input">{['Not Started', 'In Progress', 'Completed'].map((s) => <option key={s}>{s}</option>)}</select></div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setEditOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
