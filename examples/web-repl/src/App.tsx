import {
  ColorManager,
  Config,
  Interpreter,
  interpretTokens,
  Lexer,
  Parser,
} from "@tokens-studio/tokenscript-interpreter";
import { useCallback, useEffect, useState } from "react";
import hslSpec from "../../../data/specifications/colors/hsl.json";
import lrgbSpec from "../../../data/specifications/colors/lrgb.json";

import rgbSpec from "../../../data/specifications/colors/rgb.json";
import rgbaSpec from "../../../data/specifications/colors/rgba.json";
import srgbSpec from "../../../data/specifications/colors/srgb.json";
import JsonTokenEditor from "./components/JsonTokenEditor";
import TokenScriptEditor from "./components/TokenScriptEditor";
import UnifiedOutputPanel, { type UnifiedExecutionResult } from "./components/UnifiedOutputPanel";

const DEFAULT_CODE = `// Example TokenScript code - try editing!
variable primary: Color.Hsl = hsl(220, 100, 50);

// Try different operations:
// variable lighter: Color.Hsl = primary.lighten(0.3);
// variable rgb_color: Color.Rgb = rgb(255, 0, 128);

return primary;`;

const DEFAULT_JSON = `{
  "colors": {
    "primary": {
      "$type": "color",
      "$value": "#ff6b35"
    },
    "secondary": {
      "$type": "color", 
      "$value": "hsl(220, 100%, 50%)"
    },
    "accent": {
      "$type": "color",
      "$value": "{colors.primary}"
    }
  },
  "spacing": {
    "base": {
      "$type": "dimension",
      "$value": "8px"
    },
    "large": {
      "$type": "dimension", 
      "$value": "{spacing.base} * 2"
    }
  }
}`;

type InputMode = "tokenscript" | "json";

function setupColorManager(): ColorManager {
  const colorManager = new ColorManager();

  colorManager.register(
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/",
    rgbSpec as any,
  );
  colorManager.register(
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0/",
    hslSpec as any,
  );
  colorManager.register(
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/",
    srgbSpec as any,
  );
  colorManager.register(
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgba-color/0/",
    rgbaSpec as any,
  );
  colorManager.register(
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/lrgb-color/0/",
    lrgbSpec as any,
  );

  return colorManager;
}

function formatOutput(output: any): string {
  if (output && typeof output.toString === "function") {
    return output.toString();
  }
  if (typeof output === "string") {
    return output;
  }
  return JSON.stringify(output, null, 2);
}

function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [jsonInput, setJsonInput] = useState(DEFAULT_JSON);
  const [inputMode, setInputMode] = useState<InputMode>("tokenscript");
  const [result, setResult] = useState<UnifiedExecutionResult>({ type: "tokenscript" });
  const [autoRun, setAutoRun] = useState(true);
  const [jsonError, setJsonError] = useState<string>();

  const executeCode = useCallback(async () => {
    const currentInput = inputMode === "tokenscript" ? code : jsonInput;

    // If input is empty or just whitespace, clear the output
    if (!currentInput.trim()) {
      setResult({ type: inputMode });
      setJsonError(undefined);
      return;
    }

    const startTime = performance.now();

    try {
      if (inputMode === "tokenscript") {
        const colorManager = setupColorManager();
        const config = new Config({ colorManager });

        const lexer = new Lexer(code);
        const ast = new Parser(lexer).parse();
        const interpreter = new Interpreter(ast, { config });
        const output = interpreter.interpret();
        const executionTime = performance.now() - startTime;

        // console.log("TokenScript Output", { ast, interpreter, output, executionTime });

        setResult({
          type: "tokenscript",
          output: formatOutput(output),
          executionTime: Math.round(executionTime * 100) / 100,
          rawResult: output,
          colorManager,
        });
        setJsonError(undefined);
      } else {
        // JSON token processing - validate JSON first
        let jsonTokens: any;
        try {
          jsonTokens = JSON.parse(jsonInput);
          setJsonError(undefined);
        } catch (jsonErr) {
          setJsonError(jsonErr instanceof Error ? jsonErr.message : String(jsonErr));
          throw jsonErr;
        }

        const colorManager = setupColorManager();
        const config = new Config({ colorManager });

        const output = interpretTokens(jsonTokens, config);
        const executionTime = performance.now() - startTime;

        console.log("JSON Tokens Output", { input: jsonTokens, output, executionTime });

        const outputString = JSON.stringify(output, null, 2);

        setResult({
          type: "json",
          output: outputString,
          executionTime: Math.round(executionTime * 100) / 100,
          rawResult: output,
          colorManager,
        });
      }
    } catch (error) {
      const executionTime = performance.now() - startTime;

      // Extract error information including line number if available
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
          // If token has line but error doesn't
          if (!errorInfo.line && (error as any).token?.line) {
            errorInfo.line = (error as any).token.line;
          }
        }
      }

      setResult({
        type: inputMode,
        error: errorInfo.message,
        errorInfo,
        executionTime: Math.round(executionTime * 100) / 100,
      });
    }
  }, [code, jsonInput, inputMode]);

  useEffect(() => {
    if (!autoRun) return;
    executeCode();
  }, [autoRun, executeCode]);

  useEffect(() => {
    executeCode();
  }, [executeCode]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      executeCode();
    }
  };

  return (
    <div
      className="h-screen bg-gray-50 flex flex-col"
      data-testid="app-container"
    >
      <header
        className="bg-white shadow-sm border-b flex-shrink-0"
        data-testid="app-header"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-2xl font-bold text-gray-900"
                data-testid="app-title"
              >
                TokenScript Web REPL
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Interactive environment for TokenScript code
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoRun}
                  onChange={(e) => setAutoRun(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  data-testid="auto-run-checkbox"
                />
                <label
                  htmlFor="auto-run"
                  className="text-sm text-gray-700"
                >
                  Auto-run
                </label>
              </div>
              <button
                type="button"
                onClick={executeCode}
                className="w-10 h-10 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                data-testid="run-code-button"
                title="Run Code (Ctrl+Enter)"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 5.14v13.72L19 12L8 5.14z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main
        className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 overflow-auto lg:overflow-hidden w-full"
        data-testid="app-main"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 min-h-[600px] lg:h-full lg:min-h-[400px]">
          <div
            className="grid grid-rows-[auto_1fr] gap-2 sm:gap-4 min-h-0 lg:min-h-0"
            data-testid="editor-panel"
          >
            <div className="flex items-center justify-between min-h-[2.5rem] flex-wrap gap-2">
              <h2
                className="text-base sm:text-lg font-semibold text-gray-900 truncate"
                data-testid="editor-panel-title"
              >
                {inputMode === "tokenscript" ? "TokenScript Editor" : "JSON Token Input"}
              </h2>
              <div
                className="flex bg-gray-100 rounded-md p-1 flex-shrink-0"
                data-testid="input-mode-toggle"
              >
                <button
                  type="button"
                  onClick={() => setInputMode("tokenscript")}
                  className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
                    inputMode === "tokenscript"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  data-testid="tokenscript-mode-button"
                >
                  TokenScript
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("json")}
                  className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
                    inputMode === "json"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  data-testid="json-mode-button"
                >
                  JSON Tokens
                </button>
              </div>
            </div>

            <div className="min-h-[300px] lg:min-h-0 overflow-hidden">
              {inputMode === "tokenscript" ? (
                <TokenScriptEditor
                  value={code}
                  onChange={setCode}
                  onKeyDown={handleKeyDown}
                  className="h-full"
                  error={result.errorInfo}
                />
              ) : (
                <JsonTokenEditor
                  value={jsonInput}
                  onChange={setJsonInput}
                  onKeyDown={handleKeyDown}
                  className="h-full"
                  error={jsonError}
                />
              )}
            </div>
          </div>

          <div
            className="grid grid-rows-[1fr] gap-2 sm:gap-4 min-h-0 lg:min-h-0"
            data-testid="app-output-panel"
          >
            <div className="min-h-[250px] lg:min-h-0 overflow-hidden">
              <UnifiedOutputPanel
                result={result}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
