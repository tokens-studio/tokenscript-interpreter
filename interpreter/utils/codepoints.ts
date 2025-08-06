export enum CodePoint {
  HYPHEN = 45,
  UNDERSCORE = 95,
  FORWARD_TICK = 180,
  BACKWARD_TICK = 96,
}

export const isAlpha = function (char: string | null): boolean {
  if (char === null) return false;
  const cp = char.codePointAt(0) ?? 0;
  return (
    (cp >= 65 && cp <= 90) || // A-Z
    (cp >= 97 && cp <= 122) // a-z
  );
};

export const isNumber = function (char: string | null): boolean {
  if (char === null) return false;
  const cp = char.codePointAt(0) ?? 0;
  return cp >= 48 && cp <= 57; // 0-9
};

export const isAlphaNumeric = function (char: string | null): boolean {
  if (char === null) return false;
  return isAlpha(char) || isNumber(char);
};
