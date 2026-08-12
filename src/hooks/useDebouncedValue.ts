import { useEffect, useState } from 'react'

/**
 * 只用來擋「打字」造成的高頻請求。
 * 下拉選單、日期這種一次性的操作不需要 debounce，會讓 UI 感覺遲鈍。
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
