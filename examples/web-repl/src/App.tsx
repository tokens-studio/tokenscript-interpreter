import { useAtom, useAtomValue } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DialogManager from "./components/dialogs/DialogManager";
import EditorTitleBar from "./components/EditorTitleBar";
import { ArrowDown, Docs, Github, Share } from "./components/icons";
import JsonTokenEditor from "./components/JsonTokenEditor";
import OutputPanel from "./components/OutputPanel";
import SchemaManager from "./components/SchemaManager";
import { HEADER_HEIGHT } from "./components/shared-theme";
import { ThemeToggle } from "./components/ThemeToggle";
import TokenScriptEditor from "./components/TokenScriptEditor";
import { useTheme } from "./contexts/ThemeContext";
import {
  appStateAtom,
  colorManagerAtom,
  functionsManagerAtom,
  type InputMode,
  type JsonMode,
  openDialogAtom,
} from "./store/atoms";
import { getTheme } from "./theme/colors";
import { DEFAULT_COLOR_SCHEMAS } from "./utils/default-schemas";
import { createEmptyResult, type ExecutionResult, executeCode as runCode } from "./utils/executor";
import type { Preset } from "./utils/presets";
import { JSON_PRESETS, TOKENSCRIPT_PRESETS } from "./utils/presets";
import { fetchTokenScriptSchema } from "./utils/schema-fetcher";
import { decodeShareStateUrl } from "./utils/share";

const awakenSchemaServer = async () => {
  await fetch("https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
};

type PersistentAppState = {
  code: string;
  inputMode: InputMode;
  jsonMode: JsonMode;
  currentPresetName: string | null;
  autoRun: boolean;
  schemaPanelCollapsed: boolean;
  colorSchemas: Array<[string, any]>;
  functionSchemas: Array<[string, any]>;
};

type InitialAppState = {
  code: string;
  inputMode: InputMode;
  presetName: string | null;
  colorSchemas: Map<string, any>;
  functionSchemas: Map<string, any>;
  autoRun: boolean;
  schemaPanelCollapsed: boolean;
};

async function loadDependenciesForPreset(
  dependencies: string[],
  existingColorSchemas: Map<string, any> = new Map(),
  existingFunctionSchemas: Map<string, any> = new Map(),
): Promise<{
  colorSchemas: Map<string, any>;
  functionSchemas: Map<string, any>;
}> {
  const visited = new Set<string>();
  const colorSchemasToAdd = new Map<string, any>();
  const functionSchemasToAdd = new Map<string, any>();

  const fetchDependency = async (url: string): Promise<void> => {
    if (
      visited.has(url) ||
      existingColorSchemas.has(url) ||
      existingFunctionSchemas.has(url)
    ) {
      return;
    }

    visited.add(url);

    try {
      const response = await fetchTokenScriptSchema(url);
      const spec = response.content;

      if (spec.type === "function") {
        functionSchemasToAdd.set(url, spec);
      } else {
        colorSchemasToAdd.set(url, spec);
      }

      if (spec.requirements && Array.isArray(spec.requirements) && spec.requirements.length > 0) {
        const requirementPromises = spec.requirements.map((reqUrl) => fetchDependency(reqUrl));
        await Promise.all(requirementPromises);
      }
    } catch (error) {
      console.error(`Failed to load dependency ${url}:`, error);
      throw error;
    }
  };

  const fetchPromises = dependencies.map((url) => fetchDependency(url));
  await Promise.all(fetchPromises);

  return {
    colorSchemas: new Map([...existingColorSchemas, ...colorSchemasToAdd]),
    functionSchemas: new Map([...existingFunctionSchemas, ...functionSchemasToAdd]),
  };
}

function getDesignSystemPreset(): Preset {
  return JSON_PRESETS.find((p) => p.name === "Design system") || JSON_PRESETS[1];
}

async function getInitialAppStateWithDependencies(): Promise<InitialAppState> {
  const sharedState = decodeShareStateUrl();
  if (sharedState) {
    const colorSchemasMap = new Map(sharedState.colorSchemas);
    const functionSchemasMap = new Map(sharedState.functionSchemas);
    return {
      code: sharedState.code,
      inputMode: sharedState.inputMode,
      presetName: sharedState.currentPresetName,
      colorSchemas: colorSchemasMap,
      functionSchemas: functionSchemasMap,
    };
  }

  const designSystemPreset = getDesignSystemPreset();
  const {colorSchemas, functionSchemas} = await loadDependenciesForPreset(
    designSystemPreset.dependencies,
  );

  return {
    code: designSystemPreset.code,
    inputMode: "json",
    presetName: designSystemPreset.name,
    colorSchemas,
    functionSchemas,
    autoRun: true,
    schemaPanelCollapsed: false,
  };
}

function App() {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);

  // Initialize app state with default values first
  const [appState, setAppState] = useAtom(appStateAtom);
  const [result, setResult] = useState<ExecutionResult>(createEmptyResult("tokenscript"));
  const [jsonError, setJsonError] = useState<string>();
  const _colorManager = useAtomValue(colorManagerAtom);
  const _functionsManager = useAtomValue(functionsManagerAtom);
  const [openDialog, setOpenDialog] = useAtom(openDialogAtom);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize app state from persisted or shared state (async)
  useEffect(() => {
    const initializeAppState = async () => {
      const initialState = await getInitialAppStateWithDependencies();
      setAppState({
        code: initialState.code,
        inputMode: initialState.inputMode,
        jsonMode: "text" as JsonMode,
        currentPresetName: initialState.presetName,
        input: {},
        autoRun: initialState.autoRun ?? true,
        schemaPanelCollapsed: initialState.schemaPanelCollapsed ?? false,
        colorSchemas: initialState.colorSchemas,
        functionSchemas: initialState.functionSchemas,
      });
      setIsInitialized(true);
    };

    initializeAppState();
  }, [setAppState]);

  // Initialize schema server (run once on mount)
  useEffect(() => {
    awakenSchemaServer();
  }, []);

  useEffect(() => {
    const persistedState: PersistentAppState = {
      code: appState.code,
      inputMode: appState.inputMode,
      jsonMode: appState.jsonMode,
      currentPresetName: appState.currentPresetName,
      autoRun: appState.autoRun,
      schemaPanelCollapsed: appState.schemaPanelCollapsed,
      colorSchemas: Array.from(appState.colorSchemas.entries()),
      functionSchemas: Array.from(appState.functionSchemas.entries()),
    };

    const storage = import.meta.env.DEV ? sessionStorage : localStorage;
    storage.setItem("repl:appState", JSON.stringify(persistedState));
  }, [appState]);

  const executeCode = useCallback(async () => {
    const currentInput = appState.code;

    // If input is empty or just whitespace, clear the output
    if (!currentInput.trim()) {
      setResult(createEmptyResult(appState.inputMode));
      setJsonError(undefined);
      return;
    }

    // Validate JSON first if in JSON mode
    if (appState.inputMode === "json") {
      try {
        JSON.parse(appState.code);
        setJsonError(undefined);
      } catch (jsonErr) {
        setJsonError(jsonErr instanceof Error ? jsonErr.message : String(jsonErr));
        const emptyResult = createEmptyResult("json");
        setResult({
          ...emptyResult,
          error: jsonErr instanceof Error ? jsonErr.message : String(jsonErr),
          errorInfo: {
            message: jsonErr instanceof Error ? jsonErr.message : String(jsonErr),
          },
        });
        return;
      }
    }

    const result = await runCode({
      code: appState.code,
      mode: appState.inputMode,
      references: { input: appState.input },
      colorSchemas: appState.colorSchemas,
      functionSchemas: appState.functionSchemas,
    });

    setResult(result);
    if (appState.inputMode === "json" && !result.error) {
      setJsonError(undefined);
    }
  }, [appState]);

  const handleInputModeChange = useCallback(
    (newMode: InputMode) => {
      setAppState((prev) => ({
        ...prev,
        inputMode: newMode,
        currentPresetName: null,
      }));
    },
    [setAppState],
  );

  const loadDependencies = useCallback(
    async (dependencies: string[]) => {
      const loaded = await loadDependenciesForPreset(
        dependencies,
        appState.colorSchemas,
        appState.functionSchemas,
      );

      if (
        loaded.colorSchemas.size > appState.colorSchemas.size ||
        loaded.functionSchemas.size > appState.functionSchemas.size
      ) {
        setAppState((prev) => ({
          ...prev,
          colorSchemas: loaded.colorSchemas,
          functionSchemas: loaded.functionSchemas,
        }));
      }
    },
    [appState.colorSchemas, appState.functionSchemas, setAppState],
  );

  const handlePresetSelect = useCallback(
    async (preset: Preset) => {
      if (preset.clearDependencies) {
        setAppState((prev) => ({
          ...prev,
          colorSchemas: new Map(),
          functionSchemas: new Map(),
        }));
      }

      if (preset.dependencies && preset.dependencies.length > 0) {
        await loadDependencies(preset.dependencies);
      }

      if (preset.type === "code") {
        setAppState((prev) => ({
          ...prev,
          inputMode: "tokenscript",
          code: preset.code,
          currentPresetName: preset.name,
        }));
      } else if (preset.type === "json") {
        setAppState((prev) => ({
          ...prev,
          inputMode: "json",
          code: preset.code,
          currentPresetName: preset.name,
        }));
      }
    },
    [loadDependencies, setAppState],
  );

  const handleShare = useCallback(() => {
    setOpenDialog(openDialog === "share" ? null : "share");
  }, [openDialog, setOpenDialog]);

  useEffect(() => {
    if (!isInitialized || !appState.autoRun) return;
    executeCode();
  }, [isInitialized, appState.autoRun, executeCode]);

  useEffect(() => {
    if (!isInitialized) return;
    executeCode();
  }, [isInitialized, executeCode]);

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
      <div className="flex-1 flex flex-col">
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

            <div
              className="flex items-center gap-1 px-3 py-1 rounded"
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
                    appState.inputMode === "tokenscript" ? currentTheme.background : "transparent",
                  color:
                    appState.inputMode === "tokenscript"
                      ? currentTheme.textPrimary
                      : currentTheme.textMuted,
                  border:
                    appState.inputMode === "tokenscript"
                      ? `1px solid ${currentTheme.border}`
                      : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (appState.inputMode !== "tokenscript") {
                    e.currentTarget.style.color = currentTheme.textSecondary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (appState.inputMode !== "tokenscript") {
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
                    appState.inputMode === "json" ? currentTheme.background : "transparent",
                  color:
                    appState.inputMode === "json"
                      ? currentTheme.textPrimary
                      : currentTheme.textMuted,
                  border:
                    appState.inputMode === "json"
                      ? `1px solid ${currentTheme.border}`
                      : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (appState.inputMode !== "json") {
                    e.currentTarget.style.color = currentTheme.textSecondary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (appState.inputMode !== "json") {
                    e.currentTarget.style.color = currentTheme.textMuted;
                  }
                }}
              >
                JSON
              </button>
            </div>
          </div>

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
              onMouseEnter={(e) => {
                e.currentTarget.style.color = currentTheme.textSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = currentTheme.textMuted;
              }}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.color = currentTheme.textSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = currentTheme.textMuted;
              }}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.color = currentTheme.textSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = currentTheme.textMuted;
              }}
              aria-label="GitHub repository"
            >
              <Github />
            </a>
          </div>
        </header>

        <DialogManager shareButtonRef={shareButtonRef} />

        <main
          className="flex-1 flex overflow-hidden"
          data-testid="app-main"
        >
          <div
            className="w-1/2 flex flex-col border-r"
            style={{ borderColor: currentTheme.border }}
          >
            <EditorTitleBar
              allPresets={[...TOKENSCRIPT_PRESETS, ...JSON_PRESETS]}
              onPresetSelect={handlePresetSelect}
              currentPresetName={appState.currentPresetName}
            />

            <div
              className="flex-1 overflow-hidden"
              data-testid="editor-panel"
            >
              {appState.inputMode === "tokenscript" ? (
                <TokenScriptEditor
                  value={appState.code}
                  onChange={(code) => setAppState((prev) => ({ ...prev, code }))}
                  onKeyDown={handleKeyDown}
                  error={result.errorInfo}
                  onReferencesChange={(input) => setAppState((prev) => ({ ...prev, input }))}
                />
              ) : (
                <JsonTokenEditor
                  value={appState.code}
                  onChange={(code) => setAppState((prev) => ({ ...prev, code }))}
                  onKeyDown={handleKeyDown}
                  error={jsonError}
                />
              )}
            </div>

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
                    onClick={() => setOpenDialog("schema")}
                    className="transition-colors flex items-center gap-1 text-sm pr-2 border-r"
                    style={{
                      color: currentTheme.textMuted,
                      borderColor: currentTheme.border,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = currentTheme.textSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = currentTheme.textMuted;
                    }}
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
                    onClick={() =>
                      setAppState((prev) => ({
                        ...prev,
                        schemaPanelCollapsed: !prev.schemaPanelCollapsed,
                      }))
                    }
                    className="transition-colors"
                    style={{ color: currentTheme.textMuted }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = currentTheme.textSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = currentTheme.textMuted;
                    }}
                    data-testid="schema-panel-toggle"
                    aria-label={
                      appState.schemaPanelCollapsed
                        ? "Expand schema panel"
                        : "Collapse schema panel"
                    }
                  >
                    <ArrowDown
                      className={`${appState.schemaPanelCollapsed ? "rotate-180" : ""} transition-transform`}
                    />
                  </button>
                </div>
              </div>
              {!appState.schemaPanelCollapsed && (
                <div className="max-h-64 overflow-auto">
                  <SchemaManager />
                </div>
              )}
            </div>
          </div>

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
