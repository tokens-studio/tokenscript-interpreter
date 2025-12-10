// TokenScript interpreter with configuration (no processors)
// Use this if you want just the interpreter without tokenset processing utilities

// AST -------------------------------------------------------------------------

import type { ASTNode } from "@interpreter/ast";
import {
  BinOpNode,
  FunctionCallNode,
  ImplicitListNode,
  ListNode,
  NoOpNode,
  NumNode,
  ReferenceNode,
  StringNode,
  UnaryOpNode,
} from "@interpreter/ast";

export const ASTNodes = {
  BinOpNode,
  FunctionCallNode,
  ImplicitListNode,
  ListNode,
  NoOpNode,
  NumNode,
  ReferenceNode,
  StringNode,
  UnaryOpNode,
};
export type { ASTNode };
export { collectReferenceNodes, filterAST, walkAST } from "@interpreter/ast";

// Configuration ---------------------------------------------------------------

export type { ConfigOptions, LanguageOptions } from "@interpreter/config";
export { Config, DEFAULT_LANGUAGE_OPTIONS } from "@interpreter/config";

// Config Managers -------------------------------------------------------------

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

// Interpreter Core ------------------------------------------------------------

export { Interpreter, type InterpreterResult } from "@interpreter/interpreter";
export { Lexer } from "@interpreter/lexer";
export { Parser, parseExpression } from "@interpreter/parser";

// Symbols ---------------------------------------------------------------------

export {
  BaseSymbolType,
  BooleanSymbol,
  ColorSymbol,
  DictionarySymbol,
  getResultTypeName,
  type JsValue,
  jsValueToSymbolType,
  ListSymbol,
  NullSymbol,
  NumberSymbol,
  NumberWithUnitSymbol,
  StringSymbol,
  symbolTypeToJsValue,
  TokenSymbol,
} from "@interpreter/symbols";

// Types -----------------------------------------------------------------------

export * from "@src/types";

// Eval Utilities --------------------------------------------------------------

export {
  type EvalError,
  type EvalOptions,
  type EvalResult,
  type EvalSuccess,
  evaluateExpression,
} from "./eval";
