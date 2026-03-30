# 📊 Supplier / Vendor Clarification & Unification Tracking Card

**Purpose:** Clarify definitions, unify field naming, align UI display, and fix inconsistent logic  
**Date Created:** 2026-03-30  
**Priority:** 🟡 MEDIUM (impacts data accuracy and user understanding)  
**Status:** 📋 Tracking Card (Awaiting Implementation)

---

## 1. Executive Summary

### The Problem
The system uses **three related but distinct fields** for supplier information, but they are **inconsistently named, labeled, and used** across the codebase:

| Field | Purpose | Current State |
|-------|---------|--------|
| `supplier` | Company that provides the item (procurement/supply chain) | ❌ Confusing naming, mixed use in UI |
| `vendor` | Company that sells the item (may differ from supplier) | ❌ Unused in forms, inconsistent in filters |
| `warrantyVendor` | Company providing warranty service | ❌ Missing from UI entirely |

### Impact
- **User Confusion:** Teachers/admins don't know which field to fill
- **Data Inconsistency:** Supplier/vendor info mixed across items
- **Search Issues:** Filtering by "Vendor" doesn't work as expected
- **Reporting Issues:** Can't distinguish procurement vs sales for financial reconciliation

### Solution Overview
1. **Define Clear Semantic Differences** between supplier/vendor/warrantyVendor
2. **Standardize Field Naming** (consistent camelCase)
3. **Align UI Labels & Display** with intended purpose
4. **Add Missing Form Fields** for vendor and warrantyVendor
5. **Update API Filtering** to use correct fields
6. **Migrate Existing Data** if necessary (safe defaults)

---

## 2. Semantic Definitions (Source of Truth)

Based on [DATA_FIELD_PLAN.md] lines 62-72 and current system intent:

### Field A: `supplier` (Primary Supplier)
**Purpose:** Company that provides/manufactures the item  
**Use Case:** Procurement, supply chain tracking, invoice matching  
**Who Fills It:** Admin during item creation OR department when ordering  
**Example Values:** "Dell", "HP", "Apple", "Lenovo", "Custom Manufacturer"  
**Field Type:** String  
**Required:** NO (can be empty if unknown)  
**UI Display:** Show in all inventory views  

**Key Decision:** This is the "source of product" - who provided it to the university

---

### Field B: `vendor` (Sales Vendor)
**Purpose:** The reseller/distributor who sold it to us  
**Use Case:** Sales/reseller tracking, different from supplier manufacturer  
**Distinction:** Often DIFFERENT from supplier (e.g., supplier=Apple, vendor=CDK Global)  
**Who Fills It:** Admin during creation OR from PO/invoice  
**Example Values:** "CDK Global", "Tech Data", "Amazon Business", "University IT"  
**Field Type:** String  
**Required:** NO  
**UI Display:** Optional field, useful for reconciliation  

**Key Decision:** This is "who we bought it from" - not always the manufacturer

---

### Field C: `warrantyVendor` (Warranty Service Provider)
**Purpose:** Company providing the warranty/support service  
**Use Case:** Warranty claims, support tracking, contract management  
**Distinction:** Can be supplier, different company, or internal  
**Who Fills It:** Admin when setting up warranty  
**Example Values:** "Dell ProSupport", "AppleCare+", "HP Complete Care", "Internal IT"  
**Field Type:** String  
**Required:** NO  
**UI Display:** In warranty details section  

**Key Decision:** This is "who provides support" - independent of supply/sales

---

### Relationship Diagram

```
Manufacturer (Supplier)      Reseller (Vendor)      Warranty Provider (warrantyVendor)
     |                            |                            |
     |-- Makes product ----------→ Sells to university ←--------+
     |                            |
     └────────────────────────────┘
                  |
            University Owns Item
```

**Example Scenario:**
```
Item: MacBook Pro
- supplier: Apple Inc. (makes the laptop)
- vendor: CDK Global (sold it to us through procurement)
- warrantyVendor: AppleCare+ Services (provides 3-year coverage)

Item: HP Laptop (bulk purchase)
- supplier: HP Inc. (manufacturer)
- vendor: Amazon Business (ordered through here)
- warrantyVendor: HP (HP warranty service)

Item: Custom PC (built internally)
- supplier: Various (motherboard from ASUS, RAM from Corsair, etc.)
- vendor: Internal IT Department (assembled here)
- warrantyVendor: Internal IT Department (we provide support)
```

---

## 3. Current Inconsistencies Identified

### 3.1 Database Model (Item.js)

**Status:** ✅ Correctly defined at lines 68-114

```javascript
supplier: { type: String, default: '', trim: true }         // ✅ Correct
supplierStatus: { type: String, default: '', trim: true }   // ✅ Correct
warrantyVendor: { type: String, default: '', trim: true }   // ✅ Correct
vendor: { type: String, default: '', trim: true }           // ✅ Correct
```

**Assessment:** Model definitions are GOOD ✅

---

### 3.2 Backend API Filtering (itemController.js)

**Status:** ⚠️ Partially correct - both fields used in filters

```javascript
// Lines 49-63: getItems() handler
if (vendor) filter.vendor = vendor;                 // ✅ Correct
if (supplier) filter.supplier = new RegExp(supplier, 'i');  // ✅ Correct (regex for search)

// Lines 175-186: getUserItems() for teacher items
if (vendor) filter.vendor = vendor;                 // ✅ Correct
// NOTE: supplier filter NOT included in this endpoint ⚠️

// Lines 462-464: Excel import
supplier: mapColumn(row, ['supplier', 'Supplier'], ''),  // ✅ Handles variations
vendor: mapColumn(row, ['vendor', 'Vendor'], ''),        // ✅ Handles variations
```

**Issues Found:**
- ⚠️ `getUserItems()` doesn't support supplier filter (line 175) - inconsistent with `getItems()` ⚠️ Supplier used in text search (line 91) but not in structured filter

**Assessment:** API filtering mostly correct, minor exposure gap ⚠️

---

### 3.3 Frontend: ManageItemsPage.vue

**Status:** ❌ Mixed use of fields, confusing logic

```vue
<!-- Line 85-96: FILTER INPUTS -->
<label>Vendor</label>
<select v-model="searchFilters.vendor"><!-- Uses vendor field ✅ -->
  <option v-for="v in uniqueVendors" :value="v">{{ v }}</option>
</select>

<label>Supplier</label>
<input v-model="searchFilters.supplier" placeholder="Search supplier..."><!-- ✅ Correct -->

<!-- Line 488-493: CREATE FORM -->
<label>Supplier</label>
<input v-model="formData.supplier"><!-- ✅ Has supplier field -->
<!-- ❌ MISSING: vendor field -->
<!-- ❌ MISSING: warrantyVendor field -->

<!-- Line 683-685: COMPUTED uniqueVendors -->
const uniqueVendors = computed(() => {
  const vendors = items.value.map(i => i.vendor || i.supplier)  // ❌ WRONG!
  // This mixes vendor and supplier fields!
})

<!-- Line 143-167: TABLE DISPLAY -->
<th @click="toggleSort('supplier')">Supplier</th>
<td>{{ item.supplier }}</td>  // ✅ Shows supplier correctly
```

**Issues Found:**
- ❌ **Line 684:** `uniqueVendors` computed property mixes vendor and supplier: `i.vendor || i.supplier`
  - Should be: `i.vendor` ONLY (or fallback to supplier if vendor is empty)
  - This breaks the semantic distinction
- ❌ Form has supplier field but MISSING vendor and warrantyVendor fields
- ⚠️ Vendor filter dropdown empty if vendors not filled (only supplier is)

**Assessment:** MAJOR issues - wrong logic in vendor list ❌

---

### 3.4 Frontend: LentOutFilterPage.vue

**Status:** ❌ Labels don't match field logic

```vue
<!-- Line 53-58: FILTER -->
<label>Vendor</label>  ← Says "Vendor"
<select v-model="searchFilters.vendor">
  <option v-for="v in vendors">{{ v }}</option>
</select>

<!-- Line 126-127: TABLE HEADER -->
<th @click="toggleSort('supplier')">Vendor</th>  ← ❌ WRONG!
  <!-- Label says "Vendor" but toggleSort uses 'supplier' -->
  <!-- And displays group.parent.supplier -->

<!-- Line 157, 184: TABLE DISPLAY -->
<td>{{ group.parent.supplier }}</td>  ← Displays supplier, not vendor
```

**Issues Found:**
- ❌ **Line 126-127:** Column header labeled "Vendor" but sorts by `supplier` and displays `supplier`
  - Should be labeled "Supplier" to match data
  - OR properly populate vendor field and use vendor data
- ⚠️ Filter gets vendors list but may be empty (supplier being displayed instead)

**Assessment:** UI/Data mismatch - confusing for users ❌

---

### 3.5 Frontend: MyItemsPage.vue & SearchAvailableItemsPage.vue

**Status:** ✅ Correct - uses supplier field consistently

```vue
<!-- MyItemsPage.vue line 199 -->
<p class="field-label">Supplier</p>
<p>{{ selectedItem.supplier || 'N/A' }}</p>

<!-- SearchAvailableItemsPage.vue line 121-122 -->
<p class="field-label">Supplier</p>
<p>{{ selectedItem.supplier || 'N/A' }}</p>
```

**Assessment:** Correct usage ✅

---

### 3.6 Frontend: HomePage.vue

**Status:** ✅ Correct - uses supplier as fallback

```javascript
// Line 910
name: item.name || item.itemName, user: item.supplier || '—'
```

**Assessment:** Correct usage ✅

---

### 3.7 Data Consistency Documentation

**Existing Tracking:** DATA_CONSISTENCY_TRACKING_CARD.md lines 538-554

Fields documented but with note:
> "Fields like ... `vendor`, `supplierStatus`, `warrantyVendor` ... exist in the model and seed data but are NOT present in the frontend create/edit form"

**Assessment:** Issue already identified but not prioritized ⚠️

---

## 4. Root Cause Analysis

### Why Confusion Exists

1. **Naming Ambiguity**
   - Both "supplier" and "vendor" informally mean "company we bought from"
   - Industry inconsistency (some use "supplier"="manufacturer", others use "vendor"="reseller")
   - No documentation in code comments clarifying the distinction

2. **Incomplete Implementation**
   - Fields defined in model but not exposed in UI
   - Vendor dropdown tries to work without vendor data
   - Form only captures supplier, leaving vendor/warrantyVendor empty

3. **Copy-Paste Issues**
   - `uniqueVendors` uses fallback logic that conflates two fields
   - LentOutFilterPage copied from ManageItemsPage without validation

4. **Missing UI Education**
   - No labels explain what each field means
   - No help text or tooltips

---

## 5. Inconsistency Map

### Issue 1: UniqueVendors Logic Bug (CRITICAL)

**File:** `frontend/src/pages/ManageItemsPage.vue` line 684  
**Current Code:**
```javascript
const vendors = items.value.map(i => i.vendor || i.supplier).filter(Boolean)
```

**Problem:**
- If vendor is empty, falls back to supplier
- Creates list that mixes two concepts
- Vendor filter dropdown shows suppliers (wrong!)

**Fix:**
```javascript
const vendors = items.value
  .map(i => i.vendor)  // Only use vendor field
  .filter(Boolean)
  .filter((v, i, a) => a.indexOf(v) === i)  // Unique
  .sort()
```

**Impact:** After fix, vendor dropdown will be empty for items without vendor set. This is CORRECT - it shows the gap needing data entry.

---

### Issue 2: LentOutFilterPage Column Label Mismatch (MEDIUM)

**File:** `frontend/src/pages/LentOutFilterPage.vue` line 126-127  
**Current Code:**
```vue
<th @click="toggleSort('supplier')">Vendor</th>
```

**Problem:**
- Label says "Vendor" but column shows supplier data
- User confused about what they're sorting

**Options:**
1. **Option A (Recommended):** Change label to match data
   ```vue
   <th @click="toggleSort('supplier')">Supplier</th>
   ```

2. **Option B:** Full migration (more work, better long-term)
   - Populate vendor field properly
   - Change column to show vendor instead
   - Required caution with existing data

**Recommendation:** Option A for now, plan Option B for future

---

### Issue 3: Form Missing Fields (MEDIUM)

**File:** `frontend/src/pages/ManageItemsPage.vue` lines 488-493

**Current State:**
```vue
<label>Supplier</label>
<input v-model="formData.supplier">
<!-- ❌ Missing vendor field -->
<!-- ❌ Missing warrantyVendor field -->
```

**Why Missing:**
- Designed for basic inventory + borrowing workflow
- Financial/warranty fields left for import-only initially
- Incomplete data entry story

**Options:**
1. **Option A (Quick):** Add optional fields to form
   - Add vendor text input
   - Add warrantyVendor text input
   - Update formData initialization

2. **Option B (Better UX):** Group related fields
   ```vue
   <fieldset>
     <legend>Procurement Information</legend>
     <input v-model="formData.supplier" placeholder="Manufacturer name">
     <input v-model="formData.vendor" placeholder="Reseller/distributor">
   </fieldset>
   
   <fieldset>
     <legend>Warranty Information</legend>
     <input v-model="formData.warrantyVendor" placeholder="Warranty provider">
     <!-- Other warranty fields -->
   </fieldset>
   ```

**Recommendation:** Option B - better UX, groups related information

---

### Issue 4: API Endpoint Inconsistency (LOW)

**File:** `backend/controllers/itemController.js` line 175 (`getUserItems`)

**Current State:**
- `getItems()` supports both supplier and vendor filters ✅
- `getUserItems()` only supports vendor filter ⚠️ (supplier missing)

**Fix:**
Add supplier filter support to `getUserItems()` to match `getItems()`

---

## 6. Implementation Checklist

### Phase 1: Documentation & Definition (0.5 hours)

- [x] Create this tracking card with clear definitions
- [x] Document semantic differences
- [x] Map all occurrences

### Phase 2: Fix Critical Bugs (1.5 hours)

- [ ] **ManageItemsPage.vue line 684:** Fix uniqueVendors logic
  ```javascript
  const vendors = items.value
    .map(i => i.vendor)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()
  ```
  
- [ ] **LentOutFilterPage.vue line 127:** Change "Vendor" label to "Supplier" (temp fix)
  ```vue
  <th @click="toggleSort('supplier')">Supplier</th>
  ```

### Phase 3: Add Missing Form Fields (1 hour)

- [ ] **ManageItemsPage.vue:** Add vendor field to form (after supplier)
  ```vue
  <div>
    <label class="form-label">Vendor (Reseller/Distributor)</label>
    <input
      type="text"
      v-model="formData.vendor"
      class="form-input"
      placeholder="e.g., CDK Global, Amazon Business"
    />
  </div>
  ```

- [ ] **ManageItemsPage.vue:** Add warrantyVendor field in warranty section
  ```vue
  <div>
    <label class="form-label">Warranty Provider</label>
    <input
      type="text"
      v-model="formData.warrantyVendor"
      class="form-input"
      placeholder="e.g., AppleCare+, HP Complete Care"
    />
  </div>
  ```

- [ ] **ManageItemsPage.vue:** Update formData initialization
  ```javascript
  // Around line 618
  const formData = ref({
    // ... existing fields ...
    supplier: '',      // ✅ Already present
    vendor: '',        // + Add this
    warrantyVendor: '', // + Add this
  })
  ```

- [ ] **ManageItemsPage.vue:** Update form submission to include new fields
  ```javascript
  supplier: formData.value.supplier,
  vendor: formData.value.vendor,           // + Add this
  warrantyVendor: formData.value.warrantyVendor,  // + Add this
  ```

- [ ] **ManageItemsPage.vue:** Update form load (line 881)
  ```javascript
  supplier: item.supplier || '',
  vendor: item.vendor || '',               // + Add this
  warrantyVendor: item.warrantyVendor || '', // + Add this
  ```

### Phase 4: Add UI Labels & Help Text (1 hour)

- [ ] **Add form labels** with clear purpose:
  - Supplier: "Manufacturer that makes this product"
  - Vendor: "Reseller we purchased from (may differ from manufacturer)"
  - warrantyVendor: "Company providing warranty/support service"

- [ ] **Update filter labels** for clarity:
  - Keep "Supplier" in ManageItemsPage filter
  - Optionally add "Vendor" filter if data populated

- [ ] **Add tooltips** to form inputs explaining each field

### Phase 5: API Layer Consistency (0.5 hours)

- [ ] **itemController.js line 175:** Add supplier filter to getUserItems()
  ```javascript
  if (supplier) filter.supplier = new RegExp(supplier, 'i');
  ```

- [ ] **Document query parameter capabilities** in API routes

### Phase 6: Data Integrity Check (1 hour)

- [ ] Analyze existing data:
  - How many items have vendor populated?
  - How many have warrantyVendor populated?
  - Any supplier/vendor conflicts?

- [ ] Decide on migration strategy:
  - Keep existing data as-is (simplest)
  - Parse vendor info from supplier if possible
  - Manual audit and correction

### Phase 7: Testing (1.5 hours)

- [ ] Test ManageItemsPage filtering:
  - [ ] Filter by supplier works
  - [ ] Filter by vendor works (after form field added)
  - [ ] Vendor dropdown populated correctly

- [ ] Test form submission:
  - [ ] Can set supplier + vendor + warrantyVendor
  - [ ] Data saved and retrieved correctly
  - [ ] Edit form shows all three fields

- [ ] Test data display:
  - [ ] Supplier shows in all views
  - [ ] Vendor shows when populated
  - [ ] warrantyVendor shows in warranty section

- [ ] Test API:
  - [ ] Both getItems and getUserItems support same filters
  - [ ] Excel import parses all three fields correctly

---

## 7. Risk Assessment

### Low Risk ✅
- Adding form fields (purely additive)
- Fixing label mismatches (display only)
- Adding help text

### Medium Risk ⚠️
- Changing uniqueVendors logic (may affect existing code relying on current behavior)
- Changing filter labels (might confuse users expecting old labels)

### Mitigation
- Deploy fixes incrementally
- Add feature flag for new vendor filter
- Communicate changes to users

---

## 8. Data Migration Strategy

### Current State
- Most items have `supplier` populated ✅
- Most items have `vendor` empty ❌
- Most items have `warrantyVendor` empty ❌

### Options

**A) No Migration (Simplest)**
- Leave existing data as-is
- Start capturing vendor/warrantyVendor for new items
- Mark fields as optional indefinitely
- Risk: Reports incomplete for old items

**B) Auto-Population (Moderate)**
- For items where vendor is empty, populate from supplier
- This creates data but loses distinction between supplier and vendor
- Could do in batch or as data is edited
- Risk: Conflates two concepts

**C) Manual Audit (Thorough)**
- QA team reviews high-value items
- Corrects supplier/vendor distinction manually
- Time-intensive but most accurate
- Recommended for items with financial records

**Recommendation:** Option A + Option C (selective)
- Use Option A for default (minimize work)
- Use Option C for high-value items (>$5000?)

---

## 9. Compliance with System Architecture

### Alignment with Previous Tracking Cards

**Phase 2 (Data Consistency):** ✅ Related
- DATA_CONSISTENCY_TRACKING_CARD.md already noted missing form fields
- This card implements the unification aspect

**Phase 3 (Date/Timezone):** ✅ Independent
- No timezone issues with supplier fields

**Phase 4 (Status Naming):** ✅ Independent
- supplierStatus is separate from supplier field

**Phase 5 (Teacher Pagination):** ✅ Independent
- pagination doesn't impact supplier/vendor fields

---

## 10. Effort Estimate & Timeline

| Phase | Task | Hours | Effort |
|-------|------|-------|--------|
| 1 | Documentation | 0.5 | 🟢 Trivial |
| 2 | Fix critical bugs | 1.5 | 🟢 Easy |
| 3 | Add form fields | 1 | 🟢 Easy |
| 4 | UI labels & help | 1 | 🟢 Easy |
| 5 | API consistency | 0.5 | 🟢 Trivial |
| 6 | Data audit | 1 | 🟡 Medium |
| 7 | Testing | 1.5 | 🟡 Medium |
| | **TOTAL** | **7** | 🟡 **Medium** |

**Sprint Fit:** Can complete in 1-2 days with developer + QA

---

## 11. Phyllis Verification Requirements

See: [PHYLLIS_SUPPLIER_VENDOR_VERIFICATION.md] (created separately)

Key verification points:
- [ ] Form allows entering all three fields
- [ ] Filter behaviors match field semantics
- [ ] Existing data not corrupted
- [ ] New items capture all three fields correctly
- [ ] API responses include all three fields
- [ ] UI labels clear and consistent

---

## 12. Sign-Off & Next Steps

### For Dev Team
- [ ] Review definitions section (Section 2)
- [ ] Implement Phase 2-5 fixes (7 hours total)
- [ ] Run test suite before handing to QA

### For QA Lead (Phyllis)
- [ ] Review Semantic Definitions (Section 2) for acceptance
- [ ] Execute PHYLLIS_SUPPLIER_VENDOR_VERIFICATION.md test cases
- [ ] Confirm definitions meet business requirements
- [ ] Sign off on data quality

### For Product/Business
- [ ] Confirm semantic definitions match business intent
- [ ] Approve data migration strategy (Section 8)
- [ ] Communicate changes to users in release notes

---

## 13. Appendix: Field Definition Reference

### Quick Reference Table

| Aspect | Supplier | Vendor | warrantyVendor |
|--------|----------|--------|---|
| **Semantic** | Manufacturer | Reseller | Support Provider |
| **Example** | Apple Inc. | CDK Global | AppleCare+ |
| **Form Field** | Yes (existing) | Yes (need to add) | Yes (need to add) |
| **Filter Support** | Yes | Yes | No (N/A) |
| **In Borrow Display** | ✅ | ⚠️ (confusing label) | N/A |
| **In Form** | ✅ | ❌ Need to add | ❌ Need to add |
| **Use in Export** | ✅ | 〰️ Limited | ✅ |
| **Required** | No | No | No |

### Field Mapping Reference

**Database Field → Form Label → API Parameter**
- supplier → "Supplier (Manufacturer)" → ?supplier=
- vendor → "Vendor (Reseller)" → ?vendor=
- warrantyVendor → "Warranty Provider" → (not in API filter, display only)

---

## 14. Related Documents

- [DATA_FIELD_PLAN.md](../DATA_FIELD_PLAN.md#L60-L72) - Original field definitions
- [DATA_CONSISTENCY_TRACKING_CARD.md](./DATA_CONSISTENCY_TRACKING_CARD.md#L538) - Already identified missing fields
- [DATABASE_FIELD_SCHEMA.md](./DATABASE_FIELD_SCHEMA.md#L139) - Current schema documentation
- [Item.js](../backend/models/Item.js#L68-L114) - Database model definition

---

**Version:** 1.0  
**Last Updated:** 2026-03-30  
**Status:** Ready for Development
