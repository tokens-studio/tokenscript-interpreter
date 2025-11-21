import { useEffect, useMemo, useState, type FormEvent } from "react"
import { ChevronDown, ChevronRight, Palette, Plus } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
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
    selectedToken,
    toggleGroup,
    toggleTheme,
    toggleSet,
    selectToken,
    addTheme,
    addSet,
    addToken,
  } = useAppState()
  const [themeDialogOpen, setThemeDialogOpen] = useState(false)
  const [newThemeName, setNewThemeName] = useState("")
  const [newThemeSets, setNewThemeSets] = useState<Set<string>>(new Set())
  const [setDialogOpen, setSetDialogOpen] = useState(false)
  const [newSetName, setNewSetName] = useState("")
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)
  const [tokenSetName, setTokenSetName] = useState("")
  const [tokenName, setTokenName] = useState("")
  const [tokenType, setTokenType] = useState<string>(TOKEN_GROUPS[0])
  const [tokenValue, setTokenValue] = useState("")

  const availableSetNames = useMemo(() => Array.from(appState.sets.keys()), [appState.sets])

  useEffect(() => {
    const firstSet = availableSetNames[0] || ""
    setTokenSetName((current) =>
      current && appState.sets.has(current) ? current : firstSet
    )
  }, [appState.sets, availableSetNames])

  const resetThemeForm = () => {
    setNewThemeName("")
    setNewThemeSets(new Set())
  }

  const resetSetForm = () => {
    setNewSetName("")
  }

  const resetTokenForm = () => {
    const firstSet = availableSetNames[0] || ""
    setTokenSetName(firstSet)
    setTokenName("")
    setTokenType(TOKEN_GROUPS[0])
    setTokenValue("")
  }

  const handleThemeSubmit = (event: FormEvent) => {
    event.preventDefault()
    addTheme(newThemeName, Array.from(newThemeSets))
    setThemeDialogOpen(false)
    resetThemeForm()
  }

  const handleSetSubmit = (event: FormEvent) => {
    event.preventDefault()
    addSet(newSetName)
    setSetDialogOpen(false)
    resetSetForm()
  }

  const handleTokenSubmit = (event: FormEvent) => {
    event.preventDefault()
    addToken(tokenSetName, tokenName, tokenType, tokenValue)
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
            <Dialog open={themeDialogOpen} onOpenChange={setThemeDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon-sm" variant="ghost" aria-label="Add theme">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form className="grid gap-4" onSubmit={handleThemeSubmit}>
                  <DialogHeader>
                    <DialogTitle>Add Theme</DialogTitle>
                    <DialogDescription>
                      Create a theme by selecting which sets belong to it.
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
                    <Button type="submit">Add Theme</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </SidebarGroupLabel>
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
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>Sets</span>
            <Dialog open={setDialogOpen} onOpenChange={setSetDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon-sm" variant="ghost" aria-label="Add set">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form className="grid gap-4" onSubmit={handleSetSubmit}>
                  <DialogHeader>
                    <DialogTitle>Add Set</DialogTitle>
                    <DialogDescription>Create a new token set.</DialogDescription>
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
                    <Button type="submit">Add Set</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </SidebarGroupLabel>
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

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>Tokens</span>
            <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon-sm" variant="ghost" aria-label="Add token">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form className="grid gap-4" onSubmit={handleTokenSubmit}>
                  <DialogHeader>
                    <DialogTitle>Add Token</DialogTitle>
                    <DialogDescription>Create a token in a selected set.</DialogDescription>
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
                      Add Token
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
              />
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
