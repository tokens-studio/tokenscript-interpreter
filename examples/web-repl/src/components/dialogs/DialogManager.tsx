import type {
  ColorSpecification,
  FunctionSpecification,
} from "@tokens-studio/tokenscript-interpreter";
import { useAtom } from "jotai";
import { type RefObject, useCallback, useEffect, useState } from "react";
import { appStateAtom, openDialogAtom } from "../../store/atoms";
import { DEFAULT_COLOR_SCHEMAS } from "../../utils/default-schemas";
import { createShareState, type ShareState } from "../../utils/share";
import SchemaDialog from "./SchemaDialog";
import SchemaEditorModal from "./SchemaEditorModal";
import SharePopover from "./SharePopover";

interface DialogManagerProps {
  shareButtonRef: RefObject<HTMLButtonElement>;
}

export default function DialogManager({ shareButtonRef }: DialogManagerProps) {
  const [openDialog, setOpenDialog] = useAtom(openDialogAtom);
  const [appState, setAppState] = useAtom(appStateAtom);
  const [editingSchema, _setEditingSchema] = useState<{
    url: string;
    spec: ColorSpecification | FunctionSpecification;
    type: "color" | "function";
  } | null>(null);
  const [shareState, setShareState] = useState<ShareState>({
    version: 1,
    code: "",
    inputMode: "tokenscript",
    jsonMode: "text",
    currentPresetName: null,
    colorSchemas: [],
    functionSchemas: [],
  });

  useEffect(() => {
    setShareState(createShareState(appState, appState.colorSchemas, appState.functionSchemas));
  }, [appState]);

  const handleCloseDialog = () => setOpenDialog(null);

  const handleCreateCustomSchema = () => {
    setOpenDialog("schemaEditor");
  };

  const handleSchemaSelect = useCallback(
    (url: string, spec: any, type?: "color" | "function") => {
      const schemaType = type || (spec.type === "function" ? "function" : "color");
      if (schemaType === "color") {
        setAppState((prev) => ({
          ...prev,
          colorSchemas: new Map(prev.colorSchemas).set(url, spec),
        }));
      } else {
        setAppState((prev) => ({
          ...prev,
          functionSchemas: new Map(prev.functionSchemas).set(url, spec),
        }));
      }
    },
    [setAppState],
  );

  const handleRestoreDefaults = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      colorSchemas: new Map(DEFAULT_COLOR_SCHEMAS),
      functionSchemas: new Map(),
    }));
  }, [setAppState]);

  const handleClearAllSchemas = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      colorSchemas: new Map(),
      functionSchemas: new Map(),
    }));
  }, [setAppState]);

  return (
    <>
      <SchemaDialog
        isOpen={openDialog === "schema"}
        onClose={handleCloseDialog}
        onSchemaSelect={handleSchemaSelect}
        onCreateCustom={handleCreateCustomSchema}
        onRestoreDefaults={handleRestoreDefaults}
        onClearAllSchemas={handleClearAllSchemas}
        existingColorSchemas={appState.colorSchemas}
        existingFunctionSchemas={appState.functionSchemas}
      />

      {openDialog === "schemaEditor" && (
        <SchemaEditorModal
          onClose={handleCloseDialog}
          schema={editingSchema}
          onSave={handleSchemaSelect}
          existingSchemas={new Map([...appState.colorSchemas, ...appState.functionSchemas])}
        />
      )}

      <SharePopover
        isOpen={openDialog === "share"}
        onClose={handleCloseDialog}
        shareState={shareState}
        anchorRef={shareButtonRef}
      />
    </>
  );
}
