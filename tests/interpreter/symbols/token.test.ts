import { BooleanSymbol, DictionarySymbol, ListSymbol, NumberSymbol, NumberWithUnitSymbol, StringSymbol, TokenSymbol } from "@interpreter/symbols";
import { describe, expect, it } from "vitest";

describe("TokenSymbol", () => {
  describe("constructor", () => {
    it("should create empty token when passed null", () => {
      const token = new TokenSymbol("typography", null);
      expect(token.value instanceof Map).toBe(true);
      expect((token.value as Map<string, any>).size).toBe(0);
    });

    it("should create token from Map (Record schema)", () => {
      const map = new Map<string, any>();
      map.set("fontSize", new NumberSymbol(16));
      const token = new TokenSymbol("typography", map);
      expect(token.value instanceof Map).toBe(true);
      expect((token.value as Map<string, any>).get("fontSize")?.value).toBe(16);
    });

    it("should create token from plain object (Record schema)", () => {
      const obj = { fontSize: new NumberSymbol(16) };
      const token = new TokenSymbol("typography", obj);
      expect(token.value instanceof Map).toBe(true);
      expect((token.value as Map<string, any>).get("fontSize")?.value).toBe(16);
    });

    it("should create token from array (List schema)", () => {
      const arr = [new NumberSymbol(1), new NumberSymbol(2)];
      const token = new TokenSymbol("shadow", arr);
      expect(Array.isArray(token.value)).toBe(true);
      expect((token.value as any[]).length).toBe(2);
    });

    it("should create token from another TokenSymbol", () => {
      const original = new TokenSymbol("typography", {
        fontSize: new NumberSymbol(16),
      });
      const copy = new TokenSymbol("typography", original);
      expect(copy.value).toBe(original.value);
    });
  });

  describe("deepCopy", () => {
    describe("record", () => {
      it("should create a deep copy with primitive values", () => {
        const original = new TokenSymbol("typography", {
          fontSize: new NumberSymbol(16),
          lineHeight: new NumberSymbol(1.5),
          bold: new BooleanSymbol(true),
        });

        const copy = original.deepCopy();

        expect(copy).not.toBe(original);
        expect(copy.value).not.toBe(original.value);
        expect(copy.subType).toBe(original.subType);
        const copiedValue = (copy.value as Map<string, any>).get("fontSize");
        const originalValue = (original.value as Map<string, any>).get("fontSize");
        expect(copiedValue).not.toBe(originalValue);
        expect(copiedValue?.value).toBe(16);
      });

      it("should create a deep copy with nested mutable objects", () => {
        const nestedList = new ListSymbol([new StringSymbol("nested")]);
        const original = new TokenSymbol("typography", {
          fontFamilies: nestedList,
        });

        const copy = original.deepCopy();

        const copiedList = (copy.value as Map<string, any>).get("fontFamilies");
        const originalList = (original.value as Map<string, any>).get("fontFamilies");
        expect(copiedList).not.toBe(originalList);
        expect((copiedList as ListSymbol).value[0].value).toBe("nested");
      });
    });

    describe("list", () => {
      it("should create a deep copy of list value", () => {
        const original = new TokenSymbol("shadow", [new NumberSymbol(1), new NumberSymbol(2), new NumberSymbol(3)]);

        const copy = original.deepCopy();

        expect(copy).not.toBe(original);
        expect(copy.value).not.toBe(original.value);
        expect(Array.isArray(copy.value)).toBe(true);
        expect((copy.value as any[]).length).toBe(3);
        expect((copy.value as any[])[0]).not.toBe((original.value as any[])[0]);
        expect((copy.value as any[])[0].value).toBe(1);
      });

      it("should create a deep copy with nested mutable objects in list", () => {
        const nestedDict = new DictionarySymbol(new Map([["key", new StringSymbol("value")]]));
        const original = new TokenSymbol("shadow", [nestedDict]);

        const copy = original.deepCopy();

        expect((copy.value as any[])[0]).not.toBe((original.value as any[])[0]);
        expect(((copy.value as any[])[0] as DictionarySymbol).get(new StringSymbol("key")).value).toBe("value");
      });
    });
  });

  describe("set", () => {
    describe("record", () => {
      it("should deep copy values to prevent reference sharing", () => {
        const token = new TokenSymbol("typography", {});
        const list = new ListSymbol([new StringSymbol("original")]);

        token.set(new StringSymbol("fonts1"), list);
        token.set(new StringSymbol("fonts2"), list);

        const fonts1 = (token.value as Map<string, any>).get("fonts1");
        const fonts2 = (token.value as Map<string, any>).get("fonts2");
        expect(fonts1).not.toBe(fonts2);
        expect(fonts1).not.toBe(list);

        list.append(new StringSymbol("modified"));

        expect((fonts1 as ListSymbol).value.length).toBe(1);
        expect((fonts2 as ListSymbol).value.length).toBe(1);
      });

      it("should handle the tokenscript scenario correctly", () => {
        const token = new TokenSymbol("typography", {});

        token.set(new StringSymbol("fontSize"), new NumberSymbol(16));
        token.set(new StringSymbol("lineHeight"), new NumberSymbol(1.5));

        const firstSnapshot = {
          fontSize: token.get(new StringSymbol("fontSize")).value,
          lineHeight: token.get(new StringSymbol("lineHeight")).value,
        };

        token.set(new StringSymbol("fontSize"), new NumberSymbol(20));
        token.set(new StringSymbol("lineHeight"), new NumberSymbol(2.0));

        expect(token.get(new StringSymbol("fontSize")).value).toBe(20);
        expect(token.get(new StringSymbol("lineHeight")).value).toBe(2.0);
        expect(firstSnapshot.fontSize).toBe(16);
        expect(firstSnapshot.lineHeight).toBe(1.5);
      });

      it("should support method chaining", () => {
        const token = new TokenSymbol("typography", {});

        token.set(new StringSymbol("fontSize"), new NumberSymbol(16)).set(new StringSymbol("lineHeight"), new NumberSymbol(1.5));

        expect(token.length().value).toBe(2);
        expect(token.get(new StringSymbol("fontSize")).value).toBe(16);
        expect(token.get(new StringSymbol("lineHeight")).value).toBe(1.5);
      });

      it("should preserve insertion order", () => {
        const token = new TokenSymbol("typography", {});
        token.set(new StringSymbol("third"), new StringSymbol("3"));
        token.set(new StringSymbol("first"), new StringSymbol("1"));
        token.set(new StringSymbol("second"), new StringSymbol("2"));

        const keys = token.keys();
        expect(keys.toString()).toBe("third, first, second");
      });
    });

    describe("list", () => {
      it("should throw error when setting on list value", () => {
        const token = new TokenSymbol("shadow", [new NumberSymbol(1)]);
        expect(() => token.set(new StringSymbol("key"), new NumberSymbol(2))).toThrow(/Cannot set key.*Token.*List/);
      });
    });
  });

  describe("get", () => {
    describe("record", () => {
      it("should return values correctly", () => {
        const token = new TokenSymbol("typography", {
          fontSize: new NumberSymbol(16),
        });
        const result = token.get(new StringSymbol("fontSize"));
        expect(result.value).toBe(16);
      });

      it("should return NullSymbol for missing keys", () => {
        const token = new TokenSymbol("typography", {});
        const result = token.get(new StringSymbol("missing"));
        expect(result.type).toBe("Null");
      });
    });

    describe("list", () => {
      it("should throw error when getting key from list value", () => {
        const token = new TokenSymbol("shadow", [new NumberSymbol(1)]);
        expect(() => token.get(new StringSymbol("key"))).toThrow(/List get/);
      });
    });
  });

  describe("keys", () => {
    describe("record", () => {
      it("should return list of keys", () => {
        const token = new TokenSymbol("typography", {
          fontSize: new NumberSymbol(16),
          lineHeight: new NumberSymbol(1.5),
        });
        const keys = token.keys();
        expect(keys.value.length).toBe(2);
        expect(keys.value.map((k) => k.value)).toEqual(["fontSize", "lineHeight"]);
      });
    });

    describe("list", () => {
      it("should throw error when getting keys from list value", () => {
        const token = new TokenSymbol("shadow", [new NumberSymbol(1)]);
        expect(() => token.keys()).toThrow(/get keys/);
      });
    });
  });

  describe("values", () => {
    describe("record", () => {
      it("should return list of values from record", () => {
        const token = new TokenSymbol("typography", {
          fontSize: new NumberSymbol(16),
          lineHeight: new NumberSymbol(1.5),
        });
        const values = token.values();
        expect(values.value.length).toBe(2);
        expect(values.value.map((v) => v.value)).toEqual([16, 1.5]);
      });
    });

    describe("list", () => {
      it("should return list of values from list", () => {
        const token = new TokenSymbol("shadow", [new NumberSymbol(1), new NumberSymbol(2), new NumberSymbol(3)]);
        const values = token.values();
        expect(values.value.length).toBe(3);
        expect(values.value.map((v) => v.value)).toEqual([1, 2, 3]);
      });

      it("should return empty list for empty token", () => {
        const token = new TokenSymbol("shadow", null);
        const values = token.values();
        expect(values.value.length).toBe(0);
      });
    });
  });

  describe("length", () => {
    describe("record", () => {
      it("should return correct length", () => {
        const token = new TokenSymbol("typography", {
          fontSize: new NumberSymbol(16),
          lineHeight: new NumberSymbol(1.5),
        });
        expect(token.length().value).toBe(2);
      });

      it("should return 0 for empty token", () => {
        const token = new TokenSymbol("typography", null);
        expect(token.length().value).toBe(0);
      });
    });

    describe("list", () => {
      it("should return correct length", () => {
        const token = new TokenSymbol("shadow", [new NumberSymbol(1), new NumberSymbol(2), new NumberSymbol(3)]);
        expect(token.length().value).toBe(3);
      });
    });
  });

  describe("toString", () => {
    describe("record", () => {
      it("should format token correctly", () => {
        const token = new TokenSymbol("typography", {
          fontSize: new NumberSymbol(16),
          lineHeight: new NumberSymbol(1.5),
        });
        const str = token.toString();
        expect(str).toContain("fontSize: 16");
        expect(str).toContain("lineHeight: 1.5");
      });

      it("should return empty object string for empty record token", () => {
        const token = new TokenSymbol("typography", null);
        const str = token.toString();
        expect(str).toBe("{}");
      });

      it("should preserve insertion order in output", () => {
        const token = new TokenSymbol("typography", {});
        token.set(new StringSymbol("z"), new StringSymbol("last"));
        token.set(new StringSymbol("a"), new StringSymbol("first"));
        token.set(new StringSymbol("m"), new StringSymbol("middle"));

        const str = token.toString();
        expect(str).toContain("z: last");
        expect(str).toContain("a: first");
        expect(str).toContain("m: middle");
      });
    });

    describe("list", () => {
      it("should format token list correctly", () => {
        const token = new TokenSymbol("shadow", [new NumberSymbol(1), new NumberSymbol(2)]);
        const str = token.toString();
        expect(str).toBe("1, 2");
      });

      it("should return empty string for empty list token", () => {
        const token = new TokenSymbol("shadow", []);
        const str = token.toString();
        expect(str).toBe("");
      });
    });
  });

  describe("attributes", () => {
    describe("record", () => {
      it("should support hasAttribute and getAttribute for type", () => {
        const token = new TokenSymbol("typography", {});
        expect(token.hasAttribute("type")).toBe(true);
        expect(token.getAttribute("type")?.value).toBe("Token");
      });

      it("should support hasAttribute and getAttribute for subType", () => {
        const token = new TokenSymbol("typography", {});
        expect(token.hasAttribute("subType")).toBe(true);
        expect(token.getAttribute("subType")?.value).toBe("typography");
      });

      it("should support hasAttribute and getAttribute for record keys", () => {
        const token = new TokenSymbol("typography", {
          fontSize: new NumberSymbol(16),
        });
        expect(token.hasAttribute("fontSize")).toBe(true);
        expect(token.getAttribute("fontSize")?.value).toBe(16);
      });

      it("should return false for non-existent attribute", () => {
        const token = new TokenSymbol("typography", {});
        expect(token.hasAttribute("missing")).toBe(false);
        expect(token.getAttribute("missing")).toBe(null);
      });
    });

    describe("list", () => {
      it("should support type and subType attributes", () => {
        const token = new TokenSymbol("shadow", [new NumberSymbol(1)]);
        expect(token.hasAttribute("type")).toBe(true);
        expect(token.hasAttribute("subType")).toBe(true);
      });

      it("should return false for arbitrary attributes on list", () => {
        const token = new TokenSymbol("shadow", [new NumberSymbol(1)]);
        expect(token.hasAttribute("someKey")).toBe(false);
        expect(token.getAttribute("someKey")).toBe(null);
      });
    });
  });

  describe("cloneIfMutable", () => {
    it("should return deep copy for record token", () => {
      const token = new TokenSymbol("typography", {
        fontSize: new NumberSymbol(16),
      });

      const clone = token.cloneIfMutable();
      expect(clone).toBeInstanceOf(TokenSymbol);
      expect(clone).not.toBe(token);
      expect(clone.value).not.toBe(token.value);
    });

    it("should return deep copy for list token", () => {
      const token = new TokenSymbol("shadow", [new NumberSymbol(1)]);

      const clone = token.cloneIfMutable();
      expect(clone).toBeInstanceOf(TokenSymbol);
      expect(clone).not.toBe(token);
      expect(clone.value).not.toBe(token.value);
    });
  });

  describe("empty", () => {
    it("should create empty token", () => {
      const token = TokenSymbol.empty();

      expect(token).toBeInstanceOf(TokenSymbol);
      expect(token.subType).toBe("unknown");
      expect(token.value instanceof Map).toBe(true);
      expect((token.value as Map<string, any>).size).toBe(0);
    });
  });

  describe("getTypeName", () => {
    it("should return type name with subtype capitalized", () => {
      const token = new TokenSymbol("typography", {});
      expect(token.getTypeName()).toBe("Token.Typography");
    });

    it("should return type name for different subtypes", () => {
      const shadow = new TokenSymbol("shadow", []);
      const color = new TokenSymbol("color", {});
      expect(shadow.getTypeName()).toBe("Token.Shadow");
      expect(color.getTypeName()).toBe("Token.Color");
    });
  });

  describe("real-world examples", () => {
    describe("record", () => {
      it("should handle typography token with nested structures", () => {
        const token = new TokenSymbol("typography", {
          lineHeights: new NumberSymbol(1.2),
          fontSizes: new NumberWithUnitSymbol(1, "rem"),
          fontWeights: new ListSymbol([new NumberSymbol(300), new StringSymbol("italic")], false),
          textCase: new StringSymbol("uppercase"),
          textDecoration: new StringSymbol("underline"),
          letterSpacing: new StringSymbol("12"),
          fontFamilies: new ListSymbol([new StringSymbol("Aboreto"), new StringSymbol('"mono"')], false),
        });

        expect(token.getTypeName()).toBe("Token.Typography");
        expect((token.get(new StringSymbol("lineHeights")) as NumberSymbol).value).toBe(1.2);
        expect((token.get(new StringSymbol("fontSizes")) as NumberWithUnitSymbol).toString()).toBe("1rem");
        expect((token.get(new StringSymbol("fontWeights")) as ListSymbol).value.length).toBe(2);

        const keys = token.keys();
        expect(keys.value.length).toBe(7);

        const copy = token.deepCopy();
        expect(copy).not.toBe(token);
        expect((copy.get(new StringSymbol("lineHeights")) as NumberSymbol).value).toBe(1.2);
      });

      it("should handle color token", () => {
        const colorValue = new DictionarySymbol(
          new Map([
            ["colorSpace", new StringSymbol("srgb")],
            ["components", new ListSymbol([new NumberSymbol(255), new NumberSymbol(0), new NumberSymbol(0)], false)],
            ["alpha", new NumberSymbol(1)],
            ["hex", new StringSymbol("#ff0000")],
          ]),
        );

        const token = new TokenSymbol("color", { value: colorValue });

        expect(token.getTypeName()).toBe("Token.Color");
        const value = token.get(new StringSymbol("value")) as DictionarySymbol;
        expect(value.get(new StringSymbol("hex")).value).toBe("#ff0000");
        expect(value.get(new StringSymbol("colorSpace")).value).toBe("srgb");
      });
    });

    describe("list", () => {
      it("should handle shadow token with list of shadow layer maps", () => {
        const shadowLayer = new DictionarySymbol(
          new Map([
            [
              "color",
              new DictionarySymbol(
                new Map([
                  ["colorSpace", new StringSymbol("srgb")],
                  ["components", new ListSymbol([new NumberSymbol(0), new NumberSymbol(0), new NumberSymbol(0)], false)],
                  ["alpha", new NumberSymbol(0.5)],
                  ["hex", new StringSymbol("#000000")],
                ]),
              ),
            ],
            ["offsetX", new NumberWithUnitSymbol(0.5, "rem")],
            ["offsetY", new NumberWithUnitSymbol(0.5, "rem")],
            ["blur", new NumberWithUnitSymbol(1.5, "rem")],
            ["spread", new NumberWithUnitSymbol(0, "rem")],
          ]),
        );

        const token = new TokenSymbol("shadow", [shadowLayer]);

        expect(token.getTypeName()).toBe("Token.Shadow");
        expect(token.length().value).toBe(1);

        const values = token.values();
        expect(values.value.length).toBe(1);

        const firstShadow = values.value[0] as DictionarySymbol;
        expect(firstShadow.get(new StringSymbol("offsetX")).toString()).toBe("0.5rem");

        const color = firstShadow.get(new StringSymbol("color")) as DictionarySymbol;
        expect(color.get(new StringSymbol("hex")).value).toBe("#000000");
        expect(color.get(new StringSymbol("alpha")).value).toBe(0.5);
      });

      it("should handle multiple shadow layers", () => {
        const shadowLayer1 = new DictionarySymbol(
          new Map([
            [
              "color",
              new DictionarySymbol(
                new Map([
                  ["colorSpace", new StringSymbol("srgb")],
                  ["components", new ListSymbol([new NumberSymbol(0), new NumberSymbol(0), new NumberSymbol(0)], false)],
                  ["alpha", new NumberSymbol(0.5)],
                  ["hex", new StringSymbol("#000000")],
                ]),
              ),
            ],
            ["offsetX", new NumberWithUnitSymbol(0, "px")],
            ["offsetY", new NumberWithUnitSymbol(4, "px")],
            ["blur", new NumberWithUnitSymbol(8, "px")],
            ["spread", new NumberWithUnitSymbol(0, "px")],
          ]),
        );

        const shadowLayer2 = new DictionarySymbol(
          new Map([
            [
              "color",
              new DictionarySymbol(
                new Map([
                  ["colorSpace", new StringSymbol("srgb")],
                  ["components", new ListSymbol([new NumberSymbol(255), new NumberSymbol(0), new NumberSymbol(0)], false)],
                  ["alpha", new NumberSymbol(0.3)],
                  ["hex", new StringSymbol("#ff0000")],
                ]),
              ),
            ],
            ["offsetX", new NumberWithUnitSymbol(0, "px")],
            ["offsetY", new NumberWithUnitSymbol(8, "px")],
            ["blur", new NumberWithUnitSymbol(16, "px")],
            ["spread", new NumberWithUnitSymbol(2, "px")],
          ]),
        );

        const token = new TokenSymbol("shadow", [shadowLayer1, shadowLayer2]);

        expect(token.getTypeName()).toBe("Token.Shadow");
        expect(token.length().value).toBe(2);

        const values = token.values();
        const firstShadow = values.value[0] as DictionarySymbol;
        const secondShadow = values.value[1] as DictionarySymbol;

        expect(firstShadow.get(new StringSymbol("blur")).toString()).toBe("8px");
        expect(secondShadow.get(new StringSymbol("blur")).toString()).toBe("16px");

        const color1 = firstShadow.get(new StringSymbol("color")) as DictionarySymbol;
        const color2 = secondShadow.get(new StringSymbol("color")) as DictionarySymbol;

        expect(color1.get(new StringSymbol("hex")).value).toBe("#000000");
        expect(color2.get(new StringSymbol("hex")).value).toBe("#ff0000");
      });

      it("should handle border token with list structure", () => {
        const borderDict = new DictionarySymbol(
          new Map([
            ["width", new NumberWithUnitSymbol(2, "px")],
            ["style", new StringSymbol("solid")],
            [
              "color",
              new DictionarySymbol(
                new Map([
                  ["colorSpace", new StringSymbol("srgb")],
                  ["components", new ListSymbol([new NumberSymbol(255), new NumberSymbol(0), new NumberSymbol(0)], false)],
                  ["alpha", new NumberSymbol(1)],
                  ["hex", new StringSymbol("#ff0000")],
                ]),
              ),
            ],
          ]),
        );

        const token = new TokenSymbol("border", [borderDict]);

        expect(token.getTypeName()).toBe("Token.Border");
        expect(token.length().value).toBe(1);

        const values = token.values();
        const border = values.value[0] as DictionarySymbol;

        expect(border.get(new StringSymbol("width")).toString()).toBe("2px");
        expect(border.get(new StringSymbol("style")).value).toBe("solid");

        const color = border.get(new StringSymbol("color")) as DictionarySymbol;
        expect(color.get(new StringSymbol("hex")).value).toBe("#ff0000");
      });
    });
  });

  describe("toJs", () => {
    it("should convert TokenSymbol with Map value to plain object", () => {
      const token = new TokenSymbol(
        "test",
        new Map([
          ["key", new NumberSymbol(1)],
          ["value", new StringSymbol("test")],
        ]),
      );
      expect(token.toJs()).toEqual({
        key: 1,
        value: "test",
      });
    });

    it("should convert TokenSymbol with array value to array", () => {
      const token = new TokenSymbol("test", [new NumberSymbol(1), new NumberSymbol(2), new NumberSymbol(3)]);
      expect(token.toJs()).toEqual([1, 2, 3]);
    });

    it("should convert nested TokenSymbol structures", () => {
      const token = new TokenSymbol(
        "complex",
        new Map([
          ["items", new ListSymbol([new NumberSymbol(1), new NumberSymbol(2)])],
          [
            "metadata",
            new DictionarySymbol(
              new Map([
                ["title", new StringSymbol("Test")],
                ["active", new BooleanSymbol(true)],
              ]),
            ),
          ],
        ]),
      );

      expect(token.toJs()).toEqual({
        items: [1, 2],
        metadata: {
          title: "Test",
          active: true,
        },
      });
    });
  });
});
