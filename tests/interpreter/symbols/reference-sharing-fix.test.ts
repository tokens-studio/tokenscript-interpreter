import { describe, expect, it } from "vitest";
import {
  ListSymbol,
  DictionarySymbol,
  StringSymbol,
  NumberSymbol,
} from "@src/interpreter/symbols";

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
        step_dict.setImpl(new StringSymbol("name"), new StringSymbol(iteration.name));
        step_dict.setImpl(new StringSymbol("value"), new StringSymbol(iteration.value));
        
        // Append the dictionary to the list
        scale.appendImpl(step_dict);
      }

      // Verify that each dictionary in the list has different values
      expect(scale.elements.length).toBe(3);

      const dict0 = scale.elements[0] as DictionarySymbol;
      const dict1 = scale.elements[1] as DictionarySymbol;
      const dict2 = scale.elements[2] as DictionarySymbol;

      // Each should be a different instance
      expect(dict0).not.toBe(dict1);
      expect(dict1).not.toBe(dict2);
      expect(dict0).not.toBe(step_dict);

      // Each should have the correct values from when it was appended
      expect(dict0.getImpl(new StringSymbol("name")).value).toBe("100");
      expect(dict0.getImpl(new StringSymbol("value")).value).toBe("2px");

      expect(dict1.getImpl(new StringSymbol("name")).value).toBe("200");
      expect(dict1.getImpl(new StringSymbol("value")).value).toBe("4px");

      expect(dict2.getImpl(new StringSymbol("name")).value).toBe("300");
      expect(dict2.getImpl(new StringSymbol("value")).value).toBe("8px");

      // The original dictionary should still have the last values
      expect(step_dict.getImpl(new StringSymbol("name")).value).toBe("300");
      expect(step_dict.getImpl(new StringSymbol("value")).value).toBe("8px");
    });

    it("should handle nested mutable objects correctly", () => {
      const list = new ListSymbol([]);
      const nestedDict = new DictionarySymbol(new Map([["nested", new StringSymbol("original")]]));
      const mainDict = new DictionarySymbol(new Map([["nested_dict", nestedDict]]));

      // Append the main dictionary twice
      list.appendImpl(mainDict);
      list.appendImpl(mainDict);

      // Modify the original nested dictionary
      nestedDict.setImpl(new StringSymbol("nested"), new StringSymbol("modified"));

      // Both appended dictionaries should be unaffected
      const first = list.elements[0] as DictionarySymbol;
      const second = list.elements[1] as DictionarySymbol;

      expect(first).not.toBe(second);
      expect(first).not.toBe(mainDict);

      const firstNested = first.getImpl(new StringSymbol("nested_dict")) as DictionarySymbol;
      const secondNested = second.getImpl(new StringSymbol("nested_dict")) as DictionarySymbol;

      expect(firstNested).not.toBe(secondNested);
      expect(firstNested).not.toBe(nestedDict);

      expect(firstNested.getImpl(new StringSymbol("nested")).value).toBe("original");
      expect(secondNested.getImpl(new StringSymbol("nested")).value).toBe("original");
    });
  });

  describe("all list mutation methods", () => {
    it("should deep copy in appendImpl", () => {
      const list = new ListSymbol([]);
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("value")]]));

      list.appendImpl(dict);
      
      // Modify original
      dict.setImpl(new StringSymbol("key"), new StringSymbol("modified"));
      
      // List should be unaffected
      expect((list.elements[0] as DictionarySymbol).getImpl(new StringSymbol("key")).value).toBe("value");
    });

    it("should deep copy in insertImpl", () => {
      const list = new ListSymbol([new NumberSymbol(1)]);
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("inserted")]]));

      list.insertImpl(new NumberSymbol(0), dict);
      
      // Modify original
      dict.setImpl(new StringSymbol("key"), new StringSymbol("modified"));
      
      // List should be unaffected
      expect((list.elements[0] as DictionarySymbol).getImpl(new StringSymbol("key")).value).toBe("inserted");
    });

    it("should deep copy in updateImpl", () => {
      const list = new ListSymbol([new NumberSymbol(1)]);
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("updated")]]));

      list.updateImpl(new NumberSymbol(0), dict);
      
      // Modify original
      dict.setImpl(new StringSymbol("key"), new StringSymbol("modified"));
      
      // List should be unaffected
      expect((list.elements[0] as DictionarySymbol).getImpl(new StringSymbol("key")).value).toBe("updated");
    });

    it("should deep copy in extendImpl with individual items", () => {
      const list = new ListSymbol([]);
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("extended")]]));

      list.extendImpl(dict);
      
      // Modify original
      dict.setImpl(new StringSymbol("key"), new StringSymbol("modified"));
      
      // List should be unaffected
      expect((list.elements[0] as DictionarySymbol).getImpl(new StringSymbol("key")).value).toBe("extended");
    });

    it("should deep copy in extendImpl with list argument", () => {
      const list1 = new ListSymbol([]);
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("from_list")]]));
      const list2 = new ListSymbol([dict]);

      list1.extendImpl(list2);
      
      // Modify original
      dict.setImpl(new StringSymbol("key"), new StringSymbol("modified"));
      
      // Extended list should be unaffected
      expect((list1.elements[0] as DictionarySymbol).getImpl(new StringSymbol("key")).value).toBe("from_list");
    });
  });

  describe("dictionary mutation methods", () => {
    it("should deep copy in setImpl", () => {
      const dict = new DictionarySymbol(new Map());
      const nestedDict = new DictionarySymbol(new Map([["inner", new StringSymbol("value")]]));

      dict.setImpl(new StringSymbol("nested"), nestedDict);
      
      // Modify original
      nestedDict.setImpl(new StringSymbol("inner"), new StringSymbol("modified"));
      
      // Dictionary should be unaffected
      const stored = dict.getImpl(new StringSymbol("nested")) as DictionarySymbol;
      expect(stored).not.toBe(nestedDict);
      expect(stored.getImpl(new StringSymbol("inner")).value).toBe("value");
    });
  });

  describe("primitive types behavior", () => {
    it("should not have reference sharing issues with primitive types", () => {
      // This test documents that primitive types don't have the reference sharing issue
      // because they are immutable by nature
      const list = new ListSymbol([]);
      const num = new NumberSymbol(42);
      const str = new StringSymbol("test");

      list.appendImpl(num);
      list.appendImpl(str);
      list.appendImpl(num);

      expect(list.elements.length).toBe(3);
      expect(list.elements[0].value).toBe(42);
      expect(list.elements[1].value).toBe("test");
      expect(list.elements[2].value).toBe(42);

      expect(list.elements[0]).toBe(list.elements[2]);
    });
  });
});
