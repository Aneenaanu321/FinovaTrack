import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { clientsApi } from '../services/api';
import Modal from './Modal';

const TEMPLATE_HEADERS = 'name,phone,email,productType,dealValue,expectedCommission,leadSource,dealStatus,kycStatus,lastContactedAt,nextFollowUpDate,notes,nextAction';
const SAMPLE_ROW = 'Jane Doe,+15551234567,jane@example.com,Savings,5000,250,Referral,New,Not Started,,Follow up call,';

async function fileToCsv(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_csv(sheet);
  }
  return file.text();
}

function downloadTemplate() {
  const csv = `${TEMPLATE_HEADERS}\n${SAMPLE_ROW}`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clients-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function formatDuplicateDetail(s) {
  if (s.duplicates?.length) {
    const d = s.duplicates[0];
    const fields = s.matchedOn?.join(' & ') || 'email/phone';
    return `Matches ${d.name} (${fields})`;
  }
  return s.reason;
}

export default function ClientImportModal({ open, onClose, onImported }) {
  const inputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [pendingCsv, setPendingCsv] = useState(null);

  const reset = () => {
    setResult(null);
    setPreview(null);
    setPendingCsv(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const runPreview = async (csv) => {
    setPreviewing(true);
    setPreview(null);
    setResult(null);
    try {
      const { data } = await clientsApi.importPreview(csv);
      setPreview(data);
      setPendingCsv(csv);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const confirmImport = async () => {
    if (!pendingCsv) return;
    setImporting(true);
    try {
      const { data } = await clientsApi.importCsv(pendingCsv);
      setResult(data);
      setPreview(null);
      if (data.created > 0) {
        toast.success(`Imported ${data.created} client${data.created === 1 ? '' : 's'}`);
        onImported?.();
      } else if (!data.skipped?.length && !data.errors?.length) {
        toast.error('No rows imported');
      } else {
        toast.error('No clients imported — see skipped rows');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const csv = await fileToCsv(file);
      await runPreview(csv);
    } catch {
      toast.error('Could not read file');
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import clients">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Upload CSV or Excel (.csv, .xlsx, .xls). Rows with the same email or phone as an existing client — or another row in the file — are skipped.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">{TEMPLATE_HEADERS}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary text-sm" onClick={downloadTemplate}>
            Download template
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={importing || previewing}
            onClick={() => inputRef.current?.click()}
          >
            {previewing ? 'Checking…' : 'Choose file'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        {preview && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm space-y-3">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              Preview: {preview.summary.ok} to import, {preview.summary.duplicate} duplicate(s), {preview.summary.error} error(s)
            </p>
            <ul className="max-h-40 overflow-y-auto text-xs space-y-1.5">
              {preview.preview.map((row, i) => (
                <li
                  key={i}
                  className={
                    row.status === 'ok'
                      ? 'text-green-700 dark:text-green-400'
                      : row.status === 'duplicate'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                  }
                >
                  <span className="font-medium">{row.name}</span>
                  {' — '}
                  {row.status === 'ok' ? 'Ready' : row.status === 'duplicate' ? formatDuplicateDetail(row) : row.reason}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={importing || preview.summary.ok === 0}
                onClick={confirmImport}
              >
                {importing ? 'Importing…' : `Import ${preview.summary.ok} client${preview.summary.ok === 1 ? '' : 's'}`}
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={reset}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm space-y-2">
            <p className="font-medium text-gray-900 dark:text-gray-100">Created: {result.created}</p>
            {result.skipped?.length > 0 && (
              <div>
                <p className="text-amber-700 dark:text-amber-400 font-medium">Skipped ({result.skipped.length})</p>
                <ul className="mt-1 text-xs text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto space-y-1">
                  {result.skipped.map((s, i) => (
                    <li key={i}>
                      <span className="font-medium">{s.name}</span>: {formatDuplicateDetail(s)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.errors?.length > 0 && (
              <div>
                <p className="text-red-600 dark:text-red-400 font-medium">Errors ({result.errors.length})</p>
                <ul className="mt-1 text-xs text-gray-600 dark:text-gray-400 max-h-24 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button type="button" className="btn-secondary" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
