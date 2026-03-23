# Student Pages Test Cases

This document outlines the test cases for the student-facing pages of the inventory management system.

## 1. Search Available Items Page (`SearchAvailableItemsPage.vue`)

### 1.1. Filtering and Searching

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-SAI-001 | **Search by item name** | 1. Navigate to "Search Available Items".<br>2. In the "Search" input, type the name of an existing available item. | The list updates to show only items whose name contains the search term. | The list does not update, or shows incorrect items. | [ ] |
| TC-SAI-002 | **Search by item ID** | 1. Navigate to "Search Available Items".<br>2. In the "Search" input, type the ID of an existing available item. | The list updates to show the item with the matching ID. | The item is not found. | [ ] |
| TC-SAI-003 | **Search with no results** | 1. Navigate to "Search Available Items".<br>2. In the "Search" input, type a random string that does not match any item. | The list becomes empty, and an "No items match your search" message is displayed. | An error occurs, or the list is not empty. | [ ] |
| TC-SAI-004 | **Filter by category** | 1. Navigate to "Search Available Items".<br>2. Select a category from the "Category" dropdown. | The list updates to show only items belonging to the selected category. | The list shows items from other categories. | [ ] |
| TC-SAI-005 | **Filter by location** | 1. Navigate to "Search Available Items".<br>2. Select a location from the "Location" dropdown. | The list updates to show only items at the selected location. | The list shows items from other locations. | [ ] |
| TC-SAI-006 | **Combined filtering** | 1. Navigate to "Search Available Items".<br>2. Enter a search term.<br>3. Select a category.<br>4. Select a location. | The list updates to show items that match all three criteria. | The filtering is not applied correctly. | [ ] |
| TC-SAI-007 | **Reset filters** | 1. Apply some filters.<br>2. Clear the search input.<br>3. Set "Category" and "Location" back to "All". | The list reverts to showing all available items. | The filters are not cleared. | [ ] |

### 1.2. Item List and Details

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-SAI-008 | **View item list** | 1. Navigate to "Search Available Items". | A list of available items is displayed in cards, showing basic information (ID, name, type, category, status, location). | The list is empty when it should not be, or item information is missing/incorrect. | [ ] |
| TC-SAI-009 | **View item details modal** | 1. Click on any item card in the list. | A modal window pops up, displaying detailed information about the selected item, including linked components if any. | The modal does not appear, or it shows incorrect information. | [ ] |
| TC-SAI-010 | **Close item details modal** | 1. Open the item details modal.<br>2. Click the "Close" button or the '×' icon. | The modal closes, and the user is returned to the item list. | The modal does not close. | [ ] |

### 1.3. Pagination

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-SAI-011 | **Navigate to next page** | 1. On a list with more items than the page size, click the "Next" or a page number button in the pagination control. | The list updates to show the next set of items. | The list does not change, or shows the wrong set of items. | [ ] |

### 1.4. Empty State

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-SAI-012 | **Empty state on initial load** | 1. Ensure there are no available items in the system.<br>2. Navigate to "Search Available Items". | The page displays a message "No items match your search" (or similar) instead of a list. | The page shows an empty list without a message, or an error. | [ ] |

## 2. New Borrow Request Page (`NewBorrowRequestPage.vue`)

### 2.1. Form Submission

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-NBR-001 | **Successful borrow request** | 1. Navigate to "New Borrow Request".<br>2. Select an available item from the list.<br>3. Fill in the "Reason for Borrowing" textarea.<br>4. Click "Submit Request". | A success message "Request submitted successfully!" appears. The form is cleared, and the user is ready to make another request. | The request fails without a clear error message. The form does not reset. | [ ] |
| TC-NBR-002 | **Request without selecting an item** | 1. Navigate to "New Borrow Request".<br>2. Do not select an item.<br>3. Fill in the reason and click "Submit Request". | An alert or validation message appears, e.g., "Please select an item...". The request is not submitted. | The request is submitted, or an unhandled error occurs. | [ ] |
| TC-NBR-003 | **Request without providing a reason** | 1. Navigate to "New Borrow Request".<br>2. Select an item.<br>3. Leave the "Reason for Borrowing" textarea empty.<br>4. Click "Submit Request". | An alert or validation message appears, e.g., "...and provide a reason". The request is not submitted. | The request is submitted. | [ ] |
| TC-NBR-004 | **Request with file upload** | 1. Navigate to "New Borrow Request".<br>2. Select an item and fill in the reason.<br>3. Use the file input to upload one or more files (image/pdf).<br>4. Click "Submit Request". | The request is submitted successfully. The uploaded files are associated with the request (verify in teacher/admin view). | File upload fails, or the request submission fails. | [ ] |
| TC-NBR-005 | **Auto-borrow of linked components** | 1. Select an item that has linked components.<br>2. Submit the borrow request. | The main request is created, and separate borrow requests are automatically created for all linked components. The success message should indicate this. | Requests for linked components are not created. | [ ] |

### 2.2. UI and Interaction

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-NBR-006 | **View linked components** | 1. On the "New Borrow Request" page, click on an item that has linked components. | A section appears below the selected item, listing all its linked components with their status. | The component viewer does not appear, or it shows incorrect information. | [ ] |
| TC-NBR-007 | **Filter by owner** | 1. Select an owner from the "Filter by Owner" dropdown. | The list of available items updates to show only items belonging to that owner. | The list does not filter correctly. | [ ] |

### 2.3. Empty State

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-NBR-008 | **No available items** | 1. Ensure no items are available for borrowing.<br>2. Navigate to "New Borrow Request". | The page displays a message "No available computer items found". | The page shows an empty list without a message, or an error. | [ ] |

## 3. My Borrowing Record Page (`MyBorrowingRecordPage.vue`)

### 3.1. View Records and Pagination

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-MBR-001 | **View borrowing records** | 1. Navigate to "My Borrowing Record". | A list of the student's past and present borrowing records is displayed, grouped by the parent request. Each record shows details like item name, status, and dates. | The list is empty when it should not be, or the information is incorrect. | [ ] |
| TC-MBR-002 | **Pagination of records** | 1. If the student has more records than the page size, navigate between pages using the pagination control. | The list updates to show the correct set of records for each page. | Pagination does not work, or shows the wrong records. | [ ] |
| TC-MBR-003 | **View linked component records** | 1. Find a record for an item that was borrowed with linked components. | The parent item is displayed, and the linked components are shown as a sub-list under it. | Linked components are not shown, or are displayed as separate, ungrouped records. | [ ] |

### 3.2. Overdue Reminders and Status

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-MBR-004 | **Overdue item indicator** | 1. Have a record that is currently 'Approved' but past its `returnDate`.<br>2. Navigate to "My Borrowing Record". | The overdue record has a prominent "OVERDUE" badge, possibly with a distinct color or animation (e.g., pulsing). | The overdue item is not highlighted. | [ ] |
| TC-MBR-005 | **Status colors** | 1. Observe records with different statuses (Pending, Approved, Returned, etc.). | Each status has a distinct and meaningful color code (e.g., yellow for pending, green for approved, gray for returned). | Status colors are inconsistent or missing. | [ ] |

### 3.3. Modals and Actions

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-MBR-006 | **Open "Declare Return Date" modal** | 1. Find a record with status 'Approved'.<br>2. Click the "Declare Return Date" button. | A modal window opens, allowing the user to select a date. | The modal does not open. | [ ] |
| TC-MBR-007 | **Submit "Declare Return Date"** | 1. Open the "Declare Return Date" modal.<br>2. Select a valid date.<br>3. Click "Confirm". | The modal closes, the record updates with the new declared return date, and the list refreshes. | The date is not saved, or an error occurs. | [ ] |
| TC-MBR-008 | **Submit invalid "Declare Return Date"** | 1. Open the modal for a record with a required return date.<br>2. Select a date that is *after* the required return date.<br>3. Click "Confirm". | An error message is displayed within the modal (e.g., "Return date cannot be later..."). The modal remains open. | The invalid date is accepted, or the error is not handled gracefully. | [ ] |
| TC-MBR-009 | **Cancel "Declare Return Date" modal** | 1. Open the "Declare Return Date" modal.<br>2. Click "Cancel". | The modal closes without making any changes. | The modal does not close, or it saves a change unexpectedly. | [ ] |

### 3.4. Empty State

| Test Case ID | Description | Steps to Reproduce | Expected Result | Incorrect Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-MBR-010 | **No borrowing records** | 1. Log in as a new student with no borrowing history.<br>2. Navigate to "My Borrowing Record". | The page displays a message "No borrowing records". | The page is blank or shows an error. | [ ] |
