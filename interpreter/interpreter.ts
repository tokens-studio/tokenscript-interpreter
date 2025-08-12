import {
  type ASTNode,
  type ISymbolType,
  type LanguageOptions,
  Operations,
  type ReferenceRecord,
  UNINTERPRETED_KEYWORDS,
} from "../types";
import {
  type AssignNode,
  type AttributeAccessNode,
  type AttributeAssignNode,
  type BinOpNode,
  type BlockNode,
  type BooleanNode,
  type ElementWithUnitNode,
  FunctionCallNode as FunctionCallNode,
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
import type { ColorManager } from "./colorManager";
import { InterpreterError } from "./errors";
import * as operations from "./operations";
import { Parser } from "./parser";
import {
  BaseSymbolType,
  BooleanSymbol,
  ColorSymbol,
  ListSymbol,
  NumberSymbol,
  NumberWithUnitSymbol,
  StringSymbol,
} from "./symbols";
import { SymbolTable } from "./symbolTable";

const { LANGUAGE_OPTIONS: DEFAULT_LANGUAGE_OPTIONS } = operations;

class ReturnSignal {
  constructor(public value: ISymbolType | null) {}
}

type MathOperand = NumberSymbol | NumberWithUnitSymbol;

export class Interpreter {
  private parser: Parser | null; // Null if created with pre-parsed AST
  private symbolTable: SymbolTable;
  private references: Map<string, ISymbolType> | Record<string, ISymbolType>;
  private ast: ASTNode | null = null;
  private languageOptions: LanguageOptions;
  private colorManager: ColorManager | null = null;

  constructor(
    input: Parser | ASTNode | null,
    references?: ReferenceRecord | Map<string, any>,
    symbolTable?: SymbolTable,
    languageOptions?: LanguageOptions,
    colorManager?: ColorManager,
  ) {
    if (input instanceof Parser) {
      this.parser = input;
    } else {
      this.ast = input;
      this.parser = null;
    }
    this.symbolTable = symbolTable || new SymbolTable();
    this.languageOptions = { ...DEFAULT_LANGUAGE_OPTIONS, ...languageOptions };
    this.colorManager = colorManager || null;

    // CRITICAL: Store the reference directly for shared reference model
    if (references instanceof Map) {
      // Direct reference to the shared Map
      this.references = references;
    } else {
      // New Record for backward compatibility
      this.references = {};
      if (references) {
        this.setReferences(references);
      }
    }

    if (this.colorManager) {
      for (const [name, _formatId] of Object.entries(this.colorManager.names)) {
        const colorType = this.colorManager.getColorType(name);
        if (colorType) {
          const colorManager = this.colorManager;

          class ColorConstructor extends BaseSymbolType {
            type = colorType!.type;

            constructor(value?: ISymbolType) {
              const instance = colorManager.initColorFormat(name, value);
              super(instance.value);
              Object.assign(this, instance);
            }

            validValue(value: any): boolean {
              return colorType!.validValue(value);
            }
          }

          this.symbolTable.addColorSubType(name, ColorConstructor);
        }
      }
    }
  }

  // References ------------------------------------------------------------------

  public setReferences(references: ReferenceRecord): void {
    if (this.references instanceof Map) {
      // For Map-based references (shared reference model)
      for (const key in references) {
        this.references.set(key, this.importReference(references[key]));
      }
    } else {
      // For Record-based references (backward compatibility)
      for (const key in references) {
        this.references[key] = this.importReference(references[key]);
      }
    }
  }

  public updateReferences(newReferences: ReferenceRecord): void {
    // NOTE: This method is now deprecated in the shared reference model
    // but kept for backward compatibility
    if (this.references instanceof Map) {
      for (const key in newReferences) {
        if (
          !this.references.has(key) ||
          this.references.get(key) !== newReferences[key]
        ) {
          this.references.set(key, this.importReference(newReferences[key]));
        }
      }
    } else {
      for (const key in newReferences) {
        if (
          !(key in this.references) ||
          this.references[key] !== newReferences[key]
        ) {
          this.references[key] = this.importReference(newReferences[key]);
        }
      }
    }
  }

  private importReference(value: any): ISymbolType {
    if (value instanceof BaseSymbolType) return value;
    if (typeof value === "number") return new NumberSymbol(value);
    if (typeof value === "string") {
      if (ColorSymbol.isValidHex(value)) return new ColorSymbol(value);
      return new StringSymbol(value);
    }
    if (typeof value === "boolean") return new BooleanSymbol(value);
    if (Array.isArray(value))
      return new ListSymbol(value.map((v) => this.importReference(v)));

    if (value instanceof NumberWithUnitSymbol) return value;
    const numberWithUnit = NumberWithUnitSymbol.fromRecord(value);
    if (numberWithUnit) return numberWithUnit;

    throw new InterpreterError(`Invalid reference value type: ${typeof value}`);
  }

  public getReference(key: string): ISymbolType | undefined {
    // NOTE: This method is now deprecated in the shared reference model
    // but kept for backward compatibility
    if (this.references instanceof Map) {
      return this.references.get(key);
    } else {
      return this.references[key];
    }
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

    const logicalBooleanImpl =
      operations.LOGICAL_BOOLEAN_IMPLEMENTATIONS[opVal];
    if (logicalBooleanImpl) {
      return logicalBooleanImpl(left, right);
    }

    const mathImpl = operations.MATH_IMPLEMENTATIONS[opVal];
    if (mathImpl) {
      if (
        !(
          (left instanceof NumberSymbol ||
            left instanceof NumberWithUnitSymbol) &&
          (right instanceof NumberSymbol ||
            right instanceof NumberWithUnitSymbol)
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
        return new NumberSymbol(-result.value);
      }

      if (result instanceof NumberWithUnitSymbol) {
        return new NumberWithUnitSymbol(-result.value, result.unit);
      }

      throw new InterpreterError(
        `Cannot apply unary '-' to non-number value: ${result.value}`,
        node.opToken.line,
        node.opToken,
      );
    }

    if (node.op === Operations.ADD) {
      if (
        result instanceof NumberSymbol ||
        result instanceof NumberWithUnitSymbol
      ) {
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
      throw new InterpreterError(
        `Unknown reference: ${node.value}`,
        node.token.line,
        node.token,
      );
    }

    return value as ISymbolType;
  }

  private visitHexColorNode(node: HexColorNode): ColorSymbol {
    return new ColorSymbol(node.value);
  }

  private visitBooleanNode(node: BooleanNode): BooleanSymbol {
    return new BooleanSymbol(node.value);
  }

  private visitElementWithUnitNode(
    node: ElementWithUnitNode,
  ): NumberWithUnitSymbol {
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

    if (this.colorManager?.hasFunction(fnName)) {
      return this.colorManager.executeFunction(fnName, args);
    }

    if (UNINTERPRETED_KEYWORDS.includes(fnName)) {
      const argStrings = args.map((arg) => arg.toString());
      return new StringSymbol(`${fnName}(${argStrings.join(", ")})`);
    }

    throw new InterpreterError(
      `Unknown function: '${node.name}'`,
      node.token?.line,
      node.token,
    );
  }

  private visitAssignNode(node: AssignNode): void {
    const name = node.varName.name;

    const baseType = node.typeDecl.baseType.name.toLowerCase();
    const subType =
      node.typeDecl.subTypes.length > 0
        ? node.typeDecl.subTypes.map((s) => s.name).join(".")
        : undefined;

    if (!this.symbolTable.isSymbolType(baseType)) {
      throw new InterpreterError(
        `Invalid variable type '${baseType}'. Use a valid type. (${Object.keys(this.symbolTable.activeSymbolTypes).join(", ")})`,
        node.varName.token.line,
        node.varName.token,
      );
    }

    if (this.symbolTable.exists(name)) {
      throw new InterpreterError(
        `Variable '${name}' already defined. Use a different name.`,
        node.varName.token.line,
        node.varName.token,
      );
    }

    if (!node.assignmentExpr) {
      this.symbolTable.set(name, null);
    }

    const value: ISymbolType = this.visit(node.assignmentExpr) as ISymbolType;

    if (value.type.toLowerCase() === "list") {
      // TODO Type checking for lists
    } else {
      if (!subType && baseType !== value.type.toLowerCase()) {
        throw new InterpreterError(
          `Invalid value '${value}' ('${baseType}') for variable '${name}'. Use a valid value.`,
          node.varName.token.line,
          node.varName.token,
        );
      }
    }

    if ([".", "[", "-"].some((c) => name.includes(c))) {
      throw new InterpreterError(
        `Invalid variable name '${name}'. Use a simple name (and underscores) without '.', '-', '['.`,
        node.varName.token.line,
        node.varName.token,
      );
    }

    // TODO Add subtypes

    this.symbolTable.set(name, value);
  }

  private visitReassignNode(node: ReassignNode): void {
    const varName = node.identifier.name;
    const existingVar = this.symbolTable.get(varName);

    if (existingVar === null) {
      throw new InterpreterError(
        `Variable '${varName}' not found.`,
        node.identifier.token.line,
        node.identifier.token,
      );
    }

    const valueToAssignVisit = this.visit(node.value);
    if (valueToAssignVisit === null) {
      throw new InterpreterError(
        `Assignment value for '${varName}' is null.`,
        (node.value as any).token?.line,
      );
    }

    const value = valueToAssignVisit as ISymbolType;

    if (value.type.toLowerCase() === "list") {
      // TODO Type checking for lists
    } else {
      if (existingVar.type.toLowerCase() !== value.type.toLowerCase()) {
        throw new InterpreterError(
          `Invalid value '${value}' ('${value.type}') for variable '${varName}'. Use a valid value.`,
          node.token?.line,
          node.token,
        );
      }
    }

    if (!existingVar.validValue(value)) {
      throw new InterpreterError(
        `Cannot assign ${value.type} to variable '${varName}' of type ${existingVar.type}.`,
        (node.value as any).token?.line,
      );
    }

    this.symbolTable.set(varName, value);
  }

  private visitAttributeAssignNode(node: AttributeAssignNode): void {
    const objVisitResult = this.visit(node.objectIdentifier);
    if (!objVisitResult)
      throw new InterpreterError(
        `Object '${node.objectIdentifier.name}' not found or is null.`,
        node.objectIdentifier.token.line,
      );
    let targetObject = objVisitResult as ISymbolType;

    const valueToAssignVisit = this.visit(node.value);
    if (valueToAssignVisit == null) {
      // Check for null or undefined
      throw new InterpreterError(
        "Value for attribute assignment is null or undefined.",
        (node.value as any).token?.line,
      );
    }
    const valueToAssign = valueToAssignVisit as ISymbolType; // Safe due to check

    if (node.attributes.length === 0) {
      if (!this.symbolTable.exists(node.objectIdentifier.name)) {
        throw new InterpreterError(
          `Variable '${node.objectIdentifier.name}' not defined for reassignment.`,
          node.objectIdentifier.token.line,
        );
      }
      const currentVar = this.symbolTable.get(node.objectIdentifier.name);
      if (!currentVar) {
        throw new InterpreterError(
          `Variable '${node.objectIdentifier.name}' not found in symbol table.`,
          node.objectIdentifier.token.line,
        );
      }
      if (currentVar.constructor !== valueToAssign.constructor) {
        try {
          const coerced = new (currentVar.constructor as any)(
            valueToAssign.value,
          );
          this.symbolTable.set(node.objectIdentifier.name, coerced);
        } catch (_e) {
          throw new InterpreterError(
            `Type mismatch on reassigning '${node.objectIdentifier.name}'. Expected ${currentVar.type}, got ${valueToAssign.type}.`,
            node.token?.line,
          );
        }
      } else {
        this.symbolTable.set(node.objectIdentifier.name, valueToAssign);
      }
      return;
    }

    for (let i = 0; i < node.attributes.length - 1; i++) {
      const attrName = node.attributes[i].name;
      if (typeof targetObject.getAttribute !== "function") {
        throw new InterpreterError(
          `Cannot access attribute '${attrName}' on intermediate value of type ${targetObject.type}.`,
          node.attributes[i].token.line,
        );
      }
      const nextTarget = targetObject.getAttribute(attrName);
      if (!nextTarget) {
        throw new InterpreterError(
          `Attribute '${attrName}' not found or is null in path.`,
          node.attributes[i].token.line,
        );
      }
      targetObject = nextTarget;
    }

    const finalAttrName = node.attributes[node.attributes.length - 1].name;
    if (typeof targetObject.setAttribute !== "function") {
      throw new InterpreterError(
        `Cannot set attribute '${finalAttrName}' on target of type ${targetObject.type}.`,
        node.attributes[node.attributes.length - 1].token.line,
      );
    }
    targetObject.setAttribute(finalAttrName, valueToAssign);
  }

  private visitAttributeAccessNode(node: AttributeAccessNode): ISymbolType {
    const leftVisitResult = this.visit(node.left);
    if (leftVisitResult == null) {
      throw new InterpreterError(
        "Cannot access attribute or method on null or undefined.",
        node.token?.line,
        node.token,
      );
    }
    const leftValue = leftVisitResult as ISymbolType;

    if (node.right instanceof IdentifierNode) {
      if (
        typeof leftValue.getAttribute !== "function" ||
        typeof leftValue.hasAttribute !== "function" ||
        !leftValue.hasAttribute(node.right.name)
      ) {
        throw new InterpreterError(
          `Attribute '${node.right.name}' not found or not accessible on type ${leftValue.type}.`,
          node.right.token.line,
          node.right.token,
        );
      }
      const attributeValue = leftValue.getAttribute(node.right.name);
      if (attributeValue == null) {
        // Check for null or undefined
        throw new InterpreterError(
          `Attribute '${node.right.name}' resolved to null or undefined on object of type ${leftValue.type}.`,
          node.right.token.line,
          node.right.token,
        );
      }
      return attributeValue; // attributeValue is ISymbolType
    }
    if (node.right instanceof FunctionCallNode) {
      if (
        typeof leftValue.callMethod !== "function" ||
        typeof leftValue.hasMethod !== "function"
      ) {
        throw new InterpreterError(
          `Type ${leftValue.type} does not support method calls.`,
          node.right.token?.line,
          node.right.token,
        );
      }
      const methodName = node.right.name;
      const args = node.right.args.map((arg) => {
        const visitedArg = this.visit(arg);
        if (visitedArg == null)
          throw new InterpreterError(
            `Method argument for '${methodName}' evaluated to null or undefined.`,
            (arg as any).token?.line,
          );
        return visitedArg as ISymbolType; // Safe due to check
      });

      const result = leftValue.callMethod(methodName, args); // result is ISymbolType | null | void
      if (result == null) {
        // Checks for null OR undefined
        throw new InterpreterError(
          `Method '${methodName}' on type ${leftValue.type} returned null or undefined, which is not a valid symbol.`,
          node.right.token?.line,
        );
      }
      return result; // result is now guaranteed to be ISymbolType
    }
    throw new InterpreterError(
      "Invalid attribute access structure.",
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
      if (iterations > this.languageOptions.MAX_ITERATIONS) {
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
    const conditionNode = this.visit(node.condition);
    if (!(conditionNode instanceof BooleanSymbol)) {
      throw new InterpreterError(
        "If condition must be a boolean.",
        (node.condition as any).token?.line,
        (node.condition as any).token,
      );
    }
    const validConditionNode = conditionNode as BooleanSymbol;

    if (validConditionNode.value) {
      return this.visit(node.ifBody);
    }

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
        throw new InterpreterError(
          "An unknown error occurred during interpretation.",
        );
      }
    }

    return result;
  }
}
