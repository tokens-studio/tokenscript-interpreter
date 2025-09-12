import type { ISymbolType } from "@/types";
import { basicSymbolTypes, ColorSymbol, StringSymbol } from "../symbols";
import { ColorManager } from "./managers/color/manager";
import { InterpreterError } from "../errors";

export interface LanguageOptions {
  MAX_ITERATIONS: number;
}

export interface ConfigOptions {
  languageOptions?: LanguageOptions;
  colorManager?: ColorManager;
}

export const DEFAULT_LANGUAGE_OPTIONS: LanguageOptions = {
  MAX_ITERATIONS: 1000,
};

export class Config {
  public languageOptions: LanguageOptions;
  public colorManager: ColorManager;

  constructor(options?: ConfigOptions) {
    this.languageOptions = {
      ...DEFAULT_LANGUAGE_OPTIONS,
      ...options?.languageOptions,
    };
    this.colorManager = options?.colorManager || new ColorManager();
  }

  getType(baseType: string, subType?: string): ISymbolType {
    const lowerBaseType = baseType.toLowerCase();

    if (lowerBaseType === "color") {
      if (subType) {
        if (!this.colorManager.getSpecByType(subType)) {
          throw new InterpreterError(`No spec found for ${subType}`);
        }
        return new ColorSymbol(null, subType);
      }
      return ColorSymbol.empty();
    }

    const basicSymbolConstructor = basicSymbolTypes[baseType.toLowerCase()];
    if (!basicSymbolConstructor) {
      throw new InterpreterError(`No type found for ${baseType}`);
    }

    return basicSymbolConstructor.empty();
  }

  isTypeDefined(baseType: string, subType?: string): boolean {
    const lowerBaseType = baseType.toLowerCase();
    if (lowerBaseType === "color") {
      if (subType) return !!this.colorManager.getSpecByType(subType);
      // Color may be defined without subType
      return true;
    }
    // Nothing else implements subType other than color
    if (subType) return false;

    return !!basicSymbolTypes[lowerBaseType];
  }
}
