import type { ASTNode } from "@interpreter/ast";
import type { Config } from "@interpreter/config";
import type { InterpreterResult } from "@interpreter/interpreter";
import type { RefPath, ResolvedValueMap, TokenDataMap } from "@src/processor/resolver/types";
import type { TokenTypeValidator, TokenTypeValidatorMap } from "./rules/TypeBasedRule";
import { TypeBasedRule } from "./rules/TypeBasedRule";
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

  /**
   * Creates a new LintRunner that extends this one with additional/overridden validators.
   *
   * Merges TypeBasedRule validators from the current runner with the provided overrides.
   * Override validators replace existing ones for the same token type.
   * Non-TypeBasedRule rules are preserved in their original order relative to TypeBasedRules.
   *
   * @param overrides - Map of token types to validators to add or override
   * @returns A new LintRunner with merged validators
   *
   * @example
   * const cssRules = css.createLintRunner();
   * const penpotRules = cssRules.extend({
   *   "border-radius": all(css.borderRadius, customValidator),
   *   "stroke-width": penpot.strokeWidthValidator,
   * });
   */
  extend(overrides: TokenTypeValidatorMap): LintRunner {
    const newRunner = new LintRunner({ ...this.config });

    // Collect all validators from existing TypeBasedRules
    const mergedValidators = new Map<string, TokenTypeValidator>();
    let defaultValidator: TokenTypeValidator | undefined;
    let typeBasedRuleIndex = -1;

    // First pass: collect TypeBasedRule validators and find their position
    for (let i = 0; i < this.rules.length; i++) {
      const rule = this.rules[i];
      if (rule instanceof TypeBasedRule) {
        if (typeBasedRuleIndex === -1) {
          typeBasedRuleIndex = i;
        }
        for (const [type, validator] of rule.getValidators()) {
          mergedValidators.set(type, validator);
        }
        defaultValidator = rule.getDefaultValidator() ?? defaultValidator;
      }
    }

    // Apply overrides
    for (const [type, validator] of Object.entries(overrides)) {
      mergedValidators.set(type, validator);
    }

    // Create merged TypeBasedRule if there are validators
    const mergedTypeBasedRule =
      mergedValidators.size > 0 || defaultValidator
        ? (() => {
            const rule = new TypeBasedRule(Object.fromEntries(mergedValidators));
            if (defaultValidator) {
              rule.forDefault(defaultValidator);
            }
            return rule;
          })()
        : null;

    // Second pass: add rules preserving order
    let typeBasedRuleAdded = false;
    for (let i = 0; i < this.rules.length; i++) {
      const rule = this.rules[i];
      if (rule instanceof TypeBasedRule) {
        // Add merged TypeBasedRule at the position of the first TypeBasedRule
        if (!typeBasedRuleAdded && mergedTypeBasedRule) {
          newRunner.addRule(mergedTypeBasedRule);
          typeBasedRuleAdded = true;
        }
        // Skip original TypeBasedRules (they've been merged)
      } else {
        newRunner.addRule(rule);
      }
    }

    // If no TypeBasedRule existed, add the merged one at the end
    if (!typeBasedRuleAdded && mergedTypeBasedRule) {
      newRunner.addRule(mergedTypeBasedRule);
    }

    return newRunner;
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
