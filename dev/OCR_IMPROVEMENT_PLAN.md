# OCR Invoice Scanner — Improvement Plan

> **File**: `frontend/src/pages/ManageItemsPage.vue` (lines ~1490–1790)  
> **Dependencies**: `tesseract.js ^5.0.4`, `pdfjs-dist ^4.0.0`, `frontend/eng.traineddata`  
> **Date**: 2026-04-19

---

## Current Architecture

```
User uploads file / takes photo
       ↓
handleInvoiceUpload() — saves file as base64 into formData
       ↓
   ┌───┴───┐
   PDF?    Image?
   ↓         ↓
extractTextFromPDF()   extractTextFromImage()
   │  pdfjs getTextContent()    │  Tesseract.recognize()
   └───────┬───────────────────-┘
           ↓
    smartExtractData(text) — regex extraction
           ↓
    Auto-fill form fields (name, invoiceNumber, supplier, price, warranty)
```

All processing is **client-side only**. No backend OCR.

---

## Audit Findings

### Critical Issues

| # | Issue | Impact | Location |
|---|-------|--------|----------|
| C1 | **Dead `ocrWorker` variable** — declared at line 816 (`let ocrWorker = null`) but never assigned. `onUnmounted` calls `ocrWorker.terminate()` which is always a no-op. Tesseract creates a fresh worker on every `recognize()` call and never reuses it. | Memory leak per scan; slower repeat scans (~2-3s overhead each time) | L816, L1826 |
| C2 | **Scanned/image PDF fallback missing** — `extractTextFromPDF()` uses `page.getTextContent()` which only extracts embedded text layers. Scanned PDFs (photos of invoices saved as PDF) return empty text with no fallback to OCR. User sees "No text could be extracted" with no recovery. | Complete failure on scanned PDFs — a very common real-world format | L1575–1610 |
| C3 | **No confidence threshold** — `result.data.confidence` is logged but never checked. Low-confidence scans (blurry photos, poor lighting) produce garbage data that silently auto-fills the form with wrong values. | Corrupted inventory data from bad scans | L1535 |

### High-Priority Issues

| # | Issue | Impact | Location |
|---|-------|--------|----------|
| H1 | **Narrow regex patterns** — `smartExtractData()` only extracts 5 fields: invoiceNumber, supplier, price, warranty, name. Missing: purchase date, order/PO number, quantity, serial number. | Users must manually fill common fields that appear on most invoices | L1622–1670 |
| H2 | **HKD currency not supported** — Price regex only matches `$`, `€`, `£` symbols. Hong Kong Dollar (`HK$`, `HKD`) is not matched, which is the primary currency for this university inventory system. | Price extraction fails for local invoices | L1647–1650 |
| H3 | **Supplier regex too narrow** — Requires keywords like "supplier", "vendor", "company", "from", "by" before the company name. Many invoices put the company name at the top without such labels. | Supplier field empty for most real invoices | L1635–1638 |

### Medium-Priority Issues

| # | Issue | Impact | Location |
|---|-------|--------|----------|
| M1 | **No image preprocessing** — Raw camera photos go directly to Tesseract without grayscale conversion, contrast adjustment, or noise reduction. Poor lighting = poor results. | Lower accuracy, especially from camera captures | L1509–1512 |
| M2 | **No user review/confirmation step** — Extracted data auto-fills the form immediately. Users may not notice incorrect values in fields they didn't expect to change, especially on small screens. | Silent data corruption | L1544–1549 |
| M3 | **Warranty date calculated from today** — `warrantyStartDate` is set to `new Date()` instead of purchase date. For invoices with existing purchase dates, the warranty period will be wrong. | Incorrect warranty end dates | L1659–1663 |
| M4 | **Console.log pollution** — Multiple `console.log('[OCR]...')` statements left in production code. | Debug noise in production console; minor PII leak risk (invoice text logged) | L1509, 1526, 1528, etc. |

### Low-Priority Issues

| # | Issue | Impact | Location |
|---|-------|--------|----------|
| L1 | **Large language model file** — `eng.traineddata` (~70MB) is bundled in the frontend root. Loaded on every OCR call from disk. | Slow initial load; large deployment size | `frontend/eng.traineddata` |
| L2 | **Camera resolution fixed** — Camera requests 1280×720 ideal. No option for higher resolution which could improve OCR accuracy on dense invoices. | Missed accuracy gains on modern devices | L1722–1725 |

---

## Improvement Plan

### Phase 1 — Fix Critical Bugs (Stability)

**Goal**: Eliminate memory leaks, fix worker lifecycle, add safety guardrails.

#### 1.1 Create persistent Tesseract worker

Replace single-shot `Tesseract.recognize()` with a reusable worker:

```
Changes in ManageItemsPage.vue:
- Import Tesseract.createWorker
- On first OCR call: create worker, load eng language, store in ocrWorker
- On subsequent calls: reuse existing ocrWorker
- On component unmount: properly terminate ocrWorker
```

**Expected result**: ~2-3s faster on repeat scans, no memory leaks.

#### 1.2 Add OCR confidence threshold

After `Tesseract.recognize()` returns, check `result.data.confidence`:
- **≥ 60%**: Auto-fill form as normal
- **40–59%**: Auto-fill but show warning: "Low confidence scan — please verify extracted data"
- **< 40%**: Do NOT auto-fill. Show error: "Image quality too low for reliable extraction. Invoice is saved but data could not be extracted."

#### 1.3 Add scanned PDF fallback

When `extractTextFromPDF()` gets empty/near-empty text from `getTextContent()`:
1. Render each PDF page to a canvas using `page.render()`
2. Convert canvas to image data
3. Pass through `extractTextFromImage()` (OCR) as fallback
4. Show message: "Scanned PDF detected — using OCR (may take longer)"

---

### Phase 2 — Improve Accuracy (Data Quality)

**Goal**: Extract more fields with better accuracy for real-world invoices.

#### 2.1 Expand `smartExtractData()` regex patterns

Add extraction for:

| Field | Pattern Examples |
|-------|-----------------|
| **Purchase date** | `Date: 2025-01-15`, `Invoice Date: 15/01/2025`, `Jan 15, 2025` |
| **PO / Order number** | `PO#: 12345`, `Order No: ORD-2025-001` |
| **Serial number** | `S/N: ABC123`, `Serial: XYZ-789` |
| **Quantity** | `Qty: 5`, `Quantity: 10` |

#### 2.2 Fix HKD currency support

Update price regex to include:
- `HK$1,234.00` / `HKD 1,234.00`
- `¥1,234.00` (for CNY invoices)
- Plain number after "Total:" without currency symbol

#### 2.3 Improve supplier detection

Add fallback strategies:
1. First line of text (many invoices start with company name)
2. Text near logo area (top-left region)
3. Text before "Invoice" or "Receipt" keyword
4. Registered company patterns (e.g., "xxx Co., Ltd.", "xxx Limited")

#### 2.4 Fix warranty date calculation

If purchase date is extracted, use it as `warrantyStartDate` instead of today's date. Calculate `warrantyEnd` from `purchaseDate + warrantyMonths`.

#### 2.5 Use purchase date for the purchaseDate form field

Map extracted purchase date directly to `formData.purchaseDate`.

---

### Phase 3 — Enhance Quality (UX & Performance)

**Goal**: Better image handling, user confirmation, cleaner code.

#### 3.1 Add image preprocessing before OCR

Before passing image to Tesseract:
1. Load image into a canvas
2. Convert to grayscale
3. Apply simple contrast enhancement (threshold or histogram stretch)
4. Use the preprocessed canvas data for OCR

This is especially important for camera captures with uneven lighting.

#### 3.2 Add extracted data review step

After OCR completes, show a confirmation card:
```
┌─────────────────────────────────┐
│  Extracted Invoice Data         │
│                                 │
│  Invoice #:  INV-2025-001  ✓   │
│  Supplier:   ABC Ltd.      ✓   │
│  Price:      $1,234.00     ✓   │
│  Date:       2025-01-15    ✓   │
│  Warranty:   24 months     ✓   │
│                                 │
│  Confidence: 72% (Good)        │
│                                 │
│  [ Apply to Form ] [ Dismiss ] │
└─────────────────────────────────┘
```

User can review before data is applied. Fields with low individual word confidence could be highlighted.

#### 3.3 Remove debug console.log statements

Replace all `console.log('[OCR]...')` with either:
- Nothing (remove entirely), or
- A `DEBUG` flag that is off by default

#### 3.4 Optimize camera resolution

Request higher resolution for modern devices:
```js
video: {
  facingMode: 'environment',
  width: { ideal: 1920 },
  height: { ideal: 1080 }
}
```

---

## Implementation Priority & Effort

| Phase | Items | Effort | Risk | Priority |
|-------|-------|--------|------|----------|
| **Phase 1** | C1, C2, C3 | ~2-3 hours | Low (bug fixes, additive) | **Do first** |
| **Phase 2** | H1, H2, H3, M3 | ~2-3 hours | Medium (regex changes need testing) | **Do second** |
| **Phase 3** | M1, M2, M4, L1, L2 | ~3-4 hours | Low (UX additions, non-breaking) | **Do third** |

All changes are confined to `ManageItemsPage.vue` (and potentially a new `utils/ocr.js` helper if we want to extract the logic for cleanliness).

---

## Files Affected

| File | Changes |
|------|---------|
| `frontend/src/pages/ManageItemsPage.vue` | Worker lifecycle, confidence check, scanned PDF fallback, expanded regex, preprocessing, review UI |
| *(Optional)* `frontend/src/utils/ocrHelper.js` | Extract OCR logic into reusable module if ManageItemsPage gets too large |

---

## Success Criteria

- [ ] Repeat OCR scans reuse the same worker (no memory leak)
- [ ] Scanned PDFs produce extracted text via image fallback
- [ ] Low-confidence scans show warning; very-low refuse to auto-fill
- [ ] HK$ / HKD prices are correctly extracted
- [ ] Purchase date, PO number, serial number are extracted when present
- [ ] Supplier detected from top-of-invoice company names
- [ ] Warranty dates calculated from purchase date (not today)
- [ ] Camera captures preprocessed for better accuracy
- [ ] User sees review card before data auto-fills
- [ ] No debug console.log in production
