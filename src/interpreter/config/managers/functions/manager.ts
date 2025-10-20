import { InterpreterError } from "@interpreter/errors";
import { Interpreter } from "@interpreter/interpreter";
import { Lexer } from "@interpreter/lexer";
import { Parser } from "@interpreter/parser";
import { NumberSymbol, NumberWithUnitSymbol, StringSymbol } from "@interpreter/symbols";
import type { ISymbolType } from "@src/types";
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
      const parseResult = FunctionSpecificationSchema.safeParse(JSON.parse(spec));
      if (!parseResult.success) {
        throw new Error(`Invalid function specification for ${name}: ${parseResult.error.message}`);
      }
      parsedSpec = parseResult.data;
    } else {
      const parseResult = FunctionSpecificationSchema.safeParse(spec);
      if (!parseResult.success) {
        throw new Error(`Invalid function specification for ${name}: ${parseResult.error.message}`);
      }
      parsedSpec = parseResult.data;
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
        throw new InterpreterError("min() expects number arguments.");
      });
      return new NumberSymbol(Math.min(...nums));
    });

    this.registerFunction("max", (...args: ISymbolType[]): NumberSymbol => {
      const nums = args.map((arg) => {
        if (arg instanceof NumberSymbol) return arg.value as number;
        if (arg instanceof NumberWithUnitSymbol) return arg.value as number;
        if (typeof arg.value === "number") return arg.value as number;
        throw new InterpreterError("max() expects number arguments.");
      });
      return new NumberSymbol(Math.max(...nums));
    });

    this.registerFunction("sum", (...args: ISymbolType[]): ISymbolType => {
      if (args.length < 2) throw new InterpreterError("sum() requires at least two arguments.");

      // Check if any arguments are NumberWithUnitSymbol
      const hasUnits = args.some((arg) => arg instanceof NumberWithUnitSymbol);

      if (!hasUnits) {
        // No units, just sum numbers
        const sum = args.reduce((acc, arg) => {
          if (arg instanceof NumberSymbol) return acc + (arg.value as number);
          if (typeof arg.value === "number") return acc + (arg.value as number);
          throw new InterpreterError("sum() expects number arguments.");
        }, 0);
        return new NumberSymbol(sum);
      }

      // Has units, use unit manager for conversion
      const numericArgs = args.filter(
        (arg) => arg instanceof NumberSymbol || arg instanceof NumberWithUnitSymbol,
      ) as Array<NumberSymbol | NumberWithUnitSymbol>;

      if (numericArgs.length !== args.length) {
        throw new InterpreterError("sum() expects number or NumberWithUnit arguments.");
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
          throw new InterpreterError(
            `sum() unit conversion failed: ${error instanceof Error ? error.message : String(error)}`,
          );
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
        throw new InterpreterError("sum() expects number arguments.");
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
      else throw new InterpreterError("mod() expects number arguments.");

      if (b instanceof NumberSymbol) bVal = b.value as number;
      else if (b instanceof NumberWithUnitSymbol) bVal = b.value as number;
      else if (typeof b.value === "number") bVal = b.value as number;
      else throw new InterpreterError("mod() expects number arguments.");

      if (bVal === 0) throw new InterpreterError("mod() division by zero.");

      return new NumberSymbol(((aVal % bVal) + bVal) % bVal);
    });

    this.registerFunction("average", (...args: ISymbolType[]): NumberSymbol => {
      if (args.length === 0)
        throw new InterpreterError("average() requires at least one argument.");
      const sum = args.reduce((acc, arg) => {
        if (!(arg instanceof NumberSymbol))
          throw new InterpreterError("average() expects number arguments.");
        return acc + (arg.value as number);
      }, 0);
      return new NumberSymbol(sum / args.length);
    });

    this.registerFunction("round", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError("round() expects a number argument.");
      const value = arg.value as number;

      // Implement banker's rounding (round to nearest even) for .5 cases
      const intPart = Math.floor(value);
      const fraction = value - intPart;

      if (fraction === 0.5) {
        return new NumberSymbol(intPart % 2 === 0 ? intPart : intPart + 1);
      }

      return new NumberSymbol(Math.round(value));
    });

    this.registerFunction("abs", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError("abs() expects a number argument.");
      return new NumberSymbol(Math.abs(arg.value as number));
    });

    this.registerFunction("sqrt", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError("sqrt() expects a number argument.");
      return new NumberSymbol(Math.sqrt(arg.value as number));
    });

    this.registerFunction("pow", (base: ISymbolType, exp: ISymbolType): NumberSymbol => {
      if (!(base instanceof NumberSymbol) || !(exp instanceof NumberSymbol))
        throw new InterpreterError("pow() expects two number arguments.");
      return new NumberSymbol((base.value as number) ** (exp.value as number));
    });

    this.registerFunction(
      "parse_int",
      (strSymbol: ISymbolType, baseSymbol?: ISymbolType): NumberSymbol => {
        if (!(strSymbol instanceof StringSymbol))
          throw new InterpreterError("parse_int() first argument must be a string.");
        const base = baseSymbol instanceof NumberSymbol ? (baseSymbol.value as number) : 10;
        const parsed = Number.parseInt(strSymbol.value as string, base);
        if (Number.isNaN(parsed))
          throw new InterpreterError(
            `Invalid string for parse_int: "${strSymbol.value}" with base ${base}.`,
          );
        return new NumberSymbol(parsed);
      },
    );

    // Trigonometric functions
    this.registerFunction("sin", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError("sin() expects a number argument.");
      return new NumberSymbol(Math.sin(arg.value as number));
    });

    this.registerFunction("cos", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError("cos() expects a number argument.");
      return new NumberSymbol(Math.cos(arg.value as number));
    });

    this.registerFunction("tan", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError("tan() expects a number argument.");
      return new NumberSymbol(Math.tan(arg.value as number));
    });

    // Inverse trigonometric functions
    this.registerFunction("asin", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError("asin() expects a number argument.");
      const value = arg.value as number;
      if (value < -1 || value > 1)
        throw new InterpreterError("asin() argument must be between -1 and 1.");
      return new NumberSymbol(Math.asin(value));
    });

    this.registerFunction("acos", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError("acos() expects a number argument.");
      const value = arg.value as number;
      if (value < -1 || value > 1)
        throw new InterpreterError("acos() argument must be between -1 and 1.");
      return new NumberSymbol(Math.acos(value));
    });

    this.registerFunction("atan", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError("atan() expects a number argument.");
      return new NumberSymbol(Math.atan(arg.value as number));
    });

    this.registerFunction("atan2", (y: ISymbolType, x: ISymbolType): NumberSymbol => {
      if (!(y instanceof NumberSymbol) || !(x instanceof NumberSymbol))
        throw new InterpreterError("atan2() expects two number arguments.");
      return new NumberSymbol(Math.atan2(y.value as number, x.value as number));
    });

    // Logarithmic functions
    this.registerFunction("log", (arg: ISymbolType, base?: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError("log() expects a number argument.");
      const value = arg.value as number;
      if (value <= 0) throw new InterpreterError("log() argument must be positive.");

      if (base === undefined) {
        return new NumberSymbol(Math.log(value));
      }

      if (!(base instanceof NumberSymbol))
        throw new InterpreterError("log() base must be a number.");
      const baseValue = base.value as number;
      if (baseValue <= 0 || baseValue === 1)
        throw new InterpreterError("log() base must be positive and not equal to 1.");

      return new NumberSymbol(Math.log(value) / Math.log(baseValue));
    });

    this.registerFunction("floor", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError("floor() expects a number argument.");
      return new NumberSymbol(Math.floor(arg.value as number));
    });

    this.registerFunction("ceil", (arg: ISymbolType): NumberSymbol => {
      if (!(arg instanceof NumberSymbol))
        throw new InterpreterError("ceil() expects a number argument.");
      return new NumberSymbol(Math.ceil(arg.value as number));
    });

    this.registerFunction(
      "round_to",
      (value: ISymbolType, precision?: ISymbolType): NumberSymbol => {
        if (!(value instanceof NumberSymbol))
          throw new InterpreterError("round_to() expects a number as first argument.");

        let precisionValue = 0;
        if (precision !== undefined) {
          if (!(precision instanceof NumberSymbol))
            throw new InterpreterError("round_to() expects a number as second argument.");
          precisionValue = precision.value as number;
        }

        const numValue = value.value as number;

        if (precisionValue === 0) {
          const intPart = Math.floor(numValue);
          const fraction = numValue - intPart;

          if (fraction === 0.5) {
            return new NumberSymbol(intPart % 2 === 0 ? intPart : intPart + 1);
          }

          return new NumberSymbol(Math.round(numValue));
        }

        const factor = 10 ** precisionValue;
        const scaledValue = numValue * factor;
        const intPart = Math.floor(scaledValue);
        const fraction = scaledValue - intPart;

        let roundedScaled: number;
        if (fraction === 0.5) {
          roundedScaled = intPart % 2 === 0 ? intPart : intPart + 1;
        } else {
          roundedScaled = Math.round(scaledValue);
        }

        return new NumberSymbol(roundedScaled / factor);
      },
    );

    // Utility functions
    this.registerFunction("linear-gradient", (...args: ISymbolType[]): StringSymbol => {
      const stringArgs = args.map((arg) => arg.toString()).join(", ");
      return new StringSymbol(`linear-gradient(${stringArgs})`);
    });

    this.registerFunction("rgba", (...args: ISymbolType[]): StringSymbol => {
      const stringArgs = args.map((arg) => arg.toString()).join(", ");
      return new StringSymbol(`rgba(${stringArgs})`);
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
          throw new InterpreterError(`No config available for dynamic function '${functionName}'`);
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
          throw new InterpreterError(`Dynamic function '${functionName}' returned null`);
        }

        // Handle string results by converting them to StringSymbol
        if (typeof result === "string") {
          return new StringSymbol(result);
        }

        return result;
      } catch (error) {
        throw new InterpreterError(
          `Error executing dynamic function '${functionName}': ${error instanceof Error ? error.message : String(error)}`,
        );
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
