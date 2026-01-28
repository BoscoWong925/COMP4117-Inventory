# Book Library System - Specification

**Feature Number:** 001  
**Feature Slug:** book-library-system  
**Created:** 2026-01-28  
**Mission:** software-dev

---

## Overview

The Book Library System is a digital platform that enables library management operations, member account management, book discovery and borrowing, and administrative catalog maintenance. The system serves three primary user types: visitors (seeking to register), members (borrowing and returning books), and administrators (managing the catalog).

---

## User Stories

### US-001: User Registration
As a visitor, I want to create an account, so that I can borrow books from the library.

### US-002: Book Search
As a library member, I want to search books by title, author, or ISBN, so that I can quickly find specific books.

### US-003: Borrow Book
As a library member, I want to borrow an available book, so that I can read it at home.

### US-004: View Borrowed Books
As a library member, I want to see all my currently borrowed books, so that I can track due dates and avoid late fees.

### US-005: Return Book
As a library member, I want to return a borrowed book, so that others can borrow it.

### US-006: Admin Add Book
As a library admin, I want to add new books to the catalog, so that members have more books to choose from.

---

## User Scenarios & Testing

### Registration Flow (US-001)

**Primary Scenario: Visitor successfully creates account**
- Visitor navigates to registration page
- Enters email, password, full name
- Submits form
- Receives confirmation email
- Clicks confirmation link
- Account is activated, visitor is now a member
- System logs member in automatically

**Alternate Scenario: Email already registered**
- Visitor attempts to register with existing email
- System displays "Email already in use" error
- Visitor can attempt with different email or use password reset

**Alternate Scenario: Invalid input**
- Visitor enters weak password or incomplete fields
- System displays validation errors specific to each field
- Form remains populated, visitor can correct and resubmit

---

### Book Search Flow (US-002)

**Primary Scenario: Member searches by title**
- Member enters book title (partial or full) in search box
- System returns matching books with title, author, available copies
- Member can click on a book to view full details
- Search completes in under 2 seconds

**Alternate Scenario: Member searches by author**
- Member enters author name in search field
- System returns all books by that author
- Results sorted by publication date (newest first)

**Alternate Scenario: Member searches by ISBN**
- Member enters ISBN (10 or 13 digit format)
- System returns exact book match or "No results" message
- ISBN search is exact-match only

**No Results Scenario:**
- Member searches with criteria that match no books
- System displays "No books found" message with suggestion to try different criteria

---

### Borrow Book Flow (US-003)

**Primary Scenario: Member successfully borrows available book**
- Member views book details page
- Sees "Borrow" button (book has available copies)
- Clicks "Borrow"
- System checks: member is authenticated, has not reached borrow limit (5 books), book has available copies
- Borrow is recorded with due date 14 days from today
- Book appears in member's "Borrowed Books" list
- Available copy count decreases by 1
- Success message displayed: "Book borrowed successfully"

**Constraint Scenario: Member at borrow limit**
- Member has 5 books already borrowed
- Member clicks "Borrow" on any available book
- System displays: "You have reached the maximum borrow limit of 5 books. Return a book to borrow another."
- Borrow is rejected

**Availability Scenario: No copies available**
- Book has 0 available copies (all borrowed)
- Member views book details
- Instead of "Borrow" button, sees "Reserve" button
- Member can click "Reserve" to be notified when a copy becomes available
- "Not Available" badge displayed on book

**Unauthenticated Scenario:**
- Visitor (not logged in) clicks "Borrow"
- System redirects to login page
- After login, member completes borrow action

---

### View Borrowed Books Flow (US-004)

**Primary Scenario: Member views current borrowed books**
- Member clicks "My Books" or "Borrowed Books" in navigation
- System displays table/list of all currently borrowed books with:
  - Book title and author
  - Borrow date
  - Due date
  - Days remaining
  - Late fee status (if overdue)
- List is sortable by title, author, due date
- Empty state message if member has no borrowed books

**Late Fee Scenario:**
- Member has a book due 3 days ago
- "Overdue" badge displayed in red
- Late fee amount calculated and displayed: $0.15 per day
- Warning message: "This book is overdue. A fine of $0.45 has been incurred."
- Return button is prominent

**Renewal Scenario (if supported):**
- Member clicks "Renew" on a book due in 5 days
- Borrow period extends another 14 days
- System prevents renewal if book is reserved by another member

---

### Return Book Flow (US-005)

**Primary Scenario: Member returns borrowed book**
- Member views borrowed books list
- Clicks "Return" button next to book
- System shows confirmation dialog with book title and return date
- Member confirms return
- Book is marked as returned in system
- Available copy count increases by 1
- Book removed from member's borrowed list
- Success message: "Book returned successfully"
- Late fees (if any) are finalized and displayed

**Late Return Scenario:**
- Member returns book 2 days late
- Late fee calculated: 2 days × $0.15/day = $0.30
- System displays: "Book returned. Late fee: $0.30 has been charged to your account."
- Late fees persist in member's record

---

### Admin Add Book Flow (US-006)

**Primary Scenario: Admin adds new book to catalog**
- Admin logs in with admin credentials
- Navigates to "Manage Catalog" section
- Clicks "Add New Book"
- Enters book details:
  - Title (required)
  - Author (required)
  - ISBN (required, must be unique)
  - Publication Year
  - Category/Genre
  - Number of copies available (e.g., 3 copies)
  - Description (optional)
- Submits form
- System validates all required fields
- Book is added to catalog
- Success message: "Book added successfully"
- Admin can add more books or return to catalog view

**Duplicate ISBN Scenario:**
- Admin enters ISBN that already exists in system
- System displays: "A book with this ISBN already exists"
- Form highlights ISBN field
- Admin can correct and resubmit

**Invalid ISBN Scenario:**
- Admin enters invalid ISBN format
- System displays: "ISBN must be 10 or 13 digits"
- Admin corrects and resubmits

---

## Functional Requirements

### Authentication & Authorization

**FR-1.1:** System must support visitor registration with email and password
- Visitors must provide valid email, password, and full name
- Email addresses must be unique in the system
- Password must meet minimum security standards (8+ characters, mix of upper/lower/numbers/symbols)
- Account requires email confirmation before activation

**FR-1.2:** System must distinguish between member and admin user roles
- Members can search, borrow, return books and manage their account
- Admins can additionally add/edit/delete books and view system reports
- Role is set during user creation and can only be changed by another admin

**FR-1.3:** System must maintain secure login sessions
- Members must log in to access borrowing features
- Sessions persist across page refreshes
- Logout clears session and requires re-login
- Session timeout after 30 minutes of inactivity

---

### Book Search & Discovery

**FR-2.1:** System must support searching books by title
- Search is case-insensitive
- Partial matches are supported (e.g., "Java" matches "JavaScript Guide")
- Results sorted by relevance (title match first, then author)
- Search returns up to 50 results per page with pagination

**FR-2.2:** System must support searching books by author
- Search returns all books by authors matching the query
- Author names are case-insensitive
- Results include co-authored books
- Results sorted by publication date (newest first)

**FR-2.3:** System must support searching books by ISBN
- ISBN search supports both 10-digit and 13-digit formats
- Search is exact-match only
- Returns single book or "No results" message
- Invalid ISBN format displays validation error

**FR-2.4:** System must display book details with availability status
- Book details include: title, author, ISBN, publication year, category, description, copy count
- Availability status clearly indicates:
  - "Available" if copies exist
  - "Not Available" if all copies are borrowed
  - "Reserved" if member has reserved this book
- Available copy count is displayed (e.g., "2 of 3 available")

---

### Borrowing Management

**FR-3.1:** System must enforce borrow limits per member
- Maximum 5 books per member at any time
- Members cannot borrow if they have 5 books already
- Error message displayed when limit is reached
- Borrow action is rejected with clear messaging

**FR-3.2:** System must record borrow transactions
- Each borrow records: member ID, book ID, borrow date, due date, book copy ID
- Due date is always 14 days from borrow date
- Borrow cannot occur unless book has available copies
- System decreases available copy count by 1 when borrow is recorded

**FR-3.3:** System must track borrowed books per member
- Members can view all currently borrowed books
- Display includes: title, author, borrow date, due date, days remaining, overdue status
- View accessible via "My Books" or "Borrowed Books" section
- Empty state for members with no current borrows

**FR-3.4:** System must support book reservations
- Members can reserve books when no copies are available
- Members are notified (email or in-app) when a reserved book becomes available
- Reserved member has first right to borrow the available copy
- Maximum 1 reservation per member per book

---

### Return Management

**FR-4.1:** System must record book returns
- Members initiate return via "Return" button on borrowed books list
- Return is confirmed with book title and current date
- System records: return date, late fee amount (if applicable)
- Book is removed from member's borrowed list after return
- Available copy count increases by 1

**FR-4.2:** System must calculate and track late fees
- Late fee is $0.15 per day for books returned after due date
- Late fee is calculated on return date
- Late fee record persists in member's account
- Members can view total outstanding late fees

**FR-4.3:** System must support book renewals (optional implementation)
- Members can renew a book if it's not reserved by another member
- Renewal extends borrow period by 14 days from current due date
- Members cannot renew if book is in someone's reservation queue
- Renewal counts as a new borrow transaction

---

### Catalog Management

**FR-5.1:** System must allow admins to add books
- Admin form requires: title, author, ISBN, publication year, category, copy count
- ISBN must be unique across catalog
- ISBN validation: 10 or 13 digit format only
- Book details are stored and searchable immediately after creation

**FR-5.2:** System must allow admins to edit book details
- Admins can update: description, category, author (careful), publication year
- ISBN cannot be changed after creation (prevents data integrity issues)
- Changes take effect immediately for new borrows

**FR-5.3:** System must track total and available copies per book
- Each book has: total_copies (max count ever had) and available_copies (current available)
- When book is borrowed: available_copies decreases
- When book is returned: available_copies increases
- Admin can adjust copy count manually if physical inventory changes

---

### Data & Entities

**FR-6.1:** System must maintain Member records
- Fields: member_id, email (unique), password_hash, full_name, registration_date, total_late_fees
- Relationships: has many borrowed_books, has many reservations

**FR-6.2:** System must maintain Book records
- Fields: book_id, title, author, isbn (unique), publication_year, category, description, total_copies, available_copies
- Relationships: has many borrow_records, has many reservations

**FR-6.3:** System must maintain Borrow records
- Fields: borrow_id, member_id, book_id, borrow_date, due_date, return_date, late_fee
- Represents one member borrowing one copy of one book

**FR-6.4:** System must maintain Reservation records
- Fields: reservation_id, member_id, book_id, reservation_date, status (pending/fulfilled/cancelled)
- Queued in order of reservation date

---

## Success Criteria

**User Adoption:**
- Members can complete registration in under 2 minutes
- Members can search and borrow a book in under 3 minutes
- At least 80% of searches return relevant results on first page

**System Performance:**
- Book search completes within 2 seconds
- Borrow/return actions complete within 1 second
- Borrowed books list loads within 1 second
- System supports 100 concurrent members simultaneously

**Business Outcomes:**
- Member registration and borrowing processes have zero errors (100% success rate)
- Late return fees are accurately calculated and collected
- All book inventory counts remain accurate after borrows and returns
- Admins can add 50 books to catalog in under 30 minutes

**Data Integrity:**
- No borrowed books can be borrowed again until returned
- Member cannot exceed borrow limit
- All late fees are tracked and accurate
- ISBN uniqueness is enforced—no duplicate books

---

## Key Entities

**Member**
- Unique identifier (email)
- Authentication credentials
- Borrow history
- Current borrowed books
- Outstanding late fees

**Book**
- ISBN (unique identifier)
- Descriptive metadata (title, author, year, category)
- Inventory tracking (total copies, available copies)
- Reservation queue

**Borrow**
- Links member to book and copy
- Records borrow and due dates
- Tracks return date and late fees
- Immutable once created

**Reservation**
- Links member to book
- Queued in order
- Fulfilled when copy becomes available
- Can be cancelled by member

---

## Assumptions

1. **Email Verification:** Registration requires email confirmation before account activation. Default email provider is SMTP-based.

2. **Borrow Duration:** Standard borrow period is 14 days from borrow date. This can be changed in configuration.

3. **Late Fees:** Late fee rate is $0.15 per day. Fees accumulate indefinitely until paid. Payment mechanism is out of scope for this specification.

4. **Inventory Tracking:** When a book is borrowed, available_copies decreases by 1. When returned, available_copies increases by 1. Admin can manually adjust inventory.

5. **Reservation Priority:** When a book becomes available, the oldest (earliest) reservation in the queue gets priority notification.

6. **Session Duration:** Login sessions timeout after 30 minutes of inactivity. Members must re-login after timeout.

7. **Search Scope:** Search covers title, author, ISBN, and category fields. Description is not included in full-text search.

8. **Admin Role:** Only existing admins can create new admin accounts. Cannot self-promote to admin.

9. **Borrow Limit:** Hard limit of 5 simultaneous borrows per member. Cannot be exceeded for any reason.

10. **Deletion Policy:** Books cannot be deleted if they have active borrows. Historical borrow records are permanent.

---

## Constraints

**Scope Boundaries:**
- Payment processing for late fees is **out of scope** (noted but not implemented)
- Mobile app is **out of scope** (web platform only)
- Book recommendation engine is **out of scope**
- Barcode scanning/physical item tracking is **out of scope**
- Email notifications are **basic** (confirmation and reservation only)

**Technical Constraints (from Constitution):**
- Must be built with Express.js (backend) and Vue.js (frontend)
- All features must have tests (cargo test)
- Performance not a primary concern; standard web app expectations
- No specific deployment constraints

---

## Dependencies & Risks

**Dependencies:**
- Email service (SMTP provider) required for registration confirmation
- Persistent data storage (database) required for all records

**Risks:**
- **Inventory Desynchronization:** If borrow/return operations fail mid-transaction, inventory counts could become inaccurate. Mitigation: atomic transactions with rollback.
- **Concurrent Borrows:** Multiple members attempting to borrow last copy simultaneously. Mitigation: database-level locking on available_copies.
- **Email Delivery Failure:** Registration confirmation emails could be blocked or delayed. Mitigation: resend option in UI.

---

## Success Metrics

**Functional Correctness:**
- 100% of borrows recorded with correct due date
- 100% of returns update available_copies accurately
- 100% of late fees calculated correctly
- Zero double-borrows (same copy borrowed twice)

**User Experience:**
- Registration completion rate ≥ 95%
- Search success rate (user finds desired book) ≥ 80%
- Average borrow time ≤ 3 minutes
- Zero member accounts locked due to system error

**System Health:**
- Uptime ≥ 99%
- Search response time ≤ 2 seconds (p95)
- Borrow/return response time ≤ 1 second
- Zero data loss events
