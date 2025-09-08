import type {
  ColorConversion,
  ColorSpecification,
  Initializer,
} from "../../../types";
import { DynamicColorSymbol } from "../symbols/DynamicColorSymbol";

type ConversionFunction = any; // TODO: Define the type for a conversion function script/AST

export class ColorManager {
  // Maps color format name (e.g., "rgb") to its unique URI
  private colorNames: Map<string, string> = new Map();
  // Maps initializer keyword (e.g., "rgb") to the color format's unique URI
  private colorKeywords: Map<string, string> = new Map();

  // Maps a source format URI to a map of target format URIs and the conversion function
  // e.g., { "uri_rgb": { "uri_hsl": [Function] } }
  private colorTransforms: Map<string, Map<string, ConversionFunction>> =
    new Map();

  // Maps a color format's URI to its DynamicColorSymbol, which holds its schema and type info.
  private colorTypes: Map<string, DynamicColorSymbol> = new Map();

  /**
   * Registers a new color format based on its specification.
   * This method populates the manager's internal maps for names, keywords,
   * and transformations.
   * @param formatSpec The color format specification.
   * @param uri The unique identifier for this color format.
   */
  public setupColorFormat(formatSpec: ColorSpecification, uri: string): void {
    if (!uri) {
      throw new Error("Color format specification must have a URI.");
    }

    const name = formatSpec.name.toLowerCase();
    if (!name) {
      throw new Error("Color format specification must have a name.");
    }

    this.colorNames.set(name, uri);

    // Register initializer keywords
    for (const initializer of formatSpec.initializers) {
      this.colorKeywords.set(initializer.keyword, uri);
      // TODO: Parse and store the initializer script (initializer.script.script)
    }

    // Create and store the DynamicColorSymbol for this type
    const colorSymbol = new DynamicColorSymbol(
      name,
      uri,
      formatSpec.schema,
      this,
      this.colorTransforms,
    );
    this.colorTypes.set(uri, colorSymbol);

    // Register conversion functions
    for (const conversion of formatSpec.conversions) {
      const sourceUri = conversion.source === "$self" ? uri : conversion.source;
      const targetUri = conversion.target === "$self" ? uri : conversion.target;

      // TODO: The Python version removes versioning from the URI. Need to clarify if that's needed here.
      // sourceUri = this._removeVersionFromUri(sourceUri);
      // targetUri = this._removeVersionFromUri(targetUri);

      if (!this.colorTransforms.has(sourceUri)) {
        this.colorTransforms.set(sourceUri, new Map());
      }

      const sourceConversions = this.colorTransforms.get(sourceUri);
      if (sourceConversions?.has(targetUri)) {
        console.warn(
          `Conversion from ${sourceUri} to ${targetUri} already registered. Overwriting.`,
        );
      }

      // TODO: Parse and store the conversion script (conversion.script.script)
      sourceConversions?.set(targetUri, conversion.script.script);
    }
  }

  /**
   * Checks if a keyword is a registered color initializer or a color name.
   * @param keyword The keyword to check.
   * @returns True if the keyword is supported, false otherwise.
   */
  public isSupportedKeyword(keyword: string): boolean {
    return this.colorKeywords.has(keyword) || this.colorNames.has(keyword);
  }

  /**
   * Retrieves the specification for a color format by its name or initializer keyword.
   * @param name The name or keyword of the color format.
   * @returns The specification details of the color format.
   */
  public getColorSpecification(
    name: string,
  ): { id: string; name: string; symbol: DynamicColorSymbol } {
    if (!this.isSupportedKeyword(name)) {
      throw new Error(`Color format ${name} not found`);
    }

    const id = this.colorNames.get(name) ?? this.colorKeywords.get(name);
    if (!id) {
      throw new Error(`Could not resolve ID for color format ${name}`);
    }

    const symbol = this.colorTypes.get(id);
    if (!symbol) {
      throw new Error(`Internal error: No DynamicColorSymbol found for ID ${id}`);
    }

    return {
      id: id,
      name: symbol.typeName,
      symbol: symbol,
    };
  }
}
