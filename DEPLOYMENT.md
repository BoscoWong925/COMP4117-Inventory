# Database Migration & Production Deployment Guide

This guide explains how to deploy the application with your company's database without changing any code.

## Quick Summary

✅ **Only `.env` needs to change** — no code modifications required
✅ **All data persists correctly** — passwords, items, borrowing records
✅ **Fully database-agnostic** — works with any MongoDB instance
✅ **Secure by default** — JWT tokens, password hashing, validation

## Production Deployment Checklist

- [ ] Have your production MongoDB URI ready
- [ ] Generate a strong JWT_SECRET
- [ ] Document your CORS origins (your domain)
- [ ] Backup existing data (if applicable)
- [ ] Test with staging database first
- [ ] Update `backend/.env` with production values
- [ ] Start the server and verify connection

## Updating `backend/.env` for Production

### 1. **MongoDB Connection URI**

Replace the development URI with your production database:

```bash
# Azure Cosmos DB
MONGODB_URI=mongodb://USERNAME:PASSWORD@HOST.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@USERNAME@

# MongoDB Atlas (Cloud)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Self-hosted MongoDB
MONGODB_URI=mongodb://username:password@host:port/database

# MongoDB with Authentication & Replication
MONGODB_URI=mongodb://username:password@host1:port,host2:port,host3:port/database?replicaSet=myreplicaset
```

**Getting your MongoDB URI:**

- **Azure Cosmos DB**: Copy from Azure Portal → Your Resource → Connection String
- **MongoDB Atlas**: Copy from Cluster → Connect → Connection String
- **Self-hosted**: Build from connection format above

### 2. **JWT Secret**

Generate a cryptographically secure random string:

```bash
# Method 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Method 2: OpenSSL
openssl rand -hex 32

# Method 3: Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Then set in `.env`:
```bash
JWT_SECRET=<your-generated-string>
```

⚠️ **CRITICAL**: Store this securely (password manager, vault, etc.) — you'll need it for password resets and multi-environment deployments.

### 3. **CORS Origins**

Update to your production domain(s):

```bash
# Single domain
CORS_ORIGINS=https://yourdomain.com

# Multiple subdomains
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com,https://admin.yourdomain.com

# Production + staging
CORS_ORIGINS=https://app.yourdomain.com,https://staging.yourdomain.com

# Include backend for same-origin requests
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

### 4. **Environment Settings**

```bash
NODE_ENV=production
PORT=5001  # Or your preferred port
JWT_EXPIRES_IN=24h  # Adjust as needed (7d, 30d, etc.)
```

## Complete Production `.env` Example

```bash
# ============ PRODUCTION CONFIG ============

# Database - Your production MongoDB
MONGODB_URI=mongodb+srv://companyadmin:strongPassword123@company-prod.mongodb.net/inventory?retryWrites=true&w=majority

# Security - Strong random secret
JWT_SECRET=a7f8c2e9d1b4a6f3e5c7d2b1a4f6e8c3b5a7d9f1e3c5b7a9d2f4e6c8b0a2

# Server Configuration
PORT=5001
NODE_ENV=production
JWT_EXPIRES_IN=24h
FRONTEND_PORT=3000

# CORS - Your company domain
CORS_ORIGINS=https://inventory.company.com,https://api.company.com
```

## Data Migration (If Switching Databases)

### Option 1: Starting Fresh (Recommended for Test → Prod)

```bash
# 1. Update MONGODB_URI in backend/.env
MONGODB_URI=mongodb+srv://...your-production-db...

# 2. Start backend server
npm run dev

# 3. Seed demo data (if needed)
npm run seed

# 4. Or create users via API
curl -X POST http://localhost:5001/api/auth/...
```

### Option 2: Migrating Existing Data

```bash
# 1. Export from source database
mongoexport \
  --uri "mongodb+srv://source:password@source.mongodb.net/inventory" \
  --collection=users \
  --out=users.json

mongoexport \
  --uri "mongodb+srv://source:password@source.mongodb.net/inventory" \
  --collection=items \
  --out=items.json

# 2. Import to target database
mongoimport \
  --uri "mongodb+srv://target:password@target.mongodb.net/inventory" \
  --collection=users \
  --file=users.json

mongoimport \
  --uri "mongodb+srv://target:password@target.mongodb.net/inventory" \
  --collection=items \
  --file=items.json

# 3. Update backend/.env with target URI
MONGODB_URI=mongodb+srv://target:password@target.mongodb.net/inventory

# 4. Test connection
npm run dev
# Should see: "MongoDB Connected: target.mongodb.net"
```

### Option 3: Using MongoDB Tools GUI

**MongoDB Compass** (free desktop app):
1. Connect to source database
2. Right-click collection → "Export Collection"
3. Connect to target database
4. Right-click → "Import Collection"
5. Select exported JSON file

## Verification & Testing

### Test Database Connection

```bash
# Backend must start successfully
npm run dev

# Expected output:
# ✅ Environment Configuration:
#    Node Environment: production
#    Server Port: 5001
#    MongoDB: mongodb+srv://...
#    JWT Expires In: 24h
#
# 🚀 Server running in production mode on port 5001
```

### Test API Connectivity

```bash
# Health check
curl http://localhost:5001/api/health
# Expected: {"success":true,"message":"Server is running",...}

# Test login (after creating users)
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# Expected: {"success":true,"token":"...","user":{...}}
```

### Test Frontend Connection

```bash
# Start frontend
cd frontend && npm run dev

# Should see backend configuration logged:
# ✅ Environment Configuration:
#    MongoDB: mongodb+srv://...
#    CORS Origins: https://yourdomain.com
```

## Troubleshooting Deployment

### ❌ "Cannot connect to MongoDB"

**Check:**
- Is the MONGODB_URI correct? Copy-paste from MongoDB dashboard
- Does your IP have network access? (MongoDB Atlas requires IP whitelist)
- Is the password URL-encoded? (Use `%40` for `@`, `%3A` for `:`)

**Test:**
```bash
# Test URI directly with MongoDB CLI
mongosh "mongodb+srv://username:password@host"
```

### ❌ "JWT_SECRET must have a value"

**Fix:** Ensure `JWT_SECRET` is set in `.env`:
```bash
# Generate new secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
JWT_SECRET=generated-value-here
```

### ❌ CORS errors in browser console

**Fix:** Update CORS_ORIGINS to include your frontend domain:
```bash
# If frontend is at https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com

# If multiple origins
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### ❌ "No token provided" on requests

**Check:**
1. Frontend must send Authorization header with token
2. Backend must validate JWT_SECRET matches the one used to sign
3. Token may have expired (check JWT_EXPIRES_IN)

## Data Security Checklist

- ✅ Passwords are hashed with bcrypt (never stored plain text)
- ✅ JWT tokens are signed with your JWT_SECRET
- ✅ Database connection uses SSL/TLS encryption
- ✅ `.env` file with secrets is in `.gitignore` (never committed)
- ✅ CORS restricted to your domain only
- ✅ All API routes authenticated with JWT

## Environment Variable Reference

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `MONGODB_URI` | ✅ Yes | `mongodb+srv://...` | Connection string for MongoDB |
| `JWT_SECRET` | ✅ Yes | `a7f8c2e9...` | Secret key for signing JWT tokens |
| `NODE_ENV` | Optional | `production` | Sets log level and error handling |
| `PORT` | Optional | `5001` | Server listening port |
| `JWT_EXPIRES_IN` | Optional | `24h` | Token expiration duration |
| `FRONTEND_PORT` | Optional | `3000` | For development logging only |
| `CORS_ORIGINS` | Optional | `https://yourdomain.com` | Allowed frontend origins |

## Next Steps

1. ✅ Update `backend/.env` with production values
2. ✅ Start backend: `npm run dev`
3. ✅ Verify MongoDB connection in logs
4. ✅ Test login with API/frontend
5. ✅ Create SSL certificates (HTTPS)
6. ✅ Set up automatic backups for database
7. ✅ Configure monitoring/alerting
8. ✅ Document your JWT_SECRET location (secure vault)

## Support

If deployment issues occur:

1. Check `.env` file is in `backend/` directory
2. Verify MongoDB URI is correct (test with MongoDB CLI)
3. Confirm JWT_SECRET is set and strong (at least 32 chars)
4. Check logs: `npm run dev | grep -i error`
5. Review [SETUP.md](../SETUP.md) for additional troubleshooting

## Important Notes

- 🔒 **Never** commit `.env` to version control
- 🔒 **Always** use strong JWT_SECRET in production
- 🔒 **Store** JWT_SECRET in a secure password manager
- ✅ **Test** database connection before going live
- ✅ **Backup** your database before any migration
- ✅ **Monitor** application logs after deployment
