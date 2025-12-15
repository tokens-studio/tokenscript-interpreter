import type { ASTNode } from "@interpreter/ast";
import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "@interpreter/interpreter";
import type { RefPath, ResolvedValueMap, TokenDataMap } from "@src/processor/resolver/types";
import type { LintConfig, LintContext, LintIssue, LintRule, LintSeverity } from "./types";

export class LintRunner {
  private rules: LintRule[] = [];
  private config: LintConfig;

  constructor(config: LintConfig = {}) {
    this.config = config;
  }

  addRule(rule: LintRule): this {
    this.rules.push(rule);
    return this;
  }

  lintResult(options: {
    tokenName: RefPath;
    tokenType: string | undefined;
    result: InterpreterResult;
    allTokens: TokenDataMap;
    resolvedTokens?: ResolvedValueMap;
    config?: Config;
    ast?: ASTNode;
  }): LintIssue[] {
    const { tokenName, tokenType, result, allTokens, resolvedTokens, config, ast } = options;

    const context: LintContext = {
      tokenName,
      tokenType,
      config,
      allTokens,
      resolvedTokens,
      ast,
    };
    const issues: LintIssue[] = [];

    for (const rule of this.rules) {
      if (!this.isRuleEnabled(rule.id)) continue;

      if (rule.tokenTypes && (!tokenType || !rule.tokenTypes.includes(tokenType))) {
        continue;
      }

      const ruleIssues = rule.validate(result, context);
      issues.push(...this.applyOverrides(rule.id, ruleIssues));
    }

    return issues;
  }

  private isRuleEnabled(ruleId: string): boolean {
    const setting = this.config.rules?.[ruleId];
    return setting !== false;
  }

  private applyOverrides(ruleId: string, issues: LintIssue[]): LintIssue[] {
    const override = this.config.rules?.[ruleId];
    if (typeof override === "string") {
      return issues.map((issue) => ({ ...issue, severity: override as LintSeverity }));
    }
    return issues;
  }
}
