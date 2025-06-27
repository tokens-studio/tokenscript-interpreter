import fs from "fs";
import path from "path";
import { Interpreter } from "./interpreter/interpreter";
import { Lexer } from "./interpreter/lexer";
import { Parser } from "./interpreter/parser";

interface TestCase {
  name: string;
  input: string;
  expectedOutput: any;
  exceptedOutputType: string;
  context?: Record<string, any>;
}

interface TestResult {
  status: "passed" | "failed";
  path: string;
  name: string;
  actualOutput: any;
  actualOutputType: string;
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
          String(normalizedValue) === String(test.expectedOutput) &&
          normalizedType === test.exceptedOutputType
        ) {
          status = "passed";
          passed++;
        } else {
          failed++;
        }
      } catch (e) {
        failed++;
      }
      results.push({
        status,
        path: file,
        name: test.name,
        actualOutput,
        actualOutputType,
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
