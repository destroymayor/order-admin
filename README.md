# order-admin

Vite + React 19 + TypeScript，把上層資料夾的範例檔組成一個可執行的「訂單管理」頁面。

## 跑起來

```bash
npm install
npm run dev
```

## 頁面組成

`src/App.tsx` 是整個頁面：`QueryClientProvider` 包住 `FilterPresetCards` + `OrderFilterBar` + `OrderGridSSRM`，
外加 React Query Devtools。資料流是 Zustand → queryKey → TanStack Query → AG Grid 的單向流：
store 是唯一真相，grid 的 column filter / set filter UI 透過 `orderGridFilterBridge.ts` 跟 store 雙向同步。

| 檔案 | 職責 |
| --- | --- |
| `src/stores/orderFilterStore.ts` | filter / sort / page 狀態（唯一真相） |
| `src/api/orders.ts` | API 層（目前是 5000 筆假資料，含 facet 聚合 API，換成 fetch 即可） |
| `src/api/orderQueries.ts` | query key factory |
| `src/hooks/useOrders.ts` | 串接 store 與 Query（給 `OrderGrid` / CSRM 用） |
| `src/hooks/useDebouncedValue.ts` | 擋打字造成的高頻請求 |
| `src/constants/orderStatus.ts` | 訂單狀態的唯一 source of truth（值、型別、中文 label） |
| `src/constants/orderPriority.ts` | 訂單優先級的唯一 source of truth，做法比照 `orderStatus.ts` |
| `src/utils/orderGridFilterBridge.ts` | store 的 `OrderFilters` ↔ AG Grid `filterModel` 互轉 |
| `src/utils/orderFacetFilter.ts` | 產生「選項來自 facet API」的 set filter `filterParams` |
| `src/utils/agGridDateComparator.ts` | 給 `'YYYY-MM-DD'` 字串日期欄位用的 date filter comparator |
| `src/components/FilterPresetCards.tsx` | 一鍵套用常用篩選組合（待處理 / 近 7 天 / 高額訂單） |
| `src/components/OrderFilterBar.tsx` | filter UI，只認識 store，不耦合 grid |
| `src/components/OrderGridSSRM.tsx` | Server-Side Row Model（頁面目前用這個） |
| `src/components/OrderGrid.tsx` | Client-Side Row Model（範例保留，未接進頁面） |

## 關於 SSRM

`App.tsx` 已經註冊 `AllEnterpriseModule` 並使用 `<OrderGridSSRM />`，所以 Server-Side Row Model、
Set Filter 這些 Enterprise 功能開箱即用 —— 沒有 License Key 也能跑，只是畫面會有浮水印。

`OrderGridSSRM` 的 datasource 不是 React 元件，`getRows` 裡用 `useOrderFilterStore.getState()`
讀當下 filter（而不是放進 closure/deps），並透過 `queryClient.fetchQuery` 吃 TanStack Query 的
快取與請求去重。Set Filter 的選項不是寫死陣列，而是打 `fetchOrderFacets` 這支模擬的 facet API，
選項會隨其他已套用的 filter 收斂。

若要換回單頁抓全部資料的 Client-Side Row Model（`OrderGrid.tsx` + `useOrders.ts`），
把 `App.tsx` 裡的 `<OrderGridSSRM />` 換成 `<OrderGrid />` 即可，Enterprise 模組跟 SSRM 專用的
facet / filter bridge 工具都用不到了。

## 版本

React 19 / Vite 7 / AG Grid 34 / TanStack Query 5 / Zustand 5。
AG Grid v33+ 用 Theming API，不需要 import `ag-grid.css` 或主題 CSS，
但必須 `ModuleRegistry.registerModules([...])`（已在 `App.tsx` 註冊 `AllCommunityModule` + `AllEnterpriseModule`）。
