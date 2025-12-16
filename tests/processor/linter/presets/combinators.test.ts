import { ListSymbol, NullSymbol, NumberSymbol, StringSymbol, TokenSymbol } from "@interpreter/symbols";
import { LintSeverity } from "@src/processor/linter";
import type { ValidatorContext } from "@src/processor/linter/presets";
import { arrayOf, list, number, oneOrList, or, string, struct, ValidatorCode } from "@src/processor/linter/presets";
import { describe, expect, it } from "vitest";

const ctx: ValidatorContext = {
  tokenName: "test.token",
  path: [],
  severity: LintSeverity.ERROR,
};

describe("Combinators", () => {
  describe("or()", () => {
    it("should pass if any validator matches", () => {
      const validator = or(number(), string());
      expect(validator(new NumberSymbol(42), ctx)).toBeNull();
      expect(validator(new StringSymbol("hello"), ctx)).toBeNull();
    });

    it("should accept NullSymbol", () => {
      const validator = or(number(), string());
      expect(validator(new NullSymbol(), ctx)).toBeNull();
    });

    it("should fail if no validator matches", () => {
      const validator = or(number({ min: 0 }), string({ allowedValues: ["a", "b"] }));
      const result = validator(new NumberSymbol(-5), ctx);
      expect(result).not.toBeNull();
      expect(result?.code).toBe(ValidatorCode.VALUE_TOO_SMALL);
    });

    it("should work with complex union (font-weight style)", () => {
      const fontWeight = or(number({ min: 1, max: 1000 }), string({ allowedValues: ["normal", "bold"] }));

      expect(fontWeight(new NumberSymbol(400), ctx)).toBeNull();
      expect(fontWeight(new NumberSymbol(700), ctx)).toBeNull();
      expect(fontWeight(new StringSymbol("bold"), ctx)).toBeNull();
      expect(fontWeight(new StringSymbol("normal"), ctx)).toBeNull();

      expect(fontWeight(new NumberSymbol(0), ctx)?.code).toBe(ValidatorCode.VALUE_TOO_SMALL);
      expect(fontWeight(new StringSymbol("invalid"), ctx)?.code).toBe(ValidatorCode.EXPECTED_NUMBER);
    });
  });

  describe("oneOrList()", () => {
    it("should accept single value", () => {
      const validator = oneOrList(number({ min: 0 }));
      expect(validator(new NumberSymbol(10), ctx)).toBeNull();
    });

    it("should accept list of values", () => {
      const validator = oneOrList(number({ min: 0 }));
      const listValue = new ListSymbol([new NumberSymbol(10), new NumberSymbol(20)]);
      expect(validator(listValue, ctx)).toBeNull();
    });

    it("should accept NullSymbol", () => {
      const validator = oneOrList(number({ min: 0 }));
      expect(validator(new NullSymbol(), ctx)).toBeNull();
    });

    it("should validate allowedCounts", () => {
      const validator = oneOrList(number({ min: 0 }), { allowedCounts: [1, 2, 4] });

      expect(validator(new NumberSymbol(10), ctx)).toBeNull();
      expect(validator(new ListSymbol([new NumberSymbol(10)]), ctx)).toBeNull();
      expect(validator(new ListSymbol([new NumberSymbol(10), new NumberSymbol(20)]), ctx)).toBeNull();
      expect(validator(new ListSymbol([new NumberSymbol(10), new NumberSymbol(20), new NumberSymbol(30), new NumberSymbol(40)]), ctx)).toBeNull();

      const result = validator(new ListSymbol([new NumberSymbol(10), new NumberSymbol(20), new NumberSymbol(30)]), ctx);
      expect(result).not.toBeNull();
      expect(result?.code).toBe(ValidatorCode.LIST_LENGTH_INVALID);
    });

    it("should validate each item in list", () => {
      const validator = oneOrList(number({ min: 0 }));
      const listValue = new ListSymbol([new NumberSymbol(10), new NumberSymbol(-5)]);
      const result = validator(listValue, ctx);
      expect(result).not.toBeNull();
      expect(Array.isArray(result) ? result[0]?.code : null).toBe(ValidatorCode.VALUE_TOO_SMALL);
    });

    it("should add index to path for list items", () => {
      const validator = oneOrList(number({ min: 0 }));
      const listValue = new ListSymbol([new NumberSymbol(10), new NumberSymbol(-5)]);
      const result = validator(listValue, ctx);
      const issues = Array.isArray(result) ? result : [result];
      expect(issues[0]?.path).toEqual([1]);
    });
  });

  describe("list()", () => {
    it("should accept valid list", () => {
      const validator = list(number());
      const listValue = new ListSymbol([new NumberSymbol(1), new NumberSymbol(2), new NumberSymbol(3)]);
      expect(validator(listValue, ctx)).toBeNull();
    });

    it("should accept NullSymbol", () => {
      const validator = list(number());
      expect(validator(new NullSymbol(), ctx)).toBeNull();
    });

    it("should reject non-list", () => {
      const validator = list(number());
      const result = validator(new NumberSymbol(42), ctx);
      expect(result).not.toBeNull();
      expect(result?.code).toBe(ValidatorCode.EXPECTED_LIST);
    });

    it("should validate exact count", () => {
      const validator = list(number(), { count: 3 });
      expect(validator(new ListSymbol([new NumberSymbol(1), new NumberSymbol(2), new NumberSymbol(3)]), ctx)).toBeNull();

      const result = validator(new ListSymbol([new NumberSymbol(1), new NumberSymbol(2)]), ctx);
      expect(result?.code).toBe(ValidatorCode.LIST_LENGTH_INVALID);
    });

    it("should validate minCount", () => {
      const validator = list(number(), { minCount: 2 });
      expect(validator(new ListSymbol([new NumberSymbol(1), new NumberSymbol(2)]), ctx)).toBeNull();
      expect(validator(new ListSymbol([new NumberSymbol(1), new NumberSymbol(2), new NumberSymbol(3)]), ctx)).toBeNull();

      const result = validator(new ListSymbol([new NumberSymbol(1)]), ctx);
      expect(result?.code).toBe(ValidatorCode.LIST_LENGTH_INVALID);
    });

    it("should validate maxCount", () => {
      const validator = list(number(), { maxCount: 2 });
      expect(validator(new ListSymbol([new NumberSymbol(1)]), ctx)).toBeNull();
      expect(validator(new ListSymbol([new NumberSymbol(1), new NumberSymbol(2)]), ctx)).toBeNull();

      const result = validator(new ListSymbol([new NumberSymbol(1), new NumberSymbol(2), new NumberSymbol(3)]), ctx);
      expect(result?.code).toBe(ValidatorCode.LIST_LENGTH_INVALID);
    });

    it("should validate each item", () => {
      const validator = list(number({ min: 0 }));
      const listValue = new ListSymbol([new NumberSymbol(10), new NumberSymbol(-5), new NumberSymbol(20)]);
      const result = validator(listValue, ctx);
      const issues = Array.isArray(result) ? result : [result];
      expect(issues).toHaveLength(1);
      expect(issues[0]?.path).toEqual([1]);
    });
  });

  describe("struct()", () => {
    it("should accept valid structured token", () => {
      const validator = struct({
        width: number({ min: 0 }),
        height: number({ min: 0 }),
      });

      const token = new TokenSymbol(
        "dimension",
        new Map([
          ["width", new NumberSymbol(100)],
          ["height", new NumberSymbol(200)],
        ]),
      );

      expect(validator(token, ctx)).toBeNull();
    });

    it("should accept NullSymbol", () => {
      const validator = struct({ width: number() });
      expect(validator(new NullSymbol(), ctx)).toBeNull();
    });

    it("should reject non-structured token", () => {
      const validator = struct({ width: number() });
      const result = validator(new NumberSymbol(42), ctx);
      expect(result?.code).toBe(ValidatorCode.EXPECTED_STRUCTURED);
    });

    it("should validate required fields", () => {
      const validator = struct({
        width: { validator: number({ min: 0 }), required: true },
        height: number({ min: 0 }),
      });

      const tokenWithoutWidth = new TokenSymbol("dimension", new Map([["height", new NumberSymbol(200)]]));

      const result = validator(tokenWithoutWidth, ctx);
      expect(result).not.toBeNull();
      const issues = Array.isArray(result) ? result : [result];
      expect(issues[0]?.code).toBe(ValidatorCode.REQUIRED_FIELD_MISSING);
      expect(issues[0]?.path).toEqual(["width"]);
    });

    it("should validate field values", () => {
      const validator = struct({
        width: number({ min: 0 }),
        height: number({ min: 0 }),
      });

      const token = new TokenSymbol(
        "dimension",
        new Map([
          ["width", new NumberSymbol(-10)],
          ["height", new NumberSymbol(200)],
        ]),
      );

      const result = validator(token, ctx);
      const issues = Array.isArray(result) ? result : [result];
      expect(issues[0]?.code).toBe(ValidatorCode.VALUE_TOO_SMALL);
      expect(issues[0]?.path).toEqual(["width"]);
    });

    it("should warn on missing optional fields when configured", () => {
      const validator = struct(
        {
          width: number(),
          height: number(),
        },
        { warnMissing: true },
      );

      const token = new TokenSymbol("dimension", new Map([["width", new NumberSymbol(100)]]));

      const result = validator(token, ctx);
      const issues = Array.isArray(result) ? result : [result];
      expect(issues[0]?.code).toBe(ValidatorCode.FIELD_MISSING);
      expect(issues[0]?.severity).toBe(LintSeverity.WARNING);
      expect(issues[0]?.path).toEqual(["height"]);
    });

    it("should error on unknown fields in strict mode", () => {
      const validator = struct(
        {
          width: number(),
        },
        { strict: true },
      );

      const token = new TokenSymbol(
        "dimension",
        new Map([
          ["width", new NumberSymbol(100)],
          ["unknown", new NumberSymbol(50)],
        ]),
      );

      const result = validator(token, ctx);
      const issues = Array.isArray(result) ? result : [result];
      expect(issues[0]?.code).toBe(ValidatorCode.UNKNOWN_FIELD);
      expect(issues[0]?.path).toEqual(["unknown"]);
    });

    it("should allow unknown fields by default", () => {
      const validator = struct({
        width: number(),
      });

      const token = new TokenSymbol(
        "dimension",
        new Map([
          ["width", new NumberSymbol(100)],
          ["unknown", new NumberSymbol(50)],
        ]),
      );

      expect(validator(token, ctx)).toBeNull();
    });
  });

  describe("arrayOf()", () => {
    it("should be shorthand for list with minCount: 1", () => {
      const validator = arrayOf(number());
      expect(validator(new ListSymbol([new NumberSymbol(1)]), ctx)).toBeNull();
      expect(validator(new ListSymbol([new NumberSymbol(1), new NumberSymbol(2)]), ctx)).toBeNull();

      const emptyResult = validator(new ListSymbol([]), ctx);
      expect(emptyResult?.code).toBe(ValidatorCode.LIST_LENGTH_INVALID);
    });
  });
});
