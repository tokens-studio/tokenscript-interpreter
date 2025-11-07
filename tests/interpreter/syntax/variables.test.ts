import { InterpreterError } from "@interpreter/errors";
import { createInterpreter, interpretAndGetVariable, interpretAndGetVariables, interpretExpectError } from "@tests/interpreter/test-helpers";
import { describe, expect, it } from "vitest";

describe("Variables - Assignment", () => {
  it("should handle variable assignment", () => {
    const vars = interpretAndGetVariables(
      `
    variable hello: String = abcd;
    variable world: Number = 123;
    variable complex: NumberWithUnit = (1 + 2 * 3)rem;
    `,
      ["hello", "world", "complex"],
    );
    expect(vars.hello?.toString()).toBe("abcd");
    expect(vars.world?.toString()).toBe("123");
    expect(vars.complex?.toString()).toBe("7rem");
  });

  it("should throw error for duplicate variable declaration", () => {
    expect(() =>
      interpretExpectError(`
    variable hello: String = abcd;
    variable hello: String = efgh;
    `),
    ).toThrow(InterpreterError);
  });

  it("should handle variable reassignment", () => {
    const hello = interpretAndGetVariable(
      `
    variable hello: String = abcd;
    hello = efgh;
    `,
      "hello",
    );
    expect(hello?.toString()).toBe("efgh");
  });

  it("should throw error for reassigning undefined variable", () => {
    expect(() =>
      interpretExpectError(`
    hello = efgh;
    `),
    ).toThrow(InterpreterError);
  });

  it("should throw error for invalid value assignment", () => {
    expect(() =>
      interpretExpectError(`
    variable hello: String = abcd;
    hello = 123;
    `),
    ).toThrow(InterpreterError);
  });

  it("should throw error for invalid type unit number assignment", () => {
    expect(() =>
      interpretExpectError(`
    variable hello: String = abcd;
    hello = 123rem;
    `),
    ).toThrow(InterpreterError);
  });

  it("should handle assigning variable from variable", () => {
    const vars = interpretAndGetVariables(
      `
    variable hello: String = abcd;
    variable world: String = hello;
    `,
      ["hello", "world"],
    );
    expect(vars.hello?.toString()).toBe("abcd");
    expect(vars.world?.toString()).toBe("abcd");
  });

  it("should handle variable declaration without initial value and later assignment", () => {
    const interpreter = createInterpreter(`
    variable foo: String;
    foo = '1';
    foo
    `);
    const result = interpreter.interpret();
    const foo = interpreter.symbolTable.get("foo");
    expect(foo).toBeDefined();
    expect(foo?.type).toBe("String");
    expect(foo?.toString()).toBe("1");
    expect(result?.toString()).toBe("1");
  });

  it("should handle variable declaration without initial value for different types", () => {
    const interpreter = createInterpreter(`
    variable numVar: Number;
    variable boolVar: Boolean;
    variable listVar: List;
    variable unitVar: NumberWithUnit;
    
    numVar = 42;
    boolVar = true;
    listVar = 1, 2, 3;
    unitVar = 10px;
    
    numVar
    `);
    const result = interpreter.interpret();
    const vars = interpretAndGetVariables(
      `
    variable numVar: Number;
    variable boolVar: Boolean;
    variable listVar: List;
    variable unitVar: NumberWithUnit;
    
    numVar = 42;
    boolVar = true;
    listVar = 1, 2, 3;
    unitVar = 10px;
    `,
      ["numVar", "boolVar", "listVar", "unitVar"],
    );

    expect(vars.numVar?.type).toBe("Number");
    expect(vars.numVar?.toString()).toBe("42");
    expect(vars.boolVar?.type).toBe("Boolean");
    expect(vars.boolVar?.value).toBe(true);
    expect(vars.listVar?.type).toBe("List");
    expect(vars.listVar?.toString()).toBe("1, 2, 3");
    expect(vars.unitVar?.type).toBe("NumberWithUnit");
    expect(vars.unitVar?.toString()).toBe("10px");
    expect(result?.toString()).toBe("42");
  });

  it("should handle explicit string assignment", () => {
    const vars = interpretAndGetVariables(
      `
    variable hello: String = "abcd";
    hello = "abcdd 'sds'";
    variable world: String = 'efgh';
    variable blub: String = hello;
    variable lst: List = hello world;
    variable lst2: List = hello world blub;
    `,
      ["hello", "world", "blub", "lst", "lst2"],
    );

    expect(vars.hello?.toString()).toBe("abcdd 'sds'");
    expect(vars.world?.toString()).toBe("efgh");
    expect(vars.blub?.toString()).toBe("abcdd 'sds'");
    expect(vars.lst?.toString()).toBe("abcdd 'sds' efgh");
    expect(vars.lst2?.toString()).toBe("abcdd 'sds' efgh abcdd 'sds'");
  });

  it("should throw error for string to number assignment", () => {
    expect(() =>
      interpretExpectError(`
    variable hello: String = "123";
    hello = 123;
    `),
    ).toThrow(InterpreterError);
  });

  it("should throw error for string to number assignment with unit", () => {
    expect(() =>
      interpretExpectError(`
    variable hello: String = "123rem";
    hello = 123;
    `),
    ).toThrow(InterpreterError);
  });

  it("should throw error for list to number assignment", () => {
    expect(() =>
      interpretExpectError(`
    variable hello: List = 1, 2, 3;
    hello = 123;
    `),
    ).toThrow(InterpreterError);
  });
});

describe("Variables - Math Operations", () => {
  it("should throw error for math with strings", () => {
    expect(() =>
      interpretExpectError(`
    variable hello: String = "123";
    variable world: String = "456";
    variable result: Number = hello + world;
    `),
    ).toThrow(InterpreterError);
  });

  it("should handle math with numbers", () => {
    const result = interpretAndGetVariable(
      `
    variable hello: Number = 123;
    variable world: Number = 456;
    variable result: NumberWithUnit = (hello + world)deg;
    `,
      "result",
    );
    expect(result?.toString()).toBe("579deg");
  });
});

describe("Variables - Number Features", () => {
  it("should handle number to string", () => {
    const result = interpretAndGetVariable(
      `
    variable hello: Number = 123;
    variable result: String = hello.to_string();
    `,
      "result",
    );
    expect(result?.toString()).toBe("123");
  });

  it("should handle number to string with unit", () => {
    const result = interpretAndGetVariable(
      `
    variable hello: NumberWithUnit = 123rem;
    variable result: String = hello.to_string();
    `,
      "result",
    );
    expect(result?.toString()).toBe("123rem");
  });
});

describe("Variables - Boolean Features", () => {
  it("should handle boolean operations", () => {
    const vars = interpretAndGetVariables(
      `
    variable hello: Boolean = true;
    variable world: Boolean = false;
    variable result: Boolean = hello && world;
    variable true_result: Boolean = hello || world;
    variable false_result: Boolean = world && hello;
    variable not_result: Boolean = !world;
    `,
      ["result", "true_result", "false_result", "not_result"],
    );

    expect(vars.result?.value).toBe(false);
    expect(vars.true_result?.value).toBe(true);
    expect(vars.false_result?.value).toBe(false);
    expect(vars.not_result?.value).toBe(true);
  });

  it("should handle boolean comparison", () => {
    const vars = interpretAndGetVariables(
      `
    variable hello: Boolean = true;
    variable world: Boolean = false;
    variable result: Boolean = hello == world;
    variable not_result: Boolean = (hello != world) && !world;
    `,
      ["result", "not_result"],
    );

    expect(vars.result?.value).toBe(false);
    expect(vars.not_result?.value).toBe(true);
  });

  it("should handle number comparison", () => {
    const vars = interpretAndGetVariables(
      `
    variable hello: Number = 123;
    variable world: Number = 456;
    variable result: Boolean = hello == world;
    variable not_result: Boolean = !(hello >= world) && !(1 > world);
    `,
      ["result", "not_result"],
    );

    expect(vars.result?.value).toBe(false);
    expect(vars.not_result?.value).toBe(true);
  });
});
