import { type ISymbolType, SupportedFormats } from "../types";
import { InterpreterError } from "./errors";
import { isValidHex } from "./utils/color";
import { isNone, isNull, isObject, isString, isUndefined } from "./utils/type";

// Utilities -------------------------------------------------------------------

export const typeEquals = (typeA: string, typeB: string) =>
  typeA.toLowerCase() === typeB.toLowerCase();

// Base Type -------------------------------------------------------------------

type SupportedMethods = Record<string, MethodDefinitionDef>;

interface MethodArgumentDef {
  name: string;
  type: any; // Could be ISymbolType constructor or a special marker like SymbolSelfType
  optional?: boolean;
  unpack?: boolean;
}

interface MethodDefinitionDef {
  name?: string;
  function: (...args: any[]) => ISymbolType | null | undefined;
  args: MethodArgumentDef[];
  returnType: any; // Could be ISymbolType constructor or a special marker
}

export abstract class BaseSymbolType implements ISymbolType {
  abstract type: string;
  public value: any | null;
  _SUPPORTED_METHODS?: SupportedMethods;

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

  hasMethod?(methodName: string, args: ISymbolType[]): boolean {
    const methodDefinition = (this as unknown as { _SUPPORTED_METHODS?: SupportedMethods })
      ._SUPPORTED_METHODS?.[methodName.toLowerCase()];
    if (!methodDefinition) return false;

    const requiredArgs = methodDefinition.args.filter((arg: MethodArgumentDef) => !arg.optional);
    const hasUnpackArg = methodDefinition.args.some((arg: any) => arg.unpack);

    if (args.length < requiredArgs.length) {
      return false;
    }

    // If there's an unpack argument, allow any number of arguments >= required
    if (!hasUnpackArg && args.length > methodDefinition.args.length) {
      return false;
    }

    return true;
  }

  callMethod?(methodName: string, args: ISymbolType[]): ISymbolType | null | undefined {
    const methodDefinition = (this as unknown as { _SUPPORTED_METHODS?: SupportedMethods })
      ._SUPPORTED_METHODS?.[methodName.toLowerCase()];
    if (!methodDefinition || !this.hasMethod?.(methodName, args)) {
      throw new InterpreterError(
        `Method '${methodName}' not found or invalid arguments on type '${this.type}'.`,
      );
    }

    const processedArgs: ISymbolType[] = [];

    // Handle unpack arguments - if any argument has unpack: true, pass all remaining args to that parameter
    const unpackArgIndex = methodDefinition.args.findIndex(
      (argDef: MethodArgumentDef) => argDef.unpack,
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
    throw new InterpreterError(`Attribute '${attributeName}' not found on type '${this.type}'.`);
  }

  setAttribute?(attributeName: string, _value: ISymbolType): void {
    throw new InterpreterError(`Cannot set attribute '${attributeName}' on type '${this.type}'.`);
  }
}

// Concrete Symbol Types -------------------------------------------------------

type numberValue = number | null;

export class NumberSymbol extends BaseSymbolType {
  type = "Number";
  static readonly type = "Number";

  public value: numberValue;
  public isFloat: boolean;

  constructor(value: number | NumberSymbol | NumberWithUnitSymbol | null, isFloat = false) {
    let safeValue: numberValue;
    if (typeof value === "number") {
      safeValue = value;
    } else if (value instanceof NumberSymbol || value instanceof NumberWithUnitSymbol) {
      safeValue = value.value as number;
    } else if (value === null) {
      safeValue = null;
    } else {
      throw new InterpreterError(`Value must be int or float, got ${typeof value}.`);
    }
    super(safeValue);
    this.value = safeValue;
    this.isFloat = isFloat;
    this._SUPPORTED_METHODS = {
      tostring: {
        name: "toString",
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

  validValue(val: any): boolean {
    return typeof val === "number" || val instanceof NumberSymbol;
  }

  expectSafeValue(val: any): asserts val is number {
    if (val === null || val === undefined) {
      throw new InterpreterError("Value must be int or float, got null.");
    }
  }

  toString(): string {
    if (!this.isFloat) {
      return String(this.value);
    }
    return String(Number(this.value));
  }

  static empty(): NumberSymbol {
    return new NumberSymbol(null);
  }

  // Direct translation of to_string method from token_interpreter/symbols.py
  toStringImpl(radix?: NumberSymbol): StringSymbol {
    this.expectSafeValue(this.value);

    if (radix) {
      this.expectSafeValue(radix?.value);
    } else {
      return new StringSymbol(String(this.value));
    }

    // Convert to integer if it's a float but represents an integer
    let numValue: number;
    if (typeof this.value === "number" && Number.isInteger(this.value)) {
      numValue = Math.trunc(this.value);
    } else {
      numValue = this.value;
    }

    // Get the radix value
    const base = radix.value;

    // Validate the base
    if (!Number.isInteger(base) || base < 2 || base > 36) {
      throw new InterpreterError(`Invalid radix: ${base}. Must be between 2 and 36.`);
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
          result = `-${result}`;
        }

        return new StringSymbol(result);
      } else {
        // For non-integer values, simply return the string representation
        return new StringSymbol(String(this.value));
      }
    } catch (e) {
      throw new InterpreterError(`Error converting to base ${base}: ${String(e)}.`);
    }
  }
}

export class StringSymbol extends BaseSymbolType {
  type = "String";
  static readonly type = "String";

  public value: string | null;

  constructor(value: string | StringSymbol | null) {
    let safeValue: string | null;
    if (typeof value === "string") {
      safeValue = value;
    } else if (value instanceof StringSymbol) {
      safeValue = value.value;
    } else if (value === null) {
      safeValue = null;
    } else {
      throw new InterpreterError(`Value must be string, got ${typeof value}.`);
    }
    super(safeValue);
    this.value = safeValue;
    this._SUPPORTED_METHODS = {
      upper: { function: this.upperImpl, args: [], returnType: StringSymbol },
      lower: { function: this.lowerImpl, args: [], returnType: StringSymbol },
      length: { function: this.lengthImpl, args: [], returnType: NumberSymbol },
      concat: {
        function: this.concatImpl,
        args: [{ name: "other", type: StringSymbol }],
        returnType: StringSymbol,
      },
      split: {
        function: this.splitImpl,
        args: [{ name: "delimiter", type: StringSymbol, optional: true }],
        returnType: ListSymbol,
      },
    };
  }

  validValue(val: any): boolean {
    return typeof val === "string" || val instanceof StringSymbol;
  }

  expectSafeValue(val: any): asserts val is string {
    if (val === null || val === undefined) {
      throw new InterpreterError("Value must be a string, got null.");
    }
  }

  upperImpl(): StringSymbol {
    this.expectSafeValue(this.value);
    return new StringSymbol(this.value.toUpperCase());
  }

  static empty(): StringSymbol {
    return new StringSymbol(null);
  }

  lowerImpl(): StringSymbol {
    this.expectSafeValue(this.value);
    return new StringSymbol(this.value.toLowerCase());
  }

  lengthImpl(): NumberSymbol {
    this.expectSafeValue(this.value);
    return new NumberSymbol(this.value.length);
  }

  concatImpl(other: StringSymbol): StringSymbol {
    this.expectSafeValue(this.value);
    if (other instanceof StringSymbol) {
      other.expectSafeValue(other.value);
      return new StringSymbol(this.value + other.value);
    }
    throw new InterpreterError(`Cannot concatenate String ${typeof other} to String.`);
  }

  splitImpl(delimiter?: StringSymbol): ListSymbol {
    this.expectSafeValue(this.value);
    const strValue = this.value;

    if (delimiter instanceof StringSymbol) {
      const parts = strValue.split(delimiter.value as string);
      return new ListSymbol(parts.map((p) => new StringSymbol(p)));
    } else if (typeof delimiter === "string") {
      const parts = strValue.split(delimiter);
      return new ListSymbol(parts.map((p) => new StringSymbol(p)));
    } else if (delimiter === undefined || delimiter === null) {
      const parts = Array.from(strValue);
      return new ListSymbol(parts.map((p) => new StringSymbol(p)));
    }

    throw new InterpreterError(`Cannot split String by ${typeof delimiter}.`);
  }
}

export class BooleanSymbol extends BaseSymbolType {
  type = "Boolean";
  static readonly type = "Boolean";

  public value: boolean | null;
  constructor(value: boolean | BooleanSymbol | null) {
    let safeValue: boolean | null;
    if (typeof value === "boolean") {
      safeValue = value;
    } else if (value instanceof BooleanSymbol) {
      safeValue = value.value;
    } else if (value === null) {
      safeValue = null;
    } else {
      throw new InterpreterError(`Value must be boolean, got ${typeof value}.`);
    }
    super(safeValue);
    this.value = safeValue;
  }
  validValue(val: any): boolean {
    return typeof val === "boolean" || val instanceof BooleanSymbol;
  }

  expectSafeValue(val: any): asserts val is boolean {
    if (val === null || val === undefined) {
      throw new InterpreterError("Value must be a boolean, got null.");
    }
  }

  static empty(): BooleanSymbol {
    return new BooleanSymbol(null);
  }
}

export class ListSymbol extends BaseSymbolType {
  type = "List";
  static readonly type = "List";

  public value: ISymbolType[] | null;
  public elements: ISymbolType[];
  public isImplicit: boolean;

  constructor(elements: ISymbolType[] | null, isImplicit = false) {
    const safeElements = elements === null ? [] : elements;
    super(safeElements);
    this.value = safeElements;
    this.elements = safeElements;

    this.isImplicit = isImplicit;

    this._SUPPORTED_METHODS = {
      append: {
        function: this.appendImpl,
        args: [{ name: "item", type: BaseSymbolType, unpack: false }],
        returnType: ListSymbol,
      },
      extend: {
        function: this.extendImpl,
        args: [{ name: "items", type: BaseSymbolType, unpack: true }],
        returnType: ListSymbol,
      },
      insert: {
        function: this.insertImpl,
        args: [
          { name: "index", type: NumberSymbol },
          { name: "item", type: BaseSymbolType, unpack: false },
        ],
        returnType: ListSymbol,
      },
      delete: {
        function: this.deleteImpl,
        args: [{ name: "index", type: NumberSymbol }],
        returnType: ListSymbol,
      },
      length: { function: this.length, args: [], returnType: NumberSymbol },
      index: {
        function: this.indexImpl,
        args: [{ name: "item", type: BaseSymbolType, unpack: false }],
        returnType: NumberSymbol,
      },
      get: {
        function: this.getImpl,
        args: [{ name: "index", type: NumberSymbol }],
        returnType: BaseSymbolType,
      },
      update: {
        function: this.updateImpl,
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

  toString(): string {
    const delimiter = this.isImplicit ? " " : ", ";
    return this.elements.map((x) => (x.value === null ? "null" : x.toString())).join(delimiter);
  }

  appendImpl(item: ISymbolType): ListSymbol {
    this.elements.push(item);
    return this;
  }

  extendImpl(...items: ISymbolType[]): ListSymbol {
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

  insertImpl(indexSymbol: NumberSymbol, item: ISymbolType): ListSymbol {
    const index = indexSymbol.value as number;
    if (index < 0 || index > this.elements.length)
      throw new InterpreterError("Index out of range for insert.");
    this.elements.splice(index, 0, item);
    return this;
  }

  deleteImpl(indexSymbol: NumberSymbol): ListSymbol {
    const index = indexSymbol.value as number;
    if (index < 0 || index >= this.elements.length)
      throw new InterpreterError("Index out of range for delete.");
    this.elements.splice(index, 1);
    return this;
  }

  length(): NumberSymbol {
    return new NumberSymbol(this.elements.length);
  }

  indexImpl(item: ISymbolType): NumberSymbol {
    const idx = this.elements.findIndex((el) => el.equals(item));
    return new NumberSymbol(idx);
  }

  getImpl(indexSymbol: NumberSymbol): ISymbolType {
    const index = indexSymbol.value as number;
    if (index < 0 || index >= this.elements.length)
      throw new InterpreterError("Index out of range for get.");
    return this.elements[index];
  }

  updateImpl(indexSymbol: NumberSymbol, item: ISymbolType): ListSymbol {
    const index = indexSymbol.value as number;
    if (index < 0 || index >= this.elements.length)
      throw new InterpreterError("Index out of range for update.");
    this.elements[index] = item;
    return this;
  }

  static empty(): ListSymbol {
    return new ListSymbol(null);
  }
}

export class NumberWithUnitSymbol extends BaseSymbolType {
  type = "NumberWithUnit";
  static readonly type = "NumberWithUnit";

  public value: number | null;
  public unit: SupportedFormats;

  constructor(value: number | NumberSymbol | null, unit: SupportedFormats | string) {
    let safeValue: number | null;
    if (typeof value === "number") {
      safeValue = value;
    } else if (value instanceof NumberSymbol) {
      safeValue = value.value;
    } else if (value === null) {
      safeValue = null;
    } else {
      throw new InterpreterError(`Value must be number or NumberSymbol, got ${typeof value}.`);
    }
    super(safeValue);
    this.value = safeValue;

    if (typeof unit === "string" && !(Object.values(SupportedFormats) as string[]).includes(unit)) {
      throw new InterpreterError(`Invalid unit: ${unit}`);
    }
    this.unit = typeof unit === "string" ? (unit as SupportedFormats) : unit;

    this._SUPPORTED_METHODS = {
      tostring: {
        name: "toString",
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
    if (this.value === null) {
      throw new InterpreterError("Cannot convert null to string.");
    }
    return `${this.value}${this.unit}`;
  }

  expectSafeValue(val: any): asserts val is number {
    if (val === null || val === undefined) {
      throw new InterpreterError("Value must be a number, got null.");
    }
  }

  toStringImpl(): StringSymbol {
    this.expectSafeValue(this.value);
    return new StringSymbol(`${this.value}${this.unit}`);
  }

  to_number(): NumberSymbol {
    this.expectSafeValue(this.value);
    return new NumberSymbol(this.value);
  }

  static empty(): NumberWithUnitSymbol {
    return new NumberWithUnitSymbol(null, "px");
  }
}

export type dynamicColorValue = Record<string, ISymbolType>;

export class ColorSymbol extends BaseSymbolType {
  type = "Color";
  static readonly type = "Color";

  public subType: string | null = null;
  public value: string | dynamicColorValue | null;

  static empty(): ColorSymbol {
    return new ColorSymbol(null);
  }

  constructor(value: string | dynamicColorValue | null, subType?: string) {
    const isHex = (isUndefined(subType) || subType.toLowerCase() === 'hex') && isString(value)
    const isDynamic = (isString(subType) && isObject(value));
    const isValid = isNull(value) || isHex || isDynamic;

    if (!isValid) {
      throw new InterpreterError(
        `Value ${value} must be string, attributes record, or null, got ${typeof value}.`,
      );
    }

    if (isHex) {
      if (!isValidHex(value)) {
        throw new InterpreterError(`Invalid hex color format: ${value}`);
      }
    }

    super(value);

    this.value = value;
    this.subType = subType || null;

    this._SUPPORTED_METHODS = {
      tostring: {
        name: "toString",
        function: this.toStringImpl,
        args: [],
        returnType: StringSymbol,
      },
    };
  }

  toStringImpl(): StringSymbol {
    if (isObject(this.value)) {
      return new StringSymbol(JSON.stringify(this.value));
    }
    if (isString(this.value)) {
      return new StringSymbol(this.value);
    }
    return new StringSymbol("");
  }

  isHex(): boolean {
    return this.subType?.toLowerCase() === "hex";
  }

  validValue(val: any): boolean {
    return val instanceof ColorSymbol || isNull(val) || isObject(val) || isValidHex(val);
  }

  hasAttribute(attributeName: string): boolean {
    // For dynamic colors (object values), check if the attribute exists
    if (isObject(this.value)) {
      return attributeName in this.value;
    }
    
    // For hex colors and null values, no attributes are supported
    return false;
  }

  getAttribute(attributeName: string): ISymbolType | null {
    if (isObject(this.value)) {
      const attributeValue = this.value[attributeName];
      if (attributeValue !== undefined) {
        return attributeValue;
      }
    }
    
    throw new InterpreterError(`Attribute '${attributeName}' not found on Color.`);
  }
}

// Utilities -------------------------------------------------------------------

export const jsValueToSymbolType = (value: any): ISymbolType => {
  if (value instanceof BaseSymbolType) return value;
  if (typeof value === "number") return new NumberSymbol(value);
  if (typeof value === "string") {
    if (isValidHex(value)) return new ColorSymbol(value);
    return new StringSymbol(value);
  }
  if (typeof value === "boolean") return new BooleanSymbol(value);
  if (Array.isArray(value)) return new ListSymbol(value.map(jsValueToSymbolType));

  if (value instanceof NumberWithUnitSymbol) return value;
  const numberWithUnit = NumberWithUnitSymbol.fromRecord(value);
  if (numberWithUnit) return numberWithUnit;

  throw new InterpreterError(`Invalid value type: ${typeof value}`);
};

export const basicSymbolTypes = {
  [NumberSymbol.type.toLowerCase()]: NumberSymbol,
  [StringSymbol.type.toLowerCase()]: StringSymbol,
  [BooleanSymbol.type.toLowerCase()]: BooleanSymbol,
  [ListSymbol.type.toLowerCase()]: ListSymbol,
  [NumberWithUnitSymbol.type.toLowerCase()]: NumberWithUnitSymbol,
  [ColorSymbol.type.toLowerCase()]: ColorSymbol,
} as const;

export type BasicSymbolTypeConstructor = (typeof basicSymbolTypes)[keyof typeof basicSymbolTypes];
