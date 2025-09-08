import { InterpreterError } from "../../../errors";

// export class Color implements ISymbolType {
//   public readonly type: string = "COLOR";

//   constructor(
//     public readonly value: Record<string, ISymbolType>,
//     public readonly typeUri: string,
//   ) {}

//   hasAttribute(attributeName: string): boolean {
//     if (attributeName.toLowerCase() === "to") {
//       return true;
//     }
//     const spec = this.manager.getSpec(this.typeUri);
//     // Directly check against the JSON schema properties
//     return !!spec?.schema.properties[attributeName];
//   }

//   getAttribute(attributeName: string): ISymbolType | ColorConversionProxy {
//     if (attributeName.toLowerCase() === "to") {
//       if (!this.conversionProxy) {
//         // Create the proxy on first access
//         this.conversionProxy = new ColorConversionProxy(this, this.manager);
//       }
//       return this.conversionProxy;
//     }

//     if (!this.hasAttribute(attributeName)) {
//       throw new InterpreterError(
//         `'${attributeName}' not found on color type '${this.typeUri}'.`,
//       );
//     }

//     return this.value[attributeName];
//   }

//   // --- ISymbolType Implementation ---

//   validValue(value: any): boolean {
//     // Validation is now handled by Zod during registration,
//     // so we can assume the value is valid at this point.
//     return true;
//   }

//   toString(): string {
//     const spec = this.manager.getSpec(this.typeUri);
//     const typeName = spec?.name ?? "Color";
//     const values = Object.values(this.value)
//       .map((symbol) => symbol.toString())
//       .join(", ");
//     return `${typeName}(${values})`;
//   }

//   equals(other: ISymbolType): boolean {
//     if (!(other instanceof Color) || this.typeUri !== other.typeUri) {
//       return false;
//     }
//     // Simple JSON comparison for value equality
//     return JSON.stringify(this.value) === JSON.stringify(other.value);
//   }
// }
