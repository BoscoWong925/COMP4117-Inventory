# ⚡ Git Quick Reference - Print This!

## 🚀 Starting Your Day
```bash
git checkout develop
git pull origin develop
```

## 📝 Creating a Feature
```bash
git checkout -b feature/your-feature-name
# Edit files...
git add .
git commit -m "[feature] Your descriptive message"
git push origin feature/your-feature-name
# Go to GitHub, create Pull Request
```

## ✅ When Your PR is Approved
```bash
# GitHub: Click "Merge pull request"
# Then locally:
git checkout develop
git pull origin develop
git branch -d feature/your-feature-name
```

## 🔄 Syncing with Team Changes
```bash
git fetch origin
git merge origin/develop
# If conflicts, ask for help!
```

## 🆘 Oops! Undo Last Commit
```bash
# Keep the changes
git reset --soft HEAD~1

# Delete the changes
git reset --hard HEAD~1
```

## 📍 Checking Status
```bash
git status           # What files changed?
git branch           # Which branch am I on?
git log --oneline    # Recent commits
```

## ⚔️ Merge Conflict? Talk to Your Team!
```bash
# Show conflicted files
git status

# Edit the files with <<<<< ===== >>>>> markers
# Keep what you need, delete conflict markers
# Then:
git add .
git commit -m "Resolve merge conflict"
git push origin feature/your-feature-name
```

---

**Team Lead:** Ensure COLLABORATION_GUIDE.md, TEAM_SETUP.md, and TEAM_TASK_DIVISION.md are shared with all developers!
