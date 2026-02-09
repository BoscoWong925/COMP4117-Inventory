# 🚀 Quick Start Guide - Web Inventory System

## Setup & Run on localhost:3000

### Step 1: Navigate to Project Directory
```bash
cd /Users/f3235675/Documents/COMP4117-lab2/inventory-system
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start Development Server
```bash
npm run dev
```

**That's it!** The application will automatically open at `http://localhost:3000`

---

## Using the System

### 1️⃣ Login
You'll see a login screen. Use one of these credentials:

| Role | Username | Password | Features |
|------|----------|----------|----------|
| 👨‍💼 Admin | `admin` | `admin123` | Full access - Approve requests, manage items, view audit logs |
| 👷 Operator | `operator` | `operator123` | Approve requests, hand-over tool, manage items |
| 👤 User | `user` | `user123` | Request items, view availability, track borrowing |

### 2️⃣ Dashboard Navigation
After login, you'll see the navigation bar at the top. Click the different sections:

**For Admin/Operator:**
- `Approve Requests` - Review pending borrowing requests
- `Borrow History` - View all borrowing records
- `Manage Items` - Add/edit inventory items
- `Lent-Out Items` - Filter items by vendor/year
- `Audit Log` - View system activity
- `Hand-Over Tool` (Operator only) - Mark items as returned

**For Users:**
- `New Request` - Search and request available items
- `My Records` - View your borrowing history
- `Search Items` - Browse inventory

---

## Key Features to Try

### 📦 Borrowing a Computer (Hierarchical System)
1. Go to **Manage Items** (Admin/Operator)
2. The "MacBook Pro 16" (INV-001) has components linked:
   - RAM Module (INV-002)
   - SSD (INV-003)
3. When approved, **all components automatically change to In-Use** with the same borrower

### 📊 Export to Excel
- Click **"Export to Excel"** on any page
- Downloads current data as `.xlsx` file
- Works with filtered results too

### 📝 Audit Trail
- **Audit Log** shows all system actions
- Tracks logins, status changes, approvals, returns
- Filter by action type or search by user

### 🔍 Advanced Filtering
- **Lent-Out Items**: Filter by Vendor or Year
- **Search**: Find items by name, ID, or description
- **Status**: View items by status (Available, In-Use, Missing, etc.)

---

## Workflow Example: Complete Borrowing Process

### As a Student (User):
1. Login with `user` / `user123`
2. Go to **New Request**
3. Search for "Dell 4K Monitor" (INV-004)
4. Click on it, enter reason: "Lab assignment"
5. Click **"Submit Request"**
6. Status shows: "Pending"

### As an Admin/Operator:
1. Login with `admin` / `admin123` or `operator` / `operator123`
2. Go to **Approve Requests**
3. See the pending request
4. Set return date and click **"Approve"**
5. Item status changes to "In-Use"

### Back as Student:
1. Go to **My Records**
2. See the approved borrowing record
3. Item can now be picked up from specified location

### When Returning (Operator):
1. Go to **Hand-Over Tool**
2. Find the borrowed item
3. Click **"Mark as Returned"**
4. Item status changes back to "Available"

---

## Database & Data Storage

- **Development**: Uses browser localStorage (auto-persists)
- **Restart**: All data persists when you close/reopen browser
- **Reset**: Clear browser cache/localStorage to reset to demo data

---

## Project File Structure

```
inventory-system/
├── src/
│   ├── pages/
│   │   ├── LoginPage.jsx                    # Login form
│   │   ├── ApproveRequestsPage.jsx          # Admin/Op approve requests
│   │   ├── ManageItemsPage.jsx              # Admin/Op manage inventory
│   │   ├── BorrowHistoryPage.jsx            # Admin/Op view history
│   │   ├── LentOutFilterPage.jsx            # Filter lent items
│   │   ├── AuditLogPage.jsx                 # View audit trail
│   │   ├── NewBorrowRequestPage.jsx         # User request items
│   │   ├── MyBorrowingRecordPage.jsx        # User view records
│   │   ├── SearchAvailableItemsPage.jsx     # User search items
│   │   └── HandOverToolPage.jsx             # Operator hand-over
│   ├── utils/
│   │   ├── services.js                      # All business logic
│   │   └── helpers.js                       # Utility functions
│   ├── data/
│   │   └── mockData.js                      # Demo data & constants
│   ├── hooks/
│   │   └── useAuth.js                       # Auth hook
│   ├── App.jsx                              # Main app component
│   ├── main.jsx                             # React entry point
│   └── index.css                            # Tailwind styles
├── index.html                               # HTML page
├── package.json                             # Dependencies
├── vite.config.js                           # Build config
├── tailwind.config.js                       # Tailwind config
└── README.md                                # Full documentation
```

---

## Available Commands

```bash
# Start development server (localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# On macOS/Linux:
chmod +x run.sh
./run.sh

# On Windows:
run.bat
```

---

## Inventory Data Structure

Each item tracks:
- **ID Fields**: Unique ID, Mother ID, University ID
- **Naming**: Name, Type, Category
- **Status**: Available, In-Use, Missing, Disposed, Transferred
- **Location**: Physical location + custom option
- **Borrower**: Current student/staff ID
- **Warranty**: Start/End dates, On-site support, Vendor
- **Purchase**: FO Request ID, Order ID, Supplier, Invoice
- **Funding**: Project link, Multi-fund support
- **Description**: Item details

---

## Demo Inventory

### Available Items:
- ✅ MacBook Pro 16 (INV-001) - Computer + 2 components
- ✅ Logitech Wireless Mouse (INV-005) - Missing status

### Lent Out:
- 📦 Dell 4K Monitor (INV-004) - In-Use, Borrowed by S00123456

---

## Troubleshooting

### Port 3000 Already in Use?
```bash
# On macOS/Linux, find and kill process:
lsof -i :3000
kill -9 <PID>

# Then restart:
npm run dev
```

### Dependencies Not Installed?
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Data Not Persisting?
- Check browser's localStorage is enabled
- Try in a private/incognito window
- Clear browser cache and login again

### React/Vite Errors?
```bash
npm cache clean --force
npm install
npm run dev
```

---

## Next Steps

### To Integrate with Real Database:
Edit `src/utils/services.js` and replace localStorage calls with API requests:
```javascript
// Instead of:
const db = JSON.parse(localStorage.getItem("items"))

// Use:
const response = await fetch('/api/items')
const db = await response.json()
```

### To Add More Features:
1. Create new page in `src/pages/`
2. Add navigation link in `App.jsx`
3. Import and use in `renderPageContent()`

---

## Support Resources

- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **Vite**: https://vitejs.dev
- **XLSX Library**: https://github.com/SheetJS/sheetjs

---

**Happy Inventory Management! 📦✨**

For full documentation, see `README.md`
