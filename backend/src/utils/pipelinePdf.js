const PDFDocument = require('pdfkit');

function buildPipelinePdf(clients, userName) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('FinovaTrack — Pipeline Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()} · ${userName || 'User'}`, { align: 'center' });
    doc.moveDown(1.5);
    doc.fillColor('#000');

    const stages = ['New', 'Contacted', 'Interested', 'Closed'];
    const byStage = Object.fromEntries(stages.map((s) => [s, []]));
    for (const c of clients) {
      if (byStage[c.dealStatus]) byStage[c.dealStatus].push(c);
    }

    let totalValue = 0;
    let totalCommission = 0;
    for (const c of clients) {
      totalValue += c.dealValue || 0;
      totalCommission += c.expectedCommission || 0;
    }

    doc.fontSize(12).text(`Total clients: ${clients.length}  |  Pipeline value: $${totalValue.toLocaleString()}  |  Expected commission: $${totalCommission.toLocaleString()}`);
    doc.moveDown(1);

    for (const stage of stages) {
      const list = byStage[stage];
      doc.fontSize(14).fillColor('#1d4ed8').text(`${stage} (${list.length})`);
      doc.fillColor('#000').fontSize(10);
      if (list.length === 0) {
        doc.text('  — none —', { indent: 10 });
      } else {
        for (const c of list) {
          const extras = [
            c.productType,
            c.dealValue ? `$${c.dealValue}` : null,
            c.leadSource,
          ].filter(Boolean).join(' · ');
          doc.text(`• ${c.name}${extras ? ` (${extras})` : ''}`, { indent: 10 });
        }
      }
      doc.moveDown(0.8);
    }

    doc.end();
  });
}

module.exports = { buildPipelinePdf };
