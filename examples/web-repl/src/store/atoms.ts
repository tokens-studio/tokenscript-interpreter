import { atomWithStorage } from "jotai/utils";

// Settings panel collapsed state - persisted to localStorage
export const schemaPanelCollapsedAtom = atomWithStorage("repl:settings:schemaPanelCollapsed", false);

// Auto-run checkbox state - persisted to localStorage
export const autoRunAtom = atomWithStorage("repl:settings:autoRun", true);
