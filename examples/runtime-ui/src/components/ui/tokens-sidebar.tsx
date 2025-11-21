import { useEffect, useMemo, useState, type FormEvent } from "react"
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    addTheme,
    addSet,
    addToken,
    updateTheme,
    deleteTheme,
    updateSet,
    deleteSet,
    updateToken,
    deleteToken,
    mergedTokens,
    setOrder,
  } = useAppState()
  const [themeDialogOpen, setThemeDialogOpen] = useState(false)
  const [newThemeName, setNewThemeName] = useState("")
  const [newThemeSets, setNewThemeSets] = useState<Set<string>>(new Set())
  const [editingTheme, setEditingTheme] = useState<string | null>(null)
  const [setDialogOpen, setSetDialogOpen] = useState(false)
  const [newSetName, setNewSetName] = useState("")
  const [editingSet, setEditingSet] = useState<string | null>(null)
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)
  const [tokenSetName, setTokenSetName] = useState("")
  const [tokenName, setTokenName] = useState("")
  const [tokenType, setTokenType] = useState<string>(TOKEN_GROUPS[0])
  const [tokenValue, setTokenValue] = useState("")
  const [editingToken, setEditingToken] = useState<string | null>(null)
  const [editingTokenSet, setEditingTokenSet] = useState<string | null>(null)

  const availableSetNames = useMemo(() => Array.from(appState.sets.keys()), [appState.sets])

  useEffect(() => {
    const firstSet = availableSetNames[0] || ""
    setTokenSetName((current) =>
      current && appState.sets.has(current) ? current : firstSet
    )
  }, [appState.sets, availableSetNames])

  const findTokenSet = (tokenPath: string): string => {
    for (const setName of setOrder) {
      const setTokens = appState.sets.get(setName)
      if (setTokens?.has(tokenPath)) {
        return setName
      }
    }
    const fallback = availableSetNames[0] || ""
    console.log("findTokenSet: using fallback set", { tokenPath, fallback })
    return fallback
  }

  const resetThemeForm = () => {
    setNewThemeName("")
    setNewThemeSets(new Set())
    setEditingTheme(null)
  }

  const resetSetForm = () => {
    setNewSetName("")
    setEditingSet(null)
  }

  const resetTokenForm = () => {
    const firstSet = availableSetNames[0] || ""
    setTokenSetName(firstSet)
    setTokenName("")
    setTokenType(TOKEN_GROUPS[0])
    setTokenValue("")
    setEditingToken(null)
    setEditingTokenSet(null)
  }

  const handleThemeSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (editingTheme) {
      updateTheme(editingTheme, newThemeName, Array.from(newThemeSets))
    } else {
      addTheme(newThemeName, Array.from(newThemeSets))
    }
    setThemeDialogOpen(false)
    resetThemeForm()
  }

  const handleSetSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (editingSet) {
      updateSet(editingSet, newSetName)
    } else {
      addSet(newSetName)
    }
    setSetDialogOpen(false)
    resetSetForm()
  }

  const handleTokenSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (editingToken && editingTokenSet) {
      if (editingTokenSet !== tokenSetName) {
        deleteToken(editingTokenSet, editingToken)
        addToken(tokenSetName, tokenName, tokenType, tokenValue)
      } else {
        updateToken(tokenSetName, editingToken, tokenName, tokenType, tokenValue)
      }
    } else {
      addToken(tokenSetName, tokenName, tokenType, tokenValue)
    }
    setTokenDialogOpen(false)
    resetTokenForm()
  }

  const toggleThemeSetSelection = (setName: string) => {
    setNewThemeSets((prev) => {
      const next = new Set(prev)
      if (next.has(setName)) {
        next.delete(setName)
      } else {
        next.add(setName)
      }
      return next
    })
  }

  const startAddTheme = () => {
    resetThemeForm()
    setThemeDialogOpen(true)
  }

  const startEditTheme = (themeName: string) => {
    const themeSets = appState.themes.get(themeName) || []
    setEditingTheme(themeName)
    setNewThemeName(themeName)
    setNewThemeSets(new Set(themeSets))
    setThemeDialogOpen(true)
  }

  const startAddSet = () => {
    resetSetForm()
    setSetDialogOpen(true)
  }

  const startEditSet = (setName: string) => {
    setEditingSet(setName)
    setNewSetName(setName)
    setSetDialogOpen(true)
  }

  const startAddToken = () => {
    resetTokenForm()
    setTokenDialogOpen(true)
  }

  const startEditToken = (tokenPath: string) => {
    const tokenSet = findTokenSet(tokenPath)
    const tokenData =
      appState.sets.get(tokenSet)?.get(tokenPath) || mergedTokens.get(tokenPath)
    setEditingToken(tokenPath)
    setEditingTokenSet(tokenSet)
    setTokenSetName(tokenSet)
    setTokenName(tokenPath)
    setTokenType(
      (tokenData && typeof tokenData === "object" && (tokenData as { $type?: string }).$type) ||
        TOKEN_GROUPS[0]
    )
    setTokenValue(
      (tokenData &&
        typeof tokenData === "object" &&
        (tokenData as { $value?: unknown }).$value?.toString()) ||
        ""
    )
    setTokenDialogOpen(true)
  }

  const handleDeleteTokenByPath = (tokenPath: string) => {
    const tokenSet = findTokenSet(tokenPath)
    deleteToken(tokenSet, tokenPath)
  }

  const themeDialogTitle = editingTheme ? "Edit Theme" : "Add Theme"
  const themeDialogCta = editingTheme ? "Save Theme" : "Add Theme"
  const setDialogTitle = editingSet ? "Edit Set" : "Add Set"
  const setDialogCta = editingSet ? "Save Set" : "Add Set"
  const tokenDialogTitle = editingToken ? "Edit Token" : "Add Token"
  const tokenDialogCta = editingToken ? "Save Token" : "Add Token"

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
            <Dialog
              open={themeDialogOpen}
              onOpenChange={(open) => {
                setThemeDialogOpen(open)
                if (!open) resetThemeForm()
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Add theme"
                  onClick={startAddTheme}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form className="grid gap-4" onSubmit={handleThemeSubmit}>
                  <DialogHeader>
                    <DialogTitle>{themeDialogTitle}</DialogTitle>
                    <DialogDescription>
                      {editingTheme
                        ? "Update this theme and its sets."
                        : "Create a theme by selecting which sets belong to it."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <Label htmlFor="theme-name">Name</Label>
                    <Input
                      id="theme-name"
                      value={newThemeName}
                      onChange={(event) => setNewThemeName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Sets</Label>
                    <div className="grid gap-2 rounded-md border p-2">
                      {availableSetNames.map((setName) => (
                        <label key={setName} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={newThemeSets.has(setName)}
                            onChange={() => toggleThemeSetSelection(setName)}
                          />
                          <span className="truncate">{setName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline" onClick={resetThemeForm}>
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit">{themeDialogCta}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
                            <span className="truncate text-xs text-muted-foreground">{themeSets.join(", ")}</span>
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
            <Dialog
              open={setDialogOpen}
              onOpenChange={(open) => {
                setSetDialogOpen(open)
                if (!open) resetSetForm()
              }}
            >
              <DialogTrigger asChild>
                <Button size="icon-sm" variant="ghost" aria-label="Add set" onClick={startAddSet}>
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form className="grid gap-4" onSubmit={handleSetSubmit}>
                  <DialogHeader>
                    <DialogTitle>{setDialogTitle}</DialogTitle>
                    <DialogDescription>
                      {editingSet ? "Update this token set." : "Create a new token set."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <Label htmlFor="set-name">Name</Label>
                    <Input
                      id="set-name"
                      value={newSetName}
                      onChange={(event) => setNewSetName(event.target.value)}
                      required
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline" onClick={resetSetForm}>
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit">{setDialogCta}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
            <Dialog
              open={tokenDialogOpen}
              onOpenChange={(open) => {
                setTokenDialogOpen(open)
                if (!open) resetTokenForm()
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Add token"
                  onClick={startAddToken}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form className="grid gap-4" onSubmit={handleTokenSubmit}>
                  <DialogHeader>
                    <DialogTitle>{tokenDialogTitle}</DialogTitle>
                    <DialogDescription>
                      {editingToken ? "Update this token." : "Create a token in a selected set."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <Label htmlFor="token-set">Set</Label>
                    <select
                      id="token-set"
                      className="border-input dark:bg-input/30 flex h-9 w-full items-center rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                      value={tokenSetName}
                      onChange={(event) => setTokenSetName(event.target.value)}
                      required
                    >
                      {availableSetNames.map((setName) => (
                        <option key={setName} value={setName}>
                          {setName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="token-name">Name</Label>
                    <Input
                      id="token-name"
                      value={tokenName}
                      onChange={(event) => setTokenName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="token-type">Type</Label>
                    <select
                      id="token-type"
                      className="border-input dark:bg-input/30 flex h-9 w-full items-center rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                      value={tokenType}
                      onChange={(event) => setTokenType(event.target.value)}
                      required
                    >
                      {TOKEN_GROUPS.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="token-value">Value</Label>
                    <Input
                      id="token-value"
                      value={tokenValue}
                      onChange={(event) => setTokenValue(event.target.value)}
                      required
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline" onClick={resetTokenForm}>
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={!tokenSetName}>
                      {tokenDialogCta}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
    </Sidebar>
  )
}
