# 📋 分頁 & 篩選驗證工具套件

**目的：** 確認 total/count 統計數字與實際表格行數一致，分頁與篩選切換時保持同步

**應由以下人員使用：**
- 🧪 **QA 測試人員** - Phyllis
- 👨‍💻 **開發人員** - Code Review
- 👨‍⚕️ **Tech Lead** - Verification

---

## 📂 文檔清單

### 1. 🚀 [PAGINATION_VERIFICATION_QUICK_START.md](PAGINATION_VERIFICATION_QUICK_START.md)
**用途：** 快速 5 分鐘驗證  
**適合：** 所有人  
**包含：**
- ✅ 啟動系統
- ✅ 執行自動化驗證腳本
- ✅ 手動 UI 驗證步驟
- ✅ JavaScript 控制台驗證
- ✅ 問題報告模板

**何時使用：** 
- 第一次驗證
- 改動後的快速檢查

---

### 2. 🧪 [verify-pagination-consistency.js](verify-pagination-consistency.js)
**用途：** 自動化測試腳本  
**適合：** 所有人（自動執行）  
**測試內容：**
- Items API 分頁一致性
- BorrowRequests API 分頁一致性
- Users API 分頁一致性
- AuditLogs API 分頁一致性
- 數據完整性（無重複）
- 邊界情況

**執行方式：**
```bash
cd dev
node verify-pagination-consistency.js
```

**輸出示例：**
```
✅ PASSED: 42 tests
❌ FAILED: 0 tests
📊 TOTAL:  42 tests
🎉 All tests passed!
```

---

### 3. 📊 [TOTAL_COUNT_CONSISTENCY_CHECKLIST.md](TOTAL_COUNT_CONSISTENCY_CHECKLIST.md)
**用途：** 詳細手動驗證清單  
**適合：** QA 測試人員  
**包含：**
- 10 個詳細測試章節
- 具體 curl 命令示例
- 預期 vs 實際結果
- 前端 UI 驗證步驟
- JavaScript 控制台驗證
- Edge case 檢查

**內容結構：**
1. Items API (4 test cases)
2. BorrowRequests API (3 test cases)
3. Users API (3 test cases)
4. AuditLogs API (2 test cases)
5. 前端 UI 驗證 (5 test cases)
6. Edge cases (3 test cases)
7. 數據完整性 (2 test cases)
8. 問題報告
9. 驗證摘要

**何時使用：** 進行深入、逐個組件的驗證

---

### 4. 🔍 [CODE_REVIEW_PAGINATION_CHECKLIST.md](CODE_REVIEW_PAGINATION_CHECKLIST.md)
**用途：** 代碼層面的審查清單  
**適合：** 開發人員 + Code Reviewer  
**包含：**
- 通用分頁邏輯檢查
- 各 Controller 實現審查
- 常見邏輯問題診斷
- API 響應格式驗證
- 篩選重置邏輯檢查
- 邊界情況審查
- 排序穩定性檢查

**檢查對象：**
- itemController.js
- borrowRequestController.js
- userController.js
- auditLogController.js

**典型問題診斷：**
```javascript
// ❌ 錯誤示例：Total 計算後改變 Filter
const total = await Model.countDocuments(filter);
if (someCondition) filter.status = 'Approved';  // ❌ 錯誤時機
const items = await Model.find(filter);

// ✅ 正確
const filter = { /* 完整 */ };
const total = await Model.countDocuments(filter);
const items = await Model.find(filter);
```

**何時使用：** 代碼 PR 審查、重構後驗證

---

### 5. ✅ [PHYLLIS_STUDENT_PAGINATION_VERIFICATION.md](PHYLLIS_STUDENT_PAGINATION_VERIFICATION.md)
**用途：** QA 主管專用驗證清單  
**適合：** Phyllis（QA Lead）  
**包含：**
- SearchAvailableItemsPage 驗證 (3 tests)
- MyBorrowingRecordPage 驗證 (3 tests)
- BorrowHistoryPage 驗證 (3 tests)
- MyItemsPage 驗證 (3 tests)
- Count & Consistency (2 tests)
- Issue logging
- Sign-off

**何時使用：** 最終 QA 驗證，Sign-off

---

## 🎯 使用流程

### 情境 1: 初次驗證（新功能上線）

```
1. 技術主管 → 
   📖 閱讀 PAGINATION_VERIFICATION_QUICK_START.md
   ↓
2. 開發人員 →
   📋 使用 CODE_REVIEW_PAGINATION_CHECKLIST.md 進行 Code Review
   ↓
3. QA 測試人員（Phyllis）→
   🚀 執行 verify-pagination-consistency.js
   ↓
4. Phyllis →
   📊 使用 TOTAL_COUNT_CONSISTENCY_CHECKLIST.md 進行詳細測試
   ↓
5. Phyllis →
   ✅ 使用 PHYLLIS_STUDENT_PAGINATION_VERIFICATION.md 最終驗證
   ↓
6. Phyllis →
   ✍️ Sign-off
```

### 情境 2: 快速回歸測試（修復 Bug 後）

```
1. 開發人員 →
   🔍 修改代碼後使用 CODE_REVIEW_PAGINATION_CHECKLIST.md 自檢
   ↓
2. QA →
   🚀 執行 verify-pagination-consistency.js（自動验证）
   ↓
3. 如果通過 →
   ✅ Bug 修復確認
```

### 情況 3: 問題診斷

```
當 Phyllis 發現問題：

問題描述: "點擊下一頁後，計數不符"

診斷流程:
1. 使用 PAGINATION_VERIFICATION_QUICK_START.md 確認問題
2. 使用 TOTAL_COUNT_CONSISTENCY_CHECKLIST.md 找確切點
3. 記錄到該文檔的「問題報告」部分
4. 將問題轉交給開發人員

開發人員:
1. 使用 CODE_REVIEW_PAGINATION_CHECKLIST.md 找根本原因
2. 檢查常見問題模式
3. 修復代碼
4. 返回 QA 驗證
```

---

## 🧪 測試覆蓋矩陣

| 測試方面 | Quick Start | Auto Script | Manual Checklist | Code Review | Phyllis |
|----------|:---:|:---:|:---:|:---:|:---:|
| Items API | ✅ | ✅ | ✅ | ✅ | ✅ |
| BorrowRequests | ✅ | ✅ | ✅ | ✅ | ✅ |
| Users API | ✅ | ✅ | ✅ | ✅ | - |
| AuditLogs | ✅ | ✅ | ✅ | ✅ | - |
| 前端 UI | ✅ | - | ✅ | - | ✅ |
| 邊界情況 | ✅ | ✅ | ✅ | ✅ | - |
| 代碼邏輯 | - | - | - | ✅ | - |
| 數據完整性 | - | ✅ | ✅ | - | ✅ |

---

## 🚦 驗證狀態指示燈

### ✅ 綠燈 - 所有通過
```
自動腳本: 0 failed ✅
手動測試: 所有通過 ✅
代碼審查: 無問題 ✅
可以發佈
```

### 🟡 黃燈 - 有輕微問題
```
自動腳本: 有失敗
手動測試: 部分通過
問題: 輕微/邊界情況
建議: 記錄後可發佈，下個迭代修復
```

### 🔴 紅燈 - 有嚴重問題
```
自動腳本: 多個失敗
手動測試: 關鍵功能失敗（例如 total 不對）
問題: 數據一致性問題
建議: STOP，必須修復後再發佈
```

---

## 📱 檢查清單

### 在開始驗證前：
- [ ] 後端運行在 `http://localhost:5002` 
- [ ] 前端運行在 `http://localhost:3000`（如需）
- [ ] 資料庫正常連接
- [ ] 有足夠的測試數據（50+ items, 30+ requests）
- [ ] FireFox/Chrome 開發者工具可用

### 驗證進行中：
- [ ] 記錄所有失敗的測試
- [ ] 保留 API 響應日誌（Network 截圖）
- [ ] 記錄確切的步驟以重現問題
- [ ] 測試不同的分頁大小（not just 10）

### 驗證完成後：
- [ ] 所有文檔已填寫
- [ ] 問題已分類（嚴重程度）
- [ ] 簽名並日期記錄
- [ ] 將結果轉交

---

## 🔧 故障排除

### 自動腳本無法連接 API
```bash
# 確認後端運行
netstat -ano | findstr :5002  # Windows
lsof -i :5002  # Mac/Linux

# 或直接測試
curl http://localhost:5002/api/items?page=1&pageSize=1
```

### 手動 UI 測試找不到頁面
```
確認 URL:
- 前端: http://localhost:3000
- 搜尋: http://localhost:3000/search-available
- 記錄: http://localhost:3000/my-borrowing-record
- 歷史: http://localhost:3000/borrow-history
- 帳戶: http://localhost:3000/manage-accounts
```

### 沒有足夠的測試數據
```bash
# 檢查資料庫中有多少項目
curl http://localhost:5002/api/items?pageSize=1 | jq '.total'

# 如果 < 50，需要添加測試數據
# 見 dev/run-api-tests.js 中的測試數據創建邏輯
```

---

## 📞 支持聯繫

如有問題：

- **自動化腳本問題** → 檢查 `verify-pagination-consistency.js`
- **測試數據缺少** → 使用 API 或資料庫添加
- **理解檢查項** → 參考各文檔的「驗證點」部分
- **問題診斷** → 使用 CODE_REVIEW 文檔診斷正確問題位置

---

## 📊 驗證結果匯總表

完成所有驗證後，在此記錄：

| 文檔 | 完成者 | 日期 | 狀態 | 備註 |
|------|-------|------|------|------|
| PAGINATION_VERIFICATION_QUICK_START | ______ | __/__ | ✅/❌ | |
| verify-pagination-consistency.js | ______ | __/__ | ✅/❌ | |
| TOTAL_COUNT_CONSISTENCY_CHECKLIST | ______ | __/__ | ✅/❌ | |
| CODE_REVIEW_PAGINATION_CHECKLIST | ______ | __/__ | ✅/❌ | |
| PHYLLIS_STUDENT_PAGINATION_VERIFICATION | ______ | __/__ | ✅/❌ | |

**最終狀態：** ✅ 全部通過 / ⚠️ 有輕微問題 / ❌ 有嚴重問題

---

## 🎓 相關文檔

- [BACKEND_PAGING_FILTERING_CHECKLIST.md](test-cases-2026-03-23/BACKEND_PAGING_FILTERING_CHECKLIST.md) - 後端合約檢查
- [API_TEST_REPORT.md](API_TEST_REPORT.md) - API 測試報告
- [DEV_SUMMARY.md](DEV_SUMMARY.md) - 開發摘要

---

**版本：** 1.0  
**最後更新：** 2026-03-30  
**維護者：** Tech Lead / QA Team
