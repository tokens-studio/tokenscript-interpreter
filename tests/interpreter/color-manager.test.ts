import { describe, it, expect, beforeEach } from "vitest";
import { ColorManager } from "../../interpreter/config/managers/color/manager";
import { ColorSymbol, NumberSymbol, StringSymbol } from "../../interpreter/symbols";
import { ReassignNode, IdentifierNode } from "../../interpreter/ast";
import { InterpreterError } from "../../interpreter/errors";
import * as fs from "node:fs";
import * as path from "node:path";

describe("ColorManager", () => {
  it("registers and retrieves the RGB color specification", () => {
    const rgbSpecPath = path.join(__dirname, "../../specifications/colors/rgb.json");
    const rgbSpecString = fs.readFileSync(rgbSpecPath, "utf-8");
    const manager = new ColorManager();

    const spec = manager.register(rgbSpecPath, JSON.parse(rgbSpecString));
    expect(spec).toBeDefined();
    expect(spec.name).toBe("RGB");

    const retrieved = manager.getSpec(rgbSpecPath);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("RGB");
  });

  describe("setAttribute", () => {
    let manager: ColorManager;
    let rgbSpecPath: string;

    beforeEach(() => {
      manager = new ColorManager();
      rgbSpecPath = path.join(__dirname, "../../specifications/colors/rgb.json");
      const rgbSpecString = fs.readFileSync(rgbSpecPath, "utf-8");
      manager.register(rgbSpecPath, JSON.parse(rgbSpecString));
    });

    const createMockToken = (value: string, line: number = 1) => ({
      type: "IDENTIFIER" as const,
      value,
      line,
    });

    const createReassignNode = (identifierName: string, attributeName?: string) => {
      const identifierToken = createMockToken(identifierName);
      const baseIdentifier = new IdentifierNode(identifierToken);
      
      if (attributeName) {
        const attributeToken = createMockToken(attributeName);
        const attributeIdentifier = new IdentifierNode(attributeToken);
        return new ReassignNode(
          [baseIdentifier, attributeIdentifier],
          new IdentifierNode(createMockToken("value")),
          identifierToken
        );
      } else {
        return new ReassignNode(
          baseIdentifier,
          new IdentifierNode(createMockToken("value")),
          identifierToken
        );
      }
    };

    it("successfully sets a valid attribute on a color symbol", () => {
      const color = new ColorSymbol(null, "RGB");
      const node = createReassignNode("myColor", "r");
      const attributeValue = new NumberSymbol(255);

      const result = manager.setAttribute(color, node, attributeValue);

      expect(result).toBe(color);
      expect(color.value).toEqual({ r: attributeValue });
    });

    it("throws error when trying to set attributes on a string color value", () => {
      const color = new ColorSymbol("#ff0000");
      const node = createReassignNode("myColor", "r");
      const attributeValue = new NumberSymbol(255);

      expect(() => {
        manager.setAttribute(color, node, attributeValue);
      }).toThrow(InterpreterError);
      expect(() => {
        manager.setAttribute(color, node, attributeValue);
      }).toThrow("Cannot set attributes 'r' for variable myColor");
    });

    it("throws error when attributes chain length exceeds one element", () => {
      const color = new ColorSymbol(null, "RGB");
      const identifierToken = createMockToken("myColor");
      const baseIdentifier = new IdentifierNode(identifierToken);
      const attr1 = new IdentifierNode(createMockToken("r"));
      const attr2 = new IdentifierNode(createMockToken("value"));
      
      const node = new ReassignNode(
        [baseIdentifier, attr1, attr2],
        new IdentifierNode(createMockToken("test")),
        identifierToken
      );
      const attributeValue = new NumberSymbol(255);

      expect(() => {
        manager.setAttribute(color, node, attributeValue);
      }).toThrow(InterpreterError);
      expect(() => {
        manager.setAttribute(color, node, attributeValue);
      }).toThrow("Attributes chain 'r.value' for variable myColor");
    });

    it("throws error when no spec is found for the color type", () => {
      const color = new ColorSymbol(null, "UNKNOWN_TYPE");
      const node = createReassignNode("myColor", "r");
      const attributeValue = new NumberSymbol(255);

      expect(() => {
        manager.setAttribute(color, node, attributeValue);
      }).toThrow(InterpreterError);
      expect(() => {
        manager.setAttribute(color, node, attributeValue);
      }).toThrow("No spec UNKNOWN_TYPE defined for variable myColor");
    });

    it("throws error when no schema found for the attribute key", () => {
      const color = new ColorSymbol(null, "RGB");
      const node = createReassignNode("myColor", "invalidAttribute");
      const attributeValue = new NumberSymbol(255);

      expect(() => {
        manager.setAttribute(color, node, attributeValue);
      }).toThrow(InterpreterError);
      expect(() => {
        manager.setAttribute(color, node, attributeValue);
      }).toThrow("No schema found for key invalidAttribute for variable myColor");
    });

    it("throws error when attribute type does not match schema type", () => {
      const color = new ColorSymbol(null, "RGB");
      const node = createReassignNode("myColor", "r");
      const attributeValue = new StringSymbol("invalid"); // Should be number

      expect(() => {
        manager.setAttribute(color, node, attributeValue);
      }).toThrow(InterpreterError);
      expect(() => {
        manager.setAttribute(color, node, attributeValue);
      }).toThrow("Invalid attribute type 'String'. Use a valid type.");
    });

    it("preserves existing attributes when setting a new one", () => {
      const color = new ColorSymbol(null, "RGB");
      color.value = { g: new NumberSymbol(128) };
      
      const node = createReassignNode("myColor", "r");
      const attributeValue = new NumberSymbol(255);

      const result = manager.setAttribute(color, node, attributeValue);

      expect(result).toBe(color);
      expect(color.value).toEqual({ 
        g: new NumberSymbol(128),
        r: attributeValue 
      });
    });

    it("overwrites existing attribute with same key", () => {
      const color = new ColorSymbol(null, "RGB");
      color.value = { r: new NumberSymbol(100) };
      
      const node = createReassignNode("myColor", "r");
      const attributeValue = new NumberSymbol(255);

      const result = manager.setAttribute(color, node, attributeValue);

      expect(result).toBe(color);
      expect(color.value).toEqual({ r: attributeValue });
    });

    it("initializes empty object when color value is null", () => {
      const color = new ColorSymbol(null, "RGB");
      // Explicitly ensure value is null
      color.value = null;
      
      const node = createReassignNode("myColor", "g");
      const attributeValue = new NumberSymbol(128);

      const result = manager.setAttribute(color, node, attributeValue);

      expect(result).toBe(color);
      expect(color.value).toEqual({ g: attributeValue });
    });
  });
});
