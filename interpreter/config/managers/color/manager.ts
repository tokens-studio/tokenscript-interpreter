import { type ColorSpecification, ColorSpecificationSchema } from "./schema";

type uri = string;

// ColorManager ----------------------------------------------------------------

export class ColorManager {
  private specs: Map<uri, ColorSpecification> = new Map();

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

    return spec;
  }

  public getSpec(uri: string): ColorSpecification | undefined {
    return this.specs.get(uri);
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

  public findSpecByKeyword(keyword: string): [string, ColorSpecification] | undefined {
    for (const [uri, spec] of this.specs.entries()) {
      if (spec.initializers.some((init) => init.keyword === keyword)) {
        return [uri, spec];
      }
    }
    return undefined;
  }

  public isSupportedKeyword(keyword: string): boolean {
    return (
      this.findSpecByName(keyword) !== undefined || this.findSpecByKeyword(keyword) !== undefined
    );
  }

  public resolve(nameOrKeyword: string): {
    uri: string;
    spec: ColorSpecification;
  } {
    const spec = this.findSpecByName(nameOrKeyword) || this.findSpecByKeyword(nameOrKeyword);
    if (spec) {
      return { uri: spec[0], spec: spec[1] };
    }

    throw new Error(`Color format '${nameOrKeyword}' not found.`);
  }
}
