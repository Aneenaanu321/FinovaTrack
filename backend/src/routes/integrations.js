const express = require('express');
const auth = require('../middleware/auth');
const { fetchExternalJson } = require('../utils/externalFetch');

const router = express.Router();
router.use(auth);

router.get('/status', (req, res) => {
  res.json({
    crm: { configured: !!process.env.CRM_API_URL, label: process.env.CRM_LABEL || 'CRM' },
    banking: { configured: !!process.env.BANKING_API_URL, label: process.env.BANKING_LABEL || 'Core Banking' },
    ai: { openai: !!process.env.OPENAI_API_KEY, rulesFallback: true },
  });
});

router.get('/crm', async (req, res) => {
  try {
    const base = process.env.CRM_API_URL;
    if (!base) {
      return res.json({
        configured: false,
        source: 'demo',
        records: [
          { id: 'CRM-1001', name: 'Sample Corp', stage: 'Proposal', owner: 'External CRM', value: 50000 },
          { id: 'CRM-1002', name: 'Retail Lead', stage: 'Qualified', owner: 'External CRM', value: 12000 },
        ],
        message: 'Set CRM_API_URL in backend .env to load live read-only data.',
      });
    }

    const url = new URL(base);
    if (req.query.limit) url.searchParams.set('limit', req.query.limit);
    const headers = {};
    if (process.env.CRM_API_KEY) headers.Authorization = `Bearer ${process.env.CRM_API_KEY}`;

    const result = await fetchExternalJson(url.toString(), { headers });
    if (result.error) {
      return res.status(502).json({ configured: true, message: result.error, records: [] });
    }

    const raw = result.data;
    const records = Array.isArray(raw)
      ? raw
      : raw.records || raw.data || raw.contacts || raw.leads || [];

    res.json({ configured: true, source: 'live', records });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/banking', async (req, res) => {
  try {
    const q = (req.query.q || req.query.phone || req.query.account || '').trim();
    const base = process.env.BANKING_API_URL;

    if (!base) {
      if (!q) {
        return res.json({
          configured: false,
          source: 'demo',
          accounts: [],
          message: 'Search by phone or account number. Set BANKING_API_URL for live data.',
        });
      }
      return res.json({
        configured: false,
        source: 'demo',
        query: q,
        accounts: [
          {
            accountId: '****4521',
            product: 'Savings',
            balance: 125000,
            status: 'Active',
            kycVerified: true,
          },
        ],
        message: 'Demo data only — configure BANKING_API_URL for read-only core banking API.',
      });
    }

    const url = new URL(base);
    url.searchParams.set('q', q);
    const headers = {};
    if (process.env.BANKING_API_KEY) headers.Authorization = `Bearer ${process.env.BANKING_API_KEY}`;

    const result = await fetchExternalJson(url.toString(), { headers });
    if (result.error) {
      return res.status(502).json({ configured: true, query: q, message: result.error, accounts: [] });
    }

    const raw = result.data;
    const accounts = Array.isArray(raw)
      ? raw
      : raw.accounts || raw.data || (raw.account ? [raw.account] : []);

    res.json({ configured: true, source: 'live', query: q, accounts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
