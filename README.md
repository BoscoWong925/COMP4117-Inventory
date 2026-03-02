# COMP4117 Inventory System

A web-based inventory management system for university COMP department with role-based access control, borrowing workflows, and audit logging.

**Status:** ✅ Fully functional template ready for production deployment with your company's database and authentication.

## Quick Start

```bash
# 1. Setup environment
bash setup.sh

# 2. Start backend (Terminal 1)
cd backend && npm install && npm run dev

# 3. Start frontend (Terminal 2)
cd frontend && npm install && npm run dev

# 4. Access at http://localhost:3000
```

👉 **For detailed setup and production deployment instructions, see [SETUP.md](SETUP.md)**

## Features

- **Role-Based Access Control** — Admin, Operator, and User dashboards
- **Inventory Management** — Track hardware, software, and components with full CRUD
- **Borrowing Workflow** — Request → Approval → In-Use → Return with audit tracking
- **Hierarchical Components** — Borrow parent items with auto-included subcomponents
- **Audit Trail** — Complete action logging with timestamps and user tracking
- **Excel Import/Export** — Bulk operations and data backup
- **Search & Filter** — Advanced filtering by vendor, status, location, date range
- **OCR for Receipts** — Tesseract-based invoice processing
- **Dashboard Metrics** — Real-time statistics and borrowing trends

## Tech Stack

### Frontend
- **Vue 3** — Progressive JavaScript framework
- **Vite** — Modern build tool
- **Tailwind CSS** — Utility-first CSS
- **Axios** — HTTP client
- **TesseractJS** — OCR engine

### Backend
- **Express.js** — Node.js web framework
- **MongoDB/Mongoose** — NoSQL database with schema validation
- **JWT** — Token-based authentication
- **Bcryptjs** — Secure password hashing
- **Multer** — File upload handling

## Project Structure

```
├── backend/
│   ├── config/           # Database configuration
│   ├── controllers/       # Route handlers
│   ├── middleware/        # Auth, error handling, file upload
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API endpoints
│   ├── seed/             # Database initialization
│   ├── utils/            # Helpers & audit logging
│   ├── server.js         # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable Vue components
│   │   ├── pages/        # Page views
│   │   ├── utils/        # Helpers & API service
│   │   └── hooks/        # Composables & auth
│   └── package.json
├── .env.example          # Environment template
├── SETUP.md              # Setup & deployment guide
├── setup.sh              # Setup script
└── README.md
```
