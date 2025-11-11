import type { interpreterResult } from "@interpreter/interpreter";
import { stringifyInterpreterResult } from "./base";
import type { TokenBuilder } from "./types";

export class MapBuilder implements TokenBuilder<Map<string, string | interpreterResult>> {
  readonly name = "map";
  private result: Map<string, string | interpreterResult> = new Map();
  private successfullyResolved: Map<string, interpreterResult> = new Map();

  constructor(private outputFormat: "string" | "symbols" = "string") {}

  onResolve(tokenName: string, value: interpreterResult): void {
    this.successfullyResolved.set(tokenName, value);

    if (this.outputFormat === "symbols") {
      this.result.set(tokenName, value);
    } else {
      this.result.set(tokenName, stringifyInterpreterResult(value));
    }
  }

  onError(tokenName: string, _error: Error, originalValue: string): void {
    this.result.set(tokenName, originalValue);
  }

  getResult(): Map<string, string | interpreterResult> {
    return this.result;
  }

  getResolvedTokens(): Map<string, interpreterResult> {
    return this.successfullyResolved;
  }
}
