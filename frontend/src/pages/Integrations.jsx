import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { integrationsApi } from '../services/api';

export default function Integrations() {
  const [status, setStatus] = useState(null);
  const [crm, setCrm] = useState(null);
  const [bankQuery, setBankQuery] = useState('');
  const [banking, setBanking] = useState(null);
  const [loadingCrm, setLoadingCrm] = useState(true);
  const [loadingBank, setLoadingBank] = useState(false);

  useEffect(() => {
    integrationsApi.status().then((r) => setStatus(r.data)).catch(() => {});
    integrationsApi.crm()
      .then((r) => setCrm(r.data))
      .catch(() => toast.error('Failed to load CRM'))
      .finally(() => setLoadingCrm(false));
  }, []);

  const searchBanking = async (e) => {
    e?.preventDefault();
    if (!bankQuery.trim()) return;
    setLoadingBank(true);
    try {
      const r = await integrationsApi.banking(bankQuery.trim());
      setBanking(r.data);
    } catch {
      toast.error('Banking lookup failed');
    } finally {
      setLoadingBank(false);
    }
  };

  const crmRecords = crm?.records || [];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">Read-only CRM and core banking views. Configure API URLs in backend <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">.env</code>.</p>
      </div>

      {status && (
        <div className="flex flex-wrap gap-2">
          <span className={`badge ${status.crm?.configured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            CRM {status.crm?.configured ? 'live' : 'demo'}
          </span>
          <span className={`badge ${status.banking?.configured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            Banking {status.banking?.configured ? 'live' : 'demo'}
          </span>
          <span className={`badge ${status.ai?.openai ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}`}>
            AI {status.ai?.openai ? 'OpenAI' : 'rules'}
          </span>
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{status?.crm?.label || 'CRM'} (read-only)</h2>
        {crm?.message && <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">{crm.message}</p>}
        {loadingCrm ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : crmRecords.length === 0 ? (
          <p className="text-sm text-gray-400">No CRM records</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800">
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Stage</th>
                  <th className="py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {crmRecords.map((r, i) => (
                  <tr key={r.id || i} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="py-2 pr-4 text-gray-500">{r.id || r._id || '—'}</td>
                    <td className="py-2 pr-4 font-medium">{r.name || r.company || '—'}</td>
                    <td className="py-2 pr-4">{r.stage || r.dealStatus || r.status || '—'}</td>
                    <td className="py-2">{r.value != null ? Number(r.value).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{status?.banking?.label || 'Core banking'} (read-only)</h2>
        <form onSubmit={searchBanking} className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            className="input flex-1"
            placeholder="Phone or account number…"
            value={bankQuery}
            onChange={(e) => setBankQuery(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={loadingBank}>
            {loadingBank ? 'Searching…' : 'Lookup'}
          </button>
        </form>
        {banking?.message && <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">{banking.message}</p>}
        {banking?.accounts?.length > 0 ? (
          <ul className="space-y-2">
            {banking.accounts.map((a, i) => (
              <li key={a.accountId || i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm">
                <p className="font-medium">{a.product || a.type || 'Account'} · {a.accountId || a.id}</p>
                <p className="text-gray-500 mt-1">
                  {a.balance != null && <>Balance: {Number(a.balance).toLocaleString()} · </>}
                  Status: {a.status || '—'}
                  {a.kycVerified != null && <> · KYC: {a.kycVerified ? 'Yes' : 'No'}</>}
                </p>
              </li>
            ))}
          </ul>
        ) : banking && !loadingBank ? (
          <p className="text-sm text-gray-400">No accounts found</p>
        ) : null}
      </div>
    </div>
  );
}
