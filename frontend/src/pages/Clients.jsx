import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clientsApi, parseClientList } from '../services/api';
import { useConfirm } from '../context/ConfirmContext';
import Modal from '../components/Modal';
import ClientImportModal from '../components/ClientImportModal';
import FormField from '../components/ui/FormField';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import { CardSkeleton } from '../components/ui/Skeleton';
import { validateClientForm } from '../utils/validation';
import ClientPhoneActions from '../components/ClientPhoneActions';
import { DEAL_STEPS, KYC_STEPS, DEAL_COLOR, KYC_COLOR, emptyClientForm, clientToForm, isStaleClient } from '../constants/clients';
import FollowUpSnooze from '../components/FollowUpSnooze';
import { formatFollowUpDate, isFollowUpOverdue } from '../utils/followUp';

const PAGE_SIZE = 12;

export default function Clients() {
  const confirm = useConfirm();
  const [clients, setClients] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ dealStatus: '', kycStatus: '' });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyClientForm);
  const [errors, setErrors] = useState({});
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = (p = page) => {
    setLoading(true);
    clientsApi
      .list({ search, ...filters, page: p, limit: PAGE_SIZE })
      .then((r) => {
        const parsed = parseClientList(r.data);
        setClients(parsed.clients);
        setPage(parsed.page);
        setPages(parsed.pages);
        setTotal(parsed.total);
      })
      .catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  useEffect(() => {
    load(page);
  }, [page, search, filters]);

  const openAdd = () => {
    setForm(emptyClientForm);
    setErrors({});
    setEditing(null);
    setModal(true);
  };
  const openEdit = (c) => {
    setForm(clientToForm(c));
    setErrors({});
    setEditing(c._id);
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const validation = validateClientForm(form);
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSaving(true);
    try {
      if (editing) {
        await clientsApi.update(editing, form);
        toast.success('Client updated');
      } else {
        await clientsApi.create(form);
        toast.success('Client added');
      }
      setModal(false);
      load(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving client');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    const ok = await confirm({
      title: 'Delete client?',
      message: 'This will permanently remove the client. Linked tasks and appointments may remain.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await clientsApi.delete(id);
      toast.success('Client deleted');
      load(page);
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: undefined });
  };

  const hasFilters = search || filters.dealStatus || filters.kycStatus;

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await clientsApi.exportCsv();
      toast.success('Clients exported');
    } catch {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPipelinePdf = async () => {
    setExporting(true);
    try {
      await clientsApi.exportPipelinePdf();
      toast.success('Pipeline report downloaded');
    } catch {
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-7xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clients</h1>
          <Link to="/pipeline" className="text-sm text-primary-600 hover:underline mt-1 inline-block">
            Open Kanban pipeline →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary text-sm min-h-[44px]" onClick={() => setImportOpen(true)}>
            Import
          </button>
          <button type="button" className="btn-secondary text-sm min-h-[44px]" onClick={handleExportCsv} disabled={exporting}>
            Export CSV
          </button>
          <button type="button" className="btn-secondary text-sm min-h-[44px]" onClick={handleExportPipelinePdf} disabled={exporting}>
            Pipeline PDF
          </button>
          <button type="button" className="btn-primary min-h-[44px]" onClick={openAdd}>
            + Add Client
          </button>
        </div>
      </div>
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <input
          className="input flex-1"
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input sm:w-44"
          value={filters.dealStatus}
          onChange={(e) => setFilters({ ...filters, dealStatus: e.target.value })}
        >
          <option value="">All Deal Status</option>
          {DEAL_STEPS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          className="input sm:w-44"
          value={filters.kycStatus}
          onChange={(e) => setFilters({ ...filters, kycStatus: e.target.value })}
        >
          <option value="">All KYC Status</option>
          {KYC_STEPS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : clients.length === 0 ? (
        hasFilters ? (
          <EmptyState title="No clients found" description="Try adjusting your search or filters." />
        ) : (
          <EmptyState
            icon={
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            title="Add your first client"
            description="Track deals, KYC status, and follow-ups in one place. Start by adding a prospect or customer."
            action={
              <button type="button" className="btn-primary" onClick={openAdd}>
                + Add Client
              </button>
            }
          />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clients.map((c) => {
              const dealIdx = DEAL_STEPS.indexOf(c.dealStatus);
              return (
                <div key={c._id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Link to={`/clients/${c._id}`} className="font-semibold text-gray-900 dark:text-gray-100 hover:text-primary-600">
                        {c.name}
                      </Link>
                      {c.phone && (
                        <div className="mt-1">
                          <p className="text-sm text-gray-500">{c.phone}</p>
                          <ClientPhoneActions phone={c.phone} clientName={c.name} compact className="mt-1" />
                        </div>
                      )}
                      {c.email && <p className="text-sm text-gray-400">{c.email}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="p-2.5 min-h-[44px] min-w-[44px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 flex items-center justify-center"
                        aria-label="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(c._id)}
                        className="p-2.5 min-h-[44px] min-w-[44px] rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 flex items-center justify-center"
                        aria-label="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap mb-3">
                    <span className={`badge ${DEAL_COLOR[c.dealStatus]}`}>{c.dealStatus}</span>
                    <span className={`badge ${KYC_COLOR[c.kycStatus]}`}>KYC: {c.kycStatus}</span>
                    {isStaleClient(c) && <span className="badge bg-amber-100 text-amber-800">Stale</span>}
                    {c.nextFollowUpDate && isFollowUpOverdue(c.nextFollowUpDate) && (
                      <span className="badge bg-red-100 text-red-700">Follow-up overdue</span>
                    )}
                  </div>
                  <div className="flex gap-1 mb-3">
                    {DEAL_STEPS.map((step, i) => (
                      <div key={step} className={`flex-1 h-1.5 rounded-full ${i <= dealIdx ? 'bg-primary-500' : 'bg-gray-100 dark:bg-gray-700'}`} />
                    ))}
                  </div>
                  {c.nextFollowUpDate && (
                    <p className={`text-xs mb-2 ${isFollowUpOverdue(c.nextFollowUpDate) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      Follow-up: {formatFollowUpDate(c.nextFollowUpDate)}
                    </p>
                  )}
                  {c.nextAction && (
                    <p className="text-xs text-gray-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded mb-2">
                      <span className="font-medium text-amber-700 dark:text-amber-400">Next: </span>
                      {c.nextAction}
                    </p>
                  )}
                  {(c.nextFollowUpDate || c.nextAction) && (
                    <FollowUpSnooze clientId={c._id} onDone={() => load(page)} compact />
                  )}
                </div>
              );
            })}
          </div>
          <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
        </>
      )}
      <ClientImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => load(1)}
      />
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Client' : 'Add Client'}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormField label="Name" name="name" required error={errors.name}>
            <input
              id="field-name"
              name="name"
              value={form.name}
              onChange={handle}
              className={`input ${errors.name ? 'input-error' : ''}`}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'field-name-error' : undefined}
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Phone" name="phone" error={errors.phone}>
              <input
                id="field-phone"
                name="phone"
                value={form.phone}
                onChange={handle}
                className={`input ${errors.phone ? 'input-error' : ''}`}
              />
            </FormField>
            <FormField label="Email" name="email" error={errors.email}>
              <input
                id="field-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handle}
                className={`input ${errors.email ? 'input-error' : ''}`}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Deal Status" name="dealStatus">
              <select name="dealStatus" value={form.dealStatus} onChange={handle} className="input">
                {DEAL_STEPS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </FormField>
            <FormField label="KYC Status" name="kycStatus">
              <select name="kycStatus" value={form.kycStatus} onChange={handle} className="input">
                {KYC_STEPS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Next Action" name="nextAction">
            <input name="nextAction" value={form.nextAction} onChange={handle} className="input" placeholder="e.g. Send KYC form" />
          </FormField>
          <FormField label="Follow-up date" name="nextFollowUpDate" hint="When to contact this client again">
            <input name="nextFollowUpDate" type="date" value={form.nextFollowUpDate} onChange={handle} className="input" />
          </FormField>
          <FormField label="Notes" name="notes">
            <textarea name="notes" value={form.notes} onChange={handle} className="input" rows={3} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Client'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
