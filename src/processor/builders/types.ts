import type { InterpreterResult } from "@interpreter/interpreter";

export interface TokenBuilder<T = unknown> {
  onResolve(tokenName: string, value: InterpreterResult): void;
  onError(tokenName: string, error: Error, originalValue: string | unknown): void;
  getResult(): T;
  readonly name: string;
}

export type BuilderFormat = "nested" | "flat" | "map";
