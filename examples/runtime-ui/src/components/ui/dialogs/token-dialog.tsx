import { useEffect, useState } from "react"
import "@tokenscript/stencil-components/dist/components/token-form.js"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

  const dialogTitle = editingToken ? "Edit Token" : "Add Token"

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
        </DialogHeader>

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
            submitHandler={handleStencilSubmit}
            cancelHandler={handleStencilCancel}
            class="token-form-stencil"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
