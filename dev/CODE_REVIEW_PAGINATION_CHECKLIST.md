# Backend 分頁/篩選代碼審查清單

**目的：** 檢查 Controller 中的分頁/篩選邏輯是否正確  
**日期：** _________________

---

## 1️⃣ 通用分頁邏輯檢查

### 模式：計算 Skip & Limit
```javascript
// ✅ 正確 - 在所有分頁端點中使用
const skip = (parseInt(page) - 1) * parseInt(pageSize);
const total = await Model.countDocuments(filter);
const items = await Model.find(filter)
  .skip(skip)
  .limit(parseInt(pageSize));

res.json({
  items,
  total,
  page: parseInt(page),
  pageSize: parseInt(pageSize)
});
```

### ❌ 常見錯誤

| 錯誤 | 症狀 | 檢查 |
|-----|------|------|
| 忘記 `parseInt(page)` | 分頁算術失敗 | `skip = (page - 1) * pageSize` |
| 計算 `total` 後改變 filter | total 與實際行數不符 | 在 skip/limit 之前計數 |
| `total` 等於 `limit` 的行數 | 總數永遠 ≤ pageSize | 確保計數整個 filter |
| 混淆 `limit` 和 `pageSize` | 分頁大小有時不一致 | 統一使用 `pageSize` |

---

## 2️⃣ 檢查各 Controller 實現

### itemController.js

#### ✅ getAllItems [Line 1-165]
- [ ] 計算 skip 使用正確公式?
  ```javascript
  skip = (parseInt(page) - 1) * parseInt(pageSize) ✅
  ```
- [ ] total 在 skip/limit 前計數?
  ```javascript
  total = await Item.countDocuments(filter) ✅
  ```
- [ ] 回應包含 total, page, pageSize?
  ```javascript
  { items, total, page, pageSize } ✅
  ```
- [ ] Filter 在計數和查詢中相同?

**狀態：** ✅ / ❌

#### ✅ getAvailableItems [Line 166-219]
- [ ] total = 可用項目計數（不含子項目）？
  ```javascript
  total = await Item.countDocuments(filter) ✅
  ```
- [ ] Filter 排除子項目（`motherID != null`）?
  ```javascript
  filter.$and = [{ $or: [{ motherID: null }, ...] }] ✅
  ```
- [ ] 返回行數 ≤ pageSize?

**狀態：** ✅ / ❌

#### 🔴 getItemsByOwner [Line 513-545]
```javascript
const skip = (parseInt(page) - 1) * parseInt(pageSize);
const total = await Item.countDocuments(filter);
const rawItems = await Item.find(filter)
  .sort({ itemId: 1 })
  .skip(skip)
  .limit(parseInt(pageSize));
```

- [ ] Filter 正確套用所有者？
  ```javascript
  filter = { owner: ownerId } ✅
  ```
- [ ] 搜尋詞在 filter 中？
  ```javascript
  if (search) { filter.$or = [...] } ✅
  ```
- [ ] 返回 `{ items, total, page, pageSize }`?

**狀態：** ✅ / ❌ - 註記:

---

### borrowRequestController.js

#### ⚠️ getAllRequests [Line 87-163]
```javascript
const parentFilter = { ...filter, parentRequestId: null };
const skip = (parseInt(page) - 1) * parseInt(pageSize);
const total = await BorrowRequest.countDocuments(parentFilter);
const parentRequests = await BorrowRequest.find(parentFilter)
  .sort(sort)
  .skip(skip)
  .limit(parseInt(pageSize));

// 然後取得子請求
const childRequests = await BorrowRequest.find({ parentRequestId: { $in: parentIds } });

// 合併
const allRequests = [...parentRequests, ...childRequests];
```

**檢查點：**
- [ ] `total` 只計算父請求？
  ```javascript
  parentFilter = { ...filter, parentRequestId: null } ✅
  ```
- [ ] 分頁基於父請求（正確）？
- [ ] 返回 `{ requests: allRequests, total }` 中的 total 正確？
  ```javascript
  return { requests: populated, total, page, pageSize } ✅
  ```

**問題診斷：**
- 🟡 **確認：** 返回的 requests 中，有多少是父請求，有多少是子請求？
  - 如果：`total = 5` 但返回 15 項（5 個父 + 10 個子），這是 ✅ 正確
  - 如果：`total = 15`（包括子），這是 ❌ 錯誤

**狀態：** ✅ / ❌ / ⚠️ - 描述:

#### ✅ getMyRequests [Line 219-261]
```javascript
const parentFilter = { borrowerID: req.user.userId, ...filter, parentRequestId: null };
const skip = (parseInt(page) - 1) * parseInt(pageSize);
const total = await BorrowRequest.countDocuments(parentFilter);
```

- [ ] 只計算當前使用者的父請求？
- [ ] 返回包括子請求（但 total 不重複計數）？

**狀態：** ✅ / ❌

#### ✅ getPendingRequests [Line 175-217]
```javascript
const total = await BorrowRequest.countDocuments(parentFilter);
```

- [ ] `parentFilter = { status: 'Pending', parentRequestId: null }`?
- [ ] Total 只計算待機父請求？
- [ ] 返回同時包含 `pendingCount` 和 `checkoutCount`？

**狀態：** ✅ / ❌

---

### userController.js

#### ✅ getAllUsers [Line 25-70]
```javascript
const skip = (parseInt(page) - 1) * parseInt(pageSize);
const total = await User.countDocuments(filter);
const users = await User.find(filter)
  .select('-password')
  .sort(sort)
  .skip(skip)
  .limit(parseInt(pageSize));
```

- [ ] 所有篩選（role, subRole, search）在計數和查詢中應用？
- [ ] 返回 `{ users, total, page, pageSize }`?

**狀態：** ✅ / ❌

---

### auditLogController.js

#### ✅ getAllLogs [Line 21-71]
```javascript
const skip = (parseInt(page) - 1) * parseInt(pageSize);
const total = await AuditLog.countDocuments(filter);
const logs = await AuditLog.find(filter)
  .sort({ [sortField]: sortDir === 'desc' ? -1 : 1 })
  .skip(skip)
  .limit(parseInt(pageSize));
```

- [ ] 時間範圍篩選在 filter 中正確應用？
- [ ] Action 篩選在計數和查詢中相同？
- [ ] 返回 `{ logs, total, page, pageSize }`?

**狀態：** ✅ / ❌

---

## 3️⃣ 常見邏輯問題

### 問題 1: Total 計算後改變 Filter
❌ **錯誤代碼：**
```javascript
const total = await Model.countDocuments(filter);
// ... 然後在這裏修改 filter
if (someCondition) filter.status = 'Approved';
const items = await Model.find(filter).skip(skip).limit(limit);
// ❌ total 與實際查詢不符！
```

✅ **正確代碼：**
```javascript
// 建立完整的 filter，然後計數和查詢使用同一個 filter
const filter = { ... all conditions ... };
const total = await Model.countDocuments(filter);
const items = await Model.find(filter).skip(skip).limit(limit);
```

**狀態檢查：** ✅ 所有 controller 都在使用前建立完整 filter

---

### 問題 2: 父/子請求計數混淆
❌ **錯誤：**
```javascript
const total = await BorrowRequest.countDocuments(filter); // 計數所有，包括子
const parentRequests = await BorrowRequest.find({ ...filter, parentRequestId: null });
// ❌ total 包含子請求，但 pageSize 基於父請求 → 行數與 total 不符
```

✅ **正確：**
```javascript
const parentFilter = { ...filter, parentRequestId: null };
const total = await BorrowRequest.countDocuments(parentFilter); // 只計數父
const parentRequests = await BorrowRequest.find(parentFilter);
```

**STATUS:** 
- [ ] borrowRequestController 在所有分頁端點中使用 `parentFilter`

---

### 問題 3: 篩選未應用於計數
❌ **錯誤：**
```javascript
const total = await Item.countDocuments({}); // ❌ 計數所有項目
if (status) {
  const items = await Item.find({ status }).skip(skip).limit(limit); // 但只查詢某狀態
}
// ❌ total 不符
```

✅ **正確：**
```javascript
const filter = {};
if (status) filter.status = status;
const total = await Item.countDocuments(filter);
const items = await Item.find(filter).skip(skip).limit(limit);
```

**狀態檢查：**
- [ ] 所有篩選參數都在 GET 時讀取？
- [ ] 所有篩選都添加到 `filter` 物件？
- [ ] `countDocuments(filter)` 和 `find(filter)` 使用相同的 filter？

---

### 問題 4: Skip/Limit 計算錯誤
❌ **錯誤：**
```javascript
const skip = page * pageSize;  // ❌ 應該是 (page - 1)
const skip = (page - 1) / pageSize;  // ❌ 應該是乘法，不是除法
```

✅ **正確：**
```javascript
const skip = (parseInt(page) - 1) * parseInt(pageSize);
```

**驗證：**
- [ ] page=1 時，skip=0（返回前 10 項）？ ✅
- [ ] page=2 時，skip=10（返回第 11-20 項）？ ✅

---

## 4️⃣ API 響應格式檢查

### 必需欄位

| 端點 | 必需欄位 | 檢查 |
|------|---------|------|
| getAllItems | items, total, page, pageSize | Found ✅ |
| getAllRequests | requests, total, page, pageSize | Found ✅ |
| getMyRequests | requests, total, page, pageSize | Found ✅ |
| getAllUsers | users, total, page, pageSize | Found ✅ |
| getAllLogs | logs, total, page, pageSize | Found ✅ |

**驗證命令：**
```bash
curl "http://localhost:5002/api/items?page=1&pageSize=5" | jq '.| keys'
# 應該包含：items, total, page, pageSize
```

---

## 5️⃣ 篩選重置邏輯

### 前端應該在以下情況重置 page=1：
- [ ] 應用新的篩選條件
- [ ] 修改搜尋詞
- [ ] 切換排序
- [ ] 切換標籤（例如 MyItemsPage）

### 後端不需要重置（接受任何頁碼）：
- [ ] 前端決定何時重置
- [ ] 後端只返回該頁碼的數據
- [ ] 即使 page > totalPages，也返回空陣列

**驗證：** 
- [ ] 前端在篩選變更時設置 `page = 1`？
- [ ] 後端在頁碼超出範圍時不拋出錯誤？

---

## 6️⃣ 邊界情況

### 測試代碼審查：

#### 6.1 空結果
```javascript
// 篩選返回 0 項時
filter.status = 'NONEXISTENT';
const total = await Item.countDocuments(filter); // = 0 ✅
const items = await Item.find(filter).skip(0).limit(10); // = [] ✅

// 返回應該是
{ items: [], total: 0, page: 1, pageSize: 10 } ✅
```

- [ ] 返回 `{ items: [], total: 0 }`（不是 null 或 malformed）?

#### 6.2 頁碼超出範圍
```javascript
// page=999999, total=100
const skip = (999999 - 1) * 10; // = 9999990
const items = await Item.find(filter).skip(9999990).limit(10); // = [] ✅

// 返回應該是
{ items: [], total: 100, page: 999999, pageSize: 10 } ✅
```

- [ ] 不拋出錯誤，只返回空陣列？

#### 6.3 頁碼 = 1
```javascript
const skip = (1 - 1) * 10; // = 0 ✅
const items = await Item.find(filter).skip(0).limit(10); // 前 10 項 ✅
```

- [ ] 正確返回前 pageSize 項？

---

## 7️⃣ 排序穩定性

### 檢查排序是否通過篩選/分頁保持一致
```javascript
const sort = {};
sort[sortBy] = sortDir === 'desc' ? -1 : 1;

const items1 = await Model.find(filter).sort(sort).skip(0).limit(10);
const items2 = await Model.find(filter).sort(sort).skip(10).limit(10);

// items1[0] 應該在 items2[0] 之前（基於排序）
```

**檢查：**
- [ ] 所有分頁查詢都使用相同的 `sort`？
- [ ] 排序在 skip/limit 前應用？
- [ ] 沒有非確定性排序（例如沒有排序，依賴插入順序）？

---

## 8️⃣ 提交前清單

### 在提交代碼前檢查每個分頁端點：

#### 模板檢查
```javascript
// ✅ 這個 Controller 方法正確嗎？

exports.getItems = catchAsync(async (req, res) => {
  const { page = 1, pageSize = 10, status, search, sortBy = 'itemId', sortDir = 'asc' } = req.query;
  
  // 1. 建立 COMPLETE filter
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { name: regex },
      { itemId: regex }
    ];
  }
  
  // 2. 計算 skip（在排序和 filter 完成後）
  const sort = {};
  sort[sortBy] = sortDir === 'desc' ? -1 : 1;
  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  
  // 3. 計數 BEFORE skip/limit（使用相同的 filter）
  const total = await Item.countDocuments(filter);
  
  // 4. 查詢（完整 filter，應用排序，skip，limit）
  const items = await Item.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(pageSize));
  
  // 5. 返回帶有元數據的完整回應
  res.json({
    success: true,
    items,
    total,        // ✅ 過濾資料集的完整計數
    page: parseInt(page),      // ✅ 當前頁碼
    pageSize: parseInt(pageSize) // ✅ 頁面大小
  });
});
```

**應用此模板到每個分頁端點：**

- [ ] itemController.getAllItems
- [ ] itemController.getAvailableItems
- [ ] itemController.getLentOutItems
- [ ] itemController.getItemsByOwner
- [ ] borrowRequestController.getAllRequests
- [ ] borrowRequestController.getMyRequests
- [ ] borrowRequestController.getPendingRequests
- [ ] borrowRequestController.getTeacherHistory
- [ ] userController.getAllUsers
- [ ] auditLogController.getAllLogs

---

## 9️⃣ 問題報告

### 如果發現代碼問題：

**問題 #1:**
- **端點：** ________________
- **代碼行：** ________________
- **問題：** ________________
- **預期：** ________________
- **建議修復：** ________________

---

## 🔟 審查完成

**審查者：** ________________  
**日期：** ________________  

**整體狀態：**
- [ ] ✅ 所有分頁邏輯正確
- [ ] ⚠️ 發現並記錄問題
- [ ] ❌ 發現關鍵問題，需要修復

**備註：**
```
_________________________________________________________________
_________________________________________________________________
```

---

**文檔版本：** 1.0  
**最後更新：** 2026-03-30
