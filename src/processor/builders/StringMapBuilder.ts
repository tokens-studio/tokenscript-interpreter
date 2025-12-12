import type { InterpreterResult } from "@interpreter/interpreter";
import { stringifyInterpreterResult } from "./base";
import { MapBuilder } from "./MapBuilder";

export class StringMapBuilder extends MapBuilder {
  onResolve(tokenName: string, value: InterpreterResult): void {
    super.onResolve(tokenName, value);
    this.result.set(tokenName, stringifyInterpreterResult(value));
  }

  getResult(): Map<string, string> {
    const stringMap = new Map<string, string>();
    for (const [key, value] of this.result.entries()) {
      stringMap.set(key, typeof value === "string" ? value : stringifyInterpreterResult(value));
    }
    return stringMap;
  }
}
