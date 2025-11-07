import { describe, expect, it } from "vitest";
import { InterpreterError } from "@interpreter/errors";
import {
  interpretAndGetVariable,
  interpretAndGetVariables,
  createInterpreter,
  interpretExpectError,
} from "./test-helpers";

describe("Control Structures - While Loops", () => {
  it("should handle basic while loop", () => {
    const result = interpretAndGetVariable(`
    variable i: Number = 0;
    while(i < 5) [
        i = i + 1;
    ];
    `, "i");
    expect(result?.value).toBe(5);
  });

  it("should handle nested while loops", () => {
    const vars = interpretAndGetVariables(`
    variable i: NumberWithUnit = 0px;
    variable j: Number = 0;
    while(i < 3) [
        j = 0;
        while(j < 2) [
            j = j + 1;
        ];
        i = i + 1;
    ];
    `, ["i", "j"]);
    expect(vars.i?.toString()).toBe("3px");
    expect(vars.j?.value).toBe(2);
  });

  it("should handle while loop with multiple statements", () => {
    const vars = interpretAndGetVariables(`
    variable i: NumberWithUnit = 0px;
    variable j: Number = 0;
    variable b: Boolean = true;
    while(i < 3 && b) [
        j = 0;
        while(j < 2) [
            j = j + 1;
        ];
        i = i + 1;
    ];
    `, ["i", "j"]);
    expect(vars.i?.toString()).toBe("3px");
    expect(vars.j?.value).toBe(2);
  });

  it("should throw error for infinite while loop", () => {
    expect(() => interpretExpectError(`
    variable j: Number = 0;
    while(true) [
        j = j + 1;
    ];
    `)).toThrow(InterpreterError);
  });

  it("should throw error for non-boolean while condition", () => {
    expect(() => interpretExpectError(`
    variable i: Number = 0;
    while(5) [
        i = i + 1;
    ];
    `)).toThrow(InterpreterError);
  });
});

describe("Control Structures - If Statements", () => {
  it("should handle basic if statement", () => {
    const result = interpretAndGetVariable(`
    variable x: Number = 0;
    if(true) [
        x = 5;
    ];
    `, "x");
    expect(result?.value).toBe(5);
  });

  it("should handle if statement with false condition", () => {
    const result = interpretAndGetVariable(`
    variable x: Number = 0;
    if(false) [
        x = 5;
    ];
    `, "x");
    expect(result?.value).toBe(0);
  });

  it("should handle if statement with complex condition", () => {
    const result = interpretAndGetVariable(`
    variable x: Number = 0;
    variable y: Number = 5;
    if(x < y && true) [
        x = 10;
    ];
    `, "x");
    expect(result?.value).toBe(10);
  });

  it("should throw error for non-boolean if condition", () => {
    expect(() => interpretExpectError(`
    variable x: Number = 0;
    if(5) [
        x = 10;
    ];
    `)).toThrow(InterpreterError);
  });

  it("should handle if-else statement", () => {
    const result = interpretAndGetVariable(`
    variable x: Number = 0;
    if(false) [
        x = 5;
    ] else [
        x = 10;
    ];
    `, "x");
    expect(result?.value).toBe(10);
  });

  it("should handle if-elif-else statement", () => {
    const result = interpretAndGetVariable(`
    variable x: Number = 0;
    if(false) [
        x = 5;
    ] elif(true) [
        x = 10;
    ] else [
        x = 15;
    ];
    `, "x");
    expect(result?.value).toBe(10);
  });

  it("should handle if-elif-else all false conditions", () => {
    const result = interpretAndGetVariable(`
    variable x: Number = 0;
    if(false) [
        x = 5;
    ] elif(false) [
        x = 10;
    ] else [
        x = 15;
    ];
    `, "x");
    expect(result?.value).toBe(15);
  });

  it("should handle multiple elif statements", () => {
    const result = interpretAndGetVariable(`
    variable x: Number = 0;
    if(false) [
        x = 5;
    ] elif(false) [
        x = 10;
    ] elif(true) [
        x = 20;
    ] elif(true) [
        x = 25;
    ] else [
        x = 30;
    ];
    `, "x");
    expect(result?.value).toBe(20);
  });

  it("should throw error for non-boolean elif condition", () => {
    expect(() => interpretExpectError(`
    variable x: Number = 0;
    if(5) [
        x = 5;
    ] elif("test") [
        x = 10;
    ] else [
        x = 15;
    ];
    `)).toThrow(InterpreterError);
  });

  it("should handle return in elif statement", () => {
    const interpreter = createInterpreter(`
    variable x: Number = 0;
    if(false) [
        return 5;
    ] elif(true) [
        return 10;
    ] else [
        return 15;
    ];
    `);
    const result = interpreter.interpret();
    expect(result?.value).toBe(10);
  });
});
