// 訂單優先級的唯一 source of truth，做法比照 orderStatus.ts：
// Order 型別、假 DB 產生、facet 選項、grid label 都從這裡衍生。
export const ORDER_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

export type OrderPriority = (typeof ORDER_PRIORITIES)[number]

export const ORDER_PRIORITY_LABEL: Record<OrderPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '緊急',
}
