import { useCallback, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, GetRowIdParams, SortChangedEvent } from 'ag-grid-community'
import { useOrderFilterStore } from '../stores/orderFilterStore'
import { useOrders } from '../hooks/useOrders'
import type { Order } from '../api/orders'
import { ORDER_STATUS_LABEL } from '../constants/orderStatus'
import { ORDER_PRIORITY_LABEL } from '../constants/orderPriority'

/**
 * Client-Side Row Model：適合單頁資料量在數千筆內。
 * Grid 只負責渲染，排序事件寫回 store，由 store 觸發重新查詢。
 */
export function OrderGrid() {
  const { rows, total, isLoading, isRefreshing, isError, error, refetch } = useOrders()
  const { page, pageSize, setPage, setSort } = useOrderFilterStore()

  // columnDefs 一定要 memo，否則每次 render 都是新陣列，grid 會整個重建
  const columnDefs = useMemo<ColDef<Order>[]>(() => [
    { field: 'orderNo', headerName: '訂單編號', minWidth: 150 },
    { field: 'customer', headerName: '客戶', flex: 1, minWidth: 140 },
    {
      field: 'status',
      headerName: '狀態',
      width: 120,
      valueFormatter: (p) => (p.value ? ORDER_STATUS_LABEL[p.value as Order['status']] : ''),
    },
    {
      field: 'priority',
      headerName: '優先級',
      width: 120,
      valueFormatter: (p) => (p.value ? ORDER_PRIORITY_LABEL[p.value as Order['priority']] : ''),
    },
    {
      field: 'amount',
      headerName: '金額',
      width: 140,
      type: 'numericColumn',
      valueFormatter: (p) => (p.value == null ? '' : `NT$ ${p.value.toLocaleString('zh-TW')}`),
    },
    { field: 'createdAt', headerName: '建立日期', width: 140 },
  ], [])

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    // 關掉欄位內建 filter：外部 filter 才是唯一真相，避免兩套狀態互相打架
    filter: false,
  }), [])

  // 設了 getRowId，重新取得資料時 AG Grid 會做差異更新，
  // 選取狀態、捲軸位置、展開的 row 都能保留，而不是整張表重畫
  const getRowId = useCallback((p: GetRowIdParams<Order>) => p.data.id, [])

  const onSortChanged = useCallback((e: SortChangedEvent) => {
    const next = e.api
      .getColumnState()
      .filter((c) => c.sort)
      .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
      .map((c) => ({ colId: c.colId, sort: c.sort as 'asc' | 'desc' }))
    setSort(next)
  }, [setSort])

  if (isError) {
    return (
      <div className="grid-error" role="alert">
        <p>訂單載入失敗：{(error as Error).message}</p>
        <button type="button" onClick={() => refetch()}>重試</button>
      </div>
    )
  }

  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1)

  return (
    <div className="grid-wrapper">
      <div className="grid-meta">
        <span>共 {total.toLocaleString('zh-TW')} 筆</span>
        {isRefreshing && <span className="grid-meta-hint">更新中…</span>}
      </div>

      <div style={{ height: 520 }}>
        <AgGridReact<Order>
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={getRowId}
          loading={isLoading}
          onSortChanged={onSortChanged}
          // 排序交給後端，關掉前端排序避免只排到當前這一頁
          sortingOrder={['asc', 'desc', null]}
          animateRows
        />
      </div>

      <div className="pager">
        <button type="button" disabled={page <= 0} onClick={() => setPage(page - 1)}>上一頁</button>
        <span>第 {page + 1} / {maxPage + 1} 頁</span>
        <button type="button" disabled={page >= maxPage} onClick={() => setPage(page + 1)}>下一頁</button>
      </div>
    </div>
  )
}
