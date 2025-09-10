import { basicSymbolTypes } from "../symbols";
import { ColorManager } from "./managers/color/manager";

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

  isValidSymbolType(baseType: string, subType?: string) {
    const lowerBaseType = baseType.toLowerCase();
    if (lowerBaseType === "color") {
      // if (subType) return !!this.colorManager.findSpecByKeyword(subType);
      // Color may be defined without subType
      return true;
    }
    // // Nothing else implements subType other than color
    // if (subType) return false;

    return !!basicSymbolTypes[lowerBaseType];
  }

}
