import {
  buildFetchUrl,
  buildSchemaUri,
  compareVersions,
  extractSchemaName,
  extractVersion,
  generateVersionCandidates,
  getBaseUri,
  isCoreType,
  isFunctionType,
  isSameSchema,
  isSchemaType,
  normalizeUri,
  parseSchemaUri,
  parseSemverFromUri,
  parseVersionString,
  removeVersionFromUri,
  updateVersion,
} from "@src/utils/schema-uri";
import { describe, expect, it } from "vitest";

describe("Schema URI Utilities", () => {
  describe("buildSchemaUri", () => {
    it("should build URI with default values", () => {
      const uri = buildSchemaUri({ category: "schema", name: "rgb-color" });
      expect(uri).toBe("https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/latest/");
    });

    it("should build relative path URI with empty baseUrl", () => {
      const uri = buildSchemaUri({
        baseUrl: "",
        category: "schema",
        name: "rgb-color",
        version: parseVersionString("0.0.1"),
      });
      expect(uri).toBe("/api/v1/schema/rgb-color/0.0.1/");
    });

    it("should build URI with specific version", () => {
      const uri = buildSchemaUri({
        category: "schema",
        name: "rgb-color",
        version: parseVersionString("0.0.1"),
      });
      expect(uri).toBe("https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0.0.1/");
    });

    it("should build URI with custom base URL", () => {
      const uri = buildSchemaUri({
        baseUrl: "https://custom.example.com",
        category: "schema",
        name: "rgb-color",
        version: parseVersionString("1.0.0"),
      });
      expect(uri).toBe("https://custom.example.com/api/v1/schema/rgb-color/1.0.0/");
    });

    it("should build core type URI", () => {
      const uri = buildSchemaUri({
        category: "core",
        name: "hex-color",
        version: parseVersionString("0"),
      });
      expect(uri).toBe("https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/hex-color/0/");
    });

    it("should build function URI", () => {
      const uri = buildSchemaUri({
        category: "function",
        name: "darken",
        version: parseVersionString("1.0.0"),
      });
      expect(uri).toBe("https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/function/darken/1.0.0/");
    });
  });

  describe("parseSchemaUri", () => {
    it("should parse complete schema URI", () => {
      const uri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0.0.1/";
      const result = parseSchemaUri(uri);

      expect(result).toEqual({
        baseUrl: "https://schema.tokenscript.dev.gcp.tokens.studio",
        category: "schema",
        name: "rgb-color",
        version: { major: 0, minor: 0, patch: 1 },
      });
    });

    it("should parse relative path URIs", () => {
      const uri = "/api/v1/schema/rgb-color/0.0.1/";
      const result = parseSchemaUri(uri);

      expect(result).toEqual({
        baseUrl: "",
        category: "schema",
        name: "rgb-color",
        version: { major: 0, minor: 0, patch: 1 },
      });
    });

    it("should parse core type URI", () => {
      const uri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/hex-color/0/";
      const result = parseSchemaUri(uri);

      expect(result).toEqual({
        baseUrl: "https://schema.tokenscript.dev.gcp.tokens.studio",
        category: "core",
        name: "hex-color",
        version: { major: 0 },
      });
    });

    it("should parse function URI", () => {
      const uri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/function/darken/1.0.0/";
      const result = parseSchemaUri(uri);

      expect(result).toEqual({
        baseUrl: "https://schema.tokenscript.dev.gcp.tokens.studio",
        category: "function",
        name: "darken",
        version: { major: 1, minor: 0, patch: 0 },
      });
    });

    it("should handle URI without trailing slash", () => {
      const uri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0.0.1";
      const result = parseSchemaUri(uri);

      expect(result).toEqual({
        baseUrl: "https://schema.tokenscript.dev.gcp.tokens.studio",
        category: "schema",
        name: "rgb-color",
        version: { major: 0, minor: 0, patch: 1 },
      });
    });

    it("should return null for invalid URI", () => {
      const result = parseSchemaUri("invalid-uri");
      expect(result).toBeNull();
    });
  });

  describe("getBaseUri", () => {
    it("should remove semantic version", () => {
      const uri = "https://example.com/api/v1/schema/rgb-color/0.0.1/";
      const result = getBaseUri(uri);
      expect(result).toBe("https://example.com/api/v1/schema/rgb-color/");
    });

    it("should remove single version number", () => {
      const uri = "https://example.com/api/v1/core/hex-color/0/";
      const result = getBaseUri(uri);
      expect(result).toBe("https://example.com/api/v1/core/hex-color/");
    });

    it("should remove latest version", () => {
      const uri = "https://example.com/api/v1/schema/rgb-color/latest/";
      const result = getBaseUri(uri);
      expect(result).toBe("https://example.com/api/v1/schema/rgb-color/");
    });

    it("should handle relative paths", () => {
      const uri = "/api/v1/schema/rgb-color/0.0.1/";
      const result = getBaseUri(uri);
      expect(result).toBe("/api/v1/schema/rgb-color/");
    });
  });

  describe("parseSemverFromUri", () => {
    it("should parse full semantic version", () => {
      const uri = "https://example.com/api/v1/schema/rgb-color/0.0.1/";
      const result = parseSemverFromUri(uri);
      expect(result).toEqual({ major: 0, minor: 0, patch: 1 });
    });

    it("should parse single number version", () => {
      const uri = "https://example.com/api/v1/core/hex-color/0/";
      const result = parseSemverFromUri(uri);
      expect(result).toEqual({ major: 0 });
    });

    it("should return null for latest version", () => {
      const uri = "https://example.com/api/v1/schema/rgb-color/latest/";
      const result = parseSemverFromUri(uri);
      expect(result).toBeNull();
    });

    it("should handle multi-digit versions", () => {
      const uri = "https://example.com/api/v1/schema/rgb-color/12.34.56/";
      const result = parseSemverFromUri(uri);
      expect(result).toEqual({ major: 12, minor: 34, patch: 56 });
    });
  });

  describe("generateVersionCandidates", () => {
    it("should generate candidates for full semantic version", () => {
      const uri = "https://example.com/api/v1/schema/rgb-color/0.0.1/";
      const candidates = generateVersionCandidates(uri);

      expect(candidates).toEqual([
        "https://example.com/api/v1/schema/rgb-color/0.0.1/",
        "https://example.com/api/v1/schema/rgb-color/0.0/",
        "https://example.com/api/v1/schema/rgb-color/0/",
        "https://example.com/api/v1/schema/rgb-color/latest/",
      ]);
    });

    it("should generate candidates for version with minor", () => {
      const uri = "https://example.com/api/v1/schema/rgb-color/1.2.3/";
      const candidates = generateVersionCandidates(uri);

      expect(candidates).toEqual([
        "https://example.com/api/v1/schema/rgb-color/1.2.3/",
        "https://example.com/api/v1/schema/rgb-color/1.2/",
        "https://example.com/api/v1/schema/rgb-color/1/",
        "https://example.com/api/v1/schema/rgb-color/latest/",
      ]);
    });

    it("should only return original for latest version", () => {
      const uri = "https://example.com/api/v1/schema/rgb-color/latest/";
      const candidates = generateVersionCandidates(uri);

      expect(candidates).toEqual(["https://example.com/api/v1/schema/rgb-color/latest/"]);
    });
  });

  describe("compareVersions", () => {
    it("should compare major versions", () => {
      expect(compareVersions({ major: 2, minor: 0, patch: 0 }, { major: 1, minor: 0, patch: 0 })).toBeGreaterThan(0);
      expect(compareVersions({ major: 1, minor: 0, patch: 0 }, { major: 2, minor: 0, patch: 0 })).toBeLessThan(0);
    });

    it("should compare minor versions when major is equal", () => {
      expect(compareVersions({ major: 1, minor: 5, patch: 0 }, { major: 1, minor: 3, patch: 0 })).toBeGreaterThan(0);
      expect(compareVersions({ major: 1, minor: 3, patch: 0 }, { major: 1, minor: 5, patch: 0 })).toBeLessThan(0);
    });

    it("should compare patch versions when major and minor are equal", () => {
      expect(compareVersions({ major: 1, minor: 2, patch: 5 }, { major: 1, minor: 2, patch: 3 })).toBeGreaterThan(0);
      expect(compareVersions({ major: 1, minor: 2, patch: 3 }, { major: 1, minor: 2, patch: 5 })).toBeLessThan(0);
    });

    it("should return 0 for equal versions", () => {
      expect(compareVersions({ major: 1, minor: 2, patch: 3 }, { major: 1, minor: 2, patch: 3 })).toBe(0);
    });
  });

  describe("buildFetchUrl", () => {
    it("should build fetch URL with default format", () => {
      const url = buildFetchUrl("rgb-color", "latest");
      expect(url).toBe("https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/latest/?format=json");
    });

    it("should build fetch URL with custom format", () => {
      const url = buildFetchUrl("rgb-color", "0.0.1", { format: "yaml" });
      expect(url).toBe("https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0.0.1/?format=yaml");
    });

    it("should build fetch URL for core type", () => {
      const url = buildFetchUrl("hex-color", "0", { category: "core" });
      expect(url).toBe("https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/hex-color/0/?format=json");
    });
  });

  describe("extractSchemaName", () => {
    it("should extract schema name from URI", () => {
      const uri = "https://example.com/api/v1/schema/rgb-color/0.0.1/";
      expect(extractSchemaName(uri)).toBe("rgb-color");
    });

    it("should return null for invalid URI", () => {
      expect(extractSchemaName("invalid-uri")).toBeNull();
    });
  });

  describe("extractVersion", () => {
    it("should extract version from URI", () => {
      const uri = "https://example.com/api/v1/schema/rgb-color/0.0.1/";
      expect(extractVersion(uri)).toEqual({ major: 0, minor: 0, patch: 1 });
    });

    it("should return null for invalid URI", () => {
      expect(extractVersion("invalid-uri")).toBeNull();
    });
  });

  describe("Type Checking Functions", () => {
    it("should identify core types", () => {
      const uri = "https://example.com/api/v1/core/hex-color/0/";
      expect(isCoreType(uri)).toBe(true);
      expect(isSchemaType(uri)).toBe(false);
      expect(isFunctionType(uri)).toBe(false);
    });

    it("should identify schema types", () => {
      const uri = "https://example.com/api/v1/schema/rgb-color/0.0.1/";
      expect(isSchemaType(uri)).toBe(true);
      expect(isCoreType(uri)).toBe(false);
      expect(isFunctionType(uri)).toBe(false);
    });

    it("should identify function types", () => {
      const uri = "https://example.com/api/v1/function/darken/1.0.0/";
      expect(isFunctionType(uri)).toBe(true);
      expect(isCoreType(uri)).toBe(false);
      expect(isSchemaType(uri)).toBe(false);
    });
  });

  describe("updateVersion", () => {
    it("should update version in URI", () => {
      const uri = "https://example.com/api/v1/schema/rgb-color/0.0.1/";
      const updated = updateVersion(uri, "1.0.0");
      expect(updated).toBe("https://example.com/api/v1/schema/rgb-color/1.0.0/");
    });

    it("should throw for invalid URI", () => {
      expect(() => updateVersion("invalid-uri", "1.0.0")).toThrow("Invalid schema URI");
    });
  });

  describe("normalizeUri", () => {
    it("should add trailing slash if missing", () => {
      const uri = "https://example.com/api/v1/schema/rgb-color/0.0.1";
      expect(normalizeUri(uri)).toBe("https://example.com/api/v1/schema/rgb-color/0.0.1/");
    });

    it("should keep trailing slash if present", () => {
      const uri = "https://example.com/api/v1/schema/rgb-color/0.0.1/";
      expect(normalizeUri(uri)).toBe("https://example.com/api/v1/schema/rgb-color/0.0.1/");
    });
  });

  describe("removeVersionFromUri", () => {
    it("should remove single digit version", () => {
      const uri = "https://example.com/api/v1/core/hex-color/0/";
      expect(removeVersionFromUri(uri)).toBe("https://example.com/api/v1/core/hex-color/");
    });

    it("should handle multi-digit version", () => {
      const uri = "https://example.com/api/v1/core/hex-color/12/";
      expect(removeVersionFromUri(uri)).toBe("https://example.com/api/v1/core/hex-color/");
    });
  });

  describe("isSameSchema", () => {
    it("should return true for same schema with different versions", () => {
      const uri1 = "https://example.com/api/v1/schema/rgb-color/0.0.1/";
      const uri2 = "https://example.com/api/v1/schema/rgb-color/1.0.0/";
      expect(isSameSchema(uri1, uri2)).toBe(true);
    });

    it("should return false for different schemas", () => {
      const uri1 = "https://example.com/api/v1/schema/rgb-color/0.0.1/";
      const uri2 = "https://example.com/api/v1/schema/hsl-color/0.0.1/";
      expect(isSameSchema(uri1, uri2)).toBe(false);
    });

    it("should return false for different categories", () => {
      const uri1 = "https://example.com/api/v1/schema/hex-color/0/";
      const uri2 = "https://example.com/api/v1/core/hex-color/0/";
      expect(isSameSchema(uri1, uri2)).toBe(false);
    });

    it("should handle relative paths", () => {
      const uri1 = "/api/v1/schema/rgb-color/0.0.1/";
      const uri2 = "/api/v1/schema/rgb-color/1.0.0/";
      expect(isSameSchema(uri1, uri2)).toBe(true);
    });
  });
});
