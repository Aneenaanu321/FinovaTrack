import api from '../services/api';

function datedFilename(base, ext) {
  const date = new Date().toISOString().slice(0, 10);
  return `${base}-${date}.${ext}`;
}

export async function downloadClientsCsv() {
  const res = await api.get('/clients/export/full', { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = datedFilename('finovatrack-clients-full', 'csv');
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadClientsExcel() {
  const res = await api.get('/clients/export/full', { responseType: 'text' });
  const XLSX = await import('xlsx');
  const wb = XLSX.read(res.data, { type: 'string' });
  XLSX.writeFile(wb, datedFilename('finovatrack-clients-full', 'xlsx'));
}
