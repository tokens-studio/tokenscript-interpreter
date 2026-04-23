/**
 * Token name validation.
 *
 * Must stay in sync with the Go and Ruby versions. The shared fixture
 * at tokenscript/test-suites/token-name-validation.json proves they agree.
 * Uses explicit whitespace chars (not \s) to ensure identical behavior
 * across Go/JS/Ruby regex engines.
 */

const INVALID_TOKEN_NAME_CHARS = /[ \t\n\r\f{}\[\]]/;

/** Returns true if a single name segment is valid: non-empty and contains no whitespace, braces, or brackets. */
export function validateTokenName(name: string): boolean {
  return name.length > 0 && !INVALID_TOKEN_NAME_CHARS.test(name);
}

/** Splits a dot-delimited token path into its name segments. */
export function splitTokenPath(path: string): string[] {
  return path.split(".");
}

/** Returns true if every segment of a dot-delimited token path is a valid token name. */
export function validateTokenPath(path: string): boolean {
  return splitTokenPath(path).every(validateTokenName);
}
