import type { ColorSpecification } from "@tokens-studio/tokenscript-interpreter";
import { ColorSpecificationSchema } from "@tokens-studio/tokenscript-interpreter";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { z } from "zod";
import { DEFAULT_COLOR_SCHEMAS } from "../utils/default-schemas";

// Settings panel collapsed state - persisted to localStorage
export const schemaPanelCollapsedAtom = atomWithStorage(
  "repl:settings:schemaPanelCollapsed",
  false,
);

// Auto-run checkbox state - persisted to localStorage
export const autoRunAtom = atomWithStorage("repl:settings:autoRun", true);

// Color schema management - using Specs type from ColorManager
type Specs = Map<string, ColorSpecification>;

// Zod schema for validating localStorage Map structure (serialized as array of [key, value] pairs)
const SpecsStorageSchema = z.array(z.tuple([z.string(), ColorSpecificationSchema]));

export interface DeletedSchema {
  url: string;
  spec: ColorSpecification;
  deletedAt: number;
}

// Color schemas - persisted to localStorage as Map serialized to array of [key, value] pairs
export const colorSchemasAtom = atomWithStorage<Specs>("repl:colorSchemas", DEFAULT_COLOR_SCHEMAS, {
  getItem: (key, initialValue) => {
    const item = localStorage.getItem(key);
    if (item) {
      try {
        const parsed = JSON.parse(item);
        const validatedData = SpecsStorageSchema.parse(parsed);
        return new Map(validatedData);
      } catch {
        return initialValue;
      }
    }
    return initialValue;
  },
  setItem: (key, value) => {
    localStorage.setItem(key, JSON.stringify(Array.from(value.entries())));
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
  },
});

// Deleted schemas history for undo functionality
export const deletedSchemasAtom = atom<DeletedSchema[]>([]);
