import type { ISymbolType } from "@/types";
import type { ColorSymbol, dynamicColorValue } from "@/interpreter/symbols";
import { type ColorSpecification, ColorSpecificationSchema, specName } from "./schema";
import { InterpreterError } from "@/interpreter/errors";
import { attributesToString, identifiersChainToString, ReassignNode, type IdentifierNode } from "@/interpreter/ast";
// import { parseExpression } from "@/interpreter/parser";

// Types -----------------------------------------------------------------------

type uri = string;

type colorName = string;

type Specs = Map<uri, ColorSpecification>;

// Defaults --------------------------------------------------------------------

const defaultTypes: Specs = new Map([
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
  private specTypes: Map<colorName, uri> = new Map();
  // Registry of dynamic functions
  private initializers: Map<colorName, (args: Array<ISymbolType>) => ColorSymbol | null> =
    new Map();

  constructor() {
    for (const [uri, spec] of defaultTypes) {
      this.register(uri, spec);
    }
  }

  // public registerInitializer(spec: ColorSpecification) {
  //   const initializers = spec.initializers.forEach(spec => {
  //     try {
  //       const { ast } = parseExpression(spec.script.script).result
  //       const fn = (args: Array<ISymbolType>) => {
  //         const result = new Interpreter(ast, { references: { input: args } }).interpret()
  //         return result;
  //       }
  //       this.initializers.set(spec.keyword.toLowerCase(), fn)
  //     }
  //   }))

  //   parseExpression(text)
  //   this.initializers.set(specName(spec), fn)
  // }

  public register(uri: string, spec: ColorSpecification | string): ColorSpecification {
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

  public findSpecByName(name: string): [string, ColorSpecification] | undefined {
    const lowerCaseName = name.toLowerCase();
    for (const [uri, spec] of this.specs.entries()) {
      if (spec.name.toLowerCase() === lowerCaseName) {
        return [uri, spec];
      }
    }
    return undefined;
  }

  setAttribute(
    color: ColorSymbol,
    node: ReassignNode,
    attributeValue: ISymbolType,
  ): ColorSymbol {
    const attributes = node.attributesStringChain();

    if (color.value instanceof String) {
      throw new InterpreterError(
        `Cannot set attributes '${attributesToString(attributes)}' for variable ${node.identifierToString()} on Color type ${color.subType}.`,
        node.token?.line,
        node.token,
      );
    }

    if (attributes.length !== 1) {
      throw new InterpreterError(
        `Attributes chain '${attributesToString(attributes)}' for variable ${node.identifierToString()} on Color type may not exceed one element.`,
        node.token?.line,
        node.token,
      );
    }
    const atrr = attributes[0];

    // Update the value by mutation
    const value = (color.value || {}) as dynamicColorValue;
    value[atrr] = attributeValue;
    color.value = value;

    return color;
  }

  public expectSpec(keyword: string): [string, ColorSpecification] | undefined {
    for (const [uri, spec] of this.specs.entries()) {
      if (spec.initializers.some((init) => init.keyword === keyword)) {
        return [uri, spec];
      }
    }
    return undefined;
  }
}
