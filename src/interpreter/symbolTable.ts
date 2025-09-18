import type { ISymbolType } from "@src/types";
export class SymbolTable {
  private symbols: Record<string, ISymbolType | null>;

  constructor() {
    this.symbols = {};
  }

  get(name: string): ISymbolType | null {
    return this.symbols[name.toLowerCase()] || null;
  }

  set(name: string, value: ISymbolType | null): void {
    this.symbols[name.toLowerCase()] = value;
  }

  isDefined(name: string): boolean {
    return !!this.symbols[name.toLowerCase()];
  }
}
