import type {
  ColorSpecification,
  FunctionSpecification,
} from "@tokens-studio/tokenscript-interpreter";
import {
  ColorSpecificationSchema,
  FunctionSpecificationSchema,
} from "@tokens-studio/tokenscript-interpreter";
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
type ColorSpecs = Map<string, ColorSpecification>;
type FunctionSpecs = Map<string, FunctionSpecification>;

// Zod schema for validating localStorage Map structure (serialized as array of [key, value] pairs)
const ColorSpecsStorageSchema = z.array(z.tuple([z.string(), ColorSpecificationSchema]));
const FunctionSpecsStorageSchema = z.array(z.tuple([z.string(), FunctionSpecificationSchema]));

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

// Color schemas - persisted to localStorage as Map serialized to array of [key, value] pairs
export const colorSchemasAtom = atomWithStorage<ColorSpecs>(
  "repl:colorSchemas:v2",
  DEFAULT_COLOR_SCHEMAS,
  {
    getItem: (key, initialValue) => {
      const item = localStorage.getItem(key);
      if (item) {
        try {
          const parsed = JSON.parse(item);
          const validatedData = ColorSpecsStorageSchema.parse(parsed);
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
  },
);

// Function schemas - persisted to localStorage as Map serialized to array of [key, value] pairs
export const functionSchemasAtom = atomWithStorage<FunctionSpecs>(
  "repl:functionSchemas:v2",
  new Map(),
  {
    getItem: (key, initialValue) => {
      const item = localStorage.getItem(key);
      if (item) {
        try {
          const parsed = JSON.parse(item);
          const validatedData = FunctionSpecsStorageSchema.parse(parsed);
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
  },
);

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
