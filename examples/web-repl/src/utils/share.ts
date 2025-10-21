import type {
  ColorSpecification,
  FunctionSpecification,
} from "@tokens-studio/tokenscript-interpreter";

// Current share format version for backwards compatibility
const SHARE_VERSION = 1;

export interface ShareState {
  version: number;
  mode: "tokenscript" | "json";
  code: string;
  colorSchemas: Array<[string, ColorSpecification]>;
  functionSchemas: Array<[string, FunctionSpecification]>;
}

/**
 * Encode share state into a compressed URL hash
 */
export function encodeShareState(state: ShareState): string {
  const json = JSON.stringify(state);
  // Convert to base64 for URL safety
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64;
}

/**
 * Decode share state from a URL hash
 */
export function decodeShareState(encoded: string): ShareState | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
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

/**
 * Get share URL with encoded state
 */
export function getShareUrl(state: ShareState): string {
  const encoded = encodeShareState(state);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#share=${encoded}`;
}

/**
 * Extract share state from current URL
 */
export function getShareStateFromUrl(): ShareState | null {
  const hash = window.location.hash;
  const match = hash.match(/#share=(.+)$/);
  if (!match) {
    return null;
  }
  return decodeShareState(match[1]);
}

/**
 * Create a ShareState from current editor values
 */
export function createShareState(
  mode: "tokenscript" | "json",
  code: string,
  colorSchemas: Map<string, ColorSpecification>,
  functionSchemas: Map<string, FunctionSpecification>,
): ShareState {
  return {
    version: SHARE_VERSION,
    mode,
    code,
    colorSchemas: Array.from(colorSchemas.entries()),
    functionSchemas: Array.from(functionSchemas.entries()),
  };
}
