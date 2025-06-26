import {
  type ASTNode,
  type ISymbolType,
  type LanguageOptions,
  Operations,
  type ReferenceRecord,
  UNINTERPRETED_KEYWORDS,
} from "../types";
import {
  type AttributeAccessNode,
  type AttributeAssignNode,
  type BinOpNode,
  type BlockNode,
  type BooleanNode,
  type ElementWithUnitNode,
  FunctionNode,
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
  type VarDeclNode,
  type WhileNode,
} from "./ast";
import type { ColorManager } from "./colorManager";
import { InterpreterError } from "./errors";
import {
  COMPARISON_IMPLEMENTATIONS,
  DEFAULT_FUNCTION_MAP,
  LANGUAGE_OPTIONS as DEFAULT_LANGUAGE_OPTIONS,
  OPERATION_IMPLEMENTATIONS,
} from "./operations";
import { Parser } from "./parser";
import { SymbolTable } from "./symbolTable";
import {
  BaseSymbolType,
  BooleanSymbol,
  ColorSymbol,
  ListSymbol,
  NumberSymbol,
  NumberWithUnitSymbol,
  StringSymbol,
} from "./symbols";

class ReturnSignal {
  constructor(public value: ISymbolType | null) {}
}

type MathOperand = NumberSymbol | NumberWithUnitSymbol;

export class Interpreter {
  private parser: Parser | null; // Null if created with pre-parsed AST
  private symbolTable: SymbolTable;
  private references: Record<string, ISymbolType> = {}; // Processed references
  private ast: ASTNode | null = null;
  private languageOptions: LanguageOptions;
  private colorManager: ColorManager | null = null; // ColorManager integration

  constructor(
    parserOrAst: Parser | ASTNode | null,
    references?: ReferenceRecord,
    symbolTable?: SymbolTable,
    languageOptions?: LanguageOptions,
    colorManager?: ColorManager
  ) {
    if (parserOrAst instanceof Parser) {
      this.parser = parserOrAst;
    } else {
      this.ast = parserOrAst;
      this.parser = null;
    }
    this.symbolTable = symbolTable || new SymbolTable();
    this.languageOptions = { ...DEFAULT_LANGUAGE_OPTIONS, ...languageOptions };
    this.colorManager = colorManager || null; // Store if provided

    // Register color types and functions if ColorManager is provided
    if (this.colorManager) {
      // Register color types in symbol table
      for (const [name, formatId] of Object.entries(this.colorManager.names)) {
        const colorType = this.colorManager.getColorType(name);
        if (colorType) {
          // Create a constructor function that creates new instances
          const colorManager = this.colorManager;
          class ColorConstructor extends BaseSymbolType {
            type = colorType!.type;

            constructor(value?: ISymbolType) {
              const instance = colorManager.initColorFormat(name, value);
              super(instance.value);
              Object.assign(this, instance);
            }

            valid_value(value: any): boolean {
              return colorType!.valid_value(value);
            }
          }

          this.symbolTable.addColorSubType(name, ColorConstructor);
        }
      }
    }

    if (references) {
      this.setReferences(references);
    }
  }

  public setReferences(references: ReferenceRecord): void {
    for (const key in references) {
      this.references[key] = this.importReferenceValue(references[key]);
    }
  }

  private importReferenceValue(value: any): ISymbolType {
    if (value instanceof BaseSymbolType) return value;
    if (typeof value === "number") return new NumberSymbol(value);
    if (typeof value === "string") {
      if (ColorSymbol.isValidHex(value)) return new ColorSymbol(value);
      return new StringSymbol(value);
    }
    if (typeof value === "boolean") return new BooleanSymbol(value);
    if (Array.isArray(value)) return new ListSymbol(value.map((v) => this.importReferenceValue(v)));

    throw new InterpreterError(`Invalid reference value type: ${typeof value}`);
  }

  private visit(node: ASTNode | null): ISymbolType | null | undefined {
    if (!node) return null;

    const visitorMethodName = `visit${node.nodeType}` as keyof this;
    if (typeof (this as any)[visitorMethodName] === "function") {
      return (this as any)[visitorMethodName](node);
    }
    this.genericVisit(node);
    return;
  }

  private genericVisit(node: ASTNode): void {
    throw new InterpreterError(
      `No visit method for AST node type: ${node.nodeType}`,
      node.token?.line,
      node.token
    );
  }

  private visitBinOpNode(node: BinOpNode): ISymbolType {
    const leftUnsafe = this.visit(node.left);
    const rightUnsafe = this.visit(node.right);

    if (leftUnsafe == null || rightUnsafe == null) {
      // Checks for null or undefined
      throw new InterpreterError(
        "Cannot perform binary operation on null or undefined value.",
        node.opToken.line,
        node.opToken
      );
    }
    const left = leftUnsafe as ISymbolType; // Safe due to check above
    const right = rightUnsafe as ISymbolType; // Safe due to check above

    const opVal = node.opToken.value as string;
    const opType = node.opToken.type;
    const opImpl = OPERATION_IMPLEMENTATIONS[opVal];

    if (opVal === Operations.LOGIC_AND || opVal === Operations.LOGIC_OR) {
      if (opImpl) return (opImpl as (a: ISymbolType, b: ISymbolType) => BooleanSymbol)(left, right);
    } else if (opImpl) {
      // Arithmetic operations
      if (
        !(
          (left instanceof NumberSymbol || left instanceof NumberWithUnitSymbol) &&
          (right instanceof NumberSymbol || right instanceof NumberWithUnitSymbol)
        )
      ) {
        throw new InterpreterError(
          `Arithmetic operator ${opVal} requires Number or NumberWithUnit operands, got ${left.type} and ${right.type}.`,
          node.opToken.line,
          node.opToken
        );
      }
      return (opImpl as (a: MathOperand, b: MathOperand) => MathOperand)(left, right);
    } else if (COMPARISON_IMPLEMENTATIONS[opType]) {
      return COMPARISON_IMPLEMENTATIONS[opType](left, right);
    }

    throw new InterpreterError(
      `Unknown binary operator: ${opVal} or type ${opType}`,
      node.opToken.line,
      node.opToken
    );
  }

  private visitNumNode(node: NumNode): NumberSymbol {
    return new NumberSymbol(node.value);
  }

  private visitStringNode(node: StringNode): StringSymbol {
    return new StringSymbol(node.value);
  }

  private visitIdentifierNode(node: IdentifierNode): ISymbolType {
    const value = this.symbolTable.get(node.name);
    if (value === null) {
      // In TokenScript, bare identifiers are treated as string literals if not found as variables
      // This matches the Python implementation behavior
      return new StringSymbol(node.name);
    }
    return value;
  }

  private visitUnaryOpNode(node: UnaryOpNode): ISymbolType {
    const exprVisitResult = this.visit(node.expr);
    if (exprVisitResult == null)
      throw new InterpreterError(
        "Cannot apply unary operator to null or undefined.",
        node.opToken.line,
        node.opToken
      );
    const exprValue = exprVisitResult as ISymbolType;

    if (node.op === Operations.SUBTRACT) {
      if (exprValue instanceof NumberSymbol) return new NumberSymbol(-exprValue.value);
      if (exprValue instanceof NumberWithUnitSymbol)
        return new NumberWithUnitSymbol(-exprValue.value, exprValue.unit);
      throw new InterpreterError(
        `Unary '-' not applicable to ${exprValue.type}.`,
        node.opToken.line,
        node.opToken
      );
    }
    if (node.op === Operations.ADD) {
      // Unary plus
      if (exprValue instanceof NumberSymbol || exprValue instanceof NumberWithUnitSymbol)
        return exprValue;
      throw new InterpreterError(
        `Unary '+' not applicable to ${exprValue.type}.`,
        node.opToken.line,
        node.opToken
      );
    }
    if (node.op === Operations.LOGIC_NOT) {
      if (exprValue instanceof BooleanSymbol) return new BooleanSymbol(!exprValue.value);
      throw new InterpreterError(
        `Unary '!' not applicable to ${exprValue.type}.`,
        node.opToken.line,
        node.opToken
      );
    }
    throw new InterpreterError(
      `Unknown unary operator: ${node.op}`,
      node.opToken.line,
      node.opToken
    );
  }

  private visitListNode(node: ListNode): ListSymbol {
    const elements = node.elements.map((el) => {
      const visitedEl = this.visit(el);
      if (visitedEl == null)
        throw new InterpreterError(
          "List elements cannot be null or undefined after evaluation.",
          node.token?.line
        );
      return visitedEl as ISymbolType;
    });
    return new ListSymbol(elements, node instanceof ImplicitListNode);
  }

  private visitImplicitListNode(node: ImplicitListNode): ListSymbol {
    return this.visitListNode(node);
  }

  private visitReferenceNode(node: ReferenceNode): ISymbolType {
    const value = this.references[node.value];
    if (value === undefined) {
      // References specifically uses undefined for not found
      throw new InterpreterError(
        `Reference '{${node.value}}' not found.`,
        node.token.line,
        node.token
      );
    }
    return value;
  }

  private visitHexColorNode(node: HexColorNode): ColorSymbol {
    return new ColorSymbol(node.value);
  }

  private visitBooleanNode(node: BooleanNode): BooleanSymbol {
    return new BooleanSymbol(node.value);
  }

  private visitElementWithUnitNode(node: ElementWithUnitNode): NumberWithUnitSymbol {
    const valNodeVisit = this.visit(node.astNode);
    if (!(valNodeVisit instanceof NumberSymbol)) {
      const typeStr = valNodeVisit
        ? (valNodeVisit as ISymbolType).type
        : valNodeVisit == null
          ? "null/undefined"
          : "void";
      throw new InterpreterError(
        `Cannot apply unit to non-number type ${typeStr}.`,
        node.token?.line,
        node.token
      );
    }
    return new NumberWithUnitSymbol(valNodeVisit.value, node.unit);
  }

  private visitFunctionNode(node: FunctionNode): ISymbolType {
    const funcName = node.name.toLowerCase();
    const args = node.args.map((arg) => {
      const visitedArg = this.visit(arg);
      if (visitedArg == null)
        throw new InterpreterError(
          `Function argument for '${node.name}' evaluated to null or undefined.`,
          (arg as any).token?.line
        );
      return visitedArg as ISymbolType;
    });

    if (DEFAULT_FUNCTION_MAP[funcName]) {
      return DEFAULT_FUNCTION_MAP[funcName](...args);
    }

    // Check ColorManager for color functions
    if (this.colorManager?.hasFunction(funcName)) {
      return this.colorManager.executeFunction(funcName, args);
    }

    if (UNINTERPRETED_KEYWORDS.includes(funcName)) {
      const argStrings = args.map((arg) => arg.toString());
      return new StringSymbol(`${funcName}(${argStrings.join(", ")})`);
    }

    throw new InterpreterError(`Function '${node.name}' not found.`, node.token?.line, node.token);
  }

  private visitVarDeclNode(node: VarDeclNode): void {
    const varName = node.varName.name;
    let valueToAssign: ISymbolType | null = null; // Initialize as null

    if (node.assignmentExpr) {
      const visitedValue = this.visit(node.assignmentExpr); // Can be ISymbolType | null | void
      if (visitedValue === undefined) {
        // Explicitly check for void/undefined
        valueToAssign = null;
      } else if (visitedValue === null) {
        // Explicitly check for null
        valueToAssign = null;
      } else {
        // visitedValue is ISymbolType
        valueToAssign = visitedValue;
      }
    }
    // At this point, valueToAssign is ISymbolType | null.

    const typeName = node.typeDecl.baseType.name.toLowerCase();
    const subTypeName =
      node.typeDecl.subTypes.length > 0
        ? node.typeDecl.subTypes.map((s) => s.name).join(".")
        : undefined;
    const SymbolConstructor: new (...args: any[]) => ISymbolType =
      this.symbolTable.getSymbolConstructor(typeName, subTypeName);

    if (this.symbolTable.exists(varName) && this.symbolTable.isRoot()) {
      throw new InterpreterError(
        `Variable '${varName}' already declared.`,
        node.varName.token.line,
        node.varName.token
      );
    }

    if (valueToAssign !== null && valueToAssign !== undefined) {
      // Checks for both null and undefined. After above logic, effectively checks for not null.
      // valueToAssign is confirmed ISymbolType here.
      const currentAssignmentValue: ISymbolType = valueToAssign;

      // Get the target type by creating a temporary instance
      const tempInstance = new SymbolConstructor(null);
      const targetType = tempInstance.type;

      const isCorrectType = currentAssignmentValue instanceof SymbolConstructor;
      const hasType = currentAssignmentValue.type;
      const typeMismatch =
        hasType && currentAssignmentValue.type.toLowerCase() !== targetType.toLowerCase();

      if (!isCorrectType && typeMismatch) {
        // Type assertion to help TypeScript understand that currentAssignmentValue is ISymbolType
        const assignmentValue = currentAssignmentValue as ISymbolType;
        const originalTypeForErrorMessage = assignmentValue.type;
        try {
          let rawValueForCoercion = assignmentValue.value;

          if (SymbolConstructor === (ListSymbol as any) && Array.isArray(rawValueForCoercion)) {
            rawValueForCoercion = (rawValueForCoercion as any[]).map((v) =>
              this.importReferenceValue(v)
            );
          } else if (rawValueForCoercion instanceof BaseSymbolType) {
            // This unwrap might be too aggressive if a constructor expects a symbol.
            // However, it matches the original logic.
            // Consider if constructors should primarily handle raw values or if they are robust to symbol inputs.
            // Many current symbol constructors (e.g., NumberSymbol) can handle symbol inputs.
            // For now, keeping the unwrap for consistency with the provided code's apparent intention.
            // rawValueForCoercion = rawValueForCoercion.value; // Potentially problematic unwrap
          }
          // If SymbolConstructor is robust (e.g. NumberSymbol can take NumberSymbol),
          // passing currentAssignmentValue directly might be better than rawValueForCoercion sometimes.
          // Forcing rawValueForCoercion is safer if constructors expect primitives.

          // Let's pass 'currentAssignmentValue' itself if target is same type, or its .value for coercion
          let valueForConstructor: any;
          if (assignmentValue instanceof SymbolConstructor) {
            valueForConstructor = assignmentValue; // Pass instance if it's already the target type
          } else {
            // Special handling for coercing to String - use toString() method
            if (SymbolConstructor === StringSymbol) {
              valueForConstructor = (assignmentValue as ISymbolType).toString();
            } else {
              // Prepare rawValueForCoercion from assignmentValue.value
              let preparedRawValue = (assignmentValue as ISymbolType).value;
              if (SymbolConstructor === ListSymbol && Array.isArray(preparedRawValue)) {
                preparedRawValue = preparedRawValue.map((v) => this.importReferenceValue(v));
              }
              // The original code had an unwrap: else if (preparedRawValue instanceof BaseSymbolType) preparedRawValue = preparedRawValue.value;
              // This general unwrap is removed to allow constructors to handle symbol inputs.
              valueForConstructor = preparedRawValue;
            }
          }

          const coercedValue = new SymbolConstructor(valueForConstructor);

          if (
            coercedValue.type.toLowerCase() === targetType.toLowerCase() ||
            this.symbolTable.getSymbolConstructor(typeName, subTypeName) ===
              coercedValue.constructor
          ) {
            valueToAssign = coercedValue;
          } else {
            throw new Error(
              `Coercion to ${node.typeDecl.toString()} resulted in an unexpected type ${coercedValue.type}.`
            );
          }
        } catch (e: any) {
          throw new InterpreterError(
            `Type mismatch: Cannot assign value of type ${originalTypeForErrorMessage} to variable '${varName}' of type ${node.typeDecl.toString()}. Coercion failed: ${e.message || String(e)}`,
            node.varName.token.line,
            node.varName.token
          );
        }
      }
      // If no coercion needed, valueToAssign (which is currentAssignmentValue) is already correct.
    } else {
      // valueToAssign is null (or was undefined and became null)
      try {
        if (
          SymbolConstructor === (NumberWithUnitSymbol as any) &&
          node.typeDecl.subTypes.length === 0
        ) {
          throw new InterpreterError(
            `Cannot create a default instance for '${varName}' of type ${node.typeDecl.toString()}. Unit is required.`,
            node.varName.token.line
          );
        }
        valueToAssign = new SymbolConstructor(null); // Create default instance
      } catch (e: any) {
        throw new InterpreterError(
          `Cannot create a default instance for variable '${varName}' of type ${node.typeDecl.toString()}. Type might require explicit initialization. Constructor error: ${e.message || String(e)}`,
          node.varName.token.line,
          node.varName.token
        );
      }
    }

    // Final check: valueToAssign must be an ISymbolType by now, or an error should have been thrown.
    if (valueToAssign == null) {
      // Handles null or undefined
      // This should be an internal error if logic above is complete.
      throw new InterpreterError(
        `Internal error: Variable '${varName}' could not be initialized to a valid symbol.`,
        node.varName.token.line,
        node.varName.token
      );
    }
    this.symbolTable.set(varName, valueToAssign); // valueToAssign is guaranteed ISymbolType here
  }

  private visitReassignNode(node: ReassignNode): void {
    const varName = node.identifier.name;
    const existingVar = this.symbolTable.get(varName);

    if (existingVar === null) {
      throw new InterpreterError(
        `Variable '${varName}' not found.`,
        node.identifier.token.line,
        node.identifier.token
      );
    }

    const valueToAssignVisit = this.visit(node.value);
    if (valueToAssignVisit === undefined) {
      throw new InterpreterError(
        `Assignment value for '${varName}' is undefined.`,
        (node.value as any).token?.line
      );
    }

    const valueToAssign = valueToAssignVisit as ISymbolType;

    // Type checking - ensure the new value is compatible with the existing variable type
    if (!existingVar.valid_value(valueToAssign)) {
      throw new InterpreterError(
        `Cannot assign ${valueToAssign.type} to variable '${varName}' of type ${existingVar.type}.`,
        (node.value as any).token?.line
      );
    }

    this.symbolTable.set(varName, valueToAssign);
  }

  private visitAttributeAssignNode(node: AttributeAssignNode): void {
    const objVisitResult = this.visit(node.objectIdentifier);
    if (!objVisitResult)
      throw new InterpreterError(
        `Object '${node.objectIdentifier.name}' not found or is null.`,
        node.objectIdentifier.token.line
      );
    let targetObject = objVisitResult as ISymbolType;

    const valueToAssignVisit = this.visit(node.value);
    if (valueToAssignVisit == null) {
      // Check for null or undefined
      throw new InterpreterError(
        `Value for attribute assignment is null or undefined.`,
        (node.value as any).token?.line
      );
    }
    const valueToAssign = valueToAssignVisit as ISymbolType; // Safe due to check

    if (node.attributes.length === 0) {
      if (!this.symbolTable.exists(node.objectIdentifier.name)) {
        throw new InterpreterError(
          `Variable '${node.objectIdentifier.name}' not defined for reassignment.`,
          node.objectIdentifier.token.line
        );
      }
      const currentVar = this.symbolTable.get(node.objectIdentifier.name)!;
      if (currentVar.constructor !== valueToAssign.constructor) {
        try {
          const coerced = new (currentVar.constructor as any)(valueToAssign.value);
          this.symbolTable.set(node.objectIdentifier.name, coerced);
        } catch (_e) {
          throw new InterpreterError(
            `Type mismatch on reassigning '${node.objectIdentifier.name}'. Expected ${currentVar.type}, got ${valueToAssign.type}.`,
            node.token?.line
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
          node.attributes[i].token.line
        );
      }
      const nextTarget = targetObject.getAttribute(attrName);
      if (!nextTarget) {
        throw new InterpreterError(
          `Attribute '${attrName}' not found or is null in path.`,
          node.attributes[i].token.line
        );
      }
      targetObject = nextTarget;
    }

    const finalAttrName = node.attributes[node.attributes.length - 1].name;
    if (typeof targetObject.setAttribute !== "function") {
      throw new InterpreterError(
        `Cannot set attribute '${finalAttrName}' on target of type ${targetObject.type}.`,
        node.attributes[node.attributes.length - 1].token.line
      );
    }
    targetObject.setAttribute(finalAttrName, valueToAssign);
  }

  private visitAttributeAccessNode(node: AttributeAccessNode): ISymbolType {
    const leftVisitResult = this.visit(node.left);
    if (leftVisitResult == null) {
      // Check for null or undefined
      throw new InterpreterError(
        "Cannot access attribute or method on null or undefined.",
        node.token?.line,
        node.token
      );
    }
    const leftValue = leftVisitResult as ISymbolType; // Safe due to check

    if (node.right instanceof IdentifierNode) {
      if (
        typeof leftValue.getAttribute !== "function" ||
        typeof leftValue.hasAttribute !== "function" ||
        !leftValue.hasAttribute(node.right.name)
      ) {
        throw new InterpreterError(
          `Attribute '${node.right.name}' not found or not accessible on type ${leftValue.type}.`,
          node.right.token.line,
          node.right.token
        );
      }
      const attributeValue = leftValue.getAttribute(node.right.name);
      if (attributeValue == null) {
        // Check for null or undefined
        throw new InterpreterError(
          `Attribute '${node.right.name}' resolved to null or undefined on object of type ${leftValue.type}.`,
          node.right.token.line,
          node.right.token
        );
      }
      return attributeValue; // attributeValue is ISymbolType
    } else if (node.right instanceof FunctionNode) {
      if (typeof leftValue.callMethod !== "function" || typeof leftValue.hasMethod !== "function") {
        throw new InterpreterError(
          `Type ${leftValue.type} does not support method calls.`,
          node.right.token?.line,
          node.right.token
        );
      }
      const methodName = node.right.name;
      const args = node.right.args.map((arg) => {
        const visitedArg = this.visit(arg);
        if (visitedArg == null)
          throw new InterpreterError(
            `Method argument for '${methodName}' evaluated to null or undefined.`,
            (arg as any).token?.line
          );
        return visitedArg as ISymbolType; // Safe due to check
      });

      const result = leftValue.callMethod(methodName, args); // result is ISymbolType | null | void
      if (result == null) {
        // Checks for null OR undefined
        throw new InterpreterError(
          `Method '${methodName}' on type ${leftValue.type} returned null or undefined, which is not a valid symbol.`,
          node.right.token?.line
        );
      }
      return result; // result is now guaranteed to be ISymbolType
    }
    throw new InterpreterError("Invalid attribute access structure.", node.token?.line, node.token);
  }

  private visitStatementListNode(node: StatementListNode): ISymbolType | null | undefined {
    let result: ISymbolType | null | undefined;
    for (const statement of node.statements) {
      const statementVisitResult = this.visit(statement);
      if (statementVisitResult instanceof ReturnSignal) {
        throw statementVisitResult;
      }
      if (statementVisitResult !== undefined) {
        result = statementVisitResult;
      }
    }
    return result;
  }

  private visitReturnNode(node: ReturnNode): void {
    const returnValueVisit = this.visit(node.expr);
    if (returnValueVisit === undefined) {
      throw new ReturnSignal(null);
    }
    throw new ReturnSignal(returnValueVisit); // returnValueVisit is ISymbolType | null
  }

  private visitBlockNode(node: BlockNode): ISymbolType | null | undefined {
    const oldSymbolTable = this.symbolTable;
    this.symbolTable = new SymbolTable(oldSymbolTable);
    let result: ISymbolType | null | undefined;
    try {
      const blockVisitResult = this.visit(node.statements);
      if (blockVisitResult !== undefined) {
        result = blockVisitResult;
      }
    } finally {
      this.symbolTable = oldSymbolTable;
    }
    return result;
  }

  private visitWhileNode(node: WhileNode): void {
    let iterations = 0;
    while (true) {
      iterations++;
      if (iterations > this.languageOptions.MAX_ITERATIONS) {
        throw new InterpreterError(
          "Max iterations exceeded in while loop.",
          node.token?.line,
          node.token
        );
      }
      const conditionVisitResult = this.visit(node.condition);
      if (!conditionVisitResult || !(conditionVisitResult instanceof BooleanSymbol)) {
        throw new InterpreterError(
          "While loop condition must be a boolean.",
          (node.condition as any).token?.line,
          (node.condition as any).token
        );
      }
      const conditionValue = conditionVisitResult as BooleanSymbol;
      if (!conditionValue.value) break;

      try {
        this.visit(node.body);
      } catch (e) {
        if (e instanceof ReturnSignal) throw e;
        throw e;
      }
    }
  }

  private visitIfNode(node: IfNode): ISymbolType | null | undefined {
    const conditionVisitResult = this.visit(node.condition);
    if (!conditionVisitResult || !(conditionVisitResult instanceof BooleanSymbol)) {
      throw new InterpreterError(
        "If condition must be a boolean.",
        (node.condition as any).token?.line,
        (node.condition as any).token
      );
    }
    const conditionValue = conditionVisitResult as BooleanSymbol;

    if (conditionValue.value) {
      return this.visit(node.ifBody);
    } else if (node.elseBody) {
      return this.visit(node.elseBody);
    }
    return; // void if no branch taken
  }

  public interpret(): ISymbolType | string | null {
    const tree = this.ast || (this.parser ? this.parser.parse() : null);
    if (!tree) return "";

    let visitOutcome: ISymbolType | null | undefined;
    try {
      visitOutcome = this.visit(tree);
    } catch (e) {
      if (e instanceof ReturnSignal) {
        visitOutcome = e.value;
      } else if (e instanceof Error) {
        throw e;
      } else {
        throw new InterpreterError("An unknown error occurred during interpretation.");
      }
    }

    if (visitOutcome === undefined) {
      return null;
    }

    if (visitOutcome instanceof BaseSymbolType) {
      return visitOutcome;
    }

    return visitOutcome === null ? null : String(visitOutcome);
  }
}
