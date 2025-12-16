import type { InterpreterResult } from "../interpreter/interpreter";
import type { BuildTokensOptions } from "./builders/base";
import type { TokenBuilder } from "./builders/types";
import type { ObjectParser } from "./object-parsers";
import type { ProcessorOutput } from "./resolver/TokenResolver";
import type { IssuesMap } from "./resolver/types";

export type ProcessOptions = BuildTokensOptions<any>;

export interface ProcessSetsOptions extends ProcessOptions {
  activeSets?: string[];
  activeTheme?: string;
}

export interface ProcessResult<T = Map<string, string | InterpreterResult>>
  extends ProcessorOutput {
  output: T;
  issues?: IssuesMap;
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
