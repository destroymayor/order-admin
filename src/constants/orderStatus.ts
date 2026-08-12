// 訂單狀態的唯一 source of truth：Order 型別、假 DB 產生、facet 選項、grid label 都從這裡衍生，
// 不要在別的檔案各自宣告一份，否則新增狀態時很容易漏改。
// 用 as const 陣列 + 衍生 union type，不用 TS 的 enum —— enum 會產生執行期物件、
// 且不同模組間的 nominal typing 常常造成不必要的麻煩，字串聯集在這種情境已經夠用。
export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'cancelled'] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: '待處理',
  paid: '已付款',
  shipped: '已出貨',
  cancelled: '已取消',
}
