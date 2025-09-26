import {
  type ColorSpecification,
  ColorSpecificationSchema,
  MINIMAL_COLOR_SPECIFICATION,
} from "@tokens-studio/tokenscript-interpreter";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ZodError } from "zod";
import { fetchTokenScriptSchema } from "../utils/schema-fetcher";
import MonacoEditor, { jsonEditorOptions, type ValidationError } from "./MonacoEditor";

interface SchemaEditorModalProps {
  onClose: () => void;
  schema: { url: string; spec: ColorSpecification } | null;
  onSave: (url: string, spec: ColorSpecification) => void;
  existingSchemas?: Map<string, ColorSpecification>;
}

export default function SchemaEditorModal({
  onClose,
  schema,
  onSave,
  existingSchemas = new Map(),
}: SchemaEditorModalProps) {
  const [url, setUrl] = useState(schema?.url || "");

  const [schemaJson, setSchemaJson] = useState(
    JSON.stringify(schema?.spec || MINIMAL_COLOR_SPECIFICATION, null, 2),
  );
  const [error, setError] = useState<string>();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [monacoValidationErrors, setMonacoValidationErrors] = useState<ValidationError[]>([]);
  const [fetchState, setFetchState] = useState<
    | { status: "idle" }
    | { status: "loading"; controller: AbortController }
    | { status: "success" }
    | { status: "error"; error: string }
  >({ status: "idle" });
  const uniqueId = useId();

  useEffect(() => {
    return () => {
      if (fetchState.status === "loading") {
        fetchState.controller.abort();
      }
    };
  }, [fetchState]);

  // Helper function to find line/column for a JSON path
  const findJsonPathPosition = useCallback(
    (jsonString: string, path: (string | number)[]): { line: number; column: number } | null => {
      if (path.length === 0) return { line: 1, column: 1 };

      const lines = jsonString.split("\n");
      const _currentPath: (string | number)[] = [];

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const lineNumber = lineIndex + 1;

        // Look for object keys and array indices
        for (const pathPart of path) {
          const keyPattern =
            typeof pathPart === "string"
              ? new RegExp(`"${pathPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:`, "g")
              : null;

          if (keyPattern && typeof pathPart === "string") {
            let match: RegExpExecArray | null;
            while (true) {
              match = keyPattern.exec(line);
              if (match === null) break;
              // Check if this could be our target path
              const beforeMatch = jsonString.substring(
                0,
                jsonString.split("\n").slice(0, lineIndex).join("\n").length +
                  (lineIndex > 0 ? 1 : 0) +
                  match.index,
              );

              // Count braces to approximate nesting level
              const openBraces = (beforeMatch.match(/{/g) || []).length;
              const closeBraces = (beforeMatch.match(/}/g) || []).length;
              const netBraces = openBraces - closeBraces;

              // This is a rough approximation - if we're at the right nesting level
              if (netBraces >= path.length - 1) {
                return { line: lineNumber, column: match.index + 1 };
              }
            }
          }
        }
      }

      // Fallback: return first line if we can't find the exact position
      return { line: 1, column: 1 };
    },
    [],
  );

  // Validate schema JSON in real-time
  const validateSchema = useCallback(
    (jsonString: string): ColorSpecification | null => {
      setValidationErrors([]);
      setMonacoValidationErrors([]);

      if (!jsonString.trim()) {
        const errorMsg = "Schema cannot be empty";
        setValidationErrors([errorMsg]);
        setMonacoValidationErrors([{ message: errorMsg, line: 1, column: 1 }]);
        return null;
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(jsonString);
      } catch (err) {
        const errorMsg = `Invalid JSON: ${err instanceof Error ? err.message : "Unknown error"}`;
        setValidationErrors([errorMsg]);

        // Try to extract line number from JSON parse error
        const lineMatch = err instanceof Error ? err.message.match(/line (\d+)/i) : null;
        const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;

        setMonacoValidationErrors([{ message: errorMsg, line, column: 1 }]);
        return null;
      }

      try {
        return ColorSpecificationSchema.parse(parsedJson);
      } catch (err) {
        if (err instanceof Error && "issues" in err) {
          const zodError = err as ZodError;
          const errors = zodError.issues.map((issue) => {
            const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
            return `${path}${issue.message}`;
          });
          setValidationErrors(errors);

          // Map Zod errors to Monaco validation errors with line/column positions
          const monacoErrors: ValidationError[] = zodError.issues.map((issue) => {
            const position = findJsonPathPosition(jsonString, issue.path);
            const pathStr = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";

            return {
              message: `${pathStr}${issue.message}`,
              path: issue.path.join("."),
              line: position?.line || 1,
              column: position?.column || 1,
            };
          });

          setMonacoValidationErrors(monacoErrors);
        } else {
          const errorMsg = `Schema validation failed: ${err instanceof Error ? err.message : "Unknown error"}`;
          setValidationErrors([errorMsg]);
          setMonacoValidationErrors([{ message: errorMsg, line: 1, column: 1 }]);
        }
        return null;
      }
    },
    [findJsonPathPosition],
  );

  // Validate on schema JSON change
  useEffect(() => {
    if (schemaJson.trim()) {
      validateSchema(schemaJson);
    } else {
      setValidationErrors([]);
    }
  }, [schemaJson, validateSchema]);

  const handleSave = useCallback(() => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("URL is required");
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    // Check for duplicate URLs
    if (existingSchemas.has(trimmedUrl) && schema?.url !== trimmedUrl) {
      const duplicateSpec = existingSchemas.get(trimmedUrl);
      setError(`URL already exists in schema: ${duplicateSpec?.name || trimmedUrl}`);
      return;
    }

    // Validate the schema
    const validatedSpec = validateSchema(schemaJson);
    if (!validatedSpec) {
      setError("Please fix the schema validation errors before saving");
      return;
    }

    onSave(trimmedUrl, validatedSpec);
    onClose();
  }, [url, schemaJson, schema, onSave, onClose, existingSchemas, validateSchema]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        if (validationErrors.length === 0) {
          handleSave();
        }
      } else if (event.key === "Escape") {
        onClose();
      }
    },
    [handleSave, onClose, validationErrors.length],
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
  const handleFetchSchema = async () => {
    if (!url.trim()) {
      setFetchState({ status: "error", error: "Schema URL is required" });
      return;
    }

    const controller = new AbortController();
    setFetchState({ status: "loading", controller });
    setError(undefined);
    setValidationErrors([]);
    setMonacoValidationErrors([]);

    try {
      const resp = await fetchTokenScriptSchema(url.trim(), { signal: controller.signal });
      setSchemaJson(JSON.stringify(resp.content, null, 2));
      setFetchState({ status: "success" });
    } catch (e) {
      if (controller.signal.aborted) {
        setFetchState({ status: "error", error: "Schema fetch aborted" });
      } else {
        setFetchState({ status: "error", error: e instanceof Error ? e.message : String(e) });
      }
    }
  };

  // Stop button
  const handleAbortFetch = () => {
    if (fetchState.status === "loading") {
      fetchState.controller.abort();
    }
  };

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
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col"
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{schema ? "Edit Schema" : "Add New Schema"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
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

        <div className="p-4 border-b space-y-4">
          <div>
            <label
              htmlFor={`${uniqueId}-schema-url`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Schema URL *
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  id={`${uniqueId}-schema-url`}
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://schema.example.com/color/v1/"
                  className="h-10 w-full pr-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                onClick={fetchState.status === "loading" ? handleAbortFetch : handleFetchSchema}
                className={`h-10 px-3 rounded-md text-sm border flex items-center justify-center gap-1 min-w-[80px] ${
                  fetchState.status === "success"
                    ? "bg-green-50 text-green-800 border-green-500"
                    : fetchState.status === "loading"
                      ? "bg-orange-50 text-orange-800 border-orange-500 hover:bg-orange-100"
                      : "bg-blue-50 text-blue-800 border-blue-500 hover:bg-blue-100"
                }`}
                data-testid="fetch-schema-button"
              >
                {fetchState.status === "loading" ? "Stop" : "Fetch"}
              </button>
            </div>
          </div>

          {fetchState.status === "error" && (
            <div
              className="text-red-600 text-sm"
              data-testid="schema-fetch-error"
            >
              {fetchState.error}
            </div>
          )}

          {error && (
            <div
              className="text-red-600 text-sm"
              data-testid="schema-error"
            >
              {error}
            </div>
          )}

          {validationErrors.length > 0 && (
            <div
              className="bg-red-50 border border-red-200 rounded-md p-3"
              data-testid="validation-errors"
            >
              <div className="text-red-800 text-sm font-medium mb-2">Schema Validation Errors:</div>
              <ul className="text-red-700 text-sm space-y-1">
                {validationErrors.map((errorMsg, index) => (
                  <li
                    key={index}
                    className="flex items-start"
                  >
                    <span className="text-red-500 mr-2">•</span>
                    <span>{errorMsg}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex-1 p-4 flex flex-col min-h-[180px] max-h-full overflow-y-auto">
          <span className="block text-sm font-medium text-gray-700 mb-2">Schema JSON</span>
          <div className="h-full flex-1 min-h-[160px] h-full border rounded-md">
            <MonacoEditor
              value={schemaJson}
              onChange={setSchemaJson}
              onKeyDown={handleKeyDown}
              validationErrors={monacoValidationErrors}
              language="json"
              options={jsonEditorOptions}
              disabled={fetchState.status === "loading"}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            data-testid="cancel-button"
            disabled={fetchState.status === "loading"}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={validationErrors.length > 0 || fetchState.status === "loading"}
            className={`px-4 py-2 rounded-md ${
              validationErrors.length > 0 || fetchState.status === "loading"
                ? "bg-gray-400 text-gray-700 cursor-not-allowed"
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
