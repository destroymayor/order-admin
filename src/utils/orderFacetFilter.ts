import type { RefObject } from 'react'
import type { GridApi, SetFilterValuesFuncParams } from 'ag-grid-community'
import type { QueryClient } from '@tanstack/react-query'
import { useOrderFilterStore, type OrderFilters } from '../stores/orderFilterStore'
import { orderKeys } from '../api/orderQueries'
import type { Order, OrderDatasetId } from '../api/orders'
import { filtersToGridModel } from './orderGridFilterBridge'

/**
 * 產生「選項來自 facet API」的 set filter filterParams。
 * 把每個 facet 欄位都要重複的邏輯（打 API → success() → 首次載入完補一次 setFilterModel）
 * 集中在這裡維護一份；欄位只需要帶自己的 fetcher 跟顯示用的 valueFormatter。
 *
 * syncedFieldsRef 用 Set 而不是單一 boolean，是因為多個 facet 欄位各自非同步載入、
 * 完成時間不同，要各自追蹤「我的選項是不是第一次載入完成」，不能共用一個旗標。
 */
export function createFacetFilterParams<K extends keyof Order>({
  datasetId,
  field,
  fetchFacets,
  queryClient,
  gridApiRef,
  syncedFieldsRef,
  valueFormatter,
}: {
  datasetId: OrderDatasetId
  field: K
  fetchFacets: (filters: OrderFilters, signal?: AbortSignal) => Promise<Order[K][]>
  queryClient: QueryClient
  gridApiRef: RefObject<GridApi<Order> | null>
  syncedFieldsRef: RefObject<Set<string>>
  valueFormatter?: (p: { value: Order[K] }) => string
}) {
  return {
    values: (params: SetFilterValuesFuncParams<Order, Order[K]>) => {
      const { filters } = useOrderFilterStore.getState()
      queryClient
        .fetchQuery({
          queryKey: orderKeys.facets(datasetId, field, filters),
          queryFn: ({ signal }) => fetchFacets(filters, signal),
          staleTime: 30_000,
        })
        .then((values) => {
          params.success(values)
          if (!syncedFieldsRef.current.has(field)) {
            syncedFieldsRef.current.add(field)
            gridApiRef.current?.setFilterModel(filtersToGridModel(useOrderFilterStore.getState().filters))
          }
        })
        .catch(() => params.success([]))
    },
    // 每次打開 dropdown 都重新問一次 API，讓選項隨其他已套用的 filter 收斂（真正的 facet 行為）
    refreshValuesOnOpen: true,
    ...(valueFormatter && { valueFormatter }),
  }
}
