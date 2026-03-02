# TEAM VERSION CONTROL SETUP GUIDE

## 🚀 Initial Repository Setup (Team Lead Only)

### Step 1: Create Protected Branches on GitHub

Go to your GitHub repository → Settings → Branches → Add Rule

**Protect `main` branch:**
- ✅ Require pull request reviews before merging (at least 1)
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Include administrators

**Protect `develop` branch:**
- ✅ Require pull request reviews before merging (at least 1)
- ✅ Require branches to be up to date before merging
- ❌ Don't require status checks (optional, based on team)

### Step 2: Configure GitHub Settings

**Code and automation → General:**
- ✅ Allow auto-merge: Enable
- ✅ Automatically delete head branches: Enable

## 📋 Team Setup Process

### Each Team Member Does This (One Time):

```bash
# 1. Clone the repository
git clone https://github.com/BoscoWong925/COMP4117-Inventory.git
cd COMP4117-Inventory

# 2. Create develop branch locally if it doesn't exist
git fetch origin
git checkout develop

# 3. Go to project directory
cd inventory-system

# 4. Install dependencies
npm install

# 5. Create your initial feature branch
git checkout -b feature/your-name-initial-setup
```

## 🔄 Daily Workflow

### At the START of each work session:

```bash
# Make sure you're on develop
git checkout develop

# Pull latest changes from everyone
git pull origin develop

# Verify no conflicts
git status
```

### When you CREATE a new feature:

```bash
git checkout -b feature/descriptive-name
# Examples:
# feature/add-borrowing-workflow
# feature/fix-login-validation
# feature/update-dashboard-styling
```

### When you FINISH a feature:

```bash
# 1. Make sure everything is committed
git status  # should show "nothing to commit"

# 2. Sync with latest develop
git fetch origin
git merge origin/develop  # or git rebase origin/develop

# 3. Handle any conflicts (communicate with team)

# 4. Push your feature branch
git push origin feature/your-feature-name

# 5. Go to GitHub.com and create a Pull Request
# - Set Base to: develop
# - Set Compare to: feature/your-feature-name
# - Add description of what you changed
# - Add a team member as reviewer

# 6. Wait for review and approval
# 7. Merge (GitHub will auto-delete the branch)

# 8. Locally, go back to develop
git checkout develop
git pull origin develop
```

## 🎯 Conflict Prevention Strategy

### Assign Areas of Responsibility:

**Frontend Pages (Divide between team members):**
```
Team Member 1:
- LoginPage.vue
- HomePage.vue
- SearchAvailableItemsPage.vue

Team Member 2:
- ManageItemsPage.vue
- ApproveRequestsPage.vue
- BorrowHistoryPage.vue

Team Member 3:
- NewBorrowRequestPage.vue
- HandOverToolPage.vue
- AuditLogPage.vue
- MyBorrowingRecordPage.vue
```

**Shared Services & Utilities:**
```
Lead Dev only edits:
- src/utils/services.js    (API/database calls)
- src/utils/helpers.js     (General utilities)
- src/data/mockData.js     (Mock data)
- src/hooks/useAuth.js     (Authentication)

Others only call these, don't edit directly
```

**Configuration & Build:**
```
Lead Dev only:
- package.json             (Add new dependencies via discussion)
- vite.config.js          
- tailwind.config.js      
- index.html
```

### Component Development:

```
Team Members:
- Create your own components in src/components/YourFeatureName.vue
- Use scoped styles to avoid CSS conflicts
- Import from shared services/utilities
- Name files clearly (DashboardCard.vue, BorrowForm.vue, etc.)
```

## ✅ Git Commit Message Standards

**Format:**
```
[TYPE] Concise description (50 chars max)

Optional longer explanation (if needed)

Types: feature, bugfix, style, refactor, docs, chore
```

**Examples:**
```
[feature] Add borrow request validation
[bugfix] Fix login form not submitting
[style] Update dashboard card colors to match design
[refactor] Simplify authentication hook logic
[docs] Update API documentation
[chore] Update dependencies
```

## 🚨 Resolving Merge Conflicts

### If you get a conflict warning:

```bash
# 1. Try to merge develop into your branch
git merge origin/develop

# 2. Look for conflict markers in files:
# <<<<<<<< HEAD
# Your changes
# ========
# Their changes
# >>>>>>>

# 3. Edit the file to keep both/right/left as needed
# 4. Save the file

# 5. Mark as resolved
git add conflicted-file.vue

# 6. Complete the merge
git commit -m "Resolve merge conflict with develop"

# 7. Push
git push origin feature/your-feature-name
```

### If conflicts are complex:
- Ask in team chat for help
- Show the conflicting file to team member who made the changes
- They can help decide what to keep

## 📊 Pull Request Checklist

Before creating a PR, make sure:

- ✅ Code is committed and pushed
- ✅ Branch is merged with latest develop (no conflicts)
- ✅ No console.log() or debug code left
- ✅ Followed file organization (components in right folder)
- ✅ Used consistent naming conventions
- ✅ Updated related documentation if needed
- ✅ All files needed are included (no missing files)

## 🆘 Emergency Commands

```bash
# Undo the last commit (keep files)
git reset --soft HEAD~1

# Undo the last commit (delete changes)
git reset --hard HEAD~1

# Delete a local branch
git branch -d feature/wrong-branch

# Delete a remote branch (if accidentally pushed)
git push origin --delete feature/wrong-branch

# Start completely over from develop
git fetch origin
git reset --hard origin/develop

# Restore a deleted file
git checkout HEAD -- deleted-file.vue
```

## 📞 Communication Tips

**In team chat, always mention:**
- What feature/page you're working on
- Branch name you're using
- When you've pushed a PR (request review)
- If you need help with merge conflicts

**Example:**
```
"Working on feature/add-export-to-excel"
"Created PR #5, added the export button to all pages"
"Need help resolving merge conflict in services.js"
```

## 🎓 Learning Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
- [Resolving Conflicts](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/resolving-a-merge-conflict-using-the-command-line)

---

**Remember:** Communicate early, commit often, and sync frequently! 🚀
