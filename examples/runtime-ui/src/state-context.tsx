import { createContext, useContext, useState, type ReactNode } from "react"

import {
  INITIAL_STATE,
  TOKEN_GROUPS,
  mergeActiveSets,
  toggleSet,
  toggleTheme,
  findMatchingTheme,
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
  processorOutput: ReturnType<typeof processTokens>
  setOrder: string[]
  toggleGroup: (group: TokenGroup) => void
  toggleTheme: (themeName: string) => void
  toggleSet: (setName: string) => void
  selectToken: (path: string) => void
  setSearchQuery: (value: string) => void
  addTheme: (name: string, sets: string[]) => void
  addSet: (name: string) => void
  addToken: (setName: string, tokenName: string, tokenType: string, tokenValue: string) => void
  updateTheme: (themeName: string, newName: string, sets: string[]) => void
  deleteTheme: (themeName: string) => void
  updateSet: (setName: string, newName: string) => void
  deleteSet: (setName: string) => void
  updateToken: (
    setName: string,
    tokenName: string,
    newTokenName: string,
    tokenType: string,
    tokenValue: string
  ) => void
  deleteToken: (setName: string, tokenName: string) => void
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

  const handleUpdateTheme = (themeName: string, newName: string, sets: string[]) => {
    setState((prev) => {
      const trimmedNewName = newName.trim()
      const existing = prev.appState.themes.get(themeName)
      if (!existing || !trimmedNewName) {
        console.log("handleUpdateTheme: invalid theme update", { themeName, newName })
        return prev
      }
      if (themeName !== trimmedNewName && prev.appState.themes.has(trimmedNewName)) {
        console.log("handleUpdateTheme: target name already exists", { themeName, newName })
        return prev
      }
      const themes = new Map(prev.appState.themes)
      themes.delete(themeName)
      themes.set(trimmedNewName, sets)
      const activeTheme =
        prev.appState.activeTheme === themeName ? trimmedNewName : prev.appState.activeTheme
      const activeSets =
        prev.appState.activeTheme === themeName ? new Set(sets) : new Set(prev.appState.activeSets)
      console.log("handleUpdateTheme: updated theme", { themeName, newName: trimmedNewName, sets })
      return {
        ...prev,
        appState: {
          ...prev.appState,
          themes,
          activeTheme,
          activeSets,
        },
      }
    })
  }

  const handleDeleteTheme = (themeName: string) => {
    setState((prev) => {
      if (!prev.appState.themes.has(themeName)) {
        console.log("handleDeleteTheme: theme not found", { themeName })
        return prev
      }
      const themes = new Map(prev.appState.themes)
      themes.delete(themeName)
      const isActive = prev.appState.activeTheme === themeName
      console.log("handleDeleteTheme: deleted theme", { themeName })
      return {
        ...prev,
        appState: {
          ...prev.appState,
          themes,
          activeTheme: isActive ? null : prev.appState.activeTheme,
          activeSets: isActive ? new Set<string>() : new Set(prev.appState.activeSets),
        },
      }
    })
  }

  const handleUpdateSet = (setName: string, newName: string) => {
    setState((prev) => {
      const trimmedNewName = newName.trim()
      const setData = prev.appState.sets.get(setName)
      if (!setData || !trimmedNewName) {
        console.log("handleUpdateSet: invalid set update", { setName, newName })
        return prev
      }
      if (setName !== trimmedNewName && prev.appState.sets.has(trimmedNewName)) {
        console.log("handleUpdateSet: target name exists", { setName, newName })
        return prev
      }
      const sets = new Map(prev.appState.sets)
      sets.delete(setName)
      sets.set(trimmedNewName, setData)
      const themes = new Map(prev.appState.themes)
      for (const [theme, themeSets] of themes) {
        themes.set(
          theme,
          themeSets.map((name) => (name === setName ? trimmedNewName : name))
        )
      }
      const activeSets = new Set(
        Array.from(prev.appState.activeSets).map((name) =>
          name === setName ? trimmedNewName : name
        )
      )
      const activeTheme = findMatchingTheme(themes, activeSets)
      console.log("handleUpdateSet: updated set", { setName, newName: trimmedNewName })
      return {
        ...prev,
        appState: {
          ...prev.appState,
          sets,
          themes,
          activeSets,
          activeTheme,
        },
      }
    })
  }

  const handleDeleteSet = (setName: string) => {
    setState((prev) => {
      if (!prev.appState.sets.has(setName)) {
        console.log("handleDeleteSet: set not found", { setName })
        return prev
      }
      const sets = new Map(prev.appState.sets)
      sets.delete(setName)
      const themes = new Map(prev.appState.themes)
      for (const [theme, themeSets] of themes) {
        themes.set(
          theme,
          themeSets.filter((name) => name !== setName)
        )
      }
      const activeSets = new Set(
        Array.from(prev.appState.activeSets).filter((name) => name !== setName)
      )
      const activeTheme = findMatchingTheme(themes, activeSets)
      console.log("handleDeleteSet: deleted set", { setName })
      return {
        ...prev,
        appState: {
          ...prev.appState,
          sets,
          themes,
          activeSets,
          activeTheme,
        },
      }
    })
  }

  const handleUpdateToken = (
    setName: string,
    tokenName: string,
    newTokenName: string,
    tokenType: string,
    tokenValue: string
  ) => {
    setState((prev) => {
      const setData = prev.appState.sets.get(setName)
      if (!setData) {
        console.log("handleUpdateToken: set not found", { setName, tokenName })
        return prev
      }
      const trimmedName = newTokenName.trim()
      if (!trimmedName) {
        console.log("handleUpdateToken: missing token name", { setName, tokenName })
        return prev
      }
      const updatedSet = new Map(setData)
      updatedSet.delete(tokenName)
      updatedSet.set(trimmedName, { $value: tokenValue, $type: tokenType })
      const sets = new Map(prev.appState.sets)
      sets.set(setName, updatedSet)
      console.log("handleUpdateToken: updated token", {
        setName,
        tokenName,
        newTokenName: trimmedName,
        tokenType,
        tokenValue,
      })
      return { ...prev, appState: { ...prev.appState, sets } }
    })
  }

  const handleDeleteToken = (setName: string, tokenName: string) => {
    setState((prev) => {
      const setData = prev.appState.sets.get(setName)
      if (!setData || !setData.has(tokenName)) {
        console.log("handleDeleteToken: token not found", { setName, tokenName })
        return prev
      }
      const updatedSet = new Map(setData)
      updatedSet.delete(tokenName)
      const sets = new Map(prev.appState.sets)
      sets.set(setName, updatedSet)
      console.log("handleDeleteToken: deleted token", { setName, tokenName })
      return { ...prev, appState: { ...prev.appState, sets } }
    })
  }

  const setOrder = Array.from(state.appState.sets.keys())
  const mergedTokens = mergeActiveSets(state.appState.sets, state.appState.activeSets, setOrder)
  const processorOutput = processTokens<Map<string, unknown>>(mergedTokens)
  const groupedTokens = groupTokensByType(mergedTokens)
  const outputEntries = Array.from(processorOutput.tokens.entries())
  const filteredOutput = state.searchQuery
    ? outputEntries.filter(([path]) =>
        path.toLowerCase().includes(state.searchQuery.toLowerCase())
      )
    : outputEntries

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
    updateTheme: handleUpdateTheme,
    deleteTheme: handleDeleteTheme,
    updateSet: handleUpdateSet,
    deleteSet: handleDeleteSet,
    updateToken: handleUpdateToken,
    deleteToken: handleDeleteToken,
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
