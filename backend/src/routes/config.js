const express = require('express');

const router = express.Router();

router.get('/public', (_req, res) => {
  const hasSmtp =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  res.json({
    allowRegistration: process.env.ALLOW_REGISTRATION !== 'false',
    defaultHomeRoute: process.env.DEFAULT_HOME_ROUTE || '/attention',
    emailNotificationsAvailable: !!hasSmtp,
  });
});

module.exports = router;
