import {
  FunctionsErrorCode,
  InterpreterError,
  isLanguageError,
  serializeError,
} from "@interpreter/errors";
import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import {
  BooleanSymbol,
  ListSymbol,
  NumberSymbol,
  NumberWithUnitSymbol,
  StringSymbol,
  TokenSymbol,
} from "@interpreter/symbols";
import type { ISymbolType, Token } from "@src/types";
import { ZodError } from "@tokens-studio/schema-validation";
import { BaseManager } from "../base-manager";

import { createSumFunction, mathFunctions } from "./builtin/math";

import { type FunctionSpecification, parseFunctionSpec } from "./schema";

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

    try {
      const input = typeof spec === "string" ? JSON.parse(spec) : spec;
      parsedSpec = parseFunctionSpec(input);
    } catch (err) {
      const summary =
        err instanceof ZodError
          ? err.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ")
          : err instanceof Error
            ? err.message
            : String(err);
      throw new Error(`Invalid function specification for ${name}: ${summary}`);
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
      // For NumberWithUnit values, return the unit string (e.g. "%", "px", "s")
      // so that expressions like type(val) == "%" work as expected. Matches the
      // Go runtime's builtinType special-case.
      if (arg instanceof NumberWithUnitSymbol) {
        return new StringSymbol(arg.unit);
      }

      // For Token wrappers, return the base type "token" (without the sub-type)
      // to match Go, whose TokenValue.Type() returns "Token" — unlike Color/List
      // whose Type() includes the sub-type.
      if (arg instanceof TokenSymbol) {
        return new StringSymbol(arg.type.toLowerCase());
      }

      // Return the full lowercase type name (e.g. "list.implicit", "color.hex")
      // for cross-runtime consistency (Go/TS parity) — Go returns
      // strings.ToLower(Type()) without stripping the sub-type.
      return new StringSymbol(arg.getTypeName().toLowerCase());
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

    // range(count) or range(start, end) — generate list of integers
    this.registerFunction("range", (...args: ISymbolType[]): ListSymbol => {
      if (args.length < 1 || args.length > 2) {
        throw new InterpreterError(FunctionsErrorCode.REQUIRES_MIN_ARGUMENTS, {
          data: { functionName: "range", minArgs: 1 },
        });
      }

      let start: number;
      let end: number;

      if (args.length === 1) {
        // range(count) → [0, 1, ..., count-1]
        if (!(args[0] instanceof NumberSymbol)) {
          throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
            data: { functionName: "range", expectedType: "Number", argumentPosition: "first" },
          });
        }
        const v = args[0].value as number;
        if (v !== Math.trunc(v) || Number.isNaN(v) || !Number.isFinite(v) || v < 0 || v > 1e6) {
          throw new InterpreterError(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE, {
            data: {
              functionName: "range",
              constraint: `count must be a non-negative integer <= 1000000, got ${v}`,
            },
          });
        }
        start = 0;
        end = v;
      } else {
        // range(start, end) → [start, start+1, ..., end-1]
        if (!(args[0] instanceof NumberSymbol)) {
          throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
            data: { functionName: "range", expectedType: "Number", argumentPosition: "first" },
          });
        }
        if (!(args[1] instanceof NumberSymbol)) {
          throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
            data: { functionName: "range", expectedType: "Number", argumentPosition: "second" },
          });
        }
        const sv = args[0].value as number;
        const ev = args[1].value as number;
        if (
          sv !== Math.trunc(sv) ||
          ev !== Math.trunc(ev) ||
          Number.isNaN(sv) ||
          Number.isNaN(ev) ||
          !Number.isFinite(sv) ||
          !Number.isFinite(ev)
        ) {
          throw new InterpreterError(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE, {
            data: {
              functionName: "range",
              constraint: `arguments must be integers, got ${sv} and ${ev}`,
            },
          });
        }
        if (ev - sv > 1e6) {
          throw new InterpreterError(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE, {
            data: {
              functionName: "range",
              constraint: `size exceeds limit (1000000), got ${ev - sv}`,
            },
          });
        }
        start = sv;
        end = ev;
      }

      if (end < start) {
        return new ListSymbol([], false);
      }

      const elements: NumberSymbol[] = [];
      for (let i = start; i < end; i++) {
        elements.push(new NumberSymbol(i));
      }
      return new ListSymbol(elements, false);
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
