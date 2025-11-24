import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

import { TOKEN_GROUPS, type TokenGroup } from "./index"

const UI_STATE_KEY = "ui-state"
const DEFAULT_SIDEBAR_LAYOUT = [28, 72]
const DEFAULT_SECTION_LAYOUT = [32, 28, 40]

interface UIContextValue {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  sidebarLayout: number[]
  setSidebarLayout: (layout: number[]) => void
  sidebarSectionsLayout: number[]
  setSidebarSectionsLayout: (layout: number[]) => void
  openGroups: Set<TokenGroup>
  toggleGroup: (group: TokenGroup) => void
  selectedToken: string | null
  selectToken: (path: string) => void
  searchQuery: string
  setSearchQuery: (value: string) => void
}

function isNumberArray(value: unknown, length: number) {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  )
}

function loadStoredState() {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(UI_STATE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<UIContextValue>
    const sidebarOpen =
      typeof parsed.sidebarOpen === "boolean" ? parsed.sidebarOpen : undefined
    const sidebarLayout = isNumberArray(parsed.sidebarLayout, 2)
      ? parsed.sidebarLayout
      : undefined
    const sidebarSectionsLayout = isNumberArray(parsed.sidebarSectionsLayout, 3)
      ? parsed.sidebarSectionsLayout
      : undefined
    return { sidebarOpen, sidebarLayout, sidebarSectionsLayout }
  } catch (error) {
    console.log("UIContext: failed to parse stored UI state", { error })
    return null
  }
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarLayout, setSidebarLayout] = useState(DEFAULT_SIDEBAR_LAYOUT)
  const [sidebarSectionsLayout, setSidebarSectionsLayout] = useState(DEFAULT_SECTION_LAYOUT)
  const [openGroups, setOpenGroups] = useState<Set<TokenGroup>>(new Set(TOKEN_GROUPS))
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const stored = loadStoredState()
    if (!stored) return
    if (stored.sidebarOpen !== undefined) {
      setSidebarOpen(stored.sidebarOpen)
    }
    if (stored.sidebarLayout) {
      setSidebarLayout(stored.sidebarLayout)
    }
    if (stored.sidebarSectionsLayout) {
      setSidebarSectionsLayout(stored.sidebarSectionsLayout)
    }
    console.log("UIContext: restored UI state from storage", {
      sidebarOpen: stored.sidebarOpen,
      sidebarLayout: stored.sidebarLayout,
      sidebarSectionsLayout: stored.sidebarSectionsLayout,
    })
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        UI_STATE_KEY,
        JSON.stringify({ sidebarOpen, sidebarLayout, sidebarSectionsLayout })
      )
    } catch (error) {
      console.log("UIContext: failed to persist UI state", { error })
    }
  }, [sidebarOpen, sidebarLayout, sidebarSectionsLayout])

  const updateSidebarOpen = (open: boolean) => {
    setSidebarOpen(open)
    console.log("UIContext: sidebar open change", { open })
  }

  const updateSidebarLayout = (layout: number[]) => {
    setSidebarLayout(layout)
    console.log("UIContext: sidebar layout updated", { layout })
  }

  const updateSidebarSectionsLayout = (layout: number[]) => {
    setSidebarSectionsLayout(layout)
    console.log("UIContext: sidebar sections layout updated", { layout })
  }

  const toggleGroup = (group: TokenGroup) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      console.log("UIContext: toggled token group", { group, openGroups: Array.from(next) })
      return next
    })
  }

  const selectToken = (path: string) => {
    setSelectedToken(path)
    console.log("UIContext: selected token", { path })
  }

  const value: UIContextValue = {
    sidebarOpen,
    setSidebarOpen: updateSidebarOpen,
    sidebarLayout,
    setSidebarLayout: updateSidebarLayout,
    sidebarSectionsLayout,
    setSidebarSectionsLayout: updateSidebarSectionsLayout,
    openGroups,
    toggleGroup,
    selectedToken,
    selectToken,
    searchQuery,
    setSearchQuery,
  }

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUIContext() {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error("useUIContext must be used within UIProvider")
  }
  return context
}
