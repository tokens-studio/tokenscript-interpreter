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

export class DynamicColorSymbol extends BaseSymbolType {
  public type: string;
  public _typeName: string;
  public _id: string;
  public _availableAttributes: any;
  public _values: Record<string, ISymbolType | null> = {};
  public _dataTypes: Record<string, any> = {};
  public _to?: ColorConversionProxy;

  constructor(typeName: string, id: string, availableAttributes: any) {
    super({});
    this._typeName = typeName;
    this._id = id;
    this._availableAttributes = availableAttributes;
    this.type = `Color.${typeName.toUpperCase()}`;
    for (const attr in availableAttributes.properties) {
      this._values[attr] = null;
      this._dataTypes[attr] = availableAttributes.properties[attr].type;
    }
  }

  valid_value(value: any): boolean {
    return value instanceof DynamicColorSymbol;
  }

  toString(): string {
    // If a stringify script is available, use it (for RGB, etc.)
    if ((this as any)._stringifyScript) {
      try {
        // Only support the default RGB format for now
        if (this._typeName.toLowerCase() === "rgb") {
          const r = this._values["r"]?.toString() ?? "0";
          const g = this._values["g"]?.toString() ?? "0";
          const b = this._values["b"]?.toString() ?? "0";
          return `rgb(${r}, ${g}, ${b})`;
        }
      } catch {
        // fallback below
      }
    }
    // fallback: generic
    const properties = this._availableAttributes?.properties || {};
    const parts: string[] = [];
    for (const [key, _] of Object.entries(properties)) {
      if (this._values[key] !== null && this._values[key] !== undefined) {
        parts.push(this._values[key]?.toString());
      }
    }
    return `${this._typeName.toLowerCase()}(${parts.join(", ")})`;
  }

  hasAttribute(attributeName: string): boolean {
    return this._availableAttributes?.properties?.[attributeName] !== undefined;
  }

  getAttribute(attributeName: string): ISymbolType | null {
    if (attributeName === "to" && this._to) return this._to as any;
    if (!this.hasAttribute(attributeName)) {
      throw new InterpreterError(
        `Color type ${this._typeName} does not have attribute '${attributeName}'`,
      );
    }
    return this._values[attributeName] || null;
  }

  setAttribute(attributeName: string, value: ISymbolType): void {
    if (!this.hasAttribute(attributeName)) {
      throw new InterpreterError(
        `Color type ${this._typeName} does not have attribute '${attributeName}'`,
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

  constructor(
    colorTransforms: Record<string, Record<string, ASTNode>>,
    sourceId: string,
  ) {
    this.colorTransforms = colorTransforms;
    this.sourceId = sourceId;
  }

  // Dynamically create conversion methods (e.g., .to.rgb())
  public get(target: string): (() => DynamicColorSymbol) | undefined {
    return (this as any)[target];
  }

  public get [Symbol.toStringTag]() {
    return "ColorConversionProxy";
  }

  public getProxy(): any {
    return new Proxy(this, {
      get: (target, prop: string) => {
        if (typeof prop !== "string") return undefined;
        return () => target.convertTo(prop);
      },
    });
  }

  private findConversionPath(source: string, target: string): string[] {
    if (source === target) return [source];
    const visited = new Set<string>([source]);
    const queue: Array<[string, string[]]> = [[source, [source]]];
    while (queue.length > 0) {
      const [current, path] = queue.shift()!;
      for (const next of Object.keys(this.colorTransforms[current] || {})) {
        if (next === target) return [...path, target];
        if (!visited.has(next)) {
          visited.add(next);
          queue.push([next, [...path, next]]);
        }
      }
    }
    return [];
  }

  private convertTo(targetName: string): DynamicColorSymbol {
    // Target type id
    const targetType = `https://schemas.tokens.studio/tokens/foundations/types/${targetName}.json`;
    const path = this.findConversionPath(this.sourceId, targetType);
    if (!path.length) {
      throw new InterpreterError(
        `No conversion path found from ${this.sourceId} to ${targetType}`,
      );
    }
    const result = this.sourceColor;
    for (let i = 0; i < path.length - 1; i++) {
      const src = path[i];
      const tgt = path[i + 1];
      const fn = this.colorTransforms[src]?.[tgt];
      if (!fn)
        throw new InterpreterError(`No conversion from ${src} to ${tgt}`);
      // TODO: Actually interpret the AST (fn) with the current color as input
      // For now, just throw to indicate this is where conversion would happen
      throw new InterpreterError("Color conversion execution not implemented");
    }
    return result!;
  }
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
    this.colorTypes[formatId] = new DynamicColorSymbol(
      name,
      formatId,
      formatSpec.schema,
    );

    // Register initializer functions
    if (!formatSpec.initializers) {
      throw new InterpreterError(
        "Color format specification must have initializers",
      );
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
        throw new InterpreterError(
          `Initializer function ${keyword} already registered`,
        );
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
        throw new InterpreterError(
          `Conversion from ${source} to ${target} already registered`,
        );
      }

      this.colorTransforms[source][target] = this.parseFunction(
        conversion.script,
      );
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
      colorType._availableAttributes,
    );
    // If input is provided, initialize the color values
    if (input && input instanceof ListSymbol) {
      // Use initializer function if available
      const initializerFn = this.functions[lowerName];
      if (initializerFn) {
        // TODO: Actually interpret the initializer AST with input
        // For now, just assign values for RGB as a placeholder
        if (lowerName === "rgb" && input.elements.length >= 3) {
          colorInstance.setAttribute("r", input.elements[0]);
          colorInstance.setAttribute("g", input.elements[1]);
          colorInstance.setAttribute("b", input.elements[2]);
        }
      }
    }
    // Attach conversion proxy
    colorInstance._to = new ColorConversionProxy(
      this.colorTransforms,
      colorType._id,
    );
    colorInstance._to.sourceColor = colorInstance;
    // Attach .to as a proxy for dynamic conversion
    (colorInstance as any).to = colorInstance._to.getProxy();
    // Attach stringify script if available (for toString)
    if ((colorType as any)._stringifyScript) {
      (colorInstance as any)._stringifyScript = (
        colorType as any
      )._stringifyScript;
    } else if ((this as any).stringify) {
      (colorInstance as any)._stringifyScript = (this as any).stringify;
    } else if ((colorType as any).stringify) {
      (colorInstance as any)._stringifyScript = (colorType as any).stringify;
    }
    // If the formatSpec has a stringify script, attach it
    if ((this as any).stringify) {
      (colorInstance as any)._stringifyScript = (this as any).stringify;
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

    throw new InterpreterError(
      `Color function ${name} execution not implemented`,
    );
  }
}
