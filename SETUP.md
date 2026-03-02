# COMP4117 Inventory System - Setup Guide

This guide explains how to set up the application for local development and production deployment.

**🎯 Key Point:** This is a fully database-agnostic template. Change **only the `.env` file** to deploy with your company's database. **Zero code changes needed.**

## Quick Start (Local Development)

### 1. Run the Setup Script

```bash
bash setup.sh
```

This creates the necessary `.env` configuration file with test database credentials.

### 2. Start Backend Server

```bash
cd backend
npm install
npm run dev
```

The backend will run on **http://localhost:5001**

### 3. In Another Terminal, Start Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on **http://localhost:3000**

### 4. (Optional) Seed Demo Data

```bash
cd backend
npm run seed
```

This populates the database with demo users, inventory items, and borrowing requests.

## Demo Credentials

After seeding, log in with:

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Operator | operator | operator123 |
| User | user | user123 |
| Student | john.smith | password123 |

## Environment Configuration

### Backend Configuration (.env)

The backend requires a `backend/.env` file with the following variables:

```bash
# MongoDB Connection URI
MONGODB_URI=mongodb://...

# JWT Secret (required for authentication)
JWT_SECRET=your-secret-key

# JWT Token Expiration
JWT_EXPIRES_IN=24h

# Server Port
PORT=5001

# Environment (development, staging, production)
NODE_ENV=development

# Frontend Port (for info logging)
FRONTEND_PORT=3000

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:5001
```

See `.env.example` for additional details and placeholders.

## Production Deployment

To deploy with your company's data, update the backend `.env` with:

### 1. **MongoDB URI**

Replace with your production database connection string:

**Azure Cosmos DB:**
```
MONGODB_URI=mongodb://USERNAME:PASSWORD@HOST.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@USERNAME@
```

**Self-Hosted MongoDB:**
```
MONGODB_URI=mongodb://username:password@host:port/database
```

**MongoDB Atlas:**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### 2. **JWT Secret**

Generate a strong secret key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then set in `.env`:
```
JWT_SECRET=<generated-key>
```

### 3. **Environment**

```bash
NODE_ENV=production
```

### 4. **CORS Origins**

Update to your production domain(s):

```bash
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### 5. **Database Migration**

If migrating from the test database:

1. **Export test data** (optional):
   ```bash
   mongoexport --uri "mongodb://..." --collection=users --out=users.json
   ```

2. **Seed production database**:
   - Place your production `MONGODB_URI` in `.env`
   - Run: `npm run seed` or manually create users/items via the API

3. **Verify connectivity**:
   ```bash
   npm run dev
   # Server should show: "MongoDB Connected: your-host"
   ```

📋 **For detailed database migration steps, see [DEPLOYMENT.md](DEPLOYMENT.md)**

## Key Points: Database-Agnostic Design

✅ **No code changes needed** — only update `.env`
✅ **All data persists** — passwords hashed with bcrypt, items stored in MongoDB
✅ **Works with any MongoDB** — Atlas, Azure Cosmos, self-hosted, etc.
✅ **Secure by default** — JWT authentication, CORS validation, input sanitization

## API Endpoints

### Authentication
- `POST /api/auth/login` — Login with username/password
- `GET /api/auth/me` — Get current user (requires token)
- `POST /api/auth/logout` — Logout

### Inventory
- `GET /api/items` — List all items
- `POST /api/items` — Create new item (admin only)
- `PUT /api/items/:id` — Update item
- `DELETE /api/items/:id` — Delete item

### Borrowing
- `GET /api/borrow-requests` — List requests
- `POST /api/borrow-requests` — Create borrow request
- `PUT /api/borrow-requests/:id` — Approve/reject/return

### Audit Logs
- `GET /api/audit-logs` — View system audit trail

### Statistics
- `GET /api/stats/dashboard` — Dashboard metrics

## Troubleshooting

### Backend won't start

```
ERROR: MONGODB_URI environment variable is not set.
```

**Solution:** Ensure `backend/.env` exists with valid `MONGODB_URI`:
```bash
bash setup.sh
```

### Login fails with "secretOrPrivateKey must have a value"

```
ERROR: JWT_SECRET environment variable is not set.
```

**Solution:** Add to `backend/.env`:
```bash
JWT_SECRET=dev-secret-key-change-in-production
```

### Frontend can't reach backend

Check CORS configuration in `backend/.env`:
```bash
CORS_ORIGINS=http://localhost:3000
```

Ensure backend is running on the correct port:
```bash
npm run dev    # Should show "Server running on port 5001"
```

### Database connection times out

Verify `MONGODB_URI` is correct and the database is accessible:
```bash
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected!')).catch(console.error)"
```

## Project Structure

```
├── backend/
│   ├── config/           # Database & connection config
│   ├── controllers/       # Route handlers
│   ├── middleware/        # Express middleware
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API routes
│   ├── seed/             # Database seeding
│   ├── utils/            # Helpers & utilities
│   ├── server.js         # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # Vue components
│   │   ├── pages/        # Page views
│   │   ├── utils/        # Helpers
│   │   └── hooks/        # Composables
│   ├── package.json
│   └── vite.config.js
├── .env.example          # Environment variables template
├── setup.sh              # Setup script
└── README.md
```

## Technologies Used

### Frontend
- Vue 3 — UI framework
- Vite — Build tool
- Tailwind CSS — Styling
- TesseractJS — OCR for invoices
- Axios — HTTP client

### Backend
- Express.js — Web framework
- MongoDB + Mongoose — Database
- JWT — Authentication
- Bcryptjs — Password hashing
- Multer — File uploads

## Support

For issues or questions:
1. Check the `.env.example` file
2. Review this setup guide
3. Check application logs: `npm run dev` (frontend/backend)
4. Verify database connectivity

## Notes

- Always use strong JWT secrets in production
- Keep `.env` file secure (stays in `.gitignore`)
- Regularly audit the audit logs
- Backup your database before major updates
