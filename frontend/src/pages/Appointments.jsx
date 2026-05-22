import React, { useEffect, useState, useCallback } from 'react';
import {
  format,
  isToday,
  isTomorrow,
  isPast,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import toast from 'react-hot-toast';
import { appointmentsApi, clientsApi } from '../services/api';
import { useConfirm } from '../context/ConfirmContext';
import Modal from '../components/Modal';
import FormField from '../components/ui/FormField';
import EmptyState from '../components/ui/EmptyState';
import { ListSkeleton } from '../components/ui/Skeleton';
import { validateAppointmentForm } from '../utils/validation';
import NextFollowUpPrompt from '../components/NextFollowUpPrompt';
import AppointmentCalendar from '../components/AppointmentCalendar';
import { googleCalendarUrl, outlookCalendarUrl, downloadAppointmentIcs } from '../utils/calendar';

const STATUS_COLOR = { Upcoming: 'bg-blue-100 text-blue-700', Completed: 'bg-green-100 text-green-700', Cancelled: 'bg-gray-100 text-gray-500' };
const TYPE_ICON = { 'In-Person': '🏢', 'Call': '📞', 'Video Call': '💻' };
const DEAL_STEPS = ['New', 'Contacted', 'Interested', 'Closed'];
const empty = {
  client: '',
  dateTime: '',
  type: 'Call',
  location: '',
  notes: '',
  status: 'Upcoming',
  durationMinutes: 60,
  remindEmail: true,
  remindSms: false,
};

function AppointmentActions({ appt, onLogCall, onComplete, onEdit }) {
  const openExternal = (url) => window.open(url, '_blank', 'noopener,noreferrer');

  const handleIcs = async () => {
    try {
      await downloadAppointmentIcs(appt._id);
      toast.success('Calendar file downloaded');
    } catch {
      toast.error('Could not download .ics file');
    }
  };

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      <button type="button" className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600" onClick={() => openExternal(googleCalendarUrl(appt))} title="Add to Google Calendar">Google</button>
      <button type="button" className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600" onClick={() => openExternal(outlookCalendarUrl(appt))} title="Add to Outlook">Outlook</button>
      <button type="button" className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600" onClick={handleIcs}>.ics</button>
      {appt.status === 'Upcoming' && (
        <>
          <button type="button" className="text-xs px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800" onClick={() => onLogCall(appt)}>Log call</button>
          <button type="button" className="text-xs px-2 py-1 rounded-md bg-green-50 hover:bg-green-100 text-green-800" onClick={() => onComplete(appt)}>Complete</button>
        </>
      )}
      <button type="button" className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600" onClick={() => onEdit(appt)}>Edit</button>
    </div>
  );
}

export default function Appointments() {
  const confirmDialog = useConfirm();
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '' });
  const [viewMode, setViewMode] = useState('list');
  const [calendarView, setCalendarView] = useState('month');
  const [calendarCursor, setCalendarCursor] = useState(new Date());
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [modal, setModal] = useState(false);
  const [logModal, setLogModal] = useState(null);
  const [completeModal, setCompleteModal] = useState(null);
  const [logNotes, setLogNotes] = useState('');
  const [logCallFlags, setLogCallFlags] = useState({ callRecorded: false, recordingDisclosed: false });
  const [completeForm, setCompleteForm] = useState({ callNotes: '', dealStatus: '', callRecorded: false, recordingDisclosed: false });
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [followUpClient, setFollowUpClient] = useState(null);

  const loadClients = useCallback(() => {
    clientsApi.list().then((r) => setClients(r.data)).catch(() => {});
  }, []);

  const getCalendarRange = useCallback(() => {
    if (calendarView === 'week') {
      const start = startOfWeek(calendarCursor, { weekStartsOn: 1 });
      const end = endOfWeek(calendarCursor, { weekStartsOn: 1 });
      return { from: start.toISOString(), to: end.toISOString() };
    }
    const mStart = startOfMonth(calendarCursor);
    const mEnd = endOfMonth(calendarCursor);
    return {
      from: startOfWeek(mStart, { weekStartsOn: 1 }).toISOString(),
      to: endOfWeek(mEnd, { weekStartsOn: 1 }).toISOString(),
    };
  }, [calendarCursor, calendarView]);

  const load = useCallback(() => {
    setLoading(true);
    const clientReq = clients.length === 0 ? clientsApi.list() : Promise.resolve({ data: clients });

    if (viewMode === 'calendar') {
      const range = getCalendarRange();
      Promise.all([
        appointmentsApi.list({ ...filters, ...range }),
        clientReq,
      ])
        .then(([a, c]) => {
          setAppointments(Array.isArray(a.data) ? a.data : a.data.items || []);
          setClients(c.data);
        })
        .catch(() => toast.error('Failed to load'))
        .finally(() => setLoading(false));
      return;
    }

    Promise.all([
      appointmentsApi.list({ ...filters, page, limit: 10 }),
      clientReq,
    ])
      .then(([a, c]) => {
        if (a.data.items) {
          setAppointments(a.data.items);
          setPagination({ total: a.data.total, pages: a.data.pages, page: a.data.page });
        } else {
          setAppointments(a.data);
          setPagination({ total: a.data.length, pages: 1, page: 1 });
        }
        setClients(c.data);
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [filters, page, viewMode, getCalendarRange, clients]);

  useEffect(() => { loadClients(); }, [loadClients]);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(empty); setErrors({}); setEditing(null); setModal(true); };
  const openEdit = (a) => {
    setForm({
      client: a.client?._id || '',
      type: a.type,
      location: a.location || '',
      notes: a.notes || '',
      status: a.status,
      durationMinutes: a.durationMinutes || 60,
      remindEmail: a.remindEmail !== false,
      remindSms: !!a.remindSms,
      dateTime: format(new Date(a.dateTime), "yyyy-MM-dd'T'HH:mm"),
    });
    setErrors({});
    setEditing(a._id);
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const validation = validateAppointmentForm(form);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        durationMinutes: Number(form.durationMinutes) || 60,
        remindEmail: !!form.remindEmail,
        remindSms: !!form.remindSms,
      };
      if (editing) {
        await appointmentsApi.update(editing, payload);
        toast.success('Appointment updated');
      } else {
        await appointmentsApi.create(payload);
        toast.success('Appointment scheduled');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const submitLogCall = async (e) => {
    e.preventDefault();
    if (!logNotes.trim()) return toast.error('Enter call notes');
    setSaving(true);
    try {
      const client = logModal.client;
      await appointmentsApi.logCall(logModal._id, { notes: logNotes, ...logCallFlags });
      toast.success('Call logged');
      setLogModal(null);
      setLogNotes('');
      setLogCallFlags({ callRecorded: false, recordingDisclosed: false });
      load();
      if (client?._id) {
        setFollowUpClient({
          id: client._id,
          name: client.name,
          nextAction: client.nextAction,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log call');
    } finally {
      setSaving(false);
    }
  };

  const submitComplete = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await appointmentsApi.complete(completeModal._id, {
        callNotes: completeForm.callNotes,
        dealStatus: completeForm.dealStatus || undefined,
        callRecorded: completeForm.callRecorded,
        recordingDisclosed: completeForm.recordingDisclosed,
      });
      const client = completeModal.client;
      toast.success('Appointment completed');
      setCompleteModal(null);
      setCompleteForm({ callNotes: '', dealStatus: '', callRecorded: false, recordingDisclosed: false });
      load();
      if (client?._id) {
        setFollowUpClient({ id: client._id, name: client.name, nextAction: client.nextAction });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    const ok = await confirmDialog({
      title: 'Remove appointment?',
      message: 'This appointment will be permanently deleted.',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      await appointmentsApi.delete(id);
      toast.success('Appointment removed');
      load();
    } catch {
      toast.error('Failed');
    }
  };

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    if (errors[name]) setErrors({ ...errors, [name]: undefined });
  };

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

  const order = ['Today', 'Tomorrow', ...Object.keys(grouped).filter((k) => k !== 'Today' && k !== 'Tomorrow' && k !== 'Past'), 'Past'];
  const orderedKeys = order.filter((k) => grouped[k]);

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
        <button type="button" className="btn-primary" onClick={openAdd}>+ Schedule Appointment</button>
      </div>

      <div className="card p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`px-3 py-1.5 rounded-lg text-sm font-medium ${viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`} onClick={() => { setViewMode('list'); setPage(1); }}>List</button>
          <button type="button" className={`px-3 py-1.5 rounded-lg text-sm font-medium ${viewMode === 'calendar' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`} onClick={() => setViewMode('calendar')}>Calendar</button>
          {viewMode === 'calendar' && (
            <>
              <button type="button" className={`px-3 py-1.5 rounded-lg text-sm ${calendarView === 'month' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`} onClick={() => setCalendarView('month')}>Month</button>
              <button type="button" className={`px-3 py-1.5 rounded-lg text-sm ${calendarView === 'week' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`} onClick={() => setCalendarView('week')}>Week</button>
            </>
          )}
        </div>
        <select className="input sm:w-52" value={filters.status} onChange={(e) => { setFilters({ status: e.target.value }); setPage(1); }}>
          <option value="">All Status</option>
          <option>Upcoming</option>
          <option>Completed</option>
          <option>Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : viewMode === 'calendar' ? (
        <AppointmentCalendar
          appointments={appointments}
          view={calendarView}
          cursor={calendarCursor}
          onCursorChange={setCalendarCursor}
          onSelectAppointment={openEdit}
        />
      ) : appointments.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          description="Schedule your first meeting with a client — calls, video, or in-person."
          action={<button type="button" className="btn-primary" onClick={() => { setForm(empty); setErrors({}); setEditing(null); setModal(true); }}>+ Schedule Appointment</button>}
        />
      ) : (
        <>
          <div className="space-y-6">
            {orderedKeys.map((key) => (
              <div key={key}>
                <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${key === 'Today' ? 'text-primary-600' : key === 'Past' ? 'text-gray-400' : 'text-gray-500'}`}>{key}</h2>
                <div className="space-y-3">
                  {grouped[key].map((appt) => (
                    <div key={appt._id} className={`card p-4 ${appt.status === 'Cancelled' ? 'opacity-60' : ''}`}>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 text-center">
                          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
                            <span className="text-lg">{TYPE_ICON[appt.type]}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{format(new Date(appt.dateTime), 'h:mm a')}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-gray-900">{appt.client?.name}</p>
                              <p className="text-sm text-gray-500">{appt.type}{appt.location ? ` · ${appt.location}` : ''}</p>
                              {appt.notes && <p className="text-sm text-gray-500 mt-1 italic">{appt.notes}</p>}
                              {(appt.remindEmail || appt.remindSms) && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Reminders: {appt.remindEmail ? 'Email' : ''}{appt.remindEmail && appt.remindSms ? ' + ' : ''}{appt.remindSms ? 'SMS' : ''}
                                </p>
                              )}
                              {appt.callLogs?.length > 0 && (
                                <p className="text-xs text-amber-700 mt-1">{appt.callLogs.length} call log(s)</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className={`badge ${STATUS_COLOR[appt.status]}`}>{appt.status}</span>
                              <button type="button" onClick={() => remove(appt._id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500" title="Delete">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                          <AppointmentActions
                            appt={appt}
                            onLogCall={(a) => { setLogModal(a); setLogNotes(''); }}
                            onComplete={(a) => {
                              setCompleteModal(a);
                              const next = a.client?.dealStatus === 'New' ? 'Contacted' : (a.client?.dealStatus || 'Contacted');
                              setCompleteForm({ callNotes: '', dealStatus: next });
                            }}
                            onEdit={openEdit}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button type="button" className="btn-secondary px-3 py-1.5 text-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span className="text-sm text-gray-500">Page {page} of {pagination.pages} ({pagination.total} total)</span>
              <button type="button" className="btn-secondary px-3 py-1.5 text-sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Appointment' : 'Schedule Appointment'}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormField label="Client" name="client" required error={errors.client}>
            <select id="field-client" name="client" value={form.client} onChange={handle} className={`input ${errors.client ? 'input-error' : ''}`}>
              <option value="">Select a client…</option>
              {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date & Time" name="dateTime" required error={errors.dateTime}>
              <input id="field-dateTime" name="dateTime" type="datetime-local" value={form.dateTime} onChange={handle} className={`input ${errors.dateTime ? 'input-error' : ''}`} />
            </FormField>
            <div><label className="label">Duration (min)</label><input name="durationMinutes" type="number" min={15} max={480} value={form.durationMinutes} onChange={handle} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Type</label><select name="type" value={form.type} onChange={handle} className="input"><option>Call</option><option>Video Call</option><option>In-Person</option></select></div>
            <div><label className="label">Status</label><select name="status" value={form.status} onChange={handle} className="input"><option>Upcoming</option><option>Completed</option><option>Cancelled</option></select></div>
          </div>
          <div><label className="label">Location / Link</label><input name="location" value={form.location} onChange={handle} className="input" placeholder="Branch, Zoom link…" /></div>
          <div><label className="label">Notes</label><textarea name="notes" value={form.notes} onChange={handle} className="input" rows={2} /></div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="remindEmail" checked={form.remindEmail} onChange={handle} className="rounded border-gray-300" />
              Email reminder (1 hr before)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="remindSms" checked={form.remindSms} onChange={handle} className="rounded border-gray-300" />
              SMS reminder (needs Twilio)
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Schedule'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!logModal} onClose={() => setLogModal(null)} title="Log call">
        <form onSubmit={submitLogCall} className="space-y-4">
          <p className="text-sm text-gray-500">Client: <strong>{logModal?.client?.name}</strong></p>
          <div><label className="label">Call notes *</label><textarea value={logNotes} onChange={(e) => setLogNotes(e.target.value)} className="input" rows={4} placeholder="What was discussed?" required /></div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={logCallFlags.callRecorded} onChange={(e) => setLogCallFlags({ ...logCallFlags, callRecorded: e.target.checked })} className="rounded" />
            This call was recorded
          </label>
          {logCallFlags.callRecorded && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 ml-6">
              <input type="checkbox" checked={logCallFlags.recordingDisclosed} onChange={(e) => setLogCallFlags({ ...logCallFlags, recordingDisclosed: e.target.checked })} className="rounded" />
              Client was informed recording is in progress
            </label>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setLogModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>Save log</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!completeModal} onClose={() => setCompleteModal(null)} title="Complete appointment">
        <form onSubmit={submitComplete} className="space-y-4">
          <p className="text-sm text-gray-500">Mark <strong>{completeModal?.client?.name}</strong> meeting as done and optionally update deal stage.</p>
          <div><label className="label">Call / meeting notes</label><textarea value={completeForm.callNotes} onChange={(e) => setCompleteForm({ ...completeForm, callNotes: e.target.value })} className="input" rows={3} placeholder="Optional summary" /></div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={completeForm.callRecorded} onChange={(e) => setCompleteForm({ ...completeForm, callRecorded: e.target.checked })} className="rounded" />
            Call was recorded
          </label>
          {completeForm.callRecorded && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 ml-6">
              <input type="checkbox" checked={completeForm.recordingDisclosed} onChange={(e) => setCompleteForm({ ...completeForm, recordingDisclosed: e.target.checked })} className="rounded" />
              Recording disclosed to client
            </label>
          )}
          <div>
            <label className="label">Update deal status</label>
            <select value={completeForm.dealStatus} onChange={(e) => setCompleteForm({ ...completeForm, dealStatus: e.target.value })} className="input">
              <option value="">— No change —</option>
              {DEAL_STEPS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setCompleteModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>Complete</button>
          </div>
        </form>
      </Modal>

      {followUpClient && (
        <NextFollowUpPrompt
          open={!!followUpClient}
          onClose={() => setFollowUpClient(null)}
          clientId={followUpClient.id}
          clientName={followUpClient.name}
          defaultAction={followUpClient.nextAction}
          onSaved={() => setFollowUpClient(null)}
        />
      )}
    </div>
  );
}
