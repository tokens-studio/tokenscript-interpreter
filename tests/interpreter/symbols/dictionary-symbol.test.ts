import { describe, expect, it } from "vitest";
import {
  DictionarySymbol,
  StringSymbol,
  NumberSymbol,
  ListSymbol,
  BooleanSymbol,
} from "@src/interpreter/symbols";

describe("DictionarySymbol", () => {
  describe("constructor", () => {
    it("should create empty dictionary when passed null", () => {
      const dict = new DictionarySymbol(null);
      expect(dict.value.size).toBe(0);
    });

    it("should create dictionary from Map", () => {
      const map = new Map([["key", new StringSymbol("value")]]);
      const dict = new DictionarySymbol(map);
      expect(dict.value.get("key")?.value).toBe("value");
    });

    it("should create dictionary from plain object", () => {
      const obj = { key: new StringSymbol("value") };
      const dict = new DictionarySymbol(obj);
      expect(dict.value.get("key")?.value).toBe("value");
    });
  });

  describe("deepCopy", () => {
    it("should create a deep copy with primitive values", () => {
      const original = new DictionarySymbol(
        new Map([
          ["string", new StringSymbol("test")],
          ["number", new NumberSymbol(42)],
          ["boolean", new BooleanSymbol(true)],
        ])
      );

      const copy = original.deepCopy();

      expect(copy).not.toBe(original);
      expect(copy.value).not.toBe(original.value);
      expect(copy.value.get("string")).not.toBe(original.value.get("string"));
      expect(copy.value.get("string")?.value).toBe("test");
    });

    it("should create a deep copy with nested mutable objects", () => {
      const nestedList = new ListSymbol([new StringSymbol("nested")]);
      const original = new DictionarySymbol(new Map([["list", nestedList]]));

      const copy = original.deepCopy();

      expect(copy.value.get("list")).not.toBe(original.value.get("list"));
      expect((copy.value.get("list") as ListSymbol).elements[0].value).toBe("nested");
    });
  });

  describe("setImpl", () => {
    it("should deep copy values to prevent reference sharing", () => {
      const dict = new DictionarySymbol(new Map());
      const list = new ListSymbol([new StringSymbol("original")]);

      dict.setImpl(new StringSymbol("list1"), list);
      dict.setImpl(new StringSymbol("list2"), list);

      // Should be different instances
      expect(dict.value.get("list1")).not.toBe(dict.value.get("list2"));
      expect(dict.value.get("list1")).not.toBe(list);

      // Modify original list
      list.appendImpl(new StringSymbol("modified"));

      // Dictionary values should be unaffected
      expect((dict.value.get("list1") as ListSymbol).elements.length).toBe(1);
      expect((dict.value.get("list2") as ListSymbol).elements.length).toBe(1);
    });

    it("should handle the tokenscript scenario correctly", () => {
      const dict = new DictionarySymbol(new Map());

      // Set initial values
      dict.setImpl(new StringSymbol("name"), new StringSymbol("first"));
      dict.setImpl(new StringSymbol("value"), new NumberSymbol(100));

      const firstSnapshot = {
        name: dict.getImpl(new StringSymbol("name")).value,
        value: dict.getImpl(new StringSymbol("value")).value,
      };

      // Simulate changing values (like in the loop)
      dict.setImpl(new StringSymbol("name"), new StringSymbol("second"));
      dict.setImpl(new StringSymbol("value"), new NumberSymbol(200));

      // Values should have changed
      expect(dict.getImpl(new StringSymbol("name")).value).toBe("second");
      expect(dict.getImpl(new StringSymbol("value")).value).toBe(200);

      // This demonstrates that the dictionary itself is mutable
      // The fix is in the append operation, not here
      expect(firstSnapshot.name).toBe("first");
      expect(firstSnapshot.value).toBe(100);
    });
  });

  describe("getImpl", () => {
    it("should return values correctly", () => {
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("value")]]));
      const result = dict.getImpl(new StringSymbol("key"));
      expect(result.value).toBe("value");
    });

    it("should return NullSymbol for missing keys", () => {
      const dict = new DictionarySymbol(new Map());
      const result = dict.getImpl(new StringSymbol("missing"));
      expect(result.type).toBe("Null");
    });
  });

  describe("deleteImpl", () => {
    it("should delete keys correctly", () => {
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("value")]]));
      dict.deleteImpl(new StringSymbol("key"));
      expect(dict.value.has("key")).toBe(false);
    });
  });

  describe("keysImpl", () => {
    it("should return list of keys", () => {
      const dict = new DictionarySymbol(
        new Map([
          ["key1", new StringSymbol("value1")],
          ["key2", new StringSymbol("value2")],
        ])
      );
      const keys = dict.keysImpl();
      expect(keys.elements.length).toBe(2);
      expect(keys.elements.map(k => k.value)).toEqual(["key1", "key2"]);
    });
  });

  describe("valuesImpl", () => {
    it("should return list of values", () => {
      const dict = new DictionarySymbol(
        new Map([
          ["key1", new StringSymbol("value1")],
          ["key2", new NumberSymbol(42)],
        ])
      );
      const values = dict.valuesImpl();
      expect(values.elements.length).toBe(2);
      expect(values.elements.map(v => v.value)).toEqual(["value1", 42]);
    });
  });

  describe("keyExistsImpl", () => {
    it("should check key existence correctly", () => {
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("value")]]));
      expect(dict.keyExistsImpl(new StringSymbol("key")).value).toBe(true);
      expect(dict.keyExistsImpl(new StringSymbol("missing")).value).toBe(false);
    });
  });

  describe("lengthImpl", () => {
    it("should return correct length", () => {
      const dict = new DictionarySymbol(
        new Map([
          ["key1", new StringSymbol("value1")],
          ["key2", new StringSymbol("value2")],
        ])
      );
      expect(dict.lengthImpl().value).toBe(2);
    });
  });

  describe("clearImpl", () => {
    it("should clear all entries", () => {
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("value")]]));
      dict.clearImpl();
      expect(dict.value.size).toBe(0);
    });
  });

  describe("toString", () => {
    it("should format dictionary correctly", () => {
      const dict = new DictionarySymbol(
        new Map([
          ["key1", new StringSymbol("value1")],
          ["key2", new NumberSymbol(42)],
        ])
      );
      const str = dict.toString();
      expect(str).toContain("'key1': 'value1'");
      expect(str).toContain("'key2': '42'");
    });
  });

  describe("attributes", () => {
    it("should support hasAttribute and getAttribute", () => {
      const dict = new DictionarySymbol(new Map([["attr", new StringSymbol("value")]]));
      expect(dict.hasAttribute("attr")).toBe(true);
      expect(dict.hasAttribute("missing")).toBe(false);
      expect(dict.getAttribute("attr")?.value).toBe("value");
      expect(dict.getAttribute("missing")).toBe(null);
    });
  });
});