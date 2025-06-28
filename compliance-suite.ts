import fs from "fs";
import path from "path";
import { Interpreter } from "./interpreter/interpreter";
import { Lexer } from "./interpreter/lexer";
import { Parser } from "./interpreter/parser";

interface TestCase {
  name: string;
  input: string;
  expectedOutput: any;
  expectedOutputType: string; // Changed from exceptedOutputType to expectedOutputType
  context?: Record<string, any>;
}

interface TestResult {
  status: "passed" | "failed";
  path: string;
  name: string;
  actualOutput: any;
  actualOutputType: string;
  expectedOutput: any;
  expectedOutputType: string;
  error?: string; // To capture any error that occurred during test execution
}

interface ComplianceReport {
  passed: number;
  failed: number;
  results: TestResult[];
}

function getType(value: any): string {
  if (value === null) return "Null";
  if (Array.isArray(value)) return "Array";
  return typeof value === "object"
    ? "Object"
    : value.constructor && value.constructor.name
      ? value.constructor.name
      : typeof value;
}

function readJsonFilesRecursively(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(readJsonFilesRecursively(filePath));
    } else if (file.endsWith(".json")) {
      results.push(filePath);
    }
  });
  return results;
}

export async function evaluateStandardCompliance(testDir: string, outputFile: string) {
  const files = readJsonFilesRecursively(testDir);
  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    let testCases: TestCase[] = [];
    try {
      testCases = JSON.parse(content);
      if (!Array.isArray(testCases)) testCases = [testCases];
    } catch (e) {
      continue;
    }
    for (const test of testCases) {
      let actualOutput: any = null;
      let actualOutputType: string = "Unknown";
      let status: "passed" | "failed" = "failed";
      let error: string | undefined = undefined;
      try {
        const lexer = new Lexer(test.input);
        const parser = new Parser(lexer);
        const ast = parser.parse(true);
        const interpreter = new Interpreter(ast, test.context || {});
        let result = interpreter.interpret();
        // Always deeply normalize output for report and comparison
        function normalize(val: any): { value: any; type: string } {
          // Handle TokenScript symbol class instances
          if (val && typeof val === "object") {
            if ("$value" in val) {
              return {
                value: val.$value,
                type: val.$type ? capitalizeFirst(val.$type) : getType(val.$value),
              };
            } else if ("value" in val && "type" in val && typeof val.type === "string") {
              return {
                value: val.value,
                type: capitalizeFirst(val.type),
              };
            }
          }
          return { value: val, type: getType(val) };
        }
        const { value: normalizedValue, type: normalizedType } = normalize(result);
        actualOutput = normalizedValue;
        actualOutputType = normalizedType;
        if (
          // Make sure both values are converted to strings for comparison
          // This handles cases where expectedOutput might be a string already (e.g., "true" vs true)
          String(normalizedValue).toLowerCase() === String(test.expectedOutput).toLowerCase() &&
          normalizedType === test.expectedOutputType
        ) {
          status = "passed";
          passed++;
        } else {
          failed++;
        }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        failed++;
      }
      results.push({
        status,
        path: file,
        name: test.name,
        actualOutput,
        actualOutputType,
        expectedOutput: test.expectedOutput,
        expectedOutputType: test.expectedOutputType,
        error,
      });
    }
  }

  const report: ComplianceReport = { passed, failed, results };
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2), "utf-8");
  return report;
}

function capitalizeFirst(str: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
