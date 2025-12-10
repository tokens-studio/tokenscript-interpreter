import { useEffect, useMemo, useState, type FormEvent } from "react"
import { processTokens } from "@tokens-studio/tokenscript-interpreter"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ValidationError } from "@/lib/token-crud"
import { TOKEN_GROUPS } from "@/state"
import { useTokensState } from "@/state/tokens-context"

interface TokenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingToken: string | null
  editingTokenSet: string | null
  onResetEditing: () => void
}

function formatPreviewValue(value: unknown): string {
  if (value === null || value === undefined) return String(value)
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch (error) {
      console.log("formatPreviewValue: failed to stringify value", { value, error })
      return String(value)
    }
  }
  return String(value)
}

export function TokenDialog({
  open,
  onOpenChange,
  editingToken,
  editingTokenSet,
  onResetEditing,
}: TokenDialogProps) {
  const {
    appState,
    setOrder,
    mergedTokens,
    addToken,
    updateToken,
    deleteToken,
    getValidationErrors,
  } = useTokensState()
  const availableSetNames = Array.from(appState.sets.keys())
  const [tokenSetName, setTokenSetName] = useState("")
  const [tokenName, setTokenName] = useState("")
  const [tokenType, setTokenType] = useState<string>(TOKEN_GROUPS[0])
  const [tokenValue, setTokenValue] = useState("")
  const [updateReferences, setUpdateReferences] = useState(true)

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

  const resetForm = () => {
    const firstSet = availableSetNames[0] || ""
    setTokenSetName(firstSet)
    setTokenName("")
    setTokenType(TOKEN_GROUPS[0])
    setTokenValue("")
    setUpdateReferences(true)
  }

  useEffect(() => {
    if (!open) return
    if (editingToken) {
      const foundSet = editingTokenSet || findTokenSet(editingToken)
      const tokenData =
        appState.sets.get(foundSet)?.get(editingToken) || mergedTokens.get(editingToken)
      setTokenSetName(foundSet)
      setTokenName(editingToken)
      setTokenType(
        (tokenData &&
          typeof tokenData === "object" &&
          (tokenData as { $type?: string }).$type) ||
          TOKEN_GROUPS[0]
      )
      setTokenValue(
        (tokenData &&
          typeof tokenData === "object" &&
          (tokenData as { $value?: unknown }).$value?.toString()) ||
          ""
      )
      setUpdateReferences(true)
    } else {
      resetForm()
    }
  }, [appState.sets, editingToken, editingTokenSet, mergedTokens, open])

  const isRenaming = editingToken !== null && tokenName.trim() !== editingToken

  // Get validation errors from processor
  const validationErrors = useMemo((): ValidationError[] => {
    const trimmedName = tokenName.trim()

    if (!trimmedName) {
      return []
    }

    if (editingToken) {
      // Update mode - validate if renaming without updating references
      if (isRenaming && !updateReferences) {
        return getValidationErrors("update", editingToken, {
          tokenData: { $value: tokenValue || "", $type: tokenType },
          newTokenPath: trimmedName,
          updateReferences: false,
        })
      }
      return []
    }

    // Create mode - check for TOKEN_ALREADY_EXISTS (even without value)
    return getValidationErrors("create", trimmedName, {
      tokenData: { $value: tokenValue || "", $type: tokenType },
    })
  }, [
    tokenName,
    tokenValue,
    editingToken,
    isRenaming,
    updateReferences,
    tokenType,
    getValidationErrors,
  ])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (editingToken && editingTokenSet) {
      if (editingTokenSet !== tokenSetName) {
        deleteToken(editingTokenSet, editingToken)
        addToken(tokenSetName, tokenName, tokenType, tokenValue)
      } else {
        updateToken(
          tokenSetName,
          editingToken,
          tokenName,
          tokenType,
          tokenValue,
          isRenaming && updateReferences
        )
      }
    } else {
      addToken(tokenSetName, tokenName, tokenType, tokenValue)
    }
    onOpenChange(false)
    onResetEditing()
    resetForm()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
      onResetEditing()
    }
    onOpenChange(nextOpen)
  }

  const previewResolvedValue = (() => {
    const previewName = tokenName.trim() || ""
    const previewTokens = new Map(mergedTokens)
    if (editingToken && editingToken !== previewName) {
      previewTokens.delete(editingToken)
    }
    previewTokens.set(previewName, { $value: tokenValue, $type: tokenType })
    try {
      const previewOutput = processTokens<Map<string, unknown>>(previewTokens)
      return formatPreviewValue(previewOutput.tokens.get(previewName))
    } catch (error) {
      console.log("previewResolvedValue: failed to process token preview", {
        error,
        tokenName: previewName,
        tokenType,
        tokenValue,
      })
      return ""
    }
  })()

  const dialogTitle = editingToken ? "Edit Token" : "Add Token"
  const dialogCta = editingToken ? "Save Token" : "Add Token"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
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
            <p className="text-xs text-muted-foreground">
              Resolved value: {previewResolvedValue}
            </p>
          </div>

          {/* Rename checkbox - only show when editing and name changed */}
          {editingToken && isRenaming && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="update-references"
                checked={updateReferences}
                onChange={(event) => setUpdateReferences(event.target.checked)}
              />
              <Label htmlFor="update-references" className="text-sm font-normal cursor-pointer">
                Update references in other tokens
              </Label>
            </div>
          )}

          {/* Validation errors from processor */}
          {validationErrors.length > 0 && (
            <div className="space-y-2">
              {validationErrors.map((error, index) => (
                <div
                  key={index}
                  className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
                >
                  <p className="font-medium">{error.message}</p>
                  {error.affectedTokens.length > 0 && (
                    <ul className="mt-1 list-inside list-disc text-xs">
                      {error.affectedTokens.slice(0, 5).map((token) => (
                        <li key={token} className="font-mono">
                          {token}
                        </li>
                      ))}
                      {error.affectedTokens.length > 5 && (
                        <li>...and {error.affectedTokens.length - 5} more</li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!tokenSetName}>
              {dialogCta}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
