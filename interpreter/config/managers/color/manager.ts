import { type ColorSpecification, ColorSpecificationSchema } from "./schema";

// Types -----------------------------------------------------------------------

type uri = string;

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
  private specTypes: Map<string, uri> = new Map();

  constructor() {
    for (const [uri, spec] of defaultTypes) {
      this.register(uri, spec);
    }
  }

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
    this.specTypes.set(parsedSpec.name.toLowerCase(), uri);

    return parsedSpec;
  }

  public getSpec(uri: string): ColorSpecification | undefined {
    return this.specs.get(uri);
  }

  public getSpecByType(type: string): ColorSpecification | undefined {
    const uri = this.specTypes.get(type);
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

  public expectSpec(keyword: string): [string, ColorSpecification] | undefined {
    for (const [uri, spec] of this.specs.entries()) {
      if (spec.initializers.some((init) => init.keyword === keyword)) {
        return [uri, spec];
      }
    }
    return undefined;
  }
}
