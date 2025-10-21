import type {
  ColorSpecification,
  FunctionSpecification,
} from "@tokens-studio/tokenscript-interpreter";
import { useCallback, useEffect, useState } from "react";
import {
  Button,
  ComboBox,
  Header,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Popover,
  Separator,
} from "react-aria-components";
import { fetchTokenScriptSchema } from "../utils/schema-fetcher";

interface SchemaOption {
  id: string;
  name: string;
  url: string;
  description?: string;
  type?: string;
}

interface SchemaComboboxProps {
  onSchemaSelect: (
    url: string,
    spec: ColorSpecification | FunctionSpecification,
    type?: "color" | "function",
  ) => void;
  onCreateCustom: () => void;
  onRestoreDefaults?: () => void;
  onClearAllSchemas?: () => void;
  placeholder?: string;
  existingColorSchemas?: Map<string, ColorSpecification>;
  existingFunctionSchemas?: Map<string, FunctionSpecification>;
}

export default function SchemaCombobox({
  onSchemaSelect,
  onCreateCustom,
  onRestoreDefaults,
  onClearAllSchemas,
  placeholder = "Add schema...",
  existingColorSchemas = new Map(),
  existingFunctionSchemas = new Map(),
}: SchemaComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [availableSchemas, setAvailableSchemas] = useState<SchemaOption[]>([]);
  const [_filteredSchemas, setFilteredSchemas] = useState<SchemaOption[]>([]);
  const [groupedSchemas, setGroupedSchemas] = useState<Record<string, SchemaOption[]>>({});
  const [loading, setLoading] = useState(false);

  // Get the first available item to focus
  const getFirstFocusableKey = useCallback(() => {
    // Always focus "create-custom" first if it exists, otherwise focus first schema
    return "create-custom";
  }, []);

  // Fetch available schemas from API
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
      // console.log("Fetched schemas:", data);

      // Transform the API response to our schema format
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
      setFilteredSchemas(schemas);
    } catch (err) {
      console.error("Failed to fetch schemas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Group and filter schemas based on input
  useEffect(() => {
    let schemasToProcess = availableSchemas;

    // Filter by input if provided
    if (inputValue.trim()) {
      schemasToProcess = availableSchemas.filter(
        (schema) =>
          schema.name.toLowerCase().includes(inputValue.toLowerCase()) ||
          schema.description?.toLowerCase().includes(inputValue.toLowerCase()),
      );
    }

    // Group by type
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

    setFilteredSchemas(schemasToProcess);
    setGroupedSchemas(grouped);
  }, [inputValue, availableSchemas]);

  // Fetch schemas when combobox opens
  useEffect(() => {
    if (isOpen && availableSchemas.length === 0) {
      fetchAvailableSchemas();
    }
  }, [isOpen, availableSchemas.length, fetchAvailableSchemas]);

  const handleSchemaSelect = useCallback(
    async (schemaId: string) => {
      const schema = availableSchemas.find((s) => s.id === schemaId);
      if (!schema || !schema.url) return;

      try {
        setLoading(true);
        const response = await fetchTokenScriptSchema(schema.url);
        const schemaType = schema.type === "function" ? "function" : "color";
        onSchemaSelect(schema.url, response.content, schemaType);
        setIsOpen(false);
        // Don't clear input value - keep it as is
      } catch (err) {
        console.error("Failed to fetch schema content:", err);
      } finally {
        setLoading(false);
      }
    },
    [availableSchemas, onSchemaSelect],
  );

  const handleCreateCustom = useCallback(() => {
    onCreateCustom();
    setIsOpen(false);
    // Don't clear input value - keep it as is
  }, [onCreateCustom]);

  const handleRestoreDefaults = useCallback(() => {
    if (onRestoreDefaults) {
      onRestoreDefaults();
      setIsOpen(false);
      // Don't clear input value - keep it as is
    }
  }, [onRestoreDefaults]);

  const handleClearAllSchemas = useCallback(() => {
    if (onClearAllSchemas) {
      onClearAllSchemas();
      setIsOpen(false);
      // Don't clear input value - keep it as is
    }
  }, [onClearAllSchemas]);

  return (
    <ComboBox
      className="relative inline-block"
      isOpen={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
      }}
      inputValue={inputValue}
      onInputChange={setInputValue}
      onSelectionChange={(selected) => {
        if (selected === "create-custom") {
          handleCreateCustom();
        } else if (selected === "restore-defaults") {
          handleRestoreDefaults();
        } else if (selected === "clear-all-schemas") {
          handleClearAllSchemas();
        } else if (selected && typeof selected === "string") {
          handleSchemaSelect(selected);
        }
      }}
      defaultFocusedKey={getFirstFocusableKey()}
      aria-label="Schema selector"
    >
      <div className="relative">
        <Label className="sr-only">Select or search for a schema</Label>
        <Input
          placeholder={placeholder}
          className="w-48 px-3 py-1.5 text-sm bg-zinc-800/50 text-zinc-300 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent pr-8 placeholder-zinc-500"
        />
        <Button className="absolute inset-y-0 right-0 flex items-center px-2">
          <svg
            className="w-4 h-4 text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Button>
      </div>

      <Popover className="w-80 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-50 max-h-80 overflow-auto">
        <ListBox>
          <ListBoxSection>
            <Header className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide border-b border-zinc-800">
              Actions
            </Header>
            <ListBoxItem
              id="create-custom"
              textValue="Create custom schema"
              className="px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 cursor-pointer focus:bg-zinc-800 focus:outline-none data-[focused]:bg-zinc-800 data-[hovered]:bg-zinc-800"
              onAction={() => onCreateCustom()}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-zinc-400"
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
            </ListBoxItem>

            {onRestoreDefaults && (
              <ListBoxItem
                id="restore-defaults"
                textValue="Restore defaults"
                className="px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 cursor-pointer focus:bg-zinc-800 focus:outline-none data-[focused]:bg-zinc-800 data-[hovered]:bg-zinc-800"
                onAction={() => onRestoreDefaults()}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-zinc-400"
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
              </ListBoxItem>
            )}

            {onClearAllSchemas && (
              <ListBoxItem
                id="clear-all-schemas"
                textValue="Clear all schemas"
                className="px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 cursor-pointer focus:bg-zinc-800 focus:outline-none data-[focused]:bg-zinc-800 data-[hovered]:bg-zinc-800"
                onAction={() => onClearAllSchemas()}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-red-400"
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
              </ListBoxItem>
            )}
          </ListBoxSection>

          <Separator className="border-t border-zinc-800 my-1" />

          {loading && (
            <ListBoxSection>
              <Header className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Loading schemas...
              </Header>
              <ListBoxItem
                id="loading"
                textValue="Loading schemas"
                className="px-3 py-4 text-sm text-zinc-400 text-center cursor-default data-[focused]:bg-transparent"
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div>
                  <span>Loading schemas...</span>
                </div>
              </ListBoxItem>
            </ListBoxSection>
          )}

          {!loading && Object.keys(groupedSchemas).length === 0 && inputValue && (
            <ListBoxSection>
              <Header className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                No Results
              </Header>
              <ListBoxItem
                id="no-results"
                textValue="No results found"
                className="px-3 py-4 text-sm text-zinc-400 text-center cursor-default data-[focused]:bg-transparent"
              >
                <span>No schemas found matching "{inputValue}"</span>
              </ListBoxItem>
            </ListBoxSection>
          )}

          {!loading &&
            (() => {
              // Define the desired order: Color Schemas first, then Function Schemas, then others alphabetically
              const orderedGroups = ["Color Schemas", "Function Schemas"];
              const otherGroups = Object.keys(groupedSchemas)
                .filter((group) => !orderedGroups.includes(group))
                .sort();
              const allGroups = [
                ...orderedGroups.filter((group) => groupedSchemas[group]),
                ...otherGroups,
              ];

              return allGroups.map((groupName) => {
                const schemas = groupedSchemas[groupName];
                if (!schemas || schemas.length === 0) return null;

                return (
                  <ListBoxSection key={groupName}>
                    <Header className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      {groupName} ({schemas.length})
                    </Header>
                    {schemas.map((schema) => {
                      const isDownloaded =
                        schema.type === "function"
                          ? existingFunctionSchemas.has(schema.url)
                          : existingColorSchemas.has(schema.url);
                      return (
                        <ListBoxItem
                          key={schema.id}
                          id={schema.id}
                          textValue={schema.name}
                          className="px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 cursor-pointer focus:bg-zinc-800 focus:outline-none data-[focused]:bg-zinc-800 data-[hovered]:bg-zinc-800"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-medium text-zinc-200">{schema.name}</span>
                              {schema.description && (
                                <span className="text-xs text-zinc-400 mt-1">
                                  {schema.description}
                                </span>
                              )}
                              <span
                                className="text-xs text-zinc-500 mt-1 truncate font-mono"
                                title={schema.url}
                              >
                                {schema.url}
                              </span>
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
                        </ListBoxItem>
                      );
                    })}
                    {groupName !== allGroups[allGroups.length - 1] && (
                      <Separator className="border-t border-zinc-800 my-1" />
                    )}
                  </ListBoxSection>
                );
              });
            })()}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}
