import {
  ColorManager,
  Config,
  type ColorSpecification,
  type FunctionSpecification,
  FunctionsManager,
  Interpreter,
  interpretTokens,
  Lexer,
  Parser,
} from "@tokens-studio/tokenscript-interpreter";
import { useAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, Docs, Github, Share } from "./components/icons";
import EditorTitleBar from "./components/EditorTitleBar";
import JsonTokenEditor from "./components/JsonTokenEditor";
import OutputPanel from "./components/OutputPanel";
import PresetSelector from "./components/PresetSelector";
import SchemaDialog from "./components/SchemaDialog";
import SharePopover from "./components/SharePopover";
import SchemaManager from "./components/SchemaManager";
import { HEADER_HEIGHT } from "./components/shared-theme";
import SlantedSeparator from "./components/SlantedSeparator";
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
import { JSON_PRESETS, TOKENSCRIPT_PRESETS } from "./utils/presets";
import { fetchTokenScriptSchema } from "./utils/schema-fetcher";
import {
  createShareState,
  getShareStateFromUrl,
  type ShareState,
} from "./utils/share";

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
type JsonMode = "visual" | "text";

type PersistentState = {
  mode: InputMode;
  code: string;
  preset: string | null;
  jsonMode: JsonMode;
  schemas: Array<[string, any]>;
  theme: string;
};

type AppState = {
  code: string;
  jsonInput: string;
  inputMode: InputMode;
  presetName: string | null;
  colorSchemas: Map<string, any>;
  functionSchemas: Map<string, any>;
};

// Serialize app state for persistence
function serializeAppState(
  mode: InputMode,
  code: string,
  preset: string | null,
  jsonMode: JsonMode,
  colorSchemas: Map<string, any>,
  functionSchemas: Map<string, any>,
  theme: string,
): PersistentState {
  const schemas: Array<[string, any]> = [];
  colorSchemas.forEach((spec, url) => {
    schemas.push([`color:${url}`, spec]);
  });
  functionSchemas.forEach((spec, url) => {
    schemas.push([`function:${url}`, spec]);
  });

  return {
    mode,
    code,
    preset,
    jsonMode,
    schemas,
    theme,
  };
}

// Restore state from persistent storage (sessionStorage for HMR, localStorage for production)
function getPersistedState(): PersistentState | null {
  const stored = sessionStorage.getItem("repl:state") || localStorage.getItem("repl:state");
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as PersistentState;
  } catch {
    return null;
  }
}

// Get design system preset
function getDesignSystemPreset(): Preset {
  return JSON_PRESETS.find((p) => p.name === "Design system") || JSON_PRESETS[1];
}

// Initialize app state based on priority: URL → Persisted State → Design System Preset
function getInitialAppState(): AppState {
  const designSystemPreset = getDesignSystemPreset();

  // Priority 1: Load from URL
  const sharedState = getShareStateFromUrl();
  if (sharedState) {
    const colorSchemasMap = new Map(sharedState.colorSchemas);
    const functionSchemasMap = new Map(sharedState.functionSchemas);
    return {
      code: sharedState.code,
      jsonInput: sharedState.mode === "json" ? sharedState.code : "",
      inputMode: sharedState.mode,
      presetName: null,
      colorSchemas: colorSchemasMap,
      functionSchemas: functionSchemasMap,
    };
  }

  // Priority 2: Restore from persistent storage
  const persisted = getPersistedState();
  if (persisted) {
    const colorSchemasMap = new Map<string, any>();
    const functionSchemasMap = new Map<string, any>();

    persisted.schemas.forEach(([key, spec]) => {
      if (key.startsWith("color:")) {
        const url = key.slice(6);
        colorSchemasMap.set(url, spec);
      } else if (key.startsWith("function:")) {
        const url = key.slice(9);
        functionSchemasMap.set(url, spec);
      }
    });

    return {
      code: persisted.code,
      jsonInput: persisted.mode === "json" ? persisted.code : "",
      inputMode: persisted.mode,
      presetName: persisted.preset,
      colorSchemas: colorSchemasMap,
      functionSchemas: functionSchemasMap,
    };
  }

  // Priority 3: Load design system preset as default
  return {
    code: designSystemPreset.code,
    jsonInput: designSystemPreset.code,
    inputMode: "json",
    presetName: designSystemPreset.name,
    colorSchemas: new Map(),
    functionSchemas: new Map(),
  };
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
  
  const initialState = getInitialAppState();
  const [code, setCode] = useState(initialState.code);
  const [jsonInput, setJsonInput] = useState(initialState.jsonInput);
  const [inputMode, setInputMode] = useState<InputMode>(initialState.inputMode);
  const [currentPresetName, setCurrentPresetName] = useState<string | null>(initialState.presetName);
  const [jsonMode, setJsonMode] = useState<JsonMode>("text");
  const [result, setResult] = useState<UnifiedExecutionResult>({ type: "tokenscript" });
  const [autoRun, setAutoRun] = useAtom(autoRunAtom);
  const [jsonError, setJsonError] = useState<string>();
  const [schemaPanelCollapsed, setSchemaPanelCollapsed] = useAtom(schemaPanelCollapsedAtom);
  const [colorSchemas, _setColorSchemas] = useAtom(colorSchemasAtom);
  const [functionSchemas, _setFunctionSchemas] = useAtom(functionSchemasAtom);
  const [input, setInputs] = useState<Record<string, any>>({});
  const [isSchemaDialogOpen, setIsSchemaDialogOpen] = useState(false);
  const [isSharePopoverOpen, setIsSharePopoverOpen] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const [shareState, setShareState] = useState<ShareState>({
    version: 1,
    mode: "tokenscript",
    code: "",
    colorSchemas: [],
    functionSchemas: [],
  });

  const handleSchemaSelect = useCallback(
    (url: string, spec: any, type?: "color" | "function") => {
      const schemaType = type || (spec.type === "function" ? "function" : "color");
      if (schemaType === "color") {
        _setColorSchemas((current) => {
          const updated = new Map(current);
          updated.set(url, spec);
          return updated;
        });
      } else {
        _setFunctionSchemas((current) => {
          const updated = new Map(current);
          updated.set(url, spec);
          return updated;
        });
      }
    },
    [_setColorSchemas, _setFunctionSchemas],
  );

  const handleRestoreDefaults = useCallback(() => {
    _setColorSchemas(new Map(DEFAULT_COLOR_SCHEMAS));
    _setFunctionSchemas(new Map());
  }, [_setColorSchemas, _setFunctionSchemas]);

  const handleClearAllSchemas = useCallback(() => {
    _setColorSchemas(new Map());
    _setFunctionSchemas(new Map());
  }, [_setColorSchemas, _setFunctionSchemas]);

  // Apply initial schemas from restored state
  useEffect(() => {
    if (initialState.colorSchemas.size > 0) {
      _setColorSchemas(initialState.colorSchemas);
    }
    if (initialState.functionSchemas.size > 0) {
      _setFunctionSchemas(initialState.functionSchemas);
    }
    awakenSchemaServer();
  }, []);

  // Persist state to storage (sessionStorage for HMR in dev, localStorage for production)
  useEffect(() => {
    const currentCode = inputMode === "tokenscript" ? code : jsonInput;
    const persistedState = serializeAppState(
      inputMode,
      currentCode,
      currentPresetName,
      jsonMode,
      colorSchemas,
      functionSchemas,
      theme,
    );
    
    // Dev: use sessionStorage for HMR preservation
    if (import.meta.env.DEV) {
      sessionStorage.setItem("repl:state", JSON.stringify(persistedState));
    } else {
      // Production: use localStorage for persistence across sessions
      localStorage.setItem("repl:state", JSON.stringify(persistedState));
    }
  }, [code, jsonInput, inputMode, currentPresetName, jsonMode, colorSchemas, functionSchemas, theme]);

  // Clear preset when code is manually edited
  useEffect(() => {
    if (currentPresetName) {
      const currentPreset = [...TOKENSCRIPT_PRESETS, ...JSON_PRESETS].find(
        (p) => p.name === currentPresetName,
      );
      if (currentPreset) {
        const currentContent = inputMode === "tokenscript" ? code : jsonInput;
        if (currentContent !== currentPreset.code) {
          setCurrentPresetName(null);
        }
      }
    }
  }, [code, jsonInput, currentPresetName, inputMode]);

  // Update share state - convert current state to shareable format
  useEffect(() => {
    const currentCode = inputMode === "tokenscript" ? code : jsonInput;
    const persistedState = serializeAppState(
      inputMode,
      currentCode,
      currentPresetName,
      jsonMode,
      colorSchemas,
      functionSchemas,
      theme,
    );
    setShareState(createShareState(inputMode, currentCode, colorSchemas, functionSchemas));
  }, [code, jsonInput, inputMode, colorSchemas, functionSchemas, currentPresetName, jsonMode, theme]);

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

  const handleInputModeChange = useCallback((newMode: InputMode) => {
    // Sync current content to the new mode's storage
    if (newMode === "tokenscript" && inputMode === "json") {
      setCode(jsonInput);
    } else if (newMode === "json" && inputMode === "tokenscript") {
      setJsonInput(code);
    }
    setInputMode(newMode);
    setCurrentPresetName(null);
  }, [inputMode, code, jsonInput]);

  const loadDependencies = useCallback(
    async (dependencies: string[]) => {
      const visited = new Set<string>();
      const colorSchemasToAdd = new Map<string, ColorSpecification>();
      const functionSchemasToAdd = new Map<string, FunctionSpecification>();

      const fetchDependency = async (url: string): Promise<void> => {
        if (visited.has(url) || colorSchemas.has(url) || functionSchemas.has(url)) {
          return;
        }

        visited.add(url);

        try {
          const response = await fetchTokenScriptSchema(url);
          const spec = response.content;

          if (spec.type === "function") {
            functionSchemasToAdd.set(url, spec as FunctionSpecification);
          } else {
            colorSchemasToAdd.set(url, spec as ColorSpecification);
          }

          if (
            spec.requirements &&
            Array.isArray(spec.requirements) &&
            spec.requirements.length > 0
          ) {
            const requirementPromises = spec.requirements.map((reqUrl) =>
              fetchDependency(reqUrl),
            );
            await Promise.all(requirementPromises);
          }
        } catch (error) {
          console.error(`Failed to load dependency ${url}:`, error);
          throw error;
        }
      };

      const fetchPromises = dependencies.map((url) => fetchDependency(url));
      await Promise.all(fetchPromises);

      if (colorSchemasToAdd.size > 0) {
        _setColorSchemas((current) => {
          const updated = new Map(current);
          colorSchemasToAdd.forEach((spec, url) => {
            updated.set(url, spec);
          });
          return updated;
        });
      }

      if (functionSchemasToAdd.size > 0) {
        _setFunctionSchemas((current) => {
          const updated = new Map(current);
          functionSchemasToAdd.forEach((spec, url) => {
            updated.set(url, spec);
          });
          return updated;
        });
      }
    },
    [colorSchemas, functionSchemas, _setColorSchemas, _setFunctionSchemas],
  );

  // Load preset dependencies if using design system preset and it's a fresh load
  useEffect(() => {
    if (currentPresetName === "Design system" && initialState.colorSchemas.size === 0) {
      const preset = getDesignSystemPreset();
      if (preset.dependencies && preset.dependencies.length > 0) {
        loadDependencies(preset.dependencies).catch((error) => {
          console.error('Failed to load design system preset dependencies:', error);
        });
      }
    }
  }, [currentPresetName, initialState.colorSchemas.size, loadDependencies]);

  const handlePresetSelect = useCallback(
    async (preset: Preset) => {
      if (preset.clearDependencies) {
        _setColorSchemas(new Map());
        _setFunctionSchemas(new Map());
      }

      if (preset.dependencies && preset.dependencies.length > 0) {
        await loadDependencies(preset.dependencies);
      }

      if (preset.type === "code") {
        setInputMode("tokenscript");
        setCode(preset.code);
      } else if (preset.type === "json") {
        setInputMode("json");
        setJsonInput(preset.code);
      }
      setCurrentPresetName(preset.name);
    },
    [loadDependencies, _setColorSchemas, _setFunctionSchemas],
  );

  const handleShare = useCallback(() => {
    setIsSharePopoverOpen(!isSharePopoverOpen);
  }, [isSharePopoverOpen]);

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
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation Bar */}
        <header
          className="border-b flex items-center justify-between px-4 gap-4"
          style={{
            backgroundColor: currentTheme.surface,
            borderColor: currentTheme.border,
            height: HEADER_HEIGHT,
          }}
        >
          <div className="flex items-center gap-3 text-sm h-full">
            <span className="text-emerald-400 font-medium px-3 select-none">tokenscript</span>
            
            {/* Mode Switch */}
            <div className="flex items-center gap-1 px-3 py-1 rounded"
              style={{
                backgroundColor: currentTheme.background,
                border: `1px solid ${currentTheme.border}`,
              }}
            >
              <button
                type="button"
                onClick={() => handleInputModeChange("tokenscript")}
                className="px-2 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor:
                    inputMode === "tokenscript"
                      ? currentTheme.background
                      : "transparent",
                  color:
                    inputMode === "tokenscript"
                      ? currentTheme.textPrimary
                      : currentTheme.textMuted,
                  border:
                    inputMode === "tokenscript"
                      ? `1px solid ${currentTheme.border}`
                      : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (inputMode !== "tokenscript") {
                    e.currentTarget.style.color = currentTheme.textSecondary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (inputMode !== "tokenscript") {
                    e.currentTarget.style.color = currentTheme.textMuted;
                  }
                }}
              >
                TokenScript
              </button>
              <button
                type="button"
                onClick={() => handleInputModeChange("json")}
                className="px-2 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  backgroundColor:
                    inputMode === "json"
                      ? currentTheme.background
                      : "transparent",
                  color:
                    inputMode === "json"
                      ? currentTheme.textPrimary
                      : currentTheme.textMuted,
                  border:
                    inputMode === "json"
                      ? `1px solid ${currentTheme.border}`
                      : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (inputMode !== "json") {
                    e.currentTarget.style.color = currentTheme.textSecondary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (inputMode !== "json") {
                    e.currentTarget.style.color = currentTheme.textMuted;
                  }
                }}
              >
                JSON
              </button>
            </div>

          </div>

          {/* Right Navigation Icons and Controls */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            <button
              ref={shareButtonRef}
              type="button"
              onClick={handleShare}
              className="transition-colors pr-4"
              style={{
                color: currentTheme.textMuted,
                borderRight: `1px solid ${currentTheme.border}`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = currentTheme.textSecondary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = currentTheme.textMuted)}
              aria-label="Share"
            >
              <Share />
            </button>
            <a
              href="https://docs.tokenscript.dev.gcp.tokens.studio/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: currentTheme.textMuted }}
              onMouseEnter={(e) => (e.currentTarget.style.color = currentTheme.textSecondary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = currentTheme.textMuted)}
              aria-label="Documentation"
            >
              <Docs />
            </a>
            <a
              href="https://github.com/tokens-studio/tokenscript-interpreter"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: currentTheme.textMuted }}
              onMouseEnter={(e) => (e.currentTarget.style.color = currentTheme.textSecondary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = currentTheme.textMuted)}
              aria-label="GitHub repository"
            >
              <Github />
            </a>
          </div>
        </header>

        <SchemaDialog
          isOpen={isSchemaDialogOpen}
          onClose={() => setIsSchemaDialogOpen(false)}
          onSchemaSelect={handleSchemaSelect}
          onCreateCustom={() => setIsSchemaDialogOpen(false)}
          onRestoreDefaults={handleRestoreDefaults}
          onClearAllSchemas={handleClearAllSchemas}
          existingColorSchemas={colorSchemas}
          existingFunctionSchemas={functionSchemas}
        />

        <SharePopover
          isOpen={isSharePopoverOpen}
          onClose={() => setIsSharePopoverOpen(false)}
          shareState={shareState}
          anchorRef={shareButtonRef}
        />

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
            {/* Editor Title Bar */}
            <EditorTitleBar
              allPresets={[...TOKENSCRIPT_PRESETS, ...JSON_PRESETS]}
              onPresetSelect={handlePresetSelect}
              currentPresetName={currentPresetName}
            />

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
                className="flex items-center justify-between px-4 py-2 border-b gap-2"
                style={{ borderColor: currentTheme.border }}
              >
                <h3
                  className="text-sm font-medium"
                  style={{ color: currentTheme.textSecondary }}
                >
                  Schemas
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSchemaDialogOpen(true)}
                    className="transition-colors flex items-center gap-1 text-sm pr-2 border-r"
                    style={{ 
                      color: currentTheme.textMuted,
                      borderColor: currentTheme.border,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = currentTheme.textSecondary)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = currentTheme.textMuted)}
                    data-testid="schema-panel-add"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span>Load schema</span>
                  </button>
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
