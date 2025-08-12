import { describe, expect, it } from "vitest";
import { InterpreterError } from "../../interpreter/errors";
import { Interpreter } from "../../interpreter/interpreter";
import { Lexer } from "../../interpreter/lexer";
import { Parser } from "../../interpreter/parser";

describe("Interpreter - Basic Expressions", () => {
  it("should interpret simple expression", () => {
    const text = "1 + {hello} + {world}";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { hello: 1, world: 2 });
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("4");
  });

  it("should interpret expression with parentheses", () => {
    const text = "(1 + {hello}) * 2";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { hello: 3 });
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("8");
  });

  it("should interpret expression with nested parentheses", () => {
    const text = "((1 + {hello}) * 2) / 2";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { hello: 3 });
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("4");
  });

  it("should interpret expression with variables", () => {
    const text = "{hello} + {world}";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { hello: 1, world: 2 });
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("3");
  });

  it("should interpret expression with operations", () => {
    const text = "{hello} + {world} - 2 * 8 / -4";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { hello: 1, world: 2 });
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("7");
  });

  it("should interpret expression with format", () => {
    const text = "{hello} + {world}rem";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { hello: 1, world: 2 });
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("3rem");
  });

  it("should interpret function call", () => {
    const text = "SUM({hello}, {world})";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { hello: 1, world: 2 });
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("3");
  });

  it("should interpret list of expressions", () => {
    const text = "{hello} + {world} + {test}, 5+6, {test}*2";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {
      hello: 1,
      world: 2,
      test: 3,
    });
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("6, 11, 6");
  });

  it("should interpret null/zero", () => {
    const text = "0";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("0");
  });

  it("should interpret implicit list", () => {
    const text = "{hello} {test} 3px";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { hello: 1, test: 2 });
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("1 2 3px");
  });

  it("should interpret mixed list", () => {
    const text = "{hello} 1px, {test} {hello}, 3px";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { hello: 1, test: 2 });
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("1 1px, 2 1, 3px");
  });
});

describe("Interpreter - Math Operations", () => {
  it("should handle simple division", () => {
    const text = "4 / 2";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("2");
  });

  it("should handle division resulting in float", () => {
    const text = "5 / 2";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("2.5");
  });

  it("should handle power function", () => {
    const text = "4 * 2^3";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("32");
  });

  it("should handle exponentiation", () => {
    const text = "4 ^ (2 ^ 3) * 5";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("327680");
  });

  it("should handle calc to format", () => {
    const text = "(10*10+4)px";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("104px");
  });

  it("should handle exponential with format", () => {
    const text = "10^2px";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("100px");
  });

  it("should handle exponential with format rem", () => {
    const text = "10rem^2";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("100rem");
  });

  it("should throw error for multiple units", () => {
    const text = "10rem^2px";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow();
  });
});

describe("Interpreter - Functions", () => {
  it("should handle function with no inputs", () => {
    const text = "pi() + 2px";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("5.141592653589793px");
  });

  it("should throw error for unknown function", () => {
    const text = "unknown_function(1, 2, 3)";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    expect(() => interpreter.interpret()).toThrow(InterpreterError);
  });

  it("should handle fake function (uninterpreted)", () => {
    const text = "linear-gradient(1, 2 5px, 3rem)";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("linear-gradient(1, 2 5px, 3rem)");
  });

  it("should handle parse_int function", () => {
    const text = `
    variable i: Number = parse_int("ff", 16);
    variable j: Number = parse_int("00", 16);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    const i = interpreter.symbolTable.get("i");
    const j = interpreter.symbolTable.get("j");
    expect(i?.value).toBe(255);
    expect(j?.value).toBe(0);
  });

  it("should handle math functions", () => {
    const text =
      "min(1, 2, 3) + max(4, 5, 6) - average(7, 8, 9, max(20,98)) + sqrt(round(9.2))";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("-20.5");
  });
});

describe("Interpreter - Return Statements", () => {
  it("should handle return statement", () => {
    const text = `
    variable x: Number = 5;
    if(x > 3) [
        return x + 2;
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(Number.parseFloat(result?.value)).toBe(7);
  });
});

describe("Interpreter - String Methods", () => {
  it("should handle string literal methods", () => {
    const text = `
    variable parts: List = "hello-world".split("-");
    variable color_parts: List = "#000000".split("#");
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    const parts = interpreter.symbolTable.get("parts");
    const colorParts = interpreter.symbolTable.get("color_parts");
    expect(parts?.elements.map((e) => e.toString())).toEqual([
      "hello",
      "world",
    ]);
    expect(colorParts?.elements.map((e) => e.toString())).toEqual([
      "",
      "000000",
    ]);
  });
});

describe("Interpreter - References", () => {
  it("should handle float reference", () => {
    const text = `
    variable i: Number = {float_ref};
    variable j: Number = 0.5;
    variable k: Number = i + j;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { float_ref: 0.5 });
    interpreter.interpret();
    const i = interpreter.symbolTable.get("i");
    const j = interpreter.symbolTable.get("j");
    const k = interpreter.symbolTable.get("k");
    expect(i?.value).toBe(0.5);
    expect(j?.value).toBe(0.5);
    expect(k?.value).toBe(1.0);
  });

  it("should throw error for unsupported reference", () => {
    const text = `
    variable i: Number = {unsupported_ref};
    variable j: Number = 0.5;
    variable k: Number = i + j;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    expect(
      () =>
        new Interpreter(parser, { unsupported_ref: { unsupported_ref: 0.5 } }),
    ).toThrow(InterpreterError);
  });
});

describe("Interpreter - Variable Name Validation", () => {
  it("should throw error for variable name containing dot", () => {
    // Create a mock AST node that bypasses parser validation
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

    const interpreter = new Interpreter(mockAssignNode as any, {});

    expect(() => interpreter.interpret()).toThrow(InterpreterError);
    expect(() => interpreter.interpret()).toThrow(
      "Invalid variable name 'my.var'. Use a simple name (and underscores) without '.', '-', '['.",
    );
  });

  it("should throw error for variable name containing bracket", () => {
    // Create a mock AST node that bypasses parser validation
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

    const interpreter = new Interpreter(mockAssignNode as any, {});

    expect(() => interpreter.interpret()).toThrow(InterpreterError);
    expect(() => interpreter.interpret()).toThrow(
      "Invalid variable name 'my[var'. Use a simple name (and underscores) without '.', '-', '['.",
    );
  });

  it("should throw error for variable name containing dash", () => {
    // Create a mock AST node that bypasses parser validation
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

    const interpreter = new Interpreter(mockAssignNode as any, {});

    expect(() => interpreter.interpret()).toThrow(InterpreterError);
    expect(() => interpreter.interpret()).toThrow(
      "Invalid variable name 'my-var'. Use a simple name (and underscores) without '.', '-', '['.",
    );
  });

  it("should allow valid variable names with underscores", () => {
    const text = 'variable my_var: String = "test";';
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});

    expect(() => interpreter.interpret()).not.toThrow();
  });

  it("should allow simple variable names", () => {
    const text = 'variable myvar: String = "test";';
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});

    expect(() => interpreter.interpret()).not.toThrow();
  });

  it("should throw error for variable name with multiple invalid characters", () => {
    // Create a mock AST node that bypasses parser validation
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

    const interpreter = new Interpreter(mockAssignNode as any, {});

    expect(() => interpreter.interpret()).toThrow(InterpreterError);
    expect(() => interpreter.interpret()).toThrow(
      "Invalid variable name 'my-var.test[0'. Use a simple name (and underscores) without '.', '-', '['.",
    );
  });
});

describe("Interpreter - Edge Cases", () => {
  it("should handle empty program", () => {
    const text = `
    
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result?.toString() || "").toBe("");
  });

  it("should handle token with none", () => {
    const text = "none {is.none}";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, { "is.none": "none" });
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("none none");
  });

  it("should handle token with minus one", () => {
    const text = "-1%";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("-1%");
  });

  it("should handle hex color", () => {
    const text = `
    variable color: Color = #FF5733;
    return color;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("#FF5733");
  });

  it("should handle fake function calls", () => {
    const text = "linear-gradient(1, 2 5px, 3rem)";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("linear-gradient(1, 2 5px, 3rem)");
  });

  it("should handle return statements", () => {
    const text = `
    variable x: Number = 5;
    if(x > 3) [
        return x + 2;
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.value).toBe(7);
  });

  it("should handle parse_int function", () => {
    const text = `
    variable i: Number = parse_int("ff", 16);
    variable j: Number = parse_int("00", 16);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();
    const i = interpreter.symbolTable.get("i");
    const j = interpreter.symbolTable.get("j");
    expect(i?.value).toBe(255);
    expect(j?.value).toBe(0);
  });
});
