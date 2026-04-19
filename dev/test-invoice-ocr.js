/**
 * Standalone test: send WhatsApp invoice to Azure and inspect normalized output.
 * Usage: node dev/test-invoice-ocr.js
 */
const dotenvPath = require('path').join(__dirname, '..', 'backend', '.env');
require(require('path').join(__dirname, '..', 'backend', 'node_modules', 'dotenv')).config({ path: dotenvPath });

const fs = require('fs');
const path = require('path');
const { analyzeInvoice } = require('../backend/utils/azureDocIntelligence');
const { normalize } = require('../backend/utils/invoiceNormalizer');

const INVOICE_PATH = path.join(__dirname, 'ocrTEST', 'WhatsApp Image 2026-04-19 at 16.19.08.jpeg');

async function main() {
  console.log('Reading invoice:', INVOICE_PATH);
  const buf = fs.readFileSync(INVOICE_PATH);
  console.log(`File size: ${buf.length} bytes\n`);

  console.log('Sending to Azure Document Intelligence...');
  const raw = await analyzeInvoice(buf);

  const result = normalize(raw);
  console.log('=== INVOICE META ===');
  console.log(JSON.stringify(result.invoiceMeta, null, 2));

  console.log('\n=== LINE ITEMS (' + result.lineItems.length + ' rows) ===');
  let sumLineTotal = 0;
  let sumComputed = 0;
  result.lineItems.forEach((li, i) => {
    const computed = (Number(li.unitPrice) || 0) * Math.max(1, li.quantity || 1);
    const azLT = li.lineTotal != null ? Number(li.lineTotal) : null;
    sumComputed += computed;
    if (azLT != null) sumLineTotal += azLT;
    const mismatch = azLT != null && Math.abs(azLT - computed) > 0.01 ? ' *** MISMATCH ***' : '';
    console.log(
      `  [${i + 1}] "${li.description}"` +
      `  qty=${li.quantity}  unitPrice=${li.unitPrice}  lineTotal=${li.lineTotal}` +
      `  computed=${computed.toFixed(2)}  conf=${li.confidence != null ? (li.confidence * 100).toFixed(0) + '%' : '—'}` +
      mismatch
    );
  });

  console.log('\n=== TOTALS ===');
  console.log('Invoice header totalAmount:', result.invoiceMeta.totalAmount);
  console.log('Sum of Azure lineTotals:', sumLineTotal.toFixed(2));
  console.log('Sum of computed (unitPrice*qty):', sumComputed.toFixed(2));
  console.log('Diff (header - sumLineTotal):', (result.invoiceMeta.totalAmount - sumLineTotal).toFixed(2));
  console.log('Diff (header - sumComputed):', (result.invoiceMeta.totalAmount - sumComputed).toFixed(2));

  // Check non-inventory pattern (must match the ManageItemsPage.vue logic)
  const nonInvPatternEn = /\b(shipping|delivery|deliver|freight|tax|vat|gst|fee|service\s?charge|install(ation)?|assembly|labour|labor|discount|handling|surcharge|rebate|credit|adjustment|deposit|setup|support|maintenance|bundling|recycling|no\s?charge|foc|free\s?of\s?charge|pre.?install)\b/i;
  const nonInvPatternCJK = /送貨|運費|砌機|安裝|組裝|回收|稅|服務費/;
  console.log('\n=== NON-INVENTORY DETECTION ===');
  let nonInvTotal = 0;
  let invTotal = 0;
  result.lineItems.forEach((li, i) => {
    const isNonInv = nonInvPatternEn.test(li.description) || nonInvPatternCJK.test(li.description) || (li.unitPrice != null && Number(li.unitPrice) <= 0);
    const rowTotal = (Number(li.unitPrice) || 0) * Math.max(1, li.quantity || 1) || (Number(li.lineTotal) || 0);
    if (isNonInv) {
      nonInvTotal += rowTotal;
      console.log(`  [${i + 1}] NON-INV: "${li.description}" total=$${rowTotal}`);
    } else {
      invTotal += rowTotal;
    }
  });
  console.log(`\n  Inventory total: $${invTotal.toFixed(2)}`);
  console.log(`  Non-inventory total: $${nonInvTotal.toFixed(2)}`);
  console.log(`  Sum: $${(invTotal + nonInvTotal).toFixed(2)}`);
  console.log(`  Invoice header: $${result.invoiceMeta.totalAmount}`);
  console.log(`  Unreconciled: $${(result.invoiceMeta.totalAmount - invTotal - nonInvTotal).toFixed(2)}`);

  console.log('\n=== WARNINGS ===');
  result.warnings.forEach(w => console.log('  ' + w));

  console.log('\nDone.');
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
