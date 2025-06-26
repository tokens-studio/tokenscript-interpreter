import { describe, expect, it } from "vitest";
import { Interpreter } from "../../interpreter/interpreter";
import { Lexer } from "../../interpreter/lexer";
import { Parser } from "../../interpreter/parser";

describe("Complex Expressions - Nested Operations", () => {
  it("should handle deeply nested parentheses", () => {
    const text = "((((1 + 2) * 3) - 4) / 2)";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("2.5");
  });

  it("should handle complex arithmetic with precedence", () => {
    const text = "1 + 2 * 3 ^ 2 - 4 / 2";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("17");
  });

  it("should handle mixed units in complex expressions", () => {
    const text = "(10px + 5px) * 2 - 5px";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("25px");
  });

  it("should handle nested function calls", () => {
    const text = "max(min(10, 20), min(30, 40))";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("30");
  });

  it("should handle complex boolean expressions", () => {
    const text = "(true && false) || (true && true) && !(false || false)";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.value).toBe(true);
  });

  it("should handle mixed comparison operators", () => {
    const text = "5 > 3 && 10 <= 10 && 7 != 8 && 4 == 4";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.value).toBe(true);
  });
});

describe("Complex Expressions - Variable References", () => {
  it("should handle complex variable references", () => {
    const text = "{a} * ({b} + {c}) - {d} / {e}";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {
      a: 2,
      b: 3,
      c: 4,
      d: 10,
      e: 2,
    });
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("9");
  });

  it("should handle variable references with units", () => {
    const text = "{width}px + {height}px * 2";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {
      width: 10,
      height: 5,
    });
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("20px");
  });

  it("should handle variable references in function calls", () => {
    const text = "max({a}, {b}, {c}) + min({d}, {e})";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {
      a: 10,
      b: 20,
      c: 15,
      d: 5,
      e: 3,
    });
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("23");
  });
});

describe("Complex Expressions - String Operations", () => {
  it("should handle complex string concatenation", () => {
    const text = `
    variable prefix: String = "Hello";
    variable suffix: String = "World";
    variable result: String = prefix " " suffix "!";
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();

    const result = interpreter.symbolTable.get("result");
    expect(result?.toString()).toBe("Hello World!");
  });

  it("should handle string method chaining", () => {
    const text = `
    variable text: String = "  Hello World  ";
    variable result: String = text.trim().upper().concat("!");
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();

    const result = interpreter.symbolTable.get("result");
    expect(result?.toString()).toBe("HELLO WORLD!");
  });

  it("should handle complex string splitting and joining", () => {
    const text = `
    variable text: String = "one,two,three";
    variable parts: List = text.split(",");
    variable first: String = parts.get(0);
    variable last: String = parts.get(2);
    variable result: String = first.concat("-").concat(last);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();

    const result = interpreter.symbolTable.get("result");
    expect(result?.toString()).toBe("one-three");
  });
});

describe("Complex Expressions - List Operations", () => {
  it("should handle complex list manipulations", () => {
    const text = `
    variable list1: List = 1, 2, 3;
    variable list2: List = 4, 5;
    list1.extend(list2);
    list1.insert(3, 99);
    list1.delete(0);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();

    const result = interpreter.symbolTable.get("list1");
    expect(result?.elements.map((e) => e.value)).toEqual([2, 3, 99, 4, 5]);
  });

  it("should handle list operations with variables", () => {
    const text = `
    variable x: Number = 10;
    variable y: Number = 20;
    variable list: List = x, y, x + y;
    variable sum: Number = list.get(0) + list.get(1) + list.get(2);
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();

    const sum = interpreter.symbolTable.get("sum");
    expect(sum?.value).toBe(60);
  });
});

describe("Complex Expressions - Control Flow", () => {
  it("should handle nested if statements", () => {
    const text = `
    variable x: Number = 10;
    variable y: Number = 5;
    variable result: String = "none";
    
    if(x > y) [
        if(x > 15) [
            result = "very large";
        ] else [
            if(x > 8) [
                result = "medium";
            ] else [
                result = "small";
            ];
        ];
    ] else [
        result = "negative";
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();

    const result = interpreter.symbolTable.get("result");
    expect(result?.toString()).toBe("medium");
  });

  it("should handle while loop with complex condition", () => {
    const text = `
    variable i: Number = 0;
    variable sum: Number = 0;
    variable limit: Number = 5;
    
    while(i < limit && sum < 20) [
        sum = sum + i;
        i = i + 1;
    ];
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();

    const i = interpreter.symbolTable.get("i");
    const sum = interpreter.symbolTable.get("sum");
    expect(i?.value).toBe(5);
    expect(sum?.value).toBe(10);
  });
});

describe("Complex Expressions - Mixed Types", () => {
  it("should handle expressions with mixed types in lists", () => {
    const text = `
    variable num: Number = 42;
    variable str: String = "hello";
    variable bool: Boolean = true;
    variable list: List = num, str, bool, num + 8;
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();

    const list = interpreter.symbolTable.get("list");
    expect(list?.elements.length).toBe(4);
    expect(list?.elements[0].value).toBe(42);
    expect(list?.elements[1].toString()).toBe("hello");
    expect(list?.elements[2].value).toBe(true);
    expect(list?.elements[3].value).toBe(50);
  });

  it("should handle complex implicit lists", () => {
    const text = `
    variable a: Number = 10;
    variable b: String = "px";
    variable result: String = a b " solid " "black";
    `;
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    interpreter.interpret();

    const result = interpreter.symbolTable.get("result");
    expect(result?.toString()).toBe("10 px solid black");
  });
});

describe("Complex Expressions - Edge Cases", () => {
  it("should handle very small decimal numbers", () => {
    const text = "0.000001 * 1000000";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("1");
  });

  it("should handle negative numbers in complex expressions", () => {
    const text = "-5 * -3 + -2 / -1";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("17");
  });

  it("should handle zero in various operations", () => {
    const text = "0 + 5 * 0 - 0 / 1 + 0^5";
    const lexer = new Lexer(text);
    const parser = new Parser(lexer);
    const interpreter = new Interpreter(parser, {});
    const result = interpreter.interpret();
    expect(result).not.toBeNull();
    expect(result?.toString()).toBe("0");
  });
});
