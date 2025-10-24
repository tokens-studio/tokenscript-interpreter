import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import type { ISymbolType, ReferenceRecord } from "@src/types";

export interface InterpretOptions {
  references?: ReferenceRecord;
}

export interface InterpretResult {
  value: unknown;
  stringValue: string;
  type: string;
}

/**
 * Interpret a TokenScript expression
 * @param script - The TokenScript expression to interpret
 * @param options - Optional configuration including references
 * @returns The interpreted result
 */
export function interpret(script: string, options: InterpretOptions = {}): InterpretResult {
  const lexer = new Lexer(script);
  const parser = new Parser(lexer);
  const interpreter = new Interpreter(parser, options);
  const result = interpreter.interpret();

  if (!result) {
    return {
      value: null,
      stringValue: "null",
      type: "null",
    };
  }

  const symbolResult = result as ISymbolType;
  return {
    value: symbolResult.value,
    stringValue: symbolResult.toString(),
    type: symbolResult.type,
  };
}

/**
 * Interpret a TokenScript expression and return the string representation
 * @param script - The TokenScript expression to interpret
 * @param options - Optional configuration including references
 * @returns The string representation of the result
 */
export function interpretToString(script: string, options: InterpretOptions = {}): string {
  return interpret(script, options).stringValue;
}

/**
 * Interpret a TokenScript expression and return the raw value
 * @param script - The TokenScript expression to interpret
 * @param options - Optional configuration including references
 * @returns The raw JavaScript value
 */
export function interpretToValue(script: string, options: InterpretOptions = {}): unknown {
  return interpret(script, options).value;
}
