import "./App.css"

import { SidebarProvider } from "@/components/ui/sidebar"
import { TokensSidebar } from "@/components/ui/tokens-sidebar"
import { TokensTable } from "@/components/ui/tokens-table"
import { AppStateProvider } from "./state-context"

function App() {
  return (
    <AppStateProvider>
      <SidebarProvider>
        <TokensSidebar />
        <TokensTable />
      </SidebarProvider>
    </AppStateProvider>
  )
}

export default App
