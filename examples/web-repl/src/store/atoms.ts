import type {
  ColorSpecification,
  FunctionSpecification,
} from "@tokens-studio/tokenscript-interpreter";
import {
  ColorManager,
  FunctionsManager,
} from "@tokens-studio/tokenscript-interpreter";
import { atom } from "jotai";
import { DEFAULT_COLOR_SCHEMAS } from "../utils/default-schemas";

// Color schema management - using Specs type from ColorManager
type ColorSpecs = Map<string, ColorSpecification>;
type FunctionSpecs = Map<string, FunctionSpecification>;

export interface DeletedColorSchema {
  url: string;
  spec: ColorSpecification;
  deletedAt: number;
}

export interface DeletedFunctionSchema {
  url: string;
  spec: FunctionSpecification;
  deletedAt: number;
}

export const deletedColorSchemasAtom = atom<DeletedColorSchema[]>([]);
export const deletedFunctionSchemasAtom = atom<DeletedFunctionSchema[]>([]);

export interface InputDefinition {
  name: string;
  type: "string" | "number" | "boolean" | "color";
  value: string | number | boolean;
}

export const inputsPanelCollapsedAtom = atom(true);

export const inputsDataAtom = atom<InputDefinition[]>([
  { name: "input1", type: "string", value: "" },
]);

// Dialog management atom - tracks which dialog is currently open
export type DialogType = "schema" | "schemaEditor" | "share" | null;

export const openDialogAtom = atom<DialogType>(null);

// Main app state atom
export type InputMode = "tokenscript" | "json";
export type JsonMode = "visual" | "text";

export interface AppState {
  code: string;
  inputMode: InputMode;
  jsonMode: JsonMode;
  currentPresetName: string | null;
  input: Record<string, any>;
  autoRun: boolean;
  schemaPanelCollapsed: boolean;
  colorSchemas: ColorSpecs;
  functionSchemas: FunctionSpecs;
}

export const appStateAtom = atom<AppState>({
  code: "",
  inputMode: "json",
  jsonMode: "text",
  currentPresetName: null,
  input: {},
  autoRun: true,
  schemaPanelCollapsed: false,
  colorSchemas: new Map(),
  functionSchemas: new Map(),
});

// Derived atom for color manager
export const colorManagerAtom = atom((get) => {
  const appState = get(appStateAtom);
  const schemas = appState.colorSchemas;
  const colorManager = new ColorManager();

  for (const [uri, spec] of schemas.entries()) {
    try {
      colorManager.register(uri, spec);
    } catch (error) {
      console.warn(`Failed to register color schema ${uri}:`, error);
    }
  }

  // Always register css color name schema to display css value in color tile
  const cssColorUri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/css-color/0/";
  const CssColorSchema = DEFAULT_COLOR_SCHEMAS.get(cssColorUri);
  if (CssColorSchema && !schemas.has(cssColorUri)) {
    try {
      colorManager.register(cssColorUri, CssColorSchema);
    } catch (error) {
      console.warn(`Failed to register css-color schema:`, error);
    }
  }

  return colorManager;
});

// Derived atom for functions manager
export const functionsManagerAtom = atom((get) => {
  const appState = get(appStateAtom);
  const schemas = appState.functionSchemas;
  const functionsManager = new FunctionsManager();

  for (const [uri, spec] of schemas.entries()) {
    try {
      functionsManager.register(spec.keyword, spec);
    } catch (error) {
      console.warn(`Failed to register function schema ${uri}:`, error);
    }
  }

  return functionsManager;
});
