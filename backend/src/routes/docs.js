const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const swaggerUi = require('swagger-ui-express');

const router = express.Router();

function loadSpec() {
  const specPath = path.join(__dirname, '../../openapi.yaml');
  const raw = fs.readFileSync(specPath, 'utf8');
  return yaml.parse(raw);
}

const spec = loadSpec();

router.get('/openapi.json', (_req, res) => {
  res.json(spec);
});

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(spec, { customSiteTitle: 'FinovaTrack API' }));

module.exports = router;
