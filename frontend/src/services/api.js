import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

const persistSession = ({ token, refreshToken, user }) => {
  if (token) localStorage.setItem('token', token);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  if (user) localStorage.setItem('user', JSON.stringify(user));
};

const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const isAuthRoute =
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/register') ||
      original?.url?.includes('/auth/refresh') ||
      original?.url?.includes('/auth/forgot-password') ||
      original?.url?.includes('/auth/reset-password');

    if (err.response?.status !== 401 || original?._retry || isAuthRoute) {
      return Promise.reject(err);
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      clearSession();
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/forgot-password') &&
          !window.location.pathname.startsWith('/reset-password')) {
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }

    if (refreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    refreshing = true;

    try {
      const { data } = await axios.post('/api/auth/refresh', { refreshToken });
      persistSession(data);
      processQueue(null, data.token);
      original.headers.Authorization = `Bearer ${data.token}`;
      return api(original);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      clearSession();
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/forgot-password') &&
          !window.location.pathname.startsWith('/reset-password')) {
        window.location.href = '/login';
      }
      return Promise.reject(refreshErr);
    } finally {
      refreshing = false;
    }
  }
);

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export { persistSession, clearSession };

async function downloadFile(path, filename, params) {
  const res = await api.get(path, { responseType: 'blob', params });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const clientsApi = {
  list: (params) => api.get('/clients', { params }),
  get: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
  restore: (id) => api.post(`/clients/${id}/restore`),
  deleted: () => api.get('/clients/deleted'),
  stale: () => api.get('/clients/stale'),
  checkDuplicates: (data) => api.post('/clients/check-duplicates', data),
  importPreview: (csv) => api.post('/clients/import/preview', { csv }),
  importCsv: (csv) => api.post('/clients/import', { csv }),
  exportCsv: () => downloadFile('/clients/export/csv', `finovatrack-clients-${new Date().toISOString().slice(0, 10)}.csv`),
  exportFull: () => downloadFile('/clients/export/full', `finovatrack-clients-full-${new Date().toISOString().slice(0, 10)}.csv`),
  exportPipelinePdf: () => downloadFile('/clients/export/pipeline-pdf', 'pipeline-report.pdf'),
  backupPreferences: () => api.get('/clients/backup/preferences'),
  updateBackupPreferences: (data) => api.put('/clients/backup/preferences', data),
  sendBackupNow: () => api.post('/clients/backup/send-now'),
  logContact: (id, note) => api.patch(`/clients/${id}/contact`, { note }),
  addActivity: (id, data) => api.post(`/clients/${id}/activities`, data),
};

export const tasksApi = {
  list: (params) => api.get('/tasks', { params }),
  exportCsv: () => downloadFile('/tasks/export/csv', `finovatrack-tasks-${new Date().toISOString().slice(0, 10)}.csv`),
  templates: () => api.get('/tasks/templates'),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  complete: (id) => api.patch(`/tasks/${id}/complete`),
  delete: (id) => api.delete(`/tasks/${id}`),
  bulkComplete: (ids) => api.post('/tasks/bulk/complete', { ids }),
  bulkDelete: (ids) => api.post('/tasks/bulk/delete', { ids }),
};

/** Normalize list response: plain array (no pagination) or { tasks, total, page, pages }. */
export function parseTaskList(data) {
  if (Array.isArray(data)) {
    return { tasks: data, total: data.length, page: 1, pages: 1, limit: data.length };
  }
  return data;
}

/** Normalize client list: plain array or { clients, total, page, pages }. */
export function parseClientList(data) {
  if (Array.isArray(data)) {
    return { clients: data, total: data.length, page: 1, pages: 1, limit: data.length };
  }
  return data;
}

export const appointmentsApi = {
  list: (params) => api.get('/appointments', { params }),
  exportCsv: () => downloadFile('/appointments/export/csv', `finovatrack-appointments-${new Date().toISOString().slice(0, 10)}.csv`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  delete: (id) => api.delete(`/appointments/${id}`),
  logCall: (id, data) => api.post(`/appointments/${id}/log-call`, data),
  complete: (id, data) => api.patch(`/appointments/${id}/complete`, data),
  calendarLinks: (id) => api.get(`/appointments/${id}/calendar-links`),
};

export const dashboardApi = {
  stats: (params) => api.get('/dashboard/stats', { params }),
  updateTargets: (data) => api.put('/dashboard/targets', data),
  sendSummary: (period) => api.post('/dashboard/send-summary', { period }),
  exportCommissionCsv: (params) => downloadFile(
    '/dashboard/commission-export/csv',
    `finovatrack-commission-${new Date().toISOString().slice(0, 10)}.csv`,
    params
  ),
};

export const notificationsApi = {
  list: () => api.get('/notifications'),
  summary: () => api.get('/notifications/summary'),
  dismiss: (key) => api.patch(`/notifications/dismiss/${encodeURIComponent(key)}`),
  dismissAll: () => api.patch('/notifications/dismiss-all'),
  preferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data) => api.put('/notifications/preferences', data),
  sendDigestNow: () => api.post('/notifications/digest/send-now'),
  vapidPublicKey: () => api.get('/notifications/vapid-public-key'),
  pushSubscribe: (data) => api.post('/notifications/push/subscribe', data),
  pushUnsubscribe: (data) => api.delete('/notifications/push/subscribe', { data }),
};

export const auditApi = {
  list: (params) => api.get('/audit-log', { params }),
};

export const integrationsApi = {
  status: () => api.get('/integrations/status'),
  crm: (params) => api.get('/integrations/crm', { params }),
  banking: (q) => api.get('/integrations/banking', { params: { q } }),
};

export default api;
