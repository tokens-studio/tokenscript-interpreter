import "./App.css"

import { SidebarProvider } from "./components/ui/sidebar"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./components/ui/resizable"
import { TokensSidebar } from "./components/ui/tokens-sidebar"
import { TokensTable } from "./components/ui/tokens-table"
import { AppStateProvider } from "./state-context"
import { UIProvider, useUIContext } from "./ui-context"

function AppLayout() {
  const { sidebarOpen, setSidebarOpen, sidebarLayout, setSidebarLayout } = useUIContext()
  const sidebarWidth = sidebarOpen ? sidebarLayout[0] ?? 28 : 0
  const panelLayout = sidebarOpen ? sidebarLayout : [0, 100]

  return (
    <AppStateProvider>
      <SidebarProvider
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        style={{ "--sidebar-width": `${sidebarWidth}%` }}
      >
        <ResizablePanelGroup
          direction="horizontal"
          className="h-svh min-h-0 overflow-hidden"
          layout={panelLayout}
          onLayout={(nextLayout) => {
            if (!sidebarOpen) return
            setSidebarLayout(nextLayout)
          }}
        >
          <ResizablePanel
            defaultSize={sidebarWidth}
            minSize={sidebarOpen ? 16 : 0}
            collapsedSize={0}
            collapsible
          >
            <TokensSidebar />
          </ResizablePanel>
          <ResizableHandle withHandle className={sidebarOpen ? undefined : "opacity-0"} />
          <ResizablePanel defaultSize={panelLayout[1] ?? 72} minSize={32}>
            <TokensTable />
          </ResizablePanel>
        </ResizablePanelGroup>
      </SidebarProvider>
    </AppStateProvider>
  )
}

function App() {
  return (
    <UIProvider>
      <AppLayout />
    </UIProvider>
  )
}

export default App
