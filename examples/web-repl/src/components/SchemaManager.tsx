import type {
  ColorSpecification,
  FunctionSpecification,
} from "@tokens-studio/tokenscript-interpreter";
import { useAtom } from "jotai";
import { useCallback, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import {
  appStateAtom,
  deletedColorSchemasAtom,
  deletedFunctionSchemasAtom,
  openDialogAtom,
} from "../store/atoms";
import { getTheme } from "../theme/colors";
import { DEFAULT_COLOR_SCHEMAS } from "../utils/default-schemas";
import SchemaEditorModal from "./dialogs/SchemaEditorModal";
import Link from "./Link";

export default function SchemaManager() {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  const [appState, setAppState] = useAtom(appStateAtom);
  const [deletedColorSchemas, setDeletedColorSchemas] = useAtom(deletedColorSchemasAtom);
  const [deletedFunctionSchemas, setDeletedFunctionSchemas] = useAtom(deletedFunctionSchemasAtom);
  const [openDialog, setOpenDialog] = useAtom(openDialogAtom);
  const [editingSchema, setEditingSchema] = useState<{
    url: string;
    spec: ColorSpecification | FunctionSpecification;
    type: "color" | "function";
  } | null>(null);

  const colorSchemas = appState.colorSchemas;
  const functionSchemas = appState.functionSchemas;

  const handleAddNew = useCallback(() => {
    setEditingSchema(null);
    setOpenDialog("schemaEditor");
  }, [setOpenDialog]);

  const handleEdit = useCallback(
    (url: string, spec: ColorSpecification | FunctionSpecification, type: "color" | "function") => {
      setEditingSchema({ url, spec, type });
      setOpenDialog("schemaEditor");
    },
    [setOpenDialog],
  );

  const handleSave = useCallback(
    (url: string, spec: ColorSpecification | FunctionSpecification, type: "color" | "function") => {
      if (type === "color") {
        setAppState((prev) => ({
          ...prev,
          colorSchemas: new Map(prev.colorSchemas).set(url, spec as ColorSpecification),
        }));
      } else {
        setAppState((prev) => ({
          ...prev,
          functionSchemas: new Map(prev.functionSchemas).set(url, spec as FunctionSpecification),
        }));
      }
    },
    [setAppState],
  );

  const handleDelete = useCallback(
    (url: string, spec: ColorSpecification | FunctionSpecification, type: "color" | "function") => {
      if (type === "color") {
        setAppState((prev) => {
          const updated = new Map(prev.colorSchemas);
          updated.delete(url);
          return { ...prev, colorSchemas: updated };
        });
        setDeletedColorSchemas((current) => [
          ...current,
          { url, spec: spec as ColorSpecification, deletedAt: Date.now() },
        ]);
      } else {
        setAppState((prev) => {
          const updated = new Map(prev.functionSchemas);
          updated.delete(url);
          return { ...prev, functionSchemas: updated };
        });
        setDeletedFunctionSchemas((current) => [
          ...current,
          { url, spec: spec as FunctionSpecification, deletedAt: Date.now() },
        ]);
      }
    },
    [setAppState, setDeletedColorSchemas, setDeletedFunctionSchemas],
  );

  const handleUndoColor = useCallback(() => {
    const mostRecentDeleted = deletedColorSchemas[deletedColorSchemas.length - 1];
    if (!mostRecentDeleted) return;

    setDeletedColorSchemas((current) => current.slice(0, -1));
    setAppState((prev) => ({
      ...prev,
      colorSchemas: new Map(prev.colorSchemas).set(mostRecentDeleted.url, mostRecentDeleted.spec),
    }));
  }, [deletedColorSchemas, setAppState, setDeletedColorSchemas]);

  const handleUndoFunction = useCallback(() => {
    const mostRecentDeleted = deletedFunctionSchemas[deletedFunctionSchemas.length - 1];
    if (!mostRecentDeleted) return;

    setDeletedFunctionSchemas((current) => current.slice(0, -1));
    setAppState((prev) => ({
      ...prev,
      functionSchemas: new Map(prev.functionSchemas).set(
        mostRecentDeleted.url,
        mostRecentDeleted.spec,
      ),
    }));
  }, [deletedFunctionSchemas, setAppState, setDeletedFunctionSchemas]);

  const _handleLoadDefaults = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      colorSchemas: new Map(DEFAULT_COLOR_SCHEMAS),
      functionSchemas: new Map(),
    }));
    setDeletedColorSchemas([]);
    setDeletedFunctionSchemas([]);
  }, [setAppState, setDeletedColorSchemas, setDeletedFunctionSchemas]);

  const _handleClearAllSchemas = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      colorSchemas: new Map(),
      functionSchemas: new Map(),
    }));
    setDeletedColorSchemas([]);
    setDeletedFunctionSchemas([]);
  }, [setAppState, setDeletedColorSchemas, setDeletedFunctionSchemas]);

  const _handleSchemaSelect = useCallback(
    (
      url: string,
      spec: ColorSpecification | FunctionSpecification,
      type?: "color" | "function",
    ) => {
      // Determine type from the spec if not provided
      const schemaType = type || (spec.type === "function" ? "function" : "color");

      if (schemaType === "color") {
        setAppState((prev) => ({
          ...prev,
          colorSchemas: new Map(prev.colorSchemas).set(url, spec as ColorSpecification),
        }));
      } else {
        setAppState((prev) => ({
          ...prev,
          functionSchemas: new Map(prev.functionSchemas).set(url, spec as FunctionSpecification),
        }));
      }
    },
    [setAppState],
  );

  const formatUrl = (url: string) => {
    if (url.length <= 50) return url;
    return `${url.substring(0, 25)}...${url.substring(url.length - 22)}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Schema list */}
      <div className="flex-1 px-4 pb-4 overflow-auto">
        {colorSchemas.size === 0 && functionSchemas.size === 0 ? (
          <div
            className="text-center py-8"
            style={{ color: currentTheme.textMuted }}
          >
            <div className="text-sm">No schemas configured</div>
            <button
              type="button"
              onClick={handleAddNew}
              className="mt-2 underline text-sm transition-colors"
              style={{ color: currentTheme.textSecondary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = currentTheme.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = currentTheme.textSecondary;
              }}
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
                    className="space-y-2"
                  >
                    <div className="px-0 py-2">
                      <h4
                        className="text-xs font-medium uppercase tracking-wide"
                        style={{ color: currentTheme.textMuted }}
                      >
                        {groupName} ({groupSchemas.length})
                      </h4>
                    </div>
                    <ul className="space-y-1">
                      {groupSchemas.map(([url, spec, schemaType]) => (
                        <li
                          key={url}
                          className="flex items-center justify-between p-2 transition-colors"
                          style={{
                            backgroundColor: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.surfaceHover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                          data-testid={`schema-${url}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-sm truncate"
                              style={{ color: currentTheme.textPrimary }}
                            >
                              {schemaType === "function"
                                ? (spec as FunctionSpecification).name
                                : (spec as ColorSpecification).name || url}
                            </div>
                            <Link
                              href={url}
                              className="text-xs truncate font-mono block"
                              title={url}
                            >
                              {formatUrl(url)}
                            </Link>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(url, spec, schemaType)}
                              className="px-2 py-1 text-xs border rounded transition-colors"
                              style={{
                                color: currentTheme.textPrimary,
                                borderColor: currentTheme.border,
                                backgroundColor: "transparent",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = currentTheme.surfaceHover;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                              }}
                              data-testid={`edit-${url}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(url, spec, schemaType)}
                              className="px-2 py-1 text-xs border rounded transition-colors"
                              style={{
                                color: currentTheme.textPrimary,
                                borderColor: currentTheme.border,
                                backgroundColor: "transparent",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = currentTheme.error;
                                e.currentTarget.style.borderColor = currentTheme.error;
                                e.currentTarget.style.backgroundColor = currentTheme.surfaceHover;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = currentTheme.textPrimary;
                                e.currentTarget.style.borderColor = currentTheme.border;
                                e.currentTarget.style.backgroundColor = "transparent";
                              }}
                              data-testid={`delete-${url}`}
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Footer */}
      {(deletedColorSchemas.length > 0 || deletedFunctionSchemas.length > 0) && (
        <div
          className="p-3 border-t"
          style={{
            borderColor: currentTheme.border,
            backgroundColor: currentTheme.surface,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            {deletedColorSchemas.length > 0 && (
              <button
                type="button"
                onClick={handleUndoColor}
                className="px-3 py-1.5 text-xs transition-colors"
                style={{ color: currentTheme.textSecondary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = currentTheme.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = currentTheme.textSecondary;
                }}
                data-testid="undo-color-button"
              >
                Undo Color ({deletedColorSchemas.length})
              </button>
            )}
            {deletedFunctionSchemas.length > 0 && (
              <button
                type="button"
                onClick={handleUndoFunction}
                className="px-3 py-1.5 text-xs transition-colors"
                style={{ color: currentTheme.textSecondary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = currentTheme.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = currentTheme.textSecondary;
                }}
                data-testid="undo-function-button"
              >
                Undo Function ({deletedFunctionSchemas.length})
              </button>
            )}
          </div>
        </div>
      )}

      {openDialog === "schemaEditor" && (
        <SchemaEditorModal
          onClose={() => setOpenDialog(null)}
          schema={editingSchema}
          onSave={handleSave}
          existingSchemas={new Map([...colorSchemas, ...functionSchemas])}
        />
      )}
    </div>
  );
}
