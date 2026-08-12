import type { ListParams, OrderFilters } from '../stores/orderFilterStore'
import type { RangeParams } from './orders'

/**
 * queryKey 就是「這份資料由哪些條件決定」的宣告。
 * 把 store 的值原封不動塞進去，filter 一改 key 就變，Query 自動重打 API。
 */
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params: ListParams) => [...orderKeys.lists(), params] as const,
  range: (params: RangeParams) => [...orderKeys.all, 'range', params] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
  // field 放前面：同一個 facet 欄位的 query 共用同一段 key，方便日後要 invalidate 某欄位的選項時用 predicate 比對
  facets: (field: string, filters: OrderFilters) => [...orderKeys.all, 'facets', field, filters] as const,
}
