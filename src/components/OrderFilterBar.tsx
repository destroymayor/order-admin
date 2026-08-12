import { useOrderFilterStore } from '../stores/orderFilterStore'

const STATUS_OPTIONS = [
  { value: 'pending', label: '待處理' },
  { value: 'paid', label: '已付款' },
  { value: 'shipped', label: '已出貨' },
  { value: 'cancelled', label: '已取消' },
]

/**
 * 這個元件和 AG Grid 完全沒有耦合 —— 它只認識 store。
 * 換掉 grid、換掉 API，這裡一行都不用改。
 */
export function OrderFilterBar() {
  const keyword = useOrderFilterStore((s) => s.filters.keyword)
  const orderNo = useOrderFilterStore(s => s.filters.orderNo)
  const status = useOrderFilterStore((s) => s.filters.status)
  const setFilter = useOrderFilterStore((s) => s.setFilter)
  const reset = useOrderFilterStore((s) => s.reset)

  const toggleStatus = (value: string) => {
    setFilter('status', status.includes(value)
      ? status.filter((s) => s !== value)
      : [...status, value])
  }

  return (
    <div className="filter-bar">
      <input
        value={orderNo}
        onChange={(e) => setFilter('orderNo', e.target.value)}
        placeholder="orderNo"
      />

      <input
        value={keyword}
        onChange={(e) => setFilter('keyword', e.target.value)}
        placeholder="搜尋訂單編號或客戶"
      />


      <div className="status-group" role="group" aria-label="訂單狀態">
        {STATUS_OPTIONS.map((opt) => (
          <label key={opt.value}>
            <input
              type="checkbox"
              checked={status.includes(opt.value)}
              onChange={() => toggleStatus(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>

      <button type="button" onClick={reset}>清除條件</button>
    </div>
  )
}
