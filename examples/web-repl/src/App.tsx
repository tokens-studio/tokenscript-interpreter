import {
  ColorManager,
  Config,
  type FunctionSpecification,
  FunctionsManager,
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
import {
  autoRunAtom,
  colorSchemasAtom,
  currentPresetAtom,
  functionSchemasAtom,
  schemaPanelCollapsedAtom,
} from "./store/atoms";
import { DEFAULT_COLOR_SCHEMAS } from "./utils/default-schemas";
import type { Preset } from "./utils/presets";

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
  functionsManager: FunctionsManager;
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

// Helper to get code from sessionStorage (HMR-preserved) or default
function getInitialCode(): string {
  if (import.meta.env.DEV) {
    const stored = sessionStorage.getItem("repl:code");
    if (stored !== null) {
      return stored;
    }
  }
  return DEFAULT_CODE;
}

// Helper to get JSON from sessionStorage (HMR-preserved) or default
function getInitialJson(): string {
  if (import.meta.env.DEV) {
    const stored = sessionStorage.getItem("repl:jsonInput");
    if (stored !== null) {
      return stored;
    }
  }
  return DEFAULT_JSON;
}

function setupColorManager(schemas: typeof DEFAULT_COLOR_SCHEMAS): ColorManager {
  const colorManager = new ColorManager();

  const cssColorUri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/css-color/0/";
  const cssColorEntry = DEFAULT_COLOR_SCHEMAS.get(cssColorUri);

  // Register all other schemas
  for (const [uri, spec] of schemas.entries()) {
    try {
      colorManager.register(uri, spec);
    } catch (error) {
      console.warn(`Failed to register color schema ${uri}:`, error);
    }
  }

  if (cssColorEntry) {
    try {
      colorManager.register(cssColorUri, cssColorEntry);
    } catch (error) {
      console.warn(`Failed to register css-color schema:`, error);
    }
  }

  return colorManager;
}

function setupFunctionsManager(schemas: Map<string, FunctionSpecification>): FunctionsManager {
  const functionsManager = new FunctionsManager();

  for (const [uri, spec] of schemas.entries()) {
    try {
      functionsManager.register(spec.keyword, spec);
    } catch (error) {
      console.warn(`Failed to register function schema ${uri}:`, error);
    }
  }

  return functionsManager;
}

function App() {
  const [code, setCode] = useState(getInitialCode);
  const [jsonInput, setJsonInput] = useState(getInitialJson);
  const [inputMode, setInputMode] = useState<InputMode>("tokenscript");
  const [result, setResult] = useState<UnifiedExecutionResult>({ type: "tokenscript" });
  const [autoRun, _setAutoRun] = useAtom(autoRunAtom);
  const [jsonError, setJsonError] = useState<string>();
  const [schemaPanelCollapsed, setSchemaPanelCollapsed] = useAtom(schemaPanelCollapsedAtom);
  const [colorSchemas, _setColorSchemas] = useAtom(colorSchemasAtom);
  const [functionSchemas, _setFunctionSchemas] = useAtom(functionSchemasAtom);
  const [currentPreset, setCurrentPreset] = useAtom(currentPresetAtom);
  const [input, setInputs] = useState<Record<string, any>>({});

  // In development mode, persist code to sessionStorage for HMR preservation
  useEffect(() => {
    if (import.meta.env.DEV) {
      sessionStorage.setItem("repl:code", code);
    }
  }, [code]);

  // In development mode, persist JSON input to sessionStorage for HMR preservation
  useEffect(() => {
    if (import.meta.env.DEV) {
      sessionStorage.setItem("repl:jsonInput", jsonInput);
    }
  }, [jsonInput]);

  const executeCode = useCallback(async () => {
    const currentInput = inputMode === "tokenscript" ? code : jsonInput;
    const colorManager = setupColorManager(colorSchemas);
    const functionsManager = setupFunctionsManager(functionSchemas);

    // If input is empty or just whitespace, clear the output
    if (!currentInput.trim()) {
      setResult({ type: inputMode, colorManager, functionsManager });
      setJsonError(undefined);
      return;
    }

    const startTime = performance.now();

    try {
      if (inputMode === "tokenscript") {
        const config = new Config({ colorManager, functionsManager });

        const lexer = new Lexer(code);
        const ast = new Parser(lexer).parse();
        const interpreter = new Interpreter(ast, {
          references: { input },
          config,
        });
        const output = interpreter.interpret();
        const executionTime = performance.now() - startTime;

        setResult({
          type: "tokenscript",
          executionTime: Math.round(executionTime * 100) / 100,
          output,
          colorManager,
          functionsManager,
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

        const config = new Config({ colorManager, functionsManager });

        const output = interpretTokens(jsonTokens, config);
        const executionTime = performance.now() - startTime;

        console.log("JSON Tokens Output", { input: jsonTokens, output, executionTime });

        const _outputString = JSON.stringify(output, null, 2);

        setResult({
          type: "json",
          executionTime: Math.round(executionTime * 100) / 100,
          output,
          colorManager,
          functionsManager,
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
        functionsManager,
      });
    }
  }, [code, jsonInput, inputMode, colorSchemas, functionSchemas, input]);

  const handlePresetSelect = useCallback((preset: Preset) => {
    if (preset.type === "code") {
      setInputMode("tokenscript");
      setCode(preset.code);
    } else if (preset.type === "json") {
      setInputMode("json");
      setJsonInput(preset.code);
    }
  }, []);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      // Clear current preset if user manually changes code
      if (currentPreset) {
        setCurrentPreset("");
      }
    },
    [currentPreset, setCurrentPreset],
  );

  const handleJsonChange = useCallback(
    (newJson: string) => {
      setJsonInput(newJson);
      // Clear current preset if user manually changes JSON
      if (currentPreset) {
        setCurrentPreset("");
      }
    },
    [currentPreset, setCurrentPreset],
  );

  const handleInputModeChange = useCallback(
    (newMode: InputMode) => {
      setInputMode(newMode);
      // Clear current preset when switching input modes
      if (currentPreset) {
        setCurrentPreset("");
      }
    },
    [currentPreset, setCurrentPreset],
  );

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
      className="h-screen flex flex-col bg-zinc-950"
      data-testid="app-container"
    >
      <main
        className="flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 w-full overflow-auto"
        data-testid="app-main"
      >
        <div className="mx-auto grid grid-cols-1 max-w-full xl:max-w-[1800px] lg:grid-cols-2 gap-3 lg:gap-4 h-full">
          {/* Editor Panel */}
          <div
            className="min-h-[400px] lg:h-[calc(100vh-8rem)] rounded-xl shadow-2xl overflow-hidden"
            data-testid="editor-panel"
          >
            {inputMode === "tokenscript" ? (
              <TokenScriptEditor
                value={code}
                onChange={handleCodeChange}
                onKeyDown={handleKeyDown}
                error={result.errorInfo}
                inputMode={inputMode}
                onInputModeChange={handleInputModeChange}
                onPresetSelect={handlePresetSelect}
                onReferencesChange={setInputs}
              />
            ) : (
              <JsonTokenEditor
                value={jsonInput}
                onChange={handleJsonChange}
                onKeyDown={handleKeyDown}
                error={jsonError}
                inputMode={inputMode}
                onInputModeChange={handleInputModeChange}
                onPresetSelect={handlePresetSelect}
              />
            )}
          </div>

          {/* Right Column: Output Panel + Schema Panel */}
          <div className="flex flex-col gap-3 lg:gap-4 pb-4">
            <div
              className="rounded-xl shadow-2xl"
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
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                    data-testid="schema-panel-toggle"
                    aria-label={
                      schemaPanelCollapsed ? "Expand schema panel" : "Collapse schema panel"
                    }
                  >
                    <ArrowDown
                      className={`${schemaPanelCollapsed ? "rotate-180" : ""} transition-transform`}
                    />
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
