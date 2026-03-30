# 分頁一致性驗證 - 快速執行指南

🎯 **目標：** 確認 `total`/`count` 等統計數字與實際表格行數一致，分頁與篩選切換時不要對不上

---

## 📋 快速檢查清單（5 分鐘）

### 1️⃣ 啟動系統
```bash
# 終端 1：啟動後端
cd backend
npm start

# 終端 2：啟動前端（如果需要）
cd frontend
npm run dev
```

✅ 確認：
- [ ] 後端運行在 `http://localhost:5002`
- [ ] 資料庫連接正常

### 2️⃣ 執行自動化驗證腳本
```bash
# 終端 3
cd dev
node verify-pagination-consistency.js
```

**預期結果：**
```
✅ PASSED: X tests
❌ FAILED: 0 tests
```

如果有失敗，記錄失敗的測試名稱 →

---

## 🔍 詳細驗證（逐個 API）

### Items API
```bash
# 基本分頁
curl "http://localhost:5002/api/items?page=1&pageSize=10" | jq '.total, (.items | length)'

# 應該打印：
# 總數（例如 150）
# 實際返回行數（≤ 10）

# 篩選 + 分頁
curl "http://localhost:5002/api/items?status=Available&page=1&pageSize=10" | jq '.total, (.items | length)'

# ALL items 狀態 = Available
curl "http://localhost:5002/api/items?status=Available&page=1&pageSize=1000" | jq '.items[] | .status' | sort | uniq
```

✅ 檢查：
- [ ] `total` = 實際過濾行數？
- [ ] 返回行數 ≤ pageSize？
- [ ] 所有項目符合篩選條件？

---

### Borrow Requests API
```bash
# 所有請求
curl "http://localhost:5002/api/borrow-requests?page=1&pageSize=10" | jq '{
  total: .total,
  returned: (.requests | length),
  parent_count: (.requests | map(select(.parentRequestId == null)) | length),
  child_count: (.requests | map(select(.parentRequestId != null)) | length)
}'

# 應該輸出：
# {
#   "total": 5,                    // 父請求計數
#   "returned": 15,                // 父 + 子請求
#   "parent_count": 5,             // 應該 = total
#   "child_count": 10              // 子請求的補充
# }
```

✅ 檢查：
- [ ] `total` = 父請求數量？
- [ ] 返回的請求包括子請求？
- [ ] `parent_count` = `total`？

### Users API
```bash
# 所有使用者
curl "http://localhost:5002/api/users?page=1&pageSize=10" | jq '.total, (.users | length)'

# 教師過濾
curl "http://localhost:5002/api/users?displayRole=teacher&page=1&pageSize=10" | jq '{
  total: .total,
  returned: (.users | length),
  all_teachers: (.users | map(.subRole) | all(. == "teacher"))
}'
```

✅ 檢查：
- [ ] 返回行數 ≤ pageSize？
- [ ] `total` 減少（帶篩選）？
- [ ] 所有返回的使用者都是教師？

### Audit Logs API
```bash
curl "http://localhost:5002/api/audit-logs?page=1&pageSize=10" | jq '.total, (.logs | length)'

# 動作篩選
curl "http://localhost:5002/api/audit-logs?action=ITEM_ADDED&page=1&pageSize=10" | jq '.total, (.logs | length)'
```

✅ 檢查：
- [ ] 基本分頁正常？
- [ ] 篩選後 total 改變？

---

## 🧪 手動 UI 驗證

### 在瀏覽器中測試（開啟開發者工具 → Network）

#### SearchAvailableItems
1. 導航到搜尋頁面
2. 注意初始分頁器顯示（例如 "Page 1 of 10"）
3. 點擊「下一頁」
4. 檢查 Network：API 請求 `page` = 2？
5. 檢查顯示的項目是否完全不同？

**記錄：** ✅ / ❌

#### MyBorrowingRecordPage（學生）
1. 登入為學生
2. 進入「我的借用記錄」
3. 記錄顯示的請求數量和分頁
4. 點擊第 2 頁
5. 檢查請求是否完全不同？

**記錄：** ✅ / ❌

#### BorrowHistoryPage（管理員）
1. 登入為管理員
2. 進入「借用歷史」
3. 應用狀態篩選（例如「已核准」）
4. 注意頁碼是否重置為 1？
5. 導航到第 2 頁
6. 檢查所有項目都符合篩選狀態？

**記錄：** ✅ / ❌

#### MyItemsPage（教師） - 標籤切換
1. 登入為教師
2. 進入「我的項目」
3. 查看「我的物品」標籤，進到第 2 頁
4. 切換到「借用的物品」標籤
5. 檢查頁碼是否重置為 1？
6. 檢查物品列表是否改變？

**記錄：** ✅ / ❌

---

## 🐛 代碼層面檢查（開發者）

### 快速掃描常見問題

**打開文件：** `backend/controllers/`

#### 檢查模式 1：計數時機
```bash
# 搜尋 countDocuments 的位置
grep -n "countDocuments" itemController.js
grep -n "countDocuments" borrowRequestController.js

# 確保在 skip/limit 之前
# ❌ 錯： total 之後修改 filter
# ✅ 對： filter 完成後計數
```

#### 檢查模式 2：Filter 一致性
```bash
# 確保 filter 在計數和查詢中相同
grep -A20 "countDocuments" borrowRequestController.js | grep "parentRequestId"
# 應該看到 parentRequestId: null 在計數中？
```

#### 檢查模式 3：Response 欄位
```bash
# 確認返回的 response 包含 total, page, pageSize
grep -A10 "res.json\|res.status.*json" itemController.js | grep "total"
```

---

## 📊 數據一致性驗證（JavaScript 控制台）

在瀏覽器控制台運行（任何頁面）：

### 驗證1：無重複
```javascript
// 收集多頁資料
let allIds = [];

// 第 1 頁
const p1 = await fetch('/api/items?page=1&pageSize=20').then(r => r.json());
const ids1 = p1.items.map(i => i.itemId);
allIds.push(...ids1);
console.log('P1:', ids1.length, 'items');

// 第 2 頁
const p2 = await fetch('/api/items?page=2&pageSize=20').then(r => r.json());
const ids2 = p2.items.map(i => i.itemId);
console.log('P2:', ids2.length, 'items');

// 檢查重複
const duplicates = ids2.filter(id => ids1.includes(id));
console.log('重複:', duplicates.length === 0 ? '✅ 無重複' : '❌ 有重複: ' + duplicates);

// 檢查 total 一致性
console.log('P1 total:', p1.total, 'P2 total:', p2.total);
```

### 驗證 2：篩選後分頁
```javascript
// 篩選 + 分頁
const res = await fetch('/api/items?status=Available&page=1&pageSize=100').then(r => r.json());
const uniqueIds = new Set(res.items.map(i => i.itemId));

console.log('唯一 ID:', uniqueIds.size);
console.log('返回行數:', res.items.length);
console.log('報告 total:', res.total);

// 檢查
if (uniqueIds.size === res.items.length) {
  console.log('✅ 無重複');
} else {
  console.log('❌ 有重複');
}

// 檢查所有項目符合篩選
const allAvailable = res.items.every(i => i.status === 'Available');
console.log(allAvailable ? '✅ 所有項目 Available' : '❌ 某些項目不是 Available');
```

---

## 📝 報告模板

如果找到問題，使用此格式記錄：

### Issue:  {名稱}
```
端點：/api/{endpoint}
步驟：
  1. ________________
  2. ________________
  3. ________________

期望：
  ________________

實際：
  ________________

嚴重程度：🔴 嚴重 / 🟡 中等 / 🟢 輕微

建議修復：
  ________________
```

---

## ✅ 完成清單

驗證完成後，確認：

- [ ] 自動測試腳本執行，無失敗
- [ ] Items/BorrowRequests/Users/Logs API 都驗證過
- [ ] 前端 UI 導航測試通過
- [ ] 數據一致性檢查通過
- [ ] 沒有發現重大問題或已記錄

---

## 🚀 下一步

### ✅ 如果所有測試通過
```
分頁一致性驗證完成 ✅
可以進行下一階段測試
```

### ⚠️ 如果發現問題
1. 記錄問題到 Issue Tracker
2. 檢查 `CODE_REVIEW_PAGINATION_CHECKLIST.md` 找常見模式
3. 開發者修復代碼
4. 重新運行驗證腳本
5. 確認修復後重新通過測試

---

**最後檢查時間：** _______________  
**驗證者：** _______________  
**狀態：** ✅ / ❌ / ⚠️

