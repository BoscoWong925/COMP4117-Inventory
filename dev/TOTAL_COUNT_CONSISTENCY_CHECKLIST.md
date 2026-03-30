# Total/Count 數據一致性驗證清單

**目的：** 確認 API 返回的統計數字與實際表格行數一致  
**時間戳：** _________________

---

## 1️⃣ Items API 驗證

### 1.1 基本分頁一致性
**測試步驟：**
```bash
# 終端執行
curl "http://localhost:5002/api/items?page=1&pageSize=10"
```

**驗證點:**
- [ ] `response.items.length` ≤ 10？
- [ ] `response.total` 是正整數？
- [ ] `response.page` = 1？
- [ ] `response.pageSize` = 10？
- [ ] `response.items.length` ≤ `response.total`？

**期望結果：**
```json
{
  "items": [...], // 最多 10 項
  "total": XXX,   // 資料庫中所有符合的項目總數
  "page": 1,
  "pageSize": 10
}
```

**記錄：**
- 返回行數: _____
- 返回的 total: _____
- ✅ / ❌

### 1.2 多頁面 Total 穩定性
**測試步驟：**
```bash
# 第 1 頁
curl "http://localhost:5002/api/items?page=1&pageSize=10"
# 記錄 response.total = _____

# 第 2 頁
curl "http://localhost:5002/api/items?page=2&pageSize=10"
# 記錄 response.total = _____
```

**驗證點：**
- [ ] 第 1 頁的 total == 第 2 頁的 total？
- [ ] 兩個請求之間沒有插入或刪除新項目？

**記錄：**
- 第 1 頁 total: _____
- 第 2 頁 total: _____  
- ✅ / ❌

### 1.3 篩選 + 分頁一致性
**測試步驟：**
```bash
# 篩選 status=Available，第 1 頁
curl "http://localhost:5002/api/items?status=Available&page=1&pageSize=10"
```

**驗證點：**
- [ ] 所有返回的項目都有 `status='Available'`？
- [ ] `total` = Available 項目的總數？
- [ ] 返回行數 ≤ `pageSize`？

**記錄：**
- 返回 Available 項目數: _____
- 報告的 total: _____  
- ✅ / ❌ - 描述:

### 1.4 篩選切換時重置
**測試步驟：**
```bash
# 先前往第 2 頁（任意篩選）
curl "http://localhost:5002/api/items?page=2&pageSize=10"

# 然後應用不同的篩選
curl "http://localhost:5002/api/items?status=In-use&page=1&pageSize=10"
```

**驗證點：**
- [ ] 應用新篩選時，前端自動跳回 page=1？
- [ ] 或者 API 允許任意頁碼，但 total 更新為新篩選的計數？

**記錄：**
- ✅ / ❌ - 行為描述:

---

## 2️⃣ Borrow Requests API 驗證

### 2.1 父請求計數（重要！）
**測試步驟：**
```bash
# 取得所有借用請求
curl "http://localhost:5002/api/borrow-requests?page=1&pageSize=10"
```

**驗證點：**
- [ ] `total` 是否只計算父請求（`parentRequestId=null`）的數量？
- [ ] 返回的 `requests` 陣列包含父 + 子請求，但 `total` 不重複計數？
- [ ] 分頁基於父請求計數（正確）？

**期望：** 如果有 5 個父請求，每個有 2 個子請求，則 `total=5`（不是 15）

**記錄：**
- 返回父請求個數: _____
- 返回總請求個數（含子）: _____
- 報告的 total: _____ (應該 = 父請求數)
- ✅ / ❌

### 2.2 狀態篩選 + 分頁
**測試步驟：**
```bash
# 篩選待審核請求
curl "http://localhost:5002/api/borrow-requests?status=Pending&page=1&pageSize=10"

# 檢查第 2 頁
curl "http://localhost:5002/api/borrow-requests?status=Pending&page=2&pageSize=10"
```

**驗證點：**
- [ ] 第 1 頁 & 第 2 頁的 `total` 相同（都是已篩選的總數）？
- [ ] 所有返回的父請求都有 `status='Pending'`？
- [ ] 沒有重複的請求 ID 出現在兩頁中？

**記錄：**
- 第 1 頁返回: _____ 項
- 第 1 頁 total: _____
- 第 2 頁返回: _____ 項
- 第 2 頁 total: _____
- ✅ / ❌

### 2.3 多個篩選條件
**測試步驟：**
```bash
# 篩選 status=Approved 且 borrowerId=STU123
curl "http://localhost:5002/api/borrow-requests?status=Approved&borrowerId=STU123&page=1&pageSize=10"
```

**驗證點：**
- [ ] `total` = 該學生已核准的借用請求數？
- [ ] 返回的所有項目都符合兩個條件？
- [ ] 返回行數 ≤ `pageSize`？

**記錄：**
- ✅ / ❌ - 描述:

---

## 3️⃣ Users API 驗證

### 3.1 基本分頁
**測試步驟：**
```bash
curl "http://localhost:5002/api/users?page=1&pageSize=10"
```

**驗證點：**
- [ ] 返回 ≤ 10 個使用者？
- [ ] `total` = 資料庫中所有使用者的數量？
- [ ] 欄位 `page`, `pageSize` 存在？

**記錄：**
- 返回使用者數: _____
- 報告的 total: _____
- ✅ / ❌

### 3.2 角色篩選
**測試步驟：**
```bash
curl "http://localhost:5002/api/users?displayRole=teacher&page=1&pageSize=10"
```

**驗證點：**
- [ ] 所有返回的使用者都是教師（`subRole='teacher'`）？
- [ ] `total` = 資料庫中教師的總數？
- [ ] 返回行數 ≤ `pageSize`？

**記錄：**
- ✅ / ❌ - 描述:

### 3.3 多頁面穩定性
**測試步驟：**
```bash
curl "http://localhost:5002/api/users?displayRole=teacher&page=1&pageSize=5"
# 記錄 total = _____

curl "http://localhost:5002/api/users?displayRole=teacher&page=2&pageSize=5"
# 記錄 total = _____
```

**驗證點：**
- [ ] 兩頁的 `total` 相同？

**記錄：**
- ✅ / ❌

---

## 4️⃣ Audit Logs API 驗證

### 4.1 基本分頁
**測試步驟：**
```bash
curl "http://localhost:5002/api/audit-logs?page=1&pageSize=10"
```

**驗證點：**
- [ ] 返回 ≤ 10 條日誌？
- [ ] `total` 存在且是正整數？
- [ ] `page` 和 `pageSize` 欄位存在？

**記錄：**
- 返回日誌數: _____
- 報告的 total: _____
- ✅ / ❌

### 4.2 動作篩選
**測試步驟：**
```bash
curl "http://localhost:5002/api/audit-logs?action=ITEM_ADDED&page=1&pageSize=10"
```

**驗證點：**
- [ ] 所有返回的日誌都有 `action='ITEM_ADDED'`？
- [ ] `total` = ITEM_ADDED 操作的總數？

**記錄：**
- ✅ / ❌ - 描述:

---

## 5️⃣ 前端 UI 驗證（實際使用）

### 5.1 SearchAvailableItemsPage
**操作步驟：**
1. 開啟搜尋頁面 `/search-available`
2. 記錄分頁器顯示的資訊（例如 "Page 1 of 10"）
3. 開啟開發者工具 → Network 標籤
4. 點擊「下一頁」

**驗證點：**
- [ ] API 請求的 `page` 參數從 1 變為 2？
- [ ] API 響應的 `total` 相同？
- [ ] 顯示的項目完全不同（沒有重疊）？
- [ ] 分頁器顯示更新為「Page 2 of 10」？

**記錄：**
- ✅ / ❌ - 說明:

### 5.2 篩選後分頁
**操作步驟：**
1. 在頁面上選擇類別篩選（例如「Cameras」）
2. 觀察分頁器

**驗證點：**
- [ ] 分頁器是否重置為 Page 1？
- [ ] 顯示的項目數是否更新為新的篩選結果？
- [ ] API 顯示的 `total` 是否減少？

**記錄：**
- ✅ / ❌ - 說明:

### 5.3 MyBorrowingRecordPage
**操作步驟：**
1. 登入為學生
2. 進入「我的借用記錄」
3. 開啟開發者工具
4. 導航到第 2 頁

**驗證點：**
- [ ] API 調用包含 `page=2`？
- [ ] 顯示的請求與第 1 頁完全不同？
- [ ] 頁碼計數器更新？

**記錄：**
- ✅ / ❌ - 說明:

### 5.4 BorrowHistoryPage（管理員）
**操作步驟：**
1. 登入為管理員
2. 進入「借用歷史」頁面
3. 應用狀態篩選（例如「已核准」）
4. 導航頁面

**驗證點：**
- [ ] 篩選後頁碼是否重置為 1？
- [ ] 所有顯示的項目都符合篩選條件？
- [ ] 總計數是否更新？

**記錄：**
- ✅ / ❌ - 說明:

### 5.5 MyItemsPage（教師） - 標籤切換
**操作步驟：**
1. 登入為教師
2. 進入「我的項目」
3. 查看「我的物品」標籤，進到第 2 頁
4. 切換到「借用的物品」標籤

**驗證點：**
- [ ] 切換標籤後，頁碼是否重置為 1？
- [ ] 顯示的物品列表是否完全改變？
- [ ] 標籤計數是否正確更新？

**記錄：**
- ✅ / ❌ - 說明:

---

## 6️⃣ 邊界情況驗證

### 6.1 超出範圍的頁碼
**測試步驟：**
```bash
curl "http://localhost:5002/api/items?page=99999&pageSize=10"
```

**驗證點：**
- [ ] 是否返回空的 `items` 陣列（而不是錯誤）？
- [ ] `total` 是否仍然正確？
- [ ] 狀態碼是 200（不是 404）？

**期望：**
```json
{
  "items": [],
  "total": XXX,
  "page": 99999,
  "pageSize": 10
}
```

**記錄：**
- ✅ / ❌ - 響應:

### 6.2 沒有結果的篩選
**測試步驟：**
```bash
curl "http://localhost:5002/api/items?status=NONEXISTENT&page=1&pageSize=10"
```

**驗證點：**
- [ ] 是否返回 `{ items: [], total: 0, ... }`？
- [ ] `total` 是否為 0？
- [ ] 沒有值為 null 或 malformed 的響應？

**記錄：**
- ✅ / ❌ - 拿到的響應:

### 6.3 頁碼 = 1（邊界）
**測試步驟：**
```bash
curl "http://localhost:5002/api/items?page=1&pageSize=10"
```

**驗證點：**
- [ ] 是否正確返回第一頁的資料？
- [ ] 是否有錯誤或空結果？

**記錄：**
- ✅ / ❌

---

## 7️⃣ 數據完整性檢查

### 7.1 跨頁無重複
**測試步驟：** 手動收集多頁結果

```javascript
// 在瀏覽器控制台執行
let allIds = [];
// 第 1 頁
let page1 = await fetch('/api/items?page=1&pageSize=15').then(r => r.json());
allIds.push(...page1.items.map(i => i.itemId));
console.log('Page 1 IDs:', allIds);

// 第 2 頁
let page2 = await fetch('/api/items?page=2&pageSize=15').then(r => r.json());
let page2Ids = page2.items.map(i => i.itemId);
console.log('Page 2 IDs:', page2Ids);

// 檢查重疊
let overlap = page2Ids.filter(id => allIds.includes(id));
console.log('重複的 IDs:', overlap);
```

**驗證點：**
- [ ] `overlap.length === 0`（沒有重複）?

**記錄：**
- Page 1 項目數: _____
- Page 2 項目數: _____
- 重複項目數: _____ (應該是 0)
- ✅ / ❌

### 7.2 無缺漏
**測試步驟：**
```javascript
// 繼續上面的碼
// 檢查是否缺漏
console.log('總收集:', allIds.length + page2Ids.length);
console.log('報告的 total:', page1.total);
// 如果有更多頁，繼續收集...
```

**驗證點：**
- [ ] 收集的總行數 = `total`（或接近，考慮並發修改）?

**記錄：**
- 收集的總行數: _____
- API 報告的 total: _____
- ✅ / ❌

---

## 8️⃣ 問題報告

### 如果發現不一致：

**問題 #1:**
- **症狀：** ________________
- **API 端點：** ________________
- **步驟：** ________________
- **期望：** ________________
- **實際：** ________________
- **嚴重程度：** 🔴 / 🟡 / 🟢

**建議修復：** ________________

---

## 9️⃣ 驗證摘要

| 組件 | 基本分頁 | 篩選 + 分頁 | 多頁穩定 | Total 正確 | 無重複 | 狀態 |
|------|---------|----------|--------|----------|-------|------|
| Items | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | |
| BorrowRequests | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | |
| Users | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | |
| AuditLogs | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | |

---

## 🔟 最終簽名

**驗證人員：** ________________  
**日期：** ________________  
**時間：** ________________  

**整體結果：**
- [ ] ✅ 所有檢查通過 - 數據一致性正常
- [ ] ⚠️ 有輕微問題 - 需要改進但不影響使用
- [ ] ❌ 有嚴重問題 - 需要立即修復

**備註：**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

**文檔版本：** 1.0  
**最後更新：** 2026-03-30
