import type { ListParams, OrderFilters, SortItem } from '../stores/orderFilterStore'
import { ORDER_STATUSES, type OrderStatus } from '../constants/orderStatus'
import { ORDER_PRIORITIES, type OrderPriority } from '../constants/orderPriority'

export type Order = {
  id: string
  orderNo: string
  customer: string
  status: OrderStatus
  priority: OrderPriority
  amount: number
  createdAt: string
}

export type ListResult = {
  rows: Order[]
  total: number
}

/** SSRM 用的參數：以 startRow/endRow 取代 page/pageSize */
export type RangeParams = {
  startRow: number
  endRow: number
  sort: SortItem[]
  filters: OrderFilters
}

// ---------------------------------------------------------------------------
// 以下是假資料，實務上換成 fetch / axios 即可。
// 重點只有一個：queryFn 收到的 signal 要傳給 fetch，切換 filter 時舊請求才會被取消。
// ---------------------------------------------------------------------------

const DB: Order[] = Array.from({ length: 5000 }, (_, i) => ({
  id: String(i + 1),
  orderNo: `ORD-${String(i + 1).padStart(5, '0')}`,
  customer: `客戶 ${(i % 120) + 1}`,
  status: ORDER_STATUSES[i % ORDER_STATUSES.length],
  priority: ORDER_PRIORITIES[(i * 3) % ORDER_PRIORITIES.length],
  amount: Math.round(500 + (i * 137) % 48000),
  createdAt: new Date(Date.UTC(2026, 0, 1) + i * 3.6e6).toISOString().slice(0, 10),
}))

function applyFilters(rows: Order[], filters: OrderFilters): Order[] {
  const keyword = filters.keyword.trim().toLowerCase()
  const orderNo = filters.orderNo.trim().toLowerCase()
  const customer = filters.customer.trim().toLowerCase()
  return rows.filter((row) => {
    if (keyword && !row.orderNo.toLowerCase().includes(keyword) && !row.customer.toLowerCase().includes(keyword)) {
      return false
    }
    if (orderNo && !row.orderNo.toLowerCase().includes(orderNo)) {
      return false
    }
    if (customer && !row.customer.toLowerCase().includes(customer)) {
      return false
    }
    if (filters.status.length > 0 && !filters.status.includes(row.status)) {
      return false
    }
    if (filters.priority.length > 0 && !filters.priority.includes(row.priority)) {
      return false
    }
    if (filters.amountRange) {
      const [min, max] = filters.amountRange
      if (min != null && row.amount < min) return false
      if (max != null && row.amount > max) return false
    }
    if (filters.dateRange) {
      const [from, to] = filters.dateRange
      if (row.createdAt < from || row.createdAt > to) return false
    }
    return true
  })
}

function applySort(rows: Order[], sort: SortItem[]): Order[] {
  if (sort.length === 0) return rows
  return [...rows].sort((a, b) => {
    for (const { colId, sort: dir } of sort) {
      const av = a[colId as keyof Order]
      const bv = b[colId as keyof Order]
      if (av === bv) continue
      const cmp = av > bv ? 1 : -1
      return dir === 'asc' ? cmp : -cmp
    }
    return 0
  })
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

/** 分頁查詢（Client-Side Row Model 用） */
export async function fetchOrders(params: ListParams, signal?: AbortSignal): Promise<ListResult> {
  await delay(400, signal)
  const filtered = applySort(applyFilters(DB, params.filters), params.sort)
  const start = params.page * params.pageSize
  return {
    rows: filtered.slice(start, start + params.pageSize),
    total: filtered.length,
  }
}

/** 區間查詢（Server-Side Row Model 用） */
export async function fetchOrderRange(params: RangeParams, signal?: AbortSignal): Promise<ListResult> {
  await delay(400, signal)
  const filtered = applySort(applyFilters(DB, params.filters), params.sort)
  return {
    rows: filtered.slice(params.startRow, params.endRow),
    total: filtered.length,
  }
}

// 各 facet 欄位的全部候選值，欄位名稱對到各自的 source of truth 陣列
const FACET_SOURCES = {
  status: ORDER_STATUSES,
  priority: ORDER_PRIORITIES,
} as const

/**
 * 模擬後端 facet 聚合 API：給 AG Grid Set Filter 當選項來源用，一支打所有 facet 欄位（帶欄位名稱區分）。
 * 套用「除了這個欄位自己」以外的所有 filter，再回傳過濾後資料裡實際存在的值——
 * 這樣選項會隨其他條件收斂（例如選了日期區間後，某些狀態可能就不會出現在選項裡），
 * 是真實 facet API 常見的行為，跟直接回傳整個 enum 不同。
 */
export async function fetchOrderFacets<K extends keyof typeof FACET_SOURCES>(
  field: K,
  filters: OrderFilters,
  signal?: AbortSignal,
): Promise<Order[K][]> {
  await delay(1500, signal)
  const rows = applyFilters(DB, { ...filters, [field]: [] } as OrderFilters)
  const present = new Set(rows.map((row) => row[field] as Order[K]))
  const values = FACET_SOURCES[field] as unknown as readonly Order[K][]
  return values.filter((v) => present.has(v))
}
