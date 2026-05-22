import React, { useEffect, useState } from 'react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import toast from 'react-hot-toast';
import { appointmentsApi, clientsApi } from '../services/api';
import Modal from '../components/Modal';

const STATUS_COLOR = { Upcoming: 'bg-blue-100 text-blue-700', Completed: 'bg-green-100 text-green-700', Cancelled: 'bg-gray-100 text-gray-500' };
const TYPE_ICON = { 'In-Person': '🏢', 'Call': '📞', 'Video Call': '💻' };
const empty = { client: '', dateTime: '', type: 'Call', location: '', notes: '', status: 'Upcoming' };

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '' });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      appointmentsApi.list(filters),
      clients.length === 0 ? clientsApi.list() : Promise.resolve({ data: clients }),
    ])
      .then(([a, c]) => { setAppointments(a.data); setClients(c.data); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters]);

  const openAdd = () => { setForm(empty); setEditing(null); setModal(true); };
  const openEdit = (a) => {
    setForm({ client: a.client?._id || '', type: a.type, location: a.location || '', notes: a.notes || '', status: a.status, dateTime: format(new Date(a.dateTime), "yyyy-MM-dd'T'HH:mm") });
    setEditing(a._id); setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) { await appointmentsApi.update(editing, form); toast.success('Appointment updated'); }
      else { await appointmentsApi.create(form); toast.success('Appointment scheduled'); }
      setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => { if (!confirm('Cancel this appointment?')) return; try { await appointmentsApi.delete(id); toast.success('Appointment removed'); load(); } catch { toast.error('Failed'); } };
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const grouped = appointments.reduce((acc, a) => {
    const d = new Date(a.dateTime);
    let key;
    if (isToday(d)) key = 'Today';
    else if (isTomorrow(d)) key = 'Tomorrow';
    else if (isPast(d)) key = 'Past';
    else key = format(d, 'EEEE, MMMM d');
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  const order = ['Today', 'Tomorrow', ...Object.keys(grouped).filter(k => k !== 'Today' && k !== 'Tomorrow' && k !== 'Past'), 'Past'];
  const orderedKeys = order.filter(k => grouped[k]);

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
        <button className="btn-primary" onClick={openAdd}>+ Schedule Appointment</button>
      </div>
      <div className="card p-4">
        <select className="input sm:w-52" value={filters.status} onChange={(e) => setFilters({ status: e.target.value })}>
          <option value="">All Status</option><option>Upcoming</option><option>Completed</option><option>Cancelled</option>
        </select>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : appointments.length === 0 ? (
        <div className="card text-center py-16 text-gray-400"><p className="text-lg font-medium">No appointments</p><p className="text-sm mt-1">Schedule your first meeting</p></div>
      ) : (
        <div className="space-y-6">
          {orderedKeys.map(key => (
            <div key={key}>
              <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${key === 'Today' ? 'text-primary-600' : key === 'Past' ? 'text-gray-400' : 'text-gray-500'}`}>{key}</h2>
              <div className="space-y-3">
                {grouped[key].map(appt => (
                  <div key={appt._id} className={`card p-4 flex items-start gap-4 ${appt.status === 'Cancelled' ? 'opacity-60' : ''}`}>
                    <div className="flex-shrink-0 text-center">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex flex-col items-center justify-center">
                        <span className="text-lg">{TYPE_ICON[appt.type]}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{format(new Date(appt.dateTime), 'h:mm a')}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">{appt.client?.name}</p>
                          <p className="text-sm text-gray-500">{appt.type}{appt.location ? ` · ${appt.location}` : ''}</p>
                          {appt.client?.phone && <p className="text-xs text-gray-400">{appt.client.phone}</p>}
                          {appt.notes && <p className="text-sm text-gray-500 mt-1 italic">{appt.notes}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`badge ${STATUS_COLOR[appt.status]}`}>{appt.status}</span>
                          <button onClick={() => openEdit(appt)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                          <button onClick={() => remove(appt._id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Appointment' : 'Schedule Appointment'}>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label">Client *</label><select name="client" value={form.client} onChange={handle} className="input" required><option value="">Select a client…</option>{clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
          <div><label className="label">Date & Time *</label><input name="dateTime" type="datetime-local" value={form.dateTime} onChange={handle} className="input" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Type</label><select name="type" value={form.type} onChange={handle} className="input"><option>Call</option><option>Video Call</option><option>In-Person</option></select></div>
            <div><label className="label">Status</label><select name="status" value={form.status} onChange={handle} className="input"><option>Upcoming</option><option>Completed</option><option>Cancelled</option></select></div>
          </div>
          <div><label className="label">Location / Link</label><input name="location" value={form.location} onChange={handle} className="input" placeholder="e.g. Branch Office, Zoom link" /></div>
          <div><label className="label">Notes</label><textarea name="notes" value={form.notes} onChange={handle} className="input" rows={2} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Schedule'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
