# COMP4117 Inventory system

## System overview

### 1. System purpose

The **COMP Department Inventory Borrowing System** is a departmental software system that manages:

- **Inventory master data** (items, computers, and computer components)
- **Borrowing operations** (request, approval, assignment, pickup, return)
- **Traceability** (audit logs, history, and exportable reports)

The system’s primary objective is to ensure **inventory accuracy** (who has what, where it is, and its current status) and to provide an **accountable borrowing lifecycle** with searchable records.

### 2. System scope at a high level

**In scope (MVP-level)**

- Inventory list and item detail records (view/search/filter)
- Borrow request submission (User)
- Borrow processing (Admin/Operator): approve, assign, handover, return
- Item status updates driven by actions (e.g., Available → In use → Available)
- Borrow history and “lent out items” visibility
- Audit logs for key actions
- Excel export/import (supported operationally)

**Planned / optional extensions (phase-based)**

- Purchase record capture (Financial Office IDs, supplier, invoices, funding)
- Warranty tracking (period, expiry, on-site service flag)
- Invoice photo storage; OCR-assisted field extraction (if feasible)

### 3. System context and boundary

The system is owned and used by the **COMP Department** and operates as a single source of truth for departmental items.

External touchpoints (conceptual):

- **Email service**: daily digest for new borrow requests (Admin/Operator)
- **Excel**: export/import for reporting and bulk updates
- **Mobile device camera**: capture invoice images (if purchase module is used)
- **OCR service** (optional): extract invoice/warranty fields from images

### 4. Users and roles (high-level)

- **User**
  - Can submit borrow requests
  - Can search items and view availability
  - Can view their own borrowing records
- **Operator**
  - Can approve requests, assign items, and handle pickup/return
  - Can update borrowing records and trigger status changes
  - Can view borrow history and operational lists
- **Admin**
  - All Operator capabilities
  - Can modify inventory master data (item records, attributes)
  - Can access administrative views (e.g., all lent out items with filters)

> Permission model note: detailed permission rules will be specified in the Roles and access control document (separate from this overview).

### 5. Core domain concepts (definitions)

To avoid ambiguity, the system uses these standard terms:

- **Inventory Item (Asset)**  
  A record representing something that can be borrowed or tracked (e.g., a computer, a mouse, RAM).
- **Computer (Parent Asset)**  
  An asset that may have multiple linked components.
- **Component (Child Asset)**  
  An asset that may be linked to a parent computer via **Mother ID**.
- **Fixed Access ID**  
  A unique identifier required for every asset/component.
- **Mother ID**  
  Optional identifier linking components to a parent computer (used for grouping).
- **Borrow Request**  
  A User-submitted request to borrow one or more assets.
- **Borrow Record**  
  The operational record capturing approval, assignment, handover, return, and status changes.

Key rule (domain behavior):

- When a User borrows a **computer**, the system should treat the borrow as including the **linked components** associated by Mother ID (exact inclusion rules to be detailed later).

### 6. Quality goals (software engineering level)

The system shall prioritize:

- **Correctness**: status and current borrower are always consistent with recorded actions
- **Auditability**: all critical actions are logged with actor + timestamp
- **Usability**: staff can complete approval, assignment, return quickly with minimal steps
- **Searchability**: items can be located by ID, category, location, status, vendor (vendor applies if tracked)
- **Maintainability**: clear separation between inventory data, borrowing operations, and reporting

### 7. Platforms and usage environments

- The system shall be usable on **PC and mobile browsers**
- Mobile support is particularly important for operational tasks (e.g., handover/return confirmation, capturing invoice images if enabled)

---

### Overview review checklist

- [ ] Client is COMP Department
- [ ] Roles are User / Operator / Admin, and Operator + Admin can run borrowing operations
- [ ] Only User submits borrow requests
- [ ] System includes inventory + borrowing workflow + audit logging
- [ ] Computers can have components linked by Mother ID, and borrowing a computer includes linked components
- [ ] PC + mobile are required platforms
- [ ] Excel export/import is required (at least for reporting/bulk ops)
- [ ] Purchase/warranty/OCR are optional or phased (not blocking MVP)

## Links to detailed specs

- [Product summary](product-summary.md)
- [Roles and access control](roles-access-control.md)
- [Borrowing workflow](workflows/borrowing-workflow.md)
- [Status models](workflows/status-models.md)
- [User interface and pages](user-interface-pages.md)
- [Data model and data dictionary](data-model-data-dictionary.md)
- [Notifications and communications](notifications-communications.md)
- [Audit logging and traceability](audit-logging-traceability.md)
- [Reports and data exchange](reports-data-exchange.md)
- [Integrations](integrations.md)
- [API design](api-design.md)
- [Nonfunctional requirements](nonfunctional-requirements.md)
- [Decisions and open questions](decisions-open-questions.md)
