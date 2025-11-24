import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "../interpreter/interpreter";
import type { OutputFormat, TokenBuilder } from "./builders/types";
import type { LintResult, LintRunner } from "./linter";
import type { ObjectParser } from "./object-parsers";
import type { ProcessorOutput } from "./resolver/TokenResolver";

export interface ProcessOptions {
  config?: Config;
  output?: OutputFormat;
  builder?: TokenBuilder<any>;
  objectParsers?: ObjectParser[];
  linter?: LintRunner;
}

export interface ProcessSetsOptions extends ProcessOptions {
  activeSets?: string[];
  activeTheme?: string;
}

export interface ProcessResult<T = Map<string, string | InterpreterResult>>
  extends ProcessorOutput {
  output: T;
  lint?: LintResult;
}

export type ProcessFilesOptions<T = any> = {
  path: string;
  outputPath?: string;
  schemas?: string[];
  activeSets?: string[];
  activeTheme?: string;
  output?: "string" | "symbols";
  builder?: TokenBuilder<T>;
  objectParsers?: ObjectParser[];
};
