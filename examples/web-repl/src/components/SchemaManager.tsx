import { useAtom } from "jotai";
import { useCallback, useState } from "react";
import type { ColorSpecification } from "../../../src/interpreter/config/managers/color/schema";
import { colorSchemasAtom, deletedSchemasAtom } from "../store/atoms";
import { DEFAULT_COLOR_SCHEMAS } from "../utils/default-schemas";
import SchemaCombobox from "./SchemaCombobox";
import SchemaEditorModal from "./SchemaEditorModal";

export default function SchemaManager() {
  const [schemas, setSchemas] = useAtom(colorSchemasAtom);
  const [deletedSchemas, setDeletedSchemas] = useAtom(deletedSchemasAtom);
  const [editingSchema, setEditingSchema] = useState<{
    url: string;
    spec: ColorSpecification;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddNew = useCallback(() => {
    setEditingSchema(null);
    setIsModalOpen(true);
  }, []);

  const handleEdit = useCallback((url: string, spec: ColorSpecification) => {
    setEditingSchema({ url, spec });
    setIsModalOpen(true);
  }, []);

  const handleSave = useCallback(
    (url: string, spec: ColorSpecification) => {
      setSchemas((current) => {
        const updated = new Map(current);
        updated.set(url, spec);
        return updated;
      });
    },
    [setSchemas],
  );

  const handleDelete = useCallback(
    (url: string, spec: ColorSpecification) => {
      setSchemas((current) => {
        const updated = new Map(current);
        updated.delete(url);
        return updated;
      });
      setDeletedSchemas((current) => [...current, { url, spec, deletedAt: Date.now() }]);
    },
    [setSchemas, setDeletedSchemas],
  );

  const handleUndo = useCallback(() => {
    const mostRecentDeleted = deletedSchemas[deletedSchemas.length - 1];
    if (!mostRecentDeleted) return;

    setDeletedSchemas((current) => current.slice(0, -1));
    setSchemas((current) => {
      const updated = new Map(current);
      updated.set(mostRecentDeleted.url, mostRecentDeleted.spec);
      return updated;
    });
  }, [deletedSchemas, setSchemas, setDeletedSchemas]);

  const handleLoadDefaults = useCallback(() => {
    setSchemas(new Map(DEFAULT_COLOR_SCHEMAS));
    setDeletedSchemas([]);
  }, [setSchemas, setDeletedSchemas]);

  const handleClearAllSchemas = useCallback(() => {
    setSchemas(new Map());
    setDeletedSchemas([]);
  }, [setSchemas, setDeletedSchemas]);

  const handleSchemaSelect = useCallback(
    (url: string, spec: ColorSpecification) => {
      setSchemas((current) => {
        const updated = new Map(current);
        updated.set(url, spec);
        return updated;
      });
    },
    [setSchemas],
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
              existingSchemas={schemas}
            />
          </div>
        </div>
      </div>

      {/* Schema list */}
      <div className="flex-1 px-4 pb-4 overflow-auto">
        {schemas.size === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">No color schemas configured</div>
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
              // Group schemas by type
              const grouped = Array.from(schemas.entries()).reduce(
                (acc, [url, spec]) => {
                  const type = spec.type || "unknown";
                  const groupName =
                    type === "color"
                      ? "Color Schemas"
                      : type === "function"
                        ? "Function Schemas"
                        : `${type.charAt(0).toUpperCase() + type.slice(1)} Schemas`;

                  if (!acc[groupName]) {
                    acc[groupName] = [];
                  }
                  acc[groupName].push([url, spec]);
                  return acc;
                },
                {} as Record<string, Array<[string, ColorSpecification]>>,
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
                      {groupSchemas.map(([url, spec]) => (
                        <div
                          key={url}
                          className="flex items-center justify-between p-3 hover:bg-gray-50"
                          data-testid={`schema-${url}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {spec.name || url}
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
                              onClick={() => handleEdit(url, spec)}
                              className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
                              data-testid={`edit-${url}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(url, spec)}
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
      {deletedSchemas.length > 0 && (
        <div className="p-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleUndo}
              className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
              data-testid="undo-button"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <SchemaEditorModal
          onClose={() => setIsModalOpen(false)}
          schema={editingSchema}
          onSave={handleSave}
          existingSchemas={schemas}
        />
      )}
    </div>
  );
}
