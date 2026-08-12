import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { OrderDatasetId } from '../api/orders'

export type SortItem = { colId: string; sort: 'asc' | 'desc' }

export type OrderFilters = {
  keyword: string
  status: string[]
  priority: string[]
  dateRange: [string, string] | null
  // 以下三個由 AG Grid 的 column filter（floating filter / set filter）驅動
  orderNo: string
  customer: string
  amountRange: [number | null, number | null] | null
}

export type ListParams = {
  filters: OrderFilters
  page: number
  pageSize: number
  sort: SortItem[]
}

// 頁面載入時的預設 filter：只顯示「待處理」與「已付款」，聚焦在還需要人工處理的訂單
const initialFilters: OrderFilters = {
  keyword: '',
  status: [],
  priority: [],
  dateRange: null,
  orderNo: '',
  customer: '',
  amountRange: null,
}

type OrderFilterState = {
  filters: OrderFilters
  page: number
  pageSize: number
  sort: SortItem[]
  // 目前作用中的 tab（對應 OrderGridSSRM 用的假資料集）：
  // preset filter card 帶自己的 datasetId，點下去要能連動切換 tab，所以跟 filters 放在同一個 store 裡
  activeDataset: OrderDatasetId
  setFilter: <K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) => void
  setFilters: (patch: Partial<OrderFilters>) => void
  setSort: (sort: SortItem[]) => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  setActiveDataset: (datasetId: OrderDatasetId) => void
  reset: () => void
}

export const useOrderFilterStore = create<OrderFilterState>()(
  subscribeWithSelector((set) => ({
    filters: initialFilters,
    page: 0,
    pageSize: 50,
    sort: [],
    activeDataset: 'A',

    setFilter: (key, value) =>
      set((s) => ({ filters: { ...s.filters, [key]: value }, page: 0 })),

    // 批次寫入多個欄位，只觸發一次 filters 變動通知（AG Grid filterChanged 一次帶出整包 filterModel 時用）
    setFilters: (patch) =>
      set((s) => ({ filters: { ...s.filters, ...patch }, page: 0 })),

    setSort: (sort) => set({ sort, page: 0 }),
    setPage: (page) => set({ page }),
    setPageSize: (pageSize) => set({ pageSize, page: 0 }),
    setActiveDataset: (activeDataset) => set({ activeDataset }),
    reset: () => set({ filters: initialFilters, sort: [], page: 0 }),
  })),
)

/** 給非 React 環境（例如 SSRM datasource）讀取當下狀態用 */
export const getListParams = (): ListParams => {
  const { filters, page, pageSize, sort } = useOrderFilterStore.getState()
  return { filters, page, pageSize, sort }
}
