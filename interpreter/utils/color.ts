export function isValidHex(value: string): boolean {
  if (typeof value !== "string") return false;
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
