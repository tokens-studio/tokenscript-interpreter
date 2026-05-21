import { ColorErrorCode } from "../codes/color";
import { ConfigErrorCode } from "../codes/config";
import { FunctionsErrorCode } from "../codes/functions";
import { InterpreterErrorCode } from "../codes/interpreter";
import { LexerErrorCode } from "../codes/lexer";
import { OperationsErrorCode } from "../codes/operations";
import { ParserErrorCode } from "../codes/parser";
import { ProcessorErrorCode } from "../codes/processor";
import { SymbolsErrorCode } from "../codes/symbols";
import { UnitErrorCode } from "../codes/unit";
import type { MessageMap } from "./types";

export const messages: MessageMap = {
  // Lexer errors
  [LexerErrorCode.INVALID_CHARACTER]: (data) =>
    `Invalid character '${data.char}' at position ${data.position}.${data.description ? ` ${data.description}` : ""}`,

  [LexerErrorCode.UNTERMINATED_STRING]: (data) =>
    `Unterminated string, missing '${data.quoteType}'.`,

  [LexerErrorCode.UNTERMINATED_REFERENCE]: "Unterminated reference, missing '}'.",

  [LexerErrorCode.EMPTY_VARIABLE_NAME]: "Empty variable name.",

  [LexerErrorCode.INVALID_HEX_COLOR_FORMAT]: (data) =>
    `Invalid hex color format: ${data.value}. Length should be ${data.expectedLength}.`,

  [LexerErrorCode.EXPECTED_CHARACTER]: (data) =>
    `Expected character ${data.expected} got ${data.got}`,

  [LexerErrorCode.MULTIPLE_DECIMAL_POINTS]: (data) =>
    `Invalid number '${data.value}': multiple decimal points.`,

  // Parser errors
  [ParserErrorCode.UNEXPECTED_TOKEN]: (data) => `Unexpected token: ${data.token}`,

  [ParserErrorCode.EXPECTED_TOKEN_TYPE]: (data) =>
    `Expected token type ${data.expected} but got ${data.got}`,

  [ParserErrorCode.CONDITION_MUST_BE_BOOLEAN]: "If/elif condition must be a boolean",

  [ParserErrorCode.INVALID_SYNTAX]: (data) =>
    data?.message ? String(data.message) : "Invalid syntax",

  [ParserErrorCode.UNEXPECTED_END]: "Unexpected end of input",

  [ParserErrorCode.TOLERANT_REQUIRES_INLINE]:
    "Tolerant mode only supports inline expressions. Use parse(true) for tolerant parsing.",

  [ParserErrorCode.UNALLOWED_INLINE_SYNTAX]: (data) =>
    `Syntax not allowed in inline mode: ${data.originalError}`,

  // Interpreter errors
  [InterpreterErrorCode.UNKNOWN_NODE_TYPE]: (data) =>
    `No visit method for AST node type: ${data.nodeType}`,

  [InterpreterErrorCode.ARITHMETIC_REQUIRES_NUMBER]: (data) =>
    `Arithmetic operator ${data.operator} requires Number or NumberWithUnit operands, got ${data.leftType} and ${data.rightType}.`,

  [InterpreterErrorCode.UNKNOWN_BINARY_OPERATOR]: (data) =>
    `Unknown binary operator: ${data.operator} or type ${data.tokenType}`,

  [InterpreterErrorCode.UNARY_MINUS_NULL]: (data) =>
    `Cannot apply unary '-' to a null ${data.symbolType}.`,

  [InterpreterErrorCode.UNARY_PLUS_NON_NUMBER]: (data) =>
    `Cannot apply unary '+' to non-number value: ${data.value}`,

  [InterpreterErrorCode.UNARY_NOT_NON_BOOLEAN]: (data) =>
    `Cannot apply NOT to non-boolean value: ${data.value}.`,

  [InterpreterErrorCode.UNKNOWN_UNARY_OPERATOR]: (data) =>
    `Unknown unary operator type: ${data.operator}`,

  [InterpreterErrorCode.UNKNOWN_REFERENCE]: (data) => `Unknown reference: ${data.reference}`,

  [InterpreterErrorCode.UNKNOWN_FUNCTION]: (data) => `Unknown function: '${data.functionName}'`,

  [InterpreterErrorCode.INVALID_VARIABLE_NAME]: (data) =>
    `Invalid variable name '${data.name}'. Use a simple name (and underscores) without '.', '-', '['.`,

  [InterpreterErrorCode.VARIABLE_ALREADY_DEFINED]: (data) =>
    `Variable '${data.name}' already defined. Use a different name.`,

  [InterpreterErrorCode.INVALID_VARIABLE_TYPE]: (data) =>
    `Invalid variable type '${data.typeName}'. Use a valid type. (${data.validTypes})`,

  [InterpreterErrorCode.INVALID_VALUE_FOR_VARIABLE]: (data) =>
    `Invalid value '${data.value}' ('${data.type}') for variable '${data.name}'. Use a valid value.`,

  [InterpreterErrorCode.VARIABLE_NOT_FOUND]: (data) => `Variable '${data.name}' not found.`,

  [InterpreterErrorCode.ASSIGNMENT_VALUE_NULL]: (data) =>
    `Assignment value for '${data.identifier}' is null.`,

  [InterpreterErrorCode.TYPE_MISMATCH]: (data) =>
    `Invalid value '${data.value}' (Found '${data.foundType}', expected '${data.expectedType}') for variable '${data.identifier}'. Use a valid value.`,

  [InterpreterErrorCode.CANNOT_ASSIGN_TYPE]: (data) =>
    `Cannot assign ${data.valueType} to variable '${data.identifier}' of type ${data.variableType}.`,

  [InterpreterErrorCode.METHOD_RETURNED_NULL]: (data) =>
    `Method '${data.methodName}' returned null or undefined`,

  [InterpreterErrorCode.METHOD_NOT_FOUND]: (data) =>
    `Method '${data.methodName}' not found on '${data.value}' (${data.type})`,

  [InterpreterErrorCode.ATTRIBUTE_RETURNED_NULL]: (data) =>
    `Attribute '${data.attributeName}' returned null or undefined`,

  [InterpreterErrorCode.ATTRIBUTE_NOT_FOUND]: (data) =>
    `Attribute '${data.attributeName}' not found on '${data.value}' (${data.type})`,

  [InterpreterErrorCode.CANNOT_ACCESS_ATTRIBUTES]: (data) =>
    `Cannot access attributes on ${data.type}`,

  [InterpreterErrorCode.MAX_ITERATIONS_EXCEEDED]: "Max iterations exceeded in while loop.",

  [InterpreterErrorCode.WHILE_CONDITION_NOT_BOOLEAN]: "While loop condition must be a boolean.",

  [InterpreterErrorCode.IF_CONDITION_NOT_BOOLEAN]: "If/elif condition must be a boolean.",

  [InterpreterErrorCode.FOR_EACH_NOT_LIST]: (data) =>
    `for...in requires a List, got ${data.actualType}.`,

  [InterpreterErrorCode.FOR_EACH_VARIABLE_SHADOW]: (data) =>
    `for...in variable '${data.name}' shadows an existing variable in this scope.`,

  [InterpreterErrorCode.FOR_EACH_DUPLICATE_VARS]: (data) =>
    `for...in item and index variables must have different names, both are '${data.name}'.`,

  [InterpreterErrorCode.UNKNOWN_ERROR]: "An unknown error occurred during interpretation.",

  // Operations errors
  [OperationsErrorCode.UNSUPPORTED_OPERAND_TYPE]: (data) =>
    `Unsupported operand type for unit decomposition: ${data.type}`,

  [OperationsErrorCode.CANNOT_MIX_UNITS]: (data) => `Cannot mix units: ${data.units.join(", ")}`,

  [OperationsErrorCode.INCOMPATIBLE_TYPES]: (data) =>
    `Cannot compare ${data.typeA} with ${data.typeB}. Incompatible types.`,

  [OperationsErrorCode.CANNOT_COMPARE_UNITS]: (data) =>
    `Cannot compare NumberWithUnit of different units: ${data.unitA} and ${data.unitB}`,

  [OperationsErrorCode.ORDERING_WITH_NULL]: "Cannot perform ordering comparison with null values.",

  [OperationsErrorCode.LOGICAL_REQUIRES_BOOLEAN]: (data) =>
    `${data.operator} operator requires boolean operands.`,

  [OperationsErrorCode.DIVISION_BY_ZERO]: "Division by zero.",

  [OperationsErrorCode.UNIT_EXPONENT_NOT_SUPPORTED]: (data) =>
    `Cannot raise ${data.unitA} to the power of ${data.unitB}. Unit exponents are not supported.`,

  // Symbols errors
  [SymbolsErrorCode.VALUE_MUST_BE_TYPE]: (data) =>
    `Value must be ${data.expectedType}, got ${data.actualType}.`,

  [SymbolsErrorCode.VALUE_IS_NULL]: (data) => `Value must be ${data.expectedType}, got null.`,

  [SymbolsErrorCode.METHOD_NOT_FOUND]: (data) =>
    `Method '${data.methodName}' not found or invalid arguments on type '${data.type}'.`,

  [SymbolsErrorCode.MISSING_REQUIRED_ARGUMENT]: (data) =>
    `Missing required argument '${data.argumentName}' for method '${data.methodName}'.`,

  [SymbolsErrorCode.ATTRIBUTE_NOT_FOUND]: (data) =>
    `Attribute '${data.attributeName}' not found on ${data.type}.`,

  [SymbolsErrorCode.CANNOT_SET_ATTRIBUTE]: (data) =>
    `Cannot set attribute '${data.attributeName}' on type '${data.type}'.`,

  [SymbolsErrorCode.INVALID_RADIX]: (data) =>
    `Invalid radix: ${data.radix}. Must be between 2 and 36.`,

  [SymbolsErrorCode.RADIX_CONVERSION_ERROR]: (data) =>
    `Error converting to base ${data.base}: ${data.error}.`,

  [SymbolsErrorCode.CANNOT_CONCATENATE]: (data) => `Cannot concatenate ${data.type} to String.`,

  [SymbolsErrorCode.CANNOT_SPLIT]: (data) => `Cannot split String by ${data.type}.`,

  [SymbolsErrorCode.INDEX_OUT_OF_RANGE]: (data) => `Index out of range for ${data.operation}.`,

  [SymbolsErrorCode.KEY_MUST_BE_STRING]: (data) =>
    `Key must be a StringSymbol or string, got ${data.type}.`,

  [SymbolsErrorCode.CANNOT_OPERATION_ON_TOKEN_TYPE]: (data) =>
    `Cannot ${data.operation} Token with ${data.valueType} value.`,

  [SymbolsErrorCode.INVALID_HEX_COLOR]: (data) => `Invalid hex color format: ${data.value}`,

  [SymbolsErrorCode.COLOR_MANAGER_NOT_AVAILABLE]: "ColorManager not available",

  [SymbolsErrorCode.INVALID_COLOR_VALUE]: (data) =>
    `Value ${data.value} must be string, attributes record, or null, got ${data.type}.`,

  // Functions errors
  [FunctionsErrorCode.EXPECTS_NUMBER_ARGUMENTS]: (data) =>
    `${data.functionName}() expects number arguments.`,

  [FunctionsErrorCode.REQUIRES_MIN_ARGUMENTS]: (data) =>
    `${data.functionName}() requires at least ${data.minArgs} argument${data.minArgs === 1 ? "" : "s"}.`,

  [FunctionsErrorCode.EXPECTS_TYPE_ARGUMENT]: (data) =>
    `${data.functionName}() expects ${data.expectedType} as ${data.argumentPosition} argument.`,

  [FunctionsErrorCode.DIVISION_BY_ZERO]: (data) => `${data.functionName}() division by zero.`,

  [FunctionsErrorCode.ARGUMENT_OUT_OF_RANGE]: (data) =>
    `${data.functionName}() argument must be ${data.constraint}.`,

  [FunctionsErrorCode.INVALID_BASE]: (data) =>
    `${data.functionName}() base must be ${data.constraint}.`,

  [FunctionsErrorCode.PARSE_ERROR]: (data) =>
    `Invalid string for ${data.functionName}: "${data.value}" with base ${data.base}.`,

  [FunctionsErrorCode.UNIT_CONVERSION_FAILED]: (data) =>
    `${data.functionName || "function"}() unit conversion failed${data.error ? `: ${data.error}` : ""}`,

  [FunctionsErrorCode.NO_CONFIG_AVAILABLE]: (data) =>
    `No config available for dynamic function '${data.functionName || "unknown"}'`,

  [FunctionsErrorCode.FUNCTION_RETURNED_NULL]: (data) =>
    `Dynamic function '${data.functionName || "unknown"}' returned null`,

  [FunctionsErrorCode.EXECUTION_ERROR]: (data) =>
    `Error executing dynamic function '${data.functionName || "unknown"}'${data.error ? `: ${data.error}` : ""}`,

  // Config errors
  [ConfigErrorCode.NO_SPEC_FOUND]: (data) => `No spec found for ${data.specName}`,

  [ConfigErrorCode.NO_TYPE_FOUND]: (data) => `No type found for ${data.typeName}`,

  // Processor errors
  [ProcessorErrorCode.TOKEN_NOT_FOUND]: (data) => `Token '${data.tokenName}' not found`,

  [ProcessorErrorCode.TOKEN_ALREADY_EXISTS]: (data) => `Token '${data.tokenName}' already exists.`,

  [ProcessorErrorCode.CIRCULAR_DEPENDENCY]: (data) =>
    `Circular dependency detected: ${Array.isArray(data.tokens) ? data.tokens.join(", ") : data.tokens}`,

  [ProcessorErrorCode.SUB_FIELD_NOT_RESOLVED]: (data) =>
    `Sub-field '${data.fieldPath}' not resolved`,

  [ProcessorErrorCode.DEPENDENCY_ERROR]: (data) =>
    `Token '${data.tokenName}' failed due to dependency error: ${data.chain}\nRoot cause: ${data.rootCause}`,

  [ProcessorErrorCode.NO_THEMES_FOUND]: (data) => `No themes found for theme "${data.themeName}"`,

  [ProcessorErrorCode.THEME_NOT_FOUND]: (data) =>
    `Theme "${data.themeName}" not found. Available: ${data.availableThemes.join(", ")}`,

  [ProcessorErrorCode.TOKEN_SET_NOT_FOUND]: (data) => `Token set "${data.setName}" not found`,

  [ProcessorErrorCode.TOKEN_SET_INVALID]: (data) => `Token set "${data.setName}" is not an object`,

  [ProcessorErrorCode.NO_SETS_TO_PROCESS]: "No sets to process",

  [ProcessorErrorCode.MULTIPLE_SETS_NO_SELECTION]: (data) =>
    `Multiple sets found (${data.setNames.join(", ")}) - specify activeSets or activeTheme`,

  // Color errors
  [ColorErrorCode.INITIALIZER_CRASHED]: "Initializer crashed!",

  [ColorErrorCode.INITIALIZER_CONSTRUCT_FAILED]: (data) =>
    `Could not construct initializer from schema${data.error ? `: ${data.error}` : ""}`,

  [ColorErrorCode.INITIALIZER_NOT_FOUND]: (data) =>
    `No initializer found for keyword '${data.keyword}'`,

  [ColorErrorCode.CONVERSION_TARGET_NOT_FOUND]: (data) =>
    `Conversion function crashed! No target spec found for ${data.targetUri}`,

  [ColorErrorCode.SOURCE_URI_NOT_FOUND]: (data) =>
    `No source URI found for color type '${data.colorType}'`,

  [ColorErrorCode.TARGET_URI_NOT_FOUND]: (data) =>
    `No target URI found for color type '${data.colorType}'`,

  [ColorErrorCode.CONVERSION_ERROR]: (data) =>
    data.message ? String(data.message) : "Color conversion failed",

  [ColorErrorCode.STRING_VALUE_ASSIGNMENT]: (data) =>
    `Cannot set attributes '${data.attributes}' for variable ${data.identifier} on Color type ${data.colorType}.`,

  [ColorErrorCode.ATTRIBUTE_CHAIN_TOO_LONG]: (data) =>
    `Attributes chain '${data.attributes}' for variable ${data.identifier} on Color type ${data.colorType} may not exceed one element.`,

  [ColorErrorCode.MISSING_SPEC]: (data) =>
    `No spec ${data.colorType} defined for variable ${data.identifier} on Color type ${data.colorType}.`,

  [ColorErrorCode.MISSING_SCHEMA]: (data) => `No schema defined for Color type ${data.colorType}.`,

  [ColorErrorCode.MISSING_ATTRIBUTE_SCHEMA]: (data) =>
    `No schema found for key ${data.attribute} for variable ${data.identifier} on Color type ${data.colorType}.`,

  [ColorErrorCode.INVALID_ATTRIBUTE_TYPE]: (data) =>
    `Invalid attribute type '${data.attributeType}'. Use a valid type. (${data.validTypes})`,

  [ColorErrorCode.INVALID_ALPHA_VALUE]: (data) =>
    `Invalid alpha value '${data.alpha}'. Alpha must be between 0 and 1.`,

  // Unit errors
  [UnitErrorCode.CONVERSION_CRASHED]: (data) =>
    `Conversion function crashed!${data.error ? ` ${data.error}` : ""}`,

  [UnitErrorCode.SOURCE_URI_NOT_FOUND]: (data) => `No source URI found for unit '${data.unit}'`,

  [UnitErrorCode.RELATIVE_REQUIRES_TWO_NUMBERS]: "Relative conversion requires exactly 2 numbers",

  [UnitErrorCode.NO_TO_ABSOLUTE_SCRIPT]: (data) =>
    `No to_absolute script found for relative unit '${data.unit}'`,

  [UnitErrorCode.TO_ABSOLUTE_MUST_RETURN_NUMBER]: "to_absolute script must return a number",

  [UnitErrorCode.CANNOT_CONVERT_MULTIPLE_RELATIVE]:
    "Cannot convert multiple relative units to a common format.",

  [UnitErrorCode.NO_VALID_CONVERSION_PATH]:
    "No valid conversion paths found for the provided inputs.",
};
