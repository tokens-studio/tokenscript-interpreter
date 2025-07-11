#!/usr/bin/env node

import * as fs from "node:fs";
import chalk from "chalk";
import { Command } from "commander";
import * as readlineSync from "readline-sync";
import * as yauzl from "yauzl";
import { evaluateStandardCompliance } from "./compliance-suite";
import { Interpreter } from "./interpreter/interpreter";
import { Lexer } from "./interpreter/lexer";
import { Parser } from "./interpreter/parser";
import {
  buildThemeTree,
  interpretTokens,
  interpretTokensets,
  permutateTokensets,
  processThemes,
} from "./tokenset-processor";
import type { ReferenceRecord } from "./types";

const program = new Command();

// CLI version and description
program
  .name("tokenscript")
  .description("TokenScript Interpreter CLI - A command-line interface for TokenScript language")
  .version("1.0.0");

// Interactive mode command
program
  .command("interactive")
  .description("Start interactive REPL mode for TokenScript")
  .action(async () => {
    await interactiveMode();
  });

// Parse tokenset command
program
  .command("parse_tokenset")
  .description("Parse and process a tokenset from a ZIP file")
  .requiredOption("--tokenset <path>", "Path to the tokenset ZIP file")
  .option("--output <path>", "Output file path", "output.json")
  .action(async (options) => {
    await parseTokenset(options.tokenset, options.output);
  });

// Permutate tokenset command
program
  .command("permutate_tokenset")
  .description("Generate permutations of tokensets based on themes")
  .requiredOption("--tokenset <path>", "Path to the tokenset ZIP file")
  .requiredOption("--permutate-on <themes...>", "List of theme groups to permutate on")
  .requiredOption("--permutate-to <theme>", "Target theme group for permutation")
  .option("--output <path>", "Output file path", "permutations.json")
  .action(async (options) => {
    await permutateTokenset(
      options.tokenset,
      options.permutateOn,
      options.permutateTo,
      options.output
    );
  });

// Parse JSON command - simple API for DTCG JSON blobs
program
  .command("parse_json")
  .description("Parse and process a DTCG JSON file directly")
  .requiredOption("--json <path>", "Path to the DTCG JSON file")
  .option("--output <path>", "Output file path", "output.json")

  .action(async (options) => {
    await parseJsonFile(options.json, options.output);
  });

// Evaluate standard compliance command
program
  .command("evaluate_standard_compliance")
  .description("Run the TokenScript compliance suite on a directory of tests")
  .option("--test-dir <path>", "Path to the directory containing compliance tests")
  .option("--test-file <path>", "Path to a specific test file to run")
  .option("--output <path>", "Output file path", "compliance-report.json")
  .action(async (options) => {
    const config = {
      dir: options.testDir,
      file: options.testFile,
      output: options.output,
    };
    const report = await evaluateStandardCompliance(config);
    console.log(`Compliance suite finished. Passed: ${report.passed}, Failed: ${report.failed}`);
    console.log(`Full report written to ${options.output}`);
  });

// Interactive REPL mode
async function interactiveMode(): Promise<void> {
  console.log(chalk.cyan.bold("🚀 TokenScript Interactive Mode"));
  console.log(chalk.gray('Type "exit" or "quit" to exit, "set_variables" to set token references'));
  console.log("");

  let references: ReferenceRecord = {};

  while (true) {
    try {
      const input = readlineSync.question(chalk.blue("Enter expression: "));

      if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
        console.log(chalk.green("👋 Goodbye!"));
        break;
      }

      if (input.toLowerCase() === "set_variables") {
        references = await setVariablesInteractively(references);
        continue;
      }

      if (input.trim() === "") {
        continue;
      }

      // Parse and interpret the input
      const result = await interpretExpression(input, references);
      console.log(chalk.green("✅ Result: ") + chalk.yellow(result));
    } catch (error: any) {
      console.error(chalk.red("❌ Error: ") + chalk.redBright(error.message));
    }
  }
}

// Set variables interactively
async function setVariablesInteractively(
  currentReferences: ReferenceRecord
): Promise<ReferenceRecord> {
  const references = { ...currentReferences };

  console.log(chalk.cyan('🔧 Setting variables (enter "done" to finish):'));

  while (true) {
    const input = readlineSync.question(chalk.blue('Enter variable (name=value) or "done": '));

    if (input.toLowerCase() === "done") {
      break;
    }

    try {
      const [name, value] = input.split("=").map((s) => s.trim());
      if (!name || value === undefined) {
        console.log(chalk.yellow("⚠️  Invalid input. Please enter in the format name=value."));
        continue;
      }

      // Try to parse as number first, then as string
      const numValue = Number.parseFloat(value);
      if (!Number.isNaN(numValue)) {
        references[name] = numValue;
      } else {
        references[name] = value;
      }

      console.log(
        chalk.green("✅ Set ") +
          chalk.cyan(name) +
          chalk.green(" = ") +
          chalk.yellow(references[name])
      );
    } catch (_error) {
      console.log(chalk.yellow("⚠️  Invalid input. Please enter in the format name=value."));
    }
  }

  return references;
}

// Interpret a single expression
async function interpretExpression(code: string, references: ReferenceRecord): Promise<string> {
  try {
    const lexer = new Lexer(code);
    const parser = new Parser(lexer);
    const ast = parser.parse(true); // Use inline mode for single expressions

    if (!ast) {
      return "No result (empty input)";
    }

    const interpreter = new Interpreter(ast, references);
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

// Parse tokenset from ZIP file
async function parseTokenset(tokensetPath: string, outputPath: string): Promise<void> {
  console.log(chalk.cyan("📦 Parsing tokenset from: ") + chalk.yellow(tokensetPath));

  try {
    // Clear any existing caches for fresh processing
    const { clearFlatteningCaches } = await import("./utils/dtcg-adapter");
    clearFlatteningCaches();

    // Load ZIP file contents
    const filesContent = await loadZipToMemory(tokensetPath);

    // Debug: show what files were loaded
    console.log(chalk.blue(`📁 ${Object.keys(filesContent).length} Files loaded`));

    // Load themes
    const themes = loadThemes(filesContent);
    console.log(chalk.blue("🎨 Loaded themes: ") + chalk.magenta(Object.keys(themes).join(", ")));

    // Process themes
    const output = await processThemes(themes, { enablePerformanceTracking: true });

    // Write output
    await fs.promises.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");
    console.log(chalk.green("💾 Output written to: ") + chalk.yellow(outputPath));
  } catch (error: any) {
    console.error(chalk.red("❌ Error parsing tokenset: ") + chalk.redBright(error.message));
    process.exit(1);
  }
}

// Permutate tokenset
async function permutateTokenset(
  tokensetPath: string,
  permutateOn: string[],
  permutateTo: string,
  outputPath: string
): Promise<void> {
  console.log(chalk.cyan("🔄 Permutating tokenset from: ") + chalk.yellow(tokensetPath));
  console.log(chalk.blue("📋 Permutating on: ") + chalk.magenta(permutateOn.join(", ")));
  console.log(chalk.blue("🎯 Permutating to: ") + chalk.magenta(permutateTo));

  try {
    // Load ZIP file contents
    const filesContent = await loadZipToMemory(tokensetPath);

    // Build theme tree
    const themeTree = buildThemeTree(filesContent);

    // Validate permutation parameters
    if (!permutateOn.every((theme) => theme in themeTree)) {
      throw new Error(
        `Some themes in permutate-on not found. Available: ${Object.keys(themeTree).join(", ")}`
      );
    }

    if (!(permutateTo in themeTree)) {
      throw new Error(
        `Target theme '${permutateTo}' not found. Available: ${Object.keys(themeTree).join(", ")}`
      );
    }

    // Generate permutations
    const permutations = permutateTokensets(themeTree, [...permutateOn]);

    // Create output structure
    const output: any = {};
    const permutationDimensions = permutateOn.map((theme) => ({
      name: theme,
      options: Object.keys(themeTree[theme]),
    }));

    for (const item in themeTree[permutateTo]) {
      output[item] = {
        name: item,
        permutations: permutationDimensions,
        tokens: interpretTokensets(
          JSON.parse(JSON.stringify(permutations)),
          JSON.parse(JSON.stringify(permutationDimensions)),
          JSON.parse(JSON.stringify(themeTree[permutateTo][item]))
        ),
      };
    }

    // Write output
    await fs.promises.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");
    console.log(chalk.green("💾 Permutations written to: ") + chalk.yellow(outputPath));
  } catch (error: any) {
    console.error(chalk.red("❌ Error permutating tokenset: ") + chalk.redBright(error.message));
    process.exit(1);
  }
}

// Parse DTCG JSON file - simple unified API
async function parseJsonFile(jsonPath: string, outputPath: string): Promise<void> {
  console.log(chalk.cyan("📄 Parsing JSON from: ") + chalk.yellow(jsonPath));

  try {
    // Read JSON file
    const jsonContent = await fs.promises.readFile(jsonPath, "utf8");
    const dtcgJson = JSON.parse(jsonContent);

    // Process the JSON blob - returns flat tokens (aligned with Python implementation)
    const output = interpretTokens(dtcgJson);

    // Write output
    await fs.promises.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");
    console.log(chalk.green("💾 Output written to: ") + chalk.yellow(outputPath));
  } catch (error: any) {
    console.error(chalk.red("❌ Error parsing JSON: ") + chalk.redBright(error.message));
    process.exit(1);
  }
}

// Utility functions for tokenset processing

// Load ZIP file contents into memory
async function loadZipToMemory(zipPath: string): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const filesContent: Record<string, any> = {};
    const IGNORED_FILES = ["__MACOSX", "._MACOSX", "__init__.py", "README.md"];

    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(new Error(`Failed to open ZIP file: ${err.message}`));
        return;
      }

      if (!zipfile) {
        reject(new Error("Failed to open ZIP file"));
        return;
      }

      zipfile.readEntry();

      zipfile.on("entry", (entry) => {
        // Skip ignored files and directories
        if (IGNORED_FILES.some((ignored) => entry.fileName.includes(ignored))) {
          zipfile.readEntry();
          return;
        }

        if (entry.fileName.endsWith("/")) {
          // Directory entry
          zipfile.readEntry();
          return;
        }

        if (entry.fileName.endsWith(".json")) {
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(new Error(`Failed to read entry ${entry.fileName}: ${err.message}`));
              return;
            }

            if (!readStream) {
              reject(new Error(`Failed to read entry ${entry.fileName}`));
              return;
            }

            let data = "";
            readStream.on("data", (chunk) => {
              data += chunk;
            });

            readStream.on("end", () => {
              try {
                const fileName = entry.fileName.replace(".json", "");
                filesContent[fileName] = JSON.parse(data);
                zipfile.readEntry();
              } catch (parseErr: any) {
                console.warn(`Error parsing JSON from ${entry.fileName}: ${parseErr.message}`);
                zipfile.readEntry();
              }
            });

            readStream.on("error", (streamErr) => {
              reject(new Error(`Error reading stream for ${entry.fileName}: ${streamErr.message}`));
            });
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on("end", () => {
        resolve(filesContent);
      });

      zipfile.on("error", (zipErr) => {
        reject(new Error(`ZIP file error: ${zipErr.message}`));
      });
    });
  });
}

// Flatten tokenset recursively
function flattenTokenset(tokenset: any, prefix = "", resolveAll = false): Record<string, any> {
  const flattenedTokens: Record<string, any> = {};

  for (const [setName, setData] of Object.entries(tokenset)) {
    if (typeof setData === "object" && setData !== null && !Array.isArray(setData)) {
      if (setName === "$value" || resolveAll) {
        for (const [name, value] of Object.entries(setData)) {
          const fullName = prefix ? `${prefix}.${name}` : name;
          flattenedTokens[fullName] = value;
        }
        continue;
      }

      if (setName.startsWith("$")) {
        // Skip special keys
        continue;
      }

      // Recursively flatten nested dictionaries
      const fullSetName = prefix ? `${prefix}.${setName}` : setName;
      const nestedTokens = flattenTokenset(setData, fullSetName);
      Object.assign(flattenedTokens, nestedTokens);
    } else if (Array.isArray(setData)) {
      // Flatten the list of tokens
      setData.forEach((value, index) => {
        const name = prefix ? `${prefix}.${index}` : String(index);
        Object.assign(flattenedTokens, flattenTokenset(value, name, true));
      });
    } else {
      // Flatten the token set
      if (setName === "value" || setName === "$value") {
        flattenedTokens[prefix] = setData;
      }
    }
  }

  return flattenedTokens;
}

// Load themes from tokensets
function loadThemes(tokensets: Record<string, any>): Record<string, Record<string, any>> {
  if (!tokensets.$themes) {
    throw new Error("No themes found in the token sets.");
  }

  const themeTokens: Record<string, Record<string, any>> = {};
  const themesData = tokensets.$themes;

  // Pre-flatten all token sets once to avoid redundant processing
  const flattenedTokenSetsCache = new Map<string, Record<string, any>>();
  for (const [setName, setData] of Object.entries(tokensets)) {
    if (setName === "$themes") continue; // Skip themes metadata
    flattenedTokenSetsCache.set(setName, flattenTokenset(setData));
  }

  for (const theme of themesData) {
    const themeName = theme.name;
    const selectedTokenSets = theme.selectedTokenSets;

    // Collect token sets for this theme
    const tokenSetRefs: Record<string, any>[] = [];

    if (Array.isArray(selectedTokenSets)) {
      // New format: array of objects with id and status
      for (const tokenSetRef of selectedTokenSets) {
        if (tokenSetRef.status === "enabled" || tokenSetRef.status === "source") {
          const setId = tokenSetRef.id;
          const tokenSet = flattenedTokenSetsCache.get(setId);
          if (!tokenSet) {
            console.warn(
              chalk.yellow(`⚠️  Token set '${setId}' referenced in '${themeName}' not found.`)
            );
            continue;
          }
          tokenSetRefs.push(tokenSet);
        }
      }
    } else {
      // Old format: object with key-value pairs
      for (const [setName, status] of Object.entries(selectedTokenSets)) {
        if (status === "enabled" || status === "source") {
          const tokenSet = flattenedTokenSetsCache.get(setName);
          if (!tokenSet) {
            throw new Error(`Token set '${setName}' referenced in '${themeName}' not found.`);
          }
          tokenSetRefs.push(tokenSet);
        }
      }
    }

    // Merge all token sets for this theme
    const mergedTokens: Record<string, any> = {};
    for (const tokenSet of tokenSetRefs) {
      for (const [key, value] of Object.entries(tokenSet)) {
        mergedTokens[key] = value;
      }
    }
    themeTokens[themeName] = mergedTokens;
  }

  return themeTokens;
}

// Parse command line arguments
program.parse();
