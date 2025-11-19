import { BooleanSymbol, DictionarySymbol, ListSymbol, NullSymbol, NumberSymbol, StringSymbol } from "@interpreter/symbols";
import { createInterpreter, interpretAndGetVariable, interpretAndGetVariables } from "@tests/interpreter/test-helpers";
import { describe, expect, it } from "vitest";

describe("DictionarySymbol - Unit Tests", () => {
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
        ]),
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
      expect((copy.value.get("list") as ListSymbol).value[0].value).toBe("nested");
    });
  });

  describe("set", () => {
    it("should deep copy values to prevent reference sharing", () => {
      const dict = new DictionarySymbol(new Map());
      const list = new ListSymbol([new StringSymbol("original")]);

      dict.set(new StringSymbol("list1"), list);
      dict.set(new StringSymbol("list2"), list);

      expect(dict.value.get("list1")).not.toBe(dict.value.get("list2"));
      expect(dict.value.get("list1")).not.toBe(list);

      list.append(new StringSymbol("modified"));

      expect((dict.value.get("list1") as ListSymbol).value.length).toBe(1);
      expect((dict.value.get("list2") as ListSymbol).value.length).toBe(1);
    });

    it("should handle the tokenscript scenario correctly", () => {
      const dict = new DictionarySymbol(new Map());

      dict.set(new StringSymbol("name"), new StringSymbol("first"));
      dict.set(new StringSymbol("value"), new NumberSymbol(100));

      const firstSnapshot = {
        name: dict.get(new StringSymbol("name")).value,
        value: dict.get(new StringSymbol("value")).value,
      };

      dict.set(new StringSymbol("name"), new StringSymbol("second"));
      dict.set(new StringSymbol("value"), new NumberSymbol(200));

      expect(dict.get(new StringSymbol("name")).value).toBe("second");
      expect(dict.get(new StringSymbol("value")).value).toBe(200);
      expect(firstSnapshot.name).toBe("first");
      expect(firstSnapshot.value).toBe(100);
    });
  });

  describe("get", () => {
    it("should return values correctly", () => {
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("value")]]));
      const result = dict.get(new StringSymbol("key"));
      expect(result.value).toBe("value");
    });

    it("should return NullSymbol for missing keys", () => {
      const dict = new DictionarySymbol(new Map());
      const result = dict.get(new StringSymbol("missing"));
      expect(result.type).toBe("Null");
    });
  });

  describe("delete", () => {
    it("should delete keys correctly", () => {
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("value")]]));
      dict.delete(new StringSymbol("key"));
      expect(dict.value.has("key")).toBe(false);
    });
  });

  describe("keys", () => {
    it("should return list of keys", () => {
      const dict = new DictionarySymbol(
        new Map([
          ["key1", new StringSymbol("value1")],
          ["key2", new StringSymbol("value2")],
        ]),
      );
      const keys = dict.keys();
      expect(keys.value.length).toBe(2);
      expect(keys.value.map((k) => k.value)).toEqual(["key1", "key2"]);
    });
  });

  describe("values", () => {
    it("should return list of values", () => {
      const dict = new DictionarySymbol(
        new Map([
          ["key1", new StringSymbol("value1")],
          ["key2", new NumberSymbol(42)],
        ]),
      );
      const values = dict.values();
      expect(values.value.length).toBe(2);
      expect(values.value.map((v) => v.value)).toEqual(["value1", 42]);
    });
  });

  describe("keyExists", () => {
    it("should check key existence correctly", () => {
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("value")]]));
      expect(dict.keyExists(new StringSymbol("key")).value).toBe(true);
      expect(dict.keyExists(new StringSymbol("missing")).value).toBe(false);
    });
  });

  describe("length", () => {
    it("should return correct length", () => {
      const dict = new DictionarySymbol(
        new Map([
          ["key1", new StringSymbol("value1")],
          ["key2", new StringSymbol("value2")],
        ]),
      );
      expect(dict.length().value).toBe(2);
    });
  });

  describe("clear", () => {
    it("should clear all entries", () => {
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("value")]]));
      dict.clear();
      expect(dict.value.size).toBe(0);
    });
  });

  describe("toString", () => {
    it("should format dictionary correctly", () => {
      const dict = new DictionarySymbol(
        new Map([
          ["key1", new StringSymbol("value1")],
          ["key2", new NumberSymbol(42)],
        ]),
      );
      const str = dict.toString();
      expect(str).toContain("key1: value1");
      expect(str).toContain("key2: 42");
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

describe("Dictionary Operations", () => {
  describe("Basic Dictionary Operations", () => {
    it("should create an empty dictionary", () => {
      const text = `
        variable my_dict: Dictionary;
        return my_dict;
      `;
      const interpreter = createInterpreter(text);
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(DictionarySymbol);
      expect(result?.toString()).toBe("{}");
    });

    it("should set and get values from dictionary", () => {
      const text = `
        variable my_dict: Dictionary;
        my_dict.set("key1", "value1");
        my_dict.set("key2", "value2");
        variable value1: String = my_dict.get("key1");
        return value1;
      `;
      const interpreter = createInterpreter(text);
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(StringSymbol);
      expect(result?.toString()).toBe("value1");
    });

    it("should get all keys from dictionary", () => {
      const text = `
        variable my_dict: Dictionary;
        my_dict.set("key1", "value1");
        my_dict.set("key2", "value2");
        my_dict.set("key3", "value3");
        variable keys: List = my_dict.keys();
        return keys;
      `;
      const interpreter = createInterpreter(text);
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(ListSymbol);
      expect(result?.toString()).toBe("key1, key2, key3");
    });

    it("should delete keys from dictionary", () => {
      const text = `
        variable my_dict: Dictionary;
        my_dict.set("key1", "value1");
        my_dict.set("key2", "value2");
        my_dict.set("key3", "value3");
        my_dict.delete("key2");
        return my_dict;
      `;
      const interpreter = createInterpreter(text);
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(DictionarySymbol);
      expect(result?.toString()).toBe("{key1: value1, key3: value3}");
    });

    it("should check if key exists", () => {
      const text = `
        variable my_dict: Dictionary;
        my_dict.set("key1", "value1");
        variable exists: Boolean = my_dict.key_exists("key1");
        variable not_exists: Boolean = my_dict.key_exists("key2");
        return exists;
      `;
      const interpreter = createInterpreter(text);
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.toString()).toBe("true");
    });

    it("should get dictionary length", () => {
      const text = `
        variable my_dict: Dictionary;
        my_dict.set("key1", "value1");
        my_dict.set("key2", "value2");
        variable len: Number = my_dict.length();
        return len;
      `;
      const interpreter = createInterpreter(text);
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(NumberSymbol);
      expect(result?.toString()).toBe("2");
    });

    it("should clear dictionary", () => {
      const text = `
        variable my_dict: Dictionary;
        my_dict.set("key1", "value1");
        my_dict.set("key2", "value2");
        my_dict.clear();
        return my_dict;
      `;
      const interpreter = createInterpreter(text);
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(DictionarySymbol);
      expect(result?.toString()).toBe("{}");
    });
  });

  describe("Dictionary with Different Value Types", () => {
    it("should handle numeric values", () => {
      const text = `
        variable my_dict: Dictionary;
        my_dict.set("num", 42);
        variable value: Number = my_dict.get("num");
        return value;
      `;
      const interpreter = createInterpreter(text);
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(NumberSymbol);
      expect(result?.toString()).toBe("42");
    });

    it("should handle boolean values", () => {
      const text = `
        variable my_dict: Dictionary;
        my_dict.set("bool", true);
        variable value: Boolean = my_dict.get("bool");
        return value;
      `;
      const interpreter = createInterpreter(text);
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.toString()).toBe("true");
    });
  });

  describe("Dictionary References", () => {
    it("should handle dictionary references from context", () => {
      const text = `
        variable value1: String = {my_ref_dict}.get("key1");
        return value1;
      `;
      const interpreter = createInterpreter(text, {
        my_ref_dict: { key1: "reference_value1", key2: "reference_value2" },
      });
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(StringSymbol);
      expect(result?.toString()).toBe("reference_value1");
    });
  });

  describe("Error Handling", () => {
    it("should return null for non-existent keys", () => {
      const text = `
        variable my_dict: Dictionary;
        return my_dict.get("nonexistent");
      `;
      const interpreter = createInterpreter(text);
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(NullSymbol);
      expect((result as NullSymbol).value).toBe(null);
    });

    it("should handle keyExists for non-existent keys", () => {
      const text = `
        variable my_dict: Dictionary;
        variable exists: Boolean = my_dict.key_exists("nonexistent");
        return exists;
      `;
      const interpreter = createInterpreter(text);
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(BooleanSymbol);
      expect(result?.toString()).toBe("false");
    });
  });

  describe("Python Implementation Compatibility", () => {
    it("should match the basic dictionary test from Python implementation", () => {
      const text = `
        variable my_dict: Dictionary;
        my_dict.set("key1", "value1");
        my_dict.set("key2", "value2");
        my_dict.set("key3", "value3");
        variable value1: String = my_dict.get("key1");
        variable value2: String = my_dict.get("key2");
        variable keys: List = my_dict.keys();
        my_dict.delete("key3");
        return my_dict;
      `;
      const interpreter = createInterpreter(text);
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(DictionarySymbol);
      expect(result?.toString()).toBe("{key1: value1, key2: value2}");

      const vars = interpretAndGetVariables(text, ["value1", "value2", "keys"]);
      expect(vars.value1?.toString()).toBe("value1");
      expect(vars.value2?.toString()).toBe("value2");
      expect(vars.keys?.toString()).toBe("key1, key2, key3");
    });

    it("should match the basic list test from Python implementation", () => {
      const text = `
        variable my_list: List;
        my_list.append(1);
        my_list.append(2);
        return my_list.get(0);
      `;
      const interpreter = createInterpreter(text);
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(NumberSymbol);
      expect(result?.toString()).toBe("1");

      const myList = interpretAndGetVariable(text, "my_list");
      expect(myList?.toString()).toBe("1, 2");
    });
  });

  describe("Insertion Order Preservation (OrderedDict Behavior)", () => {
    it("should preserve insertion order when adding keys", () => {
      const text = `
        variable my_dict: Dictionary;
        my_dict.set("third", "3");
        my_dict.set("first", "1");
        my_dict.set("second", "2");
        variable keys: List = my_dict.keys();
        return keys;
      `;
      const interpreter = createInterpreter(text);
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(ListSymbol);
      expect(result?.toString()).toBe("third, first, second");
    });

    it("should preserve insertion order in toString output", () => {
      const text = `
        variable my_dict: Dictionary;
        my_dict.set("z", "last");
        my_dict.set("a", "first");
        my_dict.set("m", "middle");
        return my_dict;
      `;
      const interpreter = createInterpreter(text);
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(DictionarySymbol);
      expect(result?.toString()).toBe("{z: last, a: first, m: middle}");
    });

    it("should maintain order when deleting and re-adding keys", () => {
      const text = `
        variable my_dict: Dictionary;
        my_dict.set("first", "1");
        my_dict.set("second", "2");
        my_dict.set("third", "3");
        my_dict.delete("second");
        my_dict.set("fourth", "4");
        my_dict.set("second", "2b");
        variable keys: List = my_dict.keys();
        return keys;
      `;
      const interpreter = createInterpreter(text);
      const result = interpreter.interpret();

      expect(result).toBeInstanceOf(ListSymbol);
      expect(result?.toString()).toBe("first, third, fourth, second");
    });
  });
});
