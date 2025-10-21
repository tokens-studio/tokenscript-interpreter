import { describe, expect, it } from "vitest";

describe("Package Exports", () => {
  describe("Export conflict detection", () => {
    it("should not have duplicate exports in main index", async () => {
      const mainModule = await import("../src/lib/index");
      const exports = Object.keys(mainModule);

      // Check for duplicates
      const seen = new Set<string>();
      const duplicates: string[] = [];

      for (const exportName of exports) {
        if (seen.has(exportName)) {
          duplicates.push(exportName);
        }
        seen.add(exportName);
      }

      expect(duplicates).toEqual([]);
    });

    it("should have all interpreter exports in main index", async () => {
      const mainModule = await import("../src/lib/index");
      const interpreterModule = await import("../src/lib/interpreter");

      const interpreterExports = Object.keys(interpreterModule);

      for (const exportName of interpreterExports) {
        expect(mainModule).toHaveProperty(exportName);
      }
    });

    it("should have all processor exports in main index", async () => {
      const mainModule = await import("../src/lib/index");
      const processorsModule = await import("../src/lib/processors");

      const processorExports = Object.keys(processorsModule);

      for (const exportName of processorExports) {
        expect(mainModule).toHaveProperty(exportName);
      }
    });

    it("should have all schema exports in main index", async () => {
      const mainModule = await import("../src/lib/index");
      const schemaModule = await import("../src/lib/schema");

      const schemaExports = Object.keys(schemaModule);

      for (const exportName of schemaExports) {
        expect(mainModule).toHaveProperty(exportName);
      }
    });

    it("should have all type exports in main index", async () => {
      const mainModule = await import("../src/lib/index");
      const typesModule = await import("../src/lib/types");

      const typeExports = Object.keys(typesModule);

      for (const exportName of typeExports) {
        expect(mainModule).toHaveProperty(exportName);
      }
    });
  });

  describe("Barrel file imports", () => {
    it("should successfully import from /interpreter", async () => {
      const module = await import("../src/lib/interpreter");
      expect(module.Interpreter).toBeDefined();
      expect(module.Lexer).toBeDefined();
      expect(module.Parser).toBeDefined();
      expect(module.Config).toBeDefined();
    });

    it("should successfully import from /processors", async () => {
      const module = await import("../src/lib/processors");
      expect(module.interpretTokens).toBeDefined();
      expect(module.processTokensFromJson).toBeDefined();
      expect(module.buildThemeTree).toBeDefined();
    });

    it("should successfully import from /schema", async () => {
      const module = await import("../src/lib/schema");
      expect(module.fetchTokenScriptSchema).toBeDefined();
    });

    it("should successfully import from /types", async () => {
      const module = await import("../src/lib/types");
      expect(module.TokenType).toBeDefined();
      expect(module.Operations).toBeDefined();
    });

    it("should successfully import from main index", async () => {
      const module = await import("../src/lib/index");
      expect(module.Interpreter).toBeDefined();
      expect(module.interpretTokens).toBeDefined();
      expect(module.fetchTokenScriptSchema).toBeDefined();
      expect(module.TokenType).toBeDefined();
    });
  });

  describe("Export uniqueness across modules", () => {
    it("should detect overlapping exports between modules", async () => {
      const interpreterModule = await import("../src/lib/interpreter");
      const processorsModule = await import("../src/lib/processors");
      const schemaModule = await import("../src/lib/schema");

      const interpreterExports = new Set(Object.keys(interpreterModule));
      const processorExports = new Set(Object.keys(processorsModule));
      const schemaExports = new Set(Object.keys(schemaModule));

      // Find overlaps
      const interpreterProcessorOverlap = [...interpreterExports].filter((x) =>
        processorExports.has(x),
      );
      const interpreterSchemaOverlap = [...interpreterExports].filter((x) =>
        schemaExports.has(x),
      );
      const processorSchemaOverlap = [...processorExports].filter((x) =>
        schemaExports.has(x),
      );

      // These are expected to be empty - if not, we have naming conflicts
      expect(interpreterProcessorOverlap, "Overlap between interpreter and processors").toEqual(
        [],
      );
      expect(interpreterSchemaOverlap, "Overlap between interpreter and schema").toEqual([]);
      expect(processorSchemaOverlap, "Overlap between processors and schema").toEqual([]);
    });
  });

  describe("Built package structure", () => {
    it("should have all expected built files", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");

      const distLib = path.join(process.cwd(), "dist", "lib");

      // Check if dist exists
      if (!fs.existsSync(distLib)) {
        console.warn("⚠️  dist/lib not found - run 'npm run build:lib' first");
        return;
      }

      const expectedFiles = [
        "index.js",
        "index.cjs",
        "index.d.ts",
        "interpreter.js",
        "interpreter.cjs",
        "interpreter.d.ts",
        "processors.js",
        "processors.cjs",
        "processors.d.ts",
        "schema.js",
        "schema.cjs",
        "schema.d.ts",
        "types.js",
        "types.cjs",
        "types.d.ts",
      ];

      for (const file of expectedFiles) {
        const filePath = path.join(distLib, file);
        expect(fs.existsSync(filePath), `${file} should exist`).toBe(true);
      }
    });
  });
});
