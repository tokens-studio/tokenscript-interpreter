import type { ASTNode, ISymbolType } from "../types";
import { InterpreterError } from "./errors";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { BaseSymbolType, ListSymbol } from "./symbols";

// Color format specification interfaces
interface ColorFormatSpec {
  $type: string;
  $id: string;
  name: string;
  description: string;
  schema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
    additionalProperties: boolean;
  };
  initializers: ColorInitializer[];
  conversions: ColorConversion[];
  stringify: {
    type: string;
    script: string;
  };
}

interface ColorInitializer {
  $type: string;
  title: string;
  keyword: string;
  description: string;
  script: {
    type: string;
    script: string;
  };
}

interface ColorConversion {
  $type: string;
  source: string;
  target: string;
  description: string;
  lossless: boolean;
  script: {
    type: string;
    script: string;
  };
}

// Dynamic color symbol that can have custom attributes
export class DynamicColorSymbol extends BaseSymbolType {
  public type: string; // Implement the abstract property
  public _typeName: string;
  public _id: string;
  public _availableAttributes: any;
  public _values: Record<string, ISymbolType> = {};

  constructor(typeName: string, id: string, availableAttributes: any) {
    super({});
    this._typeName = typeName;
    this._id = id;
    this._availableAttributes = availableAttributes;
    this.type = `Color.${typeName.toUpperCase()}`;
  }

  valid_value(value: any): boolean {
    return value instanceof DynamicColorSymbol;
  }

  toString(): string {
    // Use stringify script if available, otherwise default format
    const properties = this._availableAttributes?.properties || {};
    const parts: string[] = [];

    for (const [key, _] of Object.entries(properties)) {
      if (this._values[key]) {
        parts.push(this._values[key].toString());
      }
    }

    return `${this._typeName.toLowerCase()}(${parts.join(", ")})`;
  }

  // Attribute access for color properties (r, g, b, etc.)
  hasAttribute(attributeName: string): boolean {
    return this._availableAttributes?.properties?.[attributeName] !== undefined;
  }

  getAttribute(attributeName: string): ISymbolType | null {
    if (!this.hasAttribute(attributeName)) {
      throw new InterpreterError(
        `Color type ${this._typeName} does not have attribute '${attributeName}'`
      );
    }
    return this._values[attributeName] || null;
  }

  setAttribute(attributeName: string, value: ISymbolType): void {
    if (!this.hasAttribute(attributeName)) {
      throw new InterpreterError(
        `Color type ${this._typeName} does not have attribute '${attributeName}'`
      );
    }
    this._values[attributeName] = value;
  }
}

// Color conversion proxy for handling .to.rgb() style conversions
export class ColorConversionProxy {
  private colorTransforms: Record<string, Record<string, ASTNode>>;
  private sourceId: string;
  public sourceColor: DynamicColorSymbol | null = null;

  constructor(colorTransforms: Record<string, Record<string, ASTNode>>, sourceId: string) {
    this.colorTransforms = colorTransforms;
    this.sourceId = sourceId;
  }

  // This would be called when accessing .to.rgb() etc.
  // For now, we'll implement basic structure
}

export class ColorManager {
  public colorTypes: Record<string, DynamicColorSymbol> = {}; // format ID -> type instance
  public colorTransforms: Record<string, Record<string, ASTNode>> = {}; // source -> target -> AST
  public functions: Record<string, ASTNode> = {}; // function name -> AST
  public names: Record<string, string> = {}; // format name -> format ID

  private static readonly SUPPORTED_SCRIPT_FORMATS = [
    "https://schemas.tokens.studio/tokens/foundations/tokens-script.json",
  ];

  private static readonly INITIALIZER_FUNCTION =
    "https://schemas.tokens.studio/tokens/foundations/types/color-initializer-function.json";

  setupColorFormat(formatSpec: ColorFormatSpec): void {
    const formatId = formatSpec.$id;
    if (!formatId) {
      throw new InterpreterError("Color format specification must have an $id");
    }

    const name = formatSpec.name?.toLowerCase();
    if (!name) {
      throw new InterpreterError("Color format specification must have a name");
    }

    this.names[name] = formatId;

    // Register the color type
    this.colorTypes[formatId] = new DynamicColorSymbol(name, formatId, formatSpec.schema);

    // Register initializer functions
    if (!formatSpec.initializers) {
      throw new InterpreterError("Color format specification must have initializers");
    }

    for (const initializer of formatSpec.initializers) {
      if (initializer.$type !== ColorManager.INITIALIZER_FUNCTION) {
        continue;
      }

      const keyword = initializer.keyword;
      if (!keyword) {
        throw new InterpreterError("Initializer must have a keyword");
      }

      if (keyword in this.functions) {
        throw new InterpreterError(`Initializer function ${keyword} already registered`);
      }

      this.functions[keyword] = this.parseFunction(initializer.script);
    }

    // Register conversions
    for (const conversion of formatSpec.conversions || []) {
      const source = conversion.source;
      const target = conversion.target;

      if (!source || !target) {
        throw new InterpreterError("Conversion must have a source and target");
      }

      if (!this.colorTransforms[source]) {
        this.colorTransforms[source] = {};
      }

      if (this.colorTransforms[source][target]) {
        throw new InterpreterError(`Conversion from ${source} to ${target} already registered`);
      }

      this.colorTransforms[source][target] = this.parseFunction(conversion.script);
    }
  }

  private parseFunction(scriptSpec: { type: string; script: string }): ASTNode {
    if (!scriptSpec.type) {
      throw new InterpreterError("Script must have a type");
    }

    // Remove fragment identifier if present
    const scriptType = scriptSpec.type.split("#")[0];

    if (!ColorManager.SUPPORTED_SCRIPT_FORMATS.includes(scriptType)) {
      throw new InterpreterError(`Script type ${scriptType} is not supported`);
    }

    // Parse the script into an AST
    const lexer = new Lexer(scriptSpec.script);
    const parser = new Parser(lexer);
    const ast = parser.parse();

    if (!ast) {
      throw new InterpreterError("Invalid script AST");
    }

    return ast;
  }

  initColorFormat(name: string, input?: ISymbolType): DynamicColorSymbol {
    const lowerName = name.toLowerCase();
    if (!(lowerName in this.names)) {
      throw new InterpreterError(`Color format ${name} not found`);
    }

    const formatId = this.names[lowerName];
    if (!(formatId in this.colorTypes)) {
      throw new InterpreterError(`Color format ${formatId} not found`);
    }

    // Create a new instance of the color type
    const colorType = this.colorTypes[formatId];
    const colorInstance = new DynamicColorSymbol(
      colorType._typeName,
      colorType._id,
      colorType._availableAttributes
    );

    // If input is provided, initialize the color values
    if (input && input instanceof ListSymbol) {
      // For RGB colors, set r, g, b values directly
      if (lowerName === "rgb" && input.elements.length >= 3) {
        colorInstance.setAttribute("r", input.elements[0]);
        colorInstance.setAttribute("g", input.elements[1]);
        colorInstance.setAttribute("b", input.elements[2]);
      }
    }

    return colorInstance;
  }

  // Get function for use by interpreter
  getFunction(name: string): ASTNode | undefined {
    return this.functions[name.toLowerCase()];
  }

  // Get color type constructor for use by symbol table
  getColorType(name: string): DynamicColorSymbol | undefined {
    const formatId = this.names[name.toLowerCase()];
    return formatId ? this.colorTypes[formatId] : undefined;
  }

  // Check if a function exists
  hasFunction(name: string): boolean {
    return name.toLowerCase() in this.functions;
  }

  // Execute a color function (like rgb(255, 0, 0))
  executeFunction(name: string, args: ISymbolType[]): ISymbolType {
    const lowerName = name.toLowerCase();
    if (!this.hasFunction(lowerName)) {
      throw new InterpreterError(`Color function ${name} not found`);
    }

    // For now, handle RGB function directly
    if (lowerName === "rgb" && args.length >= 3) {
      const rgbValues = new ListSymbol(args.slice(0, 3));
      return this.initColorFormat("rgb", rgbValues);
    }

    throw new InterpreterError(`Color function ${name} execution not implemented`);
  }
}
