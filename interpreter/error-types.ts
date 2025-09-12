import type { ColorManagerErrorType } from "./config/managers/color/errors";

export type InterpreterErrorType = ColorManagerErrorType;
// Future error types can be added here with union operator:
// | SomeOtherManagerErrorType
// | ParserErrorType
// | LexerErrorType

export { ColorManagerError, type ColorManagerErrorType } from "./config/managers/color/errors";
