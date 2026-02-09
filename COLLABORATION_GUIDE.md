# 🤝 Team Collaboration Guide - Version Control

## Quick Start for Team Members

### 1. Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd COMP4117-Inventory

# Create and switch to develop branch
git checkout -b develop origin/develop

# Install dependencies
cd inventory-system
npm install
```

### 2. Before Starting Work

**ALWAYS do this before creating a branch:**
```bash
# Switch to develop branch
git checkout develop

# Pull latest changes
git pull origin develop

# Update your local branches
git fetch origin
```

### 3. Creating a Feature Branch

```bash
# Branch naming convention:
# feature/feature-name
# bugfix/issue-description
# hotfix/critical-issue

# Example:
git checkout -b feature/login-page
```

### 4. Commit Guidelines

**Write meaningful commit messages:**
```bash
# Good ✅
git commit -m "Add login form validation"
git commit -m "Fix bug in borrow request workflow"
git commit -m "Update dashboard card styling"

# Bad ❌
git commit -m "fix"
git commit -m "changes"
git commit -m "wip"
```

**Commit frequently with small, logical changes:**
```bash
# Do this regularly (multiple times per feature)
git add src/pages/LoginPage.vue
git commit -m "Add email validation to login form"

git add src/utils/services.js
git commit -m "Create authentication service"

# NOT this (everything in one commit)
git commit -m "Entire login feature"
```

### 5. Pushing and Creating a Pull Request

```bash
# Push your feature branch
git push origin feature/your-feature-name

# Go to GitHub and create a Pull Request:
# 1. Base: develop (target branch)
# 2. Compare: feature/your-feature-name (your branch)
# 3. Add description of changes
# 4. Request code review from team members
```

### 6. Handling Merge Conflicts

If you get a conflict message:

```bash
# First, fetch latest changes
git fetch origin

# Try to merge develop into your branch
git merge origin/develop

# If conflicts occur, edit conflicted files:
# Look for markers like:
# <<<<<<< HEAD
# Your changes here
# =======
# Their changes here
# >>>>>>> origin/develop

# After resolving conflicts:
git add .
git commit -m "Resolve merge conflicts"
git push origin feature/your-feature-name
```

### 7. Syncing with Team Changes

```bash
# Before you push, sync with latest develop changes
git fetch origin
git merge origin/develop

# If there are conflicts, resolve them (see above)
# Then continue with your push
git push origin feature/your-feature-name
```

## 📋 Team Agreements

### Files NOT to Edit Simultaneously
To avoid conflicts, **each team member should focus on different files:**

- **Frontend Components**: Divide by page/feature
  - Person A: `LoginPage.vue`, `HomePage.vue`
  - Person B: `ManageItemsPage.vue`, `ApproveRequestsPage.vue`
  - Person C: `DashboardCard.vue`, `components/*`

- **Utilities & Services**: One person per file
  - `services.js`: One person
  - `helpers.js`: One person
  - `mockData.js`: One person

- **Configuration Files**: Communicate before editing
  - `package.json`: Notify team before adding dependencies
  - `vite.config.js`, `tailwind.config.js`: Reserve for lead dev

### Dependency Management

**When adding new packages:**
```bash
# Tell your team first in Discord/chat

# Install package
npm install package-name

# Update package.json (automatically done)
git add package.json
git commit -m "Add package-name dependency for feature X"

# Push immediately so others can run npm install
git push origin feature/your-feature-name

# Other team members run:
npm install
```

### Code Review Checklist

Before merging a Pull Request, check:
- ✅ No conflicts with develop branch
- ✅ Code follows project style
- ✅ No debug code or console.log left
- ✅ Tests pass (if applicable)
- ✅ Commit messages are clear
- ✅ No unnecessary node_modules or build files committed

## 🚨 Emergency: Undo Changes

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Discard all changes on current branch
git checkout -- .

# Start over from develop
git fetch origin
git reset --hard origin/develop
```

## 📚 Useful Git Commands

```bash
# See what branch you're on
git branch

# See all branches
git branch -a

# See recent commits
git log --oneline -10

# See status of files
git status

# See what changed
git diff

# Switch to existing branch
git checkout branch-name

# Delete local branch
git branch -d branch-name

# Delete remote branch
git push origin --delete branch-name

# Update just one file from develop
git checkout origin/develop -- src/pages/LoginPage.vue
```

## 🔄 Workflow Diagram

```
1. Pull latest develop
        ↓
2. Create feature branch
        ↓
3. Make changes (commit regularly)
        ↓
4. Sync with develop (merge/resolve conflicts)
        ↓
5. Push feature branch
        ↓
6. Create Pull Request on GitHub
        ↓
7. Team reviews code
        ↓
8. Merge to develop
        ↓
9. Delete feature branch
        ↓
10. Next person: go to step 1
```

## 💡 Tips to Avoid Conflicts

1. **Pull before you push**: Always `git pull origin develop` before pushing
2. **Commit often**: Small commits are easier to merge
3. **Divide files**: Don't both edit the same file simultaneously
4. **Communicate**: Use team chat to say what you're working on
5. **Code review**: Have someone else review before merging
6. **Main branch**: Never push directly to main/develop - always use Pull Requests

## ❓ Need Help?

If you're stuck:
```bash
# See full help for any command
git help command-name

# Or ask your team lead/senior dev
```
