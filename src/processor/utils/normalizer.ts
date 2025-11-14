export function normalizeJsonFiles(jsonFiles: Record<string, unknown>): Record<string, unknown> {
  const isSingleEntry = Object.keys(jsonFiles).length === 1;

  if (!isSingleEntry) {
    return jsonFiles; // Already multi-file
  }

  const [, content] = Object.entries(jsonFiles)[0];

  if (typeof content !== "object" || content === null) {
    throw new Error("File content is not an object");
  }

  // Check if single file has metadata keys (like $themes, $metadata)
  const hasMetadata = Object.keys(content as Record<string, unknown>).some((key) =>
    key.startsWith("$"),
  );
  if (hasMetadata) {
    return content as Record<string, unknown>;
  }

  return jsonFiles;
}
