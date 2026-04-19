const DocumentIntelligence = require('@azure-rest/ai-document-intelligence').default;
const { getLongRunningPoller, isUnexpected } = require('@azure-rest/ai-document-intelligence');

let client = null;

function getClient() {
  if (client) return client;
  const endpoint = process.env.AZURE_DOC_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOC_INTELLIGENCE_KEY;
  if (!endpoint || !key) {
    throw new Error('Azure Document Intelligence not configured. Set AZURE_DOC_INTELLIGENCE_ENDPOINT and AZURE_DOC_INTELLIGENCE_KEY.');
  }
  client = DocumentIntelligence(endpoint, { key });
  return client;
}

function isConfigured() {
  return Boolean(process.env.AZURE_DOC_INTELLIGENCE_ENDPOINT && process.env.AZURE_DOC_INTELLIGENCE_KEY);
}

async function analyzeInvoice(fileBuffer) {
  const docClient = getClient();
  const base64Source = fileBuffer.toString('base64');

  const initialResponse = await docClient
    .path('/documentModels/{modelId}:analyze', 'prebuilt-invoice')
    .post({
      contentType: 'application/json',
      body: { base64Source },
    });

  if (isUnexpected(initialResponse)) {
    const errorMsg = initialResponse.body?.error?.message || 'Azure Document Intelligence analysis failed';
    throw new Error(errorMsg);
  }

  const poller = getLongRunningPoller(docClient, initialResponse);
  const result = await poller.pollUntilDone();
  return result.body.analyzeResult;
}

module.exports = { analyzeInvoice, isConfigured };
