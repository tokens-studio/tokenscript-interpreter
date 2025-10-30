import { MINIMAL_COLOR_SPECIFICATION } from "@interpreter/config/managers/color/schema";
import type {
  ColorSpecification,
  FunctionSpecification,
} from "@tokens-studio/tokenscript-interpreter";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useSchemaFetch, useSchemaRequirements, useSchemaValidation } from "../../hooks";
import { type ExecutionResult, executeSchemaScript } from "../../utils/executor";
import MonacoEditor, { jsonEditorOptions } from "../MonacoEditor";
import OutputPanel from "../OutputPanel";

interface ScriptEditorTabProps {
  currentParsedSpec: ColorSpecification | FunctionSpecification | null;
  currentScript: string;
  schemaProperties: Record<string, any>;
  requirements: {
    colors: Map<string, ColorSpecification>;
    functions: Map<string, FunctionSpecification>;
  };
  loadingRequirements: boolean;
  scriptResult: ExecutionResult | null;
  onScriptChange: (script: string) => void;
  onInputsChange: (inputs: Record<string, any>) => void;
}

function ScriptEditorTab({
  currentParsedSpec,
  currentScript,
  schemaProperties,
  requirements,
  loadingRequirements,
  scriptResult,
  onScriptChange,
  onInputsChange,
}: ScriptEditorTabProps) {
  const { theme } = useTheme();
  const [scriptInputs, setScriptInputs] = useState<Record<string, any>>({});
  const [colorFormats, setColorFormats] = useState<Record<string, string>>({});

  // Notify parent when inputs change
  useEffect(() => {
    onInputsChange(scriptInputs);
  }, [scriptInputs, onInputsChange]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left panel - Inputs */}
      <div
        className={`w-64 border-r flex flex-col ${
          theme === "dark" ? "border-zinc-800" : "border-gray-200"
        }`}
      >
        <div className={`p-3 border-b ${theme === "dark" ? "border-zinc-800" : "border-gray-200"}`}>
          <h3
            className={`text-sm font-medium ${
              theme === "dark" ? "text-zinc-300" : "text-gray-700"
            }`}
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
                  htmlFor={`script-input-${key}`}
                  className={`block text-sm font-medium mb-1 ${
                    theme === "dark" ? "text-zinc-300" : "text-gray-700"
                  }`}
                >
                  {key}
                  {prop.description && (
                    <span
                      className={`block text-xs font-normal mt-0.5 ${
                        theme === "dark" ? "text-zinc-500" : "text-gray-500"
                      }`}
                    >
                      {prop.description}
                    </span>
                  )}
                </label>
                {prop.type === "number" ? (
                  <input
                    id={`script-input-${key}`}
                    type="number"
                    value={scriptInputs[key] || 0}
                    onChange={(e) =>
                      setScriptInputs((prev) => ({
                        ...prev,
                        [key]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className={`w-full px-2 py-1 text-sm rounded border ${
                      theme === "dark"
                        ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                ) : prop.type === "boolean" ? (
                  <input
                    id={`script-input-${key}`}
                    type="checkbox"
                    checked={scriptInputs[key] || false}
                    onChange={(e) =>
                      setScriptInputs((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                ) : prop.type === "color" ? (
                  <div className="space-y-2">
                    <select
                      value={colorFormats[key] || "hex"}
                      onChange={(e) => {
                        const newFormat = e.target.value;
                        setColorFormats((prev) => ({
                          ...prev,
                          [key]: newFormat,
                        }));
                        if (newFormat === "hex") {
                          setScriptInputs((prev) => ({
                            ...prev,
                            [key]: "#ff0000",
                          }));
                        } else if (newFormat === "rgb") {
                          setScriptInputs((prev) => ({
                            ...prev,
                            [key]: { r: 255, g: 0, b: 0 },
                          }));
                        } else if (newFormat === "hsl") {
                          setScriptInputs((prev) => ({
                            ...prev,
                            [key]: { h: 0, s: 100, l: 50 },
                          }));
                        }
                      }}
                      className={`w-full text-xs px-2 py-1 rounded border ${
                        theme === "dark"
                          ? "bg-zinc-800 border-zinc-700 text-zinc-300"
                          : "bg-white border-gray-300 text-gray-700"
                      }`}
                    >
                      <option value="hex">Hex</option>
                      <option value="rgb">RGB</option>
                      <option value="hsl">HSL</option>
                    </select>

                    {colorFormats[key] === "hex" || !colorFormats[key] ? (
                      <>
                        <input
                          type="color"
                          value={scriptInputs[key] || "#ff0000"}
                          onChange={(e) =>
                            setScriptInputs((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          className="w-full h-10 rounded border cursor-pointer"
                          style={{
                            borderColor: theme === "dark" ? "#3f3f46" : "#d1d5db",
                          }}
                        />
                        <input
                          type="text"
                          value={scriptInputs[key] || "#ff0000"}
                          onChange={(e) =>
                            setScriptInputs((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder="#ff0000"
                          className={`w-full px-2 py-1 text-sm font-mono rounded border ${
                            theme === "dark"
                              ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                              : "bg-white border-gray-300 text-gray-900"
                          }`}
                        />
                      </>
                    ) : colorFormats[key] === "rgb" ? (
                      <div className="grid grid-cols-3 gap-2">
                        {["r", "g", "b"].map((channel) => (
                          <div key={channel}>
                            <label
                              htmlFor={`script-input-${key}-${channel}`}
                              className={`text-xs ${
                                theme === "dark" ? "text-zinc-500" : "text-gray-500"
                              }`}
                            >
                              {channel.toUpperCase()}
                            </label>
                            <input
                              id={`script-input-${key}-${channel}`}
                              type="number"
                              min="0"
                              max="255"
                              value={scriptInputs[key]?.[channel] || 0}
                              onChange={(e) =>
                                setScriptInputs((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key],
                                    [channel]: parseFloat(e.target.value) || 0,
                                  },
                                }))
                              }
                              className={`w-full px-2 py-1 text-sm rounded border ${
                                theme === "dark"
                                  ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                                  : "bg-white border-gray-300 text-gray-900"
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: "h", label: "H", min: 0, max: 360 },
                          { key: "s", label: "S", min: 0, max: 100 },
                          { key: "l", label: "L", min: 0, max: 100 },
                        ].map((channel) => (
                          <div key={channel.key}>
                            <label
                              htmlFor={`script-input-${key}-${channel.key}`}
                              className={`text-xs ${
                                theme === "dark" ? "text-zinc-500" : "text-gray-500"
                              }`}
                            >
                              {channel.label}
                            </label>
                            <input
                              id={`script-input-${key}-${channel.key}`}
                              type="number"
                              min={channel.min}
                              max={channel.max}
                              value={scriptInputs[key]?.[channel.key] || 0}
                              onChange={(e) =>
                                setScriptInputs((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key],
                                    [channel.key]: parseFloat(e.target.value) || 0,
                                  },
                                }))
                              }
                              className={`w-full px-2 py-1 text-sm rounded border ${
                                theme === "dark"
                                  ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                                  : "bg-white border-gray-300 text-gray-900"
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    id={`script-input-${key}`}
                    type="text"
                    value={scriptInputs[key] || ""}
                    onChange={(e) =>
                      setScriptInputs((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    className={`w-full px-2 py-1 text-sm rounded border ${
                      theme === "dark"
                        ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                )}
              </div>
            );
          })}
          {Object.keys(schemaProperties).length === 0 && (
            <div
              className={`text-sm text-center py-8 ${
                theme === "dark" ? "text-zinc-500" : "text-gray-500"
              }`}
            >
              No input fields defined
            </div>
          )}
        </div>

        {/* Requirements */}
        {currentParsedSpec?.requirements && currentParsedSpec.requirements.length > 0 && (
          <>
            <div
              className={`p-3 border-t border-b ${
                theme === "dark" ? "border-zinc-800" : "border-gray-200"
              }`}
            >
              <h3
                className={`text-sm font-medium ${
                  theme === "dark" ? "text-zinc-300" : "text-gray-700"
                }`}
              >
                Requirements
              </h3>
            </div>
            <div className="p-3 space-y-2 max-h-48 overflow-auto">
              {loadingRequirements ? (
                <div
                  className={`flex items-center gap-2 text-xs ${
                    theme === "dark" ? "text-zinc-500" : "text-gray-500"
                  }`}
                >
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                currentParsedSpec.requirements.map((reqUrl) => (
                  <div
                    key={reqUrl}
                    className={`text-xs truncate font-mono ${
                      theme === "dark" ? "text-zinc-500" : "text-gray-500"
                    }`}
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
        <div className={`p-3 border-b ${theme === "dark" ? "border-zinc-800" : "border-gray-200"}`}>
          <h3
            className={`text-sm font-medium ${
              theme === "dark" ? "text-zinc-300" : "text-gray-700"
            }`}
          >
            TokenScript
          </h3>
        </div>
        <div className="flex-1 overflow-hidden">
          <MonacoEditor
            value={currentScript}
            onChange={onScriptChange}
            language="tokenscript"
            theme={theme === "dark" ? "tokenscript-theme-dark" : "tokenscript-theme-light"}
            error={scriptResult?.errorInfo}
          />
        </div>
      </div>

      {/* Right panel - Output */}
      <div
        className={`w-96 border-l flex flex-col ${
          theme === "dark" ? "border-zinc-800" : "border-gray-200"
        }`}
      >
        <div className={`p-3 border-b ${theme === "dark" ? "border-zinc-800" : "border-gray-200"}`}>
          <h3
            className={`text-sm font-medium ${
              theme === "dark" ? "text-zinc-300" : "text-gray-700"
            }`}
          >
            Output
          </h3>
        </div>
        <div className="flex-1 overflow-hidden">
          {scriptResult ? (
            <OutputPanel result={scriptResult} />
          ) : (
            <div
              className={`flex items-center justify-center h-full ${
                theme === "dark" ? "text-zinc-500" : "text-gray-500"
              }`}
            >
              <p className="text-sm">No output yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SchemaEditorModalProps {
  onClose: () => void;
  schema: {
    url: string;
    spec: ColorSpecification | FunctionSpecification;
    type: "color" | "function";
  } | null;
  onSave: (
    url: string,
    spec: ColorSpecification | FunctionSpecification,
    type: "color" | "function",
  ) => void;
  existingSchemas?: Map<string, ColorSpecification | FunctionSpecification>;
}

export default function SchemaEditorModal({
  onClose,
  schema,
  onSave,
  existingSchemas = new Map(),
}: SchemaEditorModalProps) {
  const { theme } = useTheme();
  const [url, setUrl] = useState<string | undefined>(schema?.url);

  const defaultSpec = schema?.spec || MINIMAL_COLOR_SPECIFICATION;
  const [schemaJson, setSchemaJson] = useState(JSON.stringify(defaultSpec, null, 2));
  type ErrorType = "empty" | "invalid" | "duplicate";
  type SchemaEditorError = { type: ErrorType; message: string } | undefined;
  const [error, setError] = useState<SchemaEditorError>();

  const { fetchState, fetchSchema, abortFetch } = useSchemaFetch();
  const { validationErrors, validateSchema, setValidationErrors } = useSchemaValidation();
  const { requirements, loading: loadingRequirements, loadRequirements } = useSchemaRequirements();

  const uniqueId = useId();
  const [activeTab, setActiveTab] = useState<"json" | "script">("json");
  const [selectedConversionIndex, setSelectedConversionIndex] = useState(0);

  // Parse the current schema JSON to get the spec
  const currentParsedSpec = useMemo(() => {
    try {
      return JSON.parse(schemaJson) as ColorSpecification | FunctionSpecification;
    } catch {
      return null;
    }
  }, [schemaJson]);

  // Get conversions from the current parsed spec
  const conversions = useMemo(() => {
    if (!currentParsedSpec || !("conversions" in currentParsedSpec)) return [];
    return currentParsedSpec.conversions || [];
  }, [currentParsedSpec]);

  // Check if this is a function schema with a script
  const hasFunction = useMemo(() => {
    if (!currentParsedSpec || currentParsedSpec.type !== "function") return false;
    const funcSpec = currentParsedSpec as FunctionSpecification;
    return !!funcSpec.script?.script;
  }, [currentParsedSpec]);

  // Check if we can show the script editor tab
  const canShowScriptEditor = conversions.length > 0 || hasFunction;

  // Script editor state
  const [scriptInputs, setScriptInputs] = useState<Record<string, any>>({});
  const [scriptResult, setScriptResult] = useState<ExecutionResult | null>(null);

  // Get the current script to edit
  const currentScript = useMemo(() => {
    if (!currentParsedSpec) return "";

    if (currentParsedSpec.type === "function") {
      const funcSpec = currentParsedSpec as FunctionSpecification;
      return funcSpec.script?.script || "";
    }

    if ("conversions" in currentParsedSpec && Array.isArray(currentParsedSpec.conversions)) {
      const conversion = currentParsedSpec.conversions[selectedConversionIndex];
      return conversion?.script?.script || "";
    }

    return "";
  }, [currentParsedSpec, selectedConversionIndex]);

  // Handle script changes and update the schema JSON
  const handleScriptChange = useCallback(
    (newScript: string) => {
      if (!currentParsedSpec) return;

      try {
        const updatedSpec = JSON.parse(schemaJson);

        if (updatedSpec.type === "function") {
          // Update function script
          if (!updatedSpec.script) {
            updatedSpec.script = {
              type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
              script: newScript,
            };
          } else {
            updatedSpec.script.script = newScript;
          }
        } else if (updatedSpec.conversions && Array.isArray(updatedSpec.conversions)) {
          // Update conversion script
          if (updatedSpec.conversions[selectedConversionIndex]) {
            if (!updatedSpec.conversions[selectedConversionIndex].script) {
              updatedSpec.conversions[selectedConversionIndex].script = {
                type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
                script: newScript,
              };
            } else {
              updatedSpec.conversions[selectedConversionIndex].script.script = newScript;
            }
          }
        }

        setSchemaJson(JSON.stringify(updatedSpec, null, 2));
      } catch (err) {
        console.error("Failed to update script:", err);
      }
    },
    [schemaJson, currentParsedSpec, selectedConversionIndex],
  );

  // Extract schema properties for inputs
  const schemaProperties = useMemo(() => {
    if (!currentParsedSpec) return {};

    if (currentParsedSpec.type === "function") {
      const funcSpec = currentParsedSpec as FunctionSpecification;
      if (funcSpec.input && funcSpec.input.type === "object") {
        return funcSpec.input.properties || {};
      }
      return {};
    }

    if (currentParsedSpec.type === "color") {
      const colorSchema = currentParsedSpec as ColorSpecification;
      if (colorSchema.schema && colorSchema.schema.type === "object") {
        return colorSchema.schema.properties || {};
      }
    }

    return {};
  }, [currentParsedSpec]);

  // Load requirements when switching to script tab
  useEffect(() => {
    if (activeTab === "script") {
      loadRequirements(currentParsedSpec?.requirements);
    }
  }, [currentParsedSpec?.requirements, activeTab, loadRequirements]);

  // Handle script inputs change
  const handleInputsChange = useCallback((inputs: Record<string, any>) => {
    setScriptInputs(inputs);
  }, []);

  // Execute script (using current script value which updates with editor changes)
  const executeScript = useCallback(async () => {
    if (!currentScript.trim()) {
      setScriptResult(null);
      return;
    }

    const editorMode = currentParsedSpec?.type === "function" ? "function" : "conversion";

    // Get color formats from inputs
    const colorFormats: Record<string, string> = {};
    Object.entries(schemaProperties).forEach(([key, propSchema]) => {
      const prop = propSchema as any;
      if (prop.type === "color") {
        const value = scriptInputs[key];
        if (typeof value === "string") {
          colorFormats[key] = "hex";
        } else if (value && "r" in value) {
          colorFormats[key] = "rgb";
        } else if (value && "h" in value) {
          colorFormats[key] = "hsl";
        }
      }
    });

    const result = await executeSchemaScript({
      script: currentScript,
      inputs: scriptInputs,
      schemaProperties,
      colorFormats,
      requirements,
      editorMode,
    });

    setScriptResult(result);
  }, [currentScript, scriptInputs, requirements, currentParsedSpec, schemaProperties]);

  // Auto-execute on script or input change
  useEffect(() => {
    if (activeTab === "script") {
      executeScript();
    }
  }, [activeTab, executeScript]);

  // Validate on schema JSON change
  useEffect(() => {
    if (schemaJson.trim()) {
      validateSchema(schemaJson);
    } else {
      setValidationErrors([]);
    }
  }, [schemaJson, validateSchema]);

  // Validate URL when it changes
  useEffect(() => {
    if (url === undefined) return;

    const trimmedUrl = (url as string).trim();

    if (url === "") {
      setError({ type: "empty", message: "URL is required" });
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl);
    } catch {
      setError({ type: "invalid", message: "Please enter a valid URL" });
      return;
    }

    // Check for duplicate URLs
    if (existingSchemas.has(trimmedUrl) && schema?.url !== trimmedUrl) {
      const duplicateSpec = existingSchemas.get(trimmedUrl);
      setError({
        type: "duplicate",
        message: `URL already exists in schema: ${duplicateSpec?.name || trimmedUrl}`,
      });
      return;
    }

    setError(undefined);
  }, [url, existingSchemas, schema?.url]);

  const handleSave = useCallback(() => {
    if (error || validationErrors.length > 0) return;
    if (!url) return;

    const trimmedUrl = url.trim();
    const validatedSpec = validateSchema(schemaJson);
    if (!validatedSpec) {
      return;
    }

    // Determine schema type from the validated spec
    const schemaType = validatedSpec.type === "function" ? "function" : "color";
    onSave(trimmedUrl, validatedSpec, schemaType);
    onClose();
  }, [error, validationErrors.length, url, schemaJson, onSave, onClose, validateSchema]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        if (!error && validationErrors.length === 0) {
          handleSave();
        }
      } else if (event.key === "Escape") {
        onClose();
      }
    },
    [handleSave, onClose, error, validationErrors.length],
  );

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  // Listen for Esc and background click via <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  // Fetch from schema url
  const handleFetchSchema = useCallback(async () => {
    if (!url) return;
    setError(undefined);
    setValidationErrors([]);

    const content = await fetchSchema(url);
    if (content) {
      setSchemaJson(JSON.stringify(content, null, 2));
    }
  }, [url, fetchSchema, setValidationErrors]);

  return createPortal(
    <dialog
      ref={dialogRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        // Only trigger on Enter or Space for accessibility
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="modal m-0 h-screen w-screen bg-black/60 p-0 max-w-none max-h-none border-none outline-none z-50 flex items-center justify-center"
      aria-modal="true"
    >
      <div
        className={`${
          theme === "dark" ? "bg-zinc-900" : "bg-white"
        } rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col`}
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        tabIndex={-1}
        aria-hidden="true"
      >
        <div
          className={`flex items-center justify-between p-4 border-b ${
            theme === "dark" ? "border-zinc-800" : "border-gray-200"
          }`}
        >
          <h2
            className={`text-lg font-semibold ${
              theme === "dark" ? "text-zinc-100" : "text-gray-900"
            }`}
          >
            {schema ? "Edit Schema" : "Add New Schema"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`${
              theme === "dark"
                ? "text-zinc-400 hover:text-zinc-300"
                : "text-gray-400 hover:text-gray-600"
            }`}
            data-testid="close-modal"
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

        <div
          className={`p-4 border-b ${
            theme === "dark" ? "border-zinc-800" : "border-gray-200"
          } space-y-4`}
        >
          <div>
            <label
              htmlFor={`${uniqueId}-schema-url`}
              className={`block text-sm font-medium mb-1 ${
                theme === "dark" ? "text-zinc-300" : "text-gray-700"
              }`}
            >
              Schema URL *
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  id={`${uniqueId}-schema-url`}
                  type="text"
                  value={url || ""}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://schema.example.com/color/v1/"
                  className={`h-10 w-full pr-10 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === "dark"
                      ? "bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500"
                      : "bg-white border border-gray-300 text-gray-900 placeholder-gray-400"
                  }`}
                  data-testid="schema-url-input"
                  disabled={fetchState.status === "loading"}
                />
                {fetchState.status === "success" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600 pointer-events-none">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={fetchState.status === "loading" ? abortFetch : handleFetchSchema}
                className={`h-10 px-3 rounded-md text-sm border flex items-center justify-center gap-1 min-w-[80px] ${
                  url === undefined ||
                  url === "" ||
                  error?.type === "empty" ||
                  error?.type === "invalid" ||
                  fetchState.status === "loading"
                    ? theme === "dark"
                      ? "bg-zinc-700 text-zinc-500 border-zinc-600 cursor-not-allowed"
                      : "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
                    : fetchState.status === "success"
                      ? theme === "dark"
                        ? "bg-green-900 text-green-300 border-green-600"
                        : "bg-green-50 text-green-800 border-green-500"
                      : fetchState.status === "loading"
                        ? theme === "dark"
                          ? "bg-orange-900 text-orange-300 border-orange-600 hover:bg-orange-800"
                          : "bg-orange-50 text-orange-800 border-orange-500 hover:bg-orange-100"
                        : theme === "dark"
                          ? "bg-blue-900 text-blue-300 border-blue-600 hover:bg-blue-800"
                          : "bg-blue-50 text-blue-800 border-blue-500 hover:bg-blue-100"
                }`}
                data-testid="fetch-schema-button"
                disabled={
                  url === undefined ||
                  url === "" ||
                  error?.type === "empty" ||
                  error?.type === "invalid" ||
                  fetchState.status === "loading"
                }
              >
                {fetchState.status === "loading" ? "Stop" : "Fetch"}
              </button>
            </div>
          </div>

          {fetchState.status === "error" && (
            <div
              className={`text-sm ${theme === "dark" ? "text-red-400" : "text-red-600"}`}
              data-testid="schema-fetch-error"
            >
              {fetchState.error}
            </div>
          )}

          {error && (
            <div
              className={`text-sm ${theme === "dark" ? "text-red-400" : "text-red-600"}`}
              data-testid="schema-error"
            >
              {error.message}
            </div>
          )}

          {validationErrors.length > 0 && (
            <div
              className={`rounded-md p-3 ${
                theme === "dark"
                  ? "bg-red-950 border border-red-800"
                  : "bg-red-50 border border-red-200"
              }`}
              data-testid="validation-errors"
            >
              <div
                className={`text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-red-300" : "text-red-800"
                }`}
              >
                Schema Validation Errors:
              </div>
              <ul
                className={`text-sm space-y-1 ${
                  theme === "dark" ? "text-red-400" : "text-red-700"
                }`}
              >
                {validationErrors.map((error, index) => (
                  <li
                    key={index}
                    className="flex items-start"
                  >
                    <span className={`mr-2 ${theme === "dark" ? "text-red-500" : "text-red-500"}`}>
                      •
                    </span>
                    <span>{error.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-h-[180px] overflow-hidden">
          {/* Tabs */}
          {canShowScriptEditor && (
            <div
              className={`flex border-b ${
                theme === "dark" ? "border-zinc-800" : "border-gray-200"
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTab("json")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "json"
                    ? theme === "dark"
                      ? "text-blue-400 border-b-2 border-blue-400"
                      : "text-blue-600 border-b-2 border-blue-600"
                    : theme === "dark"
                      ? "text-zinc-400 hover:text-zinc-300"
                      : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Schema JSON
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("script")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "script"
                    ? theme === "dark"
                      ? "text-blue-400 border-b-2 border-blue-400"
                      : "text-blue-600 border-b-2 border-blue-600"
                    : theme === "dark"
                      ? "text-zinc-400 hover:text-zinc-300"
                      : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <svg
                  className="w-4 h-4 inline mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
                Script Editor
              </button>
            </div>
          )}

          {/* JSON Tab */}
          {activeTab === "json" && (
            <div className="flex-1 p-4 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`block text-sm font-medium ${
                    theme === "dark" ? "text-zinc-300" : "text-gray-700"
                  }`}
                >
                  Schema JSON
                </span>

                {/* Show conversion selector for color schemas with conversions */}
                {conversions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs ${theme === "dark" ? "text-zinc-400" : "text-gray-600"}`}
                    >
                      {conversions.length} conversion
                      {conversions.length > 1 ? "s" : ""}
                    </span>
                    <select
                      value={selectedConversionIndex}
                      onChange={(e) => setSelectedConversionIndex(Number(e.target.value))}
                      className={`text-xs px-2 py-1 rounded border ${
                        theme === "dark"
                          ? "bg-zinc-800 border-zinc-700 text-zinc-300"
                          : "bg-white border-gray-300 text-gray-700"
                      }`}
                    >
                      {conversions.map((conv: any, idx: number) => (
                        <option
                          key={idx}
                          value={idx}
                        >
                          {conv.description || `Conversion ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div
                className={`flex-1 border rounded-md overflow-hidden ${
                  theme === "dark" ? "border-zinc-700" : "border-gray-300"
                }`}
              >
                <MonacoEditor
                  value={schemaJson}
                  onChange={setSchemaJson}
                  onKeyDown={handleKeyDown}
                  validationErrors={validationErrors}
                  language="json"
                  theme={theme === "dark" ? "tokenscript-theme-dark" : "tokenscript-theme-light"}
                  options={jsonEditorOptions}
                  disabled={fetchState.status === "loading"}
                />
              </div>
            </div>
          )}

          {/* Script Tab */}
          {activeTab === "script" && (
            <ScriptEditorTab
              currentParsedSpec={currentParsedSpec}
              currentScript={currentScript}
              schemaProperties={schemaProperties}
              requirements={requirements}
              loadingRequirements={loadingRequirements}
              scriptResult={scriptResult}
              onScriptChange={handleScriptChange}
              onInputsChange={handleInputsChange}
            />
          )}
        </div>

        <div
          className={`flex items-center justify-end gap-3 p-4 border-t ${
            theme === "dark" ? "border-zinc-800" : "border-gray-200"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 border rounded-md ${
              theme === "dark"
                ? "text-zinc-300 border-zinc-600 hover:bg-zinc-800"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
            data-testid="cancel-button"
            disabled={fetchState.status === "loading"}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!!error || validationErrors.length > 0 || fetchState.status === "loading"}
            className={`px-4 py-2 rounded-md ${
              !!error || validationErrors.length > 0 || fetchState.status === "loading"
                ? theme === "dark"
                  ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                  : "bg-gray-400 text-gray-700 cursor-not-allowed"
                : theme === "dark"
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            data-testid="save-button"
          >
            Save Schema (Ctrl+S)
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
