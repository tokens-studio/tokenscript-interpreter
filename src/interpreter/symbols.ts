import { type ISymbolType, SupportedFormats, type SymbolMetadata } from "@src/types";
import type { Config } from "./config/config";
import { InterpreterError, SymbolsErrorCode } from "./errors";
import { ensureValidAlpha, isValidHex } from "./utils/color";
import { capitalize } from "./utils/string";
import {
  isArray,
  isBoolean,
  isMap,
  isNone,
  isNull,
  isNumber,
  isObject,
  isObjectWithKey,
  isOutOfBounds,
  isOutOfBoundsInclusive,
  isSome,
  isString,
  isUndefined,
  nullToUndefined,
} from "./utils/type";

// Types -----------------------------------------------------------------------

export interface ToJsOptions {
  /** Whether to recursively convert nested values (default: true) */
  recursive?: boolean;
  /** Whether to use toString() for structured types (default: false) */
  stringify?: boolean;
}

// Utilities -------------------------------------------------------------------

export function isTokenscriptSymbol(value: unknown): value is ISymbolType {
  return isObjectWithKey(value, "getTypeName");
}

export function isList(value: TokenSymbol): boolean {
  return isArray(value.value);
}

export function isDictionary(value: TokenSymbol): boolean {
  return isMap(value.value);
}

export const typeEquals = (typeA: string | null, typeB: string | null) =>
  typeA?.toLowerCase() === typeB?.toLowerCase();

/**
 * Constructs captialized type name from `base` and `sub?`
 * E.g.: base = color, sub = hex => Color.Hex
 *       base = COLOR => Color
 */
export const typeName = (base: string, sub?: string): string => {
  const baseStr = capitalize(base);
  if (sub) {
    const subStr = capitalize(sub);
    return `${baseStr}.${subStr}`;
  }
  return baseStr;
};

export const getResultTypeName = (result: unknown): string => {
  if (isNull(result)) {
    return "Null";
  }
  if (isString(result)) {
    return "String";
  }
  if (isTokenscriptSymbol(result)) {
    return result.getTypeName();
  }
  return "Unknown";
};

const formatObjectEntries = (
  data: Record<string, unknown> | Map<string, unknown> | Array<[string, unknown]>,
): string => {
  let entries: Array<[string, unknown]>;

  if (isArray(data)) {
    entries = data;
  } else if (isMap(data)) {
    entries = Array.from(data.entries());
  } else {
    entries = Object.entries(data);
  }

  const formattedEntries = entries.map(([key, value]) => `${key}: ${String(value)}`).join(", ");
  return `{${formattedEntries}}`;
};

// Dictionary and List Implementation Functions --------------------------------

const expectStringKey = (key: StringSymbol | string): string => {
  if (isString(key)) {
    return key;
  }
  if (key instanceof StringSymbol && isSome(key.value)) {
    return key.value;
  }
  throw new InterpreterError(SymbolsErrorCode.KEY_MUST_BE_STRING, {
    data: { type: typeof key },
  });
};

export const DictionaryImpl = {
  get(value: Map<string, ISymbolType>, key: StringSymbol | string, config?: Config): ISymbolType {
    const keyStr = expectStringKey(key);
    const result = value.get(keyStr);
    if (isSome(result)) {
      return result;
    }
    return new NullSymbol(config);
  },

  set(value: Map<string, ISymbolType>, key: StringSymbol | string, val: ISymbolType): void {
    const keyStr = expectStringKey(key);
    value.set(keyStr, val.cloneIfMutable());
  },

  deleteKey(value: Map<string, ISymbolType>, key: StringSymbol | string): void {
    const keyStr = expectStringKey(key);
    value.delete(keyStr);
  },

  keys(value: Map<string, ISymbolType>, config?: Config): ListSymbol {
    const keys = Array.from(value.keys()).map((key) => new StringSymbol(key, config));
    return new ListSymbol(keys, false, config);
  },

  values(value: Map<string, ISymbolType>, config?: Config): ListSymbol {
    const values = Array.from(value.values());
    return new ListSymbol(values, false, config);
  },

  keyExists(
    value: Map<string, ISymbolType>,
    key: StringSymbol | string,
    config?: Config,
  ): BooleanSymbol {
    const keyStr = expectStringKey(key);
    return new BooleanSymbol(value.has(keyStr), config);
  },

  length(value: Map<string, ISymbolType>, config?: Config): NumberSymbol {
    return new NumberSymbol(value.size, config);
  },

  clear(value: Map<string, ISymbolType>): void {
    value.clear();
  },

  deepCopy(value: Map<string, ISymbolType>): Map<string, ISymbolType> {
    const copiedMap = new Map<string, ISymbolType>();
    for (const [key, val] of value.entries()) {
      copiedMap.set(key, val.deepCopy());
    }
    return copiedMap;
  },

  toString(value: Map<string, ISymbolType>): string {
    return formatObjectEntries(value);
  },

  hasAttribute(value: Map<string, ISymbolType>, attributeName: string): boolean {
    return value.has(attributeName);
  },

  getAttribute(value: Map<string, ISymbolType>, attributeName: string): ISymbolType | null {
    const val = value.get(attributeName);
    return val !== undefined ? val : null;
  },
};

export const ListImpl = {
  append(value: ISymbolType[], item: ISymbolType): void {
    value.push(item.cloneIfMutable());
  },

  extend(value: ISymbolType[], ...items: ISymbolType[]): void {
    for (const item of items) {
      if (item instanceof ListSymbol) {
        value.push(...item.value.map((element: ISymbolType) => element.cloneIfMutable()));
      } else {
        value.push(item.cloneIfMutable());
      }
    }
  },

  insert(value: ISymbolType[], indexSymbol: ISymbolType, item: ISymbolType): void {
    const index = indexSymbol.value as number;
    if (isOutOfBoundsInclusive(value, index)) {
      throw new InterpreterError(SymbolsErrorCode.INDEX_OUT_OF_RANGE, {
        data: { operation: "insert" },
      });
    }
    value.splice(index, 0, item.cloneIfMutable());
  },

  deleteAt(value: ISymbolType[], indexSymbol: ISymbolType): void {
    const index = indexSymbol.value as number;
    if (isOutOfBounds(value, index)) {
      throw new InterpreterError(SymbolsErrorCode.INDEX_OUT_OF_RANGE, {
        data: { operation: "deletion" },
      });
    }
    value.splice(index, 1);
  },

  length(value: ISymbolType[], config?: Config): NumberSymbol {
    return new NumberSymbol(value.length, config);
  },

  indexOf(value: ISymbolType[], item: ISymbolType, config?: Config): NumberSymbol {
    const idx = value.findIndex((el) => el.equals(item));
    return new NumberSymbol(idx, config);
  },

  get(value: ISymbolType[], indexSymbol: ISymbolType): ISymbolType {
    const index = indexSymbol.value as number;
    if (isOutOfBounds(value, index)) {
      throw new InterpreterError(SymbolsErrorCode.INDEX_OUT_OF_RANGE, {
        data: { operation: "get" },
      });
    }
    return value[index];
  },

  update(value: ISymbolType[], indexSymbol: ISymbolType, item: ISymbolType): void {
    const index = indexSymbol.value as number;
    if (isOutOfBounds(value, index)) {
      throw new InterpreterError(SymbolsErrorCode.INDEX_OUT_OF_RANGE, {
        data: { operation: "update" },
      });
    }
    value[index] = item.cloneIfMutable();
  },

  join(value: ISymbolType[], separator: ISymbolType | undefined, config?: Config): StringSymbol {
    const sep = separator?.value || "";
    const stringElements = value.map((element) => {
      if (element.value === null) {
        return "null";
      }
      return element.toString();
    });
    return new StringSymbol(stringElements.join(sep), config);
  },

  deepCopy(value: ISymbolType[]): ISymbolType[] {
    return value.map((element) => element.deepCopy());
  },

  toString(value: ISymbolType[], isImplicit: boolean = false): string {
    const delimiter = isImplicit ? " " : ", ";
    return value.map((x) => (x.value === null ? "null" : x.toString())).join(delimiter);
  },
};

// Base Type -------------------------------------------------------------------

type SupportedMethods = Record<string, MethodDefinitionDef>;

interface MethodArgumentDef {
  name: string;
  type: any; // Could be ISymbolType constructor or a special marker like SymbolSelfType
  optional?: boolean;
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
  public config?: Config;
  static _SUPPORTED_METHODS?: SupportedMethods;

  constructor(value: any, config?: Config) {
    this.value = value;
    this.config = config;
  }

  abstract validValue(value: any): boolean;

  /**
   * Forces creating a deepCopy of provided symbol no matter if it's immutable or not.
   */
  abstract deepCopy(): ISymbolType;

  /**
   * Returns a copy of the symbol if it's mutable, otherwise returns the same instance.
   *
   * This method is used to prevent reference sharing issues when storing symbols in
   * containers like lists and dictionaries. Immutable symbols (Number, String, Boolean,
   * NumberWithUnit, Null, hex ColorSymbol) can safely share references since they
   * cannot be modified after creation. Mutable symbols (List, Dictionary, dynamic
   * ColorSymbol) need to be deep copied to prevent unintended mutations.
   *
   * @returns For immutable symbols: returns `this` (same reference)
   *          For mutable symbols: returns `this.deepCopy()` (new instance)
   */
  abstract cloneIfMutable(): ISymbolType;

  abstract toJs(options?: ToJsOptions): JsValue;

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
    if (methodDefinition.args.length === 0) return true;

    const requiredArgs = methodDefinition.args.filter((arg: MethodArgumentDef) => !arg.optional);

    if (args.length < requiredArgs.length) {
      return false;
    }

    if (args.length > methodDefinition.args.length) {
      return false;
    }

    return true;
  }

  callMethod?(methodName: string, args: ISymbolType[]): ISymbolType | null | undefined {
    const methodDefinition = (this.constructor as any)._SUPPORTED_METHODS?.[
      methodName.toLowerCase()
    ];
    if (!methodDefinition || !this.hasMethod?.(methodName, args)) {
      throw new InterpreterError(SymbolsErrorCode.METHOD_NOT_FOUND, {
        data: { methodName, type: this.type },
      });
    }

    if (methodDefinition.args.length === 0) {
      return methodDefinition.function.call(this, ...args);
    }

    const processedArgs: ISymbolType[] = [];

    methodDefinition.args.forEach((argDef: MethodArgumentDef, index: number) => {
      if (args[index] !== undefined) {
        processedArgs.push(args[index]);
      } else if (!argDef.optional) {
        throw new InterpreterError(SymbolsErrorCode.MISSING_REQUIRED_ARGUMENT, {
          data: { argumentName: argDef.name, methodName },
        });
      }
    });

    return methodDefinition.function.call(this, ...processedArgs);
  }

  hasAttribute?(_attributeName: string): boolean {
    return false;
  }

  getAttribute?(attributeName: string): ISymbolType | null {
    throw new InterpreterError(SymbolsErrorCode.ATTRIBUTE_NOT_FOUND, {
      data: { attributeName, type: this.type },
    });
  }

  setAttribute?(attributeName: string, _value: ISymbolType): void {
    throw new InterpreterError(SymbolsErrorCode.CANNOT_SET_ATTRIBUTE, {
      data: { attributeName, type: this.type },
    });
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

  constructor(config?: Config) {
    super(null, config);
  }

  validValue(val: any): boolean {
    return isNone(val);
  }

  toString(): string {
    return "null";
  }

  deepCopy(): NullSymbol {
    return new NullSymbol(this.config);
  }

  cloneIfMutable(): NullSymbol {
    return this;
  }

  equals(other: ISymbolType): boolean {
    return other instanceof NullSymbol;
  }

  static empty(): NullSymbol {
    return new NullSymbol();
  }

  toJs(_options?: ToJsOptions): null {
    return null;
  }
}

type NumberValue = number | null;

export class NumberSymbol extends BaseSymbolType {
  type = "Number";
  static readonly type = "Number";
  static _SUPPORTED_METHODS = {
    to_string: {
      name: "to_string",
      function: function (this: NumberSymbol, radix?: NumberSymbol) {
        return this.toStringSymbol(radix);
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

  public value: NumberValue;

  constructor(value: number | NumberSymbol | NumberWithUnitSymbol | null, config?: Config) {
    let safeValue: NumberValue;
    if (isNumber(value)) {
      safeValue = value;
    } else if (value instanceof NumberSymbol || value instanceof NumberWithUnitSymbol) {
      safeValue = value.value as number;
    } else if (isNull(value)) {
      safeValue = null;
    } else {
      throw new InterpreterError(SymbolsErrorCode.VALUE_MUST_BE_TYPE, {
        data: { expectedType: "int or float", actualType: typeof value },
      });
    }
    super(safeValue, config);
    this.value = safeValue;
  }

  validValue(val: any): boolean {
    return isNumber(val) || val instanceof NumberSymbol;
  }

  expectSafeValue(val: any): asserts val is number {
    if (isNone(val)) {
      throw new InterpreterError(SymbolsErrorCode.VALUE_IS_NULL, {
        data: { expectedType: "int or float" },
      });
    }
  }

  toString(): string {
    return String(this.value);
  }

  deepCopy(): NumberSymbol {
    return new NumberSymbol(this.value, this.config);
  }

  cloneIfMutable(): NumberSymbol {
    return this;
  }

  static empty(): NumberSymbol {
    return new NumberSymbol(null);
  }

  hasAttribute(attributeName: string): boolean {
    return attributeName === "value";
  }

  getAttribute(attributeName: string): ISymbolType | null {
    if (attributeName === "value") {
      return new NumberSymbol(this.value, this.config);
    }
    throw new InterpreterError(SymbolsErrorCode.ATTRIBUTE_NOT_FOUND, {
      data: { attributeName, type: "Number" },
    });
  }

  // Direct translation of to_string method from token_interpreter/symbols.py
  toStringSymbol(radix?: NumberSymbol): StringSymbol {
    this.expectSafeValue(this.value);

    if (radix) {
      this.expectSafeValue(radix?.value);
    } else {
      return new StringSymbol(String(this.value), this.config);
    }

    const base = radix.value;
    if (!Number.isInteger(base) || base < 2 || base > 36) {
      throw new InterpreterError(SymbolsErrorCode.INVALID_RADIX, {
        data: { radix: base },
      });
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
        return new StringSymbol(numValue.toString(base), this.config);
      } else {
        return new StringSymbol(String(this.value), this.config);
      }
    } catch (e) {
      throw new InterpreterError(SymbolsErrorCode.RADIX_CONVERSION_ERROR, {
        data: { base, error: String(e) },
      });
    }
  }

  toJs(_options?: ToJsOptions): NumberValue {
    return this.value;
  }
}

type StringValue = string | null;

export class StringSymbol extends BaseSymbolType {
  type = "String";
  static readonly type = "String";
  static _SUPPORTED_METHODS = {
    upper: {
      function: function (this: StringSymbol) {
        return this.upper();
      },
      args: [],
      returnType: "String",
    },
    lower: {
      function: function (this: StringSymbol) {
        return this.lower();
      },
      args: [],
      returnType: "String",
    },
    length: {
      function: function (this: StringSymbol) {
        return this.length();
      },
      args: [],
      returnType: "Number",
    },
    concat: {
      function: function (this: StringSymbol, other: StringSymbol) {
        return this.concat(other);
      },
      args: [{ name: "other", type: "String" }],
      returnType: "String",
    },
    split: {
      function: function (this: StringSymbol, delimiter?: StringSymbol) {
        return this.split(delimiter);
      },
      args: [{ name: "delimiter", type: "String", optional: true }],
      returnType: "List",
    },
  };

  public value: StringValue;

  constructor(value: string | StringSymbol | null, config?: Config) {
    let safeValue: string | null;
    if (typeof value === "string") {
      safeValue = value;
    } else if (value instanceof StringSymbol) {
      safeValue = value.value;
    } else if (value === null) {
      safeValue = null;
    } else {
      throw new InterpreterError(SymbolsErrorCode.VALUE_MUST_BE_TYPE, {
        data: { expectedType: "string", actualType: typeof value },
      });
    }
    super(safeValue, config);
    this.value = safeValue;
  }

  validValue(val: any): boolean {
    return typeof val === "string" || val instanceof StringSymbol;
  }

  expectSafeValue(val: any): asserts val is string {
    if (val === null || val === undefined) {
      throw new InterpreterError(SymbolsErrorCode.VALUE_IS_NULL, {
        data: { expectedType: "string" },
      });
    }
  }

  upper(): StringSymbol {
    this.expectSafeValue(this.value);
    return new StringSymbol(this.value.toUpperCase(), this.config);
  }

  deepCopy(): StringSymbol {
    return new StringSymbol(this.value, this.config);
  }

  cloneIfMutable(): StringSymbol {
    return this;
  }

  static empty(): StringSymbol {
    return new StringSymbol(null);
  }

  lower(): StringSymbol {
    this.expectSafeValue(this.value);
    return new StringSymbol(this.value.toLowerCase(), this.config);
  }

  length(): NumberSymbol {
    this.expectSafeValue(this.value);
    return new NumberSymbol(this.value.length, this.config);
  }

  concat(other: StringSymbol): StringSymbol {
    this.expectSafeValue(this.value);
    if (other instanceof StringSymbol) {
      other.expectSafeValue(other.value);
      return new StringSymbol(this.value + other.value, this.config);
    }
    throw new InterpreterError(SymbolsErrorCode.CANNOT_CONCATENATE, {
      data: { type: `String ${typeof other}` },
    });
  }

  split(delimiter?: StringSymbol): ListSymbol {
    this.expectSafeValue(this.value);
    const strValue = this.value;

    if (delimiter instanceof StringSymbol) {
      const parts = strValue.split(delimiter.value as string);
      return new ListSymbol(
        parts.map((p) => new StringSymbol(p, this.config)),
        false,
        this.config,
      );
    } else if (typeof delimiter === "string") {
      const parts = strValue.split(delimiter);
      return new ListSymbol(
        parts.map((p) => new StringSymbol(p, this.config)),
        false,
        this.config,
      );
    } else if (delimiter === undefined || delimiter === null) {
      const parts = Array.from(strValue);
      return new ListSymbol(
        parts.map((p) => new StringSymbol(p, this.config)),
        false,
        this.config,
      );
    }

    throw new InterpreterError(SymbolsErrorCode.CANNOT_SPLIT, {
      data: { type: typeof delimiter },
    });
  }

  toJs(_options?: ToJsOptions): StringValue {
    return this.value;
  }
}

type BooleanValue = boolean | null;

export class BooleanSymbol extends BaseSymbolType {
  type = "Boolean";
  static readonly type = "Boolean";

  public value: BooleanValue;
  constructor(value: boolean | BooleanSymbol | null, config?: Config) {
    let safeValue: BooleanValue;
    if (typeof value === "boolean") {
      safeValue = value;
    } else if (value instanceof BooleanSymbol) {
      safeValue = value.value;
    } else if (value === null) {
      safeValue = null;
    } else {
      throw new InterpreterError(SymbolsErrorCode.VALUE_MUST_BE_TYPE, {
        data: { expectedType: "boolean", actualType: typeof value },
      });
    }
    super(safeValue, config);
    this.value = safeValue;
  }

  validValue(val: any): boolean {
    return typeof val === "boolean" || val instanceof BooleanSymbol;
  }

  expectSafeValue(val: any): asserts val is boolean {
    if (val === null || val === undefined) {
      throw new InterpreterError(SymbolsErrorCode.VALUE_IS_NULL, {
        data: { expectedType: "boolean" },
      });
    }
  }

  deepCopy(): BooleanSymbol {
    return new BooleanSymbol(this.value, this.config);
  }

  cloneIfMutable(): BooleanSymbol {
    return this;
  }

  static empty(): BooleanSymbol {
    return new BooleanSymbol(null);
  }

  toJs(_options?: ToJsOptions): BooleanValue {
    return this.value;
  }
}

export class ListSymbol extends BaseSymbolType {
  type = "List";
  static readonly type = "List";
  static _SUPPORTED_METHODS = {
    append: {
      function: function (this: ListSymbol, item: ISymbolType) {
        return this.append(item);
      },
      args: [{ name: "item", type: "any" }],
      returnType: "List",
    },
    extend: {
      function: function (this: ListSymbol, ...items: ISymbolType[]) {
        return this.extend(...items);
      },
      args: [],
      returnType: "List",
    },
    insert: {
      function: function (this: ListSymbol, index: NumberSymbol, item: ISymbolType) {
        return this.insert(index, item);
      },
      args: [
        { name: "index", type: "Number" },
        { name: "item", type: "any" },
      ],
      returnType: "List",
    },
    delete: {
      function: function (this: ListSymbol, index: NumberSymbol) {
        return this.delete(index);
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
        return this.index(item);
      },
      args: [{ name: "item", type: "any" }],
      returnType: "Number",
    },
    get: {
      function: function (this: ListSymbol, index: NumberSymbol) {
        return this.get(index);
      },
      args: [{ name: "index", type: "Number" }],
      returnType: "any",
    },
    update: {
      function: function (this: ListSymbol, index: NumberSymbol, item: ISymbolType) {
        return this.update(index, item);
      },
      args: [
        { name: "index", type: "Number" },
        { name: "item", type: "any" },
      ],
      returnType: "List",
    },
    join: {
      function: function (this: ListSymbol, separator?: StringSymbol) {
        return this.join(separator);
      },
      args: [{ name: "separator", type: "String", optional: true }],
      returnType: "String",
    },
  };

  public value: ISymbolType[];
  public isImplicit: boolean;

  constructor(elements: ISymbolType[] | null, isImplicit = false, config?: Config) {
    const safeElements = elements === null ? [] : elements;
    super(safeElements, config);
    this.value = safeElements;
    this.isImplicit = isImplicit;
  }

  validValue(val: any): boolean {
    return Array.isArray(val) || val instanceof ListSymbol;
  }

  toString(): string {
    return ListImpl.toString(this.value, this.isImplicit);
  }

  append(item: ISymbolType): ListSymbol {
    ListImpl.append(this.value, item);
    return this;
  }

  extend(...items: ISymbolType[]): ListSymbol {
    ListImpl.extend(this.value, ...items);
    return this;
  }

  insert(indexSymbol: NumberSymbol, item: ISymbolType): ListSymbol {
    ListImpl.insert(this.value, indexSymbol, item);
    return this;
  }

  delete(indexSymbol: NumberSymbol): ListSymbol {
    ListImpl.deleteAt(this.value, indexSymbol);
    return this;
  }

  length(): NumberSymbol {
    return ListImpl.length(this.value, this.config);
  }

  index(item: ISymbolType): NumberSymbol {
    return ListImpl.indexOf(this.value, item, this.config);
  }

  get(indexSymbol: NumberSymbol): ISymbolType {
    return ListImpl.get(this.value, indexSymbol);
  }

  update(indexSymbol: NumberSymbol, item: ISymbolType): ListSymbol {
    ListImpl.update(this.value, indexSymbol, item);
    return this;
  }

  join(separator?: StringSymbol): StringSymbol {
    return ListImpl.join(this.value, separator, this.config);
  }

  deepCopy(): ListSymbol {
    const copiedElements = ListImpl.deepCopy(this.value);
    return new ListSymbol(copiedElements, this.isImplicit, this.config);
  }

  cloneIfMutable(): ListSymbol {
    return this.deepCopy();
  }

  static empty(): ListSymbol {
    return new ListSymbol(null);
  }

  getTypeName(): string {
    return this.isImplicit ? typeName(this.type, "Implicit") : typeName(this.type);
  }

  toJs(options?: ToJsOptions): JsValue[] {
    const { recursive = true } = options ?? {};
    if (!recursive) return this.value as any;
    return this.value.map((item) => item.toJs(options));
  }
}

type NumberWithUnitValue = number | null;

export class NumberWithUnitSymbol extends BaseSymbolType {
  type = "NumberWithUnit";
  static readonly type = "NumberWithUnit";
  static _SUPPORTED_METHODS = {
    to_string: {
      name: "to_string",
      function: function (this: NumberWithUnitSymbol) {
        return this.toStringSymbol();
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

  public value: NumberWithUnitValue;
  public unit: SupportedFormats;

  constructor(
    value: number | NumberSymbol | null,
    unit: SupportedFormats | string,
    config?: Config,
  ) {
    let safeValue: NumberWithUnitValue;
    if (typeof value === "number") {
      safeValue = value;
    } else if (value instanceof NumberSymbol) {
      safeValue = value.value;
    } else if (value === null) {
      safeValue = null;
    } else {
      throw new InterpreterError(SymbolsErrorCode.VALUE_MUST_BE_TYPE, {
        data: { expectedType: "number or NumberSymbol", actualType: typeof value },
      });
    }
    super(safeValue, config);
    this.value = safeValue;

    if (typeof unit === "string" && !(Object.values(SupportedFormats) as string[]).includes(unit)) {
      throw new InterpreterError(SymbolsErrorCode.ATTRIBUTE_NOT_FOUND, {
        data: { attributeName: unit, type: "Unit" },
      });
    }
    this.unit = typeof unit === "string" ? (unit as SupportedFormats) : unit;
  }

  validValue(val: any): boolean {
    return val instanceof NumberWithUnitSymbol;
  }

  static fromRecord(
    record: {
      value: number | string;
      unit: string;
      type?: string;
    },
    config?: Config,
  ): NumberWithUnitSymbol | undefined {
    if (record === null || typeof record !== "object") return;
    if (record.type !== "NumberWithUnit") return;
    if (!record.value && !record.unit) return;
    if (typeof record.value !== "number") return;

    return new NumberWithUnitSymbol(record.value, record.unit, config);
  }

  toString(): string {
    return `${this.value}${this.unit}`;
  }

  expectSafeValue(val: any): asserts val is number {
    if (val === null || val === undefined) {
      throw new InterpreterError(SymbolsErrorCode.VALUE_IS_NULL, {
        data: { expectedType: "number" },
      });
    }
  }

  toStringSymbol(): StringSymbol {
    this.expectSafeValue(this.value);
    return new StringSymbol(`${this.value}${this.unit}`, this.config);
  }

  to_number(): NumberSymbol {
    this.expectSafeValue(this.value);
    return new NumberSymbol(this.value, this.config);
  }

  equals(other: ISymbolType): boolean {
    return (
      other instanceof NumberWithUnitSymbol &&
      this.value === other.value &&
      this.unit.toLowerCase() === other?.unit.toLowerCase()
    );
  }

  deepCopy(): NumberWithUnitSymbol {
    return new NumberWithUnitSymbol(this.value, this.unit, this.config);
  }

  cloneIfMutable(): NumberWithUnitSymbol {
    return this;
  }

  static empty(): NumberWithUnitSymbol {
    return new NumberWithUnitSymbol(null, "px");
  }

  hasAttribute(attributeName: string): boolean {
    return attributeName === "value";
  }

  getAttribute(attributeName: string): ISymbolType | null {
    if (attributeName === "value") {
      return new NumberSymbol(this.value, this.config);
    }
    throw new InterpreterError(SymbolsErrorCode.ATTRIBUTE_NOT_FOUND, {
      data: { attributeName, type: "NumberWithUnit" },
    });
  }

  getTypeName(): string {
    return `${this.type}.${capitalize(this.unit)}`;
  }

  toJs(options?: ToJsOptions): string | { value: number | null; unit: string } {
    const { stringify = false } = options ?? {};
    if (stringify) return this.toString();
    return { value: this.value, unit: this.unit };
  }
}

export class DictionarySymbol extends BaseSymbolType {
  type = "Dictionary";
  static readonly type = "Dictionary";
  static _SUPPORTED_METHODS = {
    get: {
      function: function (this: DictionarySymbol, key: StringSymbol) {
        return this.get(key);
      },
      args: [{ name: "key", type: "String", optional: false }],
      returnType: "any",
    },
    set: {
      function: function (this: DictionarySymbol, key: StringSymbol, value: ISymbolType) {
        return this.set(key, value);
      },
      args: [
        { name: "key", type: "String", optional: false },
        { name: "value", type: "any", optional: false },
      ],
      returnType: "Dictionary",
    },
    delete: {
      function: function (this: DictionarySymbol, key: StringSymbol) {
        return this.delete(key);
      },
      args: [{ name: "key", type: "String", optional: false }],
      returnType: "Dictionary",
    },
    keys: {
      function: function (this: DictionarySymbol) {
        return this.keys();
      },
      args: [],
      returnType: "List",
    },
    values: {
      function: function (this: DictionarySymbol) {
        return this.values();
      },
      args: [],
      returnType: "List",
    },
    key_exists: {
      function: function (this: DictionarySymbol, key: StringSymbol) {
        return this.keyExists(key);
      },
      args: [{ name: "key", type: "String", optional: false }],
      returnType: "Boolean",
    },
    length: {
      function: function (this: DictionarySymbol) {
        return this.length();
      },
      args: [],
      returnType: "Number",
    },
    clear: {
      function: function (this: DictionarySymbol) {
        return this.clear();
      },
      args: [],
      returnType: "Dictionary",
    },
  };

  public value: Map<string, ISymbolType>;

  constructor(
    value: Map<string, ISymbolType> | Record<string, ISymbolType> | DictionarySymbol | null,
    config?: Config,
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
      throw new InterpreterError(SymbolsErrorCode.VALUE_MUST_BE_TYPE, {
        data: { expectedType: "dict", actualType: typeof value },
      });
    }
    super(safeValue, config);
    this.value = safeValue;
  }

  validValue(val: any): boolean {
    return isMap(val) || isNull(val);
  }

  toString(): string {
    return DictionaryImpl.toString(this.value);
  }

  get(key: StringSymbol): ISymbolType {
    return DictionaryImpl.get(this.value, key, this.config);
  }

  set(key: StringSymbol, value: ISymbolType): DictionarySymbol {
    DictionaryImpl.set(this.value, key, value);
    return this;
  }

  delete(key: StringSymbol): DictionarySymbol {
    DictionaryImpl.deleteKey(this.value, key);
    return this;
  }

  keys(): ListSymbol {
    return DictionaryImpl.keys(this.value, this.config);
  }

  values(): ListSymbol {
    return DictionaryImpl.values(this.value, this.config);
  }

  keyExists(key: StringSymbol): BooleanSymbol {
    return DictionaryImpl.keyExists(this.value, key, this.config);
  }

  length(): NumberSymbol {
    return DictionaryImpl.length(this.value, this.config);
  }

  clear(): DictionarySymbol {
    DictionaryImpl.clear(this.value);
    return this;
  }

  deepCopy(): DictionarySymbol {
    const copiedMap = DictionaryImpl.deepCopy(this.value);
    return new DictionarySymbol(copiedMap, this.config);
  }

  cloneIfMutable(): DictionarySymbol {
    return this.deepCopy();
  }

  static empty(): DictionarySymbol {
    return new DictionarySymbol(null);
  }

  hasAttribute(attributeName: string): boolean {
    return DictionaryImpl.hasAttribute(this.value, attributeName);
  }

  getAttribute(attributeName: string): ISymbolType | null {
    return DictionaryImpl.getAttribute(this.value, attributeName);
  }

  toJs(options?: ToJsOptions): Record<string, JsValue> {
    const { recursive = true } = options ?? {};
    const obj: Record<string, JsValue> = {};
    for (const [key, child] of this.value.entries()) {
      obj[key] = recursive ? child.toJs(options) : (child as any);
    }
    return obj;
  }
}

export type TokenValue = Map<string, ISymbolType> | ISymbolType[];

export class TokenSymbol extends BaseSymbolType {
  type = "Token";
  static readonly type = "Token";
  static _SUPPORTED_METHODS = {
    get: {
      function: function (this: TokenSymbol, keyOrIndex: StringSymbol | NumberSymbol) {
        return this.get(keyOrIndex);
      },
      args: [{ name: "keyOrIndex", type: "String|Number", optional: false }],
      returnType: "any",
    },
    set: {
      function: function (this: TokenSymbol, key: StringSymbol, value: ISymbolType) {
        return this.set(key, value);
      },
      args: [
        { name: "key", type: "String", optional: false },
        { name: "value", type: "any", optional: false },
      ],
      returnType: "Token",
    },
    keys: {
      function: function (this: TokenSymbol) {
        return this.keys();
      },
      args: [],
      returnType: "List",
    },
    values: {
      function: function (this: TokenSymbol) {
        return this.values();
      },
      args: [],
      returnType: "List",
    },
    length: {
      function: function (this: TokenSymbol) {
        return this.length();
      },
      args: [],
      returnType: "Number",
    },
    // List methods (when value is Array)
    append: {
      function: function (this: TokenSymbol, item: ISymbolType) {
        return this.append(item);
      },
      args: [{ name: "item", type: "any" }],
      returnType: "Token",
    },
    extend: {
      function: function (this: TokenSymbol, ...items: ISymbolType[]) {
        return this.extend(...items);
      },
      args: [],
      returnType: "Token",
    },
    insert: {
      function: function (this: TokenSymbol, index: NumberSymbol, item: ISymbolType) {
        return this.insert(index, item);
      },
      args: [
        { name: "index", type: "Number" },
        { name: "item", type: "any" },
      ],
      returnType: "Token",
    },
    delete: {
      function: function (this: TokenSymbol, index: NumberSymbol) {
        return this.delete(index);
      },
      args: [{ name: "index", type: "Number" }],
      returnType: "Token",
    },
    index: {
      function: function (this: TokenSymbol, item: ISymbolType) {
        return this.index(item);
      },
      args: [{ name: "item", type: "any" }],
      returnType: "Number",
    },
    update: {
      function: function (this: TokenSymbol, index: NumberSymbol, item: ISymbolType) {
        return this.update(index, item);
      },
      args: [
        { name: "index", type: "Number" },
        { name: "item", type: "any" },
      ],
      returnType: "Token",
    },
    join: {
      function: function (this: TokenSymbol, separator?: StringSymbol) {
        return this.join(separator);
      },
      args: [{ name: "separator", type: "String", optional: true }],
      returnType: "String",
    },
  };

  public subType: string;
  public value: TokenValue;
  /**
   * Optional metadata attached to this token.
   * This is a reference that is preserved (not cloned) during deepCopy/cloneIfMutable operations.
   * It is not accessible to the tokenscript language and is intended for external use
   * (e.g., storing token IDs for tracing).
   */
  public metadata?: SymbolMetadata;

  constructor(
    subType: string,
    value: TokenValue | Record<string, ISymbolType> | TokenSymbol | null,
    config?: Config,
    metadata?: SymbolMetadata,
  ) {
    let safeValue: TokenValue;
    if (value instanceof TokenSymbol) {
      safeValue = value.value;
    } else if (isMap(value)) {
      safeValue = value;
    } else if (isObject(value)) {
      safeValue = new Map(Object.entries(value));
    } else if (isArray(value)) {
      safeValue = value;
    } else if (isNull(value)) {
      safeValue = new Map();
    } else {
      throw new InterpreterError(SymbolsErrorCode.VALUE_MUST_BE_TYPE, {
        data: { expectedType: "Record or List", actualType: typeof value },
      });
    }

    super(safeValue, config);
    this.value = safeValue;
    this.subType = subType;
    this.metadata = metadata;
  }

  validValue(val: any): boolean {
    return isMap(val) || isArray(val) || isNull(val);
  }

  toString(): string {
    if (isMap(this.value)) {
      return DictionaryImpl.toString(this.value);
    }
    return ListImpl.toString(this.value);
  }

  get(keyOrIndex: StringSymbol | NumberSymbol | string | number): ISymbolType {
    if (isArray(this.value)) {
      const indexSymbol =
        typeof keyOrIndex === "number" ? new NumberSymbol(keyOrIndex, this.config) : keyOrIndex;
      if (!(indexSymbol instanceof NumberSymbol)) {
        throw new InterpreterError(SymbolsErrorCode.CANNOT_OPERATION_ON_TOKEN_TYPE, {
          data: { operation: "List get", valueType: "non-Number index" },
        });
      }
      return ListImpl.get(this.value, indexSymbol);
    }
    const keySymbol =
      typeof keyOrIndex === "string" ? new StringSymbol(keyOrIndex, this.config) : keyOrIndex;
    if (!(keySymbol instanceof StringSymbol)) {
      throw new InterpreterError(SymbolsErrorCode.CANNOT_OPERATION_ON_TOKEN_TYPE, {
        data: { operation: "Dictionary get", valueType: "non-String key" },
      });
    }
    return DictionaryImpl.get(this.value, keySymbol, this.config);
  }

  set(key: StringSymbol, value: ISymbolType): TokenSymbol {
    if (isArray(this.value)) {
      throw new InterpreterError(SymbolsErrorCode.CANNOT_OPERATION_ON_TOKEN_TYPE, {
        data: { operation: "set key", valueType: "List" },
      });
    }
    DictionaryImpl.set(this.value, key, value);
    return this;
  }

  keys(): ListSymbol {
    if (isArray(this.value)) {
      throw new InterpreterError(SymbolsErrorCode.CANNOT_OPERATION_ON_TOKEN_TYPE, {
        data: { operation: "get keys", valueType: "List" },
      });
    }
    return DictionaryImpl.keys(this.value, this.config);
  }

  values(): ListSymbol {
    if (isMap(this.value)) {
      return DictionaryImpl.values(this.value, this.config);
    }
    return new ListSymbol(this.value, false, this.config);
  }

  length(): NumberSymbol {
    if (isMap(this.value)) {
      return DictionaryImpl.length(this.value, this.config);
    }
    return ListImpl.length(this.value, this.config);
  }

  // List-specific methods
  append(item: ISymbolType): TokenSymbol {
    if (isMap(this.value)) {
      throw new InterpreterError(SymbolsErrorCode.CANNOT_OPERATION_ON_TOKEN_TYPE, {
        data: { operation: "append", valueType: "Dictionary" },
      });
    }
    ListImpl.append(this.value, item);
    return this;
  }

  extend(...items: ISymbolType[]): TokenSymbol {
    if (isMap(this.value)) {
      throw new InterpreterError(SymbolsErrorCode.CANNOT_OPERATION_ON_TOKEN_TYPE, {
        data: { operation: "extend", valueType: "Dictionary" },
      });
    }
    ListImpl.extend(this.value, ...items);
    return this;
  }

  insert(indexSymbol: NumberSymbol, item: ISymbolType): TokenSymbol {
    if (isMap(this.value)) {
      throw new InterpreterError(SymbolsErrorCode.CANNOT_OPERATION_ON_TOKEN_TYPE, {
        data: { operation: "insert", valueType: "Dictionary" },
      });
    }
    ListImpl.insert(this.value, indexSymbol, item);
    return this;
  }

  delete(indexSymbol: NumberSymbol): TokenSymbol {
    if (isMap(this.value)) {
      throw new InterpreterError(SymbolsErrorCode.CANNOT_OPERATION_ON_TOKEN_TYPE, {
        data: { operation: "delete", valueType: "Dictionary" },
      });
    }
    ListImpl.deleteAt(this.value, indexSymbol);
    return this;
  }

  index(item: ISymbolType): NumberSymbol {
    if (isMap(this.value)) {
      throw new InterpreterError(SymbolsErrorCode.CANNOT_OPERATION_ON_TOKEN_TYPE, {
        data: { operation: "get index", valueType: "Dictionary" },
      });
    }
    return ListImpl.indexOf(this.value, item, this.config);
  }

  update(indexSymbol: NumberSymbol, item: ISymbolType): TokenSymbol {
    if (isMap(this.value)) {
      throw new InterpreterError(SymbolsErrorCode.CANNOT_OPERATION_ON_TOKEN_TYPE, {
        data: { operation: "update", valueType: "Dictionary" },
      });
    }
    ListImpl.update(this.value, indexSymbol, item);
    return this;
  }

  join(separator?: StringSymbol): StringSymbol {
    if (isMap(this.value)) {
      throw new InterpreterError(SymbolsErrorCode.CANNOT_OPERATION_ON_TOKEN_TYPE, {
        data: { operation: "join", valueType: "Dictionary" },
      });
    }
    return ListImpl.join(this.value, separator, this.config);
  }

  deepCopy(): TokenSymbol {
    if (isMap(this.value)) {
      return new TokenSymbol(
        this.subType,
        DictionaryImpl.deepCopy(this.value),
        this.config,
        this.metadata,
      );
    }
    return new TokenSymbol(this.subType, ListImpl.deepCopy(this.value), this.config, this.metadata);
  }

  cloneIfMutable(): TokenSymbol {
    return this.deepCopy();
  }

  static empty(): TokenSymbol {
    return new TokenSymbol("unknown", null);
  }

  hasAttribute(attributeName: string): boolean {
    if (attributeName === "subType" || attributeName === "type") {
      return true;
    }
    if (isMap(this.value)) {
      return DictionaryImpl.hasAttribute(this.value, attributeName);
    }
    return false;
  }

  getAttribute(attributeName: string): ISymbolType | null {
    if (attributeName === "subType") {
      return new StringSymbol(this.subType, this.config);
    }
    if (attributeName === "type") {
      return new StringSymbol(this.type, this.config);
    }
    if (isMap(this.value)) {
      return DictionaryImpl.getAttribute(this.value, attributeName);
    }
    return null;
  }

  getTypeName(): string {
    return typeName(this.type, this.subType);
  }

  toJs(options?: ToJsOptions): JsValue[] | Record<string, JsValue> {
    const { recursive = true } = options ?? {};
    if (isMap(this.value)) {
      const obj: Record<string, JsValue> = {};
      const mapValue = this.value as Map<string, ISymbolType>;
      for (const [key, child] of mapValue.entries()) {
        obj[key] = recursive ? child.toJs(options) : (child as any);
      }
      return obj;
    }
    if (isArray(this.value)) {
      const arrayValue = this.value as ISymbolType[];
      return recursive ? arrayValue.map((item) => item.toJs(options)) : (arrayValue as any);
    }
    return {};
  }
}

export type dynamicColorValue = Record<string, ISymbolType>;
type ColorValue = string | dynamicColorValue | null;

export class ColorSymbol extends BaseSymbolType {
  type = "Color";
  static readonly type = "Color";
  static _SUPPORTED_METHODS = {
    to_string: {
      name: "to_string",
      function: function (this: ColorSymbol) {
        return this.toStringSymbol();
      },
      args: [],
      returnType: "String",
    },
  };

  public subType: string | null = null;
  public value: ColorValue;
  public alpha: number | null = null;

  static empty(): ColorSymbol {
    return new ColorSymbol(null);
  }

  constructor(value: ColorValue, subType?: string, alpha?: number | null, config?: Config) {
    const isHex = (isUndefined(subType) || subType?.toLowerCase() === "hex") && isString(value);
    const isDynamic = isString(subType) && isObject(value);
    const isValid = isNull(value) || isHex || isDynamic;

    if (!isValid) {
      throw new InterpreterError(SymbolsErrorCode.INVALID_COLOR_VALUE, {
        data: { value: String(value), type: typeof value },
      });
    }

    if (isHex) {
      if (!isValidHex(value)) {
        throw new InterpreterError(SymbolsErrorCode.INVALID_HEX_COLOR, {
          data: { value: String(value) },
        });
      }
    }

    super(value, config);

    this.value = value;
    this.subType = isHex ? "Hex" : subType || null;

    const alphaValue = alpha ?? null;
    ensureValidAlpha(alphaValue);
    this.alpha = alphaValue;
  }

  toStringSymbol(): StringSymbol {
    if (this.config?.colorManager) {
      const formatted = this.config.colorManager.formatColorMethod(this);
      return new StringSymbol(formatted, this.config);
    }
    if (isObject(this.value)) {
      return new StringSymbol(formatObjectEntries(this.value), this.config);
    }
    if (isString(this.value)) {
      return new StringSymbol(this.value, this.config);
    }
    return new StringSymbol("", this.config);
  }

  toString(): string {
    return this.toStringSymbol().toString();
  }

  to(targetType: string): ColorSymbol {
    if (!this.config?.colorManager) {
      throw new InterpreterError(SymbolsErrorCode.COLOR_MANAGER_NOT_AVAILABLE);
    }
    return this.config.colorManager.convertToByType(this, targetType);
  }

  typeEquals(other: ISymbolType): boolean {
    if (!typeEquals(this.type, other.type)) return false;
    const otherColor = other as ColorSymbol;
    // Edge-Case Color without type is equal to Hex only
    if ((!this.subType && otherColor.isHex()) || (this.isHex() && !otherColor.subType)) return true;
    return typeEquals(this.subType, (other as ColorSymbol).subType);
  }

  isHex(): boolean {
    return typeEquals(this.subType, "hex");
  }

  validValue(val: any): boolean {
    return val instanceof ColorSymbol || isNull(val) || isObject(val) || isValidHex(val);
  }

  equals(other: ISymbolType): boolean {
    if (!this.typeEquals(other)) return false;

    const otherColor = other as ColorSymbol;

    if (this.alpha !== otherColor.alpha) return false;

    // Compare non-hex
    if (isObject(this.value) && isObject(otherColor.value)) {
      const thisKeys = Object.keys(this.value);
      const otherKeys = Object.keys(otherColor.value);

      if (thisKeys.length !== otherKeys.length) return false;

      for (const key of thisKeys) {
        if (!this.value[key].equals(otherColor.value[key])) return false;
      }
      return true;
    }

    // Compare hex value directly
    return this.value === otherColor.value;
  }

  deepCopy(): ColorSymbol {
    if (isObject(this.value)) {
      // For dynamic colors with object values, deep copy the object
      const copiedValue: dynamicColorValue = {};
      for (const [key, val] of Object.entries(this.value)) {
        copiedValue[key] = val.deepCopy();
      }
      return new ColorSymbol(copiedValue, this.subType || undefined, this.alpha, this.config);
    }
    // For hex colors (string values), no deep copy needed
    return new ColorSymbol(this.value, this.subType || undefined, this.alpha, this.config);
  }

  cloneIfMutable(): ColorSymbol {
    if (isObject(this.value)) {
      // Dynamic colors with object values are mutable, need deep copy
      return this.deepCopy();
    }
    // Hex colors (string values) are immutable, return this
    return this;
  }

  hasAttribute(attributeName: string): boolean {
    if (attributeName === "to" || attributeName === "alpha") {
      return true;
    }

    // For dynamic colors (object values), check if the attribute exists
    if (isObject(this.value)) {
      return attributeName in this.value;
    }

    // For hex colors and null values, no attributes are supported
    return false;
  }

  getAttribute(attributeName: string): ISymbolType | null {
    if (attributeName === "to") {
      return this;
    }

    if (attributeName === "alpha") {
      return this.alpha !== null
        ? new NumberSymbol(this.alpha, this.config)
        : new NullSymbol(this.config);
    }

    if (isObject(this.value)) {
      const attributeValue = this.value[attributeName];
      if (attributeValue !== undefined) {
        return attributeValue;
      }
    }

    throw new InterpreterError(SymbolsErrorCode.ATTRIBUTE_NOT_FOUND, {
      data: { attributeName, type: "Color" },
    });
  }

  hasMethod(methodName: string, args: ISymbolType[]): boolean {
    // First check if it's a built-in method
    if (super.hasMethod?.(methodName, args)) {
      return true;
    }

    // Check if it's a color conversion method
    if (this.config?.colorManager.hasInitializer(methodName)) {
      return true;
    }

    return false;
  }

  callMethod(methodName: string, args: ISymbolType[]): ISymbolType | null | undefined {
    // First check if it's a built-in method
    const methodDefinition = (this.constructor as any)._SUPPORTED_METHODS?.[
      methodName.toLowerCase()
    ];
    if (methodDefinition && super.hasMethod?.(methodName, args)) {
      return super.callMethod?.(methodName, args);
    }

    // Handle color conversion methods
    if (this.config?.colorManager.hasInitializer(methodName)) {
      return this.config.colorManager.convertToByType(this, methodName);
    }

    throw new InterpreterError(SymbolsErrorCode.METHOD_NOT_FOUND, {
      data: { methodName, type: this.type },
    });
  }

  getTypeName(): string {
    return typeName(this.type, nullToUndefined(this.subType));
  }

  toJs(options?: ToJsOptions): string | Record<string, JsValue> {
    const { stringify = false, recursive = true } = options ?? {};

    if (stringify) {
      return this.toString();
    }

    // For hex colors (string value)
    if (isString(this.value)) {
      return {
        type: this.subType || "hex",
        value: this.value,
        alpha: this.alpha,
      };
    }

    // For dynamic colors (object value)
    if (isObject(this.value)) {
      const result: Record<string, JsValue> = {
        type: this.subType || "unknown",
        alpha: this.alpha,
      };

      for (const [key, val] of Object.entries(this.value)) {
        result[key] = recursive ? val.toJs(options) : (val as any);
      }

      return result;
    }

    // For null values
    return {
      type: this.subType || "unknown",
      value: null,
      alpha: this.alpha,
    };
  }
}

// Symbol Normalization Utilities ----------------------------------------------

export const jsValueToSymbolType = (value: any, config?: Config): ISymbolType => {
  if (value instanceof BaseSymbolType) {
    value.config = config;
    return value;
  }
  if (isNone(value)) return new NullSymbol(config);
  if (isNumber(value)) return new NumberSymbol(value, config);
  if (isString(value)) {
    if (isValidHex(value)) return new ColorSymbol(value, "Hex", null, config);
    return new StringSymbol(value, config);
  }
  if (isBoolean(value)) return new BooleanSymbol(value, config);
  if (isArray(value))
    return new ListSymbol(
      value.map((item) => jsValueToSymbolType(item, config)),
      false,
      config,
    );

  // Convert plain object to dictionary
  if (isObject(value)) {
    const dict = new Map<string, ISymbolType>();
    for (const key in value) {
      dict.set(key, jsValueToSymbolType(value[key], config));
    }
    return new DictionarySymbol(dict, config);
  }

  throw new InterpreterError(SymbolsErrorCode.VALUE_MUST_BE_TYPE, {
    data: { expectedType: "valid TokenScript type", actualType: typeof value },
  });
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
  [TokenSymbol.type.toLowerCase()]: TokenSymbol,
} as const;

export type BasicSymbolTypeConstructor = (typeof basicSymbolTypes)[keyof typeof basicSymbolTypes];

export const isNullableSymbol = (symbol: ISymbolType): boolean =>
  symbol.type.toLowerCase() in nullableSymbolTypes;

export const hasNullValue = (symbol: ISymbolType): boolean =>
  isNullableSymbol(symbol) && isNull(symbol.value);

// Symbol to JS Value Conversion -----------------------------------------------

/**
 * Represents a JavaScript value that can be produced from a TokenScript symbol.
 * This includes primitives, arrays, and plain objects (recursively).
 */
export type JsValue = string | number | boolean | null | JsValue[] | { [key: string]: JsValue };

/**
 * Serializes an interpreter result (symbol or primitive) to a plain JavaScript value.
 */
export function serializeInterpreterResult(
  value: ISymbolType | string | null,
  options?: ToJsOptions,
): unknown {
  if (isString(value)) return value;
  if (isNull(value)) return null;
  if (isTokenscriptSymbol(value)) return value.toJs(options);
  return value;
}

/**
 * Converts an interpreter result to a string representation.
 */
export function stringifyInterpreterResult(value: ISymbolType | string | null): string {
  if (isString(value)) return value;
  if (isTokenscriptSymbol(value)) return value.toString();
  return String(value);
}
