import type { ISymbolType } from "../types";
import { InterpreterError } from "./errors";
import {
  BooleanSymbol,
  ColorSymbol,
  ListSymbol,
  NumberSymbol,
  NumberWithUnitSymbol,
  StringSymbol,
} from "./symbols";

export class SymbolTable {
  private symbols: Record<string, ISymbolType>;
  private parent: SymbolTable | null;
  private activeSymbolTypes: Record<
    string,
    (new (...args: any[]) => ISymbolType) | Record<string, new (...args: any[]) => ISymbolType>
  >;

  constructor(parent: SymbolTable | null = null) {
    this.symbols = {};
    this.parent = parent;
    this.activeSymbolTypes = {
      // Default types
      number: NumberSymbol as new (...args: any[]) => ISymbolType,
      string: StringSymbol as new (...args: any[]) => ISymbolType,
      list: ListSymbol as new (...args: any[]) => ISymbolType,
      boolean: BooleanSymbol as new (...args: any[]) => ISymbolType,
      numberwithunit: NumberWithUnitSymbol as new (...args: any[]) => ISymbolType,
      color: {
        // Sub-types for Color
        default: ColorSymbol as new (...args: any[]) => ISymbolType, // Default Color type (Hex)
        // More color types like RGB, HSL would be registered here by ColorManager
      },
    };
  }

  get(name: string): ISymbolType | null {
    const value = this.symbols[name.toLowerCase()];
    if (value !== undefined) {
      return value;
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    return null;
  }

  set(name: string, value: ISymbolType): void {
    this.symbols[name.toLowerCase()] = value;
  }

  remove(name: string): void {
    delete this.symbols[name.toLowerCase()];
  }

  exists(name: string): boolean {
    return this.symbols[name.toLowerCase()] !== undefined || (this.parent?.exists(name) ?? false);
  }

  isSymbolType(typeName: string): boolean {
    const lowerTypeName = typeName.toLowerCase();
    if (this.activeSymbolTypes[lowerTypeName]) return true;
    for (const key in this.activeSymbolTypes) {
      const entry = this.activeSymbolTypes[key];
      if (
        typeof entry === "object" &&
        entry !== null &&
        (entry as Record<string, any>)[lowerTypeName]
      ) {
        return true;
      }
    }
    return false;
  }

  getSymbolConstructor(
    baseTypeName: string,
    subTypeName?: string
  ): new (
    ...args: any[]
  ) => ISymbolType {
    const lowerBaseType = baseTypeName.toLowerCase();
    const typeEntry = this.activeSymbolTypes[lowerBaseType];

    if (!typeEntry) {
      throw new InterpreterError(`Unknown base type: ${baseTypeName}`);
    }

    if (typeof typeEntry === "function") {
      // It's a direct constructor (e.g., NumberSymbol)
      if (subTypeName) {
        throw new InterpreterError(
          `Type ${baseTypeName} does not support subtypes like '.${subTypeName}'.`
        );
      }
      return typeEntry as new (
        ...args: any[]
      ) => ISymbolType;
    } else if (typeof typeEntry === "object" && typeEntry !== null) {
      // It's a category with subtypes (e.g., Color)
      const lowerSubType = subTypeName ? subTypeName.toLowerCase() : "default";
      const subTypeEntry = (typeEntry as Record<string, new (...args: any[]) => ISymbolType>)[
        lowerSubType
      ];
      if (!subTypeEntry) {
        throw new InterpreterError(
          `Unknown subtype '${subTypeName || "default"}' for type '${baseTypeName}'.`
        );
      }
      return subTypeEntry;
    }
    throw new InterpreterError(`Invalid type configuration for ${baseTypeName}.`);
  }

  // For ColorManager to register new color types, e.g. Color.RGB
  addColorSubType(
    colorFormatName: string,
    symbolConstructor: new (...args: any[]) => ISymbolType
  ): void {
    const colorCategory = this.activeSymbolTypes.color;
    if (typeof colorCategory !== "object" || colorCategory === null) {
      throw new Error("Color type category not properly initialized in symbol table.");
    }
    (colorCategory as Record<string, new (...args: any[]) => ISymbolType>)[
      colorFormatName.toLowerCase()
    ] = symbolConstructor;
  }
}
