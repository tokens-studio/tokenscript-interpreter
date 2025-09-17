import type { ISymbolType } from "@/types";
import { ColorSymbol, type dynamicColorValue, typeEquals } from "@/interpreter/symbols";
import {
  type ColorSpecification,
  ColorSpecificationSchema,
  specName,
  validSchemaTypes,
} from "./schema";
import { InterpreterError } from "@/interpreter/errors";
import { attributesToString, type ReassignNode } from "@/interpreter/ast";
import { ColorManagerError } from "@/interpreter/error-types";
import { parseExpression } from "@/interpreter/parser";
import { Interpreter } from "@/lib";
import { Config } from "../../config";

// Types -----------------------------------------------------------------------

type uriType = string;

type colorName = string;

type Specs = Map<uriType, ColorSpecification>;

// Defaults --------------------------------------------------------------------

const defaultTypeSpecs: Specs = new Map([
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

export class ColorManager {
  private specs: Specs = new Map();

  // Computed Map of type name to uri
  private specTypes: Map<colorName, uriType> = new Map();

  // Initializer functions
  private initializers: Map<colorName, (args: Array<ISymbolType>) => ColorSymbol> = new Map();

  // Nested map: source URI -> target URI -> conversion function
  private conversions: Map<uriType, Map<uriType, (color: ColorSymbol) => ColorSymbol>> = new Map();

  constructor(defaultSpecs = defaultTypeSpecs) {
    for (const [uri, spec] of defaultSpecs) {
      this.register(uri, spec);
    }
  }

  /**
   * Creates a clone of this class to be passed down to initializers and conversion functions
   * Links properties to the parent config.
   */
  private clone() {
    const colorManager = new ColorManager(new Map());
    colorManager.specs = this.specs;
    colorManager.specTypes = this.specTypes;
    colorManager.initializers = this.initializers;
    colorManager.conversions = this.conversions;
    return colorManager;
  }

  public registerRootInitializers(_uri: uriType, spec: ColorSpecification) {
    const colorManager = this.clone();
    const config = new Config({ colorManager });

    spec.initializers.forEach((spec) => {
      try {
        const { lexer, parser, ast } = parseExpression(spec.script.script);
        const fn = (args: Array<ISymbolType>): ColorSymbol => {
          const result = new Interpreter(ast, { references: { input: args }, config }).interpret();
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
          { error, spec, script: spec.script.script, config },
        );
      }
    });
  }

  public registerConversions(uri: uriType, spec: ColorSpecification) {
    const colorManager = this.clone();
    const config = new Config({ colorManager });

    spec.conversions.forEach((conversion) => {
      // $self replacement
      const sourceUri = conversion.source === "$self" ? uri : conversion.source;
      const targetUri = conversion.target === "$self" ? uri : conversion.target;

      const { ast } = parseExpression(conversion.script.script);
      const fn = (color: ColorSymbol): ColorSymbol => {
        const result = new Interpreter(ast, { references: { input: color }, config }).interpret();
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
          return new ColorSymbol(value, targetSpec.name);
        }
        return result as ColorSymbol;
      };

      // Ensure source map exists
      if (!this.conversions.has(sourceUri)) {
        this.conversions.set(sourceUri, new Map());
      }

      // Set the conversion function
      const sourceMap = this.conversions.get(sourceUri);
      if (sourceMap) {
        sourceMap.set(targetUri, fn);
      }
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

  public getSpec(uri: string): ColorSpecification | undefined {
    return this.specs.get(uri);
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

  public hasConversion(sourceUri: string, targetUri: string): boolean {
    return this.conversions.get(sourceUri)?.has(targetUri) ?? false;
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

    // Identity conversion - if source and target URIs are the same, return original
    if (sourceUri === targetUri) {
      return color;
    }

    const conversionFn = this.conversions.get(sourceUri)?.get(targetUri);
    if (!conversionFn) {
      throw new InterpreterError(`No conversion found from '${sourceUri}' to '${targetUri}'`);
    }

    return conversionFn(color);
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
}
