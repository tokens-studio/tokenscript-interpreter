import type { ColorManagerErrorType } from "./config/managers/color/errors";
import type { UnitManagerErrorType } from "./config/managers/unit/errors";

export type InterpreterErrorType = ColorManagerErrorType | UnitManagerErrorType;

export { ColorManagerError, type ColorManagerErrorType } from "./config/managers/color/errors";
export { UnitManagerError, type UnitManagerErrorType } from "./config/managers/unit/errors";
