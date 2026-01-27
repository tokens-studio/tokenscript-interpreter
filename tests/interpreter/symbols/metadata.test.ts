import { NumberSymbol, StringSymbol, TokenSymbol } from "@interpreter/symbols";
import { describe, expect, it } from "vitest";

describe("TokenSymbol metadata", () => {
  describe("constructor", () => {
    it("should create token without metadata", () => {
      const token = new TokenSymbol("typography", {
        fontSize: new NumberSymbol(16),
      });
      expect(token.metadata).toBeUndefined();
    });

    it("should create token with metadata", () => {
      const metadata = { id: "token-123", source: "figma" };
      const token = new TokenSymbol("typography", { fontSize: new NumberSymbol(16) }, undefined, metadata);
      expect(token.metadata).toBe(metadata);
      expect(token.metadata?.id).toBe("token-123");
      expect(token.metadata?.source).toBe("figma");
    });

    it("should accept any shape of metadata", () => {
      const metadata = {
        id: "token-456",
        nested: { level: 1, data: [1, 2, 3] },
        timestamp: Date.now(),
      };
      const token = new TokenSymbol("color", null, undefined, metadata);
      expect(token.metadata).toBe(metadata);
    });
  });

  describe("deepCopy preserves metadata reference", () => {
    it("should preserve the same metadata reference on deepCopy for record token", () => {
      const metadata = { id: "original-id" };
      const original = new TokenSymbol("typography", { fontSize: new NumberSymbol(16) }, undefined, metadata);

      const copy = original.deepCopy();

      // Metadata should be the same reference
      expect(copy.metadata).toBe(original.metadata);
      expect(copy.metadata).toBe(metadata);

      // But the token itself should be a new instance
      expect(copy).not.toBe(original);
      expect(copy.value).not.toBe(original.value);
    });

    it("should preserve the same metadata reference on deepCopy for list token", () => {
      const metadata = { id: "shadow-id" };
      const original = new TokenSymbol("shadow", [new NumberSymbol(1), new NumberSymbol(2)], undefined, metadata);

      const copy = original.deepCopy();

      // Metadata should be the same reference
      expect(copy.metadata).toBe(original.metadata);
      expect(copy.metadata).toBe(metadata);

      // But the token itself should be a new instance
      expect(copy).not.toBe(original);
      expect(copy.value).not.toBe(original.value);
    });

    it("should preserve undefined metadata on deepCopy", () => {
      const original = new TokenSymbol("typography", { fontSize: new NumberSymbol(16) });

      const copy = original.deepCopy();

      expect(copy.metadata).toBeUndefined();
      expect(original.metadata).toBeUndefined();
    });
  });

  describe("cloneIfMutable preserves metadata reference", () => {
    it("should preserve the same metadata reference on cloneIfMutable", () => {
      const metadata = { id: "clone-id" };
      const original = new TokenSymbol("typography", { fontSize: new NumberSymbol(16) }, undefined, metadata);

      const clone = original.cloneIfMutable();

      // Metadata should be the same reference
      expect(clone.metadata).toBe(original.metadata);
      expect(clone.metadata).toBe(metadata);
    });
  });

  describe("metadata is not accessible via getAttribute", () => {
    it("should not expose metadata through hasAttribute", () => {
      const metadata = { id: "hidden-id" };
      const token = new TokenSymbol("typography", { fontSize: new NumberSymbol(16) }, undefined, metadata);

      expect(token.hasAttribute("metadata")).toBe(false);
    });

    it("should not expose metadata through getAttribute", () => {
      const metadata = { id: "hidden-id" };
      const token = new TokenSymbol("typography", { fontSize: new NumberSymbol(16) }, undefined, metadata);

      expect(token.getAttribute("metadata")).toBe(null);
    });
  });

  describe("metadata mutations are reflected across copies", () => {
    it("should reflect metadata changes in copies since they share the same reference", () => {
      const metadata: Record<string, unknown> = { id: "mutable-id" };
      const original = new TokenSymbol("typography", { fontSize: new NumberSymbol(16) }, undefined, metadata);

      const copy = original.deepCopy();

      // Mutate metadata through original
      metadata.id = "changed-id";
      metadata.newField = "added";

      // Copy should see the changes
      expect(copy.metadata?.id).toBe("changed-id");
      expect(copy.metadata?.newField).toBe("added");
    });
  });

  describe("metadata can be set after construction", () => {
    it("should allow setting metadata after token creation", () => {
      const token = new TokenSymbol("typography", { fontSize: new NumberSymbol(16) });
      expect(token.metadata).toBeUndefined();

      token.metadata = { id: "late-set-id" };
      expect(token.metadata?.id).toBe("late-set-id");
    });

    it("should preserve late-set metadata on deepCopy", () => {
      const token = new TokenSymbol("typography", { fontSize: new NumberSymbol(16) });
      const metadata = { id: "late-set-id" };
      token.metadata = metadata;

      const copy = token.deepCopy();

      expect(copy.metadata).toBe(metadata);
    });
  });

  describe("metadata is always a reference, never cloned", () => {
    it("should share same reference after multiple deepCopy operations", () => {
      const metadata = { id: "multi-copy" };
      const original = new TokenSymbol("test", { x: new NumberSymbol(1) }, undefined, metadata);

      const copy1 = original.deepCopy();
      const copy2 = copy1.deepCopy();
      const copy3 = copy2.cloneIfMutable();

      // All must be the exact same reference
      expect(original.metadata).toBe(metadata);
      expect(copy1.metadata).toBe(metadata);
      expect(copy2.metadata).toBe(metadata);
      expect(copy3.metadata).toBe(metadata);
    });
  });

  describe("real-world use case: token id tracking", () => {
    it("should track token id through processing pipeline simulation", () => {
      // Simulate creating a token with an ID for tracking
      const metadata = { tokenId: "color.primary", sourceFile: "tokens.json" };
      const original = new TokenSymbol("color", { value: new StringSymbol("#ff0000") }, undefined, metadata);

      // Simulate processing that creates copies
      const processed = original.deepCopy();
      (processed.value as Map<string, unknown>).set("processed", new StringSymbol("true"));

      // The metadata should still be accessible for extraction
      expect(processed.metadata?.tokenId).toBe("color.primary");
      expect(processed.metadata?.sourceFile).toBe("tokens.json");

      // And it should be the same reference
      expect(processed.metadata).toBe(original.metadata);
    });
  });
});
