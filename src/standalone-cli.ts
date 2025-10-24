import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import { interpretTokens } from "@src/tokenset-processor";
import type { ISymbolType } from "@src/types";

// QuickJS std module will be imported via banner in tsup config
// and made available as globalThis.std
declare const std: any;

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

function processJson(dtcgJson: any): string {
  try {
    const output = interpretTokens(dtcgJson);
    return JSON.stringify(output);
  } catch (error) {
    // Log more details for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "";
    console.log(`Debug - Error in processJson: ${errorMessage}`);
    if (errorStack) {
      console.log(`Stack: ${errorStack}`);
    }
    throw new Error(`Failed to process JSON: ${errorMessage}`);
  }
}

function loadFile(path: string): string {
  // Try QuickJS std.loadFile first (std is imported via banner and made global)
  const stdModule = (globalThis as any).std || (typeof std !== "undefined" ? std : undefined);
  
  if (stdModule && stdModule.loadFile) {
    try {
      const content = stdModule.loadFile(path);
      if (content === null) {
        throw new Error(`File not found or cannot be read: ${path}`);
      }
      return content;
    } catch (error) {
      throw new Error(`Failed to load file '${path}': ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  
  // Fallback for Node.js (for testing)
  if (typeof process !== "undefined" && typeof require !== "undefined") {
    try {
      const fs = require("fs");
      return fs.readFileSync(path, "utf8");
    } catch (error) {
      throw new Error(`Failed to load file '${path}': ${error instanceof Error ? error.message : "File not found"}`);
    }
  }
  
  throw new Error("File loading not supported in this environment (std module not available)");
}

function main() {
  // Get arguments - works for both Node.js and QuickJS
  // In QuickJS, scriptArgs includes the script filename as first arg, so skip it
  const args = typeof globalThis.scriptArgs !== "undefined" 
    ? globalThis.scriptArgs.slice(1)
    : (typeof process !== "undefined" ? process.argv.slice(2) : []);

  if (args.length === 0) {
    console.log("Usage: tokenscript-standalone <script> [--refs <json>]");
    console.log("       tokenscript-standalone --file <path> [--refs <json>]");
    console.log("       tokenscript-standalone --process-json <dtcg-json>");
    console.log("       tokenscript-standalone --process-json-file <path>");
    console.log("");
    console.log("Examples:");
    console.log('  tokenscript-standalone "1 + 2"');
    console.log('  tokenscript-standalone "{x} + {y}" --refs \'{"x": 5, "y": 10}\'');
    console.log('  tokenscript-standalone --file script.txt --refs \'{"x": 5}\'');
    console.log('  tokenscript-standalone --process-json \'{"color": {"$value": "red"}}\'');
    console.log('  tokenscript-standalone --process-json-file tokens.json');
    throw new Error("Missing arguments");
  }

  // Check for --process-json-file mode (DTCG token file)
  const processJsonFileIndex = args.indexOf("--process-json-file");
  if (processJsonFileIndex !== -1 && args[processJsonFileIndex + 1]) {
    try {
      const filePath = args[processJsonFileIndex + 1];
      const fileContent = loadFile(filePath);
      const dtcgJson = JSON.parse(fileContent);
      const output = processJson(dtcgJson);
      console.log(output);
      return;
    } catch (error) {
      console.log(`Error processing JSON file: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  // Check for --process-json mode (DTCG token processing)
  const processJsonIndex = args.indexOf("--process-json");
  if (processJsonIndex !== -1 && args[processJsonIndex + 1]) {
    try {
      const dtcgJson = JSON.parse(args[processJsonIndex + 1]);
      const output = processJson(dtcgJson);
      console.log(output);
      return;
    } catch (error) {
      console.log(`Error processing JSON: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  // Check for --file mode (load script from file)
  let script: string;
  let isJsonFile = false;
  const fileIndex = args.indexOf("--file");
  if (fileIndex !== -1 && args[fileIndex + 1]) {
    try {
      const filePath = args[fileIndex + 1];
      script = loadFile(filePath);
      
      // Auto-detect JSON files and process as DTCG tokens
      if (filePath.endsWith(".json")) {
        isJsonFile = true;
        try {
          const dtcgJson = JSON.parse(script);
          const output = processJson(dtcgJson);
          console.log(output);
          return;
        } catch (error) {
          console.log(`Error processing JSON file: ${error instanceof Error ? error.message : "Unknown error"}`);
          throw error;
        }
      }
    } catch (error) {
      console.log(`Error loading file: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  } else {
    // Standard mode: first arg is script
    script = args[0];
  }

  // Parse references if provided
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
