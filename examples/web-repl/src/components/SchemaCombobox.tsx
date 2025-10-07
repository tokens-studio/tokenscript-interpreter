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
import type { ColorSpecification } from "../../../src/interpreter/config/managers/color/schema";
import { fetchTokenScriptSchema } from "../utils/schema-fetcher";

interface SchemaOption {
  id: string;
  name: string;
  url: string;
  description?: string;
}

interface SchemaComboboxProps {
  onSchemaSelect: (url: string, spec: ColorSpecification) => void;
  onCreateCustom: () => void;
  onRestoreDefaults?: () => void;
  onClearAllSchemas?: () => void;
  placeholder?: string;
  existingSchemas?: Map<string, ColorSpecification>;
}

export default function SchemaCombobox({
  onSchemaSelect,
  onCreateCustom,
  onRestoreDefaults,
  onClearAllSchemas,
  placeholder = "Add schema...",
  existingSchemas = new Map(),
}: SchemaComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [availableSchemas, setAvailableSchemas] = useState<SchemaOption[]>([]);
  const [filteredSchemas, setFilteredSchemas] = useState<SchemaOption[]>([]);
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
      console.log("Fetched schemas:", data);

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

  // Filter schemas based on input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredSchemas(availableSchemas);
    } else {
      const filtered = availableSchemas.filter(
        (schema) =>
          schema.name.toLowerCase().includes(inputValue.toLowerCase()) ||
          schema.description?.toLowerCase().includes(inputValue.toLowerCase()),
      );
      setFilteredSchemas(filtered);
    }
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
        onSchemaSelect(schema.url, response.content);
        setIsOpen(false);
        setInputValue("");
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
    setInputValue("");
  }, [onCreateCustom]);

  const handleRestoreDefaults = useCallback(() => {
    if (onRestoreDefaults) {
      onRestoreDefaults();
      setIsOpen(false);
      setInputValue("");
    }
  }, [onRestoreDefaults]);

  const handleClearAllSchemas = useCallback(() => {
    if (onClearAllSchemas) {
      onClearAllSchemas();
      setIsOpen(false);
      setInputValue("");
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
          className="w-48 px-3 py-1 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
        />
        <Button className="absolute inset-y-0 right-0 flex items-center px-2">
          <svg
            className="w-4 h-4 text-gray-400"
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

      <Popover className="w-80 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-auto">
        <ListBox>
          <ListBoxSection>
            <Header className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
              Actions
            </Header>
            <ListBoxItem
              id="create-custom"
              textValue="Create custom schema"
              className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer focus:bg-blue-50 focus:outline-none data-[focused]:bg-blue-50 data-[hovered]:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-gray-500"
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
                className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer focus:bg-blue-50 focus:outline-none data-[focused]:bg-blue-50 data-[hovered]:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-gray-500"
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
                className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer focus:bg-blue-50 focus:outline-none data-[focused]:bg-blue-50 data-[hovered]:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-red-500"
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

          <Separator className="border-t border-gray-200 my-1" />

          <ListBoxSection>
            <Header className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
              {loading ? "Loading schemas..." : `Schemas (${filteredSchemas.length})`}
            </Header>

            {loading && (
              <ListBoxItem
                id="loading"
                textValue="Loading schemas"
                className="px-3 py-4 text-sm text-gray-500 text-center cursor-default data-[focused]:bg-transparent"
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  <span>Loading schemas...</span>
                </div>
              </ListBoxItem>
            )}

            {!loading &&
              filteredSchemas.map((schema) => {
                const isDownloaded = existingSchemas.has(schema.url);
                return (
                  <ListBoxItem
                    key={schema.id}
                    id={schema.id}
                    textValue={schema.name}
                    className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer focus:bg-blue-50 focus:outline-none data-[focused]:bg-blue-50 data-[hovered]:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-gray-900">{schema.name}</span>
                        {schema.description && (
                          <span className="text-xs text-gray-500 mt-1">{schema.description}</span>
                        )}
                        <span
                          className="text-xs text-gray-400 mt-1 truncate"
                          title={schema.url}
                        >
                          {schema.url}
                        </span>
                      </div>
                      {isDownloaded && (
                        <div className="flex-shrink-0 mt-0.5">
                          <svg
                            className="w-4 h-4 text-green-600"
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

            {!loading && filteredSchemas.length === 0 && inputValue && (
              <ListBoxItem
                id="no-results"
                textValue="No results found"
                className="px-3 py-4 text-sm text-gray-500 text-center cursor-default data-[focused]:bg-transparent"
              >
                <span>No schemas found matching "{inputValue}"</span>
              </ListBoxItem>
            )}
          </ListBoxSection>
        </ListBox>
      </Popover>
    </ComboBox>
  );
}
