import type { DateFilterModel, NumberFilterModel, SetFilterModel, TextFilterModel } from 'ag-grid-community'
import type { OrderFilters } from '../stores/orderFilterStore'

export type OrderFilterModel = {
  orderNo?: TextFilterModel
  customer?: TextFilterModel
  status?: SetFilterModel
  priority?: SetFilterModel
  amount?: NumberFilterModel
  createdAt?: DateFilterModel
}

/** AG Grid column filterModel → store 的 filters patch（column filter 改變時用） */
export function gridModelToFilters(model: OrderFilterModel): Partial<OrderFilters> {
  return {
    orderNo: model.orderNo?.filter ?? '',
    customer: model.customer?.filter ?? '',
    status: (model.status?.values ?? []).filter((v): v is string => v != null),
    priority: (model.priority?.values ?? []).filter((v): v is string => v != null),
    amountRange: model.amount ? [model.amount.filter ?? null, model.amount.filterTo ?? null] : null,
    dateRange: model.createdAt
      ? [String(model.createdAt.dateFrom).slice(0, 10), String(model.createdAt.dateTo).slice(0, 10)]
      : null,
  }
}

/** store 的 filters → AG Grid column filterModel（filter 從外部/reset 改變時，同步回 grid UI 用） */
export function filtersToGridModel(filters: OrderFilters): OrderFilterModel {
  const model: OrderFilterModel = {}
  if (filters.orderNo) {
    model.orderNo = { filterType: 'text', type: 'contains', filter: filters.orderNo }
  }
  if (filters.customer) {
    model.customer = { filterType: 'text', type: 'contains', filter: filters.customer }
  }
  if (filters.status.length > 0) {
    model.status = { filterType: 'set', values: filters.status }
  }
  if (filters.priority.length > 0) {
    model.priority = { filterType: 'set', values: filters.priority }
  }
  if (filters.amountRange && (filters.amountRange[0] != null || filters.amountRange[1] != null)) {
    model.amount = {
      filterType: 'number',
      type: 'inRange',
      filter: filters.amountRange[0],
      filterTo: filters.amountRange[1],
    }
  }
  if (filters.dateRange) {
    model.createdAt = {
      filterType: 'date',
      type: 'inRange',
      dateFrom: `${filters.dateRange[0]} 00:00:00`,
      dateTo: `${filters.dateRange[1]} 00:00:00`,
    }
  }
  return model
}
