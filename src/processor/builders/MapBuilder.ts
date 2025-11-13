import type { InterpreterResult } from "@interpreter/interpreter";
import { stringifyInterpreterResult } from "./base";
import type { TokenBuilder } from "./types";

export class MapBuilder implements TokenBuilder<Map<string, string | InterpreterResult>> {
  readonly name = "map";
  private result: Map<string, string | InterpreterResult> = new Map();
  private successfullyResolved: Map<string, InterpreterResult> = new Map();

  constructor(private outputFormat: "string" | "symbols" = "string") {}

  onResolve(tokenName: string, value: InterpreterResult): void {
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

  getResult(): Map<string, string | InterpreterResult> {
    return this.result;
  }

  getResolvedTokens(): Map<string, InterpreterResult> {
    return this.successfullyResolved;
  }
}
