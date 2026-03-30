# 📋 分頁驗證工具索引

## 🎯 快速開始

**目標：** 確認 total/count 統計與實際表格行數一致  
**時間：** 5 分鐘 (快速) 或 2 小時 (完整)

---

## 📂 文檔列表

| 文檔 | 用途 | 適合對象 | 耗時 |
|-----|------|---------|------|
| [README_PAGINATION_VERIFICATION.md](README_PAGINATION_VERIFICATION.md) | 📖 總指南 & 使用流程 | 所有人 | 10 分鐘 |
| [PAGINATION_VERIFICATION_QUICK_START.md](PAGINATION_VERIFICATION_QUICK_START.md) | ⚡ 快速 5 分鐘驗證 | 所有人 | 5 分鐘 |
| [verify-pagination-consistency.js](verify-pagination-consistency.js) | 🤖 自動化測試 | 開發/QA | 2 分鐘執行 |
| [TOTAL_COUNT_CONSISTENCY_CHECKLIST.md](TOTAL_COUNT_CONSISTENCY_CHECKLIST.md) | 📊 詳細手動驗證 | QA (Phyllis) | 90 分鐘 |
| [CODE_REVIEW_PAGINATION_CHECKLIST.md](CODE_REVIEW_PAGINATION_CHECKLIST.md) | 🔍 代碼審查 | 開發者 | 45 分鐘 |
| [PHYLLIS_STUDENT_PAGINATION_VERIFICATION.md](PHYLLIS_STUDENT_PAGINATION_VERIFICATION.md) | ✅ QA 最終驗證 | Phyllis | 60 分鐘 |

---

## 🚀 快速執行步驟

### 步驟 1: 啟動系統（1 分鐘）
```bash
# 終端 1
cd backend && npm start

# 終端 2（可選）
cd frontend && npm run dev
```

✅ 確認 `http://localhost:5002` 運行

### 步驟 2: 執行自動測試（2 分鐘）
```bash
# 終端 3
cd dev && node verify-pagination-consistency.js
```

**期望：** 
```
✅ PASSED: 42
❌ FAILED: 0
🎉 All tests passed!
```

### 步驟 3: 選擇進階驗證
- ⚡ **快速 (5 分鐘)** → [PAGINATION_VERIFICATION_QUICK_START.md](PAGINATION_VERIFICATION_QUICK_START.md)
- 📊 **詳細 (90 分鐘)** → [TOTAL_COUNT_CONSISTENCY_CHECKLIST.md](TOTAL_COUNT_CONSISTENCY_CHECKLIST.md)
- 🔍 **代碼審查** → [CODE_REVIEW_PAGINATION_CHECKLIST.md](CODE_REVIEW_PAGINATION_CHECKLIST.md)

---

## 🎯 按角色選擇

### 👨‍⚕️ 技術主管 (Tech Lead)
```
1. 讀 README_PAGINATION_VERIFICATION.md (流程理解)
2. 跑 verify-pagination-consistency.js (驗收)
3. 檢查結果 ✅
```
**時間：** 15 分鐘

### 👨‍💻 開發人員 (Developer)
```
1. 使用 CODE_REVIEW_PAGINATION_CHECKLIST.md 審查代碼
2. 檢查 7 個常見邏輯問題
3. 跑 verify-pagination-consistency.js 驗證修正
```
**時間：** 45 分鐘

### 🧪 QA 測試 (Phyllis)
```
1. 跑 verify-pagination-consistency.js
2. 按 TOTAL_COUNT_CONSISTENCY_CHECKLIST.md 進行詳細測試
3. 按 PHYLLIS_STUDENT_PAGINATION_VERIFICATION.md 最終驗證
4. 簽名 & 記錄結果
```
**時間：** 150 分鐘

---

## 🧪 驗證檢查事項速覽

### Items API ✅
- [ ] `total` = Available 項目計數（不含子項目）
- [ ] 頁碼改變時行數改變，但 total 不變
- [ ] 篩選後 total 減少
- [ ] 無重複/缺漏跨頁

### BorrowRequests API ✅  
- [ ] `total` = 父請求數（不計算子）
- [ ] 返回包含父+子，但 total 只計父
- [ ] User isolation (我的 = 當前用戶)
- [ ] ParentRequestId 篩選正常

### Users API ✅
- [ ] 角色篩選後 total 更新
- [ ] 返回 ≤ pageSize
- [ ] 多頁 total 穩定

### AuditLogs API ✅
- [ ] Action 篩選正常
- [ ] Date range 篩選邏輯
- [ ] 分頁穩定

### Front-End UI ✅  
- [ ] 篩選變更 → page 重置為 1
- [ ] 標籤切換 → 計數更新
- [ ] 頁面切換 → 資料不重複

---

## 🐛 問題診斷快速指南

### 問題: "total 不符"
```
1. 打開 PAGINATION_VERIFICATION_QUICK_START.md → Items API 區段
2. 執行 curl 命令
3. 檢查:
   - returned items 數 vs total 值
   - 分佈是否在頁面邊界
```

### 問題: "分頁切換後計數混亂"
```
1. 開發者: 檢查 CODE_REVIEW_PAGINATION_CHECKLIST.md 
   → 問題 2-3 (Filter 一致性)
2. 確認 skip/limit 計算正確
3. 跑 verify-pagination-consistency.js 驗證修正
```

### 問題: "篩選後仍有不符合的項"
```
1. 檢查 CODE_REVIEW_PAGINATION_CHECKLIST.md
   → 問題 3 (篩選未應用於計數)
2. 確認 filter 對象在 countDocuments 和 find 中相同
```

---

## 📊 驗證狀態追蹤

使用此表格記錄驗證進度：

| 檢查項 | 日期 | 驗證者 | 狀態 | 備註 |
|--------|------|--------|------|------|
| Auto Script | ___ | ___ | ✅/❌ | |
| Quick Start | ___ | ___ | ✅/❌ | |
| Items API | ___ | ___ | ✅/❌ | |
| BorrowRequests API | ___ | ___ | ✅/❌ | |
| Users API | ___ | ___ | ✅/❌ | |
| AuditLogs API | ___ | ___ | ✅/❌ | |
| Front-End UI | ___ | ___ | ✅/❌ | |
| Code Review | ___ | ___ | ✅/❌ | |
| Final QA | ___ | ___ | ✅/❌ | |

---

## 🔧 常見命令速查

```bash
# 基本項目查詢
curl "http://localhost:5002/api/items?page=1&pageSize=10" | jq '.total, (.items | length)'

# 篩選驗證
curl "http://localhost:5002/api/items?status=Available&page=1&pageSize=10" | jq '.total'

# 借用請求驗證
curl "http://localhost:5002/api/borrow-requests?page=1&pageSize=10" | jq '{total: .total, parent_requests: (.requests | map(select(.parentRequestId==null)) | length)}'

# 運行自動化測試
cd dev && node verify-pagination-consistency.js

# 查看所有相關文檔
ls -la *PAGINATION* *pagination*
```

---

## 📞 文檔快速連結

| 需求 | 文檔 | 跳至 |
|------|------|------|
| 不知道從何開始 | [README](README_PAGINATION_VERIFICATION.md) | 開始 |
| 快速驗證 (5 min) | [Quick Start](PAGINATION_VERIFICATION_QUICK_START.md) | 自動化測試 |
| Items API 測試 | [手動清單](TOTAL_COUNT_CONSISTENCY_CHECKLIST.md) | 第 1 章 |
| BorrowRequests API | [手動清單](TOTAL_COUNT_CONSISTENCY_CHECKLIST.md) | 第 2 章 |
| Users API | [手動清單](TOTAL_COUNT_CONSISTENCY_CHECKLIST.md) | 第 3 章 |
| Front-End UI | [手動清單](TOTAL_COUNT_CONSISTENCY_CHECKLIST.md) | 第 5-6 章 |
| 代碼問題 | [代碼審查](CODE_REVIEW_PAGINATION_CHECKLIST.md) | 常見問題 |
| QA 最終簽名 | [Phyllis 清單](PHYLLIS_STUDENT_PAGINATION_VERIFICATION.md) | 簽署 |

---

## ✅ 完成清單

使用此檢查清單確保所有驗證步驟完成：

**準備階段:**
- [ ] 後端運行在 `:5002`
- [ ] 資料庫正常
- [ ] 測試數據充足 (50+ items, 30+ requests)

**驗證階段:**
- [ ] 執行自動化腳本 (0 failures?)
- [ ] 快速手動驗證通過
- [ ] 代碼審查完成 (無嚴重問題?)
- [ ] 詳細測試通過 (Phyllis)

**完成階段:**
- [ ] 所有文檔已填寫
- [ ] 問題已分類
- [ ] QA 已簽名
- [ ] 結果已提交

---

**版本：** 1.0  
**建立：** 2026-03-30  
**最後更新：** 2026-03-30

