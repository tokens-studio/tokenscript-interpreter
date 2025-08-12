import { type ISymbolType, SupportedFormats } from "../types";
import { InterpreterError } from "./errors";

// Base class for all symbols
export abstract class BaseSymbolType implements ISymbolType {
  abstract type: string;
  public value: any;

  constructor(value: any) {
    this.value = value;
  }

  abstract validValue(value: any): boolean;

  toString(): string {
    return String(this.value);
  }

  equals(other: ISymbolType): boolean {
    return this.type === other.type && this.value === other.value;
  }

  // Custom JSON serialization to follow W3C Design Tokens spec format
  toJSON(): any {
    return {
      $value: this.value,
      $type: this.type.toLowerCase(),
    };
  }

  hasMethod?(methodName: string, args: ISymbolType[]): boolean {
    const methodDefinition = (this as any)._SUPPORTED_METHODS?.[
      methodName.toLowerCase()
    ];
    if (!methodDefinition) return false;

    const requiredArgs = methodDefinition.args.filter(
      (arg: any) => !arg.optional,
    );
    const hasUnpackArg = methodDefinition.args.some((arg: any) => arg.unpack);

    if (args.length < requiredArgs.length) {
      return false;
    }

    // If there's an unpack argument, allow any number of arguments >= required
    if (!hasUnpackArg && args.length > methodDefinition.args.length) {
      return false;
    }

    // Basic type checking can be added here if needed
    return true;
  }

  callMethod?(
    methodName: string,
    args: ISymbolType[],
  ): ISymbolType | null | undefined {
    const methodDefinition = (this as any)._SUPPORTED_METHODS?.[
      methodName.toLowerCase()
    ];
    if (!methodDefinition || !this.hasMethod?.(methodName, args)) {
      throw new InterpreterError(
        `Method '${methodName}' not found or invalid arguments on type '${this.type}'.`,
      );
    }

    const processedArgs: any[] = [];

    // Handle unpack arguments - if any argument has unpack: true, pass all remaining args to that parameter
    const unpackArgIndex = methodDefinition.args.findIndex(
      (argDef: any) => argDef.unpack,
    );

    if (unpackArgIndex !== -1) {
      // Add regular arguments before the unpack argument
      for (let i = 0; i < unpackArgIndex; i++) {
        if (args[i] !== undefined) {
          processedArgs.push(args[i]);
        } else if (!methodDefinition.args[i].optional) {
          throw new InterpreterError(
            `Missing required argument '${methodDefinition.args[i].name}' for method '${methodName}'.`,
          );
        }
      }
      // Add all remaining arguments as unpacked arguments
      processedArgs.push(...args.slice(unpackArgIndex));
    } else {
      // No unpack arguments, process normally
      methodDefinition.args.forEach((argDef: any, index: number) => {
        if (args[index] !== undefined) {
          processedArgs.push(args[index]);
        } else if (!argDef.optional) {
          throw new InterpreterError(
            `Missing required argument '${argDef.name}' for method '${methodName}'.`,
          );
        }
      });
    }

    return methodDefinition.function.call(this, ...processedArgs);
  }

  hasAttribute?(_attributeName: string): boolean {
    return false; // Base implementation
  }

  getAttribute?(attributeName: string): ISymbolType | null {
    throw new InterpreterError(
      `Attribute '${attributeName}' not found on type '${this.type}'.`,
    );
  }

  setAttribute?(attributeName: string, _value: ISymbolType): void {
    throw new InterpreterError(
      `Cannot set attribute '${attributeName}' on type '${this.type}'.`,
    );
  }
}

interface MethodArgumentDef {
  name: string;
  type: any; // Could be ISymbolType constructor or a special marker like SymbolSelfType
  optional?: boolean;
  unpack?: boolean;
}

interface MethodDefinitionDef {
  function: (...args: any[]) => ISymbolType | null | undefined;
  args: MethodArgumentDef[];
  returnType: any; // Could be ISymbolType constructor or a special marker
}

// --- Concrete Symbol Types ---

export class NumberSymbol extends BaseSymbolType {
  type = "Number";
  public isFloat: boolean;

  constructor(
    value: number | NumberSymbol | NumberWithUnitSymbol | null,
    isFloat = false,
  ) {
    let numValue: number;
    if (
      value instanceof NumberSymbol ||
      value instanceof NumberWithUnitSymbol
    ) {
      numValue = value.value as number;
    } else if (typeof value === "number") {
      numValue = value;
    } else if (value === null) {
      numValue = 0; // Default to 0 if value is null
    } else {
      throw new InterpreterError(
        `Value must be int or float, got ${typeof value}.`,
      );
    }
    super(numValue);
    this.isFloat = isFloat;
    this._SUPPORTED_METHODS = {
      to_string: {
        function: this.toStringImpl,
        args: [
          {
            name: "radix",
            type: NumberSymbol,
            optional: true,
          },
        ],
        returnType: StringSymbol,
      },
    };
  }

  _SUPPORTED_METHODS: Record<string, MethodDefinitionDef>;

  validValue(val: any): boolean {
    return typeof val === "number" || val instanceof NumberSymbol;
  }

  toString(): string {
    if (!this.isFloat) {
      if (typeof this.value === "number" && Number.isInteger(this.value)) {
        return String(Math.trunc(this.value));
      } else if (Number.isInteger(this.value)) {
        return String(this.value);
      }
    }
    return String(Number(this.value));
  }

  toStringImpl(radix?: NumberSymbol): StringSymbol {
    if (radix === undefined) {
      return new StringSymbol(String(this.value));
    }

    // Convert to integer if it's a float but represents an integer
    let numValue: number;
    if (typeof this.value === "number" && Number.isInteger(this.value)) {
      numValue = Math.trunc(this.value);
    } else {
      numValue = Number.isInteger(this.value) ? this.value : this.value;
    }

    // Get the radix value
    const base = radix.value;

    // Validate the base
    if (!Number.isInteger(base) || base < 2 || base > 36) {
      throw new InterpreterError(
        `Invalid radix: ${base}. Must be between 2 and 36.`,
      );
    }

    // Perform the base conversion
    try {
      if (Number.isInteger(numValue)) {
        let result = "";

        // Handle negative numbers
        const isNegative = numValue < 0;
        if (isNegative) {
          numValue = Math.abs(numValue);
        }

        // Special case for zero
        if (numValue === 0) {
          return new StringSymbol("0");
        }

        // Convert to the specified base
        const digits = "0123456789abcdefghijklmnopqrstuvwxyz";
        while (numValue > 0) {
          result = digits[numValue % base] + result;
          numValue = Math.floor(numValue / base);
        }

        // Add negative sign if needed
        if (isNegative) {
          result = "-" + result;
        }

        return new StringSymbol(result);
      } else {
        // For non-integer values, simply return the string representation
        return new StringSymbol(String(this.value));
      }
    } catch (e) {
      throw new InterpreterError(
        `Error converting to base ${base}: ${String(e)}.`,
      );
    }
  }
}

export class StringSymbol extends BaseSymbolType {
  type = "String";
  _SUPPORTED_METHODS: Record<string, MethodDefinitionDef>;

  constructor(value: string | StringSymbol | null) {
    super(
      value instanceof StringSymbol ? value.value : value === null ? "" : value,
    );
    this._SUPPORTED_METHODS = {
      upper: { function: this.upper, args: [], returnType: StringSymbol },
      lower: { function: this.lower, args: [], returnType: StringSymbol },
      trim: { function: this.trim, args: [], returnType: StringSymbol },
      length: { function: this.length, args: [], returnType: NumberSymbol },
      concat: {
        function: this.concat,
        args: [{ name: "other", type: StringSymbol }],
        returnType: StringSymbol,
      },
      split: {
        function: this.split,
        args: [{ name: "delimiter", type: StringSymbol, optional: true }],
        returnType: ListSymbol,
      },
    };
  }

  validValue(val: any): boolean {
    return typeof val === "string" || val instanceof StringSymbol;
  }

  upper(): StringSymbol {
    return new StringSymbol(this.value.toUpperCase());
  }
  lower(): StringSymbol {
    return new StringSymbol(this.value.toLowerCase());
  }
  trim(): StringSymbol {
    return new StringSymbol(this.value.trim());
  }
  length(): NumberSymbol {
    return new NumberSymbol(this.value.length);
  }

  concat(other: StringSymbol): StringSymbol {
    if (other instanceof StringSymbol) {
      return new StringSymbol(this.value + other.value);
    }
    throw new InterpreterError(
      `Cannot concatenate String with ${typeof other}`,
    );
  }

  split(delimiter?: StringSymbol): ListSymbol {
    const strValue = this.value as string;
    let parts: string[];
    if (delimiter === undefined) {
      parts = strValue.split("");
    } else {
      parts = strValue.split(delimiter.value as string);
    }
    return new ListSymbol(parts.map((p) => new StringSymbol(p)));
  }
}

export class BooleanSymbol extends BaseSymbolType {
  type = "Boolean";
  constructor(value: boolean | BooleanSymbol | null) {
    super(
      value instanceof BooleanSymbol
        ? value.value
        : value === null
          ? false
          : value,
    );
  }
  validValue(val: any): boolean {
    return typeof val === "boolean" || val instanceof BooleanSymbol;
  }
}

export class ListSymbol extends BaseSymbolType {
  type = "List";
  public elements: ISymbolType[];
  public isImplicit: boolean;
  _SUPPORTED_METHODS: Record<string, MethodDefinitionDef>;

  constructor(elements: ISymbolType[] | null, isImplicit = false) {
    super(elements === null ? [] : elements);
    this.elements = elements === null ? [] : elements;
    this.isImplicit = isImplicit;
    this._SUPPORTED_METHODS = {
      append: {
        function: this.append,
        args: [{ name: "item", type: BaseSymbolType, unpack: false }],
        returnType: ListSymbol,
      },
      extend: {
        function: this.extend,
        args: [{ name: "items", type: BaseSymbolType, unpack: true }],
        returnType: ListSymbol,
      },
      insert: {
        function: this.insert,
        args: [
          { name: "index", type: NumberSymbol },
          { name: "item", type: BaseSymbolType, unpack: false },
        ],
        returnType: ListSymbol,
      },
      delete: {
        function: this.delete,
        args: [{ name: "index", type: NumberSymbol }],
        returnType: ListSymbol,
      },
      length: { function: this.length, args: [], returnType: NumberSymbol },
      index: {
        function: this.index,
        args: [{ name: "item", type: BaseSymbolType, unpack: false }],
        returnType: NumberSymbol,
      },
      get: {
        function: this.get,
        args: [{ name: "index", type: NumberSymbol }],
        returnType: BaseSymbolType,
      },
      update: {
        function: this.update,
        args: [
          { name: "index", type: NumberSymbol },
          { name: "item", type: BaseSymbolType, unpack: false },
        ],
        returnType: ListSymbol,
      },
    };
  }

  validValue(val: any): boolean {
    return Array.isArray(val) || val instanceof ListSymbol;
  }

  // Custom JSON serialization for lists
  toJSON(): any {
    return {
      $value: this.elements.map((element) =>
        element.toJSON ? element.toJSON() : element,
      ),
      $type: this.type.toLowerCase(),
    };
  }

  toString(): string {
    if (this.isImplicit) {
      // Check if any element is exactly a single space string - this indicates explicit spacing
      const hasExplicitSingleSpaces = this.elements.some(
        (e) => e instanceof StringSymbol && e.value === " ",
      );

      if (hasExplicitSingleSpaces) {
        // Direct concatenation when single space strings are present
        return this.elements.map((e) => e.toString()).join("");
      }

      // For other cases, use smart concatenation based on leading/trailing spaces
      let result = "";

      for (let i = 0; i < this.elements.length; i++) {
        const current = this.elements[i].toString();

        if (i === 0) {
          // First element, just add it
          result += current;
        } else {
          const previous = this.elements[i - 1];
          const currentElement = this.elements[i];

          // Check if previous element ends with space or current element starts with space
          const prevEndsWithSpace =
            previous instanceof StringSymbol &&
            typeof previous.value === "string" &&
            previous.value.endsWith(" ");
          const currentStartsWithSpace =
            currentElement instanceof StringSymbol &&
            typeof currentElement.value === "string" &&
            currentElement.value.startsWith(" ");

          if (prevEndsWithSpace || currentStartsWithSpace) {
            // No additional space needed
            result += current;
          } else {
            // Add space between elements
            result += ` ${current}`;
          }
        }
      }

      return result;
    }
    // Comma separation for explicit lists
    return this.elements.map((e) => e.toString()).join(", ");
  }

  append(item: ISymbolType): ListSymbol {
    this.elements.push(item);
    return this;
  }
  extend(...items: ISymbolType[]): ListSymbol {
    // Handle both individual arguments and ListSymbol arguments
    for (const item of items) {
      if (item instanceof ListSymbol) {
        this.elements.push(...item.elements);
      } else {
        this.elements.push(item);
      }
    }
    return this;
  }
  insert(indexSymbol: NumberSymbol, item: ISymbolType): ListSymbol {
    const index = indexSymbol.value as number;
    if (index < 0 || index > this.elements.length)
      throw new InterpreterError("Index out of range for insert.");
    this.elements.splice(index, 0, item);
    return this;
  }
  delete(indexSymbol: NumberSymbol): ListSymbol {
    const index = indexSymbol.value as number;
    if (index < 0 || index >= this.elements.length)
      throw new InterpreterError("Index out of range for delete.");
    this.elements.splice(index, 1);
    return this;
  }
  length(): NumberSymbol {
    return new NumberSymbol(this.elements.length);
  }
  index(item: ISymbolType): NumberSymbol {
    const idx = this.elements.findIndex((el) => el.equals(item));
    return new NumberSymbol(idx);
  }
  get(indexSymbol: NumberSymbol): ISymbolType {
    const index = indexSymbol.value as number;
    if (index < 0 || index >= this.elements.length)
      throw new InterpreterError("Index out of range for get.");
    return this.elements[index];
  }
  update(indexSymbol: NumberSymbol, item: ISymbolType): ListSymbol {
    const index = indexSymbol.value as number;
    if (index < 0 || index >= this.elements.length)
      throw new InterpreterError("Index out of range for update.");
    this.elements[index] = item;
    return this;
  }
}

export class NumberWithUnitSymbol extends BaseSymbolType {
  type = "NumberWithUnit";
  public unit: SupportedFormats;
  _SUPPORTED_METHODS: Record<string, MethodDefinitionDef>;

  constructor(
    value: number | NumberSymbol | null,
    unit: SupportedFormats | string,
  ) {
    const numValue =
      value instanceof NumberSymbol ? value.value : value === null ? 0 : value;
    super(numValue);
    if (
      typeof unit === "string" &&
      !(Object.values(SupportedFormats) as string[]).includes(unit)
    ) {
      throw new InterpreterError(`Invalid unit: ${unit}`);
    }
    this.unit = typeof unit === "string" ? (unit as SupportedFormats) : unit;

    this._SUPPORTED_METHODS = {
      to_string: {
        function: this.toStringImpl,
        args: [],
        returnType: StringSymbol,
      },
      to_number: {
        function: this.to_number,
        args: [],
        returnType: NumberSymbol,
      },
    };
  }

  validValue(val: any): boolean {
    return val instanceof NumberWithUnitSymbol;
  }

  static fromRecord(record: {
    value: number | string;
    unit: string;
    type?: string;
  }): NumberWithUnitSymbol | undefined {
    if (record === null || typeof record !== "object") return;
    if (record.type !== "NumberWithUnit") return;
    if (!record.value && !record.unit) return;
    if (typeof record.value !== "number") return;

    return new NumberWithUnitSymbol(record.value, record.unit);
  }

  toString(): string {
    return `${this.value}${this.unit}`;
  }

  // Custom JSON serialization for numbers with units
  toJSON(): any {
    return {
      $value: this.toString(), // Include unit in the value
      $type: "dimension", // Use standard dimension type for numbers with units
    };
  }

  toStringImpl(): StringSymbol {
    return new StringSymbol(this.toString());
  }
  to_number(): NumberSymbol {
    return new NumberSymbol(this.value as number);
  }
}

export class ColorSymbol extends BaseSymbolType {
  type = "Color"; // Base color type, typically hex
  _SUPPORTED_METHODS: Record<string, MethodDefinitionDef>;

  constructor(value: string | null) {
    const effectiveValue = value === null ? "#000000" : value; // Default to black if null
    super(effectiveValue);
    if (!ColorSymbol.isValidHex(effectiveValue)) {
      throw new InterpreterError(`Invalid hex color format: ${effectiveValue}`);
    }

    // Add string methods to Color since it's essentially a string
    this._SUPPORTED_METHODS = {
      split: {
        function: this.split,
        args: [{ name: "delimiter", type: StringSymbol, optional: true }],
        returnType: ListSymbol,
      },
      upper: { function: this.upper, args: [], returnType: StringSymbol },
      lower: { function: this.lower, args: [], returnType: StringSymbol },
      length: { function: this.length, args: [], returnType: NumberSymbol },
      concat: {
        function: this.concat,
        args: [{ name: "other", type: StringSymbol }],
        returnType: StringSymbol,
      },
    };
  }

  static isValidHex(value: string): boolean {
    if (typeof value !== "string") return false;
    if (!value.startsWith("#")) return false;
    const hexPart = value.substring(1);
    if (!(hexPart.length === 3 || hexPart.length === 6)) return false;
    for (let i = 0; i < hexPart.length; i++) {
      const char = hexPart[i].toLowerCase();
      if (!((char >= "0" && char <= "9") || (char >= "a" && char <= "f"))) {
        return false;
      }
    }
    return true;
  }

  validValue(val: any): boolean {
    // Accept other ColorSymbol instances
    if (val instanceof ColorSymbol) {
      return true;
    }
    // Accept valid hex color strings
    return typeof val === "string" && ColorSymbol.isValidHex(val);
  }

  // String-like methods for Color
  split(delimiter?: StringSymbol): ListSymbol {
    const strValue = this.value as string;
    let parts: string[];
    if (delimiter === undefined) {
      parts = strValue.split("");
    } else {
      parts = strValue.split(delimiter.value as string);
    }
    return new ListSymbol(parts.map((p) => new StringSymbol(p)));
  }

  upper(): StringSymbol {
    return new StringSymbol((this.value as string).toUpperCase());
  }

  lower(): StringSymbol {
    return new StringSymbol((this.value as string).toLowerCase());
  }

  length(): NumberSymbol {
    return new NumberSymbol((this.value as string).length);
  }

  concat(other: StringSymbol): StringSymbol {
    if (other instanceof StringSymbol) {
      return new StringSymbol((this.value as string) + other.value);
    }
    throw new InterpreterError(`Cannot concatenate Color with ${typeof other}`);
  }
}
