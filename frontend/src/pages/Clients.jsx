import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clientsApi } from '../services/api';
import Modal from '../components/Modal';

const KYC_COLOR = { 'Not Started': 'bg-gray-100 text-gray-600', 'In Progress': 'bg-yellow-100 text-yellow-700', 'Completed': 'bg-green-100 text-green-700' };
const DEAL_COLOR = { 'New': 'bg-gray-100 text-gray-600', 'Contacted': 'bg-blue-100 text-blue-700', 'Interested': 'bg-purple-100 text-purple-700', 'Closed': 'bg-green-100 text-green-700' };
const DEAL_STEPS = ['New', 'Contacted', 'Interested', 'Closed'];
const KYC_STEPS = ['Not Started', 'In Progress', 'Completed'];
const emptyForm = { name: '', phone: '', email: '', notes: '', kycStatus: 'Not Started', dealStatus: 'New', nextAction: '' };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ dealStatus: '', kycStatus: '' });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    clientsApi.list({ search, ...filters })
      .then((r) => setClients(r.data))
      .catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, filters]);

  const openAdd = () => { setForm(emptyForm); setEditing(null); setModal(true); };
  const openEdit = (c) => { setForm({ name: c.name, phone: c.phone || '', email: c.email || '', notes: c.notes || '', kycStatus: c.kycStatus, dealStatus: c.dealStatus, nextAction: c.nextAction || '' }); setEditing(c._id); setModal(true); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) { await clientsApi.update(editing, form); toast.success('Client updated'); }
      else { await clientsApi.create(form); toast.success('Client added'); }
      setModal(false); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving client');
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this client?')) return;
    try { await clientsApi.delete(id); toast.success('Client deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="max-w-7xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button className="btn-primary" onClick={openAdd}>+ Add Client</button>
      </div>
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <input className="input flex-1" placeholder="Search by name, email or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input sm:w-44" value={filters.dealStatus} onChange={(e) => setFilters({ ...filters, dealStatus: e.target.value })}>
          <option value="">All Deal Status</option>
          {DEAL_STEPS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="input sm:w-44" value={filters.kycStatus} onChange={(e) => setFilters({ ...filters, kycStatus: e.target.value })}>
          <option value="">All KYC Status</option>
          {KYC_STEPS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : clients.length === 0 ? (
        <div className="card text-center py-16 text-gray-400"><p className="text-lg font-medium">No clients found</p><p className="text-sm mt-1">Add your first client to get started</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((c) => {
            const dealIdx = DEAL_STEPS.indexOf(c.dealStatus);
            return (
              <div key={c._id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link to={`/clients/${c._id}`} className="font-semibold text-gray-900 hover:text-primary-600">{c.name}</Link>
                    {c.phone && <p className="text-sm text-gray-500 mt-0.5">{c.phone}</p>}
                    {c.email && <p className="text-sm text-gray-400">{c.email}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                    <button onClick={() => remove(c._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap mb-3">
                  <span className={`badge ${DEAL_COLOR[c.dealStatus]}`}>{c.dealStatus}</span>
                  <span className={`badge ${KYC_COLOR[c.kycStatus]}`}>KYC: {c.kycStatus}</span>
                </div>
                <div className="flex gap-1 mb-3">
                  {DEAL_STEPS.map((step, i) => (<div key={step} className={`flex-1 h-1.5 rounded-full ${i <= dealIdx ? 'bg-primary-500' : 'bg-gray-100'}`} />))}
                </div>
                {c.nextAction && (<p className="text-xs text-gray-500 bg-amber-50 px-2 py-1 rounded"><span className="font-medium text-amber-700">Next: </span>{c.nextAction}</p>)}
              </div>
            );
          })}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Client' : 'Add Client'}>
        <form onSubmit={submit} className="space-y-4">
          <div><label className="label">Name *</label><input name="name" value={form.name} onChange={handle} className="input" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input name="phone" value={form.phone} onChange={handle} className="input" /></div>
            <div><label className="label">Email</label><input name="email" type="email" value={form.email} onChange={handle} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Deal Status</label><select name="dealStatus" value={form.dealStatus} onChange={handle} className="input">{DEAL_STEPS.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label className="label">KYC Status</label><select name="kycStatus" value={form.kycStatus} onChange={handle} className="input">{KYC_STEPS.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div><label className="label">Next Action</label><input name="nextAction" value={form.nextAction} onChange={handle} className="input" placeholder="e.g. Send KYC form" /></div>
          <div><label className="label">Notes</label><textarea name="notes" value={form.notes} onChange={handle} className="input" rows={3} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Client'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
