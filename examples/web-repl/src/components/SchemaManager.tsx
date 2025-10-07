import type {
  ColorSpecification,
  FunctionSpecification,
} from "@tokens-studio/tokenscript-interpreter";
import { useAtom } from "jotai";
import { useCallback, useState } from "react";
import {
  colorSchemasAtom,
  deletedColorSchemasAtom,
  deletedFunctionSchemasAtom,
  functionSchemasAtom,
} from "../store/atoms";
import { DEFAULT_COLOR_SCHEMAS } from "../utils/default-schemas";
import SchemaCombobox from "./SchemaCombobox";
import SchemaEditorModal from "./SchemaEditorModal";

export default function SchemaManager() {
  const [colorSchemas, setColorSchemas] = useAtom(colorSchemasAtom);
  const [functionSchemas, setFunctionSchemas] = useAtom(functionSchemasAtom);
  const [deletedColorSchemas, setDeletedColorSchemas] = useAtom(deletedColorSchemasAtom);
  const [deletedFunctionSchemas, setDeletedFunctionSchemas] = useAtom(deletedFunctionSchemasAtom);
  const [editingSchema, setEditingSchema] = useState<{
    url: string;
    spec: ColorSpecification | FunctionSpecification;
    type: "color" | "function";
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddNew = useCallback(() => {
    setEditingSchema(null);
    setIsModalOpen(true);
  }, []);

  const handleEdit = useCallback(
    (url: string, spec: ColorSpecification | FunctionSpecification, type: "color" | "function") => {
      setEditingSchema({ url, spec, type });
      setIsModalOpen(true);
    },
    [],
  );

  const handleSave = useCallback(
    (url: string, spec: ColorSpecification | FunctionSpecification, type: "color" | "function") => {
      if (type === "color") {
        setColorSchemas((current) => {
          const updated = new Map(current);
          updated.set(url, spec as ColorSpecification);
          return updated;
        });
      } else {
        setFunctionSchemas((current) => {
          const updated = new Map(current);
          updated.set(url, spec as FunctionSpecification);
          return updated;
        });
      }
    },
    [setColorSchemas, setFunctionSchemas],
  );

  const handleDelete = useCallback(
    (url: string, spec: ColorSpecification | FunctionSpecification, type: "color" | "function") => {
      if (type === "color") {
        setColorSchemas((current) => {
          const updated = new Map(current);
          updated.delete(url);
          return updated;
        });
        setDeletedColorSchemas((current) => [
          ...current,
          { url, spec: spec as ColorSpecification, deletedAt: Date.now() },
        ]);
      } else {
        setFunctionSchemas((current) => {
          const updated = new Map(current);
          updated.delete(url);
          return updated;
        });
        setDeletedFunctionSchemas((current) => [
          ...current,
          { url, spec: spec as FunctionSpecification, deletedAt: Date.now() },
        ]);
      }
    },
    [setColorSchemas, setFunctionSchemas, setDeletedColorSchemas, setDeletedFunctionSchemas],
  );

  const handleUndoColor = useCallback(() => {
    const mostRecentDeleted = deletedColorSchemas[deletedColorSchemas.length - 1];
    if (!mostRecentDeleted) return;

    setDeletedColorSchemas((current) => current.slice(0, -1));
    setColorSchemas((current) => {
      const updated = new Map(current);
      updated.set(mostRecentDeleted.url, mostRecentDeleted.spec);
      return updated;
    });
  }, [deletedColorSchemas, setColorSchemas, setDeletedColorSchemas]);

  const handleUndoFunction = useCallback(() => {
    const mostRecentDeleted = deletedFunctionSchemas[deletedFunctionSchemas.length - 1];
    if (!mostRecentDeleted) return;

    setDeletedFunctionSchemas((current) => current.slice(0, -1));
    setFunctionSchemas((current) => {
      const updated = new Map(current);
      updated.set(mostRecentDeleted.url, mostRecentDeleted.spec);
      return updated;
    });
  }, [deletedFunctionSchemas, setFunctionSchemas, setDeletedFunctionSchemas]);

  const handleLoadDefaults = useCallback(() => {
    setColorSchemas(new Map(DEFAULT_COLOR_SCHEMAS));
    setFunctionSchemas(new Map());
    setDeletedColorSchemas([]);
    setDeletedFunctionSchemas([]);
  }, [setColorSchemas, setFunctionSchemas, setDeletedColorSchemas, setDeletedFunctionSchemas]);

  const handleClearAllSchemas = useCallback(() => {
    setColorSchemas(new Map());
    setFunctionSchemas(new Map());
    setDeletedColorSchemas([]);
    setDeletedFunctionSchemas([]);
  }, [setColorSchemas, setFunctionSchemas, setDeletedColorSchemas, setDeletedFunctionSchemas]);

  const handleSchemaSelect = useCallback(
    (
      url: string,
      spec: ColorSpecification | FunctionSpecification,
      type?: "color" | "function",
    ) => {
      // Determine type from the spec if not provided
      const schemaType = type || (spec.type === "function" ? "function" : "color");

      if (schemaType === "color") {
        setColorSchemas((current) => {
          const updated = new Map(current);
          updated.set(url, spec as ColorSpecification);
          return updated;
        });
      } else {
        setFunctionSchemas((current) => {
          const updated = new Map(current);
          updated.set(url, spec as FunctionSpecification);
          return updated;
        });
      }
    },
    [setColorSchemas, setFunctionSchemas],
  );

  const formatUrl = (url: string) => {
    if (url.length <= 50) return url;
    return `${url.substring(0, 25)}...${url.substring(url.length - 22)}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Color Schemas</h3>
          <div className="flex items-center gap-2">
            <SchemaCombobox
              onSchemaSelect={handleSchemaSelect}
              onCreateCustom={handleAddNew}
              onRestoreDefaults={handleLoadDefaults}
              onClearAllSchemas={handleClearAllSchemas}
              placeholder="Add or search schemas..."
              existingColorSchemas={colorSchemas}
              existingFunctionSchemas={functionSchemas}
            />
          </div>
        </div>
      </div>

      {/* Schema list */}
      <div className="flex-1 px-4 pb-4 overflow-auto">
        {colorSchemas.size === 0 && functionSchemas.size === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">No schemas configured</div>
            <button
              type="button"
              onClick={handleAddNew}
              className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Add your first schema
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              // Combine both schema types, but hide css-color from UI (always loaded in config)
              const allSchemas: Array<
                [string, ColorSpecification | FunctionSpecification, "color" | "function"]
              > = [
                ...Array.from(colorSchemas.entries())
                  .filter(([url]) => !url.includes("css-color")) // Hide css-color from UI
                  .map(([url, spec]) => [url, spec, "color" as const]),
                ...Array.from(functionSchemas.entries()).map(([url, spec]) => [
                  url,
                  spec,
                  "function" as const,
                ]),
              ];

              // Group schemas by type
              const grouped = allSchemas.reduce(
                (acc, [url, spec, schemaType]) => {
                  const groupName = schemaType === "color" ? "Color Schemas" : "Function Schemas";

                  if (!acc[groupName]) {
                    acc[groupName] = [];
                  }
                  acc[groupName].push([url, spec, schemaType]);
                  return acc;
                },
                {} as Record<
                  string,
                  Array<[string, ColorSpecification | FunctionSpecification, "color" | "function"]>
                >,
              );

              // Define the desired order: Color Schemas first, then Function Schemas, then others alphabetically
              const orderedGroups = ["Color Schemas", "Function Schemas"];
              const otherGroups = Object.keys(grouped)
                .filter((group) => !orderedGroups.includes(group))
                .sort();
              const allGroups = [
                ...orderedGroups.filter((group) => grouped[group]),
                ...otherGroups,
              ];

              return allGroups.map((groupName) => {
                const groupSchemas = grouped[groupName];
                if (!groupSchemas || groupSchemas.length === 0) return null;

                return (
                  <div
                    key={groupName}
                    className="bg-white rounded-md border border-gray-200 overflow-hidden"
                  >
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {groupName} ({groupSchemas.length})
                      </h4>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {groupSchemas.map(([url, spec, schemaType]) => (
                        <div
                          key={url}
                          className="flex items-center justify-between p-3 hover:bg-gray-50"
                          data-testid={`schema-${url}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {schemaType === "function"
                                ? (spec as FunctionSpecification).name
                                : (spec as ColorSpecification).name || url}
                            </div>
                            <div
                              className="text-xs text-gray-500 truncate"
                              title={url}
                            >
                              {formatUrl(url)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(url, spec, schemaType)}
                              className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
                              data-testid={`edit-${url}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(url, spec, schemaType)}
                              className="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50"
                              data-testid={`delete-${url}`}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Footer */}
      {(deletedColorSchemas.length > 0 || deletedFunctionSchemas.length > 0) && (
        <div className="p-2 border-t border-gray-200">
          <div className="flex items-center justify-between gap-2">
            {deletedColorSchemas.length > 0 && (
              <button
                type="button"
                onClick={handleUndoColor}
                className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
                data-testid="undo-color-button"
              >
                Undo Color ({deletedColorSchemas.length})
              </button>
            )}
            {deletedFunctionSchemas.length > 0 && (
              <button
                type="button"
                onClick={handleUndoFunction}
                className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
                data-testid="undo-function-button"
              >
                Undo Function ({deletedFunctionSchemas.length})
              </button>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <SchemaEditorModal
          onClose={() => setIsModalOpen(false)}
          schema={editingSchema}
          onSave={handleSave}
          existingSchemas={new Map([...colorSchemas, ...functionSchemas])}
        />
      )}
    </div>
  );
}
