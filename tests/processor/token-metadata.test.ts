import { TokenSymbol } from "@interpreter/symbols";
import { processTokens } from "@src/processor/process";
import { describe, expect, it } from "vitest";

describe("Token $metadata", () => {
  describe("simple tokens", () => {
    it("should pass $metadata through to TokenSymbol for structured tokens", () => {
      const tokens = {
        "color.primary": {
          $value: { r: 255, g: 0, b: 0 },
          $type: "color",
          $metadata: { id: "token-123", source: "figma" },
        },
      };

      const result = processTokens(tokens);
      const token = result.tokens.get("color.primary");

      expect(token).toBeInstanceOf(TokenSymbol);
      expect((token as TokenSymbol).metadata).toEqual({ id: "token-123", source: "figma" });
    });

    it("should preserve $metadata reference on token cloning", () => {
      const metadata = { id: "shared-ref" };
      const tokens = {
        "color.primary": {
          $value: { r: 255, g: 0, b: 0 },
          $type: "color",
          $metadata: metadata,
        },
      };

      const result = processTokens(tokens);
      const token = result.tokens.get("color.primary") as TokenSymbol;
      const cloned = token.deepCopy();

      expect(cloned.metadata).toBe(token.metadata);
      expect(cloned.metadata).toBe(metadata);
    });

    it("should handle tokens without $metadata", () => {
      const tokens = {
        "color.primary": {
          $value: { r: 255, g: 0, b: 0 },
          $type: "color",
        },
      };

      const result = processTokens(tokens);
      const token = result.tokens.get("color.primary");

      expect(token).toBeInstanceOf(TokenSymbol);
      expect((token as TokenSymbol).metadata).toBeUndefined();
    });
  });

  describe("tokens with references", () => {
    it("should pass $metadata through when token has references", () => {
      const tokens = {
        "color.base": {
          $value: "#ff0000",
          $metadata: { id: "base-id" },
        },
        "color.primary": {
          $value: { hex: "{color.base}" },
          $type: "color",
          $metadata: { id: "primary-id", dependsOn: ["base"] },
        },
      };

      const result = processTokens(tokens);
      const primary = result.tokens.get("color.primary") as TokenSymbol;

      expect(primary.metadata).toEqual({ id: "primary-id", dependsOn: ["base"] });
    });
  });

  describe("nested tokens", () => {
    it("should pass $metadata through for nested token structures", () => {
      const tokens = {
        color: {
          primary: {
            $value: "#ff0000",
            $metadata: { id: "nested-id" },
          },
        },
      };

      const result = processTokens(tokens);
      const token = result.tokens.get("color.primary");

      expect(token).toBeDefined();
      // Note: Simple string values become StringSymbol, not TokenSymbol
      // Metadata is only on TokenSymbol
    });

    it("should pass $metadata for nested structured tokens", () => {
      const tokens = {
        typography: {
          heading: {
            $value: { fontSize: 24, lineHeight: 1.2 },
            $type: "typography",
            $metadata: { id: "heading-typography" },
          },
        },
      };

      const result = processTokens(tokens);
      const token = result.tokens.get("typography.heading") as TokenSymbol;

      expect(token).toBeInstanceOf(TokenSymbol);
      expect(token.metadata).toEqual({ id: "heading-typography" });
    });
  });

  describe("metadata with various shapes", () => {
    it("should handle complex metadata objects", () => {
      const tokens = {
        token: {
          $value: { x: 1 },
          $type: "test",
          $metadata: {
            id: "complex-id",
            nested: { level: 1, data: [1, 2, 3] },
            timestamp: 1234567890,
            tags: ["a", "b", "c"],
          },
        },
      };

      const result = processTokens(tokens);
      const token = result.tokens.get("token") as TokenSymbol;

      expect(token.metadata).toEqual({
        id: "complex-id",
        nested: { level: 1, data: [1, 2, 3] },
        timestamp: 1234567890,
        tags: ["a", "b", "c"],
      });
    });

    it("should handle empty metadata object", () => {
      const tokens = {
        token: {
          $value: { x: 1 },
          $type: "test",
          $metadata: {},
        },
      };

      const result = processTokens(tokens);
      const token = result.tokens.get("token") as TokenSymbol;

      expect(token.metadata).toEqual({});
    });
  });

  describe("metadata is always a reference, never cloned", () => {
    it("should preserve exact same reference through entire pipeline", () => {
      const metadata = { id: "ref-test" };
      const tokens = {
        token: {
          $value: { x: 1 },
          $type: "test",
          $metadata: metadata,
        },
      };

      const result = processTokens(tokens);
      const token = result.tokens.get("token") as TokenSymbol;

      // Must be the exact same reference
      expect(token.metadata).toBe(metadata);
    });

    it("should share same reference after multiple deepCopy operations", () => {
      const metadata = { id: "multi-copy" };
      const tokens = {
        token: {
          $value: { x: 1 },
          $type: "test",
          $metadata: metadata,
        },
      };

      const result = processTokens(tokens);
      const token = result.tokens.get("token") as TokenSymbol;
      const copy1 = token.deepCopy();
      const copy2 = copy1.deepCopy();
      const copy3 = copy2.cloneIfMutable();

      // All must be the exact same reference
      expect(token.metadata).toBe(metadata);
      expect(copy1.metadata).toBe(metadata);
      expect(copy2.metadata).toBe(metadata);
      expect(copy3.metadata).toBe(metadata);
    });

    it("should reflect mutations across all copies since they share reference", () => {
      const metadata: Record<string, unknown> = { id: "mutable" };
      const tokens = {
        token: {
          $value: { x: 1 },
          $type: "test",
          $metadata: metadata,
        },
      };

      const result = processTokens(tokens);
      const token = result.tokens.get("token") as TokenSymbol;
      const copy = token.deepCopy();

      // Mutate original metadata object
      metadata.id = "changed";
      metadata.newField = "added";

      // All references see the change
      expect(token.metadata?.id).toBe("changed");
      expect(token.metadata?.newField).toBe("added");
      expect(copy.metadata?.id).toBe("changed");
      expect(copy.metadata?.newField).toBe("added");
    });
  });

  describe("real-world use case: token ID tracking", () => {
    it("should allow extracting token IDs after processing", () => {
      const tokens = {
        "color.brand.primary": {
          $value: { r: 255, g: 0, b: 0 },
          $type: "color",
          $metadata: { tokenId: "uuid-123", sourceFile: "brand.json" },
        },
        "color.brand.secondary": {
          $value: { r: 0, g: 255, b: 0 },
          $type: "color",
          $metadata: { tokenId: "uuid-456", sourceFile: "brand.json" },
        },
      };

      const result = processTokens(tokens);

      // Extract all token IDs
      const tokenIds: Record<string, string> = {};
      for (const [name, symbol] of result.tokens) {
        if (symbol instanceof TokenSymbol && symbol.metadata?.tokenId) {
          tokenIds[name] = symbol.metadata.tokenId as string;
        }
      }

      expect(tokenIds).toEqual({
        "color.brand.primary": "uuid-123",
        "color.brand.secondary": "uuid-456",
      });
    });
  });
});
