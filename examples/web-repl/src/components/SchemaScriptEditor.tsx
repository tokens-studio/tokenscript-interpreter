import {
  ColorManager,
  type ColorSpecification,
  Config,
  type FunctionSpecification,
  FunctionsManager,
  Interpreter,
  Lexer,
  Parser,
} from "@tokens-studio/tokenscript-interpreter";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../contexts/ThemeContext";
import { getTheme } from "../theme/colors";
import { DEFAULT_COLOR_SCHEMAS } from "../utils/default-schemas";
import { fetchTokenScriptSchema } from "../utils/schema-fetcher";
import MonacoEditor from "./MonacoEditor";
import OutputPanel from "./OutputPanel";

interface ConversionScript {
  script: {
    type: string;
    script: string;
  };
  source: string;
  target: string;
  lossless?: boolean;
  description?: string;
}

interface SchemaScriptEditorProps {
  schema: ColorSpecification | FunctionSpecification;
  schemaUrl: string;
  conversionIndex?: number;
  onClose: () => void;
  mode?: "conversion" | "function";
}

type UnifiedExecutionResult = {
  type: "tokenscript";
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

export default function SchemaScriptEditor({
  schema,
  schemaUrl,
  conversionIndex = 0,
  onClose,
  mode,
}: SchemaScriptEditorProps) {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);

  // Determine the mode automatically if not provided
  const editorMode = useMemo(() => {
    if (mode) return mode;
    return schema.type === "function" ? "function" : "conversion";
  }, [mode, schema.type]);

  // Get the conversion script (for color schemas)
  const conversion: ConversionScript | undefined = useMemo(() => {
    if (
      editorMode === "conversion" &&
      "conversions" in schema &&
      Array.isArray(schema.conversions)
    ) {
      return schema.conversions[conversionIndex];
    }
    return undefined;
  }, [schema, conversionIndex, editorMode]);

  // Get the script to edit
  const initialScript = useMemo(() => {
    if (editorMode === "function" && schema.type === "function") {
      const funcSchema = schema as FunctionSpecification;
      return funcSchema.script?.script || "";
    }
    return conversion?.script?.script || "";
  }, [editorMode, schema, conversion]);

  const [script, setScript] = useState(initialScript);
  const [result, setResult] = useState<UnifiedExecutionResult | null>(null);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [requirements, setRequirements] = useState<{
    colors: Map<string, ColorSpecification>;
    functions: Map<string, FunctionSpecification>;
  }>({ colors: new Map(), functions: new Map() });

  // Extract schema properties to generate input fields
  const schemaProperties = useMemo(() => {
    // For function schemas, use the input properties
    if (schema.type === "function") {
      const funcSchema = schema as FunctionSpecification;
      if (funcSchema.input && funcSchema.input.type === "object") {
        return funcSchema.input.properties || {};
      }
      return {};
    }

    // For color schemas, use the schema properties
    if (!schema || schema.type !== "color") return {};
    const colorSchema = schema as ColorSpecification;
    if (!colorSchema.schema || colorSchema.schema.type !== "object") return {};
    return colorSchema.schema.properties || {};
  }, [schema]);

  // Compute initial inputs based on schema properties
  const initialInputsValue = useMemo(() => {
    const inputs: Record<string, any> = {};
    Object.entries(schemaProperties).forEach(([key, propSchema]) => {
      const prop = propSchema as any;
      const type = prop.type.toLowerCase();
      if (type === "number") {
        inputs[key] = 0;
      } else if (type === "string") {
        inputs[key] = "";
      } else if (type === "boolean") {
        inputs[key] = false;
      } else if (type === "color") {
        inputs[key] = { r: 255, g: 0, b: 0 };
      } else {
        inputs[key] = "";
      }
    });
    return inputs;
  }, [schemaProperties]);

  const [inputs, setInputs] = useState<Record<string, any>>(initialInputsValue);

  // Load requirements when schema changes
  useEffect(() => {
    const loadRequirements = async () => {
      if (!schema.requirements || schema.requirements.length === 0) {
        return;
      }

      setLoadingRequirements(true);
      const colorSchemas = new Map<string, ColorSpecification>();
      const functionSchemas = new Map<string, FunctionSpecification>();

      try {
        const results = await Promise.all(
          schema.requirements.map(async (reqUrl) => {
            try {
              const response = await fetchTokenScriptSchema(reqUrl);
              return { url: reqUrl, spec: response.content };
            } catch (err) {
              console.error(`Failed to load requirement ${reqUrl}:`, err);
              return null;
            }
          }),
        );

        for (const result of results) {
          if (!result) continue;
          if (result.spec.type === "function") {
            functionSchemas.set(result.url, result.spec as FunctionSpecification);
          } else {
            colorSchemas.set(result.url, result.spec as ColorSpecification);
          }
        }

        setRequirements({ colors: colorSchemas, functions: functionSchemas });
      } catch (err) {
        console.error("Failed to load requirements:", err);
      } finally {
        setLoadingRequirements(false);
      }
    };

    loadRequirements();
  }, [schema]);

  // Execute the script
  const executeScript = useCallback(async () => {
    if (!script.trim()) {
      setResult(null);
      return;
    }

    const colorManager = new ColorManager();

    // Always register CSS color schema for displaying color tiles
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

    // Register requirement color schemas
    requirements.colors.forEach((spec, url) => {
      try {
        colorManager.register(url, spec);
      } catch (error) {
        console.warn(`Failed to register color schema ${url}:`, error);
      }
    });

    const functionsManager = new FunctionsManager();
    requirements.functions.forEach((spec, url) => {
      try {
        functionsManager.register(spec.keyword, spec);
      } catch (error) {
        console.warn(`Failed to register function schema ${url}:`, error);
      }
    });

    const startTime = performance.now();

    try {
      const config = new Config({ colorManager, functionsManager });

      // For function schemas, we need to construct the input correctly
      let scriptInput = inputs;
      if (editorMode === "function") {
        // For functions, the input is typically passed as a list or object
        // Convert our inputs object to match what the script expects
        scriptInput = { input: Object.values(inputs) };
      }

      const lexer = new Lexer(script);
      const ast = new Parser(lexer).parse();
      const interpreter = new Interpreter(ast, {
        references: scriptInput,
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

      setResult({
        type: "tokenscript",
        error: errorInfo.message,
        errorInfo,
        executionTime: Math.round(executionTime * 100) / 100,
        colorManager,
        functionsManager,
      });
    }
  }, [script, inputs, requirements, editorMode]);

  // Auto-execute on script or input change
  useEffect(() => {
    executeScript();
  }, [executeScript]);

  const handleInputChange = (key: string, value: any) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      executeScript();
    } else if (event.key === "Escape") {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
      role="none"
    >
      <div
        role="dialog"
        tabIndex={-1}
        className="w-full h-full max-w-7xl max-h-[90vh] flex flex-col rounded-lg shadow-2xl overflow-hidden"
        style={{
          backgroundColor: currentTheme.surface,
          borderColor: currentTheme.border,
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        aria-label="Schema script editor"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: currentTheme.border }}
        >
          <div className="flex-1 min-w-0">
            <h2
              className="text-lg font-semibold truncate"
              style={{ color: currentTheme.textPrimary }}
            >
              {schema.name} - Script Editor
            </h2>
            {editorMode === "conversion" && conversion && (
              <p
                className="text-sm mt-1"
                style={{ color: currentTheme.textMuted }}
              >
                {conversion.description || `Conversion ${conversionIndex + 1}`}
              </p>
            )}
            {editorMode === "function" && (
              <p
                className="text-sm mt-1"
                style={{ color: currentTheme.textMuted }}
              >
                {schema.description || "Function script"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 transition-colors"
            style={{ color: currentTheme.textMuted }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = currentTheme.textSecondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = currentTheme.textMuted;
            }}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel - Inputs */}
          <div
            className="w-64 border-r flex flex-col"
            style={{ borderColor: currentTheme.border }}
          >
            <div
              className="p-3 border-b"
              style={{ borderColor: currentTheme.border }}
            >
              <h3
                className="text-sm font-medium"
                style={{ color: currentTheme.textSecondary }}
              >
                Input Values
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-3">
              {Object.entries(schemaProperties).map(([key, propSchema]) => {
                const prop = propSchema as any;
                return (
                  <div key={key}>
                    <label
                      htmlFor={`input-${key}`}
                      className="block text-sm font-medium mb-1"
                      style={{ color: currentTheme.textSecondary }}
                    >
                      {key}
                      {prop.description && (
                        <span
                          className="block text-xs font-normal mt-0.5"
                          style={{ color: currentTheme.textMuted }}
                        >
                          {prop.description}
                        </span>
                      )}
                    </label>
                    {prop.type === "number" ? (
                      <input
                        id={`input-${key}`}
                        type="number"
                        value={inputs[key] || 0}
                        onChange={(e) => handleInputChange(key, parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm rounded border"
                        style={{
                          backgroundColor: currentTheme.background,
                          borderColor: currentTheme.border,
                          color: currentTheme.textPrimary,
                        }}
                      />
                    ) : prop.type === "boolean" ? (
                      <input
                        id={`input-${key}`}
                        type="checkbox"
                        checked={inputs[key] || false}
                        onChange={(e) => handleInputChange(key, e.target.checked)}
                        className="w-4 h-4"
                      />
                    ) : prop.type === "color" || prop.type === "Color" ? (
                      <div className="space-y-2">
                        <div
                          className="text-xs"
                          style={{ color: currentTheme.textMuted }}
                        >
                          RGB Color
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label
                              htmlFor={`input-${key}-r`}
                              className="text-xs"
                              style={{ color: currentTheme.textMuted }}
                            >
                              R
                            </label>
                            <input
                              id={`input-${key}-r`}
                              type="number"
                              min="0"
                              max="255"
                              value={inputs[key]?.r || 0}
                              onChange={(e) =>
                                handleInputChange(key, {
                                  ...inputs[key],
                                  r: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full px-2 py-1 text-sm rounded border"
                              style={{
                                backgroundColor: currentTheme.background,
                                borderColor: currentTheme.border,
                                color: currentTheme.textPrimary,
                              }}
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`input-${key}-g`}
                              className="text-xs"
                              style={{ color: currentTheme.textMuted }}
                            >
                              G
                            </label>
                            <input
                              id={`input-${key}-g`}
                              type="number"
                              min="0"
                              max="255"
                              value={inputs[key]?.g || 0}
                              onChange={(e) =>
                                handleInputChange(key, {
                                  ...inputs[key],
                                  g: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full px-2 py-1 text-sm rounded border"
                              style={{
                                backgroundColor: currentTheme.background,
                                borderColor: currentTheme.border,
                                color: currentTheme.textPrimary,
                              }}
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`input-${key}-b`}
                              className="text-xs"
                              style={{ color: currentTheme.textMuted }}
                            >
                              B
                            </label>
                            <input
                              id={`input-${key}-b`}
                              type="number"
                              min="0"
                              max="255"
                              value={inputs[key]?.b || 0}
                              onChange={(e) =>
                                handleInputChange(key, {
                                  ...inputs[key],
                                  b: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full px-2 py-1 text-sm rounded border"
                              style={{
                                backgroundColor: currentTheme.background,
                                borderColor: currentTheme.border,
                                color: currentTheme.textPrimary,
                              }}
                            />
                          </div>
                        </div>
                        <div
                          className="w-full h-8 rounded border"
                          style={{
                            backgroundColor: `rgb(${inputs[key]?.r || 0}, ${inputs[key]?.g || 0}, ${inputs[key]?.b || 0})`,
                            borderColor: currentTheme.border,
                          }}
                        />
                      </div>
                    ) : (
                      <input
                        id={`input-${key}`}
                        type="text"
                        value={inputs[key] || ""}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        className="w-full px-2 py-1 text-sm rounded border"
                        style={{
                          backgroundColor: currentTheme.background,
                          borderColor: currentTheme.border,
                          color: currentTheme.textPrimary,
                        }}
                      />
                    )}
                  </div>
                );
              })}
              {Object.keys(schemaProperties).length === 0 && (
                <div
                  className="text-sm text-center py-8"
                  style={{ color: currentTheme.textMuted }}
                >
                  No input fields defined
                </div>
              )}
            </div>

            {/* Requirements */}
            {schema.requirements && schema.requirements.length > 0 && (
              <>
                <div
                  className="p-3 border-t border-b"
                  style={{ borderColor: currentTheme.border }}
                >
                  <h3
                    className="text-sm font-medium"
                    style={{ color: currentTheme.textSecondary }}
                  >
                    Requirements
                  </h3>
                </div>
                <div className="p-3 space-y-2 max-h-48 overflow-auto">
                  {loadingRequirements ? (
                    <div
                      className="flex items-center gap-2 text-xs"
                      style={{ color: currentTheme.textMuted }}
                    >
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    schema.requirements.map((reqUrl) => (
                      <div
                        key={reqUrl}
                        className="text-xs truncate font-mono"
                        style={{ color: currentTheme.textMuted }}
                        title={reqUrl}
                      >
                        {requirements.colors.has(reqUrl)
                          ? requirements.colors.get(reqUrl)?.name || reqUrl
                          : requirements.functions.has(reqUrl)
                            ? requirements.functions.get(reqUrl)?.name || reqUrl
                            : reqUrl}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Middle panel - Script editor */}
          <div className="flex-1 flex flex-col">
            <div
              className="p-3 border-b"
              style={{ borderColor: currentTheme.border }}
            >
              <h3
                className="text-sm font-medium"
                style={{ color: currentTheme.textSecondary }}
              >
                TokenScript
              </h3>
            </div>
            <div className="flex-1 overflow-hidden">
              <MonacoEditor
                value={script}
                onChange={setScript}
                onKeyDown={handleKeyDown}
                language="tokenscript"
                theme={theme === "dark" ? "tokenscript-theme-dark" : "tokenscript-theme-light"}
                error={result?.errorInfo}
              />
            </div>
          </div>

          {/* Right panel - Output */}
          <div
            className="w-96 border-l flex flex-col"
            style={{ borderColor: currentTheme.border }}
          >
            <div
              className="p-3 border-b"
              style={{ borderColor: currentTheme.border }}
            >
              <h3
                className="text-sm font-medium"
                style={{ color: currentTheme.textSecondary }}
              >
                Output
              </h3>
            </div>
            <div className="flex-1 overflow-hidden">
              {result ? (
                <OutputPanel result={result} />
              ) : (
                <div
                  className="flex items-center justify-center h-full"
                  style={{ color: currentTheme.textMuted }}
                >
                  <p className="text-sm">No output yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-3 border-t flex items-center justify-between"
          style={{ borderColor: currentTheme.border }}
        >
          <div
            className="text-xs"
            style={{ color: currentTheme.textMuted }}
          >
            <span className="mr-4">Ctrl+Enter: Execute</span>
            <span>Esc: Close</span>
          </div>
          <button
            type="button"
            onClick={executeScript}
            className="px-4 py-2 rounded text-sm border transition-colors"
            style={{
              backgroundColor: currentTheme.background,
              borderColor: currentTheme.border,
              color: currentTheme.textPrimary,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.surfaceHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.background;
            }}
          >
            Run Script
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
