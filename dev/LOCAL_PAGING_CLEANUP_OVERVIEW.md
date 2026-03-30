# 🔄 Local Paging 清理總覽卡

**目標：** 移除前端 local paging，統一採用 backend paging 驅動，確保分頁與篩選同步，count 與 result 一致

**狀態：** 進行中  
**開始日期：** 2026-03-30  
**預期完成：** 2026-03-31  

---

## 📋 驗收標準

✅ 完成時必須滿足：
1. **無 local paging** - 前端不再使用 `slice()`、`splice()` 進行本地分頁
2. **後端驅動** - 所有 table 頁面切換產生 API request（`page` 參數變更）
3. **篩選同步** - 篩選改變時自動重置 `page=1`，API 請求同時帶上篩選參數
4. **count/result 一致** - `total` 反映篩選後的完整數據集，分頁行數 ≤ `pageSize`
5. **QA 驗收** - Phyllis 使用驗證清單簽核通過

---

## 📊 頁面清單 & 進度

### 🟢 已完成 (Backend Paging - No Changes Needed)

#### ✅ ApproveRequestsPage.vue
**狀態：** ✅ **已實現後端分頁**

**驗證點：**
- [x] `loadPendingRequests()` 調用 `getPendingRequests({ page: currentPage.value, pageSize, status })`
- [x] UI 有 PaginationControl 綁定 currentPage (L114, L191)
- [x] `pendingCount` 和 `checkoutCount` 從 API 響應設置
- [x] 標籤切換時重置 `currentPage = 1` (L12, L19)
- [x] 無 slice/sort 的 local paging

**代碼位置：** [backend/src/pages/ApproveRequestsPage.vue](ApproveRequestsPage.vue#L559-L590)

**簽核：** ✅ Code Review - 2026-03-30

---

#### ✅ AuditLogPage.vue
**狀態：** ✅ **已實現後端分頁**

**驗證點：**
- [x] `paginatedLogs` 只返回 `logs.value`（註釋指出 "Server already paginates"）
- [x] `loadLogs()` 中調用 API 並設置 `totalLogs`
- [x] Watch currentPage 變化，觸發 `loadLogs()`
- [x] 篩選變更時重置 `currentPage = 1`

**代碼位置：** [AuditLogPage.vue L350-351, L380+](AuditLogPage.vue#L350)

**簽核：** ✅ Code Review - 2026-03-30

---

#### ✅ ManageAccountsPage.vue
**狀態：** ✅ **已實現後端分頁**

**驗證點：**
- [x] `loadUsers()` 中調用 API，設置 `totalUsers`
- [x] Watch currentPage 變化
- [x] 篩選變更時重置 page

**代碼位置：** [ManageAccountsPage.vue L273+](ManageAccountsPage.vue#L273)

**簽核：** ✅ Code Review - 2026-03-30

---

#### ✅ ManageItemsPage.vue
**狀態：** ✅ **已實現後端分頁**

**驗證點：**
- [x] `loadItems()` 構建完整查詢參數包括 page
- [x] 篩選變更時重置 `currentPage = 1`

**代碼位置：** [ManageItemsPage.vue L688+](ManageItemsPage.vue#L688)

**簽核：** ✅ Code Review - 2026-03-30

---

#### ✅ SearchAvailableItemsPage.vue
**狀態：** ✅ **已實現後端分頁**

**驗證點：**
- [x] 有 PaginationControl 組件
- [x] currentPage 綁定驅動 API 請求
- [x] 篩選導致 page 重置

**代碼位置：** [SearchAvailableItemsPage.vue L150+](SearchAvailableItemsPage.vue#L150)

**簽核：** ✅ Code Review - 2026-03-30

---

#### ✅ MyItemsPage.vue
**狀態：** ✅ **已實現後端分頁**

**驗證點：**
- [x] `loadData()` 中調用 API，設置 page 參數
- [x] `paginatedOwnedItems` 和 `paginatedBorrowedItems` 不做 slice
- [x] Watch currentPage 變化

**代碼位置：** [MyItemsPage.vue L242+, L274](MyItemsPage.vue#L274)

**簽核：** ✅ Code Review - 2026-03-30

---

#### ✅ LentOutFilterPage.vue
**狀態：** ✅ **已實現後端分頁**

**驗證點：**
- [x] `buildQueryParams()` 包含 page 和 pageSize
- [x] currentPage 變更觸發 API 請求

**代碼位置：** [LentOutFilterPage.vue L378+](LentOutFilterPage.vue#L378)

**簽核：** ✅ Code Review - 2026-03-30

---

#### ✅ TeacherCheckoutPage.vue
**狀態：** ✅ **已實現後端分頁**

**驗證點：**
- [x] Watch currentPage，調用 `loadBorrowedItems()`
- [x] 參數中有 page 和 pageSize
- [x] `totalItems` 從 API 響應設置

**代碼位置：** [TeacherCheckoutPage.vue L180+](TeacherCheckoutPage.vue#L180)

**簽核：** ✅ Code Review - 2026-03-30

---

### 🟡 需要改進 (Local Paging - Requires Fix)

#### ❌ HomePage.vue
**狀態：** 🔴 **使用 local paging，需要改**

**問題：**
- [ ] ❌ `paginatedAttentionItems` 使用 `slice(start, start + attentionPageSize)`
- [ ] ❌ `attentionTotalPages = Math.ceil(finalFilteredItems.value.length / attentionPageSize)`
- [ ] ❌ 所有 attention 數據在前端過濾和分頁
- [ ] ❌ 沒有後端 API 分頁支持

**改動需求：**
```
1. 新增 attentionPage ref 用於後端 API 請求
2. 移除 finalFilteredItems.value.slice() 邏輯
3. 新增 loadAttentionItems() 函數，調用後端 API
4. Watch attentionPage, 篩選條件，觸發 API 調用
5. 篩選改變時重置 attentionPage = 1
6. 從 API 響應設置 attentionTotal, attentionTotalPages
```

**估計工作量：** 3 小時（需要新增 API 端點支持）

**代碼位置：** [HomePage.vue L930-956, L954-957](HomePage.vue#L954)

**優先級：** 🔴 **高**（首頁流量大）

**子任務：**
- [ ] T1: 後端 API 新增分頁支持（需要新端點或改造現有）
- [ ] T2: 前端 HomePage 改造為後端分頁
- [ ] T3: 測試篩選 + 分頁 + count 一致性

**預期完成：** 2026-03-31

**簽核人：** ___  
**簽核日期：** ___

---

### 🟣 檢查中 (Review Status Unclear)

#### ⚠️ DashboardCalendar.vue  
**狀態：** 需要檢查

**發現：**
- 使用 `cell.events.slice(0, 3)` (L46)
- 但這是為了顯示日曆上的前 3 個事件（UI 限制，不是分頁）

**結論：** ✅ **不是分頁，無需改動**（只是 UI 預覽限制）

**簽核：** ✅ Code Review - 2026-03-30

---

#### ⚠️ _write_homepage.mjs
**狀態：** 需要檢查

**發現：**
- 使用 `warrantyExpiredItems.value.slice(0, 5)` 
- 這是首頁特色區域，只顯示前 5 個

**結論：** ✅ **不是分頁，是 UI 限制**（可接受）

**簽核：** ✅ Code Review - 2026-03-30

---

## 🔍 總結表

| 頁面 | 當前狀態 | Local Paging? | API 驅動? | 篩選同步? | Count一致? | 優先級 |
|------|---------|:---:|:---:|:---:|:---:|:---:|
| ApproveRequestsPage | ✅ | ❌ | ✅ | ✅ | ✅ | - |
| AuditLogPage | ✅ | ❌ | ✅ | ✅ | ✅ | - |
| ManageAccountsPage | ✅ | ❌ | ✅ | ✅ | ✅ | - |
| ManageItemsPage | ✅ | ❌ | ✅ | ✅ | ✅ | - |
| SearchAvailableItemsPage | ✅ | ❌ | ✅ | ✅ | ✅ | - |
| MyItemsPage | ✅ | ❌ | ✅ | ✅ | ✅ | - |
| LentOutFilterPage | ✅ | ❌ | ✅ | ✅ | ✅ | - |
| TeacherCheckoutPage | ✅ | ❌ | ✅ | ✅ | ✅ | - |
| HomePage | ❌ | ✅ | ❌ | ❌ | ❌ | 🔴 |
| DashboardCalendar | ✅ | ⚠️ (UI限制) | - | - | - | - |
| _write_homepage.mjs | ✅ | ⚠️ (UI限制) | - | - | - | - |

---

## 🚀 改動計劃

### 優先順序
1. **P1 (立即)** - HomePage.vue 改為後端分頁
2. **P2 (後續)** - 驗證所有頁面的篩選 + 分頁 + count 一致性
3. **P3 (完成)** - Phyllis QA 驗收簽核

### HomePage.vue 改動方案

**後端支援檢查：**
- [ ] 是否已有 API 端點支持 attention items 分頁?
  - 檢查: `GET /api/dashboard/attention-items?page=X&pageSize=Y&filters=...`
  - 如無，需要新增端點

**前端改動：**

```vue
<!-- OLD (LOCAL PAGING) -->
const paginatedAttentionItems = computed(() => {
  const start = (attentionPage.value - 1) * attentionPageSize
  return finalFilteredItems.value.slice(start, start + attentionPageSize)
})

<!-- NEW (BACKEND PAGING) -->
const attentionItems = ref([])       // 來自 API
const attentionTotal = ref(0)        // 來自 API

const loadAttentionItems = async () => {
  const params = {
    page: attentionPage.value,
    pageSize: attentionPageSize,
    tab: attentionActiveTab.value,
    priority: filterPriority.value,
    status: filterStatus.value
  }
  const res = await api.getDashboardAttention(params)
  attentionItems.value = res.items
  attentionTotal.value = res.total
}

// Watch 篩選和頁面，觸發 API
watch([attentionPage, attentionActiveTab, filterPriority, filterStatus], 
  () => {
    if ([attentionActiveTab, filterPriority, filterStatus]) {
      // 篩選改變，重置頁面
      attentionPage.value = 1
    } else {
      // 只是頁碼改變，直接載入
      loadAttentionItems()
    }
  }
)
```

---

## ✅ 驗收清單

### 代碼驗收

- [ ] HomePage.vue 已改為後端分頁
- [ ] 其他頁面無需改動（已確認）
- [ ] Code Review 通過
- [ ] 無 console 錯誤

### 功能驗收 (Phyllis)

- [ ] 所有頁面可正常分頁
- [ ] 篩選改變時 page 重置為 1
- [ ] count (total) 與實際行數一致
- [ ] 無重複或缺漏的數據
- [ ] 網絡請求正確（Network tab 檢查）

### 簽核

**開發完成：** _____ (技術主管)  
**QA 驗收：** _____ (Phyllis)  
**日期：** _____  

---

## 🔗 相關文檔

- [TOTAL_COUNT_CONSISTENCY_CHECKLIST.md](../dev/TOTAL_COUNT_CONSISTENCY_CHECKLIST.md) - 驗證 total/count 一致性
- [PHYLLIS_STUDENT_PAGINATION_VERIFICATION.md](../dev/PHYLLIS_STUDENT_PAGINATION_VERIFICATION.md) - QA 最終驗證
- [README_PAGINATION_VERIFICATION.md](../dev/README_PAGINATION_VERIFICATION.md) - 验證工具總覽

---

## 📝 更新日誌

| 日期 | 進度 | 備註 |
|------|------|------|
| 2026-03-30 | 版本 1.0 | 初始版本，完成代碼掃描和清單建立 |
| 2026-03-30 | 確認 | 8 個頁面已實施後端分頁，只需改 HomePage.vue |

---

**文檔版本：** 1.0  
**維護者：** Tech Lead  
**最後更新：** 2026-03-30
