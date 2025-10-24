import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import type { ISymbolType } from "@src/types";

interface InterpretResult {
  value: unknown;
  stringValue: string;
  type: string;
}

function interpret(script: string, references?: Record<string, unknown>): InterpretResult {
  const lexer = new Lexer(script);
  const parser = new Parser(lexer);
  const interpreter = new Interpreter(parser, { references });
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

function main() {
  // Get arguments - works for both Node.js and QuickJS
  // In QuickJS, scriptArgs includes the script filename as first arg, so skip it
  const args = typeof globalThis.scriptArgs !== "undefined" 
    ? globalThis.scriptArgs.slice(1)
    : (typeof process !== "undefined" ? process.argv.slice(2) : []);

  if (args.length === 0) {
    console.log("Usage: tokenscript-standalone <script> [--refs <json>]");
    console.log("");
    console.log("Examples:");
    console.log('  tokenscript-standalone "1 + 2"');
    console.log('  tokenscript-standalone "{x} + {y}" --refs \'{"x": 5, "y": 10}\'');
    console.log('  tokenscript-standalone "rgb({r}, {g}, {b})" --refs \'{"r": 255, "g": 128, "b": 0}\'');
    throw new Error("Missing arguments");
  }

  const script = args[0];
  let references: Record<string, unknown> | undefined;

  const refsIndex = args.indexOf("--refs");
  if (refsIndex !== -1 && args[refsIndex + 1]) {
    try {
      references = JSON.parse(args[refsIndex + 1]);
    } catch (error) {
      console.log("Error: Invalid JSON for --refs argument");
      throw error;
    }
  }

  try {
    const result = interpret(script, references);
    console.log(result.stringValue);
  } catch (error) {
    if (error instanceof Error) {
      console.log(`Error: ${error.message}`);
    } else {
      console.log("Unknown error occurred");
    }
    throw error;
  }
}

main();
