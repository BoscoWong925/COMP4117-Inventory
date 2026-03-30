# ✅ Local Paging 清理 - Phyllis QA 驗收清單

**版本：** 1.0  
**對象：** Phyllis (QA Lead)  
**目的：** 驗證所有前端分頁已改為後端驅動，篩選同步，count/result 一致  

**驗收日期：** _________________  
**驗收人：** _________________  

---

## 📋 驗收標準

✅ **必須滿足所有以下條件才能 PASS：**

1. **無 local paging** ✅
   - 前端無 `.slice()` 進行行數限制
   - 前端無 local `.sort()` 驅動的排序
   - 所有分頁邏輯由後端 API 驅動

2. **後端驅動分頁** ✅
   - 點擊分頁器時，Network 顯示新 API 請求
   - 請求包含 `page` 和 `pageSize` 參數
   - 響應包含 `total` 欄位

3. **篩選同步** ✅
   - 改變篩選後自動重置 page=1
   - API 請求同時帶上篩選參數
   - 多個篩選同時生效

4. **Count & Result 一致** ✅
   - `total` 反映篩選後的完整數據集
   - 返回的行數 ≤ `pageSize`
   - 計算的頁碼數 = `ceil(total / pageSize)`

5. **無數據損失** ✅  
   - 不同頁面的數據無重複或缺漏
   - 頁面切換後數據完整

---

## 🧪 頁面驗收清單

### 1️⃣ ApproveRequestsPage

**驗收點檢查清單：**

#### 1.1 Pending Tab - 分頁驗證
```
[ ] 開啟頁面，顯示第 1 頁的 Pending 請求
[ ] Network 請求中包含 ?page=1&pageSize=10&status=Pending
[ ] 計數正確：顯示 "Page 1 of X"（X = pendingCount）
[ ] 點擊「下一頁」
[ ] Network 新請求：page=2,pageSize=10,status=Pending
[ ] 顯示的請求完全不同（無重疊）
[ ] Total count 不變（穩定）
```

**測試數據需求：**
- [ ] Pending 請求 ≥ 20 個

**簽核：** ✅ / ❌  
**備註：** _________________

---

#### 1.2 Check-Out Tab - 標籤切換
```
[ ] 在 Pending 頁面，進到第 2 頁
[ ] 切換到 Check-Out 標籤
[ ] 頁碼自動重置為 1 ✅
[ ] Network 請求顯示 page=1&status=Pending Check-Out
[ ] 顯示的請求全部是 Check-Out 狀態
```

**簽核：** ✅ / ❌  
**備註：** _________________

---

### 2️⃣ AuditLogPage

**驗收點檢查清單：**

#### 2.1 基本分頁
```
[ ] 開啟頁面，顯示第 1 頁的日誌（pageSize=15）
[ ] 計數正確
[ ] 點擊下一頁
[ ] Network 請求：page=2&pageSize=15
[ ] 顯示的日誌不同（無重疊）
```

**簽核：** ✅ / ❌

---

#### 2.2 Action 篩選
```
[ ] 選擇 Action 篩選（例如 "Item Added"）
[ ] 頁碼重置為 1
[ ] Network 請求：page=1&action=ITEM_ADDED
[ ] 所有顯示的日誌都是 "Item Added"
[ ] Total count 減少
```

**簽核：** ✅ / ❌

---

#### 2.3 搜尋詞
```
[ ] 輸入搜尋詞（例如 "admin"）
[ ] 頁碼重置為 1
[ ] Network 請求包含 search=admin
[ ] 結果都包含搜尋詞
```

**簽核：** ✅ / ❌

---

### 3️⃣ ManageAccountsPage

**驗收點檢查清單：**

#### 3.1 角色篩選
```
[ ] 篩選 Role = "Teacher"
[ ] 頁碼重置為 1
[ ] Network: displayRole=teacher
[ ] 所有用戶都是教師
[ ] Total count 更新
```

**簽核：** ✅ / ❌

---

#### 3.2 多頁導航
```
[ ] 從第 1 頁進到第 2 頁
[ ] Network 請求：page=2
[ ] 用戶列表完全不同
```

**簽核：** ✅ / ❌

---

### 4️⃣ ManageItemsPage

**驗收點檢查清單：**

#### 4.1 狀態篩選 + 分頁
```
[ ] 篩選 Status = "Available"
[ ] 頁碼重置為 1
[ ] Network: status=Available&page=1
[ ] 所有項目都是 Available
[ ] Total count 更新（應該減少）
```

**簽核：** ✅ / ❌

---

#### 4.2 多個篩選
```
[ ] 同時篩選：Status=Available + Category=Cameras
[ ] Network：status=Available&category=Cameras&page=1
[ ] 結果同時滿足兩個條件
```

**簽核：** ✅ / ❌

---

### 5️⃣ SearchAvailableItemsPage

**驗收點檢查清單：**

#### 5.1 搜尋 + 分頁
```
[ ] 搜尋 "laptop"
[ ] 頁碼重置為 1
[ ] Network: search=laptop&page=1
[ ] 所有結果包含 "laptop"（不分大小寫）
[ ] 分頁正常
```

**簽核：** ✅ / ❌

---

#### 5.2 類別篩選
```
[ ] 篩選類別
[ ] 分頁頁碼重置為 1
[ ] Network 請求帶上類別參數
[ ] 結果都是該類別
```

**簽核：** ✅ / ❌

---

### 6️⃣ MyItemsPage

**驗收點檢查清單：**

#### 6.1 已擁有物品 (Owned Items Tab)
```
[ ] 登入為教師
[ ] 進入「My Items」，確認 "Owned" 標籤
[ ] 顯示該教師的物品，分頁正常
[ ] 分頁器顯示 "Page 1 of X"
```

**簽核：** ✅ / ❌

---

#### 6.2 標籤切換重置頁碼
```
[ ] 在「Owned」標籤進到第 2 頁
[ ] 切換到「Borrowed」標籤
[ ] 頁碼重置為 1 ✅
[ ] 顯示的物品變為借用的
```

**簽核：** ✅ / ❌

---

### 7️⃣ LentOutFilterPage

**驗收點檢查清單：**

#### 7.1 分類 + 分頁
```
[ ] 篩選類別
[ ] 分頁正常，頁碼重置為 1
[ ] Network: category=...&page=1
[ ] 結果都是該類別
```

**簽核：** ✅ / ❌

---

#### 7.2 多篩選（位置 + 類別）
```
[ ] 同時篩選位置和類別
[ ] Network 報文同時包含兩個參數
[ ] 結果都符合兩個條件
```

**簽核：** ✅ / ❌

---

### 8️⃣ TeacherCheckoutPage

**驗收點檢查清單：**

#### 8.1 分頁
```
[ ] 開啟頁面，顯示第 1 頁已檢出的物品
[ ] Network: page=1&pageSize=10
[ ] 分頁器顯示正確
```

**簽核：** ✅ / ❌

---

#### 8.2 搜尋 + 分頁
```
[ ] 搜尋物品名稱
[ ] 頁碼重置為 1
[ ] Network: search=...&page=1
[ ] 結果匹配搜尋詞
```

**簽核：** ✅ / ❌

---

### 9️⃣ HomePage (Attention Items) ⚠️ 待改

**狀態：** 🔴 **需要開發改進**

**驗收準備清單（等待改動完成）：**
```
[ ] 後端 API 已新增或改造（支持分頁）
[ ] HomePage 已改為後端分頁驅動
[ ] 篩選改變時 page 重置為 1
[ ] Network 請求正確
```

**預期完成：** 2026-03-31

**簽核：** 等待

---

## 🔍 額外驗證 - 數據一致性

### Count Consistency 檢查

**選擇任一頁面，進行以下檢查：**

#### Test: Total vs Rows
```
[ ] 開啟頁面，第 1 頁
[ ] 記錄 API 響應的 total 值: _____
[ ] 記錄返回的實際行數: _____
  
驗證：實際行數 ≤ pageSize ✅
驗證：total ≥ 實際行數 ✅
```

#### Test: Multi-page Total Stability
```
[ ] 第 1 頁，記錄 total = _____
[ ] 點擊第 2 頁，記錄 total = _____

驗證：第 1 和第 2 頁的 total 相同 ✅
```

#### Test: Filtering Updates Total
```
[ ] 無篩選，total = _____
[ ] 應用篩選，total 應該減少或相同（不應增加） ✅
```

#### Test: No Data Duplication
```
[ ] 在選定頁面，記錄顯示的所有 ID: [1, 2, 3, ...]
[ ] 進到下一頁，記錄所有 ID: [11, 12, 13, ...]

驗證：沒有 ID 重疊 ✅
```

**簽核：** ✅ / ❌

---

## 🌐 Network Inspector 檢查

**打開 DevTools → Network，檢查所有 API 請求：**

### 分頁請求格式

**正確的請求應該看起來像：**
```
GET /api/items?page=1&pageSize=10&status=Available

或

GET /api/items?page=2&pageSize=10&category=Cameras&location=Lab1
```

**驗證清單：**
```
[ ] 中文參數應該為 UTF-8 編碼（或 URL encoded）
[ ] pageSize 值一致（不應該改變）
[ ] page 值隨導航改變
[ ] 篩選參數被攜帶
[ ] 沒有因篩選而創建多個不必要的請求
```

**簽核：** ✅ / ❌

---

## 📱 前端邏輯檢查

**在 Vue DevTools 或控制台檢查變數狀態：**

### 1. currentPage / attentionPage / 等頁碼變數
```
[ ] 點擊分頁器時變數更新
[ ] 篩選改變時重置為 1
[ ] 無異常值（應在 1 到 totalPages 之間）
```

### 2. items / data 陣列
```
[ ] 頁面重新加載時清空或更新
[ ] 無意外的 null/undefined
[ ] 長度 ≤ pageSize
```

### 3. 篩選值
```
[ ] 改變篩選後同時改變 currentPage = 1
[ ] 篩選值在頁碼改變時保持不變
```

---

## 📝 問題記錄

### 如果發現問題

**Issue Template:**
```
[頁面名稱]: [問題簡述]

步驟：
1. ...
2. ...

期望：___________
實際：___________

Severity: 🔴 Critical / 🟡 Medium / 🟢 Minor

建議修復：
_________________
```

---

## ✅ 最終簽核

### 驗收過程簽核

| 階段 | 項目 | 完成 | 簽核 |
|------|------|------|------|
| Code Review | 無 local paging | ✅ / ❌ | |
| 功能測試 | ApproveRequestsPage | ✅ / ❌ | |
| 功能測試 | AuditLogPage | ✅ / ❌ | |
| 功能測試 | ManageAccountsPage | ✅ / ❌ | |
| 功能測試 | ManageItemsPage | ✅ / ❌ | |
| 功能測試 | SearchAvailableItemsPage | ✅ / ❌ | |
| 功能測試 | MyItemsPage | ✅ / ❌ | |
| 功能測試 | LentOutFilterPage | ✅ / ❌ | |
| 功能測試 | TeacherCheckoutPage | ✅ / ❌ | |
| 數據驗證 | Count Consistency | ✅ / ❌ | |
| Network 驗證 | API 請求格式 | ✅ / ❌ | |

### 最終結論

**整體驗收結果：**
- [ ] ✅ **PASS** - 所有檢查通過，可上線
- [ ] ⚠️ **PASS WITH NOTES** - 通過但有不影響使用的輕微問題
- [ ] ❌ **FAIL** - 發現嚴重問題，需要修復

**問題總數：** _____  
**嚴重問題：** _____  
**輕微問題：** _____  

**建議：**
```
_________________________________________________________________
_________________________________________________________________
```

### 簽名

**驗收人員：** Phyllis  
**簽名：** _____________________  
**日期：** _________________  

**Tech Lead 複核：** _____________________  
**日期：** _________________  

---

## 🔗 相關文檔

- [LOCAL_PAGING_CLEANUP_OVERVIEW.md](LOCAL_PAGING_CLEANUP_OVERVIEW.md) - 清理進度總覽
- [TOTAL_COUNT_CONSISTENCY_CHECKLIST.md](TOTAL_COUNT_CONSISTENCY_CHECKLIST.md) - Count 一致性檢查
- [PAGINATION_VERIFICATION_QUICK_START.md](PAGINATION_VERIFICATION_QUICK_START.md) - 快速驗證指南

---

**文檔版本：** 1.0  
**最後更新：** 2026-03-30  
**維護者：** Tech Lead
