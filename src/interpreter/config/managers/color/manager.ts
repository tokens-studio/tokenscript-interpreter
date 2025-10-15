import { attributesToString, type ReassignNode } from "@interpreter/ast";
import { ColorManagerError } from "@interpreter/error-types";
import { InterpreterError } from "@interpreter/errors";
import { parseExpression } from "@interpreter/parser";
import { ColorSymbol, type dynamicColorValue, typeEquals } from "@interpreter/symbols";
import { Interpreter } from "@src/lib";
import type { ISymbolType } from "@src/types";
import { BaseManager } from "../base-manager";
import {
  type ColorSpecification,
  ColorSpecificationSchema,
  specName,
  validSchemaTypes,
} from "./schema";

// Types -----------------------------------------------------------------------

type uriType = string;

type colorName = string;

type Specs = Map<uriType, ColorSpecification>;

interface FormatColorOptions {
  decimalPlaces?: number;
  removeTrailingZeros?: boolean;
}

// Defaults --------------------------------------------------------------------

export const defaultTypeSpecs: Specs = new Map([
  [
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/hex-color/0/",
    {
      name: "Hex",
      type: "color",
      description: "A color in hex format, e.g. #ff0000",
      schema: {
        type: "object",
        properties: {
          value: {
            type: "string",
          },
        },
      },
      initializers: [
        {
          title: "Hex Color Initializer",
          keyword: "hex",
          script: {
            type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/initializer",
            script: "variable c: Color.Hex;\n c.value = {input};\nreturn c;",
          },
        },
      ],
      conversions: [],
    },
  ],
]);

// ColorManager ----------------------------------------------------------------

export class ColorManager extends BaseManager<ColorSpecification, ColorSymbol, ColorSymbol> {
  private initializers: Map<colorName, (args: Array<ISymbolType>) => ColorSymbol> = new Map();

  constructor(defaultSpecs = defaultTypeSpecs) {
    super();
    for (const [uri, spec] of defaultSpecs) {
      this.register(uri, spec);
    }
  }

  protected getSpecName(spec: ColorSpecification): string {
    return specName(spec);
  }

  /**
   * Creates a clone of this class to be passed down to initializers and conversion functions
   * Links properties to the parent config.
   */
  public clone(): this {
    const colorManager = new ColorManager(new Map());
    colorManager.specs = this.specs;
    colorManager.specTypes = this.specTypes;
    colorManager.initializers = this.initializers;
    colorManager.conversions = this.conversions;
    return colorManager as this;
  }

  public registerRootInitializers(_uri: uriType, spec: ColorSpecification) {
    spec.initializers.forEach((spec) => {
      try {
        const { ast } = parseExpression(spec.script.script);
        const fn = (args: Array<ISymbolType>): ColorSymbol => {
          const config = this.createInterpreterConfig({ input: args });
          const result = new Interpreter(ast, config).interpret();
          if (!(result instanceof ColorSymbol)) {
            throw new InterpreterError("Initializer crashed!");
          }
          return result as ColorSymbol;
        };
        this.initializers.set(spec.keyword.toLowerCase(), fn);
      } catch (error: any) {
        throw new InterpreterError(
          "Could not construct initializer from schema",
          undefined,
          undefined,
          { error, spec, script: spec.script.script },
        );
      }
    });
  }

  public registerConversions(uri: uriType, spec: ColorSpecification) {
    spec.conversions.forEach((conversion) => {
      // $self replacement
      const sourceUri = conversion.source === "$self" ? uri : conversion.source;
      const targetUri = conversion.target === "$self" ? uri : conversion.target;

      const { ast } = parseExpression(conversion.script.script);
      const fn = (color: ColorSymbol): ColorSymbol => {
        const interpreterConfig = this.createInterpreterConfig({ input: color });
        const result = new Interpreter(ast, interpreterConfig).interpret();
        if (!(result instanceof ColorSymbol)) {
          // If the result is not a ColorSymbol, wrap it in one with the target type
          const targetSpec = this.getSpec(targetUri);
          if (!targetSpec) {
            throw new InterpreterError(
              `Conversion function crashed! No target spec found for ${targetUri}`,
              undefined,
              undefined,
              { result },
            );
          }
          const value = typeof result === "string" ? result : (result?.value ?? null);
          return new ColorSymbol(value, targetSpec.name, this.parentConfig);
        }
        return result as ColorSymbol;
      };

      // Set the conversion function
      this.registerConversionFunction(sourceUri, targetUri, fn);
    });
  }

  public register(uri: uriType, spec: ColorSpecification | string): ColorSpecification {
    let parsedSpec: ColorSpecification;

    if (typeof spec === "string") {
      const parseResult = ColorSpecificationSchema.safeParse(JSON.parse(spec));
      if (!parseResult.success) {
        throw new Error(
          `Invalid color specification for URI ${uri}: ${parseResult.error.message}

Json:
${spec}`,
        );
      }
      parsedSpec = parseResult.data;
    } else {
      // Validate the object using the schema
      const parseResult = ColorSpecificationSchema.safeParse(spec);
      if (!parseResult.success) {
        throw new Error(`Invalid color specification for URI ${uri}: ${parseResult.error.message}`);
      }
      parsedSpec = parseResult.data;
    }

    this.specs.set(uri, parsedSpec);
    this.specTypes.set(specName(parsedSpec), uri);

    this.registerRootInitializers(uri, parsedSpec);
    this.registerConversions(uri, parsedSpec);

    return parsedSpec;
  }

  public getSpecByType(type: string): ColorSpecification | undefined {
    const uri = this.specTypes.get(type.toLowerCase());
    if (!uri) return;
    return this.getSpec(uri);
  }

  public getSpecFromColor(color: ColorSymbol): ColorSpecification | undefined {
    const key = color.subType?.toLowerCase();
    if (key) {
      return this.getSpecByType(key);
    }
  }

  public hasInitializer(keyword: string): boolean {
    return this.initializers.has(keyword.toLowerCase());
  }

  public executeInitializer(keyword: string, args: Array<ISymbolType>): ColorSymbol {
    const initFn = this.initializers.get(keyword.toLowerCase());
    if (!initFn) {
      throw new InterpreterError(`No initializer found for keyword '${keyword}'`);
    }
    return initFn(args);
  }

  public hasConversionByType(sourceType: string, targetType: string): boolean {
    const sourceUri = this.specTypes.get(sourceType.toLowerCase());
    const targetUri = this.specTypes.get(targetType.toLowerCase());

    if (!sourceUri || !targetUri) {
      return false;
    }

    return this.hasConversion(sourceUri, targetUri);
  }

  public convertTo(color: ColorSymbol, targetUri: string): ColorSymbol {
    const sourceUri = this.specTypes.get(color.subType?.toLowerCase() || "");

    if (!sourceUri) {
      throw new InterpreterError(`No source URI found for color type '${color.subType}'`);
    }

    try {
      return this.convertThroughPath(color, sourceUri, targetUri);
    } catch (error: any) {
      throw new InterpreterError(error.message);
    }
  }

  public convertToByType(color: ColorSymbol, targetType: string): ColorSymbol {
    // Identity conversion - if source and target types are the same, return original
    if (color.subType?.toLowerCase() === targetType.toLowerCase()) {
      return color;
    }

    const targetUri = this.specTypes.get(targetType.toLowerCase());

    if (!targetUri) {
      throw new InterpreterError(`No target URI found for color type '${targetType}'`);
    }

    return this.convertTo(color, targetUri);
  }

  setAttribute(color: ColorSymbol, node: ReassignNode, attributeValue: ISymbolType): ColorSymbol {
    const attributes = node.attributesStringChain();

    if (typeof color.value === "string") {
      throw new InterpreterError(
        `Cannot set attributes '${attributesToString(attributes)}' for variable ${node.identifierToString()} on Color type ${color.subType}.`,
        node.token?.line,
        node.token,
        this,
        ColorManagerError.STRING_VALUE_ASSIGNMENT,
      );
    }

    if (attributes.length !== 1) {
      throw new InterpreterError(
        `Attributes chain '${attributesToString(attributes)}' for variable ${node.identifierToString()} on Color type ${color.subType} may not exceed one element.`,
        node.token?.line,
        node.token,
        this,
        ColorManagerError.ATTRIBUTE_CHAIN_TOO_LONG,
      );
    }
    const attr = attributes[0];

    const spec = this.getSpecFromColor(color);
    if (!spec) {
      throw new InterpreterError(
        `No spec ${color.subType} defined for variable ${node.identifierToString()} on Color type ${color.subType}.`,
        node.token?.line,
        node.token,
        this,
        ColorManagerError.MISSING_SPEC,
      );
    }

    if (!spec.schema) {
      throw new InterpreterError(
        `No schema defined for Color type ${color.subType}.`,
        node.token?.line,
        node.token,
        this,
        ColorManagerError.MISSING_SCHEMA,
      );
    }

    const attrSchema = spec.schema.properties[attr];
    if (!attrSchema) {
      throw new InterpreterError(
        `No schema found for key ${attr} for variable ${node.identifierToString()} on Color type ${color.subType}.`,
        node.token?.line,
        node.token,
        this,
        ColorManagerError.MISSING_SCHEMA,
      );
    }

    if (!typeEquals(attrSchema.type, attributeValue.type)) {
      throw new InterpreterError(
        `Invalid attribute type '${attributeValue.type}'. Use a valid type. (${validSchemaTypes.join(", ")})`,
        node.token?.line,
        node.token,
        this,
        ColorManagerError.INVALID_ATTRIBUTE_TYPE,
      );
    }

    // Update the value by mutation
    const value = (color.value || {}) as dynamicColorValue;
    value[attr] = attributeValue;
    color.value = value;

    return color;
  }

  /**
   * Formats a number value, rounding to specified decimal places and optionally removing trailing zeros.
   *
   * @param value - The numeric value to format
   * @param decimalPlaces - Number of decimal places to round to
   * @param removeTrailingZeros - Whether to remove trailing zeros
   * @returns Formatted number string
   */
  private formatNumber(value: number, decimalPlaces: number, removeTrailingZeros: boolean): string {
    const rounded = Number(value.toFixed(decimalPlaces));
    const formatted = rounded.toFixed(decimalPlaces);

    if (removeTrailingZeros) {
      // Remove trailing zeros and decimal point if not needed
      return formatted.replace(/\.?0+$/, "");
    }

    return formatted;
  }

  /**
   * Formats a ColorSymbol as a string representation using the appropriate schema-defined format.
   *
   * For hex colors (string values), returns the hex string as-is.
   * For dynamic colors (object values), uses the schema's `order` property to determine
   * parameter order and formats as a function call (e.g., "hsl(0, 100, 50.0)").
   *
   * @param color - The ColorSymbol to format
   * @param opts - Formatting options for numeric values
   * @returns Formatted string representation of the color, or empty string if formatting fails
   *
   * @example
   * ```typescript
   * // Hex color
   * const hexColor = new ColorSymbol("#ff0000", "Hex");
   * manager.formatColorMethod(hexColor); // "#ff0000"
   *
   * // HSL color with schema order ["h", "s", "l"]
   * const hslColor = new ColorSymbol({ h: 0, s: 100, l: 50.123456 }, "HSL");
   * manager.formatColorMethod(hslColor); // "hsl(0, 100, 50.12)"
   *
   * // RGB color with trailing zeros removed
   * const rgbColor = new ColorSymbol({ r: 0, g: 85.00000000000004, b: 255 }, "RGB");
   * manager.formatColorMethod(rgbColor); // "rgb(0, 85, 255)"
   * ```
   */
  formatColorMethod(color: ColorSymbol, opts: FormatColorOptions = {}): string {
    const { decimalPlaces = 2, removeTrailingZeros = true } = opts;

    if (typeof color.value === "string") {
      // For hex colors, return the hex string
      return color.value;
    }

    if (typeof color.value === "object" && color.value !== null && color.subType) {
      const spec = this.getSpecFromColor(color);
      if (!spec) {
        return "";
      }

      // Use schema order if available, otherwise fall back to object keys order
      const order =
        spec.schema?.order && spec.schema.order.length > 0
          ? spec.schema.order
          : Object.keys(color.value as Record<string, any>);

      // Extract values in the specified order
      const values = order.map((key) => {
        const valObj = (color.value as Record<string, any>)[key];
        const value = valObj?.value;
        if (typeof value === "number") {
          return this.formatNumber(value, decimalPlaces, removeTrailingZeros);
        }
        return value?.toString() || "0";
      });

      // Format as function call with the subtype name
      const functionName = color.subType.toLowerCase();
      return `${functionName}(${values.join(", ")})`;
    }

    return "";
  }
}
