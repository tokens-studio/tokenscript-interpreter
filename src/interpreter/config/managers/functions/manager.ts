import {
  FunctionsErrorCode,
  InterpreterError,
  isLanguageError,
  serializeError,
} from "@interpreter/errors";
import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import { BooleanSymbol, NumberSymbol, StringSymbol } from "@interpreter/symbols";
import type { ISymbolType, Token } from "@src/types";
import { type } from "arktype";
import { BaseManager } from "../base-manager";

import { createSumFunction, mathFunctions } from "./builtin/math";

import { type FunctionSpecification, FunctionSpecificationSchema } from "./schema";

type functionName = string;
type FunctionImpl = (...args: ISymbolType[]) => ISymbolType;

export class FunctionsManager extends BaseManager<
  FunctionSpecification,
  ISymbolType[],
  ISymbolType
> {
  private functionMap: Map<functionName, FunctionImpl> = new Map();

  constructor() {
    super();
    this.setupBuiltinFunctions();
  }

  protected getSpecName(spec: FunctionSpecification): string {
    return spec.keyword;
  }

  public clone(): this {
    const functionsManager = new FunctionsManager();
    functionsManager.specs = this.specs;
    functionsManager.specTypes = this.specTypes;
    functionsManager.functionMap = this.functionMap;
    functionsManager.conversions = this.conversions;
    return functionsManager as this;
  }

  public register(name: functionName, spec: FunctionSpecification | string): FunctionSpecification {
    let parsedSpec: FunctionSpecification;

    if (typeof spec === "string") {
      const parseResult = FunctionSpecificationSchema(JSON.parse(spec));
      if (parseResult instanceof type.errors) {
        throw new Error(`Invalid function specification for ${name}: ${parseResult.summary}`);
      }
      parsedSpec = parseResult as FunctionSpecification;
    } else {
      const parseResult = FunctionSpecificationSchema(spec);
      if (parseResult instanceof type.errors) {
        throw new Error(`Invalid function specification for ${name}: ${parseResult.summary}`);
      }
      parsedSpec = parseResult as FunctionSpecification;
    }

    const functionName = parsedSpec.keyword.toLowerCase();
    this.specs.set(functionName, parsedSpec);
    this.specTypes.set(parsedSpec.name.toLowerCase(), functionName);

    // Register the dynamic function implementation
    this.registerDynamicFunction(parsedSpec);

    return parsedSpec;
  }

  private setupBuiltinFunctions(): void {
    // Register all math functions
    for (const [name, impl] of Object.entries(mathFunctions)) {
      this.registerFunction(name, impl);
    }

    // Register sum with unit manager access (lazy getter for deferred resolution)
    this.registerFunction(
      "sum",
      createSumFunction(() => this.parentConfig?.unitManager),
    );

    // Utility functions
    this.registerFunction(
      "parse_int",
      (strSymbol: ISymbolType, baseSymbol?: ISymbolType): NumberSymbol => {
        if (!(strSymbol instanceof StringSymbol))
          throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
            data: { functionName: "parse_int", expectedType: "string", argumentPosition: "first" },
          });
        const base = baseSymbol instanceof NumberSymbol ? (baseSymbol.value as number) : 10;
        const parsed = Number.parseInt(strSymbol.value as string, base);
        if (Number.isNaN(parsed))
          throw new InterpreterError(FunctionsErrorCode.PARSE_ERROR, {
            data: { functionName: "parse_int", value: String(strSymbol.value), base },
          });
        return new NumberSymbol(parsed);
      },
    );

    this.registerFunction("linear-gradient", (...args: ISymbolType[]): StringSymbol => {
      const stringArgs = args.map((arg) => arg.toString()).join(", ");
      return new StringSymbol(`linear-gradient(${stringArgs})`);
    });

    this.registerFunction("type", (arg: ISymbolType): StringSymbol => {
      const typeName = arg.getTypeName();

      if (typeName.includes(".")) {
        const parts = typeName.split(".");
        return new StringSymbol(parts[parts.length - 1].toLowerCase());
      }

      return new StringSymbol(typeName.toLowerCase());
    });

    // Type predicate functions
    this.registerFunction("is_null", (arg: ISymbolType): BooleanSymbol => {
      return new BooleanSymbol(arg.type === "Null");
    });

    this.registerFunction("is_number", (arg: ISymbolType): BooleanSymbol => {
      return new BooleanSymbol(arg.type === "Number");
    });

    this.registerFunction("is_string", (arg: ISymbolType): BooleanSymbol => {
      return new BooleanSymbol(arg.type === "String");
    });

    this.registerFunction("is_boolean", (arg: ISymbolType): BooleanSymbol => {
      return new BooleanSymbol(arg.type === "Boolean");
    });

    this.registerFunction("is_list", (arg: ISymbolType): BooleanSymbol => {
      return new BooleanSymbol(arg.type === "List");
    });

    this.registerFunction("is_number_with_unit", (arg: ISymbolType): BooleanSymbol => {
      return new BooleanSymbol(arg.type === "NumberWithUnit");
    });

    this.registerFunction("is_dictionary", (arg: ISymbolType): BooleanSymbol => {
      return new BooleanSymbol(arg.type === "Dictionary");
    });

    this.registerFunction("is_token", (arg: ISymbolType): BooleanSymbol => {
      return new BooleanSymbol(arg.type === "Token");
    });

    this.registerFunction("is_color", (arg: ISymbolType): BooleanSymbol => {
      return new BooleanSymbol(arg.type === "Color");
    });
  }

  private registerFunction(name: string, impl: FunctionImpl): void {
    this.functionMap.set(name.toLowerCase(), impl);
  }

  private registerDynamicFunction(spec: FunctionSpecification): void {
    const functionName = spec.keyword.toLowerCase();
    const script = spec.script.script;

    const impl: FunctionImpl = (...args: ISymbolType[]): ISymbolType => {
      try {
        // Create a config instance for the dynamic function execution
        const config = this.parentConfig?.clone();
        if (!config) {
          throw new InterpreterError(FunctionsErrorCode.NO_CONFIG_AVAILABLE, {
            data: { functionName },
          });
        }

        // Parse and execute the script
        const lexer = new Lexer(script);
        const ast = new Parser(lexer).parse();
        const interpreter = new Interpreter(ast, {
          references: { input: args },
          config,
        });

        const result = interpreter.interpret();
        if (result === null) {
          throw new InterpreterError(FunctionsErrorCode.FUNCTION_RETURNED_NULL, {
            data: { functionName },
          });
        }

        // Handle string results by converting them to StringSymbol
        if (typeof result === "string") {
          return new StringSymbol(result);
        }

        return result;
      } catch (error) {
        throw new InterpreterError(FunctionsErrorCode.EXECUTION_ERROR, {
          data: {
            functionName,
            error: isLanguageError(error) ? error : serializeError(error),
          },
        });
      }
    };

    this.functionMap.set(functionName, impl);
  }

  public getFunction(name: string): FunctionImpl | undefined {
    return this.functionMap.get(name.toLowerCase());
  }

  public hasFunction(name: string): boolean {
    return this.functionMap.has(name.toLowerCase());
  }

  public getFunctionNames(): string[] {
    return Array.from(this.functionMap.keys());
  }

  public getFunctionSchemas(): Map<string, FunctionSpecification> {
    return this.specs;
  }

  /**
   * Validate that a function call has the correct number of arguments
   * based on its schema spec. Only validates schema-registered functions
   * (not builtins which handle their own argument validation).
   */
  public validateFunctionArgs(name: string, args: ISymbolType[], token?: Token): void {
    const fnName = name.toLowerCase();
    const spec = this.specs.get(fnName);

    if (!spec?.input?.properties) return;

    const requiredCount = Object.values(spec.input.properties).filter(
      (prop: any) => !prop?.optional,
    ).length;
    if (args.length < requiredCount) {
      throw new InterpreterError(FunctionsErrorCode.REQUIRES_MIN_ARGUMENTS, {
        token,
        data: { functionName: name, minArgs: requiredCount },
      });
    }
  }
}
