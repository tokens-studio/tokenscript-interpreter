import {
  parseExpression,
  renameReferences,
  TokenResolver,
  type CreateTokenResult,
  type DeleteTokenResult,
  type UpdateTokenResult,
} from "@tokens-studio/tokenscript-interpreter";

import type { TokensMap } from "@/state";

export type TokenCrudResult = {
  create?: CreateTokenResult;
  update?: UpdateTokenResult;
  delete?: DeleteTokenResult;
};

export type TokenBackReference = {
  setName: string;
  tokenPath: string;
  tokenData: { $value: unknown; $type?: string };
};

export type ValidationErrorType =
  | "broken-references"
  | "rename-broken-references"
  | "token-already-exists"
  | "token-not-found";

export type ValidationError = {
  type: ValidationErrorType;
  message: string;
  affectedTokens: string[];
};

/**
 * Collect back-references for tokens that reference a given token path.
 * Returns a map of token paths to their set locations.
 */
export function collectTokenBackReferences(
  sets: Map<string, TokensMap>,
  activeSets: Set<string>,
  referencedTokens: Set<string>
): Map<string, TokenBackReference> {
  const backRefs = new Map<string, TokenBackReference>();

  for (const [setName, tokens] of sets) {
    if (!activeSets.has(setName)) continue;

    for (const [tokenPath, tokenData] of tokens) {
      if (referencedTokens.has(tokenPath)) {
        backRefs.set(tokenPath, { setName, tokenPath, tokenData });
      }
    }
  }

  return backRefs;
}

/**
 * Apply reference renames to a single token value using AST-based renaming.
 */
export function applyReferenceRename(
  tokenValue: unknown,
  renameMap: Record<string, string>
): unknown {
  if (typeof tokenValue !== "string") return tokenValue;

  try {
    const { ast } = parseExpression(tokenValue);
    if (!ast) return tokenValue;

    return renameReferences(tokenValue, ast, renameMap);
  } catch {
    return tokenValue;
  }
}

/**
 * Apply renamed references back to original sets using back-references.
 */
export function applyRenamedReferencesToSets(
  sets: Map<string, TokensMap>,
  backRefs: Map<string, TokenBackReference>,
  renameMap: Record<string, string>
): Map<string, TokensMap> {
  const newSets = new Map(sets);

  for (const [tokenPath, backRef] of backRefs) {
    const setTokens = newSets.get(backRef.setName);
    if (!setTokens) continue;

    const updatedValue = applyReferenceRename(backRef.tokenData.$value, renameMap);
    if (updatedValue === backRef.tokenData.$value) continue;

    const updatedSet = new Map(setTokens);
    updatedSet.set(tokenPath, { ...backRef.tokenData, $value: updatedValue });
    newSets.set(backRef.setName, updatedSet);
  }

  return newSets;
}

/**
 * Create a preview resolver from merged tokens for validation.
 */
export function createPreviewResolver(mergedTokens: TokensMap): TokenResolver | null {
  try {
    const previewMerged = new Map(mergedTokens);
    const { resolver } = new TokenResolver().build(previewMerged);
    return resolver;
  } catch {
    return null;
  }
}

/**
 * Preview create operation and return validation errors from processor.
 */
export function previewCreate(
  resolver: TokenResolver,
  tokenPath: string,
  tokenData: { $value: unknown; $type?: string }
): { result: TokenCrudResult | null; error?: Error } {
  try {
    const result = resolver.createToken({ tokenPath, tokenData });
    return { result: { create: result } };
  } catch (error) {
    return { result: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Preview update operation and return validation errors from processor.
 */
export function previewUpdate(
  resolver: TokenResolver,
  tokenPath: string,
  options?: {
    tokenData?: { $value: unknown; $type?: string };
    newTokenPath?: string;
    updateReferences?: boolean;
  }
): { result: TokenCrudResult | null; error?: Error } {
  try {
    const result = resolver.updateToken({
      tokenPath,
      tokenData: options?.tokenData,
      tokenPathRenamed: options?.newTokenPath,
      updateReferences: options?.updateReferences,
    });
    return { result: { update: result } };
  } catch (error) {
    return { result: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Preview delete operation and return validation errors from processor.
 */
export function previewDelete(
  resolver: TokenResolver,
  tokenPath: string
): { result: TokenCrudResult | null; error?: Error } {
  try {
    const result = resolver.deleteToken({ tokenPath });
    return { result: { delete: result } };
  } catch (error) {
    return { result: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Convert processor error to validation error.
 */
function processorErrorToValidationError(error: Error): ValidationError | null {
  // Check if it's a ProcessorError by checking for code property
  const processorError = error as { code?: string; data?: { tokenName?: string } };
  
  if (!processorError.code) return null;

  switch (processorError.code) {
    case "PROC_TOKEN_ALREADY_EXISTS":
      return {
        type: "token-already-exists",
        message: `Token "${processorError.data?.tokenName || "unknown"}" already exists`,
        affectedTokens: processorError.data?.tokenName ? [processorError.data.tokenName] : [],
      };
    case "PROC_TOKEN_NOT_FOUND":
      return {
        type: "token-not-found",
        message: `Token "${processorError.data?.tokenName || "unknown"}" not found`,
        affectedTokens: processorError.data?.tokenName ? [processorError.data.tokenName] : [],
      };
    default:
      return null;
  }
}

/**
 * Extract validation errors from CRUD result and processor errors.
 * Returns only errors that come from the processor output.
 */
export function extractValidationErrors(
  result: TokenCrudResult | null,
  error?: Error
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Handle processor errors (e.g., TOKEN_ALREADY_EXISTS, TOKEN_NOT_FOUND)
  if (error) {
    const validationError = processorErrorToValidationError(error);
    if (validationError) {
      errors.push(validationError);
    }
  }

  if (!result) return errors;

  // Extract broken references from delete operation
  if (result.delete?.brokenReferences && result.delete.brokenReferences.size > 0) {
    errors.push({
      type: "broken-references",
      message: `This will break ${result.delete.brokenReferences.size} reference(s)`,
      affectedTokens: Array.from(result.delete.brokenReferences),
    });
  }

  // Extract broken references from update operation (when not updating references)
  if (result.update?.brokenReferences && result.update.brokenReferences.size > 0) {
    errors.push({
      type: "rename-broken-references",
      message: `Renaming will break ${result.update.brokenReferences.size} reference(s)`,
      affectedTokens: Array.from(result.update.brokenReferences),
    });
  }

  return errors;
}

/**
 * Preview a token operation and extract validation errors.
 */
export function previewTokenOperation(
  operation: "create" | "update" | "delete",
  mergedTokens: TokensMap,
  tokenPath: string,
  options?: {
    tokenData?: { $value: unknown; $type?: string };
    newTokenPath?: string;
    updateReferences?: boolean;
  }
): ValidationError[] {
  const previewResolver = createPreviewResolver(mergedTokens);
  if (!previewResolver) return [];

  let result: TokenCrudResult | null = null;
  let error: Error | undefined;

  switch (operation) {
    case "create": {
      if (options?.tokenData) {
        const preview = previewCreate(previewResolver, tokenPath, options.tokenData);
        result = preview.result;
        error = preview.error;
      }
      break;
    }
    case "update": {
      const preview = previewUpdate(previewResolver, tokenPath, options);
      result = preview.result;
      error = preview.error;
      break;
    }
    case "delete": {
      const preview = previewDelete(previewResolver, tokenPath);
      result = preview.result;
      error = preview.error;
      break;
    }
  }

  return extractValidationErrors(result, error);
}
