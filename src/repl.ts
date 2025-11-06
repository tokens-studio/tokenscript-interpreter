import type { Config } from "@interpreter/config";
import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import type { ReferenceRecord } from "@src/types";
import { fetchAndRegisterSchemas } from "@src/utils/schema-fetcher";
import * as readlineSync from "readline-sync";

/**
 * Start interactive REPL mode for TokenScript
 */
export async function startRepl(schemas?: string[]): Promise<void> {
  console.log("🚀 TokenScript Interactive Mode");
  console.log('Type "exit" or "quit" to exit, "set_variables" to set token references');
  console.log("");

  const config = await fetchAndRegisterSchemas(schemas ?? []);
  let references: ReferenceRecord = {};

  while (true) {
    try {
      const input = readlineSync.question("Enter expression: ");

      if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
        console.log("👋 Goodbye!");
        break;
      }

      if (input.toLowerCase() === "set_variables") {
        references = await setVariablesInteractively(references);
        continue;
      }

      if (input.trim() === "") {
        continue;
      }

      const result = await interpretExpression(input, references, config);
      console.log(`✅ Result: ${result}`);
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

async function setVariablesInteractively(
  currentReferences: ReferenceRecord,
): Promise<ReferenceRecord> {
  const references = { ...currentReferences };

  console.log('🔧 Setting variables (enter "done" to finish):');

  while (true) {
    const input = readlineSync.question('Enter variable (name=value) or "done": ');

    if (input.toLowerCase() === "done") {
      break;
    }

    try {
      const [name, value] = input.split("=").map((s) => s.trim());
      if (!name || value === undefined) {
        console.log("⚠️  Invalid input. Please enter in the format name=value.");
        continue;
      }

      // Try to parse as number first, then as string
      const numValue = Number.parseFloat(value);
      if (!Number.isNaN(numValue)) {
        references[name] = numValue;
      } else {
        references[name] = value;
      }

      console.log(`✅ Set ${name} = ${references[name]}`);
    } catch (_error) {
      console.log("⚠️  Invalid input. Please enter in the format name=value.");
    }
  }

  return references;
}

async function interpretExpression(
  code: string,
  references: ReferenceRecord,
  config?: Config,
): Promise<string> {
  try {
    const lexer = new Lexer(code);
    const parser = new Parser(lexer);
    const ast = parser.parse(true);

    if (!ast) {
      return "No result (empty input)";
    }

    const interpreter = new Interpreter(ast, { references, config });
    const result = interpreter.interpret();

    if (result === null) {
      return "null";
    }
    if (typeof result === "string") {
      return result;
    }
    return result.toString();
  } catch (error: any) {
    throw new Error(`Interpretation failed: ${error.message}`);
  }
}
