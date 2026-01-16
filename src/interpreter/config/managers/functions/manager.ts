import {
  FunctionsErrorCode,
  InterpreterError,
  isLanguageError,
  serializeError,
} from "@interpreter/errors";
import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import { NumberSymbol, NumberWithUnitSymbol, StringSymbol } from "@interpreter/symbols";
import type { ISymbolType } from "@src/types";
import { type } from "arktype";
import { BaseManager } from "../base-manager";

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
    // Math functions
    this.registerFunction("min", (...args: ISymbolType[]): NumberSymbol => {
      const nums = args.map((arg) => {
        if (arg instanceof NumberSymbol) return arg.value as number;
        if (arg instanceof NumberWithUnitSymbol) return arg.value as number;
        if (typeof arg.value === "number") return arg.value as number;
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS, {
          data: { functionName: "min" },
        });
      });
      return new NumberSymbol(Math.min(...nums));
    });

    this.registerFunction("max", (...args: ISymbolType[]): NumberSymbol => {
      const nums = args.map((arg) => {
        if (arg instanceof NumberSymbol) return arg.value as number;
        if (arg instanceof NumberWithUnitSymbol) return arg.value as number;
        if (typeof arg.value === "number") return arg.value as number;
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS, {
          data: { functionName: "max" },
        });
      });
      return new NumberSymbol(Math.max(...nums));
    });

    this.registerFunction("sum", (...args: ISymbolType[]): ISymbolType => {
      if (args.length < 2)
        throw new InterpreterError(FunctionsErrorCode.REQUIRES_MIN_ARGUMENTS, {
          data: { functionName: "sum", minArgs: 2 },
        });

      // Check if any arguments are NumberWithUnitSymbol
      const hasUnits = args.some((arg) => arg instanceof NumberWithUnitSymbol);

      if (!hasUnits) {
        // No units, just sum numbers
        const sum = args.reduce((acc, arg) => {
          if (arg instanceof NumberSymbol) return acc + (arg.value as number);
          if (typeof arg.value === "number") return acc + (arg.value as number);
          throw new InterpreterError(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS, {
            data: { functionName: "sum" },
          });
        }, 0);
        return new NumberSymbol(sum);
      }

      // Has units, use unit manager for conversion
      const numericArgs = args.filter(
        (arg) => arg instanceof NumberSymbol || arg instanceof NumberWithUnitSymbol,
      ) as Array<NumberSymbol | NumberWithUnitSymbol>;

      if (numericArgs.length !== args.length) {
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
          data: {
            functionName: "sum",
            expectedType: "number or NumberWithUnit",
            argumentPosition: "all",
          },
        });
      }

      if (this.parentConfig?.unitManager) {
        try {
          const converted = this.parentConfig.unitManager.convertToCommonFormat(numericArgs);
          const sum = converted.reduce((acc, arg) => {
            const value = (arg.value as number) || 0;
            return acc + value;
          }, 0);

          // Return with the unit of the first converted argument if it has one
          const firstUnitArg = converted.find(
            (arg) => arg instanceof NumberWithUnitSymbol,
          ) as NumberWithUnitSymbol;
          if (firstUnitArg) {
            return new NumberWithUnitSymbol(sum, firstUnitArg.unit);
          }

          return new NumberSymbol(sum);
        } catch (error) {
          throw new InterpreterError(FunctionsErrorCode.UNIT_CONVERSION_FAILED, {
            data: {
              functionName: "sum",
              error: isLanguageError(error) ? error : serializeError(error),
            },
          });
        }
      }

      // Fallback: sum without conversion
      const firstUnitArg = args.find(
        (arg) => arg instanceof NumberWithUnitSymbol,
      ) as NumberWithUnitSymbol;

      const sum = args.reduce((acc, arg) => {
        if (arg instanceof NumberSymbol) return acc + (arg.value as number);
        if (arg instanceof NumberWithUnitSymbol) return acc + (arg.value as number);
        if (typeof arg.value === "number") return acc + (arg.value as number);
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS, {
          data: { functionName: "sum" },
        });
      }, 0);

      if (firstUnitArg) {
        return new NumberWithUnitSymbol(sum, firstUnitArg.unit);
      }

      return new NumberSymbol(sum);
    });

    this.registerFunction("mod", (a: ISymbolType, b: ISymbolType): NumberSymbol => {
      let aVal: number, bVal: number;

      if (a instanceof NumberSymbol) aVal = a.value as number;
      else if (a instanceof NumberWithUnitSymbol) aVal = a.value as number;
      else if (typeof a.value === "number") aVal = a.value as number;
      else
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS, {
          data: { functionName: "mod" },
        });

      if (b instanceof NumberSymbol) bVal = b.value as number;
      else if (b instanceof NumberWithUnitSymbol) bVal = b.value as number;
      else if (typeof b.value === "number") bVal = b.value as number;
      else
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS, {
          data: { functionName: "mod" },
        });

      if (bVal === 0)
        throw new InterpreterError(FunctionsErrorCode.DIVISION_BY_ZERO, {
          data: { functionName: "mod" },
        });

      return new NumberSymbol(((aVal % bVal) + bVal) % bVal);
    });

    this.registerFunction("average", (...args: ISymbolType[]): NumberSymbol => {
      if (args.length === 0)
        throw new InterpreterError(FunctionsErrorCode.REQUIRES_MIN_ARGUMENTS, {
          data: { functionName: "average", minArgs: 1 },
        });
      const sum = args.reduce((acc, arg) => {
        if (!(arg instanceof NumberSymbol))
          throw new InterpreterError(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS, {
            data: { functionName: "average" },
          });
        return acc + (arg.value as number);
      }, 0);
      return new NumberSymbol(sum / args.length);
    });

    this.registerFunction("round", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
          data: { functionName: "round", expectedType: "number", argumentPosition: "first" },
        });
      return new NumberSymbol(Math.round(arg.value as number));
    });

    this.registerFunction("abs", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
          data: { functionName: "abs", expectedType: "number", argumentPosition: "first" },
        });
      return new NumberSymbol(Math.abs(arg.value as number));
    });

    this.registerFunction("sqrt", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
          data: { functionName: "sqrt", expectedType: "number", argumentPosition: "first" },
        });
      return new NumberSymbol(Math.sqrt(arg.value as number));
    });

    this.registerFunction("pow", (base: ISymbolType, exp: ISymbolType): NumberSymbol => {
      if (!(base instanceof NumberSymbol) || !(exp instanceof NumberSymbol))
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS, {
          data: { functionName: "pow" },
        });
      return new NumberSymbol((base.value as number) ** (exp.value as number));
    });

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

    // Trigonometric functions
    this.registerFunction("sin", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
          data: { functionName: "sin", expectedType: "number", argumentPosition: "first" },
        });
      return new NumberSymbol(Math.sin(arg.value as number));
    });

    this.registerFunction("cos", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
          data: { functionName: "cos", expectedType: "number", argumentPosition: "first" },
        });
      return new NumberSymbol(Math.cos(arg.value as number));
    });

    this.registerFunction("tan", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
          data: { functionName: "tan", expectedType: "number", argumentPosition: "first" },
        });
      return new NumberSymbol(Math.tan(arg.value as number));
    });

    // Inverse trigonometric functions
    this.registerFunction("asin", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
          data: { functionName: "asin", expectedType: "number", argumentPosition: "first" },
        });
      const value = arg.value as number;
      if (value < -1 || value > 1)
        throw new InterpreterError(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE, {
          data: { functionName: "asin", constraint: "between -1 and 1" },
        });
      return new NumberSymbol(Math.asin(value));
    });

    this.registerFunction("acos", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
          data: { functionName: "acos", expectedType: "number", argumentPosition: "first" },
        });
      const value = arg.value as number;
      if (value < -1 || value > 1)
        throw new InterpreterError(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE, {
          data: { functionName: "acos", constraint: "between -1 and 1" },
        });
      return new NumberSymbol(Math.acos(value));
    });

    this.registerFunction("atan", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
          data: { functionName: "atan", expectedType: "number", argumentPosition: "first" },
        });
      return new NumberSymbol(Math.atan(arg.value as number));
    });

    this.registerFunction("atan2", (y: ISymbolType, x: ISymbolType): NumberSymbol => {
      if (!(y instanceof NumberSymbol) || !(x instanceof NumberSymbol))
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS, {
          data: { functionName: "atan2" },
        });
      return new NumberSymbol(Math.atan2(y.value as number, x.value as number));
    });

    // Logarithmic functions
    this.registerFunction("log", (arg: ISymbolType, base?: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
          data: { functionName: "log", expectedType: "number", argumentPosition: "first" },
        });
      const value = arg.value as number;
      if (value <= 0)
        throw new InterpreterError(FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE, {
          data: { functionName: "log", constraint: "positive" },
        });

      if (base === undefined) {
        return new NumberSymbol(Math.log(value));
      }

      if (!(base instanceof NumberSymbol))
        throw new InterpreterError(FunctionsErrorCode.INVALID_BASE, {
          data: { functionName: "log", constraint: "a number" },
        });
      const baseValue = base.value as number;
      if (baseValue <= 0 || baseValue === 1)
        throw new InterpreterError(FunctionsErrorCode.INVALID_BASE, {
          data: { functionName: "log", constraint: "positive and not equal to 1" },
        });

      return new NumberSymbol(Math.log(value) / Math.log(baseValue));
    });

    this.registerFunction("floor", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
          data: { functionName: "floor", expectedType: "number", argumentPosition: "first" },
        });
      return new NumberSymbol(Math.floor(arg.value as number));
    });

    this.registerFunction("ceil", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
          data: { functionName: "ceil", expectedType: "number", argumentPosition: "first" },
        });
      return new NumberSymbol(Math.ceil(arg.value as number));
    });

    this.registerFunction(
      "round_to",
      (value: ISymbolType, precision?: ISymbolType): NumberSymbol => {
        if (!(value instanceof NumberSymbol))
          throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
            data: { functionName: "round_to", expectedType: "number", argumentPosition: "first" },
          });

        let precisionValue = 0;
        if (precision !== undefined) {
          if (!(precision instanceof NumberSymbol))
            throw new InterpreterError(FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT, {
              data: {
                functionName: "round_to",
                expectedType: "number",
                argumentPosition: "second",
              },
            });
          precisionValue = precision.value as number;
        }

        const numValue = value.value as number;

        if (precisionValue === 0) {
          return new NumberSymbol(Math.round(numValue));
        }

        const factor = 10 ** precisionValue;
        return new NumberSymbol(Math.round(numValue * factor) / factor);
      },
    );

    // Utility functions
    this.registerFunction("linear-gradient", (...args: ISymbolType[]): StringSymbol => {
      const stringArgs = args.map((arg) => arg.toString()).join(", ");
      return new StringSymbol(`linear-gradient(${stringArgs})`);
    });

    this.registerFunction("pi", (): NumberSymbol => new NumberSymbol(Math.PI));

    this.registerFunction("type", (arg: ISymbolType): StringSymbol => {
      const typeName = arg.getTypeName();

      if (typeName.includes(".")) {
        const parts = typeName.split(".");
        return new StringSymbol(parts[parts.length - 1].toLowerCase());
      }

      return new StringSymbol(typeName.toLowerCase());
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
}
