/**
 * Normalize Azure Document Intelligence prebuilt-invoice result
 * into the stable JSON schema consumed by the frontend.
 */

function safeString(field) {
  if (!field) return '';
  return field.valueString || field.content || '';
}

function safeDate(field) {
  if (!field) return '';
  if (field.valueDate) return field.valueDate;
  // Fallback: try to parse content as date
  const content = field.content || '';
  if (!content) return '';
  const d = new Date(content);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return content;
}

function safeCurrencyAmount(field) {
  if (!field) return null;
  if (field.valueCurrency && field.valueCurrency.amount != null) {
    return field.valueCurrency.amount;
  }
  if (field.valueNumber != null) return field.valueNumber;
  // Try parsing from content
  const content = field.content || '';
  const num = parseFloat(content.replace(/[^0-9.\-]/g, ''));
  return isNaN(num) ? null : num;
}

function safeCurrencyCode(field) {
  if (!field) return '';
  if (field.valueCurrency && field.valueCurrency.currencyCode) {
    return field.valueCurrency.currencyCode;
  }
  return '';
}

function safeNumber(field) {
  if (!field) return null;
  if (field.valueNumber != null) return field.valueNumber;
  const content = field.content || '';
  const num = parseFloat(content.replace(/[^0-9.\-]/g, ''));
  return isNaN(num) ? null : num;
}

function normalize(analyzeResult) {
  const warnings = [];

  if (!analyzeResult || !analyzeResult.documents || analyzeResult.documents.length === 0) {
    return {
      success: true,
      invoiceMeta: {},
      lineItems: [],
      warnings: ['No invoice data detected in document.'],
      confidence: 0,
    };
  }

  const doc = analyzeResult.documents[0];
  const fields = doc.fields || {};

  // --- Invoice header ---
  const supplier = safeString(fields.VendorName);
  const invoiceNumber = safeString(fields.InvoiceId);
  const purchaseDate = safeDate(fields.InvoiceDate);
  const orderID = safeString(fields.PurchaseOrder);
  const totalAmount = safeCurrencyAmount(fields.InvoiceTotal);
  const subtotal = safeCurrencyAmount(fields.SubTotal);
  const totalTax = safeCurrencyAmount(fields.TotalTax);
  const customerName = safeString(fields.CustomerName);

  // Determine currency from first available currency field
  let currency = safeCurrencyCode(fields.InvoiceTotal)
    || safeCurrencyCode(fields.SubTotal)
    || safeCurrencyCode(fields.AmountDue)
    || 'HKD';

  if (!supplier) warnings.push('Vendor name not detected.');
  if (!invoiceNumber) warnings.push('Invoice number not detected.');

  const invoiceMeta = {
    supplier,
    invoiceNumber,
    purchaseDate,
    orderID,
    totalAmount,
    subtotal,
    totalTax,
    currency,
    customerName,
  };

  // --- Line items ---
  const itemsField = fields.Items;
  const lineItems = [];

  if (itemsField && itemsField.valueArray) {
    for (const entry of itemsField.valueArray) {
      const itemFields = entry.valueObject || {};

      const description = safeString(itemFields.Description);
      const quantity = safeNumber(itemFields.Quantity) || 1;
      const unitPrice = safeCurrencyAmount(itemFields.UnitPrice);
      const lineTotal = safeCurrencyAmount(itemFields.Amount);
      const productCode = safeString(itemFields.ProductCode);
      const unit = safeString(itemFields.Unit);
      const confidence = entry.confidence != null ? entry.confidence : null;

      lineItems.push({
        description,
        quantity,
        unitPrice,
        lineTotal,
        productCode,
        unit: unit || null,
        confidence,
      });
    }
  }

  if (lineItems.length === 0) {
    warnings.push('No line items detected in invoice.');
  }

  // Low-confidence warnings
  for (let i = 0; i < lineItems.length; i++) {
    if (lineItems[i].confidence != null && lineItems[i].confidence < 0.5) {
      warnings.push(`Line item ${i + 1} ("${lineItems[i].description || 'unnamed'}") has low confidence (${(lineItems[i].confidence * 100).toFixed(0)}%).`);
    }
  }

  const overallConfidence = doc.confidence != null ? doc.confidence : null;

  return {
    success: true,
    invoiceMeta,
    lineItems,
    warnings,
    confidence: overallConfidence,
  };
}

module.exports = { normalize };
