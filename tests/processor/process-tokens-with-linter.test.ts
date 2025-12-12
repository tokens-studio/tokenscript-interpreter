import type { LintIssue, LintRunner } from "@src/processor/linter";
import { processTokens } from "@src/processor/process";
import type { TokenData } from "@src/processor/utils/tokens";
import { describe, expect, it } from "vitest";

/**
 * Tests that verify the linter is preserved when using CRUD operations
 * on the resolver from processTokens output.
 */
describe("processTokens with linter", () => {
  const createTestLinter = (): {
    linter: LintRunner;
    capturedIssues: LintIssue[];
  } => {
    const capturedIssues: LintIssue[] = [];

    const linter: LintRunner = {
      lintResult: (params) => {
        // Simple rule: flag any token with value "FLAG_THIS"
        if (params.result?.value === "FLAG_THIS") {
          const issue: LintIssue = {
            severity: "warning",
            message: "Flagged test token",
            tokenName: params.tokenName,
            rule: "test-rule",
          };
          capturedIssues.push(issue);
          return [issue];
        }
        return [];
      },
      aggregateResults: (issues) => {
        return {
          issues,
          hasErrors: false,
          hasWarnings: issues.length > 0,
        };
      },
    };

    return { linter, capturedIssues };
  };

  it("should preserve linter through processTokens and initial resolution", () => {
    const { linter, capturedIssues } = createTestLinter();

    const tokens = new Map<string, TokenData>([
      ["color.primary", { $value: "FLAG_THIS", $type: "color" }],
      ["color.secondary", { $value: "#00FF00", $type: "color" }],
    ]);

    const result = processTokens(tokens, { linter });

    // Linter should have been called during initial resolution
    expect(capturedIssues.length).toBe(1);
    expect(capturedIssues[0].tokenName).toBe("color.primary");
    expect(capturedIssues[0].message).toBe("Flagged test token");

    // Lint results should be in the output
    expect(result.lint?.hasWarnings).toBe(true);
    expect(result.lint?.issues.length).toBe(1);
  });

  it("should preserve linter when using updateToken CRUD operation", () => {
    const { linter, capturedIssues } = createTestLinter();

    const tokens = new Map<string, TokenData>([
      ["color.primary", { $value: "#FF0000", $type: "color" }],
      ["color.secondary", { $value: "#00FF00", $type: "color" }],
    ]);

    const result = processTokens(tokens, { linter });
    const { resolver } = result;

    // Initial resolution should have no lint issues
    expect(capturedIssues.length).toBe(0);

    // Clear captured issues
    capturedIssues.length = 0;

    // Update a token to a flagged value
    resolver.updateToken({
      tokenPath: "color.primary",
      tokenData: { $value: "FLAG_THIS", $type: "color" },
    });

    // Linter should have been called during updateToken
    expect(capturedIssues.length).toBe(1);
    expect(capturedIssues[0].tokenName).toBe("color.primary");
  });

  it("should preserve linter when using createToken CRUD operation", () => {
    const { linter, capturedIssues } = createTestLinter();

    const tokens = new Map<string, TokenData>([["color.primary", { $value: "#FF0000", $type: "color" }]]);

    const result = processTokens(tokens, { linter });
    const { resolver } = result;

    // Initial resolution should have no lint issues
    expect(capturedIssues.length).toBe(0);

    // Clear captured issues
    capturedIssues.length = 0;

    // Create a new token with a flagged value
    resolver.createToken({
      tokenPath: "color.tertiary",
      tokenData: { $value: "FLAG_THIS", $type: "color" },
    });

    // Linter should have been called during createToken
    expect(capturedIssues.length).toBe(1);
    expect(capturedIssues[0].tokenName).toBe("color.tertiary");
  });

  it("should preserve linter across multiple CRUD operations", () => {
    const { linter, capturedIssues } = createTestLinter();

    const tokens = new Map<string, TokenData>([["base", { $value: "10", $type: "dimension" }]]);

    const result = processTokens(tokens, { linter });
    const { resolver } = result;

    // Clear initial issues
    capturedIssues.length = 0;

    // First operation: create
    resolver.createToken({
      tokenPath: "token1",
      tokenData: { $value: "FLAG_THIS", $type: "dimension" },
    });
    expect(capturedIssues.length).toBe(1);
    expect(capturedIssues[0].tokenName).toBe("token1");

    // Second operation: update base (this will re-lint all tokens including token1)
    capturedIssues.length = 0;
    resolver.updateToken({
      tokenPath: "base",
      tokenData: { $value: "FLAG_THIS", $type: "dimension" },
    });
    // Should have linted both base and token1 (which still has FLAG_THIS)
    expect(capturedIssues.length).toBeGreaterThanOrEqual(1);
    const tokenNames = capturedIssues.map((issue) => issue.tokenName);
    expect(tokenNames).toContain("base");

    // Third operation: create another
    capturedIssues.length = 0;
    resolver.createToken({
      tokenPath: "token2",
      tokenData: { $value: "FLAG_THIS", $type: "dimension" },
    });
    expect(capturedIssues.length).toBeGreaterThanOrEqual(1);
    expect(capturedIssues.map((i) => i.tokenName)).toContain("token2");
  });

  it("should preserve linter when updating tokens with dependencies", () => {
    const { linter, capturedIssues } = createTestLinter();

    const tokens = new Map<string, TokenData>([
      ["base", { $value: "10", $type: "dimension" }],
      ["derived", { $value: "{base}", $type: "dimension" }],
    ]);

    const result = processTokens(tokens, { linter });
    const { resolver } = result;

    // Clear initial issues
    capturedIssues.length = 0;

    // Update base token to flagged value
    resolver.updateToken({
      tokenPath: "base",
      tokenData: { $value: "FLAG_THIS", $type: "dimension" },
    });

    // Linter should be called for base and derived (since derived depends on base)
    const tokenNames = capturedIssues.map((issue) => issue.tokenName);
    expect(tokenNames).toContain("base");
  });

  it("should work without linter (undefined linter)", () => {
    const tokens = new Map<string, TokenData>([["color.primary", { $value: "#FF0000", $type: "color" }]]);

    // No linter passed
    const result = processTokens(tokens);
    const { resolver } = result;

    // Should not have lint results
    expect(result.lint).toBeUndefined();

    // CRUD operations should work without linter
    expect(() => {
      resolver.updateToken({
        tokenPath: "color.primary",
        tokenData: { $value: "#0000FF", $type: "color" },
      });
    }).not.toThrow();

    expect(() => {
      resolver.createToken({
        tokenPath: "color.secondary",
        tokenData: { $value: "#00FF00", $type: "color" },
      });
    }).not.toThrow();
  });
});
