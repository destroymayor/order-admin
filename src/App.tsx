import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { FilterPresetCards } from './components/FilterPresetCards'
import { OrderFilterBar } from './components/OrderFilterBar'
import { OrderGridTabs } from './components/OrderGridTabs';

import './styles.css'

// AG Grid v33+ 必須註冊模組；SSRM 和 Set Filter 都是 Enterprise 功能
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="page">
        <h1>訂單管理</h1>
        <FilterPresetCards />
        <OrderFilterBar />
        <OrderGridTabs />
      </main>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
