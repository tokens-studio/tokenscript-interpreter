import type { ColorSpecification } from "../../types";
import type { ColorManager } from "../config/managers/ColorManager";
import { ColorConversionProxy } from "./ColorConversionProxy";

/**
 * Represents the "type" or "schema" of a dynamic color format.
 *
 * In the Python version, this class acts as a runtime-generated template for a color type.
 * It knows the attributes of the color (e.g., 'r', 'g', 'b' for RGB), its name, and its unique ID.
 * It also creates the conversion proxy associated with this color type.
 */
export class DynamicColorSymbol {
  public readonly typeName: string;
  public readonly id: string;
  public readonly availableAttributes: Record<string, any>; // Simplified schema
  public readonly conversionProxy: ColorConversionProxy;

  constructor(
    typeName: string,
    id: string,
    schema: Record<string, any>,
    manager: ColorManager,
    colorTransforms: Map<string, Map<string, any>>,
  ) {
    this.typeName = typeName;
    this.id = id;
    this.availableAttributes = schema;

    this.conversionProxy = new ColorConversionProxy(
      colorTransforms,
      id, // source_type
      manager,
    );
  }

  // In the Python version, this class is callable and acts as a factory for Color instances.
  // We will handle instance creation elsewhere in a more TypeScript-idiomatic way,
  // but this class still holds the "template" for the color type.
}
