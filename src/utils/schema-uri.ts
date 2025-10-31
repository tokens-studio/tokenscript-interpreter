/**
 * Utilities for working with TokenScript schema URIs
 *
 * Handles URI construction, parsing, and manipulation for the TokenScript schema registry.
 */

import { isObject, safeParseInt } from "../interpreter/utils/type.js";

export type SemanticVersion =
  | { major: number }
  | { major: number; minor: number }
  | { major: number; minor: number; patch: number };

type SchemaVersion = "latest" | SemanticVersion | null;

export interface SchemaUriComponents {
  baseUrl: string;
  category: "schema" | "core" | "function";
  name: string;
  version: SchemaVersion;
}

export const DEFAULT_REGISTRY_URL = "https://schema.tokenscript.dev.gcp.tokens.studio";

export const DEFAULT_API_PATH = "/api/v1";

export function parseSemverFromString(versionString: string): SemanticVersion | null {
  const parts = versionString.split(".");
  const numbers: number[] = [];

  for (const part of parts) {
    const num = safeParseInt(part);
    if (num === null) return null;
    numbers.push(num);
  }

  if (numbers.length !== parts.length) return null;

  if (numbers.length === 3) {
    return { major: numbers[0], minor: numbers[1], patch: numbers[2] };
  }

  if (numbers.length === 2) {
    return { major: numbers[0], minor: numbers[1] };
  }

  if (numbers.length === 1) {
    return { major: numbers[0] };
  }

  return null;
}

export function parseVersionString(versionString: string): SchemaVersion {
  return versionString === "latest" ? "latest" : parseSemverFromString(versionString);
}

export function semverToString(version: SchemaVersion | undefined): string {
  if (version === undefined) {
    return "latest";
  }
  if (isObject(version)) {
    if ("patch" in version) return `${version.major}.${version.minor}.${version.patch}`;
    if ("minor" in version) return `${version.major}.${version.minor}`;
    return `${version.major}`;
  }
  return "latest";
}

export function buildSchemaUri(
  params: Partial<SchemaUriComponents> & { category: string; name: string },
): string {
  const { baseUrl, category, name, version } = params;

  const versionString = semverToString(version);

  const effectiveBaseUrl = baseUrl === undefined ? DEFAULT_REGISTRY_URL : baseUrl;

  if (effectiveBaseUrl === "") {
    return `${DEFAULT_API_PATH}/${category}/${name}/${versionString}/`;
  }

  return `${effectiveBaseUrl}${DEFAULT_API_PATH}/${category}/${name}/${versionString}/`;
}

/**
 * Parse a schema URI into its components
 *
 * @example
 * parseSchemaUri("https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0.0.1/")
 * // => { baseUrl: "...", category: "schema", name: "rgb-color", version: "0.0.1" }
 *
 * parseSchemaUri("/api/v1/schema/rgb-color/0.0.1/")
 * // => { baseUrl: "", category: "schema", name: "rgb-color", version: "0.0.1" }
 */
export function parseSchemaUri(uri: string): SchemaUriComponents | null {
  let baseUrl = "";
  let pathname = uri;

  // Try parsing as full URL first
  try {
    const url = new URL(uri);
    baseUrl = `${url.protocol}//${url.host}`;
    pathname = url.pathname;
  } catch {
    // If URL parsing fails, treat as relative path
    // Check if it starts with a protocol (incomplete URL)
    if (uri.includes("://")) {
      return null;
    }
    // It's a relative path, use as-is
    pathname = uri;
  }

  // Parse pathname: /api/v1/schema/rgb-color/0.0.1/
  const pathParts = pathname.split("/").filter((part) => part !== "");

  // Expected format: [api, v1, category, name, version]
  if (pathParts.length < 5) {
    return null;
  }

  // Check if it starts with api/vN
  if (pathParts[0] !== "api" || !pathParts[1].startsWith("v")) {
    return null;
  }

  const category = pathParts[2];
  if (category !== "schema" && category !== "core" && category !== "function") {
    return null;
  }

  const name = pathParts[3];
  const version = parseVersionString(pathParts[4]);

  return {
    baseUrl,
    category: category as "schema" | "core" | "function",
    name,
    version,
  };
}

/**
 * Extract the base URI without version
 *
 * @example
 * getBaseUri("https://.../api/v1/schema/rgb-color/0.0.1/")
 * // => "https://.../api/v1/schema/rgb-color/"
 *
 * getBaseUri("/api/v1/schema/rgb-color/0.0.1/")
 * // => "/api/v1/schema/rgb-color/"
 */
export function getBaseUri(uri: string): string {
  const components = parseSchemaUri(uri);

  if (!components) {
    return uri;
  }

  const { baseUrl, category, name } = components;

  if (baseUrl === "") {
    return `${DEFAULT_API_PATH}/${category}/${name}/`;
  }

  return `${baseUrl}${DEFAULT_API_PATH}/${category}/${name}/`;
}

/**
 * Remove version from URI (for backward compatibility)
 * Same as getBaseUri
 */
export function removeVersionFromUri(uri: string): string {
  return getBaseUri(uri);
}

/**
 * Parse semantic version from URI
 *
 * @example
 * parseSemverFromUri("https://.../api/v1/schema/rgb-color/0.0.1/")
 * // => { major: 0, minor: 0, patch: 1 }
 */
export function parseSemverFromUri(uri: string): SemanticVersion | null {
  const components = parseSchemaUri(uri);
  if (!components || components.version === "latest" || components.version === null) {
    return null;
  }
  return components.version;
}

/**
 * Generate version resolution candidates from most specific to least specific
 *
 * @example
 * generateVersionCandidates("https://.../schema/rgb-color/0.0.1/")
 * // => ["https://.../schema/rgb-color/0.0.1/", "https://.../schema/rgb-color/0.0/", ...]
 */
export function generateVersionCandidates(uri: string): string[] {
  const components = parseSchemaUri(uri);
  if (!components) {
    return [uri];
  }

  const candidates: string[] = [];

  // First try the original URI as-is
  candidates.push(uri);

  // If it's already a /latest/ URI or null, only try that
  if (components.version === "latest" || components.version === null) {
    return candidates;
  }

  // Version is a SemanticVersion object - generate less specific versions
  if ("patch" in components.version) {
    // Try major.minor (without patch)
    candidates.push(
      buildSchemaUri({
        ...components,
        version: { major: components.version.major, minor: components.version.minor },
      }),
    );
  }

  if ("minor" in components.version) {
    // Try major only
    candidates.push(
      buildSchemaUri({
        ...components,
        version: { major: components.version.major },
      }),
    );
  }

  // Finally try /latest/
  candidates.push(
    buildSchemaUri({
      ...components,
      version: "latest",
    }),
  );

  return candidates;
}

/**
 * Compare two semantic versions
 * @returns positive if v1 > v2, negative if v1 < v2, 0 if equal
 */
export function compareVersions(v1: SemanticVersion, v2: SemanticVersion): number {
  if (v1.major !== v2.major) return v1.major - v2.major;

  const v1Minor = "minor" in v1 ? v1.minor : 0;
  const v2Minor = "minor" in v2 ? v2.minor : 0;
  if (v1Minor !== v2Minor) return v1Minor - v2Minor;

  const v1Patch = "patch" in v1 ? v1.patch : 0;
  const v2Patch = "patch" in v2 ? v2.patch : 0;
  return v1Patch - v2Patch;
}

/**
 * Build a fetch URL for a schema (with format query parameter)
 *
 * @example
 * buildFetchUrl("rgb-color", "latest")
 * // => "https://.../api/v1/schema/rgb-color/latest?format=json"
 */
export function buildFetchUrl(
  name: string,
  version: "latest" | SemanticVersion | string,
  options?: {
    baseUrl?: string;
    category?: "schema" | "core" | "function";
    format?: string;
  },
): string {
  const { baseUrl = DEFAULT_REGISTRY_URL, category = "schema", format = "json" } = options || {};

  const versionParam = typeof version === "string" ? parseVersionString(version) : version;

  const uri = buildSchemaUri({ baseUrl, category, name, version: versionParam });
  return `${uri}?format=${format}`;
}

/**
 * Extract schema name from URI
 *
 * @example
 * extractSchemaName("https://.../api/v1/schema/rgb-color/0.0.1/")
 * // => "rgb-color"
 */
export function extractSchemaName(uri: string): string | null {
  const components = parseSchemaUri(uri);
  return components?.name || null;
}

/**
 * Extract version from URI
 *
 * @example
 * extractVersion("https://.../api/v1/schema/rgb-color/0.0.1/")
 * // => { major: 0, minor: 0, patch: 1 }
 */
export function extractVersion(uri: string): "latest" | SemanticVersion | null {
  const components = parseSchemaUri(uri);
  return components?.version || null;
}

/**
 * Check if URI is a core type (hex-color, tokenscript, etc)
 */
export function isCoreType(uri: string): boolean {
  const components = parseSchemaUri(uri);
  return components?.category === "core";
}

/**
 * Check if URI is a function
 */
export function isFunctionType(uri: string): boolean {
  const components = parseSchemaUri(uri);
  return components?.category === "function";
}

/**
 * Check if URI is a schema
 */
export function isSchemaType(uri: string): boolean {
  const components = parseSchemaUri(uri);
  return components?.category === "schema";
}

/**
 * Update version in existing URI
 *
 * @example
 * updateVersion("https://.../schema/rgb-color/0.0.1/", "1.0.0")
 * // => "https://.../schema/rgb-color/1.0.0/"
 */
export function updateVersion(uri: string, newVersion: string): string {
  const components = parseSchemaUri(uri);
  if (!components) {
    throw new Error(`Invalid schema URI: ${uri}`);
  }

  return buildSchemaUri({ ...components, version: parseVersionString(newVersion) });
}

/**
 * Normalize URI to ensure it ends with trailing slash
 */
export function normalizeUri(uri: string): string {
  return uri.endsWith("/") ? uri : `${uri}/`;
}

/**
 * Check if two URIs point to the same schema (ignoring version)
 *
 * @example
 * isSameSchema("https://.../schema/rgb-color/0.0.1/", "https://.../schema/rgb-color/1.0.0/")
 * // => true
 */
export function isSameSchema(uri1: string, uri2: string): boolean {
  const components1 = parseSchemaUri(uri1);
  const components2 = parseSchemaUri(uri2);

  if (!components1 || !components2) {
    // Fallback to string comparison without version for non-parseable URIs
    const base1 = getBaseUri(uri1);
    const base2 = getBaseUri(uri2);
    return base1 === base2;
  }

  return (
    components1.baseUrl === components2.baseUrl &&
    components1.category === components2.category &&
    components1.name === components2.name
  );
}
