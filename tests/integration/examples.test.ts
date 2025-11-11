import * as path from "node:path";

import { ColorSymbol, DictionarySymbol, ListSymbol, NumberSymbol, StringSymbol } from "@interpreter/symbols";
import { processTokensFromFiles } from "@src/processor/processFiles";
import { assertNoErrors } from "@tests/integration/helpers";
import { describe, expect, it } from "vitest";

const EXAMPLES_DIR = path.join(process.cwd(), "data", "examples");

function examplePath(fileName: string): string {
  return path.join(EXAMPLES_DIR, fileName);
}

function listValues(list: ListSymbol): string[] {
  return list.elements.map((symbol) => symbol.toString());
}

function dictionaryValues(dictionary: DictionarySymbol): Record<string, string> {
  return Object.fromEntries(Array.from(dictionary.value.entries()).map(([key, symbol]) => [key, symbol.toString()]));
}

describe("Example JSON fixtures", () => {
  it("processes generating.json", async () => {
    const result = await processTokensFromFiles({
      path: examplePath("generating.json"),
      output: "symbols",
    });

    const colorsSimple = result.tokens.get("colors.simple");
    expect(colorsSimple).toBeInstanceOf(ListSymbol);
    expect(listValues(colorsSimple as ListSymbol)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);

    const colorsReferenced = result.tokens.get("colors-referenced");
    expect(colorsReferenced).toBeInstanceOf(NumberSymbol);
    expect(colorsReferenced?.toString()).toBe("1");

    const referencedType = result.tokens.get("referenced-type");
    expect(referencedType).toBeInstanceOf(StringSymbol);
    expect(referencedType?.toString()).toBe("number");

    const spacingSimple = result.tokens.get("spacing.simple");
    expect(spacingSimple).toBeInstanceOf(DictionarySymbol);
    expect(dictionaryValues(spacingSimple as DictionarySymbol)).toEqual({
      "1": "1px",
      "2": "2px",
      "3": "3px",
      "4": "4px",
      "5": "5px",
      "6": "6px",
      "7": "7px",
      "8": "8px",
      "9": "9px",
      "10": "10px",
    });

    const spacingRef = result.tokens.get("spacing-ref");
    expect(spacingRef?.toString()).toBe("1px");

    expect(result.tokens.get("deep-ref").toString()).toBe("2");
  });

  it("processes nested.json", async () => {
    const result = await processTokensFromFiles({
      path: examplePath("nested.json"),
      output: "symbols",
    });

    assertNoErrors(result);

    expect(result.tokens.get("colors.simple")?.toString()).toBe("#FFF");

    const referenced = result.tokens.get("colorse-referenced");
    expect(referenced).toBeInstanceOf(DictionarySymbol);
    const referencedSimple = (referenced as DictionarySymbol).value.get("simple");
    expect(referencedSimple).toBeInstanceOf(ColorSymbol);
    expect(referencedSimple?.toString()).toBe("#FFF");
  });

  it("processes nested-list.json", async () => {
    const result = await processTokensFromFiles({
      path: examplePath("nested-list.json"),
      output: "symbols",
    });

    assertNoErrors(result);

    const colorsSimple = result.tokens.get("colors.simple");
    expect(colorsSimple).toBeInstanceOf(ListSymbol);
    expect(listValues(colorsSimple as ListSymbol)).toEqual(["#FFF", "#000"]);

    const referenced = result.tokens.get("colorse-referenced");
    expect(referenced).toBeInstanceOf(DictionarySymbol);
    const referencedSimple = (referenced as DictionarySymbol).value.get("simple");
    expect(referencedSimple).toBeInstanceOf(ListSymbol);
    expect(listValues(referencedSimple as ListSymbol)).toEqual(["#FFF", "#000"]);
  });
});
