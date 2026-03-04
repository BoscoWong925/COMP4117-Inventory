Azure:
https://comp4117-inventory.azurewebsites.net/

# COMP4117 Inventory System

A web-based inventory management system for university COMP department with role-based access control, borrowing workflows, and audit logging.

## Project Structure

```
├── frontend/          # Vue.js + Vite frontend
│   ├── src/
│   │   ├── components/   # Reusable Vue components
│   │   ├── pages/        # Page views
│   │   ├── data/         # Mock data
│   │   ├── hooks/        # Composables
│   │   └── utils/        # Helpers & services
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/           # Backend service (TBD)
└── README.md
```

## Features

- **Role-Based Dashboard** — Admin, Operator, and User views
- **Inventory Management** — Track hardware, software, and components
- **Borrowing Workflow** — Request → Approval → In-Use → Return
- **Hierarchical Borrowing** — Borrow parent items with auto-selected components
- **Audit Trail** — Complete action logging with timestamps
- **Excel Export** — Export any view to `.xlsx`
- **Search & Filter** — Filter by vendor, year, status, location

## Getting Started

### Prerequisites

- Node.js v16+
- npm

### Run Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:3000**.

### Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Operator | operator | operator123 |
| User | user | user123 |

## Technology Stack

- **Vue 3** — UI framework
- **Vite** — Build tool and dev server
- **Tailwind CSS** — Utility-first CSS
- **XLSX** — Excel export

## License

For educational purposes — COMP4117.
