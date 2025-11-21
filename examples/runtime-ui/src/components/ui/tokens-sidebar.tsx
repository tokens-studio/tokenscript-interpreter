import { ChevronDown, ChevronRight, Palette, Search } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAppState } from "@/state-context"
import { TOKEN_GROUPS, type TokenGroup } from "@/state"

interface CollapsibleGroupProps {
  label: TokenGroup
  tokens: string[]
  isOpen: boolean
  onToggle: () => void
  onTokenClick: (path: string) => void
  selectedToken: string | null
}

function CollapsibleGroup({
  label,
  tokens,
  isOpen,
  onToggle,
  onTokenClick,
  selectedToken,
}: CollapsibleGroupProps) {
  if (tokens.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="cursor-pointer select-none" onClick={onToggle}>
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

export function TokensSidebar() {
  const {
    appState,
    groupedTokens,
    openGroups,
    searchQuery,
    selectedToken,
    setSearchQuery,
    toggleGroup,
    toggleTheme,
    toggleSet,
    selectToken,
  } = useAppState()

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Design Tokens</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <SidebarInput
            placeholder="Search tokens..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Themes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {Array.from(appState.themes.entries()).map(([themeName, themeSets]) => (
                <SidebarMenuItem key={themeName}>
                  <SidebarMenuButton asChild isActive={appState.activeTheme === themeName}>
                    <label className="flex w-full cursor-pointer items-center gap-2">
                      <Checkbox
                        checked={appState.activeTheme === themeName}
                        onChange={() => toggleTheme(themeName)}
                      />
                      <div className="flex flex-col truncate">
                        <span className="truncate">{themeName}</span>
                        <span className="truncate text-xs text-muted-foreground">{themeSets.join(", ")}</span>
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
                  <SidebarMenuButton asChild isActive={appState.activeSets.has(setName)}>
                    <label className="flex w-full cursor-pointer items-center gap-2">
                      <Checkbox checked={appState.activeSets.has(setName)} onChange={() => toggleSet(setName)} />
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
            onTokenClick={selectToken}
            selectedToken={selectedToken}
          />
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
