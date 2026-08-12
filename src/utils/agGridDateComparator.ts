import type { IDateComparatorFunc } from 'ag-grid-community'

/**
 * 給存成 'YYYY-MM-DD' 字串的欄位用的 date filter comparator。
 * AG Grid 內建的日期比較預期 cellValue 是 Date 物件，字串欄位要自己比對。
 */
export const dateOnlyComparator: IDateComparatorFunc = (filterLocalDateAtMidnight, cellValue) => {
  if (!cellValue) return -1
  const cellDate = new Date(`${cellValue}T00:00:00`)
  if (cellDate < filterLocalDateAtMidnight) return -1
  if (cellDate > filterLocalDateAtMidnight) return 1
  return 0
}
