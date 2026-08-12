import { ORDER_DATASETS } from '../api/orders'
import { useOrderFilterStore } from '../stores/orderFilterStore'
import { OrderGridSSRM } from './OrderGridSSRM'

/**
 * 用 tabs 切換多個 OrderGridSSRM 實例，每個 tab 背後接的是不同的假資料集（見 api/orders.ts 的 ORDER_DATASETS）。
 * 用 key={activeTab} 讓切 tab 時整個 grid 重新掛載，避免 SSRM 的 row cache 混到舊 tab 的資料。
 *
 * activeDataset 放在 useOrderFilterStore 而不是這裡的 local state，
 * 是因為 FilterPresetCards 點卡片時也要能切 tab，兩邊要共用同一個「目前是哪個 tab」的狀態。
 */
export function OrderGridTabs() {
  const activeTab = useOrderFilterStore((s) => s.activeDataset)
  const setActiveTab = useOrderFilterStore((s) => s.setActiveDataset)

  return (
    <div>
      <div className="order-grid-tabs" role="tablist" aria-label="訂單資料分頁">
        {ORDER_DATASETS.map((dataset) => (
          <button
            key={dataset.id}
            type="button"
            role="tab"
            aria-selected={activeTab === dataset.id}
            className={`order-grid-tab${activeTab === dataset.id ? ' order-grid-tab-active' : ''}`}
            onClick={() => setActiveTab(dataset.id)}
          >
            {dataset.label}
          </button>
        ))}
      </div>
      <OrderGridSSRM key={activeTab} datasetId={activeTab} />
    </div>
  )
}
