import { describe, expect, it } from "vitest";
import { InterpreterError } from "@interpreter/errors";
import { Interpreter } from "@interpreter/interpreter";
import {
  interpret,
  interpretAndGetVariable,
  interpretAndGetVariables,
  createInterpreter,
  interpretExpectError,
} from "./test-helpers";

describe("Interpreter - Basic Expressions", () => {
  it("should interpret simple expression", () => {
    expect(interpret("1 + {hello} + {world}", { hello: 1, world: 2 })).toBe("4");
  });

  it("should interpret expression with parentheses", () => {
    expect(interpret("(1 + {hello}) * 2", { hello: 3 })).toBe("8");
  });

  it("should interpret expression with nested parentheses", () => {
    expect(interpret("((1 + {hello}) * 2) / 2", { hello: 3 })).toBe("4");
  });

  it("should interpret expression with variables", () => {
    expect(interpret("{hello} + {world}", { hello: 1, world: 2 })).toBe("3");
  });

  it("should interpret expression with operations", () => {
    expect(interpret("{hello} + {world} - 2 * 8 / -4", { hello: 1, world: 2 })).toBe("7");
  });

  it("should interpret expression with format", () => {
    expect(interpret("{hello} + {world}rem", { hello: 1, world: 2 })).toBe("3rem");
  });

  it("should interpret function call", () => {
    expect(interpret("SUM({hello}, {world})", { hello: 1, world: 2 })).toBe("3");
  });

  it("should interpret list of expressions", () => {
    expect(interpret("{hello} + {world} + {test}, 5+6, {test}*2", { hello: 1, world: 2, test: 3 })).toBe("6, 11, 6");
  });

  it("should interpret null/zero", () => {
    expect(interpret("0")).toBe("0");
  });

  it("should interpret implicit list", () => {
    expect(interpret("{hello} {test} 3px", { hello: 1, test: 2 })).toBe("1 2 3px");
  });

  it("should interpret mixed list", () => {
    expect(interpret("{hello} 1px, {test} {hello}, 3px", { hello: 1, test: 2 })).toBe("1 1px, 2 1, 3px");
  });
});

describe("Interpreter - Math Operations", () => {
  it("should handle simple division", () => {
    expect(interpret("4 / 2")).toBe("2");
  });

  it("should handle division resulting in float", () => {
    expect(interpret("5 / 2")).toBe("2.5");
  });

  it("should handle power function", () => {
    expect(interpret("4 * 2^3")).toBe("32");
  });

  it("should handle exponentiation", () => {
    expect(interpret("4 ^ (2 ^ 3) * 5")).toBe("327680");
  });

  it("should handle calc to format", () => {
    expect(interpret("(10*10+4)px")).toBe("104px");
  });

  it("should handle exponential with format", () => {
    expect(interpret("10^2px")).toBe("100px");
  });

  it("should handle exponential with format rem", () => {
    expect(interpret("10rem^2")).toBe("100rem");
  });

  it("should throw error for multiple units", () => {
    expect(() => interpretExpectError("10rem^2px")).toThrow();
  });
});

describe("Interpreter - Functions", () => {
  it("should handle function with no inputs", () => {
    expect(interpret("pi() + 2px")).toBe("5.141592653589793px");
  });

  it("should throw error for unknown function", () => {
    expect(() => interpretExpectError("unknown_function(1, 2, 3)")).toThrow(InterpreterError);
  });

  it("should handle fake function (uninterpreted)", () => {
    expect(interpret("linear-gradient(1, 2 5px, 3rem)")).toBe("linear-gradient(1, 2 5px, 3rem)");
  });
});

describe("Interpreter - Return Statements", () => {
  it("should handle return statement", () => {
    const interpreter = createInterpreter(`
    variable x: Number = 5;
    if(x > 3) [
        return x + 2;
    ];
    `);
    const result = interpreter.interpret();
    expect(Number.parseFloat(result?.value)).toBe(7);
  });
});



describe("Interpreter - References", () => {
  it("should handle float reference", () => {
    const vars = interpretAndGetVariables(`
    variable i: Number = {float_ref};
    variable j: Number = 0.5;
    variable k: Number = i + j;
    `, ["i", "j", "k"], { float_ref: 0.5 });
    expect(vars.i?.value).toBe(0.5);
    expect(vars.j?.value).toBe(0.5);
    expect(vars.k?.value).toBe(1.0);
  });

  it("should throw error for unsupported reference", () => {
    expect(() => {
      const interpreter = createInterpreter(`
      variable i: Number = {unsupported_ref};
      variable j: Number = 0.5;
      variable k: Number = i + j;
      `, { unsupported_ref: new Set([1, 2, 3]) });
      interpreter.interpret();
    }).toThrow(InterpreterError);
  });
});

describe("Interpreter - Variable Name Validation", () => {
  it("should throw error for variable name containing dot", () => {
    const mockAssignNode = {
      nodeType: "AssignNode",
      varName: {
        name: "my.var",
        token: { line: 1, type: "IDENTIFIER", value: "my.var" },
      },
      typeDecl: {
        baseType: { name: "String" },
        subTypes: [],
      },
      assignmentExpr: {
        nodeType: "StringNode",
        value: "test",
        token: { line: 1, type: "STRING", value: "test" },
      },
    };
    const interpreter = new Interpreter(mockAssignNode as any, { references: {} });
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
    expect(() => interpreter.interpret()).toThrow(
      "Invalid variable name 'my.var'. Use a simple name (and underscores) without '.', '-', '['.",
    );
  });

  it("should throw error for variable name containing bracket", () => {
    const mockAssignNode = {
      nodeType: "AssignNode",
      varName: {
        name: "my[var",
        token: { line: 1, type: "IDENTIFIER", value: "my[var" },
      },
      typeDecl: {
        baseType: { name: "String" },
        subTypes: [],
      },
      assignmentExpr: {
        nodeType: "StringNode",
        value: "test",
        token: { line: 1, type: "STRING", value: "test" },
      },
    };
    const interpreter = new Interpreter(mockAssignNode as any, { references: {} });
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
    expect(() => interpreter.interpret()).toThrow(
      "Invalid variable name 'my[var'. Use a simple name (and underscores) without '.', '-', '['.",
    );
  });

  it("should throw error for variable name containing dash", () => {
    const mockAssignNode = {
      nodeType: "AssignNode",
      varName: {
        name: "my-var",
        token: { line: 1, type: "IDENTIFIER", value: "my-var" },
      },
      typeDecl: {
        baseType: { name: "String" },
        subTypes: [],
      },
      assignmentExpr: {
        nodeType: "StringNode",
        value: "test",
        token: { line: 1, type: "STRING", value: "test" },
      },
    };
    const interpreter = new Interpreter(mockAssignNode as any, { references: {} });
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
    expect(() => interpreter.interpret()).toThrow(
      "Invalid variable name 'my-var'. Use a simple name (and underscores) without '.', '-', '['.",
    );
  });

  it("should allow valid variable names with underscores", () => {
    expect(() => interpretExpectError('variable my_var: String = "test";')).not.toThrow();
  });

  it("should allow simple variable names", () => {
    expect(() => interpretExpectError('variable myvar: String = "test";')).not.toThrow();
  });

  it("should throw error for variable name with multiple invalid characters", () => {
    const mockAssignNode = {
      nodeType: "AssignNode",
      varName: {
        name: "my-var.test[0",
        token: { line: 1, type: "IDENTIFIER", value: "my-var.test[0" },
      },
      typeDecl: {
        baseType: { name: "String" },
        subTypes: [],
      },
      assignmentExpr: {
        nodeType: "StringNode",
        value: "test",
        token: { line: 1, type: "STRING", value: "test" },
      },
    };
    const interpreter = new Interpreter(mockAssignNode as any, { references: {} });
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
    expect(() => interpreter.interpret()).toThrow(
      "Invalid variable name 'my-var.test[0'. Use a simple name (and underscores) without '.', '-', '['.",
    );
  });
});

describe("Interpreter - Edge Cases", () => {
  it("should handle empty program", () => {
    expect(interpret("")).toBe("");
  });

  it("should handle token with none", () => {
    expect(interpret("none {is.none}", { "is.none": "none" })).toBe("none none");
  });

  it("should handle token with minus one", () => {
    expect(interpret("-1%")).toBe("-1%");
  });

  it("should handle hex color", () => {
    const interpreter = createInterpreter(`
    variable color: Color = #FF5733;
    return color;
    `);
    const result = interpreter.interpret();
    expect(result?.toString()).toBe("#FF5733");
  });

  it("should handle fake function calls", () => {
    expect(interpret("linear-gradient(1, 2 5px, 3rem)")).toBe("linear-gradient(1, 2 5px, 3rem)");
  });

  it("should handle return statements", () => {
    const interpreter = createInterpreter(`
    variable x: Number = 5;
    if(x > 3) [
        return x + 2;
    ];
    `);
    const result = interpreter.interpret();
    expect(result?.value).toBe(7);
  });
});
