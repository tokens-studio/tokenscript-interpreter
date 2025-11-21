import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

import {
  INITIAL_STATE,
  TOKEN_GROUPS,
  mergeActiveSets,
  toggleSet,
  toggleTheme,
  type AppState,
  type TokenGroup,
  type TokensMap,
} from "./state"
import { processTokens } from "@tokens-studio/tokenscript-interpreter"


interface UIState {
  appState: AppState
  openGroups: Set<TokenGroup>
  selectedToken: string | null
  searchQuery: string
}

interface AppStateContextValue extends UIState {
  groupedTokens: Map<string, string[]>
  filteredOutput: [string, unknown][]
  mergedTokens: TokensMap
  processorOutput: Map<string, unknown>
  setOrder: string[]
  toggleGroup: (group: TokenGroup) => void
  toggleTheme: (themeName: string) => void
  toggleSet: (setName: string) => void
  selectToken: (path: string) => void
  setSearchQuery: (value: string) => void
  addTheme: (name: string, sets: string[]) => void
  addSet: (name: string) => void
  addToken: (setName: string, tokenName: string, tokenType: string, tokenValue: string) => void
}

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

const AppStateContext = createContext<AppStateContextValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UIState>(() => ({
    appState: INITIAL_STATE,
    openGroups: new Set(TOKEN_GROUPS),
    selectedToken: null,
    searchQuery: "",
  }))

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

  const selectToken = (path: string) => {
    setState((prev) => ({ ...prev, selectedToken: path }))
  }

  const setSearchQuery = (value: string) => {
    setState((prev) => ({ ...prev, searchQuery: value }))
  }

  const handleThemeToggle = (themeName: string) => {
    setState((prev) => ({ ...prev, appState: toggleTheme(prev.appState, themeName) }))
  }

  const handleSetToggle = (setName: string) => {
    setState((prev) => ({ ...prev, appState: toggleSet(prev.appState, setName) }))
  }

  const handleAddTheme = (name: string, sets: string[]) => {
    setState((prev) => {
      const trimmedName = name.trim()
      if (!trimmedName || prev.appState.themes.has(trimmedName)) {
        console.log("handleAddTheme: skip invalid or existing theme", { name })
        return prev
      }
      const themes = new Map(prev.appState.themes)
      themes.set(trimmedName, sets)
      console.log("handleAddTheme: added theme", { name: trimmedName, sets })
      return { ...prev, appState: { ...prev.appState, themes } }
    })
  }

  const handleAddSet = (name: string) => {
    setState((prev) => {
      const trimmedName = name.trim()
      if (!trimmedName || prev.appState.sets.has(trimmedName)) {
        console.log("handleAddSet: skip invalid or existing set", { name })
        return prev
      }
      const sets = new Map(prev.appState.sets)
      sets.set(trimmedName, new Map())
      console.log("handleAddSet: added set", { name: trimmedName })
      return { ...prev, appState: { ...prev.appState, sets } }
    })
  }

  const handleAddToken = (
    setName: string,
    tokenName: string,
    tokenType: string,
    tokenValue: string
  ) => {
    setState((prev) => {
      const trimmedSetName = setName.trim()
      const trimmedTokenName = tokenName.trim()
      if (!trimmedSetName || !trimmedTokenName) {
        console.log("handleAddToken: missing required fields", {
          setName,
          tokenName,
          tokenType,
          tokenValue,
        })
        return prev
      }
      const existingSet = prev.appState.sets.get(trimmedSetName)
      if (!existingSet) {
        console.log("handleAddToken: set not found", { setName: trimmedSetName })
        return prev
      }
      const updatedSet = new Map(existingSet)
      updatedSet.set(trimmedTokenName, { $value: tokenValue, $type: tokenType })
      const sets = new Map(prev.appState.sets)
      sets.set(trimmedSetName, updatedSet)
      console.log("handleAddToken: added token", {
        setName: trimmedSetName,
        tokenName: trimmedTokenName,
        tokenType,
        tokenValue,
      })
      return { ...prev, appState: { ...prev.appState, sets } }
    })
  }

  const setOrder = useMemo(() => Array.from(state.appState.sets.keys()), [state.appState.sets])

  const mergedTokens = useMemo(
    () => mergeActiveSets(state.appState.sets, state.appState.activeSets, setOrder),
    [state.appState.sets, state.appState.activeSets, setOrder]
  )

  const processorOutput = useMemo(
    () => processTokens<Map<string, unknown>>(mergedTokens),
    [mergedTokens]
  )
  const groupedTokens = useMemo(() => groupTokensByType(mergedTokens), [mergedTokens])
  const outputEntries = useMemo(() => Array.from(processorOutput.tokens.entries()), [processorOutput])

  const filteredOutput = useMemo(
    () =>
      state.searchQuery
        ? outputEntries.filter(([path]) =>
            path.toLowerCase().includes(state.searchQuery.toLowerCase())
          )
        : outputEntries,
    [outputEntries, state.searchQuery]
  )

  const value: AppStateContextValue = {
    ...state,
    groupedTokens,
    filteredOutput,
    mergedTokens,
    processorOutput,
    setOrder,
    toggleGroup,
    toggleTheme: handleThemeToggle,
    toggleSet: handleSetToggle,
    selectToken,
    setSearchQuery,
    addTheme: handleAddTheme,
    addSet: handleAddSet,
    addToken: handleAddToken,
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider")
  }
  return context
}
