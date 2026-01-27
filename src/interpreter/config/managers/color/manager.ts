import { attributesToString, type ReassignNode } from "@interpreter/ast";
import {
  ColorErrorCode,
  InterpreterError,
  isLanguageError,
  serializeError,
} from "@interpreter/errors";
import { parseExpression } from "@interpreter/parser";
import { ColorSymbol, type dynamicColorValue, typeEquals } from "@interpreter/symbols";
import { ensureValidAlpha, formatHex8, isTransparent } from "@interpreter/utils/color";
import { Interpreter } from "@src/lib";
import type { ISymbolType } from "@src/types";
import { buildSchemaUri, parseVersionString } from "@src/utils/schema-uri";
import { type } from "arktype";
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
    buildSchemaUri({ category: "core", name: "hex-color", version: parseVersionString("0") }),
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
            throw new InterpreterError(ColorErrorCode.INITIALIZER_CRASHED);
          }
          return result as ColorSymbol;
        };
        this.initializers.set(spec.keyword.toLowerCase(), fn);
      } catch (error) {
        throw new InterpreterError(ColorErrorCode.INITIALIZER_CONSTRUCT_FAILED, {
          data: {
            error: isLanguageError(error) ? error : serializeError(error),
          },
        });
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
            throw new InterpreterError(ColorErrorCode.CONVERSION_TARGET_NOT_FOUND, {
              data: { targetUri },
            });
          }
          const value = typeof result === "string" ? result : (result?.value ?? null);
          return new ColorSymbol(value, targetSpec.name, null, this.parentConfig);
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
      const parseResult = ColorSpecificationSchema(JSON.parse(spec));
      if (parseResult instanceof type.errors) {
        throw new Error(
          `Invalid color specification for URI ${uri}: ${parseResult.summary}

Json:
${spec}`,
        );
      }
      parsedSpec = parseResult as ColorSpecification;
    } else {
      // Validate the object using the schema
      const parseResult = ColorSpecificationSchema(spec);
      if (parseResult instanceof type.errors) {
        throw new Error(`Invalid color specification for URI ${uri}: ${parseResult.summary}`);
      }
      parsedSpec = parseResult as ColorSpecification;
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
      throw new InterpreterError(ColorErrorCode.INITIALIZER_NOT_FOUND, {
        data: { keyword },
      });
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
      throw new InterpreterError(ColorErrorCode.SOURCE_URI_NOT_FOUND, {
        data: { colorType: color.subType || "unknown" },
      });
    }

    try {
      const result = this.convertThroughPath(color, sourceUri, targetUri);
      result.alpha = color.alpha;
      return result;
    } catch (error) {
      throw new InterpreterError(ColorErrorCode.CONVERSION_ERROR, {
        data: {
          error: isLanguageError(error) ? error : serializeError(error),
        },
      });
    }
  }

  public convertToByType(color: ColorSymbol, targetType: string): ColorSymbol {
    // Identity conversion - return original instance without cloning
    if (color.subType?.toLowerCase() === targetType.toLowerCase()) {
      return color;
    }

    const targetUri = this.specTypes.get(targetType.toLowerCase());

    if (!targetUri) {
      throw new InterpreterError(ColorErrorCode.TARGET_URI_NOT_FOUND, {
        data: { colorType: targetType },
      });
    }

    return this.convertTo(color, targetUri);
  }

  setAttribute(color: ColorSymbol, node: ReassignNode, attributeValue: ISymbolType): ColorSymbol {
    const attributes = node.attributesStringChain();

    if (attributes.length !== 1) {
      throw new InterpreterError(ColorErrorCode.ATTRIBUTE_CHAIN_TOO_LONG, {
        token: node.token,
        data: {
          attributes: attributesToString(attributes),
          identifier: node.identifierToString(),
          colorType: color.subType || "unknown",
        },
      });
    }
    const attr = attributes[0];

    // alpha attribute
    if (attr === "alpha") {
      if (attributeValue.type !== "Number" && attributeValue.type !== "Null") {
        throw new InterpreterError(ColorErrorCode.INVALID_ATTRIBUTE_TYPE, {
          token: node.token,
          data: {
            attributeType: attributeValue.type,
            validTypes: "Number or Null",
          },
        });
      }
      const alphaValue = attributeValue.value as number | null;
      ensureValidAlpha(alphaValue);
      color.alpha = alphaValue;
      return color;
    }

    if (typeof color.value === "string") {
      throw new InterpreterError(ColorErrorCode.STRING_VALUE_ASSIGNMENT, {
        token: node.token,
        data: {
          attributes: attributesToString(attributes),
          identifier: node.identifierToString(),
          colorType: color.subType || "unknown",
        },
      });
    }

    const spec = this.getSpecFromColor(color);
    if (!spec) {
      throw new InterpreterError(ColorErrorCode.MISSING_SPEC, {
        token: node.token,
        data: {
          identifier: node.identifierToString(),
          colorType: color.subType || "unknown",
        },
      });
    }

    if (!spec.schema) {
      throw new InterpreterError(ColorErrorCode.MISSING_SCHEMA, {
        token: node.token,
        data: { colorType: color.subType || "unknown" },
      });
    }

    const attrSchema = spec.schema.properties[attr];
    if (!attrSchema) {
      throw new InterpreterError(ColorErrorCode.MISSING_ATTRIBUTE_SCHEMA, {
        token: node.token,
        data: {
          attribute: attr,
          identifier: node.identifierToString(),
          colorType: color.subType || "unknown",
        },
      });
    }

    if (!typeEquals(attrSchema.type, attributeValue.type)) {
      throw new InterpreterError(ColorErrorCode.INVALID_ATTRIBUTE_TYPE, {
        token: node.token,
        data: {
          attributeType: attributeValue.type,
          validTypes: validSchemaTypes.join(", "),
        },
      });
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
   * If alpha is set and less than 1, it is included as the fourth parameter.
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
   * // RGB color with alpha
   * const rgbColor = new ColorSymbol({ r: 255, g: 0, b: 0 }, "RGB", undefined, 0.5);
   * manager.formatColorMethod(rgbColor); // "rgb(255, 0, 0, 0.5)"
   * ```
   */
  formatColorMethod(color: ColorSymbol, opts: FormatColorOptions = {}): string {
    const { decimalPlaces = 2, removeTrailingZeros = true } = opts;

    if (typeof color.value === "string") {
      // For hex colors with alpha, output hex8 format
      if (color.alpha !== null) {
        return formatHex8(color.value, color.alpha);
      }
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

      // Include alpha only when set and not fully opaque (< 1)
      // This follows CSS convention where alpha=1 (fully opaque) is omitted
      // Alpha=0 (fully transparent) is included to distinguish from no alpha
      if (isTransparent(color.alpha)) {
        values.push(this.formatNumber(color.alpha, decimalPlaces, removeTrailingZeros));
      }

      // Format as function call with the subtype name
      const functionName = color.subType.toLowerCase();
      return `${functionName}(${values.join(", ")})`;
    }

    return "";
  }
}
