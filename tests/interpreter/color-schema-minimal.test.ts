import { describe, expect, it } from "vitest";
import { ColorSpecificationSchema, MINIMAL_COLOR_SPECIFICATION } from "../../src/interpreter/config/managers/color/schema";

describe("Minimal Color Specification", () => {
  it("should always be valid according to ColorSpecificationSchema", () => {
    // This test ensures that MINIMAL_COLOR_SPECIFICATION is always valid
    // and can be used as a default template for new color specifications
    expect(() => {
      ColorSpecificationSchema.parse(MINIMAL_COLOR_SPECIFICATION);
    }).not.toThrow();
  });

  it("should have the expected minimal structure", () => {
    const parsed = ColorSpecificationSchema.parse(MINIMAL_COLOR_SPECIFICATION);
    
    // Verify required fields are present
    expect(parsed.name).toBe("MinimalColor");
    expect(parsed.type).toBe("color");
    expect(parsed.schema).toEqual({
      type: "object",
      properties: {
        value: {
          type: "string"
        }
      }
    });
    expect(parsed.initializers).toHaveLength(1);
    expect(parsed.initializers[0].keyword).toBe("minimal");
    expect(parsed.initializers[0].script.type).toBe("https://schema.example.com/tokenscript/0/");
    expect(parsed.initializers[0].script.script).toBe("return {input};");
    expect(parsed.conversions).toEqual([]);
  });

  it("should be serializable to JSON and back", () => {
    // Ensure the minimal spec can be safely serialized and deserialized
    const jsonString = JSON.stringify(MINIMAL_COLOR_SPECIFICATION);
    const parsed = JSON.parse(jsonString);
    
    // Should still be valid after JSON round-trip
    expect(() => {
      ColorSpecificationSchema.parse(parsed);
    }).not.toThrow();
    
    // Should be identical after round-trip
    expect(parsed).toEqual(MINIMAL_COLOR_SPECIFICATION);
  });
});