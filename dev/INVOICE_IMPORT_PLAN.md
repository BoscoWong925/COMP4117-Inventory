# Import from Invoice — Implementation Plan (Azure AI Document Intelligence)

> Revised: pivoted from local-only Tesseract.js heuristics to Azure AI Document Intelligence `prebuilt-invoice` model for the batch import workflow.

---

## 1. Why the plan should shift to Azure

### Local heuristic parsing (previous plan)

| Aspect | Assessment |
|---|---|
| Line-item detection | Custom regex scoring per line; brittle, highly format-dependent |
| Header extraction | `smartExtractData()` — pattern matching for ~8 fields; no structured table awareness |
| Scanned PDF | Tesseract.js OCR at ~40-80% confidence; no table layout understanding |
| Multi-currency | hard-coded regex for HK$, $, €, £, ¥ |
| Maintenance | Every new invoice format requires new regex tuning |
| Line-item accuracy | Poor on dense or multi-column invoices — lines jumble together |

### Azure AI Document Intelligence `prebuilt-invoice` model

| Aspect | Assessment |
|---|---|
| Line-item detection | Purpose-built model returns structured `Items[]` array with Description, Quantity, UnitPrice, Amount, ProductCode, Tax, Unit, Date |
| Header extraction | Returns typed fields: VendorName, InvoiceId, InvoiceDate, PurchaseOrder, InvoiceTotal, SubTotal, TotalTax, CustomerName, etc. |
| Scanned PDF | Handles scanned and digital PDFs natively with high-quality OCR + layout analysis |
| Multi-currency | `currency` type fields include both amount and currencyCode |
| Maintenance | Zero — Azure maintains and updates the model |
| Line-item accuracy | Trained on millions of invoices; understands table structure, not just text lines |
| Cost | Free tier: 500 pages/month; S0: ~$1/100 pages — negligible for a university project |

**Conclusion**: Azure gives us structured, typed, high-confidence invoice parsing with zero regex maintenance. The local heuristic approach was an acceptable fallback for MVP but would have been the weakest link in the entire workflow. With Azure already in use for email (Azure Communication Services) and database (Cosmos DB), adding Document Intelligence stays within the project's existing Azure ecosystem.

**What stays local**: The existing single-item Invoice Assist in the Manual Add form continues to use Tesseract.js. It serves a different purpose (quick field fill for one item) and doesn't need the Azure round-trip.

---

## 2. Recommended UX approach

| Option | Pros | Cons |
|---|---|---|
| **New page** | Clean separation; no ManageItemsPage bloat | Extra routing; context switch for operator; can't see existing items |
| **Modal** | Quick overlay | Far too cramped for a multi-step workflow with editable table |
| **Tab inside form view** | Zero navigation change; reuses `showForm` toggle; operator stays on same page | Adds complexity to ManageItemsPage (~2150 lines already) |

**Recommendation: Tab inside the form view.**

Rationale:
- ManageItemsPage already has a `showForm` gate that switches between table view and full-page form view
- Adding a mode switcher (`Manual Add` / `Import from Invoice`) at the top of the form view requires no routing changes
- Edit mode always uses Manual Add — no import tab shown when editing
- The operator flow is: `+ Add Item` → choose tab → work → back to table
- This matches how the Excel import is already accessed from the same toolbar

```
← Back

  [ Manual Add ]   [ Import from Invoice ]

  (current single-item form  OR  Azure import wizard)
```

---

## 3. Proposed Azure-based workflow

```
Step 1: Upload Invoice
  - User clicks "+ Add Item" → form view opens → clicks "Import from Invoice" tab
  - Drag-and-drop or browse to upload invoice (image, PDF)
  - File sent to backend POST /api/invoice-import/analyze
  - Backend forwards to Azure Document Intelligence prebuilt-invoice model
  - Shows spinner: "Analyzing invoice with Azure AI..."

Step 2: Invoice Header Review
  - Backend returns normalized result
  - Frontend shows invoice header card:
    - Vendor/Supplier (from VendorName)
    - Invoice # (from InvoiceId)
    - Purchase Date (from InvoiceDate)
    - PO/Order # (from PurchaseOrder)
    - Total (from InvoiceTotal)
    - Subtotal / Tax breakdown
  - All fields editable inline
  - Confidence indicator per field if available

Step 3: Line Item Review Table
  - Populated from Azure Items[] array
  - Each row shows: checkbox, item name, quantity, unit price, line total, product code
  - Non-item lines (tax, shipping, discount) either excluded by Azure or auto-flagged
  - User can: edit any cell, remove row, add blank row

Step 4: Shared Defaults + Inventory Fields
  - Panel above/beside table for fields Azure cannot know:
    - type (Hardware/Software/Component), category, location, owner
    - departmentID, fundingSource, projectLinked
    - warrantyStartDate, warrantyEnd, warrantyVendor, warrantyOnsite
    - status (default: Available)
  - Pre-filled: supplier from VendorName, invoiceNumber from InvoiceId,
    purchaseDate from InvoiceDate, orderID from PurchaseOrder
  - "Apply to selected rows" button

Step 5: Create Items
  - Validation: require name, type, category per row; qty >= 1; price numeric
  - Quantity expansion: qty > 1 → N individual item creations
  - Sequential POST /api/items calls with progress bar
  - Same invoice file attached to every created item
  - Summary: "10 created, 2 failed" with retry option
```

---

## 4. Frontend change plan

### Files affected

| File | Change |
|---|---|
| `frontend/src/pages/ManageItemsPage.vue` | Add mode switcher, import wizard state, import UI (5 steps), batch submit logic |
| `frontend/src/utils/services.js` | Add `invoiceImportService.analyzeInvoice()` method |
| `frontend/src/components/InvoiceImportReviewTable.vue` | **NEW** — editable review table component |
| `frontend/src/components/InvoiceImportDefaults.vue` | **NEW** — shared defaults panel component |

### New state in ManageItemsPage.vue

```js
const addMode = ref('manual')          // 'manual' | 'import'
const importStep = ref(1)              // 1=upload, 2=header, 3=review+defaults, 4=creating, 5=summary
const importAnalyzing = ref(false)     // true while Azure is processing
const importError = ref('')            // error message from analysis

const importState = ref({
  file: null,                          // { data: base64, name, type, size } — original invoice
  invoicePreviewUrl: '',               // data URL for image preview
  azureResult: null,                   // raw normalized result from backend

  invoiceMeta: {                       // editable header fields
    supplier: '',
    invoiceNumber: '',
    purchaseDate: '',
    orderID: '',
    totalAmount: '',
    subtotal: '',
    totalTax: '',
    currency: 'HKD',
    customerName: '',
  },

  draftRows: [],                       // see draft row structure below

  sharedDefaults: {                    // inventory-only defaults
    supplier: '',                      // pre-filled from invoiceMeta
    invoiceNumber: '',                 // pre-filled from invoiceMeta
    purchaseDate: '',                  // pre-filled from invoiceMeta
    orderID: '',                       // pre-filled from invoiceMeta
    owner: 'department',
    departmentID: 'COMP',
    location: 'Lab A',
    category: 'Computer',
    type: 'Hardware',
    fundingSource: '',
    projectLinked: '',
    warrantyStartDate: '',
    warrantyEnd: '',
    warrantyVendor: '',
    warrantyOnsite: false,
    status: 'Available',
  },

  createProgress: {
    current: 0,
    total: 0,
    successes: [],        // [ { itemId, name }, ... ]
    failures: [],         // [ { rowId, name, error }, ... ]
  },
})
```

### Draft row structure

```js
{
  _rowId: crypto.randomUUID(),
  selected: true,
  itemName: '',           // from Azure Items[].Description
  quantity: 1,            // from Azure Items[].Quantity (default 1)
  unitPrice: '',          // from Azure Items[].UnitPrice.amount
  lineTotal: '',          // from Azure Items[].Amount.amount
  productCode: '',        // from Azure Items[].ProductCode
  description: '',        // operator-editable notes
  // Per-row overrides (empty = use shared defaults):
  category: '',
  type: '',
  location: '',
  owner: '',
  // Metadata:
  isCharge: false,        // true if flagged as non-item (tax, shipping, etc.)
  chargeType: '',         // 'tax', 'shipping', 'discount', etc.
  confidence: null,       // Azure confidence for this line item if available
  validationErrors: [],   // [ 'Name is required', 'Price must be numeric' ]
}
```

### UI sections in form view

1. **Mode switcher** — pill buttons below "Add New Item" title (hidden during edit)
2. **Step 1 — Upload**: file drop zone, "Analyzing..." spinner, error message
3. **Step 2 — Header review**: editable card with Azure-extracted invoice header fields, confidence badges
4. **Step 3 — Review + Defaults**: `<InvoiceImportReviewTable>` + `<InvoiceImportDefaults>` panel side by side or stacked, "Add blank row", "Remove row", "Apply defaults to selected"
5. **Step 4 — Creating**: progress bar "Creating 3/12...", live ticker
6. **Step 5 — Summary**: success/failure counts, created item IDs, "Retry failed" button, "Done" button

Steps 2 and 3 can be combined into a single view with the header as a collapsible card above the table.

### New service method (services.js)

```js
// In services.js
export const invoiceImportService = {
  analyzeInvoice: async (file) => {
    const formData = new FormData()
    formData.append('invoiceFile', file)
    const data = await apiRequest('/invoice-import/analyze', {
      method: 'POST',
      body: formData,
    })
    return data  // { success, invoiceMeta, lineItems, warnings, rawConfidence }
  },
}
```

---

## 5. Backend change plan

### New endpoints

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/invoice-import/analyze` | Upload invoice → Azure analysis → return normalized result | admin, operator |

No batch-create endpoint for MVP. Item creation reuses `POST /api/items`.

### Why a separate analyze endpoint (not overloading existing routes)

- Clean separation of concerns: invoice analysis is not item creation
- The existing `POST /api/items/import` is for Excel files with a different flow
- A dedicated route makes the Azure integration testable in isolation
- File acceptance is different: only images/PDFs, not Excel

### New backend files

| File | Purpose |
|---|---|
| `backend/routes/invoiceImport.js` | Route definition |
| `backend/controllers/invoiceImportController.js` | Controller with `analyzeInvoice()` handler |
| `backend/utils/azureDocIntelligence.js` | Azure SDK wrapper — sends file, polls result, returns raw response |
| `backend/utils/invoiceNormalizer.js` | Maps Azure response → our stable JSON schema |

### Controller: `analyzeInvoice`

```
1. Validate file (image or PDF, ≤ 10MB)
2. Read file into buffer (already on disk via multer)
3. Call azureDocIntelligence.analyzeInvoice(buffer)
4. Normalize response via invoiceNormalizer.normalize(azureResult)
5. Delete temp file (clean up)
6. Return normalized result to frontend
```

### Azure SDK wrapper: `azureDocIntelligence.js`

```js
// Pattern follows existing emailService.js Azure integration
const DocumentIntelligence = require('@azure-rest/ai-document-intelligence').default
const { getLongRunningPoller, isUnexpected } = require('@azure-rest/ai-document-intelligence')

let client = null

function getClient() {
  if (client) return client
  client = DocumentIntelligence(
    process.env.AZURE_DOC_INTELLIGENCE_ENDPOINT,
    { key: process.env.AZURE_DOC_INTELLIGENCE_KEY }
  )
  return client
}

async function analyzeInvoice(fileBuffer) {
  const docClient = getClient()
  const base64Source = fileBuffer.toString('base64')

  const initialResponse = await docClient
    .path('/documentModels/{modelId}:analyze', 'prebuilt-invoice')
    .post({
      contentType: 'application/json',
      body: { base64Source },
    })

  if (isUnexpected(initialResponse)) {
    throw new Error(initialResponse.body.error?.message || 'Azure analysis failed')
  }

  const poller = getLongRunningPoller(docClient, initialResponse)
  const result = await poller.pollUntilDone()
  return result.body.analyzeResult
}
```

### Environment variables (added to `.env`)

```
AZURE_DOC_INTELLIGENCE_ENDPOINT=https://<resource-name>.cognitiveservices.azure.com
AZURE_DOC_INTELLIGENCE_KEY=<api-key>
```

These stay backend-only. Never exposed to the frontend.

### Validation and security

- File type check: only `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- File size: ≤ 10MB (existing multer limit)
- Auth: `authorize('admin', 'operator')` middleware — same as item creation
- Azure key never sent to client
- Uploaded file deleted after analysis regardless of success/failure
- Rate consideration: for protection, optionally add a simple in-memory rate limiter (e.g. max 10 calls/minute per user) — deferred but noted

### Batch creation strategy for MVP

Frontend loops `inventoryService.addItem(payload)` sequentially for each expanded row.

**Why not add `POST /api/items/batch` yet:**
- `createItem` handles: `getNextItemId()`, `canBorrow` logic, `fixedComponents` parsing, invoice file attachment, audit log
- Replicating all that in a batch endpoint adds surface area and risk
- Sequential calls from frontend provide per-item progress feedback
- The Excel import (`handleImport` in ManageItemsPage.vue) already uses this exact pattern and works
- If batch creation ever becomes a bottleneck (>50 items), a batch endpoint can be added later

---

## 6. Azure response normalization plan

### What Azure `prebuilt-invoice` returns (relevant fields)

**Invoice-level fields** (from `analyzeResult.documents[0].fields`):
- `VendorName` → string
- `InvoiceId` → string
- `InvoiceDate` → date
- `PurchaseOrder` → string
- `InvoiceTotal` → currency { amount, currencyCode }
- `SubTotal` → currency
- `TotalTax` → currency
- `CustomerName` → string

**Line items** (from `analyzeResult.documents[0].fields.Items.values[]`):
- `.Description` → string
- `.Quantity` → number
- `.UnitPrice` → currency { amount, currencyCode }
- `.Amount` → currency { amount, currencyCode }
- `.ProductCode` → string
- `.Tax` → currency
- `.Unit` → string
- `.Date` → date

### Backend normalizer output → sent to frontend

```json
{
  "success": true,
  "invoiceMeta": {
    "supplier": "ABC Technology Ltd.",
    "invoiceNumber": "INV-2024-0157",
    "purchaseDate": "2024-03-15",
    "orderID": "PO-3392",
    "totalAmount": 12500.00,
    "subtotal": 11200.00,
    "totalTax": 1300.00,
    "currency": "HKD",
    "customerName": "COMP Department, University of HK"
  },
  "lineItems": [
    {
      "description": "Dell Latitude 5540 Laptop",
      "quantity": 3,
      "unitPrice": 8500.00,
      "lineTotal": 25500.00,
      "productCode": "LAT-5540",
      "unit": null,
      "confidence": 0.95
    },
    {
      "description": "USB-C Docking Station",
      "quantity": 3,
      "unitPrice": 1200.00,
      "lineTotal": 3600.00,
      "productCode": "DOCK-USB3",
      "unit": null,
      "confidence": 0.91
    }
  ],
  "warnings": [],
  "confidence": 0.93
}
```

### Normalizer details

```
invoiceNormalizer.normalize(analyzeResult):
1. Extract document = analyzeResult.documents[0]
2. For each header field, safely read:
   - field?.valueString || field?.content || ''
   - For date fields: field?.valueDate || parse from content
   - For currency fields: field?.valueCurrency?.amount || 0
3. For Items array:
   - Map each item to our lineItem schema
   - field.Description?.valueString → description
   - field.Quantity?.valueNumber → quantity (default 1)
   - field.UnitPrice?.valueCurrency?.amount → unitPrice
   - field.Amount?.valueCurrency?.amount → lineTotal
   - field.ProductCode?.valueString → productCode
   - Per-field confidence from field.confidence
4. Compute overall confidence from document confidence
5. Generate warnings for:
   - Missing vendor name
   - Missing invoice number
   - Zero line items
   - Any field with confidence < 0.5
6. Return normalized object
```

---

## 7. Batch creation strategy

### Item creation flow

```
Frontend: for each selected draft row, call:
  if quantity == 1:
    1 × POST /api/items with payload
  if quantity > 1:
    N × POST /api/items (one per unit)
```

### Payload assembly per item

```js
{
  name: row.itemName,
  universityID: '',                      // left blank — operator fills post-creation
  type: row.type || sharedDefaults.type,
  category: row.category || sharedDefaults.category,
  status: sharedDefaults.status,         // 'Available'
  location: row.location || sharedDefaults.location,
  description: row.description || '',
  supplier: sharedDefaults.supplier,
  invoiceNumber: sharedDefaults.invoiceNumber,
  price: Number(row.unitPrice) || 0,     // per-unit price
  purchaseDate: sharedDefaults.purchaseDate,
  orderID: sharedDefaults.orderID,
  owner: row.owner || sharedDefaults.owner,
  departmentID: sharedDefaults.departmentID,
  fundingSource: sharedDefaults.fundingSource,
  projectLinked: sharedDefaults.projectLinked,
  warrantyStartDate: sharedDefaults.warrantyStartDate,
  warrantyEnd: sharedDefaults.warrantyEnd,
  warrantyVendor: sharedDefaults.warrantyVendor,
  warrantyOnsite: sharedDefaults.warrantyOnsite,
  canBorrow: true,
  invoiceFile: importState.file          // { data: base64, name, type, size }
}
```

### Quantity expansion

Quantity > 1 rows expand into N individual items at submit time. Each item gets the same name, unit price, and shared defaults. Backend auto-generates unique `itemId` per item.

### universityID handling

Items created with `universityID: ''`. The backend schema marks it as required, so this needs a small backend adjustment:
- Change `universityID` from `required: true` → `required: false` with `default: ''` in the Item model
- OR: generate a placeholder like `PENDING-{itemId}` during batch import
- **Recommended**: make it `default: ''` — simplest, operator fills in manually after creation

### Partial failure handling

```
createProgress: {
  current: 3,                   // currently creating #3
  total: 12,                    // total items to create
  successes: [                  // successfully created
    { itemId: 'INV-0145', name: 'Dell Latitude 5540' },
    { itemId: 'INV-0146', name: 'Dell Latitude 5540' },
  ],
  failures: [                   // failed to create
    { rowId: 'abc-123', name: 'USB-C Dock', error: 'Server error' },
  ]
}
```

Summary screen shows counts + "Retry Failed" button that re-attempts only `failures[]`.

### Invoice file attachment

All items from the same import get the same `invoiceFile` base64 JSON blob in `req.body`. This matches how the current single-item flow already stores invoice data when no physical File upload is used.

---

## 8. MVP scope

| Feature | In MVP? | Notes |
|---|---|---|
| Mode switcher (Manual Add / Import from Invoice) | ✅ | Tab pills in form view |
| File upload (image + PDF) | ✅ | Drag/drop + browse |
| Azure Document Intelligence analysis | ✅ | `prebuilt-invoice` model |
| Backend analyze endpoint | ✅ | `POST /api/invoice-import/analyze` |
| Invoice header review (editable) | ✅ | VendorName, InvoiceId, InvoiceDate, PurchaseOrder, InvoiceTotal |
| Structured line items from Azure | ✅ | Description, Quantity, UnitPrice, Amount, ProductCode |
| Editable review table | ✅ | Checkboxes, inline editing |
| Add blank row / remove row | ✅ | Manual fallback |
| Shared defaults panel | ✅ | Inventory-only fields + "Apply to selected" |
| Quantity expansion on submit | ✅ | qty N → N item creations |
| Sequential item creation via existing API | ✅ | Reuse `POST /api/items` |
| Progress bar + summary | ✅ | "Creating 3/12..." + final report |
| Retry failed rows | ✅ | Re-attempt from failure list |
| Invoice file attached to all items | ✅ | Base64 JSON blob |
| Charge/non-item flagging | ✅ | Azure distinguishes line items from totals/tax natively |
| Confidence badges | ✅ | Per-field and overall from Azure |
| Back/forward wizard steps | ✅ | Simple step navigation |

---

## 9. Deferred scope

| Feature | Rationale |
|---|---|
| `POST /api/items/batch` endpoint | Only needed if sequential creation becomes a bottleneck |
| Camera capture in import mode | Upload covers the real use case — operators have the invoice file |
| Multi-invoice batch (upload N invoices at once) | One invoice at a time is fine for MVP |
| Per-row universityID entry | Operator fills in post-creation |
| Azure Blob Storage for invoice files | Current base64-in-DB approach works at student-project scale |
| Currency conversion (auto HKD) | Nice polish, not critical |
| Duplicate detection against existing inventory | Separate feature |
| Template memory (remember last shared defaults) | Future convenience |
| Audit log for import batch (single grouped entry) | Current per-item audit is acceptable |
| Rate limiting on analyze endpoint | Low risk at student-project scale |
| Row reorder / drag-and-drop | Cosmetic polish |
| Local OCR fallback when Azure is unavailable | Existing Invoice Assist serves as manual fallback |

---

## 10. Testing plan

| # | Test case | Expected result |
|---|---|---|
| 1 | Upload a digital PDF with 3 line items | Azure returns 3 structured items; header fields populated; review table shows 3 rows |
| 2 | Upload a scanned PDF invoice | Azure OCR handles it; line items extracted (possibly lower confidence); review table shown |
| 3 | Upload a JPG photo of an invoice | Azure processes image; results shown in review table |
| 4 | Single-line invoice | 1 row in review table; header fields populated |
| 5 | Multi-line invoice with 8+ items | All items in scrollable table |
| 6 | Invoice with HK$/HKD prices | Currency amounts parsed correctly by Azure |
| 7 | Row with quantity = 3 | Expands to 3 item creations on submit |
| 8 | Invoice with shipping + tax + discount lines | Azure excludes them from Items[]; if present, flagged as charges |
| 9 | Manually add blank row in review | New empty row appears, editable |
| 10 | Edit detected row name/price | Changes reflected in create payload |
| 11 | Apply shared defaults to selected rows | All checked rows updated with default values |
| 12 | Submit with 1 invalid row (missing name) | Row shows error, submission blocked |
| 13 | Partial failure (API error on 1 item) | Shows "8 created, 2 failed" + retry button |
| 14 | Qty expansion: 3 rows with quantities 1+2+1 = 4 items | 4 POST calls, progress shows "Creating 1/4..." |
| 15 | **Regression**: Manual Add tab still works | Open form → Manual Add → fill fields → submit → item created |
| 16 | **Regression**: Single-item Invoice Assist works | Manual Add → Invoice Assist → upload → review card → apply fields |
| 17 | **Regression**: Edit existing item works | Click edit → Manual Add mode → edit → save |
| 18 | Empty invoice (Azure returns 0 line items) | "No items detected" message + "Add blank row" option |
| 19 | Low confidence result (~50%) | Warning badge; review table still available |
| 20 | Remove all rows then try submit | "No items selected" validation message |
| 21 | Azure service unavailable (network error) | "Analysis failed" error message; can retry or switch to Manual Add |
| 22 | Oversized file (>10MB) | Rejected at upload with "File too large" message |
| 23 | Unsupported file type (.docx) | Rejected at upload with "Invalid file type" message |
| 24 | Invoice in non-English language (Chinese) | Azure supports many languages; results shown (may need operator review) |

---

## 11. Implementation order

| # | Task | Files | Notes |
|---|---|---|---|
| **1** | Install `@azure-rest/ai-document-intelligence` in backend | `backend/package.json` | `npm install @azure-rest/ai-document-intelligence` |
| **2** | Add Azure env vars to `.env` | `backend/.env` | `AZURE_DOC_INTELLIGENCE_ENDPOINT`, `AZURE_DOC_INTELLIGENCE_KEY` |
| **3** | Create Azure SDK wrapper | `backend/utils/azureDocIntelligence.js` (new) | Send file, poll result, return raw analyzeResult |
| **4** | Create invoice normalizer | `backend/utils/invoiceNormalizer.js` (new) | Map Azure response → our schema |
| **5** | Create controller + route | `backend/controllers/invoiceImportController.js` (new), `backend/routes/invoiceImport.js` (new) | `POST /api/invoice-import/analyze` |
| **6** | Register route in server.js | `backend/server.js` | `app.use('/api/invoice-import', ...)` |
| **7** | Add `invoiceImportService.analyzeInvoice()` to frontend services | `frontend/src/utils/services.js` | FormData upload call |
| **8** | Add `addMode` ref + mode switcher UI | `frontend/src/pages/ManageItemsPage.vue` | Tab pills in form view |
| **9** | Add `importState` + `resetImportState()` | `frontend/src/pages/ManageItemsPage.vue` | All wizard state |
| **10** | Build Step 1: upload UI + wire to analyze endpoint | `frontend/src/pages/ManageItemsPage.vue` | Upload, call service, handle loading/error |
| **11** | Build Step 2: invoice header review card | `frontend/src/pages/ManageItemsPage.vue` | Editable fields from Azure result |
| **12** | Create `InvoiceImportReviewTable.vue` | `frontend/src/components/InvoiceImportReviewTable.vue` (new) | Editable table, checkboxes, add/remove row, validation display |
| **13** | Create `InvoiceImportDefaults.vue` | `frontend/src/components/InvoiceImportDefaults.vue` (new) | Shared defaults panel, "Apply to selected" |
| **14** | Build Step 3: integrate table + defaults | `frontend/src/pages/ManageItemsPage.vue` | Connect components, pass props/events |
| **15** | Build Step 4-5: batch submit + progress + summary | `frontend/src/pages/ManageItemsPage.vue` | Quantity expansion, sequential creation, retry |
| **16** | Add validation logic | `frontend/src/pages/ManageItemsPage.vue` | Per-row errors, submit gate |
| **17** | Wire `resetImportState()` into reset/back flows | `frontend/src/pages/ManageItemsPage.vue` | Clean state on exit |
| **18** | Expose all new refs in return statement | `frontend/src/pages/ManageItemsPage.vue` | — |
| **19** | Adjust Item model: `universityID` default | `backend/models/Item.js` | `required: false`, `default: ''` |
| **20** | Run `npm run build` + verify regressions | — | Manual Add, Invoice Assist, Edit item all still work |
| **21** | Test with real invoice files | — | Digital PDF, scanned PDF, image |
