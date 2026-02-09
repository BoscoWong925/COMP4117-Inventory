# 📚 Documentation Index

## Quick Navigation

### 🚀 Getting Started
- **[QUICKSTART.md](./QUICKSTART.md)** - Setup and run in 3 steps
- **[README.md](./README.md)** - Full project documentation
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - System overview and status

---

## 📖 Reading Order

**First Time?**
1. Read: [QUICKSTART.md](./QUICKSTART.md) (5 min read)
2. Run: `npm run dev`
3. Open: http://localhost:3000
4. Login with demo credentials

**Want Details?**
1. Read: [README.md](./README.md) (10 min read)
2. Explore the code in `src/`
3. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for features

**Going to Production?**
1. Review [DEPLOYMENT.md](./DEPLOYMENT.md) - Security section
2. Update API calls in `src/utils/services.js`
3. Configure your backend
4. Run: `npm run build`

---

## 🎯 Quick Reference

### Commands
```bash
npm run dev      # Start localhost:3000
npm run build    # Production build
npm run preview  # Preview production
```

### Demo Logins
- Admin: `admin` / `admin123`
- Operator: `operator` / `operator123`
- User: `user` / `user123`

### Key Files
- **App.jsx** - Main application & navigation
- **src/utils/services.js** - All business logic
- **src/data/mockData.js** - Demo data & constants
- **src/pages/** - All page components

---

## 📁 File Structure
```
inventory-system/
├── src/pages/              # Page components
├── src/utils/              # Business logic
├── src/data/               # Demo data
├── src/hooks/              # Custom hooks
├── index.html              # Entry point
├── package.json            # Dependencies
├── README.md               # Full docs
├── QUICKSTART.md           # Quick start
└── DEPLOYMENT.md           # System overview
```

---

## ✨ System Features

- ✅ Role-based access (Admin/Operator/User)
- ✅ Borrowing workflow (Request → Approve → Use → Return)
- ✅ Hierarchical items (Computer + Components)
- ✅ Audit logging (All actions tracked)
- ✅ Excel export (One-click)
- ✅ Search & filter (Advanced)
- ✅ Warranty tracking (Dates & vendors)
- ✅ Responsive design (Desktop/Tablet/Mobile)

---

## 🔧 Technology Stack

- React 18
- Vite 4
- Tailwind CSS
- XLSX (Excel export)
- localStorage (Data persistence)

---

## 📞 Troubleshooting

**Port 3000 in use?**
```bash
lsof -i :3000
kill -9 <PID>
npm run dev
```

**Dependencies missing?**
```bash
rm -rf node_modules
npm install
npm run dev
```

**Data not showing?**
- Check browser console (F12)
- Clear localStorage
- Refresh page

---

## 🎓 Learn More

- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Vite Guide](https://vitejs.dev)
- [XLSX Docs](https://github.com/SheetJS/sheetjs)

---

**Status:** ✅ System Running at http://localhost:3000

**Happy Inventory Managing! 📦✨**
