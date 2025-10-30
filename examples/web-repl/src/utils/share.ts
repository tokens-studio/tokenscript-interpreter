import type {
  ColorSpecification,
  FunctionSpecification,
} from "@tokens-studio/tokenscript-interpreter";
import LZ from "lz-string";
import type { AppState } from "../store/atoms";

const SHARE_VERSION = 2;

export interface ShareState {
  version: number;
  code: string;
  inputMode: AppState["inputMode"];
  jsonMode: AppState["jsonMode"];
  currentPresetName: string | null;
  colorSchemas: Array<[string, ColorSpecification]>;
  functionSchemas: Array<[string, FunctionSpecification]>;
}

export function encodeShareState(state: ShareState): string {
  const json = JSON.stringify(state);
  return LZ.compressToEncodedURIComponent(json);
}

export function decodeShareState(encoded: string): ShareState | null {
  try {
    const json = LZ.decompressFromEncodedURIComponent(encoded);
    if (!json) {
      console.error("Failed to decompress share state");
      return null;
    }
    const state = JSON.parse(json);
    // Validate version
    if (!state.version || state.version !== SHARE_VERSION) {
      console.warn("Share state version mismatch:", state.version);
      return null;
    }
    return state;
  } catch (error) {
    console.error("Failed to decode share state:", error);
    return null;
  }
}

export function encodeShareStateUrl(state: ShareState): string {
  const encoded = encodeShareState(state);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#share=${encoded}`;
}

export function decodeShareStateUrl(): ShareState | null {
  const hash = window.location.hash;
  const match = hash.match(/#share=(.+)$/);
  if (!match) {
    return null;
  }
  return decodeShareState(match[1]);
}

export function createShareState(
  appState: AppState,
  colorSchemas: Map<string, ColorSpecification>,
  functionSchemas: Map<string, FunctionSpecification>,
): ShareState {
  return {
    version: SHARE_VERSION,
    code: appState.code,
    inputMode: appState.inputMode,
    jsonMode: appState.jsonMode,
    currentPresetName: appState.currentPresetName,
    colorSchemas: Array.from(colorSchemas.entries()),
    functionSchemas: Array.from(functionSchemas.entries()),
  };
}
