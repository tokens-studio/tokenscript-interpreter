import { useEffect, useState, type FormEvent } from "react"

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
import { useAppState } from "@/state-context"

interface SetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingSet: string | null
  onResetEditing: () => void
}

export function SetDialog({ open, onOpenChange, editingSet, onResetEditing }: SetDialogProps) {
  const { addSet, updateSet } = useAppState()
  const [setName, setSetName] = useState("")

  const resetForm = () => {
    setSetName("")
  }

  useEffect(() => {
    if (!open) return
    if (editingSet) {
      setSetName(editingSet)
    } else {
      resetForm()
    }
  }, [editingSet, open])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (editingSet) {
      updateSet(editingSet, setName)
    } else {
      addSet(setName)
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

  const dialogTitle = editingSet ? "Edit Set" : "Add Set"
  const dialogCta = editingSet ? "Save Set" : "Add Set"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {editingSet ? "Update this token set." : "Create a new token set."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Label htmlFor="set-name">Name</Label>
            <Input
              id="set-name"
              value={setName}
              onChange={(event) => setSetName(event.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">{dialogCta}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
