import { useMemo } from "react"

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
import { useTokensState } from "@/state/tokens-context"

interface DeleteTokenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tokenPath: string | null
  onConfirm: () => void
}

export function DeleteTokenDialog({
  open,
  onOpenChange,
  tokenPath,
  onConfirm,
}: DeleteTokenDialogProps) {
  const { previewTokenOperation } = useTokensState()

  const brokenReferences = useMemo(() => {
    if (!tokenPath) return []

    const preview = previewTokenOperation("delete", tokenPath)
    if (preview?.delete?.brokenReferences) {
      return Array.from(preview.delete.brokenReferences)
    }
    return []
  }, [tokenPath, previewTokenOperation])

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Token</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-mono font-medium">{tokenPath}</span>?
          </DialogDescription>
        </DialogHeader>

        {brokenReferences.length > 0 && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            <p className="font-medium">
              This will break {brokenReferences.length} reference(s):
            </p>
            <ul className="mt-1 list-inside list-disc text-xs">
              {brokenReferences.slice(0, 5).map((token) => (
                <li key={token} className="font-mono">
                  {token}
                </li>
              ))}
              {brokenReferences.length > 5 && (
                <li>...and {brokenReferences.length - 5} more</li>
              )}
            </ul>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={handleConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
