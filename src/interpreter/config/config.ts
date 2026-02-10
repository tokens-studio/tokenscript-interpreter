import type { ISymbolType } from "@src/types";
import { ConfigErrorCode, InterpreterError } from "../errors";
import { basicSymbolTypes, ColorSymbol } from "../symbols";
import { ColorManager } from "./managers/color/manager";
import type { ColorSpecification } from "./managers/color/schema";
import type { ConstantsSpecification } from "./managers/constants/schema";
import { FunctionsManager } from "./managers/functions/manager";
import type { FunctionSpecification } from "./managers/functions/schema";
import { TokenManager } from "./managers/token/manager";
import type { TokenSpecification } from "./managers/token/schema";
import { UnitManager } from "./managers/unit/manager";

export interface LanguageOptions {
  MAX_ITERATIONS: number;
}

export interface ConfigOptions {
  languageOptions?: LanguageOptions;
  colorManager?: ColorManager;
  unitManager?: UnitManager;
  functionsManager?: FunctionsManager;
  tokenManager?: TokenManager;
}

export const DEFAULT_LANGUAGE_OPTIONS: LanguageOptions = {
  MAX_ITERATIONS: 1000,
};

export class Config {
  public languageOptions: LanguageOptions;
  public colorManager: ColorManager;
  public unitManager: UnitManager;
  public functionsManager: FunctionsManager;
  public tokenManager: TokenManager;
  private _inlineConstants: Map<string, string | number | boolean> = new Map();

  constructor(options?: ConfigOptions) {
    this.languageOptions = {
      ...DEFAULT_LANGUAGE_OPTIONS,
      ...options?.languageOptions,
    };
    this.colorManager = options?.colorManager || new ColorManager();
    this.unitManager = options?.unitManager || new UnitManager();
    this.functionsManager = options?.functionsManager || new FunctionsManager();
    this.tokenManager = options?.tokenManager || new TokenManager();

    // Set parent config reference to avoid recursion issues
    // Only set if not already set to prevent overriding existing parent references
    if (!this.colorManager.getParentConfig()) {
      this.colorManager.setParentConfig(this);
    }
    if (!this.unitManager.getParentConfig()) {
      this.unitManager.setParentConfig(this);
    }
    if (!this.functionsManager.getParentConfig()) {
      this.functionsManager.setParentConfig(this);
    }
    if (!this.tokenManager.getParentConfig()) {
      this.tokenManager.setParentConfig(this);
    }
  }

  getType(baseType: string, subType?: string): ISymbolType {
    const lowerBaseType = baseType.toLowerCase();

    if (lowerBaseType === "color") {
      if (subType) {
        if (!this.colorManager.getSpecByType(subType)) {
          throw new InterpreterError(ConfigErrorCode.NO_SPEC_FOUND, {
            data: { specName: subType },
          });
        }
        return new ColorSymbol(null, subType, null, this);
      }
      return new ColorSymbol(null, undefined, null, this);
    }

    const basicSymbolConstructor = basicSymbolTypes[baseType.toLowerCase()];
    if (!basicSymbolConstructor) {
      throw new InterpreterError(ConfigErrorCode.NO_TYPE_FOUND, {
        data: { typeName: baseType },
      });
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

  get inlineConstants(): Map<string, string | number | boolean> {
    return this._inlineConstants;
  }

  clone(): Config {
    return new Config({
      languageOptions: { ...this.languageOptions },
      colorManager: this.colorManager.clone(),
      unitManager: this.unitManager.clone(),
      functionsManager: this.functionsManager.clone(),
      tokenManager: this.tokenManager.clone(),
    });
  }

  registerSchemas(
    schemas: Array<{
      uri: string;
      schema:
        | ColorSpecification
        | FunctionSpecification
        | TokenSpecification
        | ConstantsSpecification;
    }>,
  ): Config {
    for (const { uri, schema } of schemas) {
      switch (schema.type) {
        case "color":
          this.colorManager.register(uri, schema as ColorSpecification);
          break;
        case "function":
          this.functionsManager.register(
            (schema as FunctionSpecification).keyword,
            schema as FunctionSpecification,
          );
          break;
        case "token":
          this.tokenManager.register(uri, schema as TokenSpecification);
          break;
        case "constants": {
          const spec = schema as ConstantsSpecification;
          if (!spec.inline) break;
          for (const [key, value] of Object.entries(spec.values)) {
            this._inlineConstants.set(key, value);
          }
          break;
        }
      }
    }
    return this;
  }
}
