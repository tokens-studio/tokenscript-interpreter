import {
  type ASTNode,
  type ISymbolType,
  Operations,
  type ReferenceRecord,
  UNINTERPRETED_KEYWORDS,
} from "@src/types";
import {
  type AssignNode,
  type AttributeAccessNode,
  type BinOpNode,
  type BooleanNode,
  type ElementWithUnitNode,
  FunctionCallNode,
  type HexColorNode,
  IdentifierNode,
  type IfNode,
  ImplicitListNode,
  type ListNode,
  type NullNode,
  type NumNode,
  type ReassignNode,
  type ReferenceNode,
  type ReturnNode,
  type StatementListNode,
  type StringNode,
  type UnaryOpNode,
  type WhileNode,
} from "./ast";
import { Config } from "./config/config";
import { InterpreterError, InterpreterErrorCode } from "./errors";
import * as operations from "./operations";
import { Parser } from "./parser";

import {
  BooleanSymbol,
  basicSymbolTypes,
  ColorSymbol,
  jsValueToSymbolType,
  ListSymbol,
  NullSymbol,
  NumberSymbol,
  NumberWithUnitSymbol,
  StringSymbol,
  typeEquals,
  typeName,
} from "./symbols";
import { SymbolTable } from "./symbolTable";

class ReturnSignal {
  constructor(public value: ISymbolType | null) {}
}

export type InterpreterResult = ISymbolType | string | null;

export class Interpreter {
  private parser: Parser | null = null; // Null if created with pre-parsed AST
  private symbolTable: SymbolTable;
  private references: Map<string, ISymbolType> = new Map();
  private ast: ASTNode | null = null;
  public config: Config;

  constructor(
    input: Parser | ASTNode | null,
    options?: {
      references?: ReferenceRecord | Map<string, any>;
      symbolTable?: SymbolTable;
      config?: Config;
    },
  ) {
    if (input instanceof Parser) {
      this.parser = input;
    } else {
      this.setAst(input);
    }

    this.symbolTable = options?.symbolTable || new SymbolTable();
    this.config = options?.config || new Config();

    if (options?.references) {
      this.importReferences(options.references);
    }
  }

  // References ------------------------------------------------------------------

  public importReferences(references?: ReferenceRecord | Map<string, any>): void {
    if (references instanceof Map) {
      this.references = references;
    } else if (references) {
      for (const key in references) {
        this.references.set(key, jsValueToSymbolType(references[key], this.config));
      }
    } else {
      this.references = new Map<string, ISymbolType>();
    }
  }

  public getReference(key: string): ISymbolType | undefined {
    return this.references.get(key);
  }

  // Utilities -------------------------------------------------------------------

  public setAst(ast: ASTNode | null): void {
    this.ast = ast;
    this.parser = null; // Clear parser since we're using pre-parsed AST
  }

  public resetSymbolTable(): void {
    this.symbolTable.reset();
  }

  public coerceValue(
    constructorSymbol: ISymbolType,
    valueSymbol: ISymbolType,
  ): ISymbolType | undefined {
    if (valueSymbol instanceof NullSymbol) return constructorSymbol;
    if (constructorSymbol.typeEquals(valueSymbol)) return valueSymbol;
  }

  // Visit Functions -------------------------------------------------------------

  private visit(node: ASTNode | null): ISymbolType | null {
    if (!node) return null;

    const visitorMethodName = `visit${node.nodeType}` as keyof this;
    if (typeof (this as any)[visitorMethodName] === "function") {
      return (this as any)[visitorMethodName](node);
    }

    throw new InterpreterError(InterpreterErrorCode.UNKNOWN_NODE_TYPE, {
      token: node.token,
      data: { nodeType: node.nodeType },
    });
  }

  private visitBinOpNode(node: BinOpNode): ISymbolType {
    const left = this.visit(node.left) as ISymbolType;
    const right = this.visit(node.right) as ISymbolType;

    const opVal = node.opToken.value as string;
    const opType = node.opToken.type;

    const logicalBooleanImpl = operations.LOGICAL_BOOLEAN_IMPLEMENTATIONS[opVal];
    if (logicalBooleanImpl) {
      return logicalBooleanImpl(left, right);
    }

    const mathImpl = operations.MATH_IMPLEMENTATIONS[opVal];
    if (mathImpl) {
      if (
        !(
          (left instanceof NumberSymbol || left instanceof NumberWithUnitSymbol) &&
          (right instanceof NumberSymbol || right instanceof NumberWithUnitSymbol)
        )
      ) {
        throw new InterpreterError(InterpreterErrorCode.ARITHMETIC_REQUIRES_NUMBER, {
          token: node.opToken,
          data: { operator: opVal, leftType: left.type, rightType: right.type },
        });
      }

      return mathImpl(left, right, this.config);
    }

    const comparisonImpl = operations.COMPARISON_IMPLEMENTATIONS[opType];
    if (comparisonImpl) {
      return comparisonImpl(left, right);
    }

    throw new InterpreterError(InterpreterErrorCode.UNKNOWN_BINARY_OPERATOR, {
      token: node.opToken,
      data: { operator: opVal, tokenType: opType },
    });
  }

  private visitNumNode(node: NumNode): NumberSymbol {
    return new NumberSymbol(node.value, this.config);
  }

  private visitStringNode(node: StringNode): StringSymbol {
    return new StringSymbol(node.value, this.config);
  }

  /**
   * Bare identifiers are treated as string literals if not found as variables
   * Check symbol table first (variables override references), then references
   */
  private visitIdentifierNode(node: IdentifierNode): ISymbolType {
    return (
      this.symbolTable.get(node.name) ||
      this.getReference(node.name) ||
      new StringSymbol(node.name, this.config)
    );
  }

  private visitUnaryOpNode(node: UnaryOpNode): ISymbolType {
    const result = this.visit(node.expr) as ISymbolType;

    if (node.op === Operations.SUBTRACT) {
      if (result instanceof NumberSymbol) {
        if (result.value === null) {
          throw new InterpreterError(InterpreterErrorCode.UNARY_MINUS_NULL, {
            token: node.opToken,
            data: { symbolType: "NumberSymbol" },
          });
        }
        return new NumberSymbol(-result.value, this.config);
      }

      if (result instanceof NumberWithUnitSymbol) {
        if (result.value === null) {
          throw new InterpreterError(InterpreterErrorCode.UNARY_MINUS_NULL, {
            token: node.opToken,
            data: { symbolType: "NumberWithUnitSymbol" },
          });
        }
        return new NumberWithUnitSymbol(-result.value, result.unit, this.config);
      }

      throw new InterpreterError(InterpreterErrorCode.UNARY_PLUS_NON_NUMBER, {
        token: node.opToken,
        data: { value: String(result.value) },
      });
    }

    if (node.op === Operations.ADD) {
      if (result instanceof NumberSymbol || result instanceof NumberWithUnitSymbol) {
        return result;
      }

      throw new InterpreterError(InterpreterErrorCode.UNARY_PLUS_NON_NUMBER, {
        token: node.opToken,
        data: { value: String(result.value) },
      });
    }

    if (node.op === Operations.LOGIC_NOT) {
      if (result instanceof BooleanSymbol) {
        return new BooleanSymbol(!result.value, this.config);
      }

      throw new InterpreterError(InterpreterErrorCode.UNARY_NOT_NON_BOOLEAN, {
        token: node.opToken,
        data: { value: String(result.value) },
      });
    }

    throw new InterpreterError(InterpreterErrorCode.UNKNOWN_UNARY_OPERATOR, {
      token: node.opToken,
      data: { operator: node.op },
    });
  }

  private visitListNode(node: ListNode): ListSymbol {
    return new ListSymbol(
      node.elements.map((el) => this.visit(el) as ISymbolType),
      node instanceof ImplicitListNode,
      this.config,
    );
  }

  private visitImplicitListNode(node: ImplicitListNode): ListSymbol {
    return this.visitListNode(node);
  }

  private visitReferenceNode(node: ReferenceNode): ISymbolType {
    const value = this.getReference(node.value);

    if (!value) {
      throw new InterpreterError(InterpreterErrorCode.UNKNOWN_REFERENCE, {
        token: node.token,
        data: { reference: node.value },
      });
    }

    return value as ISymbolType;
  }

  private visitHexColorNode(node: HexColorNode): ColorSymbol {
    return new ColorSymbol(node.value, "Hex", this.config);
  }

  private visitBooleanNode(node: BooleanNode): BooleanSymbol {
    return new BooleanSymbol(node.value, this.config);
  }

  private visitNullNode(_node: NullNode): NullSymbol {
    return new NullSymbol(this.config);
  }

  private visitElementWithUnitNode(node: ElementWithUnitNode): NumberWithUnitSymbol {
    const valNodeVisit = this.visit(node.astNode);
    return new NumberWithUnitSymbol(valNodeVisit?.value, node.unit, this.config);
  }

  private visitFunctionCallNode(node: FunctionCallNode): ISymbolType {
    const fnName = node.name.toLowerCase();
    const args = node.args.map((arg) => this.visit(arg) as ISymbolType);

    if (this.config.functionsManager.hasFunction(fnName)) {
      const fn = this.config.functionsManager.getFunction(fnName);
      if (fn) {
        return fn(...args);
      }
    }

    if (this.config.colorManager.hasInitializer(fnName)) {
      return this.config.colorManager.executeInitializer(fnName, args);
    }

    if (UNINTERPRETED_KEYWORDS.includes(fnName)) {
      const argStrings = args.map((arg) => arg.toString());
      return new StringSymbol(`${fnName}(${argStrings.join(", ")})`, this.config);
    }

    throw new InterpreterError(InterpreterErrorCode.UNKNOWN_FUNCTION, {
      token: node.token,
      data: { functionName: node.name },
    });
  }

  private visitAssignNode(node: AssignNode): void {
    const name = node.varName.name;

    // Variable name validation
    if ([".", "[", "-"].some((c) => name.includes(c))) {
      throw new InterpreterError(InterpreterErrorCode.INVALID_VARIABLE_NAME, {
        token: node.varName.token,
        data: { name },
      });
    }

    if (this.symbolTable.isDefined(name)) {
      throw new InterpreterError(InterpreterErrorCode.VARIABLE_ALREADY_DEFINED, {
        token: node.varName.token,
        data: { name },
      });
    }

    const baseType = node.typeDecl.baseType.name;
    const subType = node.typeDecl.subTypes[0]?.name;

    if (!this.config.isTypeDefined(baseType, subType)) {
      throw new InterpreterError(InterpreterErrorCode.INVALID_VARIABLE_TYPE, {
        token: node.varName.token,
        data: {
          typeName: typeName(baseType, subType),
          validTypes: Object.keys(basicSymbolTypes).join(", "),
        },
      });
    }

    const constructorSymbol = this.config.getType(baseType, subType);

    const valueSymbol: ISymbolType = node.assignmentExpr
      ? (this.visit(node.assignmentExpr) as ISymbolType)
      : constructorSymbol;

    const coercedValueSymbol = this.coerceValue(constructorSymbol, valueSymbol);
    if (!coercedValueSymbol) {
      throw new InterpreterError(InterpreterErrorCode.INVALID_VALUE_FOR_VARIABLE, {
        token: node.varName.token,
        data: { value: String(valueSymbol.value), type: baseType, name },
      });
    }

    this.symbolTable.set(name, coercedValueSymbol);
  }

  private visitReassignNode(node: ReassignNode): void {
    const baseIdentifier = node.baseIdentifier();

    const existingVar = this.symbolTable.get(baseIdentifier.name);
    if (existingVar === null) {
      throw new InterpreterError(InterpreterErrorCode.VARIABLE_NOT_FOUND, {
        token: baseIdentifier.token,
        data: { name: baseIdentifier.name },
      });
    }

    const value = this.visit(node.value);

    if (value === null) {
      throw new InterpreterError(InterpreterErrorCode.ASSIGNMENT_VALUE_NULL, {
        token: (node.value as any).token,
        data: { identifier: node.identifierToString() },
      });
    }

    if (node.isAttributeAssignment()) {
      if (existingVar instanceof ColorSymbol) {
        this.config.colorManager.setAttribute(existingVar, node, value);
      }
    } else {
      if (typeEquals(value.type, "list")) {
        // TODO Implement list type-checking
      } else if (!typeEquals(existingVar.type, value.type)) {
        throw new InterpreterError(InterpreterErrorCode.TYPE_MISMATCH, {
          token: baseIdentifier.token,
          data: {
            value: String(value),
            foundType: value.type,
            expectedType: existingVar.type,
            identifier: node.identifierToString(),
          },
        });
      }

      if (!existingVar.validValue(value)) {
        throw new InterpreterError(InterpreterErrorCode.CANNOT_ASSIGN_TYPE, {
          token: (node.value as any).token,
          data: {
            valueType: value.type,
            identifier: node.identifierToString(),
            variableType: existingVar.type,
          },
        });
      }

      this.symbolTable.set(baseIdentifier.name, value);
    }
  }

  private visitAttributeAccessNode(node: AttributeAccessNode): ISymbolType {
    const left = this.visit(node.left) as ISymbolType;
    const right = node.right;

    if (typeof left.hasMethod === "function" && typeof left.hasAttribute === "function") {
      if (right instanceof FunctionCallNode) {
        // Handle method calls (e.g., str.lower(), color.hex())
        const args = right.args.map((arg) => this.visit(arg) as ISymbolType);
        if (left.hasMethod(right.name, args)) {
          const result = left.callMethod?.(right.name, args);
          if (result === null || result === undefined) {
            throw new InterpreterError(InterpreterErrorCode.METHOD_RETURNED_NULL, {
              token: node.token,
              data: { methodName: right.name },
            });
          }
          return result;
        }
        throw new InterpreterError(InterpreterErrorCode.METHOD_NOT_FOUND, {
          token: node.token,
          data: { methodName: right.name, value: String(left), type: left.type },
        });
      }
      if (right instanceof IdentifierNode) {
        // Handle property access (e.g., str.length, color.to)
        if (left.hasAttribute(right.name)) {
          const result = left.getAttribute?.(right.name);
          if (result === null || result === undefined) {
            throw new InterpreterError(InterpreterErrorCode.ATTRIBUTE_RETURNED_NULL, {
              token: node.token,
              data: { attributeName: right.name },
            });
          }
          return result;
        }
        throw new InterpreterError(InterpreterErrorCode.ATTRIBUTE_NOT_FOUND, {
          token: node.token,
          data: {
            attributeName: right.name,
            value: left instanceof ColorSymbol ? "Color" : String(left),
            type: left.type,
          },
        });
      }
    }

    throw new InterpreterError(InterpreterErrorCode.CANNOT_ACCESS_ATTRIBUTES, {
      token: node.token,
      data: { type: left.type },
    });
  }

  private visitStatementListNode(node: StatementListNode): ISymbolType | null {
    let result: ISymbolType | null = null;

    for (const statement of node.statements) {
      const statementResult = this.visit(statement);
      if (statementResult) {
        result = statementResult;
      }
    }

    return result;
  }

  private visitReturnNode(node: ReturnNode): void {
    throw new ReturnSignal(this.visit(node.expr));
  }

  private visitWhileNode(node: WhileNode): void {
    let iterations = 0;
    while (true) {
      iterations++;
      if (iterations > this.config.languageOptions.MAX_ITERATIONS) {
        throw new InterpreterError(InterpreterErrorCode.MAX_ITERATIONS_EXCEEDED, {
          token: node.token,
        });
      }
      const conditionNode = this.visit(node.condition);
      if (!(conditionNode instanceof BooleanSymbol)) {
        throw new InterpreterError(InterpreterErrorCode.WHILE_CONDITION_NOT_BOOLEAN, {
          token: node.condition?.token,
        });
      }
      if (!conditionNode.value) break;

      this.visit(node.body);
    }
  }

  private visitIfNode(node: IfNode): ISymbolType | null {
    // Process each condition in order (if, elif, elif, ...)
    for (const conditionNode of node.conditions) {
      const condition = this.visit(conditionNode.condition);
      if (!(condition instanceof BooleanSymbol)) {
        throw new InterpreterError(InterpreterErrorCode.IF_CONDITION_NOT_BOOLEAN, {
          token: (conditionNode.condition as any).token,
        });
      }

      if (condition.value) {
        return this.visit(conditionNode.body);
      }
    }

    // If no conditions were true, execute else body if it exists
    if (node.elseBody) {
      return this.visit(node.elseBody);
    }

    return null;
  }

  public interpret(): InterpreterResult {
    const tree = this.ast || (this.parser ? this.parser.parse() : null);
    if (!tree) return "";

    let result: ISymbolType | null;
    try {
      result = this.visit(tree);
    } catch (e) {
      if (e instanceof ReturnSignal) {
        result = e.value;
      } else if (e instanceof Error) {
        throw e;
      } else {
        throw new InterpreterError(InterpreterErrorCode.UNKNOWN_ERROR);
      }
    }

    return result;
  }
}
