import {
  type ASTNode,
  type ISymbolType,
  Operations,
  type ReferenceRecord,
  UNINTERPRETED_KEYWORDS,
} from "../types";
import {
  type AssignNode,
  AttributeAccessNode,
  type BinOpNode,
  type BooleanNode,
  type ElementWithUnitNode,
  FunctionCallNode,
  type HexColorNode,
  IdentifierNode,
  type IfNode,
  ImplicitListNode,
  type ListNode,
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
import { InterpreterError } from "./errors";
import * as operations from "./operations";
import { Parser } from "./parser";

import {
  BooleanSymbol,
  basicSymbolTypes,
  ColorSymbol,
  jsValueToSymbolType,
  ListSymbol,
  NumberSymbol,
  NumberWithUnitSymbol,
  StringSymbol,
  typeEquals,
} from "./symbols";
import { SymbolTable } from "./symbolTable";

class ReturnSignal {
  constructor(public value: ISymbolType | null) {}
}

export class Interpreter {
  private parser: Parser | null = null; // Null if created with pre-parsed AST
  private symbolTable: SymbolTable;
  private references: Map<string, ISymbolType> = new Map();
  private ast: ASTNode | null = null;
  private config: Config;

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
        this.references.set(key, jsValueToSymbolType(references[key]));
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

  // Visit Functions -------------------------------------------------------------

  private visit(node: ASTNode | null): ISymbolType | null {
    if (!node) return null;

    const visitorMethodName = `visit${node.nodeType}` as keyof this;
    if (typeof (this as any)[visitorMethodName] === "function") {
      return (this as any)[visitorMethodName](node);
    }

    throw new InterpreterError(
      `No visit method for AST node type: ${node.nodeType}`,
      node.token?.line,
      node.token,
    );
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
        throw new InterpreterError(
          `Arithmetic operator ${opVal} requires Number or NumberWithUnit operands, got ${left.type} and ${right.type}.`,
          node.opToken.line,
          node.opToken,
        );
      }

      return mathImpl(left, right);
    }

    const comparisonImpl = operations.COMPARISON_IMPLEMENTATIONS[opType];
    if (comparisonImpl) {
      return comparisonImpl(left, right);
    }

    throw new InterpreterError(
      `Unknown binary operator: ${opVal} or type ${opType}`,
      node.opToken.line,
      node.opToken,
    );
  }

  private visitNumNode(node: NumNode): NumberSymbol {
    return new NumberSymbol(node.value);
  }

  private visitStringNode(node: StringNode): StringSymbol {
    return new StringSymbol(node.value);
  }

  // Bare identifiers are treated as string literals if not found as variables
  private visitIdentifierNode(node: IdentifierNode): ISymbolType {
    const value = this.symbolTable.get(node.name);
    if (!value) {
      return new StringSymbol(node.name);
    }
    return value;
  }

  private visitUnaryOpNode(node: UnaryOpNode): ISymbolType {
    const result = this.visit(node.expr) as ISymbolType;

    if (node.op === Operations.SUBTRACT) {
      if (result instanceof NumberSymbol) {
        if (result.value === null) {
          throw new InterpreterError(
            `Cannot apply unary '-' to a null NumberSymbol.`,
            node.opToken.line,
            node.opToken,
          );
        }
        return new NumberSymbol(-result.value);
      }

      if (result instanceof NumberWithUnitSymbol) {
        if (result.value === null) {
          throw new InterpreterError(
            `Cannot apply unary '-' to a null NumberWithUnitSymbol.`,
            node.opToken.line,
            node.opToken,
          );
        }
        return new NumberWithUnitSymbol(-result.value, result.unit);
      }

      throw new InterpreterError(
        `Cannot apply unary '-' to non-number value: ${result.value}`,
        node.opToken.line,
        node.opToken,
      );
    }

    if (node.op === Operations.ADD) {
      if (result instanceof NumberSymbol || result instanceof NumberWithUnitSymbol) {
        return result;
      }

      throw new InterpreterError(
        `Cannot apply unary '+' to non-number value: ${result.value}`,
        node.opToken.line,
        node.opToken,
      );
    }

    if (node.op === Operations.LOGIC_NOT) {
      if (result instanceof BooleanSymbol) {
        return new BooleanSymbol(!result.value);
      }

      throw new InterpreterError(
        `Cannot apply NOT to non-boolean value: ${result.value}.`,
        node.opToken.line,
        node.opToken,
      );
    }

    throw new InterpreterError(
      `Unknown unary operator type: ${node.op}`,
      node.opToken.line,
      node.opToken,
    );
  }

  private visitListNode(node: ListNode): ListSymbol {
    return new ListSymbol(
      node.elements.map((el) => this.visit(el) as ISymbolType),
      node instanceof ImplicitListNode,
    );
  }

  private visitImplicitListNode(node: ImplicitListNode): ListSymbol {
    return this.visitListNode(node);
  }

  private visitReferenceNode(node: ReferenceNode): ISymbolType {
    const value = this.getReference(node.value);

    if (!value) {
      throw new InterpreterError(`Unknown reference: ${node.value}`, node.token.line, node.token);
    }

    return value as ISymbolType;
  }

  private visitHexColorNode(node: HexColorNode): ColorSymbol {
    return new ColorSymbol(node.value, "Hex");
  }

  private visitBooleanNode(node: BooleanNode): BooleanSymbol {
    return new BooleanSymbol(node.value);
  }

  private visitElementWithUnitNode(node: ElementWithUnitNode): NumberWithUnitSymbol {
    const valNodeVisit = this.visit(node.astNode);
    return new NumberWithUnitSymbol(valNodeVisit?.value, node.unit);
  }

  private visitFunctionCallNode(node: FunctionCallNode): ISymbolType {
    const fnName = node.name.toLowerCase();
    const args = node.args.map((arg) => this.visit(arg) as ISymbolType);

    const defaultFn = operations.DEFAULT_FUNCTION_MAP[fnName];
    if (defaultFn) {
      return defaultFn(...args);
    }

    if (this.config.colorManager.hasInitializer(fnName)) {
      return this.config.colorManager.executeInitializer(fnName, args);
    }

    if (UNINTERPRETED_KEYWORDS.includes(fnName)) {
      const argStrings = args.map((arg) => arg.toString());
      return new StringSymbol(`${fnName}(${argStrings.join(", ")})`);
    }

    throw new InterpreterError(`Unknown function: '${node.name}'`, node.token?.line, node.token);
  }

  private visitAssignNode(node: AssignNode): void {
    const name = node.varName.name;

    // Variable name validation
    if ([".", "[", "-"].some((c) => name.includes(c))) {
      throw new InterpreterError(
        `Invalid variable name '${name}'. Use a simple name (and underscores) without '.', '-', '['.`,
        node.varName.token.line,
        node.varName.token,
      );
    }

    if (this.symbolTable.isDefined(name)) {
      throw new InterpreterError(
        `Variable '${name}' already defined. Use a different name.`,
        node.varName.token.line,
        node.varName.token,
      );
    }

    const baseType = node.typeDecl.baseType.name;
    const subType = node.typeDecl.subTypes[0]?.name;

    if (!this.config.isTypeDefined(baseType, subType)) {
      throw new InterpreterError(
        `Invalid variable type '${baseType}'. Use a valid type. (${Object.keys(basicSymbolTypes).join(", ")})`,
        node.varName.token.line,
        node.varName.token,
        { baseType, subType, config: this.config },
      );
    }

    const value: ISymbolType = node.assignmentExpr
      ? (this.visit(node.assignmentExpr) as ISymbolType)
      : this.config.getType(baseType, subType);

    if (typeEquals(value.type, "list")) {
      // TODO Implement list type-checking
    } else if (!subType && !typeEquals(baseType, value.type)) {
      throw new InterpreterError(
        `Invalid value '${value}' ('${baseType}') for variable '${name}'. Use a valid value.`,
        node.varName.token.line,
        node.varName.token,
      );
    }

    this.symbolTable.set(name, value);
  }

  private visitReassignNode(node: ReassignNode): void {
    const baseIdentifier = node.baseIdentifier();

    const existingVar = this.symbolTable.get(baseIdentifier.name);
    if (existingVar === null) {
      throw new InterpreterError(
        `Variable '${baseIdentifier.name}' not found.`,
        baseIdentifier.token.line,
        baseIdentifier.token,
      );
    }

    const value = this.visit(node.value);

    if (value === null) {
      throw new InterpreterError(
        `Assignment value for '${node.identifierToString()}' is null.`,
        (node.value as any).token?.line,
      );
    }

    if (node.isAttributeAssignment()) {
      if (existingVar instanceof ColorSymbol) {
        this.config.colorManager.setAttribute(existingVar, node, value);
      }
    } else {
      if (typeEquals(value.type, "list")) {
        // TODO Implement list type-checking
      } else if (!typeEquals(existingVar.type, value.type)) {
        throw new InterpreterError(
          `Invalid value '${value}' (Found '${value.type}', expected '${existingVar.type}') for variable '${node.identifierToString()}'. Use a valid value.`,
          baseIdentifier.token.line,
          baseIdentifier.token,
        );
      }

      if (!existingVar.validValue(value)) {
        throw new InterpreterError(
          `Cannot assign ${value.type} to variable '${node.identifierToString()}' of type ${existingVar.type}.`,
          (node.value as any).token?.line,
        );
      }

      this.symbolTable.set(baseIdentifier.name, value);
    }
  }

  private visitAttributeAccessNode(node: AttributeAccessNode): ISymbolType {
    // TODO Clean up this messy implementation for the color conversion
    // Special case: Handle color conversion syntax like c.to.hex()
    if (node.left instanceof AttributeAccessNode && node.left.left instanceof IdentifierNode) {
      const nestedLeft = this.visit(node.left.left) as ISymbolType;
      const nestedRight = node.left.right;

      if (
        nestedLeft instanceof ColorSymbol &&
        nestedRight instanceof IdentifierNode &&
        node.right instanceof FunctionCallNode &&
        nestedRight.name === "to"
      ) {
        const targetColorMethod = node.right.name;
        const colorSymbol = nestedLeft;

        return this.config.colorManager.convertToByType(colorSymbol, targetColorMethod);
      }
    }

    const left = this.visit(node.left) as ISymbolType;
    const right = node.right;

    // Check if left supports attribute/method access
    if (typeof left.hasMethod === "function" && typeof left.hasAttribute === "function") {
      if (right instanceof FunctionCallNode) {
        // Handle method calls (e.g., str.lower())
        const args = right.args.map((arg) => this.visit(arg) as ISymbolType);
        if (left.hasMethod(right.name, args)) {
          const result = left.callMethod?.(right.name, args, this.config);
          if (result === null || result === undefined) {
            throw new InterpreterError(
              `Method '${right.name}' returned null or undefined`,
              node.token?.line,
              node.token,
            );
          }
          return result;
        }
        throw new InterpreterError(
          `Method '${right.name}' not found on '${left}' (${left.type})`,
          node.token?.line,
          node.token,
        );
      }
      if (right instanceof IdentifierNode) {
        // Handle property access (e.g., str.length)
        if (left.hasAttribute(right.name)) {
          const result = left.getAttribute?.(right.name);
          if (result === null || result === undefined) {
            throw new InterpreterError(
              `Attribute '${right.name}' returned null or undefined`,
              node.token?.line,
              node.token,
            );
          }
          return result;
        }
        let errMsg = `Attribute '${right.name}' not found on '${left}' (${left.type})`;
        // Force exactly "on Color" string for ColorSymbols (for test compatibility)
        if (left instanceof ColorSymbol) {
          errMsg = `Attribute '${right.name}' not found on Color.`;
        }
        throw new InterpreterError(errMsg, node.token?.line, node.token);
      }
    }

    throw new InterpreterError(
      `Cannot access attributes on ${left.type}`,
      node.token?.line,
      node.token,
    );
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
        throw new InterpreterError(
          "Max iterations exceeded in while loop.",
          node.token?.line,
          node.token,
        );
      }
      const conditionNode = this.visit(node.condition);
      if (!(conditionNode instanceof BooleanSymbol)) {
        throw new InterpreterError(
          "While loop condition must be a boolean.",
          node.condition.token?.line,
          node.condition?.token,
        );
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
        throw new InterpreterError(
          "If/elif condition must be a boolean.",
          (conditionNode.condition as any).token?.line,
          (conditionNode.condition as any).token,
        );
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

  public interpret(): ISymbolType | string | null {
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
        throw new InterpreterError("An unknown error occurred during interpretation.");
      }
    }

    return result;
  }
}
