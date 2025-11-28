import { Config } from "@interpreter/config";
import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import { processTokens } from "@src/processor/process";

const DEFAULT_CONFIG = new Config();

/**
 * Interpret a simple tokenscript expression using processTokens
 * This is the preferred method for most tests
 */
export function interpret(expression: string, references: Record<string, any> = {}, config: Config = DEFAULT_CONFIG): string {
  const tokens: Record<string, any> = { __test: expression, ...references };
  const output = processTokens(tokens, { config, output: "symbols" });
  const value = output.tokens.get("__test");
  return value?.toString() ?? "";
}

/**
 * Interpret multiple tokens at once, returns processor output with symbols
 */
export function interpretMultiple(tokens: Record<string, string>, config: Config = DEFAULT_CONFIG): any {
  return processTokens(tokens, { config, output: "symbols" });
}

/**
 * Create an interpreter instance directly for advanced test scenarios
 * (e.g., when you need to access the symbol table or test interpreter internals)
 * Use this when you need to test error conditions or access interpreter internals
 */
export function createInterpreter(text: string, references: Record<string, any> = {}, config: Config = DEFAULT_CONFIG): Interpreter {
  const lexer = new Lexer(text, config);
  const parser = new Parser(lexer);
  return new Interpreter(parser, { references, config });
}

/**
 * Interpret and expect an error to be thrown
 * Use this for error testing instead of interpret()
 */
export function interpretExpectError(text: string, references: Record<string, any> = {}, config: Config = DEFAULT_CONFIG): void {
  const interpreter = createInterpreter(text, references, config);
  interpreter.interpret();
}

/**
 * Interpret and get variable from symbol table
 * Use this when you need to test variable assignments
 */
export function interpretAndGetVariable(text: string, variableName: string, references: Record<string, any> = {}, config: Config = DEFAULT_CONFIG): any {
  const interpreter = createInterpreter(text, references, config);
  interpreter.interpret();
  return interpreter.symbolTable.get(variableName);
}

/**
 * Interpret and get multiple variables from symbol table
 */
export function interpretAndGetVariables(
  text: string,
  variableNames: string[],
  references: Record<string, any> = {},
  config: Config = DEFAULT_CONFIG,
): Record<string, any> {
  const interpreter = createInterpreter(text, references, config);
  interpreter.interpret();
  const result: Record<string, any> = {};
  for (const name of variableNames) {
    result[name] = interpreter.symbolTable.get(name);
  }
  return result;
}

/**
 * Parse a tokenscript expression (without interpretation)
 */
export function parse(text: string, isExpression = false, config: Config = DEFAULT_CONFIG): any {
  const lexer = new Lexer(text, config);
  const parser = new Parser(lexer);
  return parser.parse(isExpression);
}

/**
 * Tokenize a tokenscript expression
 */
export function tokenize(text: string, config: Config = DEFAULT_CONFIG): any[] {
  const lexer = new Lexer(text, config);
  const tokens = [];
  let token = lexer.nextToken();
  while (token.type !== "EOF") {
    tokens.push(token);
    token = lexer.nextToken();
  }
  return tokens;
}
