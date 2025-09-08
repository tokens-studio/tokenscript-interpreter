import type { ColorManager } from "./managers/color/manager";

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
  public colorManager: ColorManager | null = null;

  constructor(options?: ConfigOptions) {
    this.languageOptions = {
      ...DEFAULT_LANGUAGE_OPTIONS,
      ...options?.languageOptions,
    };
    this.colorManager = options?.colorManager || null;
  }

  setup(colorManager?: ColorManager) {
    this.colorManager = colorManager || null;
  }
}
