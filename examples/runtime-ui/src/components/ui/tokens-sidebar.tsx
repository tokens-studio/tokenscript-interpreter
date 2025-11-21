import { useState } from "react"
import { ChevronDown, ChevronRight, Palette, Plus } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
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
} from "@/components/ui/sidebar"
import { useAppState } from "@/state-context"
import { TOKEN_GROUPS, type TokenGroup } from "@/state"
import { ThemeDialog } from "@/components/ui/dialogs/theme-dialog"
import { SetDialog } from "@/components/ui/dialogs/set-dialog"
import { TokenDialog } from "@/components/ui/dialogs/token-dialog"

interface CollapsibleGroupProps {
  label: TokenGroup
  tokens: string[]
  isOpen: boolean
  onToggle: () => void
  onTokenClick: (path: string) => void
  selectedToken: string | null
  onEditToken: (path: string) => void
  onDeleteToken: (path: string) => void
}

function CollapsibleGroup({
  label,
  tokens,
  isOpen,
  onToggle,
  onTokenClick,
  selectedToken,
  onEditToken,
  onDeleteToken,
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
              <ContextMenu key={path}>
                <ContextMenuTrigger asChild>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => onTokenClick(path)}
                      isActive={selectedToken === path}
                      size="sm"
                    >
                      <span className="truncate">{path}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-40">
                  <ContextMenuItem inset onSelect={() => onEditToken(path)}>
                    Edit
                  </ContextMenuItem>
                  <ContextMenuItem
                    inset
                    variant="destructive"
                    onSelect={() => onDeleteToken(path)}
                  >
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
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
    selectedToken,
    toggleGroup,
    toggleTheme,
    toggleSet,
    selectToken,
    deleteTheme,
    deleteSet,
    deleteToken,
    setOrder,
  } = useAppState()
  const [themeDialogOpen, setThemeDialogOpen] = useState(false)
  const [editingTheme, setEditingTheme] = useState<string | null>(null)
  const [setDialogOpen, setSetDialogOpen] = useState(false)
  const [editingSet, setEditingSet] = useState<string | null>(null)
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)
  const [editingToken, setEditingToken] = useState<string | null>(null)
  const [editingTokenSet, setEditingTokenSet] = useState<string | null>(null)

  const findTokenSet = (tokenPath: string): string => {
    for (const setName of setOrder) {
      const setTokens = appState.sets.get(setName)
      if (setTokens?.has(tokenPath)) {
        return setName
      }
    }
    const fallback = setOrder[0] || ""
    console.log("findTokenSet: using fallback set", { tokenPath, fallback })
    return fallback
  }

  const startAddTheme = () => {
    setEditingTheme(null)
    setThemeDialogOpen(true)
  }

  const startEditTheme = (themeName: string) => {
    setEditingTheme(themeName)
    setThemeDialogOpen(true)
  }

  const startAddSet = () => {
    setEditingSet(null)
    setSetDialogOpen(true)
  }

  const startEditSet = (setName: string) => {
    setEditingSet(setName)
    setSetDialogOpen(true)
  }

  const startAddToken = () => {
    setEditingToken(null)
    setEditingTokenSet(null)
    setTokenDialogOpen(true)
  }

  const startEditToken = (tokenPath: string) => {
    const tokenSet = findTokenSet(tokenPath)
    setEditingToken(tokenPath)
    setEditingTokenSet(tokenSet)
    setTokenDialogOpen(true)
  }

  const handleDeleteTokenByPath = (tokenPath: string) => {
    const tokenSet = findTokenSet(tokenPath)
    deleteToken(tokenSet, tokenPath)
  }

  const resetThemeEditing = () => setEditingTheme(null)
  const resetSetEditing = () => setEditingSet(null)
  const resetTokenEditing = () => {
    setEditingToken(null)
    setEditingTokenSet(null)
  }

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Design Tokens</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>Themes</span>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Add theme"
              onClick={startAddTheme}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {Array.from(appState.themes.entries()).map(([themeName, themeSets]) => (
                <ContextMenu key={themeName}>
                  <ContextMenuTrigger asChild>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={appState.activeTheme === themeName}>
                        <label className="flex w-full cursor-pointer items-center gap-2">
                          <Checkbox
                            checked={appState.activeTheme === themeName}
                            onChange={() => toggleTheme(themeName)}
                          />
                          <div className="flex flex-col truncate">
                            <span className="truncate">{themeName}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              {themeSets.join(", ")}
                            </span>
                          </div>
                        </label>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-40">
                    <ContextMenuItem inset onSelect={() => startEditTheme(themeName)}>
                      Edit
                    </ContextMenuItem>
                    <ContextMenuItem
                      inset
                      variant="destructive"
                      onSelect={() => deleteTheme(themeName)}
                    >
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>Sets</span>
            <Button size="icon-sm" variant="ghost" aria-label="Add set" onClick={startAddSet}>
              <Plus className="h-4 w-4" />
            </Button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {Array.from(appState.sets.entries()).map(([setName, tokens]) => (
                <ContextMenu key={setName}>
                  <ContextMenuTrigger asChild>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={appState.activeSets.has(setName)}>
                        <label className="flex w-full cursor-pointer items-center gap-2">
                          <Checkbox
                            checked={appState.activeSets.has(setName)}
                            onChange={() => toggleSet(setName)}
                          />
                          <div className="flex items-center gap-2 truncate">
                            <span className="truncate">{setName}</span>
                            <span className="text-[11px] text-muted-foreground">({tokens.size})</span>
                          </div>
                        </label>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-40">
                    <ContextMenuItem inset onSelect={() => startEditSet(setName)}>
                      Edit
                    </ContextMenuItem>
                    <ContextMenuItem
                      inset
                      variant="destructive"
                      onSelect={() => deleteSet(setName)}
                    >
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>Tokens</span>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Add token"
              onClick={startAddToken}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {TOKEN_GROUPS.map((group) => (
              <CollapsibleGroup
                key={group}
                label={group}
                tokens={groupedTokens.get(group) || []}
                isOpen={openGroups.has(group)}
                onToggle={() => toggleGroup(group)}
                onTokenClick={selectToken}
                selectedToken={selectedToken}
                onEditToken={startEditToken}
                onDeleteToken={handleDeleteTokenByPath}
              />
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {themeDialogOpen ? (
        <ThemeDialog
          open={themeDialogOpen}
          onOpenChange={setThemeDialogOpen}
          editingTheme={editingTheme}
          onResetEditing={resetThemeEditing}
        />
      ) : null}
      {setDialogOpen ? (
        <SetDialog
          open={setDialogOpen}
          onOpenChange={setSetDialogOpen}
          editingSet={editingSet}
          onResetEditing={resetSetEditing}
        />
      ) : null}
      {tokenDialogOpen ? (
        <TokenDialog
          open={tokenDialogOpen}
          onOpenChange={setTokenDialogOpen}
          editingToken={editingToken}
          editingTokenSet={editingTokenSet}
          onResetEditing={resetTokenEditing}
        />
      ) : null}
    </Sidebar>
  )
}
