# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev        # Vite dev server
npm run build       # tsc -b && vite build
npm run preview     # preview a production build
npm run typecheck   # tsc -b --noEmit
```

There is no lint script and no test runner configured in this repo. `npm run typecheck` is the fastest correctness check after any change.

## Architecture

Vite + React 19 + TypeScript admin page for browsing orders through AG Grid (Enterprise). Everything is a single page (`src/App.tsx`) wrapping `FilterPresetCards` + `OrderFilterBar` + `OrderGridTabs`, plus React Query Devtools.

**Data flow is unidirectional: Zustand → queryKey → TanStack Query → AG Grid.**
`useOrderFilterStore` (`src/stores/orderFilterStore.ts`) is the single source of truth for filters, sort, page, and the active tab (`activeDataset`). Nothing else holds parallel state — components read the store and write back to it; the store's `subscribe` triggers grid refetches.

- AG Grid's column filter UI (floating filters / set filters) is synced to/from the store via `src/utils/orderGridFilterBridge.ts` (`gridModelToFilters` / `filtersToGridModel`), not treated as its own state.
- `src/api/orderQueries.ts` is the query-key factory — a queryKey is just "the store values that determine this data," so changing a filter automatically changes the key and refetches.

### Two grid implementations, only one is wired up

- `src/components/OrderGridSSRM.tsx` — **Server-Side Row Model**, the one actually rendered (via `OrderGridTabs`). Registers `AllEnterpriseModule` in `App.tsx` (works without a license key, watermarked). Its `IServerSideDatasource.getRows` is not a React component, so it can't use hooks — it reads the store with `useOrderFilterStore.getState()` (never as a closure/dep, or the datasource would rebuild and remount the grid on every filter change) and calls `queryClient.fetchQuery` directly to get TanStack Query's caching/dedup. Set Filter options come from `fetchOrderFacets`, a simulated facet API that narrows its choices based on whatever other filters are currently applied (mirrors real facet-API behavior).
- `src/components/OrderGrid.tsx` + `src/hooks/useOrders.ts` — **Client-Side Row Model**, kept as a reference implementation but not mounted anywhere. Swap `<OrderGridTabs />`/`<OrderGridSSRM />` for `<OrderGrid />` in `App.tsx` to switch back; the Enterprise module and the SSRM-only facet/filter-bridge utilities become unnecessary in that mode.

### Tabs and multi-dataset setup

`src/components/OrderGridTabs.tsx` renders one `OrderGridSSRM` per tab, each pointed at a different mock dataset (`ORDER_DATASETS` / `OrderDatasetId` in `src/api/orders.ts`) so switching tabs visibly changes the grid contents. The active tab lives in the store (`activeDataset`), not local component state, because `FilterPresetCards` also needs to change it: each preset carries a `datasetId` and clicking it both applies the preset's filters and switches to that preset's tab. The grid is remounted on tab change (`key={activeTab}`) to avoid SSRM row-cache bleed between datasets.

### Fake backend

`src/api/orders.ts` is the entire "API" — one build-time-generated array per dataset (`ORDER_DATASETS`), filtered/sorted/paged in memory with an artificial `delay()`. Swap `fetchOrderRange` / `fetchOrderFacets` / `fetchOrders` for real HTTP calls; keep passing the `signal` through so query cancellation on filter change still works. `src/constants/orderStatus.ts` and `src/constants/orderPriority.ts` are the sole source of truth for those enums (values, types, and Chinese labels) — derive from them rather than redeclaring elsewhere.

### AG Grid version notes

AG Grid v33+ uses the Theming API — do not import `ag-grid.css` or a theme CSS file. Modules must be registered via `ModuleRegistry.registerModules([...])`, already done once in `App.tsx` (`AllCommunityModule` + `AllEnterpriseModule`).
