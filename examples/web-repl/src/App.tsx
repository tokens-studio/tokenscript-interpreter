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
import EditorModeTitle from "./components/EditorModeTitle";
import JsonTokenEditor from "./components/JsonTokenEditor";
import OutputPanel from "./components/OutputPanel";
import PresetSelector from "./components/PresetSelector";
import SchemaManager from "./components/SchemaManager";
import { ThemeToggle } from "./components/ThemeToggle";
import TokenScriptEditor from "./components/TokenScriptEditor";
import {
  autoRunAtom,
  colorSchemasAtom,
  functionSchemasAtom,
  schemaPanelCollapsedAtom,
} from "./store/atoms";
import { useTheme } from "./contexts/ThemeContext";
import { getTheme } from "./theme/colors";
import { DEFAULT_COLOR_SCHEMAS } from "./utils/default-schemas";
import type { Preset } from "./utils/presets";

const awakenSchemaServer = async () => {
  await fetch("https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
};

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

return primary.to.srgb();`;

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

  for (const [uri, spec] of schemas.entries()) {
    try {
      colorManager.register(uri, spec);
    } catch (error) {
      console.warn(`Failed to register color schema ${uri}:`, error);
    }
  }

  // Always register css color name schema to display css value in color tile
  const cssColorUri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/css-color/0/";
  const CssColorSchema = DEFAULT_COLOR_SCHEMAS.get(cssColorUri);
  if (CssColorSchema) {
    try {
      colorManager.register(cssColorUri, CssColorSchema);
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
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  const [code, setCode] = useState(getInitialCode);
  const [jsonInput, setJsonInput] = useState(getInitialJson);
  const [inputMode, setInputMode] = useState<InputMode>("tokenscript");
  const [result, setResult] = useState<UnifiedExecutionResult>({ type: "tokenscript" });
  const [autoRun, setAutoRun] = useAtom(autoRunAtom);
  const [jsonError, setJsonError] = useState<string>();
  const [schemaPanelCollapsed, setSchemaPanelCollapsed] = useAtom(schemaPanelCollapsedAtom);
  const [colorSchemas, _setColorSchemas] = useAtom(colorSchemasAtom);
  const [functionSchemas, _setFunctionSchemas] = useAtom(functionSchemasAtom);
  const [input, setInputs] = useState<Record<string, any>>({});

  useEffect(() => {
    awakenSchemaServer();
  }, []);

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
      className="h-screen flex"
      style={{ backgroundColor: currentTheme.background }}
      data-testid="app-container"
    >
      {/* Left Sidebar */}
      <aside
        className="w-12 border-r flex flex-col items-center py-4"
        style={{
          backgroundColor: currentTheme.surface,
          borderColor: currentTheme.border,
        }}
      >
        <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 font-bold text-sm">
          T
        </div>
        <div className="flex-1" />
        <ThemeToggle />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation Bar */}
        <header
          className="h-12 border-b flex items-center px-4 gap-4"
          style={{
            backgroundColor: currentTheme.surface,
            borderColor: currentTheme.border,
          }}
        >
          <div className="flex items-center gap-3 text-sm">
            <span className="text-emerald-400 font-medium">tokenscript</span>
            <span style={{ color: currentTheme.textMuted }}>/</span>
            
            {/* Mode Selector (tokenscript | json) */}
            <div className="flex items-center">
              <EditorModeTitle
                inputMode={inputMode}
                onInputModeChange={setInputMode}
                testId="input-mode-dropdown"
                defaultLabel="tokenscript"
              />
            </div>
            
            <span style={{ color: currentTheme.textMuted }}>/</span>
            
            {/* Preset Selector */}
            <PresetSelector
              inputMode={inputMode}
              onPresetSelect={handlePresetSelect}
              testId="preset-selector"
            />
          </div>
        </header>

        {/* Main Grid Layout */}
        <main
          className="flex-1 flex overflow-hidden"
          data-testid="app-main"
        >
          {/* Left Column: Editor + Schemas */}
          <div
            className="w-1/2 flex flex-col border-r"
            style={{ borderColor: currentTheme.border }}
          >
            {/* Code Editor */}
            <div
              className="flex-1 overflow-hidden"
              data-testid="editor-panel"
            >
              {inputMode === "tokenscript" ? (
                <TokenScriptEditor
                  value={code}
                  onChange={setCode}
                  onKeyDown={handleKeyDown}
                  error={result.errorInfo}
                  onReferencesChange={setInputs}
                />
              ) : (
                <JsonTokenEditor
                  value={jsonInput}
                  onChange={setJsonInput}
                  onKeyDown={handleKeyDown}
                  error={jsonError}
                />
              )}
            </div>

            {/* Schema Panel - Below Editor */}
            <div
              data-testid="schema-panel"
              className="border-t"
              style={{
                backgroundColor: currentTheme.surface,
                borderColor: currentTheme.border,
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-2 border-b"
                style={{ borderColor: currentTheme.border }}
              >
                <h3
                  className="text-sm font-medium"
                  style={{ color: currentTheme.textSecondary }}
                >
                  Schemas
                </h3>
                <button
                  type="button"
                  onClick={() => setSchemaPanelCollapsed(!schemaPanelCollapsed)}
                  className="transition-colors"
                  style={{ color: currentTheme.textMuted }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = currentTheme.textSecondary)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = currentTheme.textMuted)}
                  data-testid="schema-panel-toggle"
                  aria-label={
                    schemaPanelCollapsed ? "Expand schema panel" : "Collapse schema panel"
                  }
                >
                  <ArrowDown
                    className={`${schemaPanelCollapsed ? "rotate-180" : ""} transition-transform`}
                  />
                </button>
              </div>
              {!schemaPanelCollapsed && (
                <div className="max-h-64 overflow-auto">
                  <SchemaManager />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Output (Full Height) */}
          <div
            className="flex-1 overflow-hidden"
            data-testid="app-output-panel"
          >
            <OutputPanel result={result} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
