export class DependencyError extends Error {
  public readonly dependencyChain: string[];
  public readonly rootError: Error;

  constructor(tokenName: string, dependencyName: string, originalError: Error) {
    // Build the error chain
    const rootError = DependencyError.extractRootError(originalError);
    const chain = [tokenName, ...DependencyError.extractChain(originalError, dependencyName)];
    const chainStr = chain.join(" → ");

    super(
      `Token '${tokenName}' failed due to dependency error: ${chainStr}\nRoot cause: ${rootError.message}`,
    );

    this.name = "DependencyError";
    this.dependencyChain = chain;
    this.rootError = rootError;
  }

  private static extractChain(error: Error, dependencyName: string): string[] {
    if (error instanceof DependencyError) {
      // Return the full chain from the dependency error
      return [...error.dependencyChain];
    }
    // If it's a regular error, just return the dependency name
    return [dependencyName];
  }

  private static extractRootError(error: Error): Error {
    if (error instanceof DependencyError) {
      return error.rootError;
    }
    return error;
  }
}
