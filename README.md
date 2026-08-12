# order-admin

Vite + React 19 + TypeScript，把上層資料夾的範例檔組成一個可執行的「訂單管理」頁面。

## 跑起來

```bash
npm install
npm run dev
```

## 頁面組成

`src/App.tsx` 是整個頁面：`QueryClientProvider` 包住 `OrderFilterBar` + `OrderGrid`，
外加 React Query Devtools。資料流是 Zustand → queryKey → TanStack Query → AG Grid 的單向流。

| 檔案 | 職責 |
| --- | --- |
| `src/stores/orderFilterStore.ts` | filter / sort / page 狀態（唯一真相） |
| `src/api/orders.ts` | API 層（目前是 5000 筆假資料，換成 fetch 即可） |
| `src/api/orderQueries.ts` | query key factory |
| `src/hooks/useOrders.ts` | 串接 store 與 Query |
| `src/hooks/useDebouncedValue.ts` | 擋打字造成的高頻請求 |
| `src/components/OrderFilterBar.tsx` | filter UI，只認識 store |
| `src/components/OrderGrid.tsx` | Client-Side Row Model（頁面預設用這個） |
| `src/components/OrderGridSSRM.tsx` | Server-Side Row Model（未接進頁面，見下方） |

## 關於 SSRM

`OrderGridSSRM.tsx` 需要 AG Grid Enterprise。`ag-grid-enterprise` 放在 devDependencies，
因為該檔只用到 `import type`，型別檢查得到、執行期不會被打包進去。

要實際使用它，必須：

1. 在 `src/App.tsx` 註冊模組 —— `ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule])`
2. 把 `ag-grid-enterprise` 移到 dependencies，並設定 License Key
3. 把 `<OrderGrid />` 換成 `<OrderGridSSRM />`

沒有 License 也能跑，只是畫面會有浮水印。

## 版本

React 19 / Vite 7 / AG Grid 34 / TanStack Query 5 / Zustand 5。
AG Grid v33+ 用 Theming API，不需要 import `ag-grid.css` 或主題 CSS，
但必須 `ModuleRegistry.registerModules([AllCommunityModule])`（已在 `App.tsx` 做了）。
