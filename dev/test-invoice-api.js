/**
 * Test script for Invoice Import API endpoint
 * Usage: node dev/test-invoice-api.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

async function login() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ username: 'admin', password: 'admin123' });
    const req = http.request({
      hostname: 'localhost', port: 5002,
      path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.token) resolve(parsed.token);
        else reject(new Error('Login failed: ' + data));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function testInvoice(token, filePath, mimeType) {
  return new Promise((resolve, reject) => {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const boundary = '----FormBoundary' + Date.now();

    const head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="invoiceFile"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
      'utf-8'
    );
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    const payload = Buffer.concat([head, fileBuffer, tail]);

    const req = http.request({
      hostname: 'localhost', port: 5002,
      path: '/api/invoice-import/analyze', method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${token}`,
        'Content-Length': payload.length
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: JSON.parse(data) });
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('=== Invoice Import API Test ===\n');
  
  console.log('1. Logging in as admin...');
  const token = await login();
  console.log('   Token obtained.\n');

  const testFiles = [
    { path: path.resolve(__dirname, 'ocrTEST/invioce2.png'), mime: 'image/png', label: 'invioce2.png (Dell invoice)' },
    { path: path.resolve(__dirname, 'ocrTEST/WhatsApp Image 2026-04-19 at 16.19.08.jpeg'), mime: 'image/jpeg', label: 'WhatsApp JPEG (HK PC build invoice)' },
    { path: path.resolve(__dirname, 'ocrTEST/1.webp'), mime: 'image/webp', label: '1.webp (WebP format)' },
  ];

  for (const tf of testFiles) {
    console.log(`2. Testing: ${tf.label}`);
    console.log(`   File: ${tf.path}`);
    console.log(`   Size: ${fs.statSync(tf.path).size} bytes`);
    
    const start = Date.now();
    const result = await testInvoice(token, tf.path, tf.mime);
    const elapsed = Date.now() - start;

    console.log(`   Status: ${result.status} (${elapsed}ms)`);
    
    if (result.body.success) {
      const meta = result.body.invoiceMeta || {};
      console.log(`   SUCCESS`);
      console.log(`   Confidence: ${result.body.confidence}`);
      console.log(`   Vendor: ${meta.supplier}`);
      console.log(`   Invoice#: ${meta.invoiceNumber}`);
      console.log(`   Date: ${meta.purchaseDate}`);
      console.log(`   Total: ${meta.totalAmount} ${meta.currency}`);
      console.log(`   Line items: ${(result.body.lineItems || []).length}`);
      if (result.body.warnings && result.body.warnings.length > 0) {
        console.log(`   Warnings: ${result.body.warnings.join('; ')}`);
      }
      (result.body.lineItems || []).forEach((li, i) => {
        console.log(`     [${i+1}] ${li.description?.substring(0,60) || '(no desc)'} | qty=${li.quantity} | unit=$${li.unitPrice} | total=$${li.lineTotal}`);
      });
    } else {
      console.log(`   FAILED: ${result.body.error || JSON.stringify(result.body)}`);
    }
    console.log('');
  }

  console.log('=== Tests complete ===');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
