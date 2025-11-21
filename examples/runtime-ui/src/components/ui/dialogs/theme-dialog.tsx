import { useEffect, useMemo, useState, type FormEvent } from "react"

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
import { Checkbox } from "@/components/ui/checkbox"
import { useAppState } from "@/state-context"

interface ThemeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTheme: string | null
  onResetEditing: () => void
}

export function ThemeDialog({ open, onOpenChange, editingTheme, onResetEditing }: ThemeDialogProps) {
  const { appState, addTheme, updateTheme } = useAppState()
  const availableSetNames = useMemo(() => Array.from(appState.sets.keys()), [appState.sets])
  const [themeName, setThemeName] = useState("")
  const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set())

  const resetForm = () => {
    setThemeName("")
    setSelectedSets(new Set())
  }

  useEffect(() => {
    if (!open) return
    if (editingTheme) {
      const themeSets = appState.themes.get(editingTheme) || []
      setThemeName(editingTheme)
      setSelectedSets(new Set(themeSets))
    } else {
      resetForm()
    }
  }, [appState.themes, editingTheme, open])

  const toggleThemeSetSelection = (setName: string) => {
    setSelectedSets((prev) => {
      const next = new Set(prev)
      if (next.has(setName)) {
        next.delete(setName)
      } else {
        next.add(setName)
      }
      return next
    })
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const chosenSets = Array.from(selectedSets)
    if (editingTheme) {
      updateTheme(editingTheme, themeName, chosenSets)
    } else {
      addTheme(themeName, chosenSets)
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

  const dialogTitle = editingTheme ? "Edit Theme" : "Add Theme"
  const dialogCta = editingTheme ? "Save Theme" : "Add Theme"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {editingTheme
                ? "Update this theme and its sets."
                : "Create a theme by selecting which sets belong to it."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Label htmlFor="theme-name">Name</Label>
            <Input
              id="theme-name"
              value={themeName}
              onChange={(event) => setThemeName(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Sets</Label>
            <div className="grid gap-2 rounded-md border p-2">
              {availableSetNames.map((setName) => (
                <label key={setName} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedSets.has(setName)}
                    onChange={() => toggleThemeSetSelection(setName)}
                  />
                  <span className="truncate">{setName}</span>
                </label>
              ))}
            </div>
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
