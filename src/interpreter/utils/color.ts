import { ColorErrorCode, InterpreterError, SymbolsErrorCode } from "../errors";
import { isString } from "./type";

export function isValidHex(value: string): boolean {
  if (!isString(value)) return false;
  if (!value.startsWith("#")) return false;
  const hexPart = value.substring(1);
  // Support hex3 (#RGB), hex4 (#RGBA), hex6 (#RRGGBB), hex8 (#RRGGBBAA)
  if (
    !(hexPart.length === 3 || hexPart.length === 4 || hexPart.length === 6 || hexPart.length === 8)
  )
    return false;
  for (let i = 0; i < hexPart.length; i++) {
    const char = hexPart[i].toLowerCase();
    if (!((char >= "0" && char <= "9") || (char >= "a" && char <= "f"))) {
      return false;
    }
  }
  return true;
}

/**
 * Parses a hex color string and extracts the color value and alpha.
 * Supports hex3 (#RGB), hex4 (#RGBA), hex6 (#RRGGBB), hex8 (#RRGGBBAA) formats.
 *
 * For backwards compatibility:
 * - hex3 and hex6 formats are preserved as-is (no alpha)
 * - hex4 is converted to hex6 with alpha extracted
 * - hex8 is converted to hex6 with alpha extracted
 *
 * Returns the color value and alpha (0-1 range, or null if not specified).
 */
export function parseHexWithAlpha(value: string): { color: string; alpha: number | null } {
  if (!isValidHex(value)) {
    throw new InterpreterError(SymbolsErrorCode.INVALID_HEX_COLOR, {
      data: { value },
    });
  }

  const hexPart = value.substring(1);

  if (hexPart.length === 3) {
    // #RGB - preserve as-is, no alpha
    return { color: value, alpha: null };
  }

  if (hexPart.length === 4) {
    // #RGBA -> #RRGGBB with alpha
    const r = hexPart[0];
    const g = hexPart[1];
    const b = hexPart[2];
    const a = hexPart[3];
    const expanded = `${r}${r}${g}${g}${b}${b}`;
    const alphaValue = Number.parseInt(a + a, 16) / 255;
    return { color: `#${expanded}`, alpha: alphaValue };
  }

  if (hexPart.length === 6) {
    // #RRGGBB - preserve as-is, no alpha
    return { color: value, alpha: null };
  }

  // hexPart.length === 8
  // #RRGGBBAA -> #RRGGBB with alpha
  const colorPart = hexPart.substring(0, 6);
  const alphaPart = hexPart.substring(6, 8);
  const alphaValue = Number.parseInt(alphaPart, 16) / 255;
  return { color: `#${colorPart}`, alpha: alphaValue };
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

/**
 * Formats a hex color with alpha as hex8 format (#RRGGBBAA).
 * Expands hex3 (#RGB) to hex6 (#RRGGBB) before appending alpha.
 */
export function formatHex8(hexColor: string, alpha: number): string {
  const alphaHex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");

  // Expand 3-char hex to 6-char if needed
  let hex6 = hexColor;
  if (hexColor.length === 4) {
    // #RGB -> #RRGGBB
    hex6 = `#${hexColor[1]}${hexColor[1]}${hexColor[2]}${hexColor[2]}${hexColor[3]}${hexColor[3]}`;
  }

  return `${hex6}${alphaHex}`;
}
