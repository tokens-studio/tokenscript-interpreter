import { getAssignmentInfo, getReassignmentInfo } from "@interpreter/ast";
import type { Config } from "@interpreter/config";
import { Interpreter } from "@interpreter/interpreter";
import { type ParseMode, parseExpression } from "@interpreter/parser";
import { isNone } from "@interpreter/utils/type";
import type { ReferenceRecord } from "@src/types";
import { fetchAndRegisterSchemas } from "@src/utils/schema-fetcher";
import * as readlineSync from "readline-sync";

export type ReplMode = ParseMode;

export interface ReplOptions {
  mode?: ReplMode;
  schemas?: string[];
  references?: ReferenceRecord;
}

/**
 * Start interactive REPL mode for TokenScript
 */
export async function startRepl(options: ReplOptions = {}): Promise<void> {
  const { mode = "inline", schemas, references: initialReferences } = options;

  const config = await fetchAndRegisterSchemas(schemas ?? []);
  const references: ReferenceRecord = { ...initialReferences };
  let scriptLines: string[] = [];

  console.log(
    `Mode: ${mode === "inline" ? "inline (execute each line)" : "script (accumulate and execute)"}`,
  );
  console.log('"exit()" to exit, "clear()" to clear.');
  console.log("");

  while (true) {
    try {
      const input = readlineSync.question("> ");
      const cmd = input.toLowerCase().trim();

      if (cmd === "exit()") {
        break;
      }

      if (cmd === "clear()") {
        scriptLines = [];
        console.clear();
        console.log(
          `Mode: ${mode === "inline" ? "inline (execute each line)" : "script (accumulate and execute)"}`,
        );
        console.log('"exit()" to exit, "clear()" to clear.');
        console.log("");
        continue;
      }

      if (input.trim() === "") {
        continue;
      }

      let result: string | undefined;
      if (mode === "inline") {
        result = interpretExpression(input, references, config, "inline");
      } else {
        const autoSemiLastLineInput = input.endsWith(";") ? input : `${input};`;
        scriptLines.push(autoSemiLastLineInput);
        const fullScript = scriptLines.join("\n");
        result = interpretExpression(fullScript, references, config, "script");
      }
      if (result) {
        console.log(result);
      }
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      if (mode === "script") {
        scriptLines.pop();
      }
    }
  }
}

/**
 * Get the output value for a REPL display.
 * Handles special cases for assignments and reassignments.
 */
function getDisplayValue(
  ast: import("@interpreter/ast").ASTNode,
  interpreter: Interpreter,
  result: unknown,
): string | undefined {
  const assignmentInfo = getAssignmentInfo(ast);
  const reassignmentInfo = getReassignmentInfo(ast);

  // Check if the last statement is an assignment or reassignment first
  // This takes priority over the result value (important for script mode)
  if (assignmentInfo) {
    // For assignments, only print if there's an assigned value
    if (assignmentInfo.hasAssignment) {
      const varValue = interpreter.getSymbol(assignmentInfo.varName);
      if (varValue) {
        return varValue.toString();
      }
    }
    // Nullable assignment without value - don't print anything
    return;
  }

  if (reassignmentInfo) {
    const varValue = interpreter.getSymbol(reassignmentInfo.varName);
    if (varValue) {
      return varValue.toString();
    }
    return;
  }

  // Not an assignment/reassignment, print the result
  if (isNone(result)) {
    return;
  }

  if (typeof result === "string") {
    return result;
  }

  return result.toString();
}

export function interpretExpression(
  code: string,
  references: ReferenceRecord,
  config: Config | undefined,
  mode: ParseMode,
): string | undefined {
  try {
    const { ast } = parseExpression(code, { mode });

    if (!ast) {
      return "No result (empty input)";
    }

    const interpreter = new Interpreter(ast, { references, config });
    const result = interpreter.interpret();

    return getDisplayValue(ast, interpreter, result);
  } catch (error: any) {
    throw new Error(`Interpretation failed: ${error.message}`);
  }
}
