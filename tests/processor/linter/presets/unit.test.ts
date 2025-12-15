import { NullSymbol, NumberSymbol, NumberWithUnitSymbol } from "@interpreter/symbols";
import { LintSeverity } from "@src/processor/linter";
import type { ValidatorContext } from "@src/processor/linter/presets";
import { numberWithUnit, ValidatorCode } from "@src/processor/linter/presets";
import { describe, expect, it } from "vitest";

const ctx: ValidatorContext = {
  tokenName: "test.token",
  path: [],
  severity: LintSeverity.ERROR,
};

describe("numberWithUnit()", () => {
  it("should accept NumberWithUnitSymbol", () => {
    expect(numberWithUnit()(new NumberWithUnitSymbol(10, "px"), ctx)).toBeNull();
    expect(numberWithUnit()(new NumberWithUnitSymbol(1.5, "em"), ctx)).toBeNull();
    expect(numberWithUnit()(new NumberWithUnitSymbol(100, "%"), ctx)).toBeNull();
  });

  it("should accept plain NumberSymbol", () => {
    expect(numberWithUnit()(new NumberSymbol(10), ctx)).toBeNull();
    expect(numberWithUnit()(new NumberSymbol(0), ctx)).toBeNull();
  });

  it("should accept NullSymbol", () => {
    expect(numberWithUnit()(new NullSymbol(), ctx)).toBeNull();
  });

  it("should accept null values", () => {
    expect(numberWithUnit()(new NumberWithUnitSymbol(null, "px"), ctx)).toBeNull();
    expect(numberWithUnit()(new NumberSymbol(null), ctx)).toBeNull();
  });

  it("should validate min constraint", () => {
    const validator = numberWithUnit({ min: 0 });
    expect(validator(new NumberWithUnitSymbol(0, "px"), ctx)).toBeNull();
    expect(validator(new NumberWithUnitSymbol(10, "px"), ctx)).toBeNull();

    const result = validator(new NumberWithUnitSymbol(-5, "px"), ctx);
    expect(result).not.toBeNull();
    expect(result?.code).toBe(ValidatorCode.VALUE_TOO_SMALL);
  });

  it("should validate max constraint", () => {
    const validator = numberWithUnit({ max: 100 });
    expect(validator(new NumberWithUnitSymbol(100, "px"), ctx)).toBeNull();

    const result = validator(new NumberWithUnitSymbol(101, "px"), ctx);
    expect(result).not.toBeNull();
    expect(result?.code).toBe(ValidatorCode.VALUE_TOO_LARGE);
  });

  it("should validate allowedUnits", () => {
    const validator = numberWithUnit({ allowedUnits: ["px", "em"] });
    expect(validator(new NumberWithUnitSymbol(10, "px"), ctx)).toBeNull();
    expect(validator(new NumberWithUnitSymbol(1.5, "em"), ctx)).toBeNull();

    const result = validator(new NumberWithUnitSymbol(100, "%"), ctx);
    expect(result).not.toBeNull();
    expect(result?.code).toBe(ValidatorCode.UNIT_NOT_ALLOWED);
  });

  it("should validate disallowedUnits", () => {
    const validator = numberWithUnit({ disallowedUnits: ["%"] });
    expect(validator(new NumberWithUnitSymbol(10, "px"), ctx)).toBeNull();
    expect(validator(new NumberWithUnitSymbol(1.5, "em"), ctx)).toBeNull();

    const result = validator(new NumberWithUnitSymbol(100, "%"), ctx);
    expect(result).not.toBeNull();
    expect(result?.code).toBe(ValidatorCode.UNIT_DISALLOWED);
  });

  it("should not check units for plain NumberSymbol", () => {
    const validator = numberWithUnit({ allowedUnits: ["px"] });
    expect(validator(new NumberSymbol(10), ctx)).toBeNull();
  });

  it("should combine constraints", () => {
    const validator = numberWithUnit({ min: 0, allowedUnits: ["px", "em"] });
    expect(validator(new NumberWithUnitSymbol(10, "px"), ctx)).toBeNull();

    expect(validator(new NumberWithUnitSymbol(-5, "px"), ctx)?.code).toBe(ValidatorCode.VALUE_TOO_SMALL);
    expect(validator(new NumberWithUnitSymbol(10, "%"), ctx)?.code).toBe(ValidatorCode.UNIT_NOT_ALLOWED);
  });

  it("should require unit when requireUnit is true", () => {
    const validator = numberWithUnit({ requireUnit: true });
    expect(validator(new NumberWithUnitSymbol(10, "px"), ctx)).toBeNull();
    expect(validator(new NumberWithUnitSymbol(0, "em"), ctx)).toBeNull();

    const result = validator(new NumberSymbol(10), ctx);
    expect(result).not.toBeNull();
    expect(result?.code).toBe(ValidatorCode.EXPECTED_NUMBER_WITH_UNIT);
  });

  it("should allow plain numbers when requireUnit is false (default)", () => {
    const validator = numberWithUnit({ allowedUnits: ["px"] });
    expect(validator(new NumberSymbol(10), ctx)).toBeNull();
  });
});
