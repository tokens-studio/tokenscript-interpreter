import { describe, expect, test } from 'vitest';
import {
  isSome,
  isNone,
  isObject,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isFunction,
  isDate,
  isPlainObject,
  hasProperty,
  isNonEmptyArray,
  isEmpty,
  safeParseInt,
  safeParseFloat,
  assertIsSome,
  assertIsType,
  optional,
  withDefault,
  isEqual,
  isNull,
  isUndefined,
} from '@interpreter/utils/type';

describe('Type Guard Utilities', () => {
  describe('isSome', () => {
    test('returns true for defined values', () => {
      expect(isSome(0)).toBe(true);
      expect(isSome('')).toBe(true);
      expect(isSome(false)).toBe(true);
      expect(isSome({})).toBe(true);
      expect(isSome([])).toBe(true);
      expect(isSome('hello')).toBe(true);
    });

    test('returns false for null and undefined', () => {
      expect(isSome(null)).toBe(false);
      expect(isSome(undefined)).toBe(false);
    });
  });

  describe('isNone', () => {
    test('returns true for null and undefined', () => {
      expect(isNone(null)).toBe(true);
      expect(isNone(undefined)).toBe(true);
    });

    test('returns false for defined values', () => {
      expect(isNone(0)).toBe(false);
      expect(isNone('')).toBe(false);
      expect(isNone(false)).toBe(false);
      expect(isNone({})).toBe(false);
    });
  });

  describe('isNull', () => {
    test('returns true only for null', () => {
      expect(isNull(null)).toBe(true);
    });

    test('returns false for undefined and other values', () => {
      expect(isNull(undefined)).toBe(false);
      expect(isNull(0)).toBe(false);
      expect(isNull('')).toBe(false);
      expect(isNull(false)).toBe(false);
      expect(isNull({})).toBe(false);
    });
  });

  describe('isUndefined', () => {
    test('returns true only for undefined', () => {
      expect(isUndefined(undefined)).toBe(true);
    });

    test('returns false for null and other values', () => {
      expect(isUndefined(null)).toBe(false);
      expect(isUndefined(0)).toBe(false);
      expect(isUndefined('')).toBe(false);
      expect(isUndefined(false)).toBe(false);
      expect(isUndefined({})).toBe(false);
    });
  });

  describe('isObject', () => {
    test('returns true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
      expect(isObject(new Object())).toBe(true);
    });

    test('returns false for arrays, null, and primitives', () => {
      expect(isObject([])).toBe(false);
      expect(isObject(null)).toBe(false);
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject(undefined)).toBe(false);
    });

    test('returns true for class instances and dates', () => {
      expect(isObject(new Date())).toBe(true);
      expect(isObject(new Error())).toBe(true);
    });
  });

  describe('isString', () => {
    test('returns true for strings', () => {
      expect(isString('')).toBe(true);
      expect(isString('hello')).toBe(true);
      expect(isString(String(123))).toBe(true);
    });

    test('returns false for non-strings', () => {
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });
  });

  describe('isNumber', () => {
    test('returns true for valid numbers', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-1)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
      expect(isNumber(Infinity)).toBe(true);
      expect(isNumber(-Infinity)).toBe(true);
    });

    test('returns false for NaN and non-numbers', () => {
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber('123')).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber({})).toBe(false);
    });
  });

  describe('isBoolean', () => {
    test('returns true for booleans', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
    });

    test('returns false for non-booleans', () => {
      expect(isBoolean(0)).toBe(false);
      expect(isBoolean(1)).toBe(false);
      expect(isBoolean('true')).toBe(false);
      expect(isBoolean(null)).toBe(false);
    });
  });

  describe('isArray', () => {
    test('returns true for arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray(new Array())).toBe(true);
    });

    test('returns false for non-arrays', () => {
      expect(isArray({})).toBe(false);
      expect(isArray('array')).toBe(false);
      expect(isArray(null)).toBe(false);
    });
  });

  describe('isFunction', () => {
    test('returns true for functions', () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function() {})).toBe(true);
      expect(isFunction(Date)).toBe(true);
      expect(isFunction(console.log)).toBe(true);
    });

    test('returns false for non-functions', () => {
      expect(isFunction({})).toBe(false);
      expect(isFunction('function')).toBe(false);
      expect(isFunction(null)).toBe(false);
    });
  });

  describe('isDate', () => {
    test('returns true for valid dates', () => {
      expect(isDate(new Date())).toBe(true);
      expect(isDate(new Date('2023-01-01'))).toBe(true);
    });

    test('returns false for invalid dates and non-dates', () => {
      expect(isDate(new Date('invalid'))).toBe(false);
      expect(isDate('2023-01-01')).toBe(false);
      expect(isDate(123456789)).toBe(false);
      expect(isDate({})).toBe(false);
    });
  });

  describe('isPlainObject', () => {
    test('returns true for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ a: 1 })).toBe(true);
      expect(isPlainObject(Object.create(null))).toBe(true);
    });

    test('returns false for class instances and other objects', () => {
      expect(isPlainObject(new Date())).toBe(false);
      expect(isPlainObject(new Error())).toBe(false);
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject(null)).toBe(false);
    });
  });

  describe('hasProperty', () => {
    test('returns true when object has property', () => {
      const obj = { name: 'test', age: 25 };
      expect(hasProperty(obj, 'name')).toBe(true);
      expect(hasProperty(obj, 'age')).toBe(true);
    });

    test('returns false when object lacks property', () => {
      const obj = { name: 'test' };
      expect(hasProperty(obj, 'age')).toBe(false);
      expect(hasProperty(null, 'name')).toBe(false);
      expect(hasProperty('string', 'length')).toBe(false);
    });
  });

  describe('isNonEmptyArray', () => {
    test('returns true for non-empty arrays', () => {
      expect(isNonEmptyArray([1])).toBe(true);
      expect(isNonEmptyArray([1, 2, 3])).toBe(true);
      expect(isNonEmptyArray(['a'])).toBe(true);
    });

    test('returns false for empty arrays and non-arrays', () => {
      expect(isNonEmptyArray([])).toBe(false);
      expect(isNonEmptyArray({})).toBe(false);
      expect(isNonEmptyArray(null)).toBe(false);
      expect(isNonEmptyArray('array')).toBe(false);
    });
  });

  describe('isEmpty', () => {
    test('returns true for empty values', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({})).toBe(true);
    });

    test('returns false for non-empty values', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty({ a: 1 })).toBe(false);
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(false)).toBe(false);
    });
  });
});

describe('Parsing Utilities', () => {
  describe('safeParseInt', () => {
    test('parses valid integers', () => {
      expect(safeParseInt(123)).toBe(123);
      expect(safeParseInt(3.7)).toBe(3);
      expect(safeParseInt('42')).toBe(42);
      expect(safeParseInt('123.45')).toBe(123);
    });

    test('returns null for invalid inputs', () => {
      expect(safeParseInt('abc')).toBe(null);
      expect(safeParseInt(null)).toBe(null);
      expect(safeParseInt({})).toBe(null);
      expect(safeParseInt('')).toBe(null);
    });
  });

  describe('safeParseFloat', () => {
    test('parses valid floats', () => {
      expect(safeParseFloat(123)).toBe(123);
      expect(safeParseFloat(3.14)).toBe(3.14);
      expect(safeParseFloat('42')).toBe(42);
      expect(safeParseFloat('123.45')).toBe(123.45);
    });

    test('returns null for invalid inputs', () => {
      expect(safeParseFloat('abc')).toBe(null);
      expect(safeParseFloat(null)).toBe(null);
      expect(safeParseFloat({})).toBe(null);
      expect(safeParseFloat('')).toBe(null);
    });
  });
});

describe('Assertion Utilities', () => {
  describe('assertIsSome', () => {
    test('returns value when defined', () => {
      expect(assertIsSome('hello')).toBe('hello');
      expect(assertIsSome(0)).toBe(0);
      expect(assertIsSome(false)).toBe(false);
    });

    test('throws error for null/undefined', () => {
      expect(() => assertIsSome(null)).toThrow('Expected value to be defined');
      expect(() => assertIsSome(undefined)).toThrow('Expected value to be defined');
      expect(() => assertIsSome(null, 'Custom message')).toThrow('Custom message');
    });
  });

  describe('assertIsType', () => {
    test('returns value when type guard passes', () => {
      expect(assertIsType('hello', isString)).toBe('hello');
      expect(assertIsType(123, isNumber)).toBe(123);
    });

    test('throws error when type guard fails', () => {
      expect(() => assertIsType(123, isString)).toThrow('Type assertion failed');
      expect(() => assertIsType('hello', isNumber, 'Not a number')).toThrow('Not a number');
    });
  });
});

describe('Helper Utilities', () => {
  describe('optional', () => {
    test('applies function when value is defined', () => {
      const result = optional('hello', (s) => s.toUpperCase());
      expect(result).toBe('HELLO');
    });

    test('returns undefined when value is null/undefined', () => {
      expect(optional(null, (s: string) => s.toUpperCase())).toBeUndefined();
      expect(optional(undefined, (s: string) => s.toUpperCase())).toBeUndefined();
    });
  });

  describe('withDefault', () => {
    test('returns value when defined', () => {
      expect(withDefault('hello', 'default')).toBe('hello');
      expect(withDefault(0, 42)).toBe(0);
    });

    test('returns default when value is null/undefined', () => {
      expect(withDefault(null, 'default')).toBe('default');
      expect(withDefault(undefined, 'default')).toBe('default');
    });
  });

  describe('isEqual', () => {
    test('compares primitives correctly', () => {
      expect(isEqual(1, 1)).toBe(true);
      expect(isEqual('a', 'a')).toBe(true);
      expect(isEqual(true, true)).toBe(true);
      expect(isEqual(null, null)).toBe(true);
      expect(isEqual(undefined, undefined)).toBe(true);

      expect(isEqual(1, 2)).toBe(false);
      expect(isEqual('a', 'b')).toBe(false);
      expect(isEqual(null, undefined)).toBe(false);
    });

    test('compares arrays correctly', () => {
      expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(isEqual([], [])).toBe(true);
      expect(isEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);

      expect(isEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(isEqual([1, 2], [2, 1])).toBe(false);
    });

    test('compares objects correctly', () => {
      expect(isEqual({}, {})).toBe(true);
      expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(isEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
      expect(isEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);

      expect(isEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    test('compares mixed types correctly', () => {
      expect(isEqual([], {})).toBe(false);
      expect(isEqual('1', 1)).toBe(false);
      expect(isEqual(true, 1)).toBe(false);
    });
  });
});
