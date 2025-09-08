import type { AccessProxyType, ISymbolType } from "../../types";
import type { ColorManager } from "../config/managers/ColorManager";
import { InterpreterError } from "../errors";

// Placeholder for the actual SymbolType for a color instance
type ColorSymbol = ISymbolType;

/**
 * The ColorConversionProxy is a smart proxy that handles the conversion of a color
 * from one format to another. It is accessed via the `.to` attribute on a color object.
 *
 * It intercepts method calls (e.g., `.to.hsl()`), finds the shortest conversion
 * path, and executes the necessary transformations.
 */
export class ColorConversionProxy implements AccessProxyType {
  private color: ColorSymbol | null = null; // The actual color instance to be converted

  constructor(
    private readonly colorTransforms: Map<string, Map<string, any>>,
    private readonly sourceType: string, // The URI of the source color format
    private readonly manager: ColorManager,
  ) {}

  /**
   * Sets the color instance that this proxy will operate on.
   * This is done just before a conversion is attempted.
   */
  public setColor(color: ColorSymbol): void {
    this.color = color;
  }

  hasMethod(name: string, args: any[]): boolean {
    return this.manager.isSupportedKeyword(name);
  }

  hasAttribute(name: string): boolean {
    return false; // Conversions are always methods, e.g., .to.hsl()
  }

  retrieveAttribute(name: string, configManager: any): any {
    throw new InterpreterError(
      "Color conversion methods need to be called, e.g., `color.to.hsl()`",
    );
  }

  callMethod(name: string, args: any[], configManager: any): any {
    if (args.length > 0) {
      throw new InterpreterError(
        `Conversion to '${name}' does not take any arguments.`,
      );
    }

    if (!this.color) {
      throw new InterpreterError(
        "Internal error: Color instance not set on conversion proxy.",
      );
    }

    const targetSpec = this.manager.getColorSpecification(name);
    return this.convert(targetSpec.id, configManager);
  }

  private convert(targetType: string, configManager: any): any {
    const path = this.findConversionPath(this.sourceType, targetType);

    if (!path) {
      throw new InterpreterError(
        `No conversion path found from ${this.sourceType} to ${targetType}`,
      );
    }

    console.log(`Conversion path: ${path.join(" -> ")}`);

    // TODO: Execute the conversion chain
    // let result = this.color;
    // for (let i = 0; i < path.length - 1; i++) {
    //   const source = path[i];
    //   const target = path[i + 1];
    //   const convertFn = this.colorTransforms.get(source)?.get(target);
    //   // const interpreter = new Interpreter(convertFn, { input: result }, configManager);
    //   // result = interpreter.interpret();
    // }
    // return result;

    return null; // Placeholder
  }

  private findConversionPath(
    source: string,
    target: string,
  ): string[] | null {
    if (source === target) {
      return [source];
    }

    const queue: string[][] = [[source]];
    const visited = new Set<string>([source]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const lastNode = path[path.length - 1];

      if (lastNode === target) {
        return path;
      }

      const neighbors = this.colorTransforms.get(lastNode)?.keys() ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          const newPath = [...path, neighbor];
          queue.push(newPath);
        }
      }
    }

    return null; // No path found
  }
}
