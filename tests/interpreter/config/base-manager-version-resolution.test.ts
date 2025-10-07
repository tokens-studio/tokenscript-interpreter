import { describe, expect, it } from "vitest";
import { BaseManager } from "@interpreter/config/managers/base-manager";

// Create a test implementation of BaseManager
class TestManager extends BaseManager<string, string, string> {
  public register(uri: string, spec: string): string {
    this.specs.set(uri, spec);
    return spec;
  }

  protected getSpecName(spec: string): string {
    return spec;
  }

  public clone(): this {
    const manager = new TestManager();
    manager.specs = this.specs;
    manager.specTypes = this.specTypes;
    manager.conversions = this.conversions;
    return manager as this;
  }

  // Expose protected methods for testing
  public testParseSemverFromUri(uri: string) {
    return this.parseSemverFromUri(uri);
  }

  public testGetBaseUri(uri: string) {
    return this.getBaseUri(uri);
  }

  public testGenerateVersionCandidates(uri: string) {
    return this.generateVersionCandidates(uri);
  }

  public testResolveVersionUri(uri: string) {
    return this.resolveVersionUri(uri);
  }

  public testFindLatestVersion(baseUri: string) {
    return this.findLatestVersion(baseUri);
  }

  public testCompareVersions(a: { major: number; minor: number; patch: number }, b: { major: number; minor: number; patch: number }) {
    return this.compareVersions(a, b);
  }
}

describe("BaseManager Version Resolution", () => {
  describe("parseSemverFromUri", () => {
    it("should parse full semantic versions", () => {
      const manager = new TestManager();
      
      expect(manager.testParseSemverFromUri("/api/v1/schema/srgb-color/1.2.3/")).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
      });
      
      expect(manager.testParseSemverFromUri("/api/v1/schema/srgb-color/0.0.1/")).toEqual({
        major: 0,
        minor: 0,
        patch: 1,
      });
    });

    it("should parse single version numbers", () => {
      const manager = new TestManager();
      
      expect(manager.testParseSemverFromUri("/api/v1/schema/srgb-color/1/")).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
      });
      
      expect(manager.testParseSemverFromUri("/api/v1/schema/srgb-color/0/")).toEqual({
        major: 0,
        minor: 0,
        patch: 0,
      });
    });

    it("should return null for invalid versions", () => {
      const manager = new TestManager();
      
      expect(manager.testParseSemverFromUri("/api/v1/schema/srgb-color/latest/")).toBeNull();
      expect(manager.testParseSemverFromUri("/api/v1/schema/srgb-color/")).toBeNull();
      expect(manager.testParseSemverFromUri("/api/v1/schema/srgb-color/invalid/")).toBeNull();
    });
  });

  describe("getBaseUri", () => {
    it("should remove version from URI", () => {
      const manager = new TestManager();
      
      expect(manager.testGetBaseUri("/api/v1/schema/srgb-color/1.2.3/")).toBe("/api/v1/schema/srgb-color/");
      expect(manager.testGetBaseUri("/api/v1/schema/srgb-color/0/")).toBe("/api/v1/schema/srgb-color/");
      expect(manager.testGetBaseUri("/api/v1/schema/srgb-color/latest/")).toBe("/api/v1/schema/srgb-color/");
    });
  });

  describe("generateVersionCandidates", () => {
    it("should generate candidates from most to least specific", () => {
      const manager = new TestManager();
      
      const candidates = manager.testGenerateVersionCandidates("/api/v1/schema/srgb-color/1.2.3/");
      expect(candidates).toEqual([
        "/api/v1/schema/srgb-color/1.2.3/",
        "/api/v1/schema/srgb-color/1.2/",
        "/api/v1/schema/srgb-color/1/",
        "/api/v1/schema/srgb-color/latest/",
      ]);
    });

    it("should handle single version numbers", () => {
      const manager = new TestManager();
      
      const candidates = manager.testGenerateVersionCandidates("/api/v1/schema/srgb-color/1/");
      expect(candidates).toEqual([
        "/api/v1/schema/srgb-color/1/",
        "/api/v1/schema/srgb-color/latest/",
      ]);
    });

    it("should handle latest URIs", () => {
      const manager = new TestManager();
      
      const candidates = manager.testGenerateVersionCandidates("/api/v1/schema/srgb-color/latest/");
      expect(candidates).toEqual([
        "/api/v1/schema/srgb-color/latest/",
      ]);
    });
  });

  describe("compareVersions", () => {
    it("should compare versions correctly", () => {
      const manager = new TestManager();
      
      expect(manager.testCompareVersions({ major: 1, minor: 2, patch: 3 }, { major: 1, minor: 2, patch: 3 })).toBe(0);
      expect(manager.testCompareVersions({ major: 1, minor: 2, patch: 4 }, { major: 1, minor: 2, patch: 3 })).toBe(1);
      expect(manager.testCompareVersions({ major: 1, minor: 2, patch: 2 }, { major: 1, minor: 2, patch: 3 })).toBe(-1);
      expect(manager.testCompareVersions({ major: 2, minor: 0, patch: 0 }, { major: 1, minor: 9, patch: 9 })).toBe(1);
    });
  });

  describe("version resolution integration", () => {
    it("should resolve to exact match first", () => {
      const manager = new TestManager();
      manager.register("/api/v1/schema/srgb-color/1.2.3/", "exact-spec");
      manager.register("/api/v1/schema/srgb-color/1.2/", "minor-spec");
      
      expect(manager.getSpec("/api/v1/schema/srgb-color/1.2.3/")).toBe("exact-spec");
    });

    it("should fallback to less specific versions", () => {
      const manager = new TestManager();
      manager.register("/api/v1/schema/srgb-color/1.2/", "minor-spec");
      manager.register("/api/v1/schema/srgb-color/1/", "major-spec");
      
      expect(manager.getSpec("/api/v1/schema/srgb-color/1.2.5/")).toBe("minor-spec");
      expect(manager.getSpec("/api/v1/schema/srgb-color/1.3.0/")).toBe("major-spec");
    });

    it("should resolve to latest version", () => {
      const manager = new TestManager();
      manager.register("/api/v1/schema/srgb-color/1.0.0/", "v1.0.0");
      manager.register("/api/v1/schema/srgb-color/1.2.3/", "v1.2.3");
      manager.register("/api/v1/schema/srgb-color/0.9.0/", "v0.9.0");
      
      expect(manager.getSpec("/api/v1/schema/srgb-color/latest/")).toBe("v1.2.3");
      expect(manager.getSpec("/api/v1/schema/srgb-color/2.0.0/")).toBe("v1.2.3"); // fallback to latest
    });

    it("should return undefined when no matches found", () => {
      const manager = new TestManager();
      manager.register("/api/v1/schema/other-color/1.0.0/", "other-spec");
      
      expect(manager.getSpec("/api/v1/schema/srgb-color/1.0.0/")).toBeUndefined();
    });
  });
});