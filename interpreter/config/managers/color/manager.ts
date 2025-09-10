import { type ColorSpecification, ColorSpecificationSchema } from "./schema";

type uri = string;

// ColorManager ----------------------------------------------------------------

export class ColorManager {
  private specs: Map<uri, ColorSpecification> = new Map();
  private specTypes: Map<string, uri> = new Map();

  public register(uri: string, jsonSpec: string): ColorSpecification {
    const parsedSpec = ColorSpecificationSchema.safeParse(jsonSpec);

    if (!parsedSpec.success) {
      throw new Error(
        `Invalid color specification for URI ${uri}: ${parsedSpec.error.message}

Json:
${jsonSpec}`,
      );
    }

    const spec = parsedSpec.data;
    this.specs.set(uri, spec);
    this.specTypes.set(spec.type.toLowerCase(), uri);

    return spec;
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
