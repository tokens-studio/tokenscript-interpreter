import type { ASTNode, Operations, Token, TokenType } from "@src/types";

/**
 * Partial reference node - represents an incomplete reference like {color without closing }
 */
export class PartialReferenceNode implements ASTNode {
  nodeType = "PartialReferenceNode";

  constructor(
    /** The partial reference name typed so far (e.g., "color" or "foo.bar") */
    public partialValue: string,
    public token: Token,
  ) {}
}

/**
 * Partial string node - represents an incomplete string like "hello without closing quote
 */
export class PartialStringNode implements ASTNode {
  nodeType = "PartialStringNode";

  constructor(
    /** The partial string value typed so far */
    public partialValue: string,
    /** The quote type used (' or ") */
    public quoteType: string,
    public token: Token,
  ) {}
}

/**
 * Partial function call node - represents an incomplete function call like func(1, 2 without closing )
 */
export class PartialFunctionCallNode implements ASTNode {
  nodeType = "PartialFunctionCallNode";

  constructor(
    /** The function name */
    public name: string,
    /** Arguments parsed so far */
    public args: ASTNode[],
    public token: Token,
  ) {}
}

/**
 * Partial binary operation node - represents an incomplete binary operation like 1 + without right operand
 */
export class PartialBinOpNode implements ASTNode {
  nodeType = "PartialBinOpNode";

  constructor(
    /** The left operand */
    public left: ASTNode,
    /** The operator token */
    public opToken: Token,
    public token?: Token,
  ) {
    this.token = opToken;
  }

  get op(): Operations | TokenType {
    return this.opToken.value as Operations | TokenType;
  }
}

/**
 * Partial unary operation node - represents an incomplete unary operation like - without operand
 */
export class PartialUnaryOpNode implements ASTNode {
  nodeType = "PartialUnaryOpNode";

  constructor(
    /** The operator token */
    public opToken: Token,
    public token?: Token,
  ) {
    this.token = opToken;
  }

  get op(): Operations {
    return this.opToken.value as Operations;
  }
}

/**
 * Partial parenthesized expression - represents an incomplete parenthesized expression like (1 + 2 without closing )
 */
export class PartialParenNode implements ASTNode {
  nodeType = "PartialParenNode";

  constructor(
    /** The expression inside the parentheses (may itself be partial) */
    public expr: ASTNode,
    public token: Token,
  ) {}
}
