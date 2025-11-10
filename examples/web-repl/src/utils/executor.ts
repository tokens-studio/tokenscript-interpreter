import {
  ColorManager,
  type ColorSpecification,
  Config,
  type FunctionSpecification,
  FunctionsManager,
  Interpreter,
  Lexer,
  Parser,
  processTokens,
} from "@tokens-studio/tokenscript-interpreter";
import { DEFAULT_COLOR_SCHEMAS } from "./default-schemas";

export type ExecutionResult = {
  type: "tokenscript" | "json";
  error?: string;
  errorInfo?: {
    message: string;
    line?: number;
    token?: any;
  };
  executionTime?: number;
  output?: any;
  colorManager: ColorManager;
  functionsManager: FunctionsManager;
};

export interface InputPreprocessor {
  schemaProperties: Record<string, any>;
  colorFormats: Record<string, string>;
}

export interface ExecuteCodeOptions {
  code: string;
  mode: "tokenscript" | "json";
  references?: Record<string, any>;
  colorSchemas?: Map<string, ColorSpecification>;
  functionSchemas?: Map<string, FunctionSpecification>;
  includeCssColorSchema?: boolean;
  inputPreprocessor?: InputPreprocessor;
}

/**
 * Preprocess inputs to convert color values to Color symbols
 */
function preprocessInputs(
  inputs: Record<string, any>,
  preprocessor: InputPreprocessor,
  config: Config,
): Record<string, any> {
  const { schemaProperties, colorFormats } = preprocessor;
  const processedInputs: Record<string, any> = {};

  for (const [key, value] of Object.entries(inputs)) {
    const prop = schemaProperties[key] as any;
    if (prop?.type === "color") {
      const format = colorFormats[key] || "hex";
      let colorScript = "";

      try {
        if (format === "hex") {
          colorScript = `hex("${value}")`;
        } else if (format === "rgb") {
          colorScript = `srgb(${value.r}, ${value.g}, ${value.b})`;
        } else if (format === "hsl") {
          colorScript = `hsl(${value.h}, ${value.s}, ${value.l})`;
        }

        const lexer = new Lexer(colorScript);
        const ast = new Parser(lexer).parse();
        const tempInterpreter = new Interpreter(ast, { config });
        processedInputs[key] = tempInterpreter.interpret();
      } catch (err) {
        console.warn(`Failed to create color symbol for ${key}:`, err);
        processedInputs[key] = value;
      }
    } else {
      processedInputs[key] = value;
    }
  }

  return processedInputs;
}

export async function executeCode(options: ExecuteCodeOptions): Promise<ExecutionResult> {
  const {
    code,
    mode,
    references = {},
    colorSchemas = new Map(),
    functionSchemas = new Map(),
    includeCssColorSchema = true,
    inputPreprocessor,
  } = options;

  const colorManager = new ColorManager();

  // Always include CSS color schema if requested (for schema editor)
  if (includeCssColorSchema) {
    const cssColorUri =
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/css-color/0/";
    const cssColorSchema = DEFAULT_COLOR_SCHEMAS.get(cssColorUri);
    if (cssColorSchema) {
      try {
        colorManager.register(cssColorUri, cssColorSchema);
      } catch (error) {
        console.warn("Failed to register css-color schema:", error);
      }
    }
  }

  // Register color schemas
  for (const [url, spec] of colorSchemas.entries()) {
    try {
      colorManager.register(url, spec);
    } catch (error) {
      console.warn(`Failed to register color schema ${url}:`, error);
    }
  }

  const functionsManager = new FunctionsManager();

  // Register function schemas
  for (const [, spec] of functionSchemas.entries()) {
    try {
      functionsManager.register(spec.keyword, spec);
    } catch (error) {
      console.warn(`Failed to register function schema:`, error);
    }
  }

  const startTime = performance.now();

  try {
    const config = new Config({ colorManager, functionsManager });

    // Preprocess inputs if needed
    let processedReferences = references;
    if (inputPreprocessor) {
      processedReferences = preprocessInputs(references, inputPreprocessor, config);
    }

    if (mode === "tokenscript") {
      const lexer = new Lexer(code);
      const ast = new Parser(lexer).parse();
      const interpreter = new Interpreter(ast, {
        references: processedReferences,
        config,
      });
      const output = interpreter.interpret();
      const executionTime = performance.now() - startTime;

      return {
        type: "tokenscript",
        executionTime: Math.round(executionTime * 100) / 100,
        output,
        colorManager,
        functionsManager,
      };
    }

    // JSON token processing - use "string" output for JSON-safe values
    const jsonTokens = JSON.parse(code);
    const processorOutput = processTokens(jsonTokens, { config, output: "string" });
    const executionTime = performance.now() - startTime;

    return {
      type: "json",
      executionTime: Math.round(executionTime * 100) / 100,
      output: processorOutput,
      colorManager,
      functionsManager,
    };
  } catch (error) {
    const executionTime = performance.now() - startTime;

    const errorInfo = {
      message: error instanceof Error ? error.message : String(error),
      line: undefined as number | undefined,
      token: undefined as any,
    };

    if (error && typeof error === "object") {
      if ("line" in error && typeof (error as any).line === "number") {
        errorInfo.line = (error as any).line;
      }
      if ("token" in error) {
        errorInfo.token = (error as any).token;
        if (!errorInfo.line && (error as any).token?.line) {
          errorInfo.line = (error as any).token.line;
        }
      }
    }

    return {
      type: mode,
      error: errorInfo.message,
      errorInfo,
      executionTime: Math.round(executionTime * 100) / 100,
      colorManager,
      functionsManager,
    };
  }
}

/**
 * Create an empty execution result
 */
export function createEmptyResult(mode: "tokenscript" | "json" = "tokenscript"): ExecutionResult {
  return {
    type: mode,
    colorManager: new ColorManager(),
    functionsManager: new FunctionsManager(),
  };
}

export interface ExecuteSchemaScriptOptions {
  script: string;
  inputs: Record<string, any>;
  schemaProperties: Record<string, any>;
  colorFormats: Record<string, string>;
  requirements: {
    colors: Map<string, ColorSpecification>;
    functions: Map<string, FunctionSpecification>;
  };
  editorMode: "function" | "conversion";
}

/**
 * Execute a schema script with special handling for color inputs and requirements.
 * This is a wrapper around executeCode for the schema editor.
 */
export async function executeSchemaScript(
  options: ExecuteSchemaScriptOptions,
): Promise<ExecutionResult> {
  const { script, inputs, schemaProperties, colorFormats, requirements, editorMode } = options;

  if (!script.trim()) {
    return createEmptyResult("tokenscript");
  }

  // Prepare references based on editor mode
  let references = inputs;
  if (editorMode === "function") {
    references = { input: Object.values(inputs) };
  }

  return executeCode({
    code: script,
    mode: "tokenscript",
    references,
    colorSchemas: requirements.colors,
    functionSchemas: requirements.functions,
    includeCssColorSchema: true,
    inputPreprocessor: { schemaProperties, colorFormats },
  });
}
