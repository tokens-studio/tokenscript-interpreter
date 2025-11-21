import { useState } from "react"
import { ChevronDown, ChevronRight, Palette, Search, SlidersHorizontal } from "lucide-react"
import "./App.css"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarInput,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  INITIAL_STATE,
  TOKEN_GROUPS,
  getProcessorOutput,
  mergeActiveSets,
  toggleSet,
  toggleTheme,
  type AppState,
  type TokenGroup,
  type TokensMap,
} from "./state"

function groupTokensByType(tokens: TokensMap) {
  const groups = new Map<string, string[]>()
  for (const group of TOKEN_GROUPS) {
    groups.set(group, [])
  }
  for (const [path, data] of tokens) {
    const type = data.$type || "Unknown"
    const existing = groups.get(type)
    if (existing) {
      existing.push(path)
    }
  }
  return groups
}

function isColorValue(value: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(value) || /^rgb/.test(value) || /^hsl/.test(value)
}

interface UIState {
  appState: AppState
  openGroups: Set<TokenGroup>
  selectedToken: string | null
  searchQuery: string
}

interface CollapsibleGroupProps {
  label: TokenGroup
  tokens: string[]
  isOpen: boolean
  onToggle: () => void
  onTokenClick: (path: string) => void
  selectedToken: string | null
}

function CollapsibleGroup({ label, tokens, isOpen, onToggle, onTokenClick, selectedToken }: CollapsibleGroupProps) {
  if (tokens.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel
        className="cursor-pointer select-none"
        onClick={onToggle}
      >
        {isOpen ? <ChevronDown className="mr-1" /> : <ChevronRight className="mr-1" />}
        {label}
        <span className="ml-auto text-xs text-muted-foreground">{tokens.length}</span>
      </SidebarGroupLabel>
      {isOpen && (
        <SidebarGroupContent>
          <SidebarMenu>
            {tokens.map((path) => (
              <SidebarMenuItem key={path}>
                <SidebarMenuButton
                  onClick={() => onTokenClick(path)}
                  isActive={selectedToken === path}
                  size="sm"
                >
                  <span className="truncate">{path}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  )
}

function App() {
  const [state, setState] = useState<UIState>(() => ({
    appState: INITIAL_STATE,
    openGroups: new Set(TOKEN_GROUPS),
    selectedToken: null,
    searchQuery: "",
  }))

  const { appState, openGroups, selectedToken, searchQuery } = state

  const toggleGroup = (group: TokenGroup) => {
    setState((prev) => {
      const next = new Set(prev.openGroups)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return { ...prev, openGroups: next }
    })
  }

  const handleTokenSelect = (path: string) => {
    setState((prev) => ({ ...prev, selectedToken: path }))
  }

  const handleSearchChange = (value: string) => {
    setState((prev) => ({ ...prev, searchQuery: value }))
  }

  const handleThemeToggle = (themeName: string) => {
    setState((prev) => ({ ...prev, appState: toggleTheme(prev.appState, themeName) }))
  }

  const handleSetToggle = (setName: string) => {
    setState((prev) => ({ ...prev, appState: toggleSet(prev.appState, setName) }))
  }

  const setOrder = Array.from(appState.sets.keys())
  const mergedTokens = mergeActiveSets(appState.sets, appState.activeSets, setOrder)
  const processorOutput = getProcessorOutput(mergedTokens)
  const groupedTokens = groupTokensByType(mergedTokens)
  const outputEntries = Array.from(processorOutput.entries())

  const filteredOutput = searchQuery
    ? outputEntries.filter(([path]) => path.toLowerCase().includes(searchQuery.toLowerCase()))
    : outputEntries

  return (
    <SidebarProvider>
      <Sidebar className="border-r">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Themes</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from(appState.themes.entries()).map(([themeName, themeSets]) => (
                  <SidebarMenuItem key={themeName}>
                    <SidebarMenuButton
                      asChild
                      isActive={appState.activeTheme === themeName}
                    >
                      <label className="flex w-full cursor-pointer items-center gap-2">
                        <Checkbox
                          checked={appState.activeTheme === themeName}
                          onChange={() => handleThemeToggle(themeName)}
                        />
                        <div className="flex flex-col truncate">
                          <span className="truncate">{themeName}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {themeSets.join(", ")}
                          </span>
                        </div>
                      </label>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Sets</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from(appState.sets.entries()).map(([setName, tokens]) => (
                  <SidebarMenuItem key={setName}>
                    <SidebarMenuButton
                      asChild
                      isActive={appState.activeSets.has(setName)}
                    >
                      <label className="flex w-full cursor-pointer items-center gap-2">
                        <Checkbox
                          checked={appState.activeSets.has(setName)}
                          onChange={() => handleSetToggle(setName)}
                        />
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate">{setName}</span>
                          <span className="text-[11px] text-muted-foreground">({tokens.size})</span>
                        </div>
                      </label>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {TOKEN_GROUPS.map((group) => (
            <CollapsibleGroup
              key={group}
              label={group}
              tokens={groupedTokens.get(group) || []}
              isOpen={openGroups.has(group)}
              onToggle={() => toggleGroup(group)}
              onTokenClick={handleTokenSelect}
              selectedToken={selectedToken}
            />
          ))}
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <div className="flex flex-col h-full">
          <header className="flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Output</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filteredOutput.length} tokens
              </span>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="p-6">
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-left" style={{ width: "35%" }}>Name</TableHead>
                      <TableHead className="font-semibold text-left" style={{ width: "30%" }}>Type</TableHead>
                      <TableHead className="font-semibold text-left" style={{ width: "35%" }}>Resolved Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOutput.map(([path, value]) => {
                      const tokenData = mergedTokens.get(path)
                      const displayValue = typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)
                      const tokenType = tokenData?.$type || "Unknown"
                      const showColorSwatch = tokenType === "Color" && isColorValue(displayValue)

                      return (
                        <TableRow
                          key={path}
                          data-state={selectedToken === path ? "selected" : undefined}
                          className={`cursor-pointer transition-colors ${selectedToken === path ? "bg-primary/10" : "hover:bg-muted/50"}`}
                          onClick={() => handleTokenSelect(path)}
                        >
                          <TableCell className="font-mono text-sm text-left">{path}</TableCell>
                          <TableCell className="text-sm text-left">{tokenType}</TableCell>
                          <TableCell className="font-mono text-sm text-left">
                            <div className="flex items-center gap-2">
                              {showColorSwatch && (
                                <div
                                  className="h-4 w-4 rounded border shadow-sm flex-shrink-0"
                                  style={{ backgroundColor: displayValue }}
                                />
                              )}
                              <span>{displayValue}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
