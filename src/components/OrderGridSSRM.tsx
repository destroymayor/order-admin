import { useCallback, useEffect, useMemo, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type {
  ColDef,
  FilterChangedEvent,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
} from 'ag-grid-community'

import type { IServerSideDatasource } from 'ag-grid-enterprise'

import { useQueryClient } from '@tanstack/react-query'
import { shallow } from 'zustand/shallow'
import { useOrderFilterStore } from '../stores/orderFilterStore'
import { orderKeys } from '../api/orderQueries'
import { fetchOrderFacets, fetchOrderRange, type Order } from '../api/orders'
import { ORDER_STATUS_LABEL } from '../constants/orderStatus'
import { ORDER_PRIORITY_LABEL } from '../constants/orderPriority'
import { dateOnlyComparator } from '../utils/agGridDateComparator'
import { filtersToGridModel, gridModelToFilters } from '../utils/orderGridFilterBridge'
import { createFacetFilterParams } from '../utils/orderFacetFilter'

/**
 * Server-Side Row Model：資料量大到不可能一次撈回來時使用（需要 Enterprise 授權）。
 *
 * 關鍵差異：datasource 不是 React 元件，不能用 hook。
 * 改成在 getRows 裡呼叫 queryClient.fetchQuery，一樣吃得到 TanStack Query 的快取與請求去重。
 */
export function OrderGridSSRM() {
  const queryClient = useQueryClient()
  const gridApiRef = useRef<GridApi<Order> | null>(null)
  // facet 欄位（目前是 status，之後可能還有其他欄位）的 set filter 選項是非同步 API，
  // 頁面剛載入時 onGridReady 呼叫 setFilterModel 那當下選項還沒到，勾選狀態可能顯示不出來——
  // 用這個 Set 記錄「哪些欄位的選項已經第一次載入完成」，載入完就補一次 setFilterModel
  // 讓預設勾選狀態確實套用到 column 上（見 createFacetFilterParams）
  const facetSyncedFieldsRef = useRef(new Set<string>())

  const columnDefs = useMemo<ColDef<Order>[]>(() => [
    {
      field: 'orderNo',
      headerName: '訂單編號',
      minWidth: 150,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
      filterParams: { filterOptions: ['contains'], maxNumConditions: 1 },
    },
    {
      field: 'customer',
      headerName: '客戶',
      flex: 1,
      minWidth: 140,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
      filterParams: { filterOptions: ['contains'], maxNumConditions: 1 },
    },
    {
      field: 'status',
      headerName: '狀態',
      width: 120,
      valueFormatter: (p) => (p.value ? ORDER_STATUS_LABEL[p.value as Order['status']] : ''),
      filter: 'agSetColumnFilter',
      // 選項不是寫死的陣列，而是打一支「facet API」問後端目前有哪些狀態值。
      // 之後若有其他欄位也要走 facet，一樣呼叫 createFacetFilterParams 帶自己的 fetcher 即可。
      filterParams: createFacetFilterParams({
        field: 'status',
        fetchFacets: (filters, signal) => fetchOrderFacets('status', filters, signal),
        queryClient,
        gridApiRef,
        syncedFieldsRef: facetSyncedFieldsRef,
        valueFormatter: (p) => ORDER_STATUS_LABEL[p.value as Order['status']] ?? p.value,
      }),
    },
    {
      field: 'priority',
      headerName: '優先級',
      width: 120,
      valueFormatter: (p) => (p.value ? ORDER_PRIORITY_LABEL[p.value as Order['priority']] : ''),
      filter: 'agSetColumnFilter',
      filterParams: createFacetFilterParams({
        field: 'priority',
        fetchFacets: (filters, signal) => fetchOrderFacets('priority', filters, signal),
        queryClient,
        gridApiRef,
        syncedFieldsRef: facetSyncedFieldsRef,
        valueFormatter: (p) => ORDER_PRIORITY_LABEL[p.value as Order['priority']] ?? p.value,
      }),
    },
    {
      field: 'amount',
      headerName: '金額',
      width: 140,
      type: 'numericColumn',
      valueFormatter: (p) => (p.value == null ? '' : `NT$ ${p.value.toLocaleString('zh-TW')}`),
      filter: 'agNumberColumnFilter',
      floatingFilter: true,
      filterParams: { filterOptions: ['inRange'], maxNumConditions: 1 },
    },
    {
      field: 'createdAt',
      headerName: '建立日期',
      width: 140,
      filter: 'agDateColumnFilter',
      floatingFilter: true,
      filterParams: { filterOptions: ['inRange'], maxNumConditions: 1, comparator: dateOnlyComparator },
    },
  ], [queryClient])

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
  }), [])

  const getRowId = useCallback((p: GetRowIdParams<Order>) => p.data.id, [])

  const datasource = useMemo<IServerSideDatasource>(() => ({
    getRows: async (params) => {
      const { startRow = 0, endRow = 100, sortModel } = params.request

      // 用 getState() 讀取，不要靠 closure，也不要放進 deps —
      // 否則 filter 一改 datasource 就重建，grid 會整個重掛
      const { filters } = useOrderFilterStore.getState()

      const key = {
        startRow,
        endRow,
        sort: sortModel.map((s) => ({ colId: s.colId, sort: s.sort as 'asc' | 'desc' })),
        filters,
      }

      console.log('getRows', key)

      try {
        const res = await queryClient.fetchQuery({
          queryKey: orderKeys.range(key),
          queryFn: ({ signal }) => fetchOrderRange(key, signal),
          staleTime: 60_000,
        })
        params.success({ rowData: res.rows, rowCount: res.total })
      } catch (err) {
        console.error('[SSRM] 區間載入失敗', err)
        params.fail()
      }
    },
  }), [queryClient])

  const onGridReady = useCallback((e: GridReadyEvent<Order>) => {
    gridApiRef.current = e.api
    // 把 store 的預設 filter 同步進 grid 的 column filter UI，
    // 不然資料雖然有被篩過，但欄位上的 filter icon / set filter 勾選狀態不會顯示成「已套用」
    e.api.setFilterModel(filtersToGridModel(useOrderFilterStore.getState().filters))
  }, [])

  // column filter（floating filter / set filter）改變時：
  // 讀出 grid 當下完整的 filterModel 寫回 store，store 才是唯一真相，
  // 之後交給下面的 subscribe 去觸發 refreshServerSide。
  const onFilterChanged = useCallback((e: FilterChangedEvent<Order>) => {
    const current = useOrderFilterStore.getState().filters
    const patch = gridModelToFilters(e.api.getFilterModel())
    // 避免和下面「store → grid」的同步互相回彈：值沒變就不寫入
    if (JSON.stringify({ ...current, ...patch }) !== JSON.stringify(current)) {
      useOrderFilterStore.getState().setFilters(patch)
    }
  }, [])

  // 用 store.subscribe 而不是 useEffect([filters])：
  // 這樣 filter 變動不會讓整個 grid 元件重繪，只會通知 grid 去重抓資料
  useEffect(() => {
    return useOrderFilterStore.subscribe(
      (s) => s.filters,
      (filters) => {
        // purge: true → 清掉已快取的 block 並顯示 loading
        // 省略則是背景重載，畫面不閃但會短暫看到舊資料
        gridApiRef.current?.refreshServerSide({ purge: true })

        // filter 可能是被 OrderFilterBar 的「清除條件」或其他外部來源改的，
        // 這裡把 grid 的 column filter UI 同步回 store 當下的值，避免兩邊顯示不一致。
        // 用 JSON 比較擋掉 onFilterChanged 剛寫回 store 觸發的回彈，不然會無限互相觸發。
        const api = gridApiRef.current
        if (!api) return
        const nextModel = filtersToGridModel(filters)
        if (JSON.stringify(api.getFilterModel()) !== JSON.stringify(nextModel)) {
          api.setFilterModel(nextModel)
        }
      },
      { equalityFn: shallow },
    )
  }, [])

  return (
    <div style={{ height: 520 }}>
      <AgGridReact<Order>
        rowModelType="serverSide"
        serverSideDatasource={datasource}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={getRowId}
        cacheBlockSize={100}
        maxBlocksInCache={10}
        onGridReady={onGridReady}
        onFilterChanged={onFilterChanged}
      />
    </div>
  )
}
