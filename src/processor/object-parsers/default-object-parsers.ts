import type { ObjectParser } from ".";
import { numberWithUnitParser } from "./parsers/number-with-unit";

export const defaultObjectParsers: ObjectParser[] = [numberWithUnitParser];
