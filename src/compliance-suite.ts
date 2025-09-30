import fs from "node:fs";
import path from "node:path";
import { Config } from "@interpreter/config/config";
import { ColorManager } from "@interpreter/config/managers/color/manager";
import { Interpreter, type interpreterResult } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import { BaseSymbolType, ColorSymbol } from "@interpreter/symbols";
import { groupBy } from "./interpreter/utils/coll";
import { InterpreterError, type ISymbolType, LexerError, ParserError } from "./lib";

interface TestCase {
  name: string;
  input: string;
  expectedOutput: any;
  expectedOutputType: string;
  inline: boolean;
  context?: Record<string, any>;
  schemas?: string[];
  path: string;
}

interface TestResult extends TestCase {
  status: "passed" | "failed";
  actualOutput: any;
  actualOutputType: string;
  error?: Error;
}

interface ComplianceReport {
  passed: number;
  failed: number;
  results: TestResult[];
}

const SCHEMA_FILE_MAP: Record<string, string> = {
  "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0/":
    "./data/specifications/colors/hsl.json",
  "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/":
    "./data/specifications/colors/srgb.json",
  "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/":
    "./data/specifications/colors/rgb.json",
  "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgba-color/0/":
    "./data/specifications/colors/rgba.json",
  "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/lrgb-color/0/":
    "./data/specifications/colors/lrgb.json",
};

function loadSchemas(schemas: string[]): ColorManager {
  const colorManager = new ColorManager();

  for (const schemaUri of schemas) {
    const filePath = SCHEMA_FILE_MAP[schemaUri];
    if (filePath && fs.existsSync(filePath)) {
      try {
        const specData = fs.readFileSync(filePath, "utf-8");
        colorManager.register(schemaUri, specData);
      } catch (error) {
        console.warn(`Failed to load schema ${schemaUri} from ${filePath}:`, error);
      }
    } else {
      console.warn(`No file mapping found for schema: ${schemaUri}`);
    }
  }

  return colorManager;
}

function readJsonFilesRecursively(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat?.isDirectory()) {
      results = results.concat(readJsonFilesRecursively(filePath));
    } else if (file.endsWith(".json")) {
      results.push(filePath);
    }
  });
  return results;
}

interface ComplianceConfig {
  dir?: string;
  file?: string;
  output?: string;
}

const parseTestCasesJson = (json: string, filePath: string): TestCase[] => {
  try {
    const testCases = JSON.parse(json);
    return !Array.isArray(testCases) ? [testCases] : testCases;
  } catch (_e) {
    throw new Error(`Could not parse json at path: ${filePath}`);
  }
};

const runTest = (test: TestCase): { interpreter: Interpreter; result: interpreterResult } => {
  const lexer = new Lexer(test.input);
  const parser = new Parser(lexer);
  const ast = parser.parse(test.inline);

  let config: Config;
  if (test.schemas && test.schemas.length > 0) {
    const colorManager = loadSchemas(test.schemas);
    config = new Config({ colorManager });
  } else {
    config = new Config();
  }

  const interpreter = new Interpreter(ast, { references: test.context || {}, config });
  return {
    interpreter,
    result: interpreter.interpret(),
  };
};

interface ComplianceResult {
  actualOutput: string;
  actualOutputType: string;
}

const interpreterSymbolToComplianceResult = (
  symbol: ISymbolType,
  interpreter: Interpreter,
): ComplianceResult => {
  // Colors need to be formatted using ColorManager, as we need the order rules
  if (symbol instanceof ColorSymbol) {
    return {
      actualOutput: interpreter.config.colorManager.formatColorMethod(symbol),
      actualOutputType: symbol.getTypeName(),
    };
  }

  return {
    actualOutput: symbol.toString(),
    actualOutputType: symbol.getTypeName(),
  };
};

const compareResults = (
  complianceResult: ComplianceResult,
  testCase: TestCase,
): "passed" | "failed" => {
  const isPassing =
    complianceResult.actualOutput === testCase.expectedOutput &&
    complianceResult.actualOutputType === testCase.expectedOutputType;
  return isPassing ? "passed" : "failed";
};

export async function evaluateStandardCompliance(config: ComplianceConfig) {
  const files = config.file
    ? [config.file]
    : config.dir
      ? readJsonFilesRecursively(config.dir)
      : [];

  const testResults: TestResult[] = files.flatMap((path) => {
    const content = fs.readFileSync(path, "utf-8");
    const testCases: TestCase[] = parseTestCasesJson(content, path);

    return testCases.map((testCase) => {
      let testResult: TestResult;
      try {
        const { result, interpreter } = runTest(testCase);
        if (!(result instanceof BaseSymbolType)) {
          throw new Error(`result (${result}) in s not interpreter Symbol`);
        }
        const complianceResult = interpreterSymbolToComplianceResult(result, interpreter);
        testResult = {
          ...testCase,
          ...complianceResult,
          path: path,
          status: compareResults(complianceResult, testCase),
        };
      } catch (e: any) {
        if (e instanceof InterpreterError || e instanceof LexerError || e instanceof ParserError) {
          const complianceResult: ComplianceResult = {
            actualOutput: e.originalMessage || "",
            actualOutputType: "Error",
          };
          return {
            ...testCase,
            ...complianceResult,
            path: path,
            status: compareResults(complianceResult, testCase),
            error: e,
          };
        }
        throw e;
      }

      return {
        ...testCase,
        ...testResult,
        status: "passed",
        path: path,
      };
    });
  });

  const { passed, failed } = groupBy((x) => x.status, testResults);

  // Order keys for json output
  const orderedResults = testResults.map(
    ({
      name,
      input,
      inline,
      context,
      path,
      status,
      actualOutput,
      actualOutputType,
      expectedOutput,
      expectedOutputType,
      ...rest
    }) => ({
      name,
      path,
      status,
      inline,
      context,
      input,
      actualOutput,
      actualOutputType,
      expectedOutput,
      expectedOutputType,
      ...rest,
    }),
  );

  const report: ComplianceReport = {
    passed: passed.length,
    failed: failed.length,
    results: orderedResults,
  };

  if (config.output) {
    fs.writeFileSync(config.output, JSON.stringify(report, null, 2), "utf-8");
  }

  return report;
}
