import fs from "fs";
import path from "path";
import { Interpreter } from "./interpreter/interpreter";
import { Lexer } from "./interpreter/lexer";
import { Parser } from "./interpreter/parser";

interface TestCase {
  name: string;
  input: string;
  expectedOutput: any;
  expectedOutputType: string;
  inline: boolean;
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
      let error: string | undefined;
      try {
        const lexer = new Lexer(test.input);
        const parser = new Parser(lexer);
        const ast = parser.parse(test.inline);
        const interpreter = new Interpreter(ast, test.context || {});
        const result = interpreter.interpret();
        // Always deeply normalize output for report and comparison
        function normalize(val: any): { value: any; type: string } {
          // Handle TokenScript symbol class instances and NumberWithUnit
          if (val && typeof val === "object") {
            // Handle ListSymbol or arrays
            if (Array.isArray(val)) {
              // Recursively normalize each element
              const normList = val.map((v) => normalize(v).value);
              return { value: normList, type: "List" };
            }
            // Handle NumberWithUnitSymbol or similar
            if (
              (val.type === "NumberWithUnit" ||
                val.$type === "NumberWithUnit" ||
                val.type === "dimension" ||
                val.$type === "dimension") &&
              (typeof val.value === "number" || typeof val.$value === "number") &&
              (typeof val.unit === "string" || typeof val.$unit === "string")
            ) {
              const number = val.value ?? val.$value;
              const unit = val.unit ?? val.$unit;
              return { value: `${number}${unit}`, type: "NumberWithUnit" };
            }
            // Handle objects with $value/$type (TokenScript output)
            if ("$value" in val) {
              // Recursively normalize $value
              const norm = normalize(val.$value);
              return {
                value: norm.value,
                type: val.$type ? capitalizeFirst(val.$type) : getType(val.$value),
              };
            }
            // Handle objects with value/type (TokenScript output)
            if ("value" in val && "type" in val && typeof val.type === "string") {
              // Recursively normalize value
              const norm = normalize(val.value);
              return { value: norm.value, type: capitalizeFirst(val.type) };
            }
          }
          return { value: val, type: getType(val) };
        }
        const { value: normalizedValue, type: normalizedType } = normalize(result);
        actualOutput = normalizedValue;
        actualOutputType = normalizedType;

        // Special case for expected errors
        if (test.expectedOutputType === "Error") {
          // We expected an error but got a result instead
          failed++;
        }
        // Simply stringify arrays and compare as strings, regardless of format
        else if (Array.isArray(normalizedValue) && test.expectedOutputType === "List") {
          // Handle case where expectedOutput is already a string but the normalizedValue is an array
          const actualArrayString = normalizedValue.join(", ").toLowerCase();
          const expectedOutputLower =
            typeof test.expectedOutput === "string"
              ? test.expectedOutput.toLowerCase()
              : Array.isArray(test.expectedOutput)
                ? test.expectedOutput.join(", ").toLowerCase()
                : String(test.expectedOutput).toLowerCase();

          if (actualArrayString === expectedOutputLower) {
            status = "passed";
            passed++;
          } else {
            console.log(
              `List comparison failed: "${actualArrayString}" !== "${expectedOutputLower}"`
            );
            failed++;
          }
        }
        // Special handling for ImplicitList (space-separated instead of comma-separated)
        else if (Array.isArray(normalizedValue) && test.expectedOutputType === "ImplicitList") {
          // Convert normalized value to space-separated string
          const actualArrayString = normalizedValue.join(" ").toLowerCase();

          // Handle both string and array expectedOutput
          const expectedArrayString = typeof test.expectedOutput === "string"
            ? test.expectedOutput.toLowerCase()
            : Array.isArray(test.expectedOutput)
              ? test.expectedOutput.join(" ").toLowerCase()
              : String(test.expectedOutput).toLowerCase();

          if (actualArrayString === expectedArrayString) {
            status = "passed";
            passed++;
          } else {
            failed++;
          }
        }
        // Use toUnitString for non-array values
        else if (
          toUnitString(normalizedValue).toLowerCase() ===
            toUnitString(test.expectedOutput).toLowerCase() &&
          normalizedType === test.expectedOutputType
        ) {
          status = "passed";
          passed++;
        } else {
          failed++;
        }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);

        // Check if this was an expected error
        if (test.expectedOutputType === "Error") {
          // We expected an error, and got one - check if the error message contains the expected text
          const errorMsg = e instanceof Error ? e.message : String(e);
          if (errorMsg.includes(test.expectedOutput)) {
            status = "passed";
            passed++;
          } else {
            // Error message doesn't match what was expected
            failed++;
          }
        } else {
          // We didn't expect an error
          failed++;
        }
      }
      results.push({
        status,
        path: file,
        name: test.name,
        actualOutput: Array.isArray(actualOutput)
          ? actualOutput.join(
              // Use test.expectedOutputType as fallback if normalizedType is not in scope
              typeof normalizedType !== "undefined" && normalizedType === "ImplicitList"
                ? " "
                : ", "
            )
          : actualOutput,
        actualOutputType,
        expectedOutput: Array.isArray(test.expectedOutput)
          ? test.expectedOutput.join(test.expectedOutputType === "ImplicitList" ? " " : ", ")
          : test.expectedOutput,
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

function toUnitString(val: any): string {
  // Handles NumberWithUnit objects from interpreter output or test expectations
  if (
    val &&
    typeof val === "object" &&
    (val.type === "NumberWithUnit" || val.$type === "NumberWithUnit") &&
    (typeof val.value === "number" || typeof val.$value === "number") &&
    (typeof val.unit === "string" || typeof val.$unit === "string")
  ) {
    const number = val.value ?? val.$value;
    const unit = val.unit ?? val.$unit;
    return `${number}${unit}`;
  }
  return String(val);
}
