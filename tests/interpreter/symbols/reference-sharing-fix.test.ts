import { DictionarySymbol, ListSymbol, NumberSymbol, StringSymbol } from "@src/interpreter/symbols";
import { describe, expect, it } from "vitest";

describe("Reference Sharing Fix", () => {
  describe("tokenscript scenario reproduction", () => {
    it("should fix the original tokenscript dictionary duplication issue", () => {
      // Simulate the original tokenscript code:
      // variable scale: List;
      // variable step_dict: Dictionary;
      // while (i < steps) [
      //   step_dict.set("name", name);
      //   step_dict.set("value", value_str);
      //   scale.append(step_dict);
      //   i = i + 1;
      // ]

      const scale = new ListSymbol([]);
      const step_dict = new DictionarySymbol(new Map());

      // Simulate 3 iterations of the loop
      const iterations = [
        { name: "100", value: "2px" },
        { name: "200", value: "4px" },
        { name: "300", value: "8px" },
      ];

      for (const iteration of iterations) {
        // Set values on the same dictionary instance
        step_dict.set(new StringSymbol("name"), new StringSymbol(iteration.name));
        step_dict.set(new StringSymbol("value"), new StringSymbol(iteration.value));

        // Append the dictionary to the list
        scale.append(step_dict);
      }

      // Verify that each dictionary in the list has different values
      expect(scale.value.length).toBe(3);

      const dict0 = scale.value[0] as DictionarySymbol;
      const dict1 = scale.value[1] as DictionarySymbol;
      const dict2 = scale.value[2] as DictionarySymbol;

      // Each should be a different instance
      expect(dict0).not.toBe(dict1);
      expect(dict1).not.toBe(dict2);
      expect(dict0).not.toBe(step_dict);

      // Each should have the correct values from when it was appended
      expect(dict0.get(new StringSymbol("name")).value).toBe("100");
      expect(dict0.get(new StringSymbol("value")).value).toBe("2px");

      expect(dict1.get(new StringSymbol("name")).value).toBe("200");
      expect(dict1.get(new StringSymbol("value")).value).toBe("4px");

      expect(dict2.get(new StringSymbol("name")).value).toBe("300");
      expect(dict2.get(new StringSymbol("value")).value).toBe("8px");

      // The original dictionary should still have the last values
      expect(step_dict.get(new StringSymbol("name")).value).toBe("300");
      expect(step_dict.get(new StringSymbol("value")).value).toBe("8px");
    });

    it("should handle nested mutable objects correctly", () => {
      const list = new ListSymbol([]);
      const nestedDict = new DictionarySymbol(new Map([["nested", new StringSymbol("original")]]));
      const mainDict = new DictionarySymbol(new Map([["nested_dict", nestedDict]]));

      // Append the main dictionary twice
      list.append(mainDict);
      list.append(mainDict);

      // Modify the original nested dictionary
      nestedDict.set(new StringSymbol("nested"), new StringSymbol("modified"));

      // Both appended dictionaries should be unaffected
      const first = list.value[0] as DictionarySymbol;
      const second = list.value[1] as DictionarySymbol;

      expect(first).not.toBe(second);
      expect(first).not.toBe(mainDict);

      const firstNested = first.get(new StringSymbol("nested_dict")) as DictionarySymbol;
      const secondNested = second.get(new StringSymbol("nested_dict")) as DictionarySymbol;

      expect(firstNested).not.toBe(secondNested);
      expect(firstNested).not.toBe(nestedDict);

      expect(firstNested.get(new StringSymbol("nested")).value).toBe("original");
      expect(secondNested.get(new StringSymbol("nested")).value).toBe("original");
    });
  });

  describe("all list mutation methods", () => {
    it("should deep copy in append", () => {
      const list = new ListSymbol([]);
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("value")]]));

      list.append(dict);

      // Modify original
      dict.set(new StringSymbol("key"), new StringSymbol("modified"));

      // List should be unaffected
      expect((list.value[0] as DictionarySymbol).get(new StringSymbol("key")).value).toBe("value");
    });

    it("should deep copy in insert", () => {
      const list = new ListSymbol([new NumberSymbol(1)]);
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("inserted")]]));

      list.insert(new NumberSymbol(0), dict);

      // Modify original
      dict.set(new StringSymbol("key"), new StringSymbol("modified"));

      // List should be unaffected
      expect((list.value[0] as DictionarySymbol).get(new StringSymbol("key")).value).toBe("inserted");
    });

    it("should deep copy in update", () => {
      const list = new ListSymbol([new NumberSymbol(1)]);
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("updated")]]));

      list.update(new NumberSymbol(0), dict);

      // Modify original
      dict.set(new StringSymbol("key"), new StringSymbol("modified"));

      // List should be unaffected
      expect((list.value[0] as DictionarySymbol).get(new StringSymbol("key")).value).toBe("updated");
    });

    it("should deep copy in extend with individual items", () => {
      const list = new ListSymbol([]);
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("extended")]]));

      list.extend(dict);

      // Modify original
      dict.set(new StringSymbol("key"), new StringSymbol("modified"));

      // List should be unaffected
      expect((list.value[0] as DictionarySymbol).get(new StringSymbol("key")).value).toBe("extended");
    });

    it("should deep copy in extend with list argument", () => {
      const list1 = new ListSymbol([]);
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("from_list")]]));
      const list2 = new ListSymbol([dict]);

      list1.extend(list2);

      // Modify original
      dict.set(new StringSymbol("key"), new StringSymbol("modified"));

      // Extended list should be unaffected
      expect((list1.value[0] as DictionarySymbol).get(new StringSymbol("key")).value).toBe("from_list");
    });
  });

  describe("dictionary mutation methods", () => {
    it("should deep copy in set", () => {
      const dict = new DictionarySymbol(new Map());
      const nestedDict = new DictionarySymbol(new Map([["inner", new StringSymbol("value")]]));

      dict.set(new StringSymbol("nested"), nestedDict);

      // Modify original
      nestedDict.set(new StringSymbol("inner"), new StringSymbol("modified"));

      // Dictionary should be unaffected
      const stored = dict.get(new StringSymbol("nested")) as DictionarySymbol;
      expect(stored).not.toBe(nestedDict);
      expect(stored.get(new StringSymbol("inner")).value).toBe("value");
    });
  });

  describe("primitive types behavior", () => {
    it("should not have reference sharing issues with primitive types", () => {
      // This test documents that primitive types don't have the reference sharing issue
      // because they are immutable by nature
      const list = new ListSymbol([]);
      const num = new NumberSymbol(42);
      const str = new StringSymbol("test");

      list.append(num);
      list.append(str);
      list.append(num);

      expect(list.value.length).toBe(3);
      expect(list.value[0].value).toBe(42);
      expect(list.value[1].value).toBe("test");
      expect(list.value[2].value).toBe(42);

      expect(list.value[0]).toBe(list.value[2]);
    });
  });
});
