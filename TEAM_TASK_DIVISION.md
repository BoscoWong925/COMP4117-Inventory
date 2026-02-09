# COMP4117 Inventory System - Team Task Division

## 📌 Project Overview
- **Frontend:** Vue 3 + Vite + Tailwind CSS
- **Team Size:** [Suggest 2-4 people]
- **Repository:** GitHub with develop/feature branch workflow

---

## 👥 Recommended Team Structure

### Option A: 3 Team Members

#### **Member 1: Authentication & Core Services**
- `src/pages/LoginPage.vue`
- `src/hooks/useAuth.js`
- `src/utils/services.js` (API/backend calls)
- `src/data/mockData.js` (mock database)
- Responsible for: Authentication flow, API integration

#### **Member 2: Admin/Operator Features**
- `src/pages/ApproveRequestsPage.vue`
- `src/pages/ManageItemsPage.vue`
- `src/pages/AuditLogPage.vue`
- `src/pages/HandOverToolPage.vue`
- Responsible for: Admin dashboard, request approval, item management

#### **Member 3: User Features & Utilities**
- `src/pages/HomePage.vue`
- `src/pages/SearchAvailableItemsPage.vue`
- `src/pages/NewBorrowRequestPage.vue`
- `src/pages/BorrowHistoryPage.vue`
- `src/pages/MyBorrowingRecordPage.vue`
- `src/pages/LentOutFilterPage.vue`
- `src/components/DashboardCard.vue`
- `src/utils/helpers.js`
- Responsible: User-facing features, components, utilities

#### **Shared (Lead Dev):**
- App.vue, App.jsx
- vite.config.js
- tailwind.config.js
- package.json (dependency coordination)
- index.html

---

### Option B: 4 Team Members

Add another member for:
- **Member 4: UI Components & Styling**
  - Create reusable components in `src/components/`
  - Create `src/styles/` for shared component styles
  - Maintain design consistency
  - Examples: FormInput.vue, Modal.vue, DataTable.vue, etc.

---

## 🔄 Git Workflow Per Feature

### Branch Naming Convention
```
feature/[member-initials]-[feature-name]
example:
  feature/jd-add-borrowing-workflow
  feature/sm-fix-search-filter
  feature/rb-add-export-button
```

### Example: Add a New Page Feature

**Developer A starts work:**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/jd-add-borrowing-page
# Makes changes to NewBorrowRequestPage.vue
git add src/pages/NewBorrowRequestPage.vue
git commit -m "[feature] Add borrowing request form with validation"
git push origin feature/jd-add-borrowing-page
# Creates PR on GitHub, asks Developer B to review
```

**Developer B reviews and merges:**
- Checks for conflicts
- Reviews code quality
- Approves PR
- Merges to develop
- GitHub auto-deletes branch

**Developer A continues:**
```bash
git checkout develop
git pull origin develop  # Gets merged changes
git checkout -b feature/jd-add-request-notifications
# Next feature...
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Two people editing the same file

**Prevention:**
- Communicate in team chat: "Working on HomePage.vue"
- Assign pages to specific people
- Don't edit someone else's assigned page

**If it happens:**
```bash
# Person A finishes first and merges to develop
# Person B sees conflict warning when trying to merge:

git fetch origin
git merge origin/develop
# ❌ CONFLICT in src/pages/HomePage.vue

# Person B talks to Person A about changes
# They manually resolve conflicts together

# Then:
git add src/pages/HomePage.vue
git commit -m "Resolve merge conflict with Person A's HomePage changes"
git push origin feature/personb-feature-name
```

### Issue 2: Different code styles

**Prevention:**
- Create `.eslintrc.json` for consistent formatting
- Use VS Code prettier extension
- Run code formatter before committing

### Issue 3: Missing dependencies

**Prevention:**
```bash
# When adding a package, tell the team FIRST:
# "I'm adding axios for API calls"

npm install axios

# Commit package.json change
git add package.json package-lock.json
git commit -m "[chore] Add axios for API calls"
git push

# Other team members run:
npm install
```

### Issue 4: Accidentally committed node_modules

```bash
# If node_modules was accidentally committed:
git rm -r --cached node_modules
git add .gitignore
git commit -m "Remove node_modules from version control"

# Everyone else runs:
git pull
npm install
```

---

## ✅ Code Review Checklist

**Reviewer should check:**
- ✅ No merge conflicts
- ✅ Code follows project style
- ✅ No console.log or debug code
- ✅ Imports are correct
- ✅ Component names follow convention
- ✅ CSS is scoped (not global)
- ✅ No breaking changes to shared services
- ✅ Commit messages are clear

**Example approval comment:**
```
Looks good! I checked:
✅ No conflicts with develop
✅ Code style matches project
✅ All imports correct
✅ No debug code

Approved!
```

---

## 🎯 Daily Stand-up Template

**What to share in team chat:**

```
Standup Update:

What I worked on today:
- Added validation to form

What I'm doing next:
- Test edge cases
- Push to develop

Blockers:
- None / Need help with X
```

---

## 🔐 Protecting Main Branch

**Automatic on GitHub:**
- ✅ Require PR for any changes
- ✅ Require 1 approval before merge
- ✅ Require branch to be up to date
- ✅ No force pushes to main
- ✅ Auto-delete branch after merge

---

## 📊 Release Process (Monthly/Milestone)

```bash
# Lead Dev only:

# Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0

# Merge release branch to main
git checkout main
git merge release/v1.0.0
git tag v1.0.0
git push origin main --tags

# Merge back to develop
git checkout develop
git merge release/v1.0.0
git push origin develop

# Delete release branch
git push origin --delete release/v1.0.0
```

---

## 📝 Writing Commit Messages

**Good Example:**
```
[feature] Add email validation to login form

- Validate email format on submit
- Show error message for invalid email
- Tests added for email validation
```

**Bad Example:**
```
fix stuff
```

---

## 🆘 When Something Goes Wrong

**If you committed something bad:**
```bash
# Option 1: Undo last commit (keep changes)
git reset --soft HEAD~1

# Option 2: Undo last commit (delete changes)
git reset --hard HEAD~1

# Then fix and recommit
git add .
git commit -m "Fixed version"
git push
```

**If you're completely lost:**
```bash
# Start fresh from develop
git fetch origin
git reset --hard origin/develop
# Lost changes but saved from disaster!
```

---

## 🎓 Final Tips

1. **Communicate > Code** - Tell your team what you're doing
2. **Commit Often** - Small commits are easier to fix
3. **Pull Before Push** - Avoid conflicts
4. **Review Code** - Another set of eyes catches bugs
5. **Test Before Push** - Don't merge broken code
6. **Keep Branches Short-lived** - Close PRs quickly
7. **Sync Daily** - Pull at start of day, push at end

---

**Remember:** Git is designed for collaboration. Use it properly and conflicts become rare! 🚀
