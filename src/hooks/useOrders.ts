import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useShallow } from 'zustand/react/shallow'
import { useOrderFilterStore } from '../stores/orderFilterStore'
import { orderKeys } from '../api/orderQueries'
import { fetchOrders, type Order } from '../api/orders'
import { useDebouncedValue } from './useDebouncedValue'

/**
 * Zustand → queryKey → API → grid 的單向流。
 * 元件只要呼叫這個 hook，完全不需要知道 filter 是誰改的。
 */
export function useOrders() {
  // useShallow 是必要的：沒有它，selector 每次 render 都回傳新物件 → 無限重繪
  const params = useOrderFilterStore(
    useShallow((s) => ({
      filters: s.filters,
      page: s.page,
      pageSize: s.pageSize,
      sort: s.sort,
    })),
  )

  // keyword 打字會很頻繁，整包 debounce 最省事；
  // 若希望下拉選單即時反應，可拆成 debounce keyword + 其餘直接用。
  const debouncedParams = useDebouncedValue(params, 300)

  const query = useQuery({
    queryKey: orderKeys.list(debouncedParams),
    queryFn: ({ signal }) => fetchOrders(debouncedParams, signal),
    // 切 filter 時保留舊資料，畫面不會閃成空白
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  return {
    ...query,
    rows: query.data?.rows ?? [],
    total: query.data?.total ?? 0,
    // isFetching 涵蓋背景重取；isLoading 只有第一次
    isRefreshing: query.isFetching && !query.isLoading,
  }
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (order: Partial<Order> & { id: string }) => {
      // 換成真正的 PATCH 請求
      return order
    },
    onSuccess: () => {
      // 只作廢 list，detail 的快取留著
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
    },
  })
}
