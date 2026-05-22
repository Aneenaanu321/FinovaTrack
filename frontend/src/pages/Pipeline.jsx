import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clientsApi } from '../services/api';
import { DEAL_STEPS, KYC_COLOR } from '../constants/clients';
import { CardSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ClientPhoneActions from '../components/ClientPhoneActions';

export default function Pipeline() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const load = () => {
    setLoading(true);
    clientsApi
      .list({ limit: 200 })
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data.clients || [];
        setClients(list);
      })
      .catch(() => toast.error('Failed to load pipeline'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const byStage = DEAL_STEPS.reduce((acc, stage) => {
    acc[stage] = clients.filter((c) => c.dealStatus === stage);
    return acc;
  }, {});

  const onDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const onDrop = async (e, stage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    setDragId(null);
    const client = clients.find((c) => c._id === id);
    if (!client || client.dealStatus === stage) return;

    setClients((prev) =>
      prev.map((c) => (c._id === id ? { ...c, dealStatus: stage } : c))
    );
    try {
      await clientsApi.update(id, { dealStatus: stage });
      toast.success(`Moved to ${stage}`);
    } catch {
      toast.error('Failed to update deal stage');
      load();
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const exportPdf = async () => {
    setExportingPdf(true);
    try {
      await clientsApi.exportPipelinePdf();
      toast.success('Pipeline report downloaded');
    } catch {
      toast.error('Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="max-w-[100rem] space-y-5 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Deal pipeline</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Drag cards between columns to update deal status</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary min-h-[44px]"
            onClick={exportPdf}
            disabled={exportingPdf}
          >
            {exportingPdf ? 'Exporting…' : 'Export PDF'}
          </button>
          <Link to="/clients" className="btn-secondary min-h-[44px] inline-flex items-center">
            List view
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {DEAL_STEPS.map((s) => (
            <div key={s} className="space-y-3">
              <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          title="No clients in pipeline"
          description="Add clients and track them through New → Contacted → Interested → Closed."
          action={<Link to="/clients" className="btn-primary min-h-[44px] inline-flex items-center">Add your first client</Link>}
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
          {DEAL_STEPS.map((stage) => (
            <div
              key={stage}
              className="flex-shrink-0 w-72 sm:w-80 snap-start"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, stage)}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{stage}</h2>
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {byStage[stage].length}
                </span>
              </div>
              <div
                className={`min-h-[200px] rounded-xl border-2 border-dashed p-2 space-y-2 transition-colors ${
                  dragId ? 'border-primary-300 dark:border-primary-700 bg-primary-50/30 dark:bg-primary-900/10' : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30'
                }`}
              >
                {byStage[stage].map((c) => (
                  <div
                    key={c._id}
                    draggable
                    onDragStart={(e) => onDragStart(e, c._id)}
                    onDragEnd={() => setDragId(null)}
                    className="card p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow touch-manipulation"
                  >
                    <Link to={`/clients/${c._id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 text-sm block">
                      {c.name}
                    </Link>
                    {c.phone && (
                      <div className="mt-1">
                        <p className="text-xs text-gray-500">{c.phone}</p>
                        <ClientPhoneActions phone={c.phone} clientName={c.name} compact className="mt-1" />
                      </div>
                    )}
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      <span className={`badge ${KYC_COLOR[c.kycStatus]}`}>KYC: {c.kycStatus}</span>
                    </div>
                    {c.nextAction && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded mt-2 truncate">
                        {c.nextAction}
                      </p>
                    )}
                  </div>
                ))}
                {byStage[stage].length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-8">Drop clients here</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
