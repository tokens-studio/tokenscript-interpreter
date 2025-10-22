import type {
  ColorSpecification,
  FunctionSpecification,
} from "@tokens-studio/tokenscript-interpreter";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { getTheme } from "../theme/colors";
import { fetchTokenScriptSchema } from "../utils/schema-fetcher";

interface SchemaOption {
  id: string;
  name: string;
  url: string;
  description?: string;
  type?: string;
}

interface SchemaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSchemaSelect: (
    url: string,
    spec: ColorSpecification | FunctionSpecification,
    type?: "color" | "function",
  ) => void;
  onCreateCustom: () => void;
  onRestoreDefaults?: () => void;
  onClearAllSchemas?: () => void;
  existingColorSchemas?: Map<string, ColorSpecification>;
  existingFunctionSchemas?: Map<string, FunctionSpecification>;
}

export default function SchemaDialog({
  isOpen,
  onClose,
  onSchemaSelect,
  onCreateCustom,
  onRestoreDefaults,
  onClearAllSchemas,
  existingColorSchemas = new Map(),
  existingFunctionSchemas = new Map(),
}: SchemaDialogProps) {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  const [inputValue, setInputValue] = useState("");
  const [availableSchemas, setAvailableSchemas] = useState<SchemaOption[]>([]);
  const [groupedSchemas, setGroupedSchemas] = useState<Record<string, SchemaOption[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchAvailableSchemas = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/?format=json",
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch schemas: ${response.status}`);
      }

      const data = await response.json();
      const schemas: SchemaOption[] = Array.isArray(data)
        ? data.map((item: any) => ({
            id: item.id || "",
            name: item.name || "Unnamed Schema",
            url:
              item.latest && item.slug
                ? `https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/${item.slug}/${item.latest.version}/`
                : "",
            description: item.description || "",
            type: item.type || "unknown",
          }))
        : [];

      setAvailableSchemas(schemas);
    } catch (err) {
      console.error("Failed to fetch schemas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let schemasToProcess = availableSchemas;

    if (inputValue.trim()) {
      schemasToProcess = availableSchemas.filter(
        (schema) =>
          schema.name.toLowerCase().includes(inputValue.toLowerCase()) ||
          schema.description?.toLowerCase().includes(inputValue.toLowerCase()),
      );
    }

    const grouped = schemasToProcess.reduce(
      (acc, schema) => {
        const type = schema.type || "unknown";
        const groupName =
          type === "type"
            ? "Color Schemas"
            : type === "function"
              ? "Function Schemas"
              : `${type.charAt(0).toUpperCase() + type.slice(1)} Schemas`;

        if (!acc[groupName]) {
          acc[groupName] = [];
        }
        acc[groupName].push(schema);
        return acc;
      },
      {} as Record<string, SchemaOption[]>,
    );

    setGroupedSchemas(grouped);
    setSelectedIndex(0);
  }, [inputValue, availableSchemas]);

  useEffect(() => {
    if (isOpen && availableSchemas.length === 0) {
      fetchAvailableSchemas();
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, availableSchemas.length, fetchAvailableSchemas]);

  useEffect(() => {
    if (isOpen) {
      setInputValue("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const handleSchemaSelect = useCallback(
    async (schema: SchemaOption) => {
      try {
        setLoading(true);
        const response = await fetchTokenScriptSchema(schema.url);
        const schemaType = schema.type === "function" ? "function" : "color";
        onSchemaSelect(schema.url, response.content, schemaType);
        onClose();
      } catch (err) {
        console.error("Failed to fetch schema content:", err);
      } finally {
        setLoading(false);
      }
    },
    [onSchemaSelect, onClose],
  );

  const handleCreateCustom = useCallback(() => {
    onCreateCustom();
    onClose();
  }, [onCreateCustom, onClose]);

  const handleRestoreDefaults = useCallback(() => {
    if (onRestoreDefaults) {
      onRestoreDefaults();
      onClose();
    }
  }, [onRestoreDefaults, onClose]);

  const handleClearAllSchemas = useCallback(() => {
    if (onClearAllSchemas) {
      onClearAllSchemas();
      onClose();
    }
  }, [onClearAllSchemas, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }

    // Get all schemas in order
    const orderedGroups = ["Color Schemas", "Function Schemas"];
    const otherGroups = Object.keys(groupedSchemas)
      .filter((group) => !orderedGroups.includes(group))
      .sort();
    const allGroups = [...orderedGroups.filter((group) => groupedSchemas[group]), ...otherGroups];

    let allSchemas: SchemaOption[] = [];
    allGroups.forEach((group) => {
      allSchemas = allSchemas.concat(groupedSchemas[group] || []);
    });

    // Add action options first
    const actionOptions: any[] = [
      { id: "create-custom", name: "Create custom schema..." },
    ];
    if (onRestoreDefaults) {
      actionOptions.push({ id: "restore-defaults", name: "Restore defaults" });
    }
    if (onClearAllSchemas) {
      actionOptions.push({ id: "clear-all-schemas", name: "Clear all schemas" });
    }
    const allOptions = [...actionOptions, ...allSchemas];

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allOptions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allOptions.length) % allOptions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = allOptions[selectedIndex];
      if (selected?.id === "create-custom") {
        handleCreateCustom();
      } else if (selected?.id === "restore-defaults") {
        handleRestoreDefaults();
      } else if (selected?.id === "clear-all-schemas") {
        handleClearAllSchemas();
      } else if (selected) {
        handleSchemaSelect(selected);
      }
    }
  };

  if (!isOpen) return null;

  const orderedGroups = ["Color Schemas", "Function Schemas"];
  const otherGroups = Object.keys(groupedSchemas)
    .filter((group) => !orderedGroups.includes(group))
    .sort();
  const allGroups = [...orderedGroups.filter((group) => groupedSchemas[group]), ...otherGroups];

  let allSchemas: SchemaOption[] = [];
  allGroups.forEach((group) => {
    allSchemas = allSchemas.concat(groupedSchemas[group] || []);
  });

  const actionOptions: any[] = [
    { id: "create-custom", name: "Create custom schema..." },
  ];
  if (onRestoreDefaults) {
    actionOptions.push({ id: "restore-defaults", name: "Restore defaults" });
  }
  if (onClearAllSchemas) {
    actionOptions.push({ id: "clear-all-schemas", name: "Clear all schemas" });
  }
  const allOptions = [...actionOptions, ...allSchemas];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          className="w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
          style={{
            backgroundColor: currentTheme.surface,
            borderColor: currentTheme.border,
            height: '100vh',
            maxHeight: '900px',
          }}
        >
          {/* Search Input */}
          <div
            className="border-b p-4"
            style={{ borderColor: currentTheme.border }}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Search or create schemas..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2 text-base rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50"
              style={{
                backgroundColor: currentTheme.background,
                color: currentTheme.textPrimary,
                borderColor: currentTheme.border,
              }}
            />
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div
                className="flex items-center justify-center h-full gap-2"
                style={{ color: currentTheme.textMuted }}
              >
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Loading schemas...</span>
              </div>
            ) : allOptions.length === 0 ? (
              <div
                className="flex items-center justify-center h-full"
                style={{ color: currentTheme.textMuted }}
              >
                {inputValue ? "No schemas found" : "No schemas available"}
              </div>
            ) : (
              <div>
                {/* Create custom option */}
                <div
                  className="px-4 py-2 cursor-pointer transition-colors"
                  style={{
                    backgroundColor: selectedIndex === 0 ? currentTheme.surfaceHover : "transparent",
                    color: currentTheme.textPrimary,
                  }}
                  onClick={() => handleCreateCustom()}
                  onMouseEnter={() => setSelectedIndex(0)}
                >
                  <div className="flex items-center gap-2 py-2">
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: currentTheme.textMuted }}
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
                    <span>Create custom schema...</span>
                  </div>
                </div>

                {/* Restore defaults option */}
                {onRestoreDefaults && (
                  <div
                    className="px-4 py-2 cursor-pointer transition-colors border-b"
                    style={{
                      backgroundColor: selectedIndex === 1 ? currentTheme.surfaceHover : "transparent",
                      color: currentTheme.textPrimary,
                      borderColor: currentTheme.border,
                    }}
                    onClick={() => handleRestoreDefaults()}
                    onMouseEnter={() => setSelectedIndex(1)}
                  >
                    <div className="flex items-center gap-2 py-2">
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: currentTheme.textMuted }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span>Restore defaults</span>
                    </div>
                  </div>
                )}

                {/* Clear all schemas option */}
                {onClearAllSchemas && (
                  <div
                    className="px-4 py-2 cursor-pointer transition-colors border-b"
                    style={{
                      backgroundColor: selectedIndex === 2 ? currentTheme.surfaceHover : "transparent",
                      color: currentTheme.textPrimary,
                      borderColor: currentTheme.border,
                    }}
                    onClick={() => handleClearAllSchemas()}
                    onMouseEnter={() => setSelectedIndex(2)}
                  >
                    <div className="flex items-center gap-2 py-2">
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: currentTheme.error }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span>Clear all schemas</span>
                    </div>
                  </div>
                )}

                {/* Schema groups */}
                {allGroups.map((groupName) => {
                  const groupSchemas = groupedSchemas[groupName];
                  if (!groupSchemas || groupSchemas.length === 0) return null;

                  return (
                    <div key={groupName}>
                      <div
                        className="px-4 py-2 text-xs font-medium uppercase tracking-wide sticky top-0"
                        style={{
                          color: currentTheme.textMuted,
                          backgroundColor: currentTheme.surface,
                        }}
                      >
                        {groupName}
                      </div>
                      {groupSchemas.map((schema, idx) => {
                        const actionOptionsCount = actionOptions.length;
                        const optionIndex = actionOptionsCount + allSchemas.indexOf(schema);
                        const isDownloaded =
                          schema.type === "function"
                            ? existingFunctionSchemas.has(schema.url)
                            : existingColorSchemas.has(schema.url);

                        return (
                          <div
                            key={schema.id}
                            className="px-4 py-3 cursor-pointer transition-colors border-b"
                            style={{
                              backgroundColor:
                                selectedIndex === optionIndex
                                  ? currentTheme.surfaceHover
                                  : "transparent",
                              borderColor: currentTheme.border,
                            }}
                            onClick={() => handleSchemaSelect(schema)}
                            onMouseEnter={() => setSelectedIndex(optionIndex)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div
                                  className="font-medium text-sm"
                                  style={{ color: currentTheme.textPrimary }}
                                >
                                  {schema.name}
                                </div>
                                {schema.description && (
                                  <div
                                    className="text-xs mt-1"
                                    style={{ color: currentTheme.textMuted }}
                                  >
                                    {schema.description}
                                  </div>
                                )}
                                <div
                                  className="text-xs mt-1 truncate font-mono"
                                  style={{ color: currentTheme.textMuted }}
                                  title={schema.url}
                                >
                                  {schema.url}
                                </div>
                              </div>
                              {isDownloaded && (
                                <div className="flex-shrink-0 mt-0.5">
                                  <svg
                                    className="w-4 h-4 text-emerald-500"
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
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div
            className="border-t px-4 py-2 text-xs text-center"
            style={{
              borderColor: currentTheme.border,
              color: currentTheme.textMuted,
            }}
          >
            <span className="mr-2">↑↓ Navigate</span>
            <span className="mr-2">↵ Select</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </>
  );
}
