import { ProcessorError, ProcessorErrorCode } from "@interpreter/errors";

export function collectErrors(result: {
  errors: Map<string, Error>;
  resolved: Map<string, any>;
}): Record<string, { message: string; originalValue: string }> {
  const errors: Record<string, { message: string; originalValue: string }> = {};
  for (const [tokenName, error] of result.errors) {
    const originalValue = result.resolved.get(tokenName);
    errors[tokenName] = {
      message: error.message,
      originalValue: String(originalValue),
    };
  }
  return errors;
}

/**
 * Create a ProcessorError for dependency-related failures.
 * Builds the dependency chain and extracts the root cause.
 */
export function createDependencyError(
  tokenName: string,
  dependencyName: string,
  originalError: Error,
): ProcessorError {
  // Extract chain and root error
  const { chain, rootError } = extractDependencyInfo(tokenName, dependencyName, originalError);
  const chainStr = chain.join(" → ");

  return new ProcessorError(ProcessorErrorCode.DEPENDENCY_ERROR, {
    data: {
      tokenName,
      chain: chainStr,
      rootCause: rootError.message,
    },
  });
}

function extractDependencyInfo(
  tokenName: string,
  dependencyName: string,
  error: Error,
): { chain: string[]; rootError: Error } {
  // Check if it's already a dependency error
  if (
    error instanceof ProcessorError &&
    error.code === ProcessorErrorCode.DEPENDENCY_ERROR &&
    error.data.chain
  ) {
    // Parse the chain from the existing error
    const existingChain = String(error.data.chain).split(" → ");
    return {
      chain: [tokenName, ...existingChain],
      rootError: new Error(String(error.data.rootCause)),
    };
  }

  // Otherwise, it's a new chain
  return {
    chain: [tokenName, dependencyName],
    rootError: error,
  };
}
