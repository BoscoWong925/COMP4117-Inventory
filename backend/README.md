# Backend

Backend service for the COMP4117 Inventory System.

## Setup

Install dependencies:

```
npm install
```

Create a `.env` file with the required configuration:

```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/comp4117_inventory
FRONTEND_URL=http://localhost:5173

# SMTP email (approval/rejection notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM="Inventory System <no-reply@example.com>"
```

Start the server:

```
npm run dev
```
