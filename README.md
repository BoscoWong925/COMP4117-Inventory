<<<<<<< HEAD
# COMP4117 Inventory system

# System overview

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
- Item status updates driven by actions (e.g., Available → In-use → Available)
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

> Permission model note: detailed permission rules will be specified in the Roles and permissions section (separate from this overview).
> 

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
- **Usability**: staff can complete approval/assignment/return quickly with minimal steps
- **Searchability**: items can be located by ID/category/location/status/vendor (vendor applies if tracked)
- **Maintainability**: clear separation between inventory data, borrowing operations, and reporting

### 7. Platforms and usage environments

- The system shall be usable on **PC and mobile browsers**
- Mobile support is particularly important for operational tasks (e.g., handover/return confirmation, capturing invoice images if enabled)

---

## Detail specs

[Product summary](https://www.notion.so/Product-summary-2f610a07222280d09bfeca20884e94ed?pvs=21)

[Roles and access control](https://www.notion.so/Roles-and-access-control-2f610a07222280c58fd8d8bf034ea757?pvs=21)


=======
# University Inventory System - COMP Department

A comprehensive web-based inventory management system for university departments with role-based access control, borrowing workflows, and audit logging.

## Features

- **Role-Based Dashboard**: Separate views for Admin, Operator, and User roles
- **Inventory Management**: Track hardware, software, and components with full details
- **Borrowing Workflow**: Request → Approval → In-Use → Return workflow
- **Hierarchical Borrowing**: Borrow a "Computer" (Mother) automatically selects components
- **Audit Trail**: Complete logging of all system actions with timestamps
- **Excel Export**: Export any view to Excel format
- **Purchase & Warranty Tracking**: Track invoices, orders, suppliers, and warranty information
- **Search & Filter**: Advanced filtering by vendor, year, status, and location
- **Mobile Ready**: Responsive design for tablets and mobile devices

## Project Structure

```
inventory-system/
├── public/                 # Static files
├── src/
│   ├── components/        # Reusable React components
│   ├── pages/            # Page components for different views
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions and services
│   ├── data/             # Mock database
│   ├── index.css         # Global Tailwind styles
│   ├── App.jsx           # Main app component
│   └── main.jsx          # React entry point
├── index.html            # HTML entry point
├── package.json          # Project dependencies
├── vite.config.js        # Vite build configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── README.md             # This file
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
```bash
cd inventory-system
```

2. Install dependencies:
```bash
npm install
```

### Running the Application

Start the development server:
```bash
npm run dev
```

The application will automatically open at `http://localhost:3000`

### Demo Credentials

Log in with these test accounts:

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Operator | operator | operator123 |
| User | user | user123 |

## Role-Based Access

### Admin Features
- Approve/reject borrowing requests
- Manage inventory items (add, edit, delete)
- View complete borrow history
- Access audit logs
- Filter lent-out items
- Export data to Excel

### Operator Features
- Approve/reject borrowing requests
- View inventory items
- View borrow history
- Hand-over tool (mark items as returned)
- Filter lent-out items by vendor/year
- Access audit logs
- Export data to Excel

### User Features
- Search available items
- Submit new borrowing requests
- View personal borrowing history
- Track item status
- Export borrowing records

## Key Functionality

### Borrowing Workflow
1. User submits a borrowing request for an available item
2. Admin/Operator receives the request in "Approve Requests" view
3. Admin/Operator sets return date and approves request
4. Item status changes to "In-Use" and is assigned to borrower
5. Operator marks item as returned in "Hand-Over Tool"
6. Item returns to "Available" status

### Hierarchical Borrowing
- When a "Computer" (Mother ID) is borrowed, all associated components are automatically:
  - Selected for the same borrower
  - Changed to "In-Use" status
  - Returned together when the parent item is returned

### Inventory Fields
Each item tracks:
- **ID Fields**: Unique ID, Mother ID, University ID
- **Classification**: Type (Hardware/Software/Component), Category
- **Status**: Available, In-Use, Missing, Dispose, Not Available, Transferred
- **Location**: Physical location (dropdown with custom option)
- **Current Borrower**: Student/Staff ID
- **Description**: Item details
- **Purchase Info**: FO Request ID, Order ID, Supplier, Invoice Number
- **Warranty**: Start date, End date, On-site toggle, Vendor
- **Funding**: Project linked, Multi-fund support

### Audit Trail
Every action is logged including:
- Login/Logout events
- Item status changes
- Request approvals/rejections
- Item additions/deletions
- Returns
- Timestamps and user information

## Export to Excel

All data views can be exported to Excel format by clicking the "Export to Excel" button. This includes:
- Inventory items
- Borrowing requests and history
- Audit logs
- Filtered results

## Database

The application uses localStorage for demo purposes. In production, replace `src/utils/services.js` with API calls to:
- MongoDB
- PostgreSQL
- Firebase
- Or any other backend database

## Building for Production

Create an optimized production build:
```bash
npm run build
```

The output will be in the `dist/` directory.

Preview the production build:
```bash
npm run preview
```

## Technology Stack

- **React 18**: UI library
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **XLSX**: Excel export functionality
- **localStorage**: Data persistence (demo only)

## Customization

### Modify Mock Data
Edit `src/data/mockData.js` to change:
- User credentials
- Initial inventory items
- Sample borrowing requests
- Demo audit logs

### Update Dropdown Options
Modify the constants in `src/data/mockData.js`:
- `locations` - Physical storage locations
- `statuses` - Item status values
- `itemTypes` - Hardware/Software/Component
- `itemCategories` - Computer/Display/Memory, etc.

### Styling
All Tailwind CSS classes can be customized in `tailwind.config.js` and `src/index.css`

## Future Enhancements

- [ ] OCR invoice scanning
- [ ] Photo upload for items
- [ ] Email notifications for approvals/returns
- [ ] Advanced reporting and analytics
- [ ] Mobile app version
- [ ] Real-time inventory synchronization
- [ ] Barcode/QR code scanning
- [ ] Multi-department support
- [ ] Item warranty alerts
- [ ] Recurring reports generation

## Support & Documentation

For detailed information about specific features, refer to the inline comments in:
- `src/utils/services.js` - Business logic and data management
- `src/pages/*` - Feature-specific documentation

## License

This project is provided as-is for educational purposes.

## Contact

For questions or support regarding this inventory system, contact the COMP Department IT Support.

---

**Last Updated**: February 2025
>>>>>>> origin/main
