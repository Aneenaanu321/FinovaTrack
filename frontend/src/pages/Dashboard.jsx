import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek } from 'date-fns';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { dashboardApi, tasksApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DealsByStageChart, KycChart, TasksPerWeekChart } from '../components/DashboardCharts';

const PRIORITY_COLOR = { High: 'bg-red-100 text-red-700', Medium: 'bg-yellow-100 text-yellow-700', Low: 'bg-green-100 text-green-700' };

const RANGE_PRESETS = {
  this_month: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }),
  this_week: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) }),
  last_30: () => ({ start: subDays(new Date(), 30), end: new Date() }),
};

function StatCard({ label, value, color, icon, hint }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

function formatMoney(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function ProgressBar({ value, max, label, formatValue }) {
  const displayVal = formatValue ? formatValue(value) : value;
  const displayMax = formatValue ? formatValue(max) : max;
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : (value > 0 ? 100 : 0);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{displayVal} / {displayMax}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      {max > 0 && <p className="text-xs text-gray-400 mt-0.5">{pct}% of goal</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rangePreset, setRangePreset] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [editingTargets, setEditingTargets] = useState(false);
  const [targetForm, setTargetForm] = useState({ clientsClosed: 5, dealValue: 0, commission: 0 });
  const [sendingSummary, setSendingSummary] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCommission, setExportingCommission] = useState(false);
  const reportRef = useRef(null);

  const getRangeParams = useCallback(() => {
    if (rangePreset === 'custom') {
      if (!customStart || !customEnd) return null;
      return { startDate: customStart, endDate: customEnd };
    }
    const fn = RANGE_PRESETS[rangePreset];
    if (!fn) return null;
    const { start, end } = fn();
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [rangePreset, customStart, customEnd]);

  const load = useCallback(() => {
    const params = getRangeParams();
    if (!params) return;
    setLoading(true);
    dashboardApi.stats(params)
      .then((r) => {
        setData(r.data);
        if (r.data?.monthlyTargets) {
          setTargetForm({
            clientsClosed: r.data.monthlyTargets.clientsClosed,
            dealValue: r.data.monthlyTargets.dealValue ?? 0,
            commission: r.data.monthlyTargets.commission ?? 0,
          });
        }
      })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [getRangeParams]);

  useEffect(() => { load(); }, [load]);

  const completeTask = async (id) => {
    try {
      await tasksApi.complete(id);
      toast.success('Task completed!');
      load();
    } catch {
      toast.error('Failed to complete task');
    }
  };

  const saveTargets = async () => {
    try {
      await dashboardApi.updateTargets(targetForm);
      toast.success('Targets updated');
      setEditingTargets(false);
      load();
    } catch {
      toast.error('Failed to save targets');
    }
  };

  const sendSummary = async (period) => {
    setSendingSummary(true);
    try {
      const { data: res } = await dashboardApi.sendSummary(period);
      toast.success(res.message || 'Summary sent');
    } catch {
      toast.error('Failed to send summary email');
    } finally {
      setSendingSummary(false);
    }
  };

  const exportPdf = async () => {
    if (!reportRef.current) return;
    setExportingPdf(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = 10;
      let remaining = imgH;
      let srcY = 0;
      const sliceH = (canvas.width * (pageH - 20)) / imgW;

      while (remaining > 0) {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(sliceH, canvas.height - srcY);
        const ctx = pageCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, srcY, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
        const slice = pageCanvas.toDataURL('image/png');
        const h = (pageCanvas.height * imgW) / canvas.width;
        if (y > 10) pdf.addPage();
        pdf.addImage(slice, 'PNG', 10, 10, imgW, h);
        srcY += pageCanvas.height;
        remaining -= h;
        y = 10;
      }
      pdf.save(`finovatrack-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Report exported');
    } catch {
      toast.error('Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const rangeLabel = () => {
    const params = getRangeParams();
    if (!params) return '';
    return `${format(new Date(params.startDate), 'MMM d')} – ${format(new Date(params.endDate), 'MMM d, yyyy')}`;
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const {
    stats,
    todayTasks,
    overdueTasks,
    todayAppointments,
    upcomingAppointments,
    dealsByStage,
    kyc,
    tasksCompletedPerWeek,
    monthlyTargets,
    commissionReporting,
    focusList,
    dateRange,
  } = data || {};

  const monthActual = monthlyTargets?.actual;
  const dealsClosed = monthActual?.clientsClosed ?? 0;
  const dealsGoal = monthlyTargets?.clientsClosed ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good morning, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-gray-500 mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => sendSummary('weekly')} disabled={sendingSummary} className="btn-secondary text-sm">
            Email weekly summary
          </button>
          <button type="button" onClick={() => sendSummary('monthly')} disabled={sendingSummary} className="btn-secondary text-sm">
            Email monthly summary
          </button>
          <button type="button" onClick={exportPdf} disabled={exportingPdf} className="btn-primary text-sm">
            {exportingPdf ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="label">Date range</label>
            <select
              className="input max-w-xs"
              value={rangePreset}
              onChange={(e) => setRangePreset(e.target.value)}
            >
              <option value="this_month">This month</option>
              <option value="this_week">This week</option>
              <option value="last_30">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
          {rangePreset === 'custom' && (
            <>
              <div>
                <label className="label">From</label>
                <input type="date" className="input" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              </div>
              <div>
                <label className="label">To</label>
                <input type="date" className="input" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
            </>
          )}
          <button type="button" onClick={load} className="btn-primary" disabled={rangePreset === 'custom' && (!customStart || !customEnd)}>
            Apply
          </button>
        </div>
        {dateRange && (
          <p className="text-xs text-gray-400 mt-2">Showing stats for {rangeLabel()}</p>
        )}
      </div>

      <div className="card border-primary-100 bg-gradient-to-br from-primary-50/80 to-white">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Monthly target vs. actual</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {monthlyTargets?.month} · closed deals this calendar month
            </p>
          </div>
          <div className="flex items-center gap-3 sm:text-right">
            <div>
              <p className="text-3xl font-bold text-primary-700">{dealsClosed}</p>
              <p className="text-xs text-gray-500">deals closed</p>
            </div>
            <div className="text-gray-300 text-2xl font-light">/</div>
            <div>
              <p className="text-3xl font-bold text-gray-400">{dealsGoal}</p>
              <p className="text-xs text-gray-500">monthly goal</p>
            </div>
            {!editingTargets ? (
              <button type="button" onClick={() => setEditingTargets(true)} className="btn-secondary text-sm ml-2">Edit goals</button>
            ) : null}
          </div>
        </div>
        {editingTargets ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="label">Deals closed goal</label>
              <input type="number" min="0" className="input" value={targetForm.clientsClosed} onChange={(e) => setTargetForm((f) => ({ ...f, clientsClosed: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Deal value goal ($)</label>
              <input type="number" min="0" className="input" value={targetForm.dealValue} onChange={(e) => setTargetForm((f) => ({ ...f, dealValue: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Commission goal ($)</label>
              <input type="number" min="0" className="input" value={targetForm.commission} onChange={(e) => setTargetForm((f) => ({ ...f, commission: Number(e.target.value) }))} />
            </div>
            <div className="sm:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setEditingTargets(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="button" onClick={saveTargets} className="btn-primary text-sm">Save goals</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ProgressBar label="Deals closed" value={dealsClosed} max={dealsGoal || 1} />
            <ProgressBar label="Deal value (closed)" value={monthActual?.dealValue ?? 0} max={monthlyTargets?.dealValue || 1} formatValue={formatMoney} />
            <ProgressBar label="Commission (closed)" value={monthActual?.commission ?? 0} max={monthlyTargets?.commission || 1} formatValue={formatMoney} />
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-primary-100/80">
          <div className="text-center p-2 rounded-lg bg-white/70">
            <p className="text-lg font-semibold text-gray-900">{formatMoney(monthActual?.dealValue)}</p>
            <p className="text-xs text-gray-500">Deal value (month)</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/70">
            <p className="text-lg font-semibold text-emerald-700">{formatMoney(monthActual?.commission)}</p>
            <p className="text-xs text-gray-500">Commission (month)</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/70">
            <p className="text-lg font-semibold text-gray-900">{formatMoney(commissionReporting?.openPipeline?.dealValue)}</p>
            <p className="text-xs text-gray-500">Open pipeline value</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/70">
            <p className="text-lg font-semibold text-emerald-700">{formatMoney(commissionReporting?.openPipeline?.commission)}</p>
            <p className="text-xs text-gray-500">Expected commission (open)</p>
          </div>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Clients" value={stats?.totalClients ?? 0} color="bg-blue-50" hint="All active" icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
          <StatCard label="Active Deals" value={stats?.activeDeals ?? 0} color="bg-purple-50" icon={<svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
          <StatCard label="Tasks Completed" value={stats?.completedTasks ?? 0} color="bg-green-50" hint="In selected range" icon={<svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <StatCard label="Overdue Tasks" value={stats?.overdueTasks ?? 0} color="bg-red-50" icon={<svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Deals by stage</h2>
            <DealsByStageChart data={dealsByStage} />
          </div>
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">KYC completion</h2>
            <KycChart kyc={kyc} />
          </div>
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Tasks completed per week</h2>
            <TasksPerWeekChart data={tasksCompletedPerWeek} />
          </div>
        </div>

        {commissionReporting && (
          <div className="card">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
              <h2 className="font-semibold text-gray-900">Commission & deal value</h2>
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={exportingCommission}
                onClick={async () => {
                  const params = getRangeParams();
                  if (!params) {
                    toast.error('Select a date range first');
                    return;
                  }
                  setExportingCommission(true);
                  try {
                    await dashboardApi.exportCommissionCsv(params);
                    toast.success('Commission report downloaded');
                  } catch {
                    toast.error('Export failed');
                  } finally {
                    setExportingCommission(false);
                  }
                }}
              >
                {exportingCommission ? 'Exporting…' : 'Export CSV'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Selected range: {rangeLabel()}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Closed in range</h3>
                <div className="flex gap-4 mb-3">
                  <div>
                    <p className="text-xl font-bold text-gray-900">{commissionReporting.closedInRange.count}</p>
                    <p className="text-xs text-gray-500">deals</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{formatMoney(commissionReporting.closedInRange.dealValue)}</p>
                    <p className="text-xs text-gray-500">deal value</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-700">{formatMoney(commissionReporting.closedInRange.commission)}</p>
                    <p className="text-xs text-gray-500">commission</p>
                  </div>
                </div>
                {commissionReporting.closedInRange.deals?.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {commissionReporting.closedInRange.deals.map((d) => (
                      <li key={d._id} className="flex justify-between gap-2 py-1 border-b border-gray-50 last:border-0">
                        <Link to={`/clients/${d._id}`} className="text-primary-600 hover:underline truncate">{d.name}</Link>
                        <span className="text-gray-500 whitespace-nowrap text-xs">
                          {formatMoney(d.dealValue)}
                          {d.expectedCommission > 0 && <span className="text-emerald-600 ml-1">· {formatMoney(d.expectedCommission)} comm.</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">No closed deals in this range</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Open pipeline</h3>
                <div className="flex gap-4 mb-3">
                  <div>
                    <p className="text-xl font-bold text-gray-900">{commissionReporting.openPipeline.count}</p>
                    <p className="text-xs text-gray-500">active deals</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{formatMoney(commissionReporting.openPipeline.dealValue)}</p>
                    <p className="text-xs text-gray-500">deal value</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-700">{formatMoney(commissionReporting.openPipeline.commission)}</p>
                    <p className="text-xs text-gray-500">expected commission</p>
                  </div>
                </div>
                <ul className="space-y-1 text-sm">
                  {commissionReporting.openPipeline.byStage?.map((row) => (
                    <li key={row.stage} className="flex justify-between py-1 text-gray-600">
                      <span>{row.stage} ({row.count})</span>
                      <span className="text-xs">
                        {formatMoney(row.dealValue)}
                        {row.commission > 0 && <span className="text-emerald-600 ml-1">· {formatMoney(row.commission)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card lg:col-span-2">
            <h2 className="font-semibold text-gray-900 mb-4">Focus list — contact today</h2>
            {focusList?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No priority clients flagged</p>
            ) : (
              <ul className="space-y-2">
                {focusList?.map((client) => (
                  <li key={client._id}>
                    <Link to={`/clients/${client._id}`} className="flex items-center gap-3 p-3 bg-amber-50/80 rounded-lg hover:bg-amber-100 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{client.name}</p>
                        <p className="text-xs text-amber-800">{client.reason}</p>
                      </div>
                      <span className="badge bg-white text-gray-600">{client.dealStatus}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Today's Appointments</h2>
            <Link to="/appointments" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          {todayAppointments?.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No appointments today</p>
          ) : (
            <ul className="space-y-3">
              {todayAppointments?.map((appt) => (
                <li key={appt._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary-700">{format(new Date(appt.dateTime), 'HH')}</span>
                    <span className="text-xs text-primary-500">{format(new Date(appt.dateTime), 'mm')}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appt.client?.name}</p>
                    <p className="text-xs text-gray-500">{appt.type} {appt.location ? `· ${appt.location}` : ''}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Today's Tasks</h2>
            <Link to="/tasks" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          {todayTasks?.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No tasks for today</p>
          ) : (
            <ul className="space-y-2">
              {todayTasks?.map((task) => (
                <li key={task._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <button type="button" onClick={() => completeTask(task._id)} className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 flex-shrink-0 transition-colors" aria-label="Complete task" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    {task.client && <p className="text-xs text-gray-400">{task.client.name}</p>}
                  </div>
                  <span className={`badge ${PRIORITY_COLOR[task.priority]}`}>{task.priority}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {overdueTasks?.length > 0 && (
        <div className="card border-red-100">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-semibold text-red-700">Overdue Tasks</h2>
            <span className="badge bg-red-100 text-red-700">{overdueTasks.length}</span>
          </div>
          <ul className="space-y-2">
            {overdueTasks.map((task) => (
              <li key={task._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-red-50">
                <button type="button" onClick={() => completeTask(task._id)} className="w-5 h-5 rounded-full border-2 border-red-300 hover:border-green-500 flex-shrink-0" aria-label="Complete task" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  <p className="text-xs text-red-500">Due {format(new Date(task.dueDate), 'MMM d')}</p>
                </div>
                {task.client && <span className="text-xs text-gray-400 hidden sm:block">{task.client.name}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {upcomingAppointments?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Upcoming Appointments</h2>
            <Link to="/appointments" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          <ul className="space-y-2">
            {upcomingAppointments.map((appt) => (
              <li key={appt._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex flex-col items-center justify-center flex-shrink-0 text-center">
                  <span className="text-xs font-bold text-gray-700">{format(new Date(appt.dateTime), 'MMM')}</span>
                  <span className="text-sm font-bold text-gray-900">{format(new Date(appt.dateTime), 'd')}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{appt.client?.name}</p>
                  <p className="text-xs text-gray-500">{format(new Date(appt.dateTime), 'h:mm a')} · {appt.type}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
