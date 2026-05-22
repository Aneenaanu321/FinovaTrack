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

export default function ClientImportModal({ open, onClose, onImported }) {
  const inputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const reset = () => {
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const csv = await fileToCsv(file);
      const { data } = await clientsApi.importCsv(csv);
      setResult(data);
      if (data.created > 0) {
        toast.success(`Imported ${data.created} client${data.created === 1 ? '' : 's'}`);
        onImported?.();
      } else if (!data.skipped?.length && !data.errors?.length) {
        toast.error('No rows found in file');
      } else {
        toast.error('No clients imported — check skipped rows');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import clients">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Upload a CSV or Excel file (.csv, .xlsx, .xls). The first row must be column headers.
          Duplicate email or phone rows are skipped.
        </p>
        <p className="text-xs text-gray-500 font-mono break-all">{TEMPLATE_HEADERS}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary text-sm" onClick={downloadTemplate}>
            Download template
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={importing}
            onClick={() => inputRef.current?.click()}
          >
            {importing ? 'Importing…' : 'Choose file'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={handleFile}
          />
        </div>
        {result && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm space-y-2">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              Created: {result.created}
            </p>
            {result.skipped?.length > 0 && (
              <div>
                <p className="text-amber-700 dark:text-amber-400 font-medium">Skipped ({result.skipped.length})</p>
                <ul className="mt-1 text-xs text-gray-600 dark:text-gray-400 max-h-24 overflow-y-auto">
                  {result.skipped.map((s, i) => (
                    <li key={i}>{s.name}: {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.errors?.length > 0 && (
              <div>
                <p className="text-red-600 font-medium">Errors ({result.errors.length})</p>
                <ul className="mt-1 text-xs text-gray-600 max-h-24 overflow-y-auto">
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
