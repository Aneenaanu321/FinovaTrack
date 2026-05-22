const TIMEOUT_MS = 12000;

async function fetchExternalJson(url, options = {}) {
  if (!url) return { configured: false, data: null, error: 'Not configured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    const res = await fetch(url, { method: options.method || 'GET', headers, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return { configured: true, data: null, error: `Upstream returned ${res.status}` };
    }
    const data = await res.json();
    return { configured: true, data, error: null };
  } catch (err) {
    clearTimeout(timer);
    return { configured: true, data: null, error: err.message || 'Request failed' };
  }
}

module.exports = { fetchExternalJson };
