import { describe, expect, it } from "vitest";
import {
  ListSymbol,
  NumberSymbol,
  StringSymbol,
  DictionarySymbol,
  BooleanSymbol,
} from "@src/interpreter/symbols";

describe("ListSymbol", () => {
  describe("constructor", () => {
    it("should create empty list when passed null", () => {
      const list = new ListSymbol(null);
      expect(list.elements).toEqual([]);
    });

    it("should create list with elements", () => {
      const elements = [new NumberSymbol(1), new StringSymbol("test")];
      const list = new ListSymbol(elements);
      expect(list.elements).toEqual(elements);
    });

    it("should support implicit lists", () => {
      const list = new ListSymbol([new StringSymbol("a")], true);
      expect(list.isImplicit).toBe(true);
      expect(list.getTypeName()).toBe("List.Implicit");
    });
  });

  describe("deepCopy", () => {
    it("should create a deep copy with primitive elements", () => {
      const original = new ListSymbol([
        new NumberSymbol(42),
        new StringSymbol("hello"),
        new BooleanSymbol(true),
      ]);

      const copy = original.deepCopy();

      expect(copy).not.toBe(original);
      expect(copy.elements).not.toBe(original.elements);
      expect(copy.elements.length).toBe(3);
      expect(copy.elements[0]).not.toBe(original.elements[0]);
      expect(copy.elements[0].value).toBe(42);
    });

    it("should create a deep copy with nested mutable objects", () => {
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("value")]]));
      const original = new ListSymbol([dict]);

      const copy = original.deepCopy();

      expect(copy.elements[0]).not.toBe(original.elements[0]);
      expect((copy.elements[0] as DictionarySymbol).value).not.toBe(
        (original.elements[0] as DictionarySymbol).value
      );
    });
  });

  describe("appendImpl", () => {
    it("should deep copy appended items to prevent reference sharing", () => {
      const list = new ListSymbol([]);
      const dict = new DictionarySymbol(new Map([["name", new StringSymbol("test")]]));

      list.appendImpl(dict);
      list.appendImpl(dict);

      // Both elements should be different instances
      expect(list.elements[0]).not.toBe(list.elements[1]);
      expect(list.elements[0]).not.toBe(dict);

      // Modify original dict
      dict.setImpl(new StringSymbol("name"), new StringSymbol("modified"));

      // List elements should be unaffected
      expect((list.elements[0] as DictionarySymbol).getImpl(new StringSymbol("name")).value).toBe("test");
      expect((list.elements[1] as DictionarySymbol).getImpl(new StringSymbol("name")).value).toBe("test");
    });

    it("should handle the tokenscript scenario correctly", () => {
      const scale = new ListSymbol([]);
      const step_dict = new DictionarySymbol(new Map());

      // Simulate the tokenscript loop
      for (let i = 0; i < 3; i++) {
        step_dict.setImpl(new StringSymbol("name"), new StringSymbol(`item${i}`));
        step_dict.setImpl(new StringSymbol("value"), new NumberSymbol(i * 10));
        scale.appendImpl(step_dict);
      }

      // Each dictionary in the list should have different values
      expect(scale.elements.length).toBe(3);
      expect((scale.elements[0] as DictionarySymbol).getImpl(new StringSymbol("name")).value).toBe("item0");
      expect((scale.elements[1] as DictionarySymbol).getImpl(new StringSymbol("name")).value).toBe("item1");
      expect((scale.elements[2] as DictionarySymbol).getImpl(new StringSymbol("name")).value).toBe("item2");

      expect((scale.elements[0] as DictionarySymbol).getImpl(new StringSymbol("value")).value).toBe(0);
      expect((scale.elements[1] as DictionarySymbol).getImpl(new StringSymbol("value")).value).toBe(10);
      expect((scale.elements[2] as DictionarySymbol).getImpl(new StringSymbol("value")).value).toBe(20);
    });
  });

  describe("extendImpl", () => {
    it("should deep copy elements from another list", () => {
      const list1 = new ListSymbol([]);
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("original")]]));
      const list2 = new ListSymbol([dict]);

      list1.extendImpl(list2);

      // Should be different instances
      expect(list1.elements[0]).not.toBe(list2.elements[0]);

      // Modify original
      dict.setImpl(new StringSymbol("key"), new StringSymbol("modified"));

      // Extended list should be unaffected
      expect((list1.elements[0] as DictionarySymbol).getImpl(new StringSymbol("key")).value).toBe("original");
    });

    it("should deep copy individual items", () => {
      const list = new ListSymbol([]);
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("test")]]));

      list.extendImpl(dict);

      expect(list.elements[0]).not.toBe(dict);
      expect((list.elements[0] as DictionarySymbol).getImpl(new StringSymbol("key")).value).toBe("test");
    });
  });

  describe("insertImpl", () => {
    it("should deep copy inserted items", () => {
      const list = new ListSymbol([new NumberSymbol(1), new NumberSymbol(3)]);
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("inserted")]]));

      list.insertImpl(new NumberSymbol(1), dict);

      expect(list.elements[1]).not.toBe(dict);
      expect((list.elements[1] as DictionarySymbol).getImpl(new StringSymbol("key")).value).toBe("inserted");
    });
  });

  describe("updateImpl", () => {
    it("should deep copy updated items", () => {
      const list = new ListSymbol([new NumberSymbol(1), new NumberSymbol(2)]);
      const dict = new DictionarySymbol(new Map([["key", new StringSymbol("updated")]]));

      list.updateImpl(new NumberSymbol(0), dict);

      expect(list.elements[0]).not.toBe(dict);
      expect((list.elements[0] as DictionarySymbol).getImpl(new StringSymbol("key")).value).toBe("updated");
    });
  });

  describe("other methods", () => {
    it("should delete items correctly", () => {
      const list = new ListSymbol([new NumberSymbol(1), new NumberSymbol(2), new NumberSymbol(3)]);
      list.deleteImpl(new NumberSymbol(1));
      expect(list.elements.length).toBe(2);
      expect(list.elements[1].value).toBe(3);
    });

    it("should get items correctly", () => {
      const list = new ListSymbol([new NumberSymbol(1), new StringSymbol("test")]);
      const item = list.getImpl(new NumberSymbol(1));
      expect(item.value).toBe("test");
    });

    it("should return correct length", () => {
      const list = new ListSymbol([new NumberSymbol(1), new NumberSymbol(2)]);
      expect(list.length().value).toBe(2);
    });

    it("should join elements correctly", () => {
      const list = new ListSymbol([new StringSymbol("a"), new StringSymbol("b"), new StringSymbol("c")]);
      const result = list.joinImpl(new StringSymbol(", "));
      expect(result.value).toBe("a, b, c");
    });
  });

  describe("toString", () => {
    it("should format explicit lists with commas", () => {
      const list = new ListSymbol([new StringSymbol("a"), new StringSymbol("b")]);
      expect(list.toString()).toBe("a, b");
    });

    it("should format implicit lists with spaces", () => {
      const list = new ListSymbol([new StringSymbol("a"), new StringSymbol("b")], true);
      expect(list.toString()).toBe("a b");
    });
  });
});