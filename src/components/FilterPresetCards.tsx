import { type OrderDatasetId } from '../api/orders'
import { useOrderFilterStore, type OrderFilters } from '../stores/orderFilterStore'

type FilterPreset = {
  id: string
  label: string
  description: string
  // 這個 preset 屬於哪個 tab：點卡片時除了套 filter，也要切到對應的 OrderGridSSRM
  datasetId: OrderDatasetId
  filters: OrderFilters
}

const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// 套用 preset 時要完整覆蓋 filters，而不是用 Partial 疊加 ——
// 不然殘留的舊條件（例如手動輸入的 keyword、column filter）會和 preset 混在一起，
// 使用者看到的結果就不會是 preset 描述的那樣。
const PRESET_BASE: OrderFilters = {
  keyword: '',
  status: [],
  priority: [],
  dateRange: null,
  orderNo: '',
  customer: '',
  amountRange: null,
}

const preset = (overrides: Partial<OrderFilters>): OrderFilters => ({ ...PRESET_BASE, ...overrides })

const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'pending',
    label: '待處理訂單',
    description: '北區訂單・狀態：待處理',
    datasetId: 'A',
    filters: preset({ status: ['pending'] }),
  },
  {
    id: 'recent-week',
    label: '近 7 天新單',
    description: '中區訂單・建立日期：最近 7 天',
    datasetId: 'B',
    filters: preset({ dateRange: [daysAgo(6), today()] }),
  },
  {
    id: 'high-value',
    label: '高額訂單',
    description: '南區訂單・金額 NT$20,000 以上',
    datasetId: 'C',
    filters: preset({ amountRange: [20000, null] }),
  },
]

/**
 * 和 OrderFilterBar 一樣只認識 store：點卡片寫入 useOrderFilterStore，
 * 實際套用到 AG Grid（column filter UI + 重新拉資料）由 OrderGridSSRM 裡的 subscribe 處理。
 *
 * 每個 preset 都帶自己的 datasetId，點下去除了套 filter 也一併把 activeDataset 切過去，
 * 這樣使用者點卡片就能直接跳到卡片對應的 tab，不用自己再手動切換。
 */
export function FilterPresetCards() {
  const filters = useOrderFilterStore((s) => s.filters)
  const activeDataset = useOrderFilterStore((s) => s.activeDataset)
  const setFilters = useOrderFilterStore((s) => s.setFilters)
  const setActiveDataset = useOrderFilterStore((s) => s.setActiveDataset)

  return (
    <div className="preset-cards" role="group" aria-label="快速篩選">
      {FILTER_PRESETS.map((p) => {
        const active = activeDataset === p.datasetId && JSON.stringify(filters) === JSON.stringify(p.filters)
        return (
          <button
            key={p.id}
            type="button"
            className={`preset-card${active ? ' preset-card-active' : ''}`}
            aria-pressed={active}
            onClick={() => {
              setActiveDataset(p.datasetId)
              setFilters(p.filters)
            }}
          >
            <span className="preset-card-label">{p.label}</span>
            <span className="preset-card-desc">{p.description}</span>
          </button>
        )
      })}
    </div>
  )
}
