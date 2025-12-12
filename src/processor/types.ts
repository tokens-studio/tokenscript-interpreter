import type { InterpreterResult } from "../interpreter/interpreter";
import type { BuildTokensOptions } from "./builders/base";
import type { TokenBuilder } from "./builders/types";
import type { LintResult } from "./linter";
import type { ProcessorOutput } from "./resolver/TokenResolver";

export type ProcessOptions = BuildTokensOptions<any>;

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
  builder?: TokenBuilder<T>;
  objectParsers?: ObjectParser[];
};
