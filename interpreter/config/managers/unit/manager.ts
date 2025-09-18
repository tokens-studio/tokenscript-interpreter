import { InterpreterError } from "@/interpreter/errors";
import { parseExpression } from "@/interpreter/parser";
import { NumberSymbol, NumberWithUnitSymbol } from "@/interpreter/symbols";
import { Interpreter } from "@/lib";
import { BaseManager } from "../base-manager";
import { specName, type UnitSpecification, UnitSpecificationSchema } from "./schema";

// Types -----------------------------------------------------------------------

type uriType = string;
type unitKey = string;
type Specs = Map<uriType, UnitSpecification>;

// Default Units ---------------------------------------------------------------

const PIXEL_UNIT = "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/px-unit/0/";

const defaultUnitSpecs: Specs = new Map([
  [
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/seconds-unit/0/",
    {
      name: "seconds",
      type: "absolute",
      keyword: "s",
      description: "A unit of time equal to one second.",
      conversions: [],
    },
  ],
  [
    PIXEL_UNIT,
    {
      name: "pixel",
      type: "absolute",
      keyword: "px",
      description: "A pixel unit, typically used in digital displays.",
      conversions: [],
    },
  ],
  [
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/rem-unit/0/",
    {
      name: "root em",
      type: "absolute",
      keyword: "rem",
      description: "A root em unit, relative to the root font size.",
      conversions: [
        {
          source: "$self",
          target: PIXEL_UNIT,
          script: {
            script: "return ({input} * 16)px;",
          },
          description: "Convert rem to pixel based on a root font size of 16px.",
        },
        {
          source: PIXEL_UNIT,
          target: "$self",
          script: {
            script: "return ({input} / 16)rem;",
          },
          description: "Convert pixel to rem based on a root font size of 16px.",
        },
      ],
    },
  ],
  [
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/percent-unit/0/",
    {
      name: "percent",
      type: "relative",
      keyword: "%",
      description: "A percentage unit, representing a fraction of 100.",
      to_absolute: {
        script: "return {other_value} * ({relative_value} / 100);",
      },
      conversions: [],
    },
  ],
]);

// Unit Manager ----------------------------------------------------------------

export class UnitManager extends BaseManager<
  UnitSpecification,
  NumberWithUnitSymbol,
  NumberWithUnitSymbol
> {
  private unitKeywords: Map<unitKey, uriType> = new Map();

  constructor(defaultSpecs = defaultUnitSpecs) {
    super();
    for (const [uri, spec] of defaultSpecs) {
      this.register(uri, spec);
    }
  }

  protected getSpecName(spec: UnitSpecification): string {
    return specName(spec);
  }

  /**
   * Creates a clone of this class to be passed down to initializers and conversion functions
   * Links properties to the parent config.
   */
  protected clone(): this {
    const unitManager = new UnitManager(new Map());
    unitManager.specs = this.specs;
    unitManager.specTypes = this.specTypes;
    unitManager.conversions = this.conversions;
    unitManager.unitKeywords = this.unitKeywords;
    return unitManager as this;
  }

  public registerConversions(uri: uriType, spec: UnitSpecification) {
    spec.conversions?.forEach((conversion) => {
      // $self replacement
      const sourceUri = conversion.source === "$self" ? uri : conversion.source;
      const targetUri = conversion.target === "$self" ? uri : conversion.target;

      const { ast } = parseExpression(conversion.script.script);
      const fn = (unit: NumberWithUnitSymbol): NumberWithUnitSymbol => {
        const config = this.createInterpreterConfig({ input: unit });
        const result = new Interpreter(ast, config).interpret();
        if (!(result instanceof NumberWithUnitSymbol)) {
          throw new InterpreterError(
            "Unit conversion function must return a NumberWithUnitSymbol",
            undefined,
            undefined,
            { result },
          );
        }
        return result as NumberWithUnitSymbol;
      };

      this.registerConversionFunction(sourceUri, targetUri, fn);
    });
  }

  public register(uri: uriType, spec: UnitSpecification | string): UnitSpecification {
    let parsedSpec: UnitSpecification;

    if (typeof spec === "string") {
      const parseResult = UnitSpecificationSchema.safeParse(JSON.parse(spec));
      if (!parseResult.success) {
        throw new Error(
          `Invalid unit specification for URI ${uri}: ${parseResult.error.message}\n\nJson:\n${spec}`,
        );
      }
      parsedSpec = parseResult.data;
    } else {
      const parseResult = UnitSpecificationSchema.safeParse(spec);
      if (!parseResult.success) {
        throw new Error(`Invalid unit specification for URI ${uri}: ${parseResult.error.message}`);
      }
      parsedSpec = parseResult.data;
    }

    this.specs.set(uri, parsedSpec);
    this.specTypes.set(specName(parsedSpec), uri);
    this.unitKeywords.set(parsedSpec.keyword.toUpperCase(), uri);

    this.registerConversions(uri, parsedSpec);

    return parsedSpec;
  }

  public getSpecByKeyword(keyword: unitKey): UnitSpecification | undefined {
    const uri = this.unitKeywords.get(keyword.toUpperCase());
    if (!uri) return;
    return this.getSpec(uri);
  }

  public getUriByKeyword(keyword: unitKey): string | undefined {
    return this.unitKeywords.get(keyword.toUpperCase());
  }

  public convertTo(unit: NumberWithUnitSymbol, targetUri: uriType): NumberWithUnitSymbol {
    const sourceUri = this.getUriByKeyword(unit.unit);
    if (!sourceUri) {
      throw new InterpreterError(`No source URI found for unit '${unit.unit}'`);
    }

    try {
      return this.convertThroughPath(unit, sourceUri, targetUri);
    } catch (error: any) {
      throw new InterpreterError(error.message);
    }
  }

  private isOneNumberRelative(inputs: Array<NumberSymbol | NumberWithUnitSymbol>): boolean {
    let relativeCount = 0;
    for (const input of inputs) {
      if (input instanceof NumberWithUnitSymbol) {
        const spec = this.getSpecByKeyword(input.unit);
        if (spec?.type === "relative") {
          relativeCount++;
        }
      }
    }
    return relativeCount === 1;
  }

  private convertRelative(
    numbers: Array<NumberSymbol | NumberWithUnitSymbol>,
  ): Array<NumberSymbol | NumberWithUnitSymbol> {
    if (numbers.length !== 2) {
      throw new InterpreterError("Relative conversion requires exactly 2 numbers");
    }

    let relativeNum: NumberWithUnitSymbol | null = null;
    let baseNum: NumberSymbol | NumberWithUnitSymbol | null = null;
    let relativeIndex = -1;

    for (let i = 0; i < numbers.length; i++) {
      const num = numbers[i];
      if (num instanceof NumberWithUnitSymbol) {
        const spec = this.getSpecByKeyword(num.unit);
        if (spec?.type === "relative") {
          if (relativeNum !== null) {
            // Multiple relative numbers - return as is
            return numbers;
          }
          relativeNum = num;
          relativeIndex = i;
        } else {
          baseNum = num;
        }
      } else {
        baseNum = num;
      }
    }

    if (!relativeNum || !baseNum) {
      return numbers;
    }

    const spec = this.getSpecByKeyword(relativeNum.unit);
    if (!spec?.to_absolute) {
      throw new InterpreterError(
        `No to_absolute script found for relative unit '${relativeNum.unit}'`,
      );
    }

    const { ast } = parseExpression(spec.to_absolute.script);
    const relativeValueSymbol = new NumberSymbol(relativeNum.value as number);
    const otherValueSymbol = new NumberSymbol(baseNum.value as number);
    const result = new Interpreter(ast, {
      references: {
        relative_value: relativeValueSymbol,
        other_value: otherValueSymbol,
      },
    }).interpret();

    let convertedValue: number;
    if (result instanceof NumberSymbol) {
      convertedValue = result.value as number;
    } else if (typeof result === "number") {
      convertedValue = result;
    } else {
      throw new InterpreterError("to_absolute script must return a number");
    }

    // Convert to int if it's a whole number
    if (Number.isInteger(convertedValue)) {
      convertedValue = Math.trunc(convertedValue);
    }

    let convertedNum: NumberSymbol | NumberWithUnitSymbol;
    if (baseNum instanceof NumberWithUnitSymbol) {
      convertedNum = new NumberWithUnitSymbol(convertedValue, baseNum.unit);
    } else {
      convertedNum = new NumberSymbol(convertedValue);
    }

    const resultNumbers = [...numbers];
    resultNumbers[relativeIndex] = convertedNum;
    return resultNumbers;
  }

  public convertToCommonFormat(
    inputs: Array<NumberSymbol | NumberWithUnitSymbol>,
  ): Array<NumberSymbol | NumberWithUnitSymbol> {
    if (inputs.length === 0) {
      return [];
    }

    const numberWithUnits = inputs.filter(
      (inp) => inp instanceof NumberWithUnitSymbol,
    ) as NumberWithUnitSymbol[];

    if (numberWithUnits.length < 1) {
      return inputs;
    }

    const isRelative = this.isOneNumberRelative(inputs);
    if (isRelative) {
      if (inputs.length > 2) {
        throw new InterpreterError("Cannot convert multiple relative units to a common format.");
      }
      return this.convertRelative(inputs);
    }

    // Find unique units from the inputs
    const uniqueUnits = Array.from(new Set(numberWithUnits.map((inp) => inp.unit.toUpperCase())));

    const conversionResults: Record<string, Array<NumberSymbol | NumberWithUnitSymbol>> = {};

    for (const unit of uniqueUnits) {
      const unitUri = this.getUriByKeyword(unit);
      if (!unitUri) continue;

      conversionResults[unitUri] = [];
      let canConvert = true;

      for (const inp of inputs) {
        if (!(inp instanceof NumberWithUnitSymbol)) {
          conversionResults[unitUri].push(inp);
          continue;
        }

        const inputUri = this.getUriByKeyword(inp.unit);
        if (!inputUri) {
          canConvert = false;
          break;
        }

        if (inputUri === unitUri) {
          conversionResults[unitUri].push(inp);
          continue;
        }

        try {
          const result = this.convertThroughPath(inp, inputUri, unitUri);
          conversionResults[unitUri].push(result);
        } catch {
          canConvert = false;
          break;
        }
      }

      if (!canConvert) {
        delete conversionResults[unitUri];
      }
    }

    // Find the unit with the maximum absolute value
    const maxPerUri: Record<string, number> = {};
    for (const [uri, results] of Object.entries(conversionResults)) {
      if (results.length === 0) continue;
      const maxValue = Math.max(
        ...results.map((result) => Math.abs((result.value as number) || 0)),
      );
      maxPerUri[uri] = maxValue;
    }

    if (Object.keys(maxPerUri).length === 0) {
      throw new InterpreterError("No valid conversion paths found for the provided inputs.");
    }

    const commonUnitUri = Object.keys(maxPerUri).reduce((a, b) =>
      maxPerUri[a] > maxPerUri[b] ? a : b,
    );

    return conversionResults[commonUnitUri] || [];
  }
}
