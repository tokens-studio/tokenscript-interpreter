import type { Config } from "@interpreter/config";
import type { LanguageError } from "@interpreter/errors";
import { Interpreter, type InterpreterResult } from "@interpreter/interpreter";
import { type ParseMode, parseExpression } from "@interpreter/parser";
import {
  getResultTypeName,
  isTokenscriptSymbol,
  serializeInterpreterResult,
  stringifyInterpreterResult,
} from "@interpreter/symbols";
import type { ReferenceRecord } from "@src/types";

export interface EvalOptions {
  references?: ReferenceRecord;
  config?: Config;
  /** @deprecated Use `mode` instead. */
  allowStatements?: boolean;
  /** Parsing mode. Defaults to `"inline"`. When `allowStatements` is true, forced to `"script"`. */
  mode?: ParseMode;
}

export interface EvalSuccess {
  success: true;
  result: unknown;
  resultString: string;
  type: string;
  executionTime: number;
}

export interface EvalError {
  success: false;
  error: LanguageError;
  executionTime: number;
}

export type EvalResult = EvalSuccess | EvalError;

export function evaluateExpression(expression: string, options: EvalOptions = {}): EvalResult {
  const { references = {}, config, allowStatements = false } = options;
  const mode: ParseMode = options.mode ?? (allowStatements ? "script" : "inline");
  const startTime = performance.now();

  try {
    const { ast } = parseExpression(expression, { mode });

    if (!ast) {
      return {
        success: true,
        result: null,
        resultString: "null",
        type: "Null",
        executionTime: performance.now() - startTime,
      };
    }

    const interpreter = new Interpreter(ast, { references, config });
    const result: InterpreterResult = interpreter.interpret();

    return {
      success: true,
      result: serializeInterpreterResult(result),
      resultString: stringifyInterpreterResult(result),
      type: isTokenscriptSymbol(result) ? result.getTypeName() : getResultTypeName(result),
      executionTime: performance.now() - startTime,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error as LanguageError,
      executionTime: performance.now() - startTime,
    };
  }
}
