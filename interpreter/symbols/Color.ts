import type { ISymbolType } from "../../types";
import type { DynamicColorSymbol } from "./DynamicColorSymbol";
import type { ColorConversionProxy } from "./ColorConversionProxy";

/**
 * Represents an instance of a color.
 *
 * This class holds the actual data for a specific color (e.g., {r: 255, g: 0, b: 0})
 * and is linked to its "type" definition, the DynamicColorSymbol. It provides access
 * to color attributes and the conversion proxy.
 */
export class Color implements ISymbolType {
  public type: string = "COLOR";
  public value: Record<string, ISymbolType>; // e.g., { r: Number, g: Number, b: Number }

  // The "schema" or "type definition" for this color instance
  private readonly colorType: DynamicColorSymbol;

  constructor(value: Record<string, ISymbolType>, colorType: DynamicColorSymbol) {
    this.value = value;
    this.colorType = colorType;
  }

  hasAttribute(attributeName: string): boolean {
    if (attributeName.toLowerCase() === "to") {
      return true;
    }
    return attributeName in this.colorType.availableAttributes;
  }

  getAttribute(attributeName: string): ISymbolType | ColorConversionProxy {
    if (attributeName.toLowerCase() === "to") {
      // When '.to' is accessed, return the conversion proxy and set the current color on it
      const proxy = this.colorType.conversionProxy;
      proxy.setColor(this);
      return proxy;
    }

    if (!this.hasAttribute(attributeName)) {
      throw new Error(`Attribute '${attributeName}' not found on color type '${this.colorType.typeName}'.`);
    }

    return this.value[attributeName];
  }

  // Implementation of other ISymbolType methods
  validValue(value: any): boolean {
    // TODO: Implement validation based on colorType schema
    return true;
  }

  toString(): string {
    const values = Object.entries(this.value)
      .map(([key, symbol]) => symbol.toString())
      .join(", ");
    return `${this.colorType.typeName}(${values})`;
  }

  equals(other: ISymbolType): boolean {
    if (!(other instanceof Color) || this.colorType.id !== other.colorType.id) {
      return false;
    }
    // TODO: Deeper comparison of values
    return JSON.stringify(this.value) === JSON.stringify(other.value);
  }
}
