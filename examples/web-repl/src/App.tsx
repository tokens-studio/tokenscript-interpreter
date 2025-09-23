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
      className="min-h-screen bg-gray-50"
      data-testid="app-container"
    >
      <header
        className="bg-white shadow-sm border-b"
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
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="run-code-button"
              >
                Run Code
              </button>
            </div>
          </div>
        </div>
      </header>

      <main
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        data-testid="app-main"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-12rem)]">
          <div
            className="flex flex-col"
            data-testid="editor-panel"
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-lg font-semibold text-gray-900"
                data-testid="editor-panel-title"
              >
                {inputMode === "tokenscript" ? "TokenScript Editor" : "JSON Token Input"}
              </h2>
              <div
                className="flex bg-gray-100 rounded-md p-1"
                data-testid="input-mode-toggle"
              >
                <button
                  type="button"
                  onClick={() => setInputMode("tokenscript")}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
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
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
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

            {inputMode === "tokenscript" ? (
              <TokenScriptEditor
                value={code}
                onChange={setCode}
                onKeyDown={handleKeyDown}
                className="flex-1"
                error={result.errorInfo}
              />
            ) : (
              <JsonTokenEditor
                value={jsonInput}
                onChange={setJsonInput}
                onKeyDown={handleKeyDown}
                className="flex-1"
                error={jsonError}
              />
            )}
          </div>

          <div
            className="flex flex-col"
            data-testid="output-panel"
          >
            <h2
              className="text-lg font-semibold text-gray-900 mb-4"
              data-testid="output-panel-title"
            >
              Output
            </h2>
            <UnifiedOutputPanel
              result={result}
              className="flex-1"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
