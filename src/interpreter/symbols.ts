import { type ISymbolType, SupportedFormats } from "@src/types";
import type { Config } from "./config/config";
import { InterpreterError } from "./errors";
import { isValidHex } from "./utils/color";
import { capitalize } from "./utils/string";
import {
  isArray,
  isBoolean,
  isMap,
  isNone,
  isNull,
  isNumber,
  isObject,
  isString,
  isUndefined,
  nullToUndefined,
} from "./utils/type";

// Utilities -------------------------------------------------------------------

export const typeEquals = (typeA: string | null, typeB: string | null) =>
  typeA?.toLowerCase() === typeB?.toLowerCase();

/**
 * Constructs captialized type name from `base` and `sub?`
 * E.g.: base = color, sub = hex => Color.Hex
 *       base = COLOR => Color
 */
const typeName = (base: string, sub?: string): string => {
  const baseStr = capitalize(base);
  if (sub) {
    const subStr = capitalize(sub);
    return `${baseStr}.${subStr}`;
  }
  return baseStr;
};

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
  static _SUPPORTED_METHODS?: SupportedMethods;

  constructor(value: any) {
    this.value = value;
  }

  abstract validValue(value: any): boolean;

  toString(): string {
    return String(this.value);
  }

  getTypeName(): string {
    return this.type;
  }

  typeEquals(other: ISymbolType): boolean {
    return typeEquals(this.type, other.type);
  }

  equals(other: ISymbolType): boolean {
    return this.typeEquals(other) && this.value === other.value;
  }

  hasMethod?(methodName: string, args: ISymbolType[]): boolean {
    const methodDefinition = (this.constructor as any)._SUPPORTED_METHODS?.[
      methodName.toLowerCase()
    ];
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

  callMethod?(
    methodName: string,
    args: ISymbolType[],
    _config: Config,
  ): ISymbolType | null | undefined {
    const methodDefinition = (this.constructor as any)._SUPPORTED_METHODS?.[
      methodName.toLowerCase()
    ];
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
    return false;
  }

  getAttribute?(attributeName: string): ISymbolType | null {
    throw new InterpreterError(`Attribute '${attributeName}' not found on type '${this.type}'.`);
  }

  setAttribute?(attributeName: string, _value: ISymbolType): void {
    throw new InterpreterError(`Cannot set attribute '${attributeName}' on type '${this.type}'.`);
  }
}

// Concrete Symbol Types -------------------------------------------------------

/**
 * Null type to differentiate from null values from the host language
 * Methods returning `null` should return this type, also as empty variables should keep this.
 * Host language `null` or `undefined` will crash when used as values during intepretation.
 */
export class NullSymbol extends BaseSymbolType {
  type = "Null";
  static readonly type = "Null";

  constructor() {
    super(null);
  }

  validValue(val: any): boolean {
    return isNone(val);
  }

  toString(): string {
    return "null";
  }

  equals(other: ISymbolType): boolean {
    return other instanceof NullSymbol;
  }

  static empty(): NullSymbol {
    return new NullSymbol();
  }
}

type numberValue = number | null;

export class NumberSymbol extends BaseSymbolType {
  type = "Number";
  static readonly type = "Number";
  static _SUPPORTED_METHODS = {
    tostring: {
      name: "toString",
      function: function (this: NumberSymbol, radix?: NumberSymbol) {
        return this.toStringImpl(radix);
      },
      args: [
        {
          name: "radix",
          type: "Number",
          optional: true,
        },
      ],
      returnType: "String",
    },
  };

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

  hasAttribute(attributeName: string): boolean {
    return attributeName === "value";
  }

  getAttribute(attributeName: string): ISymbolType | null {
    if (attributeName === "value") {
      return new NumberSymbol(this.value);
    }
    throw new InterpreterError(`Attribute '${attributeName}' not found on Number.`);
  }

  // Direct translation of to_string method from token_interpreter/symbols.py
  toStringImpl(radix?: NumberSymbol): StringSymbol {
    this.expectSafeValue(this.value);

    if (radix) {
      this.expectSafeValue(radix?.value);
    } else {
      return new StringSymbol(String(this.value));
    }

    const base = radix.value;
    if (!Number.isInteger(base) || base < 2 || base > 36) {
      throw new InterpreterError(`Invalid radix: ${base}. Must be between 2 and 36.`);
    }

    let numValue: number;
    if (base === 16) {
      numValue = Math.round(this.value);
      // For hexadecimal, round non-integer values (with .5 rounding down)
      // Otherwise color conversion to hex wont work as expected
      const fractionalPart = Math.abs(this.value % 1);
      if (fractionalPart === 0.5) {
        // .5 cases round down (towards negative infinity)
        numValue = Math.floor(this.value);
      } else {
        // Normal rounding for other fractional parts
        numValue = Math.round(this.value);
      }
    } else {
      numValue = this.value;
    }

    try {
      if (Number.isInteger(numValue) && radix) {
        return new StringSymbol(numValue.toString(base));
      } else {
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
  static _SUPPORTED_METHODS = {
    upper: {
      function: function (this: StringSymbol) {
        return this.upperImpl();
      },
      args: [],
      returnType: "String",
    },
    lower: {
      function: function (this: StringSymbol) {
        return this.lowerImpl();
      },
      args: [],
      returnType: "String",
    },
    length: {
      function: function (this: StringSymbol) {
        return this.lengthImpl();
      },
      args: [],
      returnType: "Number",
    },
    concat: {
      function: function (this: StringSymbol, other: StringSymbol) {
        return this.concatImpl(other);
      },
      args: [{ name: "other", type: "String" }],
      returnType: "String",
    },
    split: {
      function: function (this: StringSymbol, delimiter?: StringSymbol) {
        return this.splitImpl(delimiter);
      },
      args: [{ name: "delimiter", type: "String", optional: true }],
      returnType: "List",
    },
  };

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
  static _SUPPORTED_METHODS = {
    append: {
      function: function (this: ListSymbol, item: ISymbolType) {
        return this.appendImpl(item);
      },
      args: [{ name: "item", type: "any", unpack: false }],
      returnType: "List",
    },
    extend: {
      function: function (this: ListSymbol, ...items: ISymbolType[]) {
        return this.extendImpl(...items);
      },
      args: [{ name: "items", type: "any", unpack: true }],
      returnType: "List",
    },
    insert: {
      function: function (this: ListSymbol, index: NumberSymbol, item: ISymbolType) {
        return this.insertImpl(index, item);
      },
      args: [
        { name: "index", type: "Number" },
        { name: "item", type: "any", unpack: false },
      ],
      returnType: "List",
    },
    delete: {
      function: function (this: ListSymbol, index: NumberSymbol) {
        return this.deleteImpl(index);
      },
      args: [{ name: "index", type: "Number" }],
      returnType: "List",
    },
    length: {
      function: function (this: ListSymbol) {
        return this.length();
      },
      args: [],
      returnType: "Number",
    },
    index: {
      function: function (this: ListSymbol, item: ISymbolType) {
        return this.indexImpl(item);
      },
      args: [{ name: "item", type: "any", unpack: false }],
      returnType: "Number",
    },
    get: {
      function: function (this: ListSymbol, index: NumberSymbol) {
        return this.getImpl(index);
      },
      args: [{ name: "index", type: "Number" }],
      returnType: "any",
    },
    update: {
      function: function (this: ListSymbol, index: NumberSymbol, item: ISymbolType) {
        return this.updateImpl(index, item);
      },
      args: [
        { name: "index", type: "Number" },
        { name: "item", type: "any", unpack: false },
      ],
      returnType: "List",
    },
    join: {
      function: function (this: ListSymbol, separator?: StringSymbol) {
        return this.joinImpl(separator);
      },
      args: [{ name: "separator", type: "String", optional: true }],
      returnType: "String",
    },
  };

  public value: ISymbolType[] | null;
  public elements: ISymbolType[];
  public isImplicit: boolean;

  constructor(elements: ISymbolType[] | null, isImplicit = false) {
    const safeElements = elements === null ? [] : elements;
    super(safeElements);
    this.value = safeElements;
    this.elements = safeElements;
    this.isImplicit = isImplicit;
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
      throw new InterpreterError("Index out of range for deletion.");
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

  joinImpl(separator?: StringSymbol): StringSymbol {
    const sep = separator?.value || "";
    const stringElements = this.elements.map((element) => {
      if (element.value === null) {
        return "null";
      }
      return element.toString();
    });
    return new StringSymbol(stringElements.join(sep));
  }

  static empty(): ListSymbol {
    return new ListSymbol(null);
  }

  getTypeName(): string {
    return this.isImplicit ? typeName(this.type, "Implicit") : typeName(this.type);
  }
}

export class NumberWithUnitSymbol extends BaseSymbolType {
  type = "NumberWithUnit";
  static readonly type = "NumberWithUnit";
  static _SUPPORTED_METHODS = {
    tostring: {
      name: "toString",
      function: function (this: NumberWithUnitSymbol) {
        return this.toStringImpl();
      },
      args: [
        {
          name: "radix",
          type: "Number",
          optional: true,
        },
      ],
      returnType: "String",
    },
    to_number: {
      function: function (this: NumberWithUnitSymbol) {
        return this.to_number();
      },
      args: [],
      returnType: "Number",
    },
  };

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

  hasAttribute(attributeName: string): boolean {
    return attributeName === "value";
  }

  getAttribute(attributeName: string): ISymbolType | null {
    if (attributeName === "value") {
      return new NumberSymbol(this.value);
    }
    throw new InterpreterError(`Attribute '${attributeName}' not found on NumberWithUnit.`);
  }

  getTypeName(): string {
    return typeName(this.type, this.unit);
  }
}

export class DictionarySymbol extends BaseSymbolType {
  type = "Dictionary";
  static readonly type = "Dictionary";
  static _SUPPORTED_METHODS = {
    get: {
      function: function (this: DictionarySymbol, key: StringSymbol) {
        return this.getImpl(key);
      },
      args: [{ name: "key", type: "String", optional: false }],
      returnType: "any",
    },
    set: {
      function: function (this: DictionarySymbol, key: StringSymbol, value: ISymbolType) {
        return this.setImpl(key, value);
      },
      args: [
        { name: "key", type: "String", optional: false },
        { name: "value", type: "any", optional: false },
      ],
      returnType: "Dictionary",
    },
    delete: {
      function: function (this: DictionarySymbol, key: StringSymbol) {
        return this.deleteImpl(key);
      },
      args: [{ name: "key", type: "String", optional: false }],
      returnType: "Dictionary",
    },
    keys: {
      function: function (this: DictionarySymbol) {
        return this.keysImpl();
      },
      args: [],
      returnType: "List",
    },
    keyexists: {
      function: function (this: DictionarySymbol, key: StringSymbol) {
        return this.keyExistsImpl(key);
      },
      args: [{ name: "key", type: "String", optional: false }],
      returnType: "Boolean",
    },
    key_exists: {
      function: function (this: DictionarySymbol, key: StringSymbol) {
        return this.keyExistsImpl(key);
      },
      args: [{ name: "key", type: "String", optional: false }],
      returnType: "Boolean",
    },
    length: {
      function: function (this: DictionarySymbol) {
        return this.lengthImpl();
      },
      args: [],
      returnType: "Number",
    },
    clear: {
      function: function (this: DictionarySymbol) {
        return this.clearImpl();
      },
      args: [],
      returnType: "Dictionary",
    },
  };

  public value: Map<string, ISymbolType>;

  constructor(
    value: Map<string, ISymbolType> | Record<string, ISymbolType> | DictionarySymbol | null,
  ) {
    let safeValue: Map<string, ISymbolType> | null;
    if (value instanceof DictionarySymbol) {
      safeValue = value.value;
    } else if (isMap(value)) {
      safeValue = value;
    } else if (isNull(value)) {
      safeValue = new Map();
    } else if (isObject(value)) {
      safeValue = new Map(Object.entries(value));
    } else {
      throw new InterpreterError(`Value must be dict, got ${typeof value}.`);
    }
    super(safeValue);
    this.value = safeValue;
  }

  validValue(val: any): boolean {
    return isMap(val) || isNull(val);
  }

  expectSafeValue(val: any): asserts val is Map<string, ISymbolType> {
    if (isNone(val)) {
      throw new InterpreterError("Dictionary value cannot be null.");
    }
  }

  toString(): string {
    this.expectSafeValue(this.value);
    const entries = Array.from(this.value.entries())
      .map(([key, value]) => `'${key}': '${value.toString()}'`)
      .join(", ");
    return `{${entries}}`;
  }

  private ensureKeyIsString(key: ISymbolType): string {
    if (key instanceof StringSymbol && key.value !== null) {
      return key.value;
    }
    if (typeof key === "string") {
      return key;
    }
    throw new InterpreterError(`Key must be a string, got ${typeof key}.`);
  }

  getImpl(key: StringSymbol): ISymbolType {
    this.expectSafeValue(this.value);
    const keyStr = this.ensureKeyIsString(key);
    return this.value.get(keyStr) || new NullSymbol();
  }

  setImpl(key: StringSymbol, value: ISymbolType): DictionarySymbol {
    this.expectSafeValue(this.value);
    const keyStr = this.ensureKeyIsString(key);
    this.value.set(keyStr, value);
    return this;
  }

  deleteImpl(key: StringSymbol): DictionarySymbol {
    this.expectSafeValue(this.value);
    const keyStr = this.ensureKeyIsString(key);
    this.value.delete(keyStr);
    return this;
  }

  keysImpl(): ListSymbol {
    this.expectSafeValue(this.value);
    const keys = Array.from(this.value.keys()).map((key) => new StringSymbol(key));
    return new ListSymbol(keys);
  }

  keyExistsImpl(key: StringSymbol): BooleanSymbol {
    this.expectSafeValue(this.value);
    const keyStr = this.ensureKeyIsString(key);
    return new BooleanSymbol(this.value.has(keyStr));
  }

  lengthImpl(): NumberSymbol {
    this.expectSafeValue(this.value);
    return new NumberSymbol(this.value.size);
  }

  clearImpl(): DictionarySymbol {
    this.expectSafeValue(this.value);
    this.value.clear();
    return this;
  }

  static empty(): DictionarySymbol {
    return new DictionarySymbol(null);
  }

  hasAttribute(attributeName: string): boolean {
    this.expectSafeValue(this.value);
    return this.value.has(attributeName);
  }

  getAttribute(attributeName: string): ISymbolType | null {
    this.expectSafeValue(this.value);
    const value = this.value.get(attributeName);
    if (value === undefined) {
      return null;
    }
    return value;
  }
}

export type dynamicColorValue = Record<string, ISymbolType>;

export class ColorSymbol extends BaseSymbolType {
  type = "Color";
  static readonly type = "Color";
  static _SUPPORTED_METHODS = {
    tostring: {
      name: "toString",
      function: function (this: ColorSymbol) {
        return this.toStringImpl();
      },
      args: [],
      returnType: "String",
    },
  };

  public subType: string | null = null;
  public value: string | dynamicColorValue | null;

  static empty(): ColorSymbol {
    return new ColorSymbol(null);
  }

  constructor(value: string | dynamicColorValue | null, subType?: string) {
    const isHex = (isUndefined(subType) || subType.toLowerCase() === "hex") && isString(value);
    const isDynamic = isString(subType) && isObject(value);
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
    this.subType = isHex ? "Hex" : subType || null;
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

  typeEquals(other: ISymbolType): boolean {
    if (!typeEquals(this.type, other.type)) return false;
    const otherColor = other as ColorSymbol;
    // Edge-Case Color without type is equal to Hex
    if ((!this.subType && otherColor.isHex()) || (this.isHex() && otherColor.subType)) return true;
    return typeEquals(this.subType, (other as ColorSymbol).subType);
  }

  isHex(): boolean {
    return typeEquals(this.subType, "hex");
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

  getTypeName(): string {
    return typeName(this.type, nullToUndefined(this.subType));
  }
}

// Utilities -------------------------------------------------------------------

export const jsValueToSymbolType = (value: any): ISymbolType => {
  if (value instanceof BaseSymbolType) return value;
  if (isNone(value)) return new NullSymbol();
  if (isNumber(value)) return new NumberSymbol(value);
  if (isString(value)) {
    if (isValidHex(value)) return new ColorSymbol(value);
    return new StringSymbol(value);
  }
  if (isBoolean(value)) return new BooleanSymbol(value);
  if (isArray(value)) return new ListSymbol(value.map(jsValueToSymbolType));

  // Convert NumberWithUnit object
  if (value instanceof NumberWithUnitSymbol) return value;
  const numberWithUnit = NumberWithUnitSymbol.fromRecord(value);
  if (numberWithUnit) return numberWithUnit;

  // Convert plain object to dictionary
  if (isObject(value)) {
    const dict = new Map<string, ISymbolType>();
    for (const key in value) {
      dict.set(key, jsValueToSymbolType(value[key]));
    }
    return new DictionarySymbol(dict);
  }

  throw new InterpreterError(`Invalid value type: ${typeof value}`);
};

export const nullableSymbolTypes = {
  [NumberSymbol.type.toLowerCase()]: NumberSymbol,
  [StringSymbol.type.toLowerCase()]: StringSymbol,
  [BooleanSymbol.type.toLowerCase()]: BooleanSymbol,
  [NumberWithUnitSymbol.type.toLowerCase()]: NumberWithUnitSymbol,
  [ColorSymbol.type.toLowerCase()]: ColorSymbol,
  [NullSymbol.type.toLowerCase()]: NullSymbol,
} as const;

export const basicSymbolTypes = {
  ...nullableSymbolTypes,
  [ListSymbol.type.toLowerCase()]: ListSymbol,
  [DictionarySymbol.type.toLowerCase()]: DictionarySymbol,
} as const;

export type BasicSymbolTypeConstructor = (typeof basicSymbolTypes)[keyof typeof basicSymbolTypes];

export const isNullableSymbol = (symbol: ISymbolType): boolean =>
  symbol.type.toLowerCase() in nullableSymbolTypes;

export const hasNullValue = (symbol: ISymbolType): boolean =>
  isNullableSymbol(symbol) && isNull(symbol.value);
