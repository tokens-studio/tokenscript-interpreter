import type { InterpreterResult } from "@interpreter/interpreter";
import type { TokenBuilder } from "./types";

export class MapBuilder implements TokenBuilder<Map<string, string | InterpreterResult>> {
  readonly name = "map";
  private result: Map<string, string | InterpreterResult> = new Map();
  private successfullyResolved: Map<string, InterpreterResult> = new Map();

  onResolve(tokenName: string, value: InterpreterResult): void {
    this.successfullyResolved.set(tokenName, value);
    this.result.set(tokenName, value);
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
