import { SlidersHorizontal } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { useAppState } from "@/state-context"

function isColorValue(value: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(value) || /^rgb/.test(value) || /^hsl/.test(value)
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return String(value)
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch (error) {
      console.log("formatValue: failed to stringify token value", { value, error })
      return String(value)
    }
  }
  return String(value)
}

export function TokensTable() {
  const { filteredOutput, mergedTokens, selectedToken, selectToken } = useAppState()

  return (
    <SidebarInset>
      <div className="flex flex-col h-full">
        <header
          className="flex h-14 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
          <SidebarTrigger className="-ml-2" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Processor Output</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{filteredOutput.length} tokens</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold text-left" style={{ width: "30%" }}>
                      Name
                    </TableHead>
                    <TableHead className="font-semibold text-left" style={{ width: "18%" }}>
                      Type
                    </TableHead>
                    <TableHead className="font-semibold text-left" style={{ width: "26%" }}>
                      Original Value
                    </TableHead>
                    <TableHead className="font-semibold text-left" style={{ width: "26%" }}>
                      Resolved Value
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOutput.map(([path, value]) => {
                    const tokenData = mergedTokens.get(path)
                    const originalValue = formatValue(tokenData?.$value)
                    const displayValue = formatValue(value)
                    const tokenType = tokenData?.$type || "Unknown"
                    const showColorSwatch = tokenType === "Color" && isColorValue(displayValue)
                    const rowClass = selectedToken === path ? "bg-primary/10" : "hover:bg-muted/50"

                    return (
                      <TableRow
                        key={path}
                        data-state={selectedToken === path ? "selected" : undefined}
                        className={`cursor-pointer transition-colors ${rowClass}`}
                        onClick={() => selectToken(path)}
                      >
                        <TableCell className="font-mono text-sm text-left">{path}</TableCell>
                        <TableCell className="text-sm text-left">{tokenType}</TableCell>
                        <TableCell className="font-mono text-sm text-left">{originalValue}</TableCell>
                        <TableCell className="font-mono text-sm text-left">
                          <div className="flex items-center gap-2">
                            {showColorSwatch && (
                              <div
                                className="h-4 w-4 flex-shrink-0 rounded border shadow-sm"
                                style={{ backgroundColor: displayValue }}
                              />
                            )}
                            <span>{displayValue}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </main>
      </div>
    </SidebarInset>
  )
}
