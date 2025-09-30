import { describe, it, expect } from "vitest";
import { groupBy } from "../../../src/interpreter/utils/coll";

describe("groupBy", () => {
  it("should group strings by their length", () => {
    const result = groupBy((s: string) => s.length, ["a", "as", "asd", "aa", "asdf", "qwer"]);
    
    expect(result).toEqual({
      1: ["a"],
      2: ["as", "aa"],
      3: ["asd"],
      4: ["asdf", "qwer"]
    });
  });

  it("should group integers by odd/even predicate", () => {
    const result = groupBy((n: number) => n % 2 === 1, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    
    expect(result).toEqual({
      false: [0, 2, 4, 6, 8],
      true: [1, 3, 5, 7, 9]
    });
  });

  it("should group objects by property value", () => {
    const data = [
      { "user-id": 1, uri: "/" },
      { "user-id": 2, uri: "/foo" },
      { "user-id": 1, uri: "/account" }
    ];
    
    const result = groupBy((obj) => obj["user-id"], data);
    
    expect(result).toEqual({
      1: [
        { "user-id": 1, uri: "/" },
        { "user-id": 1, uri: "/account" }
      ],
      2: [
        { "user-id": 2, uri: "/foo" }
      ]
    });
  });

  it("should group by category property", () => {
    const data = [
      { category: "a", id: 1 },
      { category: "a", id: 2 },
      { category: "b", id: 3 }
    ];
    
    const result = groupBy((item) => item.category, data);
    
    expect(result).toEqual({
      a: [
        { category: "a", id: 1 },
        { category: "a", id: 2 }
      ],
      b: [
        { category: "b", id: 3 }
      ]
    });
  });

  it("should group by multiple criteria using tuple-like keys", () => {
    const words = ["Air", "Bud", "Cup", "Awake", "Break", "Chunk", "Ant", "Big", "Check"];
    
    // Group by first letter and length
    const result = groupBy((word: string) => `${word[0]}_${word.length}`, words);
    
    expect(result).toEqual({
      "A_3": ["Air", "Ant"],
      "B_3": ["Bud", "Big"],
      "C_3": ["Cup"],
      "A_5": ["Awake"],
      "B_5": ["Break"],
      "C_5": ["Chunk", "Check"]
    });
  });

  it("should find anagrams by grouping by character set", () => {
    const words = ["meat", "mat", "team", "mate", "eat", "tea"];
    
    // Group by sorted characters (poor man's set for anagrams)
    const result = groupBy((word: string) => word.split("").sort().join(""), words);
    
    expect(result).toEqual({
      "aemt": ["meat", "team", "mate"],
      "amt": ["mat"],
      "aet": ["eat", "tea"]
    });
  });

  it("should handle empty collection", () => {
    const result = groupBy((x: number) => x, []);
    
    expect(result).toEqual({});
  });

  it("should handle single element", () => {
    const result = groupBy((s: string) => s.length, ["hello"]);
    
    expect(result).toEqual({
      5: ["hello"]
    });
  });

  it("should preserve order of elements within groups", () => {
    const data = [1, 3, 2, 4, 6, 5, 8, 7, 9];
    const result = groupBy((n: number) => n % 2, data);
    
    expect(result).toEqual({
      1: [1, 3, 5, 7, 9],  // odd numbers in original order
      0: [2, 4, 6, 8]      // even numbers in original order
    });
  });

  it("should work with boolean keys", () => {
    const numbers = [1, 2, 3, 4, 5, 6];
    const result = groupBy((n: number) => n > 3, numbers);
    
    expect(result).toEqual({
      false: [1, 2, 3],
      true: [4, 5, 6]
    });
  });

  it("should work with string keys", () => {
    const items = [
      { type: "fruit", name: "apple" },
      { type: "vegetable", name: "carrot" },
      { type: "fruit", name: "banana" },
      { type: "vegetable", name: "broccoli" }
    ];
    
    const result = groupBy((item) => item.type, items);
    
    expect(result).toEqual({
      fruit: [
        { type: "fruit", name: "apple" },
        { type: "fruit", name: "banana" }
      ],
      vegetable: [
        { type: "vegetable", name: "carrot" },
        { type: "vegetable", name: "broccoli" }
      ]
    });
  });

  it("should work with number keys", () => {
    const data = [
      { priority: 1, task: "urgent" },
      { priority: 2, task: "normal" },
      { priority: 1, task: "critical" },
      { priority: 3, task: "low" }
    ];
    
    const result = groupBy((item) => item.priority, data);
    
    expect(result).toEqual({
      1: [
        { priority: 1, task: "urgent" },
        { priority: 1, task: "critical" }
      ],
      2: [
        { priority: 2, task: "normal" }
      ],
      3: [
        { priority: 3, task: "low" }
      ]
    });
  });
});