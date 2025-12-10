import { createContext, useContext, useCallback, useMemo, useState, type ReactNode } from "react"
import {
  parseExpression,
  processTokens,
  renameReferences,
  TokenResolver,
  type CreateTokenResult,
  type DeleteTokenResult,
  type UpdateTokenResult,
} from "@tokens-studio/tokenscript-interpreter"

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

export type TokenCrudResult = {
  create?: CreateTokenResult
  update?: UpdateTokenResult
  delete?: DeleteTokenResult
}

// Token CRUD utilities --------------------------------------------------------

type TokenBackReference = {
  setName: string
  tokenPath: string
  tokenData: { $value: unknown; $type?: string }
}

/**
 * Collect back-references for tokens that reference a given token path.
 * Returns a map of token paths to their set locations.
 */
function collectTokenBackReferences(
  sets: Map<string, TokensMap>,
  activeSets: Set<string>,
  referencedTokens: Set<string>
): Map<string, TokenBackReference> {
  const backRefs = new Map<string, TokenBackReference>()

  for (const [setName, tokens] of sets) {
    if (!activeSets.has(setName)) continue

    for (const [tokenPath, tokenData] of tokens) {
      if (referencedTokens.has(tokenPath)) {
        backRefs.set(tokenPath, { setName, tokenPath, tokenData })
      }
    }
  }

  return backRefs
}

/**
 * Apply reference renames to a single token value using AST-based renaming.
 */
function applyReferenceRename(
  tokenValue: unknown,
  renameMap: Record<string, string>
): unknown {
  if (typeof tokenValue !== "string") return tokenValue

  try {
    const { ast } = parseExpression(tokenValue)
    if (!ast) return tokenValue

    return renameReferences(tokenValue, ast, renameMap)
  } catch {
    return tokenValue
  }
}

/**
 * Apply renamed references back to original sets using back-references.
 */
function applyRenamedReferencesToSets(
  sets: Map<string, TokensMap>,
  backRefs: Map<string, TokenBackReference>,
  renameMap: Record<string, string>
): Map<string, TokensMap> {
  const newSets = new Map(sets)

  for (const [tokenPath, backRef] of backRefs) {
    const setTokens = newSets.get(backRef.setName)
    if (!setTokens) continue

    const updatedValue = applyReferenceRename(backRef.tokenData.$value, renameMap)
    if (updatedValue === backRef.tokenData.$value) continue

    const updatedSet = new Map(setTokens)
    updatedSet.set(tokenPath, { ...backRef.tokenData, $value: updatedValue })
    newSets.set(backRef.setName, updatedSet)
  }

  return newSets
}

// Preview operations ----------------------------------------------------------

function createPreviewResolver(mergedTokens: TokensMap): TokenResolver | null {
  try {
    const previewMerged = new Map(mergedTokens)
    const { resolver } = new TokenResolver().build(previewMerged)
    return resolver
  } catch {
    return null
  }
}

function previewCreate(
  resolver: TokenResolver,
  tokenPath: string,
  tokenData: { $value: unknown; $type?: string }
): TokenCrudResult | null {
  try {
    const result = resolver.createToken({ tokenPath, tokenData })
    return { create: result }
  } catch {
    return null
  }
}

function previewUpdate(
  resolver: TokenResolver,
  tokenPath: string,
  options?: {
    tokenData?: { $value: unknown; $type?: string }
    newTokenPath?: string
    updateReferences?: boolean
  }
): TokenCrudResult | null {
  try {
    const result = resolver.updateToken({
      tokenPath,
      tokenData: options?.tokenData,
      tokenPathRenamed: options?.newTokenPath,
      updateReferences: options?.updateReferences,
    })
    return { update: result }
  } catch {
    return null
  }
}

function previewDelete(resolver: TokenResolver, tokenPath: string): TokenCrudResult | null {
  try {
    const result = resolver.deleteToken({ tokenPath })
    return { delete: result }
  } catch {
    return null
  }
}

export interface TokensContextValue {
  appState: AppState
  mergedTokens: TokensMap
  processorOutput: ReturnType<typeof processTokens>
  resolver: TokenResolver | null
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
    tokenValue: string,
    updateReferences?: boolean
  ) => void
  deleteToken: (setName: string, tokenName: string) => void
  previewTokenOperation: (
    operation: "create" | "update" | "delete",
    tokenPath: string,
    options?: {
      tokenData?: { $value: unknown; $type?: string }
      newTokenPath?: string
      updateReferences?: boolean
    }
  ) => TokenCrudResult | null
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
    tokenValue: string,
    shouldUpdateReferences = false
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

      const isRename = tokenName !== trimmedName

      // If renaming with reference updates, use resolver to find affected tokens
      if (isRename && shouldUpdateReferences) {
        const currentSetOrder = Array.from(prev.sets.keys())
        const currentMerged = mergeActiveSets(prev.sets, prev.activeSets, currentSetOrder)

        try {
          const { resolver } = new TokenResolver().build(currentMerged)
          const result = resolver.updateToken({
            tokenPath: tokenName,
            tokenData: { $value: tokenValue, $type: tokenType },
            tokenPathRenamed: trimmedName,
            updateReferences: true,
          })

          let newSets = new Map(prev.sets)

          // Apply renamed references using back-references
          if (result.renamedReferences && result.renamedReferences.size > 0) {
            const backRefs = collectTokenBackReferences(
              prev.sets,
              prev.activeSets,
              result.renamedReferences
            )
            const renameMap = { [tokenName]: trimmedName }
            newSets = applyRenamedReferencesToSets(newSets, backRefs, renameMap)
          }

          // Update the token itself in its set
          const targetSetData = newSets.get(setName)
          if (targetSetData) {
            const updatedSet = new Map(targetSetData)
            updatedSet.delete(tokenName)
            updatedSet.set(trimmedName, { $value: tokenValue, $type: tokenType })
            newSets.set(setName, updatedSet)
          }

          console.log("handleUpdateToken: updated token with references", {
            setName,
            tokenName,
            newTokenName: trimmedName,
            renamedReferences: Array.from(result.renamedReferences || []),
          })
          return { ...prev, sets: newSets }
        } catch (error) {
          console.error("handleUpdateToken: resolver error", error)
        }
      }

      // Standard update without reference tracking
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

  // Memoized resolver for preview operations
  const resolver = useMemo(() => {
    try {
      const { resolver } = new TokenResolver().build(mergedTokens)
      return resolver
    } catch (error) {
      console.error("Failed to build resolver", error)
      return null
    }
  }, [mergedTokens])

  const previewTokenOperation = useCallback(
    (
      operation: "create" | "update" | "delete",
      tokenPath: string,
      options?: {
        tokenData?: { $value: unknown; $type?: string }
        newTokenPath?: string
        updateReferences?: boolean
      }
    ): TokenCrudResult | null => {
      const previewResolver = createPreviewResolver(mergedTokens)
      if (!previewResolver) return null

      switch (operation) {
        case "create":
          return options?.tokenData
            ? previewCreate(previewResolver, tokenPath, options.tokenData)
            : null
        case "update":
          return previewUpdate(previewResolver, tokenPath, options)
        case "delete":
          return previewDelete(previewResolver, tokenPath)
        default:
          return null
      }
    },
    [mergedTokens]
  )

  const value: TokensContextValue = {
    appState,
    mergedTokens,
    processorOutput,
    resolver,
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
    previewTokenOperation,
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
