import { describe, expect, it } from "vitest";

import { NullSymbol, jsValueToSymbolType } from "@src/interpreter/symbols";

describe("NullSymbol", () => {
  it("should create a NullSymbol instance", () => {
    const nullSym = new NullSymbol();
    
    expect(nullSym.type).toBe("Null");
    expect(nullSym.value).toBe(null);
    expect(nullSym.toString()).toBe("null");
  });

  it("should create empty NullSymbol", () => {
    const emptySym = NullSymbol.empty();
    
    expect(emptySym).toBeInstanceOf(NullSymbol);
    expect(emptySym.type).toBe("Null");
    expect(emptySym.value).toBe(null);
  });

  it("should handle equals correctly", () => {
    const null1 = new NullSymbol();
    const null2 = new NullSymbol();
    
    expect(null1.equals(null2)).toBe(true);
    expect(null2.equals(null1)).toBe(true);
  });

  it("should accept any value as valid", () => {
    const nullSym = new NullSymbol();
    
    expect(nullSym.validValue(null)).toBe(true);
    expect(nullSym.validValue(undefined)).toBe(true);
    expect(nullSym.validValue("string")).toBe(false);
    expect(nullSym.validValue(42)).toBe(false);
    expect(nullSym.validValue({})).toBe(false);
  });

  it("should be created from jsValueToSymbolType for null/undefined", () => {
    const nullSym = jsValueToSymbolType(null);
    const undefinedSym = jsValueToSymbolType(undefined);
    
    expect(nullSym).toBeInstanceOf(NullSymbol);
    expect(undefinedSym).toBeInstanceOf(NullSymbol);
    expect(nullSym.type).toBe("Null");
    expect(undefinedSym.type).toBe("Null");
  });
});
