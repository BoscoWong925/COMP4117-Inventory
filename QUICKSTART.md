# Quick Reference: Deploying with Your Database

## TL;DR — 3 Steps to Production

```bash
# 1. Update backend/.env with your database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/inventory
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
NODE_ENV=production
CORS_ORIGINS=https://yourdomain.com

# 2. Start the server
cd backend && npm run dev

# 3. Verify it works
curl http://localhost:5001/api/health
```

## Environment Variables Needed

```bash
# REQUIRED
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<strong-random-secret>

# OPTIONAL (with defaults)
PORT=5001
NODE_ENV=development
JWT_EXPIRES_IN=24h
FRONTEND_PORT=3000
CORS_ORIGINS=http://localhost:3000
```

## MongoDB Connection String Examples

**Azure Cosmos DB:**
```
mongodb://username:password@host.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@username@
```

**MongoDB Atlas:**
```
mongodb+srv://username:password@cluster.mongodb.net/inventory?retryWrites=true&w=majority
```

**Self-Hosted MongoDB:**
```
mongodb://username:password@localhost:27017/inventory
```

## Generate JWT Secret

```bash
# Option 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: OpenSSL
openssl rand -hex 32

# Output: a7f8c2e9d1b4a6f3e5c7d2b1a4f6e8c3b5a7d9f1e3c5b7a9d2f4e6c8b0a2
```

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "MongoDB connection failed" | Check MONGODB_URI format and IP whitelist |
| "JWT_SECRET not set" | Add JWT_SECRET to .env |
| "CORS error in browser" | Add frontend URL to CORS_ORIGINS |
| "Cannot find .env" | Create `backend/.env` with required vars |

## File Locations

```
project-root/
├── backend/
│   ├── .env ← YOUR CONFIG GOES HERE
│   ├── server.js
│   └── config/
│       ├── db.js
│       └── env.js
├── .env.example ← Reference template
├── DEPLOYMENT.md ← Full guide
└── SETUP.md ← Quick start
```

## Verification Checklist

```bash
# 1. Server starts without errors
npm run dev
# Should see: "🚀 Server running in production mode on port 5001"

# 2. Database connected
# Should see: "✅ Environment Configuration:" with MongoDB URI

# 3. Can call API
curl http://localhost:5001/api/health
# Should return: {"success":true,"message":"Server is running",...}

# 4. Authentication works
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# Should return: {"success":true,"token":"...","user":{...}}
```

## Deployment Platforms

### Heroku
```bash
# Set environment variables
heroku config:set MONGODB_URI="..."
heroku config:set JWT_SECRET="..."

# Deploy
git push heroku main
```

### Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install --prefix backend
EXPOSE 5001
CMD ["npm", "--prefix", "backend", "run", "dev"]
```

```bash
# Build and run
docker build -t inventory .
docker run -e MONGODB_URI="..." -e JWT_SECRET="..." -p 5001:5001 inventory
```

### AWS/Azure/GCP
1. Set environment variables in cloud console
2. Deploy Node.js application
3. Set up MongoDB (Atlas, Cosmos DB, etc.)
4. Update DNS/CDN as needed

## Security Notes

🔒 **Always:**
- Use strong JWT_SECRET (32+ characters)
- Store JWT_SECRET in secret vault (not in code)
- Enable SSL/TLS for database connection
- Use HTTPS in production
- Restrict CORS_ORIGINS to your domain only
- Keep .env file out of version control

✅ **Already Handled:**
- Passwords hashed with bcrypt
- JWT tokens validated on every request
- Input validation and sanitization
- CORS headers configured
- Error messages don't leak secrets

## Data Persistence

All data automatically saved to MongoDB:
- ✅ Users (with hashed passwords)
- ✅ Items (inventory)
- ✅ Borrow requests (workflow)
- ✅ Audit logs (tracking)

No code changes needed — it just works!

## Support Resources

- 📖 Full setup guide: [SETUP.md](../SETUP.md)
- 📖 Deployment guide: [DEPLOYMENT.md](../DEPLOYMENT.md)
- 📖 Enhancement details: [ENHANCEMENT_SUMMARY.md](../ENHANCEMENT_SUMMARY.md)
- 📋 Example config: [.env.example](../.env.example)
- 📝 Source template: [README.md](../README.md)
