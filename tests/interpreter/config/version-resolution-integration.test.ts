import { describe, expect, it } from "vitest";
import { ColorManager } from "@interpreter/config/managers/color/manager";

describe("Version Resolution Integration with ColorManager", () => {
  it("should resolve schema versions from most specific to least specific", () => {
    const manager = new ColorManager(new Map());
    
    // Register multiple versions of the same schema
    const baseUri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color";
    
    manager.register(`${baseUri}/1.0.0/`, {
      name: "RGB",
      type: "color",
      description: "v1.0.0 spec",
      schema: { type: "object", properties: { r: { type: "number" } } },
      initializers: [],
      conversions: [],
    });
    
    manager.register(`${baseUri}/1.2/`, {
      name: "RGB",
      type: "color", 
      description: "v1.2 spec",
      schema: { type: "object", properties: { r: { type: "number" } } },
      initializers: [],
      conversions: [],
    });
    
    manager.register(`${baseUri}/2/`, {
      name: "RGB",
      type: "color",
      description: "v2 spec", 
      schema: { type: "object", properties: { r: { type: "number" } } },
      initializers: [],
      conversions: [],
    });

    // Test exact match (should return v1.0.0)
    let spec = manager.getSpec(`${baseUri}/1.0.0/`);
    expect(spec?.description).toBe("v1.0.0 spec");
    
    // Test partial match that resolves to v1.2 (1.2.1 -> 1.2)
    spec = manager.getSpec(`${baseUri}/1.2.1/`);
    expect(spec?.description).toBe("v1.2 spec");
    
    // Test partial match that resolves to v2 (2.1.0 -> 2)
    spec = manager.getSpec(`${baseUri}/2.1.0/`);
    expect(spec?.description).toBe("v2 spec");
    
    // Test a more nuanced case: register intermediate version to show proper fallback
    manager.register(`${baseUri}/1/`, {
      name: "RGB",
      type: "color",
      description: "v1 spec",
      schema: { type: "object", properties: { r: { type: "number" } } },
      initializers: [],
      conversions: [],
    });
    
    // Now 1.0.5 should resolve to 1/ since 1.0/ is not available
    spec = manager.getSpec(`${baseUri}/1.0.5/`);
    expect(spec?.description).toBe("v1 spec");
  });

  it("should resolve /latest/ to the highest semantic version", () => {
    const manager = new ColorManager(new Map());
    
    const baseUri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color";
    
    // Register versions out of order
    manager.register(`${baseUri}/0.9.0/`, {
      name: "HSL",
      type: "color",
      description: "v0.9.0 spec",
      schema: { type: "object", properties: { h: { type: "number" } } },
      initializers: [],
      conversions: [],
    });
    
    manager.register(`${baseUri}/1.2.3/`, {
      name: "HSL", 
      type: "color",
      description: "v1.2.3 spec (latest)",
      schema: { type: "object", properties: { h: { type: "number" } } },
      initializers: [],
      conversions: [],
    });
    
    manager.register(`${baseUri}/1.0.0/`, {
      name: "HSL",
      type: "color", 
      description: "v1.0.0 spec",
      schema: { type: "object", properties: { h: { type: "number" } } },
      initializers: [],
      conversions: [],
    });

    // Test /latest/ resolution
    let spec = manager.getSpec(`${baseUri}/latest/`);
    expect(spec?.description).toBe("v1.2.3 spec (latest)");
    
    // Test fallback to latest when version doesn't exist (3.0.0 -> latest -> 1.2.3)
    spec = manager.getSpec(`${baseUri}/3.0.0/`);
    expect(spec?.description).toBe("v1.2.3 spec (latest)");
  });

  it("should handle conversion resolution with version fallback", () => {
    const manager = new ColorManager(new Map());
    
    const hexUri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hex-color";
    const rgbUri = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color";
    
    // First register RGB color schema so the conversion target exists
    manager.register(`${rgbUri}/1/`, {
      name: "RGB",
      type: "color",
      description: "RGB color v1",
      schema: { 
        type: "object", 
        properties: { 
          r: { type: "number" },
          g: { type: "number" }, 
          b: { type: "number" }
        }
      },
      initializers: [],
      conversions: [],
    });
    
    // Register hex color schema with conversion pointing to a version that should resolve to RGB v1
    manager.register(`${hexUri}/1.0.0/`, {
      name: "Hex",
      type: "color",
      description: "Hex color v1.0.0",
      schema: { 
        type: "object", 
        properties: { value: { type: "string" } }
      },
      initializers: [],
      conversions: [{
        source: "$self",
        target: `${rgbUri}/1.0/`, // This should resolve to 1/ through version fallback
        lossless: false,
        script: {
          type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/conversion",
          script: "return Color.RGB(255, 0, 0);" // Simple conversion for test
        }
      }],
    });

    // Test that conversion can resolve versions
    // The conversion is registered as Hex 1.0.0/ -> RGB 1.0/, but RGB 1.0/ should resolve to RGB 1/
    expect(manager.hasConversion(`${hexUri}/1.0.0/`, `${rgbUri}/1.0/`)).toBe(true);
    expect(manager.hasConversion(`${hexUri}/1.0.0/`, `${rgbUri}/1.1/`)).toBe(true); // Should also resolve to RGB 1/
    expect(manager.hasConversion(`${hexUri}/1.0.0/`, `${rgbUri}/1/`)).toBe(true); // Direct match
  });

  it("should return undefined when no version can be resolved", () => {
    const manager = new ColorManager(new Map());
    
    // Register a schema
    manager.register("https://schema.example.com/color/1.0.0/", {
      name: "TestColor",
      type: "color",
      description: "Test color",
      schema: { type: "object", properties: { value: { type: "string" } } },
      initializers: [],
      conversions: [],
    });

    // Try to get a completely different schema
    const spec = manager.getSpec("https://schema.example.com/other-color/1.0.0/");
    expect(spec).toBeUndefined();
  });
});