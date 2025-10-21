// TokenScript interpreter with configuration (no processors)
// Use this if you want just the interpreter without tokenset processing utilities

// Configuration
export type { ConfigOptions, LanguageOptions } from "@interpreter/config";
export { Config, DEFAULT_LANGUAGE_OPTIONS } from "@interpreter/config";
// Config Managers
export { ColorManager } from "@interpreter/config/managers/color/manager";
export {
  type ColorSpecification,
  ColorSpecificationSchema,
} from "@interpreter/config/managers/color/schema";
export { FunctionsManager } from "@interpreter/config/managers/functions/manager";
export {
  type FunctionSpecification,
  FunctionSpecificationSchema,
} from "@interpreter/config/managers/functions/schema";
export { UnitManager } from "@interpreter/config/managers/unit/manager";
export {
  type UnitSpecification,
  UnitSpecificationSchema,
} from "@interpreter/config/managers/unit/schema";
export * from "@interpreter/errors";
// Core interpreter
export { Interpreter } from "@interpreter/interpreter";
export { Lexer } from "@interpreter/lexer";
export { Parser } from "@interpreter/parser";
// Symbols
export {
  BaseSymbolType,
  BooleanSymbol,
  ColorSymbol,
  DictionarySymbol,
  jsValueToSymbolType,
  ListSymbol,
  NullSymbol,
  NumberSymbol,
  NumberWithUnitSymbol,
  StringSymbol,
} from "@interpreter/symbols";
// Type definitions
export * from "@src/types";
