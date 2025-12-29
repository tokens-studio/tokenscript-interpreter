import { ColorErrorCode, InterpreterError } from "../errors";
import { isString } from "./type";

export function isValidHex(value: string): boolean {
  if (!isString(value)) return false;
  if (!value.startsWith("#")) return false;
  const hexPart = value.substring(1);
  if (!(hexPart.length === 3 || hexPart.length === 6)) return false;
  for (let i = 0; i < hexPart.length; i++) {
    const char = hexPart[i].toLowerCase();
    if (!((char >= "0" && char <= "9") || (char >= "a" && char <= "f"))) {
      return false;
    }
  }
  return true;
}

export function isValidAlpha(alpha: number | null): boolean {
  return alpha === null || (alpha >= 0 && alpha <= 1);
}

export function ensureValidAlpha(alpha: number | null): void {
  if (!isValidAlpha(alpha)) {
    throw new InterpreterError(ColorErrorCode.INVALID_ALPHA_VALUE, {
      data: { alpha: alpha as number },
    });
  }
}

export function isTransparent(alpha: number | null): alpha is number {
  return alpha !== null && alpha < 1;
}
