# ✅ Supplier / Vendor Clarification - Phyllis Verification Checklist

**For:** QA Lead (Phyllis)  
**Purpose:** Verify supplier/vendor definitions, UI consistency, and data integrity  
**Date Started:** _____________  
**Date Completed:** _____________  

---

## 1. Pre-Test Setup

### Environment Verification
- [ ] Backend running on `http://localhost:5002`
- [ ] Frontend running on `http://localhost:3000`
- [ ] Test user accounts:
  - [ ] Admin account (for creating/editing items)
  - [ ] Teacher account (for viewing borrowed items)
- [ ] Sample items with various supplier/vendor combinations:
  - [ ] Item with supplier + vendor + warrantyVendor
  - [ ] Item with only supplier
  - [ ] Item with empty supplier/vendor fields

**Preparation Steps:**

```bash
# Create test items with different configurations
curl -X POST http://localhost:5002/api/items \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "TEST_COMPLETE",
    "name": "Complete Test Item",
    "supplier": "Apple Inc.",
    "vendor": "CDK Global",
    "warrantyVendor": "AppleCare+ Services"
  }'

curl -X POST http://localhost:5002/api/items \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "TEST_SUPPLIER_ONLY",
    "name": "Supplier Only Item",
    "supplier": "Dell Technologies"
  }'

curl -X POST http://localhost:5002/api/items \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "TEST_EMPTY",
    "name": "Empty Supplier Item"
  }'
```

---

## 2. Semantic Definition Verification

### Test Case #1: Definitions Clarity

**Objective:** Verify the three supplier-related fields have clear, distinct meanings

**Reference:** SUPPLIER_VENDOR_CLARIFICATION_TRACKING_CARD.md Section 2

**Step 1: Review Definitions Document**
- [ ] Read Section 2 (Semantic Definitions) of tracking card
- [ ] Definitions clear and business-aligned?
  - [ ] ✅ Supplier = Manufacturer/Provider
  - [ ] ✅ Vendor = Reseller/Distributor
  - [ ] ✅ warrantyVendor = Support Service Provider

**Step 2: Confirm With Product Manager**
- [ ] Definitions match business requirements?
- [ ] Examples realistic for university inventory?
- [ ] Any corrections needed?

**Finding LOG:**
```
Decision: Accept / Reject / Modify
Comments: _________________________________________
```

---

## 3. UI Form Verification

### Test Case #2: Form Field Presence

**Objective:** Verify create/edit form has all three supplier-related fields

**Location:** ManageItemsPage.vue (Manage Items page)

**Steps:**

1. **Navigate to Item Management**
   - URL: `/manage-items` (or similar)
   - Login as admin

2. **Create New Item (click "Add Item" or similar)**
   - [ ] Form opens
   - [ ] Can see "Supplier" field? ✅ (should exist from initial state)

3. **Check for All Three Fields**
   - [ ] Field 1: "Supplier" labeled as producer/manufacturer
     - Found at: _______________
     - Placeholder/Help text: _____________
   
   - [ ] Field 2: "Vendor" labeled as reseller/distributor
     - [ ] PRESENT in form? YES / NO
     - [ ] If present - located where: ___________
     - [ ] Placeholder: _____________
     - [ ] If NOT present - ❌ NEEDS IMPLEMENTATION
   
   - [ ] Field 3: "warrantyVendor" labeled as warranty provider
     - [ ] PRESENT in form? YES / NO
     - [ ] If present - located where: ___________
     - [ ] Placeholder: _____________
     - [ ] If NOT present - ❌ NEEDS IMPLEMENTATION

4. **Test Field Functionality**

   **For Supplier Field:**
   ```
   - [ ] Can type in field
   - [ ] Can clear field
   - [ ] Can edit existing value
   - [ ] Field accepts alphanumeric + special chars (company names with &, -, etc.)
   - [ ] Field trims whitespace
   ```

   **For Vendor Field (if present):**
   ```
   - [ ] Can type in field
   - [ ] Can clear field
   - [ ] Can edit existing value
   - [ ] Field accepts alphanumeric + special chars
   - [ ] Field trims whitespace
   ```

   **For warrantyVendor Field (if present):**
   ```
   - [ ] Can type in field
   - [ ] Can clear field
   - [ ] Can edit existing value
   - [ ] Separate from supplier field (not same as supplier)
   ```

5. **Submit Form with All Fields**
   - [ ] Fill all three fields:
     - Supplier: "Apple Inc."
     - Vendor: "CDK Global"
     - warrantyVendor: "AppleCare+"
   - [ ] Click Save/Create
   - [ ] Form accepts submission ✅

6. **Verify Data Saved**
   - [ ] Item appears in list
   - [ ] Open item to edit
   - [ ] All three fields display with saved values
   - [ ] No data loss on round-trip

**Finding:**
- [ ] ✅ All fields present and working
- [ ] ⚠️ Partial implementation (missing: _________)
- [ ] ❌ Remove fields not implemented

---

### Test Case #3: Form Labels & Help Text

**Objective:** Verify form labels are clear and help users understand field purpose

**Steps:**

1. **For Each Field (supplier, vendor, warrantyVendor):**

   **Supplier Field:**
   - [ ] Label visible: "Supplier" or "Supplier (Manufacturer)" or similar
   - [ ] Matches definition: "Company that manufactures/produces the item"
   - [ ] Help text/tooltip present?
     - If YES, content: _____________________
     - If NO - should be added

   **Vendor Field (if present):**
   - [ ] Label visible and distinct from supplier
   - [ ] Matches definition: "Reseller/distributor we purchased from"
   - [ ] Help text? Content: _____________________
   - [ ] Clarifies difference from supplier?

   **warrantyVendor Field (if present):**
   - [ ] Label visible: "Warranty Vendor", "Warranty Provider", etc.
   - [ ] Matches definition: "Company providing warranty/support"
   - [ ] Help text? Content: _____________________

2. **User Understanding Test**
   - [ ] Form labels + help text clearly differentiate the three fields?
   - [ ] A teacher/admin can understand which field to fill?
   - [ ] Without labels, would it still be clear? (NO = needs better UX)

**Finding:**
- [ ] ✅ Clear labeling and help text
- [ ] ⚠️ Partial (missing help on: ___________)
- [ ] ❌ Confusing or missing labels

---

## 4. Data Loading & Display Verification

### Test Case #4: Edit Form Data Loading

**Objective:** Verify existing item data loads correctly into form

**Steps:**

1. **Edit Item with All Three Fields**
   - Use TEST_COMPLETE item (supplier + vendor + warrantyVendor populated)
   - Click Edit Button
   - [ ] Form opens
   - [ ] All three fields display correct values:
     - [ ] Supplier = "Apple Inc."
     - [ ] Vendor = "CDK Global"
     - [ ] warrantyVendor = "AppleCare+ Services"

2. **Edit Item with Partial Fields**
   - Use TEST_SUPPLIER_ONLY item (only supplier populated)
   - [ ] Supplier field shows "Dell Technologies"
   - [ ] Vendor field shows empty (not populated)
   - [ ] warrantyVendor field shows empty (not populated)
   - [ ] ✅ No cross-contamination

3. **Edit Item with Empty Fields**
   - Use TEST_EMPTY item
   - [ ] All three fields empty
   - [ ] Can add values

**Finding:**
- [ ] ✅ Data loads correctly
- [ ] ⚠️ Issues: _____________________
- [ ] ❌ Major load errors

---

## 5. Filter Verification

### Test Case #5: Supplier Filter

**Objective:** Verify supplier filter works correctly in ManageItemsPage

**Steps:**

1. **Locate Supplier Filter**
   - [ ] In ManageItemsPage filter section
   - [ ] Labeled as "Supplier"
   - Found at: (search text input)

2. **Filter by Supplier**
   - [ ] Type "Apple" in supplier filter
   - [ ] Results show only items with supplier containing "Apple"
   - [ ] Multiple suppliers work (try "Dell", etc.)
   - [ ] Filter is case-insensitive?
     - Test: type "apple" lowercase → matches "Apple Inc."?

3. **Filter Combinations**
   - [ ] Can use supplier + vendor filters together
   - [ ] AND logic (shows items matching BOTH)?
   - [ ] Filters reset properly

**Finding:**
- [ ] ✅ Supplier filter works
- [ ] ⚠️ Case sensitivity issues
- [ ] ❌ Filter broken

---

### Test Case #6: Vendor Filter

**Objective:** Verify vendor filter functionality

**Pre-condition:** Vendor field is populated in form (Test Case #2) ✅

**Steps:**

1. **Locate Vendor Filter**
   - [ ] In ManageItemsPage filter section
   - [ ] Labeled as "Vendor"
   - Type: (dropdown or text input?)

2. **If Vendor Filter is Dropdown:**
   - [ ] Dropdown shows unique vendor values from items
   - [ ] Wait - populate TEST_COMPLETE item first
   - [ ] Refresh page
   - [ ] Vendor dropdown should show "CDK Global" option
   - [ ] Can select from dropdown
   - [ ] Filtering works

3. **If Vendor Filter is Text Input:**
   - [ ] Type "CDK" → shows items with CDK Global
   - [ ] Filter works with partial text

4. **Verify Filter Logic**
   - [ ] Currently an issue: uniqueVendors fallback (line 684)
   - [ ] Has this been fixed?
     - If YES (vendor only): Test passes ✅
     - If NO (vendor || supplier): Test fails ❌
   
   **Test:** With items having:
   - Item A: vendor = "CDK Global", supplier = "Apple"
   - Item B: vendor = empty, supplier = "Dell"
   - Item C: vendor = "Amazon", supplier = "HP"
   
   Vendor dropdown should show: ["Amazon", "CDK Global"]
   - [ ] Does dropdown show correct values? ✅
   - [ ] Does NOT include supplier-only items? ✅
   - [ ] If includes "Dell" or "HP" → ❌ Bug not fixed

**Finding:**
- [ ] ✅ Vendor filter works correctly (bug fixed)
- [ ] ⚠️ Vendor dropdown shows some suppliers (bug NOT fixed)
- [ ] ❌ Vendor filter missing or broken

---

### Test Case #7: LentOutFilterPage Label Fix

**Objective:** Verify column labels and data alignment on borrow view

**Location:** LentOutFilterPage.vue

**Steps:**

1. **Verify Column Header Labels**
   - [ ] Navigate to Lent Out view (borrowed items)
   - [ ] Find "Vendor" column or similar
   -[ ] Current label: _____________
   - [ ] Current data displayed: (supplier or vendor?)

2. **Current State Check**
   - [ ] Column labeled "Vendor" but shows supplier data?
     - If YES → ❌ Label mismatch (issue #2 in tracking card)
     - If NO → ✅ Already fixed

3. **If Label Mismatch Exists:**
   - [ ] Change label to "Supplier" to match data
     - OR
   - [ ] Migrate column to show vendor field

4. **Verify Vendor Filter Integration**
   - [ ] Is there a "Vendor" filter dropdown on LentOutFilterPage?
   - [ ] Filter populated with correct data?
   - [ ] Filter works?

**Finding:**
- [ ] ✅ Labels match data, no confusion
- [ ] ⚠️ Partial: _________________
- [ ] ❌ Label mismatch still exists

---

## 6. API Response Verification

### Test Case #8: GET /api/items - Response Includes All Fields

**Objective:** Verify API returns supplier, vendor, and warrantyVendor fields

**Steps:**

1. **Get Items List**
   ```bash
   curl "http://localhost:5002/api/items?page=1&pageSize=10" \
     -H "Authorization: Bearer <ADMIN_TOKEN>"
   ```

2. **Check Response Format**
   ```json
   {
     "items": [
       {
         "itemId": "TEST_COMPLETE",
         "name": "Complete Test Item",
         "supplier": "Apple Inc.",        // ✅ Should be present
         "vendor": "CDK Global",          // ✅ Should be present
         "warrantyVendor": "AppleCare+",  // ✅ Should be present
         ...
       }
     ]
   }
   ```

3. **Verify Each Field**
   - [ ] supplier field present: YES / NO
   - [ ] vendor field present: YES / NO
   - [ ] warrantyVendor field present: YES / NO
   - [ ] All fields contain correct values

4. **Filter Test**
   ```bash
   # Test supplier filter
   curl "http://localhost:5002/api/items?supplier=Apple"
   
   # Test vendor filter
   curl "http://localhost:5002/api/items?vendor=CDK"
   ```
   
   - [ ] Supplier filter works
   - [ ] Vendor filter works
   - [ ] Results correct

**Finding:**
- [ ] ✅ API returns all three fields correctly
- [ ] ⚠️ Missing: _______
- [ ] ❌ Fields missing or malformed

---

### Test Case #9: GET /api/items/by-owner/:id - Response Consistent

**Objective:** Verify teacher-specific endpoint returns same fields

**Steps:**

1. **Call Teacher Items Endpoint**
   ```bash
   curl "http://localhost:5002/api/items/by-owner/TEACHER_ID?page=1" \
     -H "Authorization: Bearer <TEACHER_TOKEN>"
   ```

2. **Check Response**
   - [ ] Response includes supplier field: YES / NO
   - [ ] Response includes vendor field: YES / NO
   - [ ] Response includes warrantyVendor field: YES / NO

3. **Compare with Main Endpoint**
   - [ ] Both endpoints return same fields?
     - [ ] YES ✅
     - [ ] NO ❌ (inconsistency)

**Finding:**
- [ ] ✅ Consistent across endpoints
- [ ] ❌ Inconsistent (missing on /by-owner)

---

### Test Case #10: Excel Import - Field Mapping

**Objective:** Verify Excel import correctly maps supplier/vendor/warrantyVendor columns

**Steps:**

1. **Prepare Test Excel File**
   - Columns: itemId, name, supplier, vendor, warrantyVendor, ...
   - Sample data:
     ```
     TEST_EXCEL_1, Imported Item 1, Apple Inc, CDK Global, AppleCare
     TEST_EXCEL_2, Imported Item 2, Dell Technologies, Amazon Business, Dell Complete Care
     ```

2. **Upload Excel**
   - [ ] File uploads successfully
   - [ ] No errors during import

3. **Verify Imported Data**
   - [ ] Can retrieve imported items via API
   - [ ] Check TEST_EXCEL_1:
     - [ ] supplier = "Apple Inc" ✅
     - [ ] vendor = "CDK Global" ✅
     - [ ] warrantyVendor = "AppleCare" ✅
   - [ ] Check TEST_EXCEL_2:
     - [ ] supplier = "Dell Technologies" ✅
     - [ ] vendor = "Amazon Business" ✅
     - [ ] warrantyVendor = "Dell Complete Care" ✅

4. **Test Column Name Variations**
   - [ ] Try "Supplier" (capitalized)
   - [ ] Try "Vendor" (capitalized)
   - [ ] Try "Warranty Vendor" (with space)
   - Try "SUPPLIER", "supplier", "VENDOR", etc.
   - [ ] All variations work correctly

**Finding:**
- [ ] ✅ Excel import handles all three fields
- [ ] ⚠️ Partial support: _______
- [ ] ❌ Import broken or incomplete

---

## 7. Data Integrity Tests

### Test Case #11: No Field Contamination

**Objective:** Verify supplier and vendor are separate and don't contaminate each other

**Steps:**

1. **Create Item with ONLY Supplier**
   - Fields:
     - supplier: "ManufacturerCo"
     - vendor: empty
     - warrantyVendor: empty
   - Save

2. **Retrieve and Verify**
   - [ ] supplier = "ManufacturerCo" ✅
   - [ ] vendor is empty string or null (NOT "ManufacturerCo") ✅
   - [ ] warrantyVendor is empty (NOT "ManufacturerCo") ✅
   - No cross-field pollution

3. **Edit Item and Add Vendor**
   - [ ] Change vendor to "ResellCo"
   - [ ] supplier should remain "ManufacturerCo" ✅
   - [ ] warrantyVendor remain empty ✅

4. **Test the uniqueVendors Logic Bug (if not fixed)**
   - If the bug exists (vendor || supplier fallback):
     ```javascript
     // BUGGY CODE
     const vendors = items.map(i => i.vendor || i.supplier)
     // Would show: ["ManufacturerCo"] (wrong!)
     ```
   - [ ] uniqueVendors should show:
     - Items with vendor: ["ResellCo"]
     - Items without vendor: [] (empty)
   - [ ] Does NOT mix in supplier values

**Finding:**
- [ ] ✅ Complete separation, uniqueVendors correct
- [ ] ⚠️ Slight contamination in fallback logic
- [ ] ❌ Significant data contamination

---

### Test Case #12: Existing Data Validation

**Objective:** Check health of existing supplier/vendor data

**Steps:**

1. **Count Items by Field Population**
   ```bash
   # Query database
   db.items.countDocuments({ supplier: { $ne: '' } })  // Count with supplier
   db.items.countDocuments({ vendor: { $ne: '' } })     // Count with vendor
   db.items.countDocuments({ warrantyVendor: { $ne: '' } })  // Count with warranty
   ```

2. **Record Results**
   - Items with supplier: _____
   - Items with vendor: _____
   - Items with warrantyVendor: _____
   - Items with supplier + vendor: _____
   - Sample: 70% supplier, 5% vendor, 10% warrantyVendor

3. **Check for Inconsistencies**
   - [ ] Any items with vendor but NO supplier?
     - Count: _____
     - Acceptable? (may be reseller-specific items)
   
   - [ ] Any items with vendor containing duplicate of supplier?
     - Example: supplier="Apple", vendor="Apple" (redundant)
     - Count: _____
   
   - [ ] Any special characters or oddities?
     - Check sample of 5-10 items manually

4. **Data Quality Assessment**
   - [ ] ✅ Data looks reasonable and consistent
   - [ ] ⚠️ Some gaps (vendor/warrantyVendor empty as expected)
   - [ ] ❌ Serious issues found (describe):
     ```
     Issues: ___________________________
     ```

**Finding:**
- [ ] ✅ Data clean and consistent
- [ ] ⚠️ Minor gaps (optional fields, expected)
- [ ] ❌ Data quality issues detected

---

## 8. UI Display Verification

### Test Case #13: MyItemsPage Display

**Objective:** Verify item details view shows supplier correctly

**Steps:**

1. **Navigate to Student/Teacher View**
   - URL: `/my-items` (or similar student page)
   - Click on an item to view details

2. **Check Supplier Display**
   - [ ] "Supplier" label visible
   - [ ] Shows supplier value correctly
   - [ ] Shows "N/A" if empty (not blank)

3. **Check Vendor Display**
   - [ ] If vendor is populated, is it shown?
     - YES: Where? (under supplier? separate section?)
     - NO: Expected (not in student view)

4. **Check warrantyVendor Display**
   - [ ] If warrantyVendor populated, shown in warranty section?
     - YES: Where?
     - NO: Expected (optional in this view)

**Finding:**
- [ ] ✅ Displays correct, clear
- [ ] ⚠️ Minor issues: ______
- [ ] ❌ Data not showing or wrong field

---

### Test Case #14: ManageItemsPage Table Display

**Objective:** Verify admin table shows supplier column correctly

**Steps:**

1. **Navigate to ManageItemsPage**
   - [ ] Load items list
   - [ ] Table displays

2. **Verify Column Presence**
   - [ ] "Supplier" column present
   - [ ] Column header clear

3. **Verify Column Data**
   - [ ] Shows supplier values for items with supplier
   - [ ] Shows empty/N/A for items without supplier
   - [ ] Data sorted correctly if sortable

4. **Check for Vendor Column**
   - [ ] Is there a vendor column?
     - YES: Verify it shows vendor (not supplier as fallback)
     - NO: Should be added in future

**Finding:**
- [ ] ✅ Displays correctly
- [ ] ⚠️ Minor adjustments needed
- [ ] ❌ Missing or wrong column

---

## 9. Issue Logging Template

### Issue #1: [Short Description]

**Severity:** 🔴 CRITICAL / 🟡 MEDIUM / 🟢 MINOR  
**Component:** [File/Page affected]  
**Test Case:** [Which test found this]  

**Description:**
[What's wrong]

**Steps to Reproduce:**
1. ...
2. ...

**Expected:** [What should happen]  
**Actual:** [What's happening instead]  

**Impact:** [How does this affect users]

**Suggested Fix:** [If known]

---

## 10. Summary & Recommendation

### Tests Executed

| Test # | Test Name | Result | Status |
|--------|-----------|--------|--------|
| 1 | Definitions Clarity | ⏳ PENDING | |
| 2 | Form Field Presence | ⏳ PENDING | |
| 3 | Form Labels & Help | ⏳ PENDING | |
| 4 | Edit Form Data Load | ⏳ PENDING | |
| 5 | Supplier Filter | ⏳ PENDING | |
| 6 | Vendor Filter | ⏳ PENDING | |
| 7 | LentOutFilterPage Label | ⏳ PENDING | |
| 8 | GET /api/items Response | ⏳ PENDING | |
| 9 | GET /api/items/by-owner | ⏳ PENDING | |
| 10 | Excel Import Mapping | ⏳ PENDING | |
| 11 | Field Contamination | ⏳ PENDING | |
| 12 | Existing Data Validation | ⏳ PENDING | |
| 13 | MyItemsPage Display | ⏳ PENDING | |
| 14 | ManageItemsPage Table | ⏳ PENDING | |

### Issues Summary

- 🔴 **Critical:** ___
- 🟡 **Medium:** ___
- 🟢 **Minor:** ___

### Overall Assessment

- [ ] ✅ **APPROVED** - Supplier/vendor distinction clear, all fields working, UI consistent
- [ ] ⚠️ **APPROVED WITH NOTES** - Working but minor improvements recommended (see issue list)
- [ ] ❌ **REJECTED** - Critical issues found, needs rework before approval

### Data Quality Score: ___/10

---

## 11. Sign-Off

**Phyllis Signature:** ________________  
**Date:** ________________  
**Time Spent:** ___ hours  

**Quality Metrics:**
- Semantic Clarity: ___/10
- UI Consistency: ___/10
- Data Integrity: ___/10
- Form Completeness: ___/10

**Recommendations for Future:**
1. ___________________________________
2. ___________________________________
3. ___________________________________

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-30
