import { DictionarySymbol, StringSymbol } from "@interpreter/symbols";
import { createInterpreter } from "@tests/interpreter/test-helpers";
import { describe, expect, test } from "vitest";

describe("Reference Method Calls", () => {
  test("should call get method on referenced Dictionary", () => {
    const dict = new DictionarySymbol(null);
    dict.set(new StringSymbol("test"), new StringSymbol("value"));

    // Test with method call on reference
    const interpreter = createInterpreter('{a}.get("test")', { a: dict });

    const result = interpreter.interpret();
    console.log("Result:", result);
    expect(result).toBeInstanceOf(StringSymbol);
    expect((result as StringSymbol).value).toBe("value");
  });

  test("should chain methods on referenced Dictionary", () => {
    const dict = new DictionarySymbol(null);
    dict.set(new StringSymbol("test"), new StringSymbol("VALUE"));

    // Test with chained method calls
    const interpreter = createInterpreter('{a}.get("test").lower()', { a: dict });

    const result = interpreter.interpret();
    console.log("Result:", result);
    expect(result).toBeInstanceOf(StringSymbol);
    expect((result as StringSymbol).value).toBe("value");
  });
});
