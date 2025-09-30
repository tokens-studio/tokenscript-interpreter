import {
  ColorManager,
  Config,
  Interpreter,
  interpretTokens,
  Lexer,
  Parser,
} from "@tokens-studio/tokenscript-interpreter";
import { useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { ArrowDown } from "./components/icons";
import JsonTokenEditor from "./components/JsonTokenEditor";
import OutputPanel from "./components/OutputPanel";
import SchemaManager from "./components/SchemaManager";
import ShellPanel from "./components/ShellPanel";
import TokenScriptEditor from "./components/TokenScriptEditor";
import { autoRunAtom, colorSchemasAtom, schemaPanelCollapsedAtom } from "./store/atoms";
import type { DEFAULT_COLOR_SCHEMAS } from "./utils/default-schemas";

type UnifiedExecutionResult = {
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
};

const DEFAULT_CODE = `// Example TokenScript code - try editing!
variable primary: Color.Hsl = hsl(220, 100, 50);

return primary.to.rgb();`;

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

function setupColorManager(schemas: typeof DEFAULT_COLOR_SCHEMAS): ColorManager {
  const colorManager = new ColorManager();

  for (const [uri, spec] of schemas.entries()) {
    try {
      colorManager.register(uri, spec);
    } catch (error) {
      console.warn(`Failed to register schema ${uri}:`, error);
    }
  }

  return colorManager;
}

function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [jsonInput, setJsonInput] = useState(DEFAULT_JSON);
  const [inputMode, setInputMode] = useState<InputMode>("tokenscript");
  const [result, setResult] = useState<UnifiedExecutionResult>({ type: "tokenscript" });
  const [autoRun, setAutoRun] = useAtom(autoRunAtom);
  const [jsonError, setJsonError] = useState<string>();
  const [schemaPanelCollapsed, setSchemaPanelCollapsed] = useAtom(schemaPanelCollapsedAtom);
  const [colorSchemas, _setColorSchemas] = useAtom(colorSchemasAtom);

  const executeCode = useCallback(async () => {
    const currentInput = inputMode === "tokenscript" ? code : jsonInput;
    const colorManager = setupColorManager(colorSchemas);

    // If input is empty or just whitespace, clear the output
    if (!currentInput.trim()) {
      setResult({ type: inputMode, colorManager });
      setJsonError(undefined);
      return;
    }

    const startTime = performance.now();

    try {
      if (inputMode === "tokenscript") {
        const config = new Config({ colorManager });

        const lexer = new Lexer(code);
        const ast = new Parser(lexer).parse();
        const interpreter = new Interpreter(ast, { config });
        const output = interpreter.interpret();
        const executionTime = performance.now() - startTime;

        // console.log("TokenScript Output", { ast, interpreter, output, executionTime });

        setResult({
          type: "tokenscript",
          executionTime: Math.round(executionTime * 100) / 100,
          output,
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

        const config = new Config({ colorManager });

        const output = interpretTokens(jsonTokens, config);
        const executionTime = performance.now() - startTime;

        console.log("JSON Tokens Output", { input: jsonTokens, output, executionTime });

        const _outputString = JSON.stringify(output, null, 2);

        setResult({
          type: "json",
          executionTime: Math.round(executionTime * 100) / 100,
          output,
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
        colorManager,
      });
    }
  }, [code, jsonInput, inputMode, colorSchemas]);

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
                className="text-xl font-bold text-gray-900"
                data-testid="app-title"
              >
                Tokenscript REPL
              </h1>
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
        className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-8 w-full overflow-auto"
        data-testid="app-main"
      >
        <div className="mx-auto grid grid-cols-1 max-w-7xl lg:grid-cols-2 gap-4 lg:gap-8 lg:h-full">
          {/* Editor Panel */}
          <div
            className="min-h-[400px] lg:min-h-[300px] lg:max-h-[60vh] rounded-lg shadow-sm lg:overflow-hidden"
            data-testid="editor-panel"
          >
            {inputMode === "tokenscript" ? (
              <TokenScriptEditor
                value={code}
                onChange={setCode}
                onKeyDown={handleKeyDown}
                error={result.errorInfo}
                inputMode={inputMode}
                onInputModeChange={setInputMode}
              />
            ) : (
              <JsonTokenEditor
                value={jsonInput}
                onChange={setJsonInput}
                onKeyDown={handleKeyDown}
                error={jsonError}
                inputMode={inputMode}
                onInputModeChange={setInputMode}
              />
            )}
          </div>

          {/* Right Column: Schema Panel + Output Panel */}
          <div className="flex flex-col gap-4">
            <div
              className="rounded-lg shadow-sm"
              data-testid="app-output-panel"
            >
              <OutputPanel result={result} />
            </div>

            {/* Schema Panel */}
            <div
              data-testid="schema-panel"
              className="flex-shrink-0 lg:max-h-full"
            >
              <ShellPanel
                title="Schemas"
                headerRight={
                  <button
                    type="button"
                    onClick={() => setSchemaPanelCollapsed(!schemaPanelCollapsed)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    data-testid="schema-panel-toggle"
                    aria-label={
                      schemaPanelCollapsed ? "Expand schema panel" : "Collapse schema panel"
                    }
                  >
                    <ArrowDown className={`${schemaPanelCollapsed ? "rotate-180" : ""}`} />
                  </button>
                }
                className={`transition-all duration-200 ${schemaPanelCollapsed && "h-10"}`}
                data-testid="schema-shell-panel"
              >
                {!schemaPanelCollapsed && <SchemaManager />}
              </ShellPanel>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
