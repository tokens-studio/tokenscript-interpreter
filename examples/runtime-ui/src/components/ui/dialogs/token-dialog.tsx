import { useEffect, useState, type FormEvent } from "react"
import { processTokens } from "@tokens-studio/tokenscript-interpreter"
import "@tokenscript/stencil-components"

import { Button } from "@/components/ui/button"
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
import { TOKEN_GROUPS } from "@/state"
import { useTokensState } from "@/state/tokens-context"

export interface TokenFormData {
  name: string
  value: string
}

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
  const { appState, setOrder, mergedTokens, addToken, updateToken, deleteToken } =
    useTokensState()
  const availableSetNames = Array.from(appState.sets.keys())
  const [tokenSetName, setTokenSetName] = useState("")
  const [tokenName, setTokenName] = useState("")
  const [tokenType, setTokenType] = useState<string>(TOKEN_GROUPS[0])
  const [tokenValue, setTokenValue] = useState("")
  const [useStencilForm, setUseStencilForm] = useState(false)

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
    } else {
      resetForm()
    }
  }, [appState.sets, editingToken, editingTokenSet, mergedTokens, open])

  const handleSubmit = (event: FormEvent) => {
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
    onOpenChange(false)
    onResetEditing()
    resetForm()
  }

  const handleStencilSubmit = (data: TokenFormData) => {
    if (editingToken && editingTokenSet) {
      if (editingTokenSet !== tokenSetName) {
        deleteToken(editingTokenSet, editingToken)
        addToken(tokenSetName, data.name, tokenType, data.value)
      } else {
        updateToken(tokenSetName, editingToken, data.name, tokenType, data.value)
      }
    } else {
      addToken(tokenSetName, data.name, tokenType, data.value)
    }
    onOpenChange(false)
    onResetEditing()
    resetForm()
  }

  const handleStencilCancel = () => {
    onOpenChange(false)
    resetForm()
    onResetEditing()
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

  const tokenSetSelect = (
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
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {editingToken ? "Update this token." : "Create a token in a selected set."}
          </DialogDescription>
          <div className="flex items-center gap-2 pt-2">
            <label className="text-sm">
              <input
                type="checkbox"
                checked={useStencilForm}
                onChange={(e) => setUseStencilForm(e.target.checked)}
                className="mr-2"
              />
              Use Stencil Component
            </label>
          </div>
        </DialogHeader>

        {useStencilForm ? (
          <div className="grid gap-4">
            {tokenSetSelect}
            {/* @ts-expect-error - Stencil web component not recognized by JSX types */}
            <token-form
              initialData={
                editingToken
                  ? {
                      name: tokenName,
                      value: tokenValue,
                    }
                  : undefined
              }
              allTokens={mergedTokens}
              tokenType={tokenType}
              onFormSubmit={handleStencilSubmit}
              onFormCancel={handleStencilCancel}
              class="token-form-stencil"
            />
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={handleSubmit}>
            {tokenSetSelect}
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
        )}
      </DialogContent>
    </Dialog>
  )
}
