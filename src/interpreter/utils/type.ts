// Optional --------------------------------------------------------------------

export const isSome = <T>(v: T | null | undefined): v is T => {
  return v != null;
};

export const isNone = (v: unknown): v is null | undefined => {
  return v == null;
};

// Primitive type guards -------------------------------------------------------

export const isNull = (v: unknown): v is null => {
  return v === null;
};

export const isUndefined = (v: unknown): v is undefined => {
  return v === undefined;
};

export const isObject = (v: unknown): v is Record<string, unknown> => {
  return typeof v === "object" && v !== null && !Array.isArray(v);
};

export const isString = (v: unknown): v is string => {
  return typeof v === "string";
};

export const isNumber = (v: unknown): v is number => {
  return typeof v === "number" && !Number.isNaN(v);
};

export const isBoolean = (v: unknown): v is boolean => {
  return typeof v === "boolean";
};

export const isArray = <T = unknown>(v: unknown): v is T[] => {
  return Array.isArray(v);
};

export const isFunction = (v: unknown): v is (...args: unknown[]) => unknown => {
  return typeof v === "function";
};

export const isDate = (v: unknown): v is Date => {
  return v instanceof Date && !Number.isNaN(v.getTime());
};

// Object ----------------------------------------------------------------------

export const isPlainObject = (v: unknown): v is Record<string, unknown> => {
  if (!isObject(v)) return false;

  // Objects created by the Object constructor or with null prototype
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

export const hasProperty = <K extends string>(obj: unknown, key: K): obj is Record<K, unknown> => {
  return isObject(obj) && key in obj;
};

// Array -----------------------------------------------------------------------

export const isNonEmptyArray = <T>(v: unknown): v is [T, ...T[]] => {
  return isArray(v) && v.length > 0;
};

export const isEmpty = (v: unknown): boolean => {
  if (isNone(v)) return true;
  if (isString(v) || isArray(v)) return v.length === 0;
  if (isObject(v)) return Object.keys(v).length === 0;
  return false;
};

// Number parsing --------------------------------------------------------------

export const safeParseInt = (v: unknown): number | null => {
  if (isNumber(v)) return Math.floor(v);
  if (isString(v)) {
    const parsed = parseInt(v, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

export const safeParseFloat = (v: unknown): number | null => {
  if (isNumber(v)) return v;
  if (isString(v)) {
    const parsed = parseFloat(v);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

// Type Assertion Helpers ------------------------------------------------------

export const assertIsSome = <T>(v: T | null | undefined, message?: string): T => {
  if (isNone(v)) {
    throw new Error(message || "Expected value to be defined");
  }
  return v;
};

export const assertIsType = <T>(v: unknown, guard: (v: unknown) => v is T, message?: string): T => {
  if (!guard(v)) {
    throw new Error(message || "Type assertion failed");
  }
  return v;
};

export const optional = <T, R>(value: T | null | undefined, fn: (v: T) => R): R | undefined => {
  return isSome(value) ? fn(value) : undefined;
};

export const withDefault = <T>(v: T | null | undefined, defaultValue: T): T => {
  return isSome(v) ? v : defaultValue;
};

export const isEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;

  if (isNone(a) || isNone(b)) return a === b;

  if (isArray(a) && isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => isEqual(item, b[index]));
  }

  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) => keysB.includes(key) && isEqual(a[key], b[key]));
  }

  return false;
};

// Conversion ------------------------------------------------------------------

export const nullToUndefined = <T>(v: T | null | undefined): T | undefined => (isNull(v) ? undefined : v);
