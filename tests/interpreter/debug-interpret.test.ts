import { createInterpreter, interpret } from "@tests/interpreter/test-helpers";
import { describe, expect, it } from "vitest";

describe("Debug Interpret", () => {
  it("interprets 3s with createInterpreter", () => {
    const interpreter = createInterpreter("3s");
    const result = interpreter.interpret();
    console.log("3s result:", result?.toString(), "type:", result?.type);
    expect(result?.toString()).toBe("3s");
  });

  it("interprets 3s + 2s with createInterpreter", () => {
    const interpreter = createInterpreter("3s + 2s");
    const result = interpreter.interpret();
    console.log("3s + 2s result:", result?.toString(), "type:", result?.type);
    expect(result?.toString()).toBe("5s");
  });

  it("interprets 3s with interpret helper", () => {
    const result = interpret("3s");
    console.log("interpret 3s result:", result);
    expect(result).toBe("3s");
  });

  it("interprets 3s + 2s with interpret helper", () => {
    const result = interpret("3s + 2s");
    console.log("interpret 3s + 2s result:", result);
    expect(result).toBe("5s");
  });
});
