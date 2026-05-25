import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { clientsApi, parseClientList } from '../services/api';
import { downloadClientsCsv, downloadClientsExcel } from '../utils/clientExport';
import Modal from '../components/Modal';
import ClientImportModal from '../components/ClientImportModal';
import {
  PRODUCT_TYPES, LEAD_SOURCES, DEAL_STEPS, KYC_STEPS, KYC_DOCS,
  DEAL_COLOR, KYC_COLOR, emptyClientForm, clientToForm, isStaleClient,
} from '../constants/clients';
import CallLogFlow from '../components/CallLogFlow';

const STALE_DAYS = 14;

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [deletedClients, setDeletedClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ dealStatus: '', kycStatus: '' });
  const [modal, setModal] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState(emptyClientForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dupWarning, setDupWarning] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 12;

  const load = () => {
    setLoading(true);
    clientsApi.list({ search, ...filters, page, limit: PAGE_SIZE })
      .then((r) => {
        const parsed = parseClientList(r.data);
        setClients(parsed.clients);
        setTotal(parsed.total);
        setTotalPages(parsed.pages);
      })
      .catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoading(false));
  };

  const loadDeleted = () => {
    clientsApi.deleted()
      .then((r) => setDeletedClients(r.data))
      .catch(() => toast.error('Failed to load archived clients'));
  };

  useEffect(() => { setPage(1); }, [search, filters.dealStatus, filters.kycStatus]);
  useEffect(() => { load(); }, [search, filters, page]);

  const openAdd = () => { setForm(emptyClientForm); setEditing(null); setDupWarning(null); setModal(true); };
  const openEdit = (c) => { setForm(clientToForm(c)); setEditing(c._id); setDupWarning(null); setModal(true); };

  const checkDuplicates = async () => {
    if (!form.email && !form.phone) { setDupWarning(null); return; }
    try {
      const r = await clientsApi.checkDuplicates({ email: form.email, phone: form.phone, excludeId: editing });
      setDupWarning(r.data.duplicates.length ? r.data.duplicates : null);
    } catch { /* ignore */ }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      dealValue: form.dealValue === '' ? undefined : Number(form.dealValue),
      expectedCommission: form.expectedCommission === '' ? undefined : Number(form.expectedCommission),
      lastContactedAt: form.lastContactedAt || undefined,
    };
    try {
      if (editing) { await clientsApi.update(editing, payload); toast.success('Client updated'); }
      else { await clientsApi.create(payload); toast.success('Client added'); }
      setModal(false); load();
    } catch (err) {
      const dups = err.response?.data?.duplicates;
      if (dups?.length) setDupWarning(dups);
      toast.error(err.response?.data?.message || 'Error saving client');
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Archive this client? Linked tasks will be unlinked and upcoming appointments cancelled. You can restore from trash.')) return;
    try { await clientsApi.delete(id); toast.success('Client archived'); load(); }
    catch { toast.error('Failed to archive'); }
  };

  const restore = async (id) => {
    try { await clientsApi.restore(id); toast.success('Client restored'); loadDeleted(); load(); }
    catch { toast.error('Failed to restore'); }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await downloadClientsCsv();
      toast.success('Full export downloaded (CSV)');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await downloadClientsExcel();
      toast.success('Full export downloaded (Excel)');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const toggleKycDoc = (key) => setForm({
    ...form,
    kycDocuments: { ...form.kycDocuments, [key]: !form.kycDocuments[key] },
  });

  const openTrash = () => { loadDeleted(); setTrashOpen(true); };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="page-title">Clients</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary text-sm" onClick={handleExportCsv} disabled={exporting}>Export all (CSV)</button>
          <button type="button" className="btn-secondary text-sm" onClick={handleExportExcel} disabled={exporting}>Export all (Excel)</button>
          <button type="button" className="btn-secondary text-sm" onClick={() => clientsApi.exportPipelinePdf()}>Pipeline PDF</button>
          <button type="button" className="btn-secondary text-sm" onClick={() => setImportOpen(true)}>Import</button>
          <button type="button" className="btn-secondary text-sm" onClick={openTrash}>Trash</button>
          <button className="btn-primary" onClick={openAdd}>+ Add Client</button>
        </div>
      </div>
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <input className="input flex-1" placeholder="Search by name, email or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input sm:w-44" value={filters.dealStatus} onChange={(e) => setFilters({ ...filters, dealStatus: e.target.value })}>
          <option value="">All Deal Status</option>
          {DEAL_STEPS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="input sm:w-44" value={filters.kycStatus} onChange={(e) => setFilters({ ...filters, kycStatus: e.target.value })}>
          <option value="">All KYC Status</option>
          {KYC_STEPS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : clients.length === 0 ? (
        <div className="card text-center py-16 text-gray-400 dark:text-gray-500"><p className="text-lg font-medium text-gray-900 dark:text-gray-100">No clients found</p><p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Add your first client to get started</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((c) => {
            const dealIdx = DEAL_STEPS.indexOf(c.dealStatus);
            const stale = isStaleClient(c, STALE_DAYS);
            const kycDone = KYC_DOCS.filter((d) => c.kycDocuments?.[d.key]).length;
            return (
              <div key={c._id} className={`card hover:shadow-md transition-shadow ${stale ? 'ring-2 ring-amber-200' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link to={`/clients/${c._id}`} className="font-semibold text-gray-900 dark:text-gray-100 hover:text-primary-600">{c.name}</Link>
                    {c.phone && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{c.phone}</p>}
                    {c.email && <p className="text-sm text-gray-400">{c.email}</p>}
                    {c.productType && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.productType}{c.leadSource ? ` · ${c.leadSource}` : ''}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500" aria-label="Edit">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button type="button" onClick={() => remove(c._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" aria-label="Archive">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap mb-3">
                  <span className={`badge ${DEAL_COLOR[c.dealStatus]}`}>{c.dealStatus}</span>
                  <span className={`badge ${KYC_COLOR[c.kycStatus]}`}>KYC: {c.kycStatus}</span>
                  {stale && <span className="badge bg-amber-100 text-amber-800">Stale lead</span>}
                  {kycDone > 0 && <span className="badge bg-slate-100 text-slate-600">Docs {kycDone}/{KYC_DOCS.length}</span>}
                </div>
                <div className="flex gap-1 mb-3">
                  {DEAL_STEPS.map((step, i) => (<div key={step} className={`flex-1 h-1.5 rounded-full ${i <= dealIdx ? 'bg-primary-500' : 'bg-gray-100 dark:bg-gray-700'}`} />))}
                </div>
                {(c.dealValue || c.expectedCommission) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {c.dealValue != null && <span>Value: ${Number(c.dealValue).toLocaleString()}</span>}
                    {c.expectedCommission != null && <span className="ml-2">Commission: ${Number(c.expectedCommission).toLocaleString()}</span>}
                  </p>
                )}
                {c.lastContactedAt && (
                  <p className="text-xs text-gray-400 mb-1">Last contact: {format(new Date(c.lastContactedAt), 'MMM d, yyyy')}</p>
                )}
                {c.nextAction && (<p className="text-xs text-gray-500 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded mb-2"><span className="font-medium text-amber-700 dark:text-amber-300">Next: </span>{c.nextAction}</p>)}
                <CallLogFlow
                  clientId={c._id}
                  clientName={c.name}
                  compact
                  onUpdated={(updated) => {
                    setClients((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between card p-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages} · {total} client{total === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary text-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <button type="button" className="btn-secondary text-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Client' : 'Add Client'}>
        <form onSubmit={submit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div><label className="label">Name *</label><input name="name" value={form.name} onChange={handle} className="input" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input name="phone" value={form.phone} onChange={handle} onBlur={checkDuplicates} className="input" /></div>
            <div><label className="label">Email</label><input name="email" type="email" value={form.email} onChange={handle} onBlur={checkDuplicates} className="input" /></div>
          </div>
          {dupWarning && (
            <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
              <p className="font-medium">Possible duplicate:</p>
              <ul className="mt-1 list-disc list-inside">
                {dupWarning.map((d) => (
                  <li key={d._id}>
                    {d.name} ({d.email || d.phone})
                    {d.matchedOn?.length ? ` — matched on ${d.matchedOn.join(' & ')}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Product type</label>
              <select name="productType" value={form.productType} onChange={handle} className="input">
                <option value="">— Select —</option>
                {PRODUCT_TYPES.filter(Boolean).map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Lead source</label>
              <select name="leadSource" value={form.leadSource} onChange={handle} className="input">
                <option value="">— Select —</option>
                {LEAD_SOURCES.filter(Boolean).map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Deal value ($)</label><input name="dealValue" type="number" min="0" step="0.01" value={form.dealValue} onChange={handle} className="input" /></div>
            <div><label className="label">Expected commission ($)</label><input name="expectedCommission" type="number" min="0" step="0.01" value={form.expectedCommission} onChange={handle} className="input" /></div>
          </div>
          <div><label className="label">Last contacted</label><input name="lastContactedAt" type="date" value={form.lastContactedAt} onChange={handle} className="input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Deal Status</label><select name="dealStatus" value={form.dealStatus} onChange={handle} className="input">{DEAL_STEPS.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label className="label">KYC Status</label><select name="kycStatus" value={form.kycStatus} onChange={handle} className="input">{KYC_STEPS.map((s) => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div>
            <label className="label">KYC documents</label>
            <div className="flex flex-wrap gap-3 mt-1">
              {KYC_DOCS.map((d) => (
                <label key={d.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={!!form.kycDocuments[d.key]} onChange={() => toggleKycDoc(d.key)} className="rounded border-gray-300" />
                  {d.label}
                </label>
              ))}
            </div>
          </div>
          <div><label className="label">Next Action</label><input name="nextAction" value={form.nextAction} onChange={handle} className="input" placeholder="e.g. Send KYC form" /></div>
          <div><label className="label">Notes</label><textarea name="notes" value={form.notes} onChange={handle} className="input" rows={3} /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Client'}</button>
          </div>
        </form>
      </Modal>

      <ClientImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={load} />

      <Modal open={trashOpen} onClose={() => setTrashOpen(false)} title="Archived clients">
        {deletedClients.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No archived clients</p>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {deletedClients.map((c) => (
              <li key={c._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{c.name}</p>
                  <p className="text-xs text-gray-400">Archived {c.deletedAt && format(new Date(c.deletedAt), 'MMM d, yyyy')}</p>
                </div>
                <button type="button" className="btn-secondary text-sm" onClick={() => restore(c._id)}>Restore</button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
