import { describe, expect, it } from "vitest";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import { Interpreter } from "@interpreter/interpreter";
import { DictionarySymbol, StringSymbol, ListSymbol, BooleanSymbol, NumberSymbol, NullSymbol, ColorSymbol } from "@interpreter/symbols";

describe("Dictionary Operations", () => {
  describe("Basic Dictionary Operations", () => {
    it("should create an empty dictionary", () => {
      const text = `
        variable my_dict: Dictionary;
        return my_dict;
      `;
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
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
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
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
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
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
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(DictionarySymbol);
      expect(result?.toString()).toBe("{'key1': 'value1', 'key3': 'value3'}");
    });

    it("should check if key exists", () => {
      const text = `
        variable my_dict: Dictionary;
        my_dict.set("key1", "value1");
        variable exists: Boolean = my_dict.keyExists("key1");
        variable not_exists: Boolean = my_dict.keyExists("key2");
        return exists;
      `;
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
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
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
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
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
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
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
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
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
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
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser, {
        references: {
          my_ref_dict: { key1: "reference_value1", key2: "reference_value2" }
        }
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
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(NullSymbol);
      expect((result as NullSymbol).value).toBe(null);
    });

    it("should handle keyExists for non-existent keys", () => {
      const text = `
        variable my_dict: Dictionary;
        variable exists: Boolean = my_dict.keyExists("nonexistent");
        return exists;
      `;
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
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
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      const result = interpreter.interpret();
      
      // Check that my_dict has the expected structure
      expect(result).toBeInstanceOf(DictionarySymbol);
      expect(result?.toString()).toBe("{'key1': 'value1', 'key2': 'value2'}");
      
      // Check that variables were set correctly
      const symbolTable = (interpreter as any).symbolTable;
      const value1 = symbolTable.get("value1");
      const value2 = symbolTable.get("value2");
      const keys = symbolTable.get("keys");

      expect(value1?.toString()).toBe("value1");
      expect(value2?.toString()).toBe("value2");
      expect(keys?.toString()).toBe("key1, key2, key3");
    });

    it("should match the basic list test from Python implementation", () => {
      const text = `
        variable my_list: List;
        my_list.append(1);
        my_list.append(2);
        return my_list.get(0);
      `;
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      const result = interpreter.interpret();
      
      // Check that result is the first element
      expect(result).toBeInstanceOf(NumberSymbol);
      expect(result?.toString()).toBe("1");
      
      // Check that my_list has the expected structure
      const symbolTable = (interpreter as any).symbolTable;
      const myList = symbolTable.get("my_list");
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
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(ListSymbol);
      // Keys should be in insertion order: third, first, second
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
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(DictionarySymbol);
      // Dictionary string representation should maintain insertion order
      expect(result?.toString()).toBe("{'z': 'last', 'a': 'first', 'm': 'middle'}");
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
      const lexer = new Lexer(text);
      const parser = new Parser(lexer);
      const interpreter = new Interpreter(parser);
      const result = interpreter.interpret();
      
      expect(result).toBeInstanceOf(ListSymbol);
      // Order should be: first, third, fourth, second (second re-added at the end)
      expect(result?.toString()).toBe("first, third, fourth, second");
    });
  });
});
