import { createContext, useContext, useState, type ReactNode } from "react"
import { processTokens } from "@tokens-studio/tokenscript-interpreter"

import {
  INITIAL_STATE,
  TOKEN_GROUPS,
  findMatchingTheme,
  mergeActiveSets,
  toggleSet,
  toggleTheme,
  type AppState,
  type TokensMap,
} from "./index"

export interface TokensContextValue {
  appState: AppState
  mergedTokens: TokensMap
  processorOutput: ReturnType<typeof processTokens>
  setOrder: string[]
  toggleTheme: (themeName: string) => void
  toggleSet: (setName: string) => void
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

export function groupTokensByType(tokens: TokensMap) {
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

const TokensContext = createContext<TokensContextValue | null>(null)

export function TokensProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE)

  const handleThemeToggle = (themeName: string) => {
    setAppState((prev) => toggleTheme(prev, themeName))
  }

  const handleSetToggle = (setName: string) => {
    setAppState((prev) => toggleSet(prev, setName))
  }

  const handleAddTheme = (name: string, sets: string[]) => {
    setAppState((prev) => {
      const trimmedName = name.trim()
      if (!trimmedName || prev.themes.has(trimmedName)) {
        console.log("handleAddTheme: skip invalid or existing theme", { name })
        return prev
      }
      const themes = new Map(prev.themes)
      themes.set(trimmedName, sets)
      console.log("handleAddTheme: added theme", { name: trimmedName, sets })
      return { ...prev, themes }
    })
  }

  const handleAddSet = (name: string) => {
    setAppState((prev) => {
      const trimmedName = name.trim()
      if (!trimmedName || prev.sets.has(trimmedName)) {
        console.log("handleAddSet: skip invalid or existing set", { name })
        return prev
      }
      const sets = new Map(prev.sets)
      sets.set(trimmedName, new Map())
      console.log("handleAddSet: added set", { name: trimmedName })
      return { ...prev, sets }
    })
  }

  const handleAddToken = (
    setName: string,
    tokenName: string,
    tokenType: string,
    tokenValue: string
  ) => {
    setAppState((prev) => {
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
      const existingSet = prev.sets.get(trimmedSetName)
      if (!existingSet) {
        console.log("handleAddToken: set not found", { setName: trimmedSetName })
        return prev
      }
      const updatedSet = new Map(existingSet)
      updatedSet.set(trimmedTokenName, { $value: tokenValue, $type: tokenType })
      const sets = new Map(prev.sets)
      sets.set(trimmedSetName, updatedSet)
      console.log("handleAddToken: added token", {
        setName: trimmedSetName,
        tokenName: trimmedTokenName,
        tokenType,
        tokenValue,
      })
      return { ...prev, sets }
    })
  }

  const handleUpdateTheme = (themeName: string, newName: string, sets: string[]) => {
    setAppState((prev) => {
      const trimmedNewName = newName.trim()
      const existing = prev.themes.get(themeName)
      if (!existing || !trimmedNewName) {
        console.log("handleUpdateTheme: invalid theme update", { themeName, newName })
        return prev
      }
      if (themeName !== trimmedNewName && prev.themes.has(trimmedNewName)) {
        console.log("handleUpdateTheme: target name already exists", { themeName, newName })
        return prev
      }
      const themes = new Map(prev.themes)
      themes.delete(themeName)
      themes.set(trimmedNewName, sets)
      const activeTheme = prev.activeTheme === themeName ? trimmedNewName : prev.activeTheme
      const activeSets =
        prev.activeTheme === themeName ? new Set(sets) : new Set(prev.activeSets)
      console.log("handleUpdateTheme: updated theme", { themeName, newName: trimmedNewName, sets })
      return {
        ...prev,
        themes,
        activeTheme,
        activeSets,
      }
    })
  }

  const handleDeleteTheme = (themeName: string) => {
    setAppState((prev) => {
      if (!prev.themes.has(themeName)) {
        console.log("handleDeleteTheme: theme not found", { themeName })
        return prev
      }
      const themes = new Map(prev.themes)
      themes.delete(themeName)
      const isActive = prev.activeTheme === themeName
      console.log("handleDeleteTheme: deleted theme", { themeName })
      return {
        ...prev,
        themes,
        activeTheme: isActive ? null : prev.activeTheme,
        activeSets: isActive ? new Set<string>() : new Set(prev.activeSets),
      }
    })
  }

  const handleUpdateSet = (setName: string, newName: string) => {
    setAppState((prev) => {
      const trimmedNewName = newName.trim()
      const setData = prev.sets.get(setName)
      if (!setData || !trimmedNewName) {
        console.log("handleUpdateSet: invalid set update", { setName, newName })
        return prev
      }
      if (setName !== trimmedNewName && prev.sets.has(trimmedNewName)) {
        console.log("handleUpdateSet: target name exists", { setName, newName })
        return prev
      }
      const sets = new Map(prev.sets)
      sets.delete(setName)
      sets.set(trimmedNewName, setData)
      const themes = new Map(prev.themes)
      for (const [theme, themeSets] of themes) {
        themes.set(
          theme,
          themeSets.map((name) => (name === setName ? trimmedNewName : name))
        )
      }
      const activeSets = new Set(
        Array.from(prev.activeSets).map((name) => (name === setName ? trimmedNewName : name))
      )
      const activeTheme = findMatchingTheme(themes, activeSets)
      console.log("handleUpdateSet: updated set", { setName, newName: trimmedNewName })
      return {
        ...prev,
        sets,
        themes,
        activeSets,
        activeTheme,
      }
    })
  }

  const handleDeleteSet = (setName: string) => {
    setAppState((prev) => {
      if (!prev.sets.has(setName)) {
        console.log("handleDeleteSet: set not found", { setName })
        return prev
      }
      const sets = new Map(prev.sets)
      sets.delete(setName)
      const themes = new Map(prev.themes)
      for (const [theme, themeSets] of themes) {
        themes.set(
          theme,
          themeSets.filter((name) => name !== setName)
        )
      }
      const activeSets = new Set(
        Array.from(prev.activeSets).filter((name) => name !== setName)
      )
      const activeTheme = findMatchingTheme(themes, activeSets)
      console.log("handleDeleteSet: deleted set", { setName })
      return {
        ...prev,
        sets,
        themes,
        activeSets,
        activeTheme,
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
    setAppState((prev) => {
      const setData = prev.sets.get(setName)
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
      const sets = new Map(prev.sets)
      sets.set(setName, updatedSet)
      console.log("handleUpdateToken: updated token", {
        setName,
        tokenName,
        newTokenName: trimmedName,
        tokenType,
        tokenValue,
      })
      return { ...prev, sets }
    })
  }

  const handleDeleteToken = (setName: string, tokenName: string) => {
    setAppState((prev) => {
      const setData = prev.sets.get(setName)
      if (!setData || !setData.has(tokenName)) {
        console.log("handleDeleteToken: token not found", { setName, tokenName })
        return prev
      }
      const updatedSet = new Map(setData)
      updatedSet.delete(tokenName)
      const sets = new Map(prev.sets)
      sets.set(setName, updatedSet)
      console.log("handleDeleteToken: deleted token", { setName, tokenName })
      return { ...prev, sets }
    })
  }

  const setOrder = Array.from(appState.sets.keys())
  const mergedTokens = mergeActiveSets(appState.sets, appState.activeSets, setOrder)
  const processorOutput = processTokens<Map<string, unknown>>(mergedTokens)

  const value: TokensContextValue = {
    appState,
    mergedTokens,
    processorOutput,
    setOrder,
    toggleTheme: handleThemeToggle,
    toggleSet: handleSetToggle,
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

  return <TokensContext.Provider value={value}>{children}</TokensContext.Provider>
}

export function useTokensState() {
  const context = useContext(TokensContext)
  if (!context) {
    throw new Error("useTokensState must be used within TokensProvider")
  }
  return context
}
