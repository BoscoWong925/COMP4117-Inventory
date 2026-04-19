# OCR Invoice Assist — Concrete Change Plan

> Inspected: `frontend/src/pages/ManageItemsPage.vue` (lines 500–670 template, 748–855 state, 1516–1960 logic)  
> Model: `backend/models/Item.js`  
> Date: 2026-04-19  
> Commit baseline: `d9ff20f9`

---

## 1. Current-State Summary

### What the OCR currently does

The feature sits inside the **Add / Edit Item** form on `ManageItemsPage.vue` as a collapsible "Invoice & Documents" section. It provides three input paths:

| Path | Implementation | Location |
|------|---------------|----------|
| **Upload** file | `handleInvoiceUpload()` → stores base64 → dispatches to `extractTextFromImage()` or `extractTextFromPDF()` | L1824–1855 |
| **Camera** capture | `captureInvoicePhoto()` → canvas → JPEG data-URL → `extractTextFromImage()` | L1909–1943 |
| **Drag & drop** | `handleInvoiceDrop()` → delegates to `handleInvoiceUpload()` | L1857–1862 |

After text is extracted, `smartExtractData(text)` runs regex patterns and populates `ocrReviewData`. A review confirmation card shows the extracted fields and the user clicks "Apply to Form" or "Dismiss".

**Extracted fields (current regex):**
`invoiceNumber`, `poNumber`, `supplier`, `price`, `purchaseDate`, `serialNumber`, `warrantyMonths`/`warrantyEnd`/`warrantyStartDate`, `name`, `quantity`

**Worker lifecycle:** A persistent `Tesseract.createWorker('eng')` is created on first use, reused, and terminated in `onUnmounted`.

**PDF handling:** `pdfjs-dist` extracts text layer first; if text is empty (< 20 chars), falls back to rendering each page to canvas at 2× scale → OCR.

**Confidence handling:**
- `< 40%` → rejects, does not populate review card
- `40–59%` → populates review card with warning message
- `≥ 60%` → populates review card with normal message

**Image preprocessing:** Grayscale + contrast stretch applied before Tesseract recognition.

### What it does NOT do

1. **Does not parse multi-line-item invoices.** One invoice → one item. If an invoice has 5 products, only the first model/description match is used.
2. **Does not create items automatically.** It only pre-fills form fields; the user must still click "Add Item".
3. **Does not use any backend / cloud OCR.** All processing is client-side via Tesseract.js.
4. **Does not support Chinese-language invoices.** Only `eng` language model is loaded.
5. **Does not validate extracted prices / dates semantically.** A regex match of `$999999.99` on an unrelated number could fill the price field.

### Why the current mismatch exists

The feature was originally designed as a convenience tool for admin/operator staff adding items one at a time. It was labeled "Invoice Scanner" in the UI, which implies full invoice ingestion. In reality it is a single-item OCR assist that reads one invoice and fills one form. This labeling mismatch causes user confusion and sets incorrect expectations.

---

## 2. Recommended Product Decision

### How the feature should be framed now

**Feature name**: "Invoice Assist" (not "Invoice Scanner")

> "Upload or photograph an invoice to auto-suggest item details. This assists one item at a time — review and correct the suggested values before saving."

### What should be explicitly excluded from current scope

| Excluded | Reason |
|----------|--------|
| Multi-line-item invoice parsing | Requires new UI (line-item picker), new data flow (one-to-many), significant rework |
| Batch item creation from invoice | Requires batch creation API, duplicate detection, rollback |
| Chinese OCR language model | Adds ~70 MB payload; would need `chi_tra` or `chi_sim` model load |
| Backend / cloud document AI | Adds infrastructure dependency, API key management, cost |
| Vendor (sales channel) auto-fill from OCR | `vendor` vs `supplier` distinction is business-specific; OCR cannot reliably distinguish them |

---

## 3. Change Plan by Phase

### Phase 1: Stability & Safety Fixes

**Objective**: Fix data integrity bugs where OCR extracts fields that cannot map to the form, remove dead code, and tighten error paths.

#### 1.1 Fix field mapping mismatch (BUG — silent data loss)

**Problem**: `smartExtractData()` returns keys that do not exist in `defaultFormData`:

| OCR key | Form field | Status |
|---------|-----------|--------|
| `invoiceNumber` | `invoiceNumber` | OK |
| `supplier` | `supplier` | OK |
| `price` | `price` | OK |
| `purchaseDate` | `purchaseDate` | OK |
| `warrantyEnd` | `warrantyEnd` | OK |
| `warrantyStartDate` | `warrantyStartDate` | OK |
| `name` | `name` | OK |
| **`poNumber`** | **`orderID`** | **MISMATCH — data silently lost** |
| **`serialNumber`** | *(no field)* | **NO TARGET — data silently lost** |
| **`quantity`** | *(no field)* | **NO TARGET — displayed in review but lost on apply** |
| **`warrantyMonths`** | *(no field)* | **NO TARGET — display-only, lost on apply** |

**Changes:**
- Rename `extracted.poNumber` → `extracted.orderID` in `smartExtractData()` so it maps to the `orderID` form field
- Append `serialNumber` to `description` field when applying (e.g., `"S/N: ABC123"`) since there is no dedicated serial number field in the Item model
- `quantity` and `warrantyMonths` are display-only in the review card — document this clearly with a note "(info only — not saved)" in the review card UI
- OR: add `quantity` display text like "Quantity: 5 — note: this form adds one item at a time"

**Affected files:**
- `ManageItemsPage.vue` — `smartExtractData()`, `acceptOCRData()`, review card template

**Risk**: Low — field mapping only  
**Effort**: 30 min  
**Dependencies**: None

#### 1.2 Remove dead `applyOCRData` function

**Problem**: `applyOCRData()` at line 1516 is defined but never called. It uses the old auto-fill pattern (`...defaultFormData`) which would wipe existing form data. Must be removed to prevent accidental future use.

**Changes:**
- Delete `applyOCRData` function entirely (lines 1516–1523)

**Affected files:**
- `ManageItemsPage.vue`

**Risk**: None  
**Effort**: 5 min  
**Dependencies**: None

#### 1.3 Guard `preprocessImage` against missing image load

**Problem**: `preprocessImage()` creates an `Image()` and resolves in `onload`, but has no `onerror` handler. A corrupt file would hang the Promise forever.

**Changes:**
- Add `img.onerror` handler that resolves with the original unprocessed `imageDataUrl` (graceful fallback)
- Add a timeout safety net (10 s) that resolves with original image if preprocessing stalls

**Affected files:**
- `ManageItemsPage.vue` — `preprocessImage()`

**Risk**: Low  
**Effort**: 15 min  
**Dependencies**: None

#### 1.4 Prevent double OCR on camera capture

**Problem**: `captureInvoicePhoto()` sets `ocrProcessing = true` at the start and `false` in `finally`, but `extractTextFromImage()` also toggles `ocrProcessing`. When called sequentially, the `finally` in `captureInvoicePhoto()` sets `ocrProcessing = false` even if the review card should still be visible. Currently the logic works by accident because `extractTextFromImage` finishes before the finally block, but it's fragile.

**Changes:**
- Remove the `ocrProcessing = true` and the `finally { ocrProcessing.value = false }` from `captureInvoicePhoto()` since `extractTextFromImage()` already manages that state internally
- Keep only the `ocrMessage` and file storage logic in `captureInvoicePhoto()`

**Affected files:**
- `ManageItemsPage.vue` — `captureInvoicePhoto()`

**Risk**: Low  
**Effort**: 15 min  
**Dependencies**: None

#### 1.5 Clear ocrReviewData when a new upload/capture starts

**Problem**: If a user uploads an invoice, sees the review card, then uploads a different file without clicking dismiss, the old review card stays visible while the new OCR runs. After the new OCR completes, the old review data is replaced — but during processing, stale data is shown.

**Changes:**
- Add `ocrReviewData.value = null` at the start of `handleInvoiceUpload()` and `captureInvoicePhoto()`

**Affected files:**
- `ManageItemsPage.vue`

**Risk**: None  
**Effort**: 5 min  
**Dependencies**: None

---

### Phase 2: Extraction Quality

**Objective**: Make regex patterns more accurate for Hong Kong university procurement invoices and fix field mapping.

#### 2.1 Fix price regex to avoid false matches

**Problem**: The current `anyCurrencyRegex` fallback will match the FIRST currency amount in the document. On a multi-line invoice this is often a line-item price, not the total. The fallback is too greedy.

**Changes:**
- Remove the `anyCurrencyRegex` fallback entirely; only match when a "total" / "amount due" label is present
- OR: if no total label match, use the LAST currency amount on the page (more likely to be the total)
- Add a sanity cap: reject prices above 10,000,000 (likely OCR noise)

**Affected files:**
- `ManageItemsPage.vue` — `smartExtractData()` price section

**Risk**: Medium — changes extraction behavior  
**Effort**: 30 min  
**Dependencies**: None

#### 2.2 Map `warrantyVendor` from OCR if warranty provider is mentioned

**Problem**: The Item model has a `warrantyVendor` field but OCR never populates it. If the invoice says "Warranty by: Lenovo HK" this is ignored.

**Changes:**
- Add regex: `/warranty\s*(?:by|provider|vendor|service)[\s:]+([^\n]+)/i`
- Map to `extracted.warrantyVendor`

**Affected files:**
- `ManageItemsPage.vue` — `smartExtractData()`

**Risk**: Low  
**Effort**: 15 min  
**Dependencies**: None

#### 2.3 Improve date parsing robustness

**Problem**: The 4th date pattern in `datePatterns` array is missing the capture group — it will match but `dateMatch[1]` will be undefined.

```js
// Current (broken):
/(?:date|...)[\s:]+(?:(?:Jan|Feb|...)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i
//              ↑ missing capture group around the date part
```

**Changes:**
- Add capture group: `/((?:Jan|Feb|...)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i`
- Add DD/MM/YYYY format common in HK: `(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})`
- Handle ambiguous DD/MM vs MM/DD by defaulting to DD/MM (HK standard)

**Affected files:**
- `ManageItemsPage.vue` — `smartExtractData()` date section

**Risk**: Medium — date parsing changes  
**Effort**: 30 min  
**Dependencies**: None

#### 2.4 Supplier regex — prevent over-matching from Strategy 3

**Problem**: Strategy 3 (first line of text) is too aggressive. If an invoice has "Page 1 of 1" or a date as the first line filtered through the checks, it could still match. The negative-keyword list is too short.

**Changes:**
- Expand the negative keyword filter: add `total|tax|amount|order|reference|tel|phone|fax|email|address|attn|bill|ship|po|account|#|number`
- Require the first-line match to have at least 2 words (single words like "QUOTATION" should not be a supplier)
- Mark Strategy 3 results as low-confidence in the review card (italic + "(auto-detected)" suffix)

**Affected files:**
- `ManageItemsPage.vue` — `smartExtractData()` supplier section

**Risk**: Low  
**Effort**: 20 min  
**Dependencies**: None

---

### Phase 3: UX, Review Flow & Wording

**Objective**: Re-label the feature, improve review card usability, add per-field apply control.

#### 3.1 Rename section and button labels

**Current wording → Proposed wording:**

| Location | Current | Proposed |
|----------|---------|----------|
| Section toggle title | "Invoice & Documents" | "Invoice Assist & Documents" |
| Upload mode button | "Upload Invoice" | "Upload Invoice / Receipt" |
| Camera mode button | "Take Photo" | "Photo Invoice" |
| Upload area text | "Click to upload or drag & drop" | "Upload invoice image or PDF to auto-suggest item details" |
| Helper text under upload | "PNG, JPG, PDF (Max 10MB)" | "PNG, JPG, PDF up to 10 MB — extracts details for one item" |
| Review card title | "Extracted Invoice Data" | "Suggested Item Details from Invoice" |
| Apply button | "Apply to Form" | "Apply All to Form" |

**Affected files:**
- `ManageItemsPage.vue` — template strings

**Risk**: None  
**Effort**: 15 min  
**Dependencies**: None

#### 3.2 Add per-field checkboxes in review card

**Problem**: The current review card is all-or-nothing: "Apply to Form" writes all fields, "Dismiss" discards all. Users may want to keep the supplier but reject a suspicious price.

**Changes:**
- Add a checkbox next to each extracted field row in the review card
- All checked by default
- "Apply Selected to Form" only writes checked fields
- "Apply All" remains as a shortcut
- Display quantity/warrantyMonths rows with "(info only)" suffix and no checkbox since they don't map to form fields

**Affected files:**
- `ManageItemsPage.vue` — review card template, `acceptOCRData()` function, new ref `ocrFieldSelection`

**Risk**: Low  
**Effort**: 45 min  
**Dependencies**: Phase 1.1 (field mapping fix)

#### 3.3 Show "no fields extracted" state more clearly

**Problem**: If OCR succeeds (confidence ≥ 40%) but no regex patterns match, the review card shows "No fields could be extracted from this invoice." in muted text. This is easy to miss.

**Changes:**
- Change to a distinct info-banner style within the review card
- Add message: "Text was found but no item details could be matched. The invoice file is saved — you can fill in the form manually."
- Hide the "Apply to Form" button in this case

**Affected files:**
- `ManageItemsPage.vue` — review card template

**Risk**: None  
**Effort**: 10 min  
**Dependencies**: None

#### 3.4 Improve confidence badge UX

**Changes:**
- `≥ 80%`: Green badge, text "High"
- `60–79%`: Green badge, no qualifier
- `40–59%`: Amber/warning badge, text "Low — verify carefully"
- Show confidence only when ocrConfidence > 0

**Affected files:**
- `ManageItemsPage.vue` — review card template

**Risk**: None  
**Effort**: 10 min  
**Dependencies**: None

#### 3.5 Add "Scan Again" button to review card

**Problem**: After a bad scan, the user has to scroll back to the upload area and re-upload. A shortcut button would be helpful.

**Changes:**
- Add a third button "Scan Again" in the review card footer
- Clicking it clears `ocrReviewData`, clears `ocrMessage`, and triggers `invoiceInput.click()`

**Affected files:**
- `ManageItemsPage.vue` — review card template, new function `rescanInvoice()`

**Risk**: None  
**Effort**: 15 min  
**Dependencies**: None

---

### Phase 4: Image Quality & Preprocessing

**Objective**: Improve OCR accuracy for real-world camera captures and edge cases.

#### 4.1 Add error handler to `preprocessImage()`

(Covered in Phase 1.3 — listed here for completeness)

#### 4.2 Skip preprocessing for digital-origin images

**Problem**: Preprocessing (grayscale + contrast) can actually harm accuracy on clean digital screenshots or exports where text is already sharp and high-contrast. Forced grayscale on a color-coded invoice removes useful visual structure.

**Changes:**
- Check if image dimensions are "reasonable for a scan" (width < 3000 AND not a perfect screenshot ratio)
- For images that appear digital-origin (clean, high-DPI), skip preprocessing and pass directly to Tesseract
- OR: Run OCR twice (raw + preprocessed) and use the higher-confidence result — but this doubles processing time, so only do it if the first pass confidence is < 60%

**Recommended approach**: Always preprocess for camera captures; skip for uploaded files (file upload likely to be cleaner). Determine by source: camera → preprocess, file upload → raw first, preprocess only on retry.

**Affected files:**
- `ManageItemsPage.vue` — `extractTextFromImage()`, `captureInvoicePhoto()`

**Risk**: Medium — needs testing to find the right threshold  
**Effort**: 45 min  
**Dependencies**: None

#### 4.3 Add "Retry with enhancement" button for low-confidence results

**Changes:**
- If confidence is 40–59%, show a "Retry with Enhanced Processing" button in the review card
- This re-runs OCR with more aggressive preprocessing (higher contrast factor, sharpen filter)
- If the retry result has better confidence, update the review card

**Affected files:**
- `ManageItemsPage.vue` — review card template, new `retryWithEnhancement()` function

**Risk**: Low  
**Effort**: 30 min  
**Dependencies**: Phase 1 complete

---

## 4. UI / UX Wording Changes

### Button labels

| Element | Current | Proposed |
|---------|---------|----------|
| Section toggle | "Invoice & Documents" | "Invoice Assist & Documents" |
| Upload mode tab | "Upload Invoice" | "Upload Invoice / Receipt" |
| Camera mode tab | "Take Photo" | "Photo Invoice" |
| Browse button | "Browse Files" | "Browse Files" (no change) |
| Apply OCR button | "Apply to Form" | "Apply All to Form" |
| Dismiss OCR button | "Dismiss" | "Dismiss" (no change) |
| New: Scan again | — | "Scan Again" |
| New: Retry | — | "Retry with Enhancement" |

### Helper text

| Location | Text |
|----------|------|
| Upload area primary | "Upload an invoice image or PDF to auto-suggest item details" |
| Upload area secondary | "PNG, JPG, PDF up to 10 MB — extracts details for one item" |
| Camera ready message | "Camera ready. Position the invoice and click Capture." |
| Review card subtitle (new) | "Review the suggested values below. Uncheck any you don't want to apply." |

### Warning messages

| Condition | Message |
|-----------|---------|
| Confidence < 40% | "Image quality too low for reliable extraction (confidence: XX%). Invoice is saved but details were not extracted. Try a clearer image or PDF." |
| Confidence 40–59% | "Low confidence scan (XX%). Please verify each field carefully before applying." |
| Confidence ≥ 60% | "Invoice scanned successfully (XX% confidence). Review the suggested fields below." |
| No regex matches | "Text was scanned but no item details could be matched. The invoice file is saved — fill in the form manually." |
| PDF text layer empty | "Scanned PDF detected — using image OCR. This may take longer." |

### Error messages

| Condition | Message |
|-----------|---------|
| File too large | "File too large. Maximum file size is 10 MB." |
| OCR engine error | "Could not process the image. The invoice file is saved. Error: [message]" |
| PDF parse error | "Could not read this PDF. The file is saved. Error: [message]" |
| Camera denied | "Camera access was denied. Please allow camera access in browser settings, or use file upload instead." |
| Camera general error | "Camera error: [message]. Try file upload instead." |

### Confidence badge text

| Range | Badge style | Text |
|-------|------------|------|
| ≥ 80% | Green | "XX% — High" |
| 60–79% | Green | "XX%" |
| 40–59% | Amber | "XX% — Low" |
| < 40% | (no badge shown — extraction rejected) | — |

---

## 5. Technical Notes

### Where logic should stay in ManageItemsPage.vue

The following should remain inline in the component because they are tightly coupled to the form state (`formData`, `ocrReviewData`, `invoiceFileData`) and the component lifecycle:

- `handleInvoiceUpload()`
- `handleInvoiceDrop()`
- `captureInvoicePhoto()`, `startInvoiceCamera()`, `stopInvoiceCamera()`
- `acceptOCRData()`, `dismissOCRData()`
- All template refs and reactive state

### What should be extracted into a helper file

Create `frontend/src/utils/ocrHelper.js` containing:

1. **`smartExtractData(text)`** — pure function, no Vue dependencies, easy to unit test
2. **`preprocessImage(imageDataUrl)`** — pure async function, canvas manipulation only
3. **Field mapping constant** — the mapping between OCR extracted keys and formData keys

This extraction makes the regex patterns testable in isolation (can write unit tests with sample invoice text) without loading the entire Vue component.

```
frontend/src/utils/ocrHelper.js
  - export function smartExtractData(text) { ... }
  - export function preprocessImage(imageDataUrl) { ... }
  - export const OCR_FIELD_MAP = { ... }
```

### Whether any backend support is needed now

**No.** All current changes are frontend-only. Backend changes would only be needed for:

- A dedicated serial number field on the Item model (currently not needed — append to description)
- A quantity field on the Item model (not needed — single-item flow)
- Server-side OCR processing (future only)

---

## 6. Testing Plan

### Test matrix

| # | Test Case | Input | Expected Outcome |
|---|-----------|-------|-----------------|
| **Image upload** |||
| T1 | Clear photo of a printed invoice with total, date, company name | JPEG, 2+ MB | Review card shows name, supplier, price, date. Confidence ≥ 60%. |
| T2 | Blurry / dark photo | JPEG, camera | Confidence < 40% → rejection message, no review card |
| T3 | Photo of handwritten receipt | JPEG | Confidence likely low; whatever is extracted goes to review; user can dismiss |
| T4 | Screenshot of digital invoice (sharp, high-res) | PNG | Confidence ≥ 80%. All labeled fields extracted accurately. |
| **Scanned PDF** |||
| T5 | Scanned PDF (no text layer) | PDF | Falls back to page-render OCR. Progress shows "Scanned PDF detected". Review card populated. |
| T6 | Multi-page scanned PDF | PDF, 3 pages | Progress shows page-by-page. Text from all pages concatenated. |
| **Digital PDF** |||
| T7 | PDF with text layer (digital export) | PDF | Fast extraction via getTextContent(). No OCR needed. Review card populated. |
| T8 | PDF with embedded text + images | PDF | Text layer extracted. No fallback needed. |
| **HKD invoices** |||
| T9 | Invoice with "HK$1,234.00" | Image/PDF | Price extracted as "1234.00" |
| T10 | Invoice with "HKD 5,678.50" | Image/PDF | Price extracted as "5678.50" |
| T11 | Invoice with "Total: ¥999" | Image/PDF | Price extracted as "999" |
| **Field mapping** |||
| T12 | Invoice with "PO#: 12345" | Image/PDF | `orderID` field populated (not `poNumber`) |
| T13 | Invoice with "S/N: ABC-123" | Image/PDF | Serial number shown in review card. On apply, appended to description. |
| T14 | Invoice with "Qty: 10" | Image/PDF | Quantity shown in review card with "(info only)" note. Not written to form. |
| **Review flow** |||
| T15 | User clicks "Apply All to Form" | Review card | All checked fields written to formData. Review card disappears. |
| T16 | User unchecks supplier, clicks "Apply Selected" | Review card | Supplier NOT written. Other fields written. |
| T17 | User clicks "Dismiss" | Review card | No fields written. Message: "Dismissed. Invoice file saved." |
| T18 | User uploads second file while review card visible | File input | Old review card cleared. New processing starts. New review card appears. |
| **Regression** |||
| T19 | Add item manually without using OCR | Normal form | Form works exactly as before. No OCR artifacts. |
| T20 | Edit existing item with invoice attached | Edit flow | Invoice preview shown. OCR not re-triggered. Form data intact. |
| T21 | Import Excel file | Excel import | Excel import unaffected. No OCR interaction. |
| T22 | Form reset / cancel | Cancel button | `ocrReviewData`, `ocrMessage`, `ocrConfidence` all cleared. |

### Regression risks

| Risk | Mitigation |
|------|-----------|
| `acceptOCRData()` writes unknown keys into formData | Phase 1.1 fixes mapping; also add a whitelist filter in `acceptOCRData` that only applies keys present in `defaultFormData` |
| Preprocessing degrades clean images | Phase 4.2 conditionally skips preprocessing for uploaded files |
| New regex patterns false-match on non-invoice documents | Tests T1–T4 validate; confidence threshold provides safety net |
| Form submission sends extra keys to backend | Backend `handleSubmit` already builds an explicit `updatePayload` (line 1196–1240) — only known fields are sent |

---

## 7. Future Enhancement Proposal

### Separate architecture for true invoice import

When (if ever) the project needs to support creating multiple inventory items from a single invoice, the architecture should be:

```
┌──────────────────────────────────────────────────────────┐
│  New page: "Import from Invoice"                         │
│                                                          │
│  1. Upload invoice (image / PDF)                         │
│  2. Backend receives file → sends to Document AI service │
│  3. Backend returns structured line items                │
│  4. Frontend shows line-item review table:               │
│     ┌─────────────────────────────────────────────────┐  │
│     │ ☑  Lenovo ThinkPad T14s  | $1,299 | Qty: 5     │  │
│     │ ☑  Dell U2723QE Monitor  | $599   | Qty: 5     │  │
│     │ ☐  Shipping fee          | $50    | Qty: 1     │  │
│     └─────────────────────────────────────────────────┘  │
│  5. User selects items to import, fills category/loc     │
│  6. Batch create via POST /api/items/batch               │
│  7. Backend generates itemId sequence, creates all items │
└──────────────────────────────────────────────────────────┘
```

**When a third-party Document AI provider becomes justified:**

- When the project is deployed to production and users regularly process invoices with > 3 line items
- When Tesseract.js accuracy is consistently below 70% for the specific invoice formats being used
- When Chinese-language invoices must be supported (Tesseract Chinese models are significantly less accurate than Google/Azure Document AI)
- When processing time (10+ seconds per page client-side) becomes a user complaint

**Candidate providers:**
- Azure Form Recognizer (prebuilt invoice model, HKD support, Chinese support)
- Google Document AI (similar capabilities)
- AWS Textract

**Cost consideration:** These services charge per page ($0.01–$0.05/page). For a university inventory system processing ~50–200 invoices/semester, cost would be < $10/semester — negligible. The real cost is integration effort and API key management.

**This is explicitly out of scope for the current project phase.**

---

## 8. Final Recommendation

### Do now (before project submission)

| Item | Phase | Why |
|------|-------|-----|
| Fix `poNumber` → `orderID` mapping | 1.1 | **Bug**: extracted data silently lost |
| Handle `serialNumber` / `quantity` properly | 1.1 | **Bug**: review card shows data that disappears on apply |
| Remove dead `applyOCRData` function | 1.2 | Dead code cleanup |
| Add `onerror` to `preprocessImage` | 1.3 | **Bug**: corrupt image hangs forever |
| Clear review data on new upload | 1.5 | **Bug**: stale data during re-upload |
| Fix 4th date pattern capture group | 2.3 | **Bug**: `dateMatch[1]` is undefined |
| Rename section to "Invoice Assist" | 3.1 | Scope clarity |
| Add per-field checkboxes | 3.2 | Core UX improvement |
| Fix "no fields" empty state | 3.3 | UX clarity |

### Do if time permits

| Item | Phase | Why |
|------|-------|-----|
| Remove greedy price fallback | 2.1 | Accuracy improvement |
| Add `warrantyVendor` extraction | 2.2 | Nice-to-have |
| Supplier regex hardening | 2.4 | Accuracy improvement |
| Confidence badge text levels | 3.4 | UX polish |
| "Scan Again" button | 3.5 | Convenience |
| Conditional preprocessing skip | 4.2 | Accuracy edge case |

### Defer

| Item | Why |
|------|-----|
| Multi-line invoice import | Requires new page, API, batch flow |
| Chinese OCR model | +70 MB client payload |
| Backend/cloud OCR | Infrastructure dependency |
| "Retry with Enhancement" | Nice-to-have, low priority |

---

## Implementation Order Recommendation

Execute in this exact order to minimize risk and maximize incremental value:

```
Step 1:  Phase 1.1  — Fix field mapping (poNumber→orderID, serialNumber, quantity)
Step 2:  Phase 1.2  — Remove dead applyOCRData function
Step 3:  Phase 1.3  — Add onerror handler to preprocessImage
Step 4:  Phase 1.5  — Clear ocrReviewData on new upload/capture
Step 5:  Phase 2.3  — Fix broken date pattern capture group
Step 6:  Phase 3.1  — Rename UI labels to "Invoice Assist"
Step 7:  Phase 3.3  — Fix empty-state review card
Step 8:  Phase 1.4  — Fix ocrProcessing double-toggle in captureInvoicePhoto
Step 9:  Phase 3.2  — Add per-field checkboxes to review card
Step 10: Phase 2.1  — Fix greedy price regex fallback
Step 11: Phase 2.4  — Harden supplier Strategy 3
Step 12: Phase 3.4  — Confidence badge levels
Step 13: Phase 3.5  — "Scan Again" button
Step 14: Phase 2.2  — warrantyVendor extraction
Step 15: Phase 4.2  — Conditional preprocessing
```

Steps 1–8 are bug fixes and should be done first regardless.  
Steps 9–15 are quality improvements and can be done based on available time.

All changes are in `ManageItemsPage.vue` plus a potential `ocrHelper.js` extraction (optional, step 9+).  
No backend changes required.  
No new dependencies required.
