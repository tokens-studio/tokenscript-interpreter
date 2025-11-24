import type { ASTNode } from "@interpreter/ast";
import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "@interpreter/interpreter";
import type { TokenData } from "@src/processor/utils/tokens";
import {
  type LintConfig,
  type LintContext,
  type LintIssue,
  type LintResult,
  type LintRule,
  LintSeverity,
} from "./types";

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
    tokenName: string;
    tokenType: string | undefined;
    result: InterpreterResult;
    allTokens: Map<string, TokenData>;
    resolvedTokens?: Map<string, InterpreterResult>;
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

  aggregateResults(issues: LintIssue[]): LintResult {
    const errors: LintIssue[] = [];
    const warnings: LintIssue[] = [];

    for (const issue of issues) {
      if (issue.severity === LintSeverity.ERROR) {
        errors.push(issue);
      } else if (issue.severity === LintSeverity.WARNING) {
        warnings.push(issue);
      }
    }

    return {
      issues,
      errors,
      warnings,
      hasErrors: errors.length > 0,
    };
  }
}
