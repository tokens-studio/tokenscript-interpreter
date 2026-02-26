import { Config } from "@interpreter/config";
import { TokenResolver } from "@src/processor/resolver/TokenResolver";
import type { TokenData } from "@src/processor/utils/tokens";
import { ValidationSeverity } from "@src/processor/validator";
import { beforeEach, describe, expect, it } from "vitest";

describe("TokenResolver.resolveValue", () => {
  const baseTokens = new Map<string, TokenData>([
    ["color.primary", { $value: "#FF0000", $type: "color" }],
    ["color.secondary", { $value: "#00FF00", $type: "color" }],
    ["spacing.base", { $value: "8", $type: "dimension" }],
    ["spacing.large", { $value: "{spacing.base} * 2", $type: "dimension" }],
    ["text", { $value: "hello" }],
  ]);

  it("should resolve a literal number expression", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: "16 * 2" });

    expect(result.resolved?.toString()).toBe("32");
    expect(result.issues).toHaveLength(0);
  });

  it("should resolve a reference to an existing token", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: "{spacing.base}" });

    expect(result.resolved?.toString()).toBe("8");
    expect(result.issues).toHaveLength(0);
  });

  it("should resolve a reference expression with arithmetic", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: "{spacing.base} * 3 + 1" });

    expect(result.resolved?.toString()).toBe("25");
    expect(result.issues).toHaveLength(0);
  });

  it("should resolve a color literal", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: "#0000FF" });

    expect(result.resolved?.toString()).toBe("#0000FF");
    expect(result.issues).toHaveLength(0);
  });

  it("should resolve a reference to a color token", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: "{color.primary}" });

    expect(result.resolved?.toString()).toBe("#FF0000");
    expect(result.issues).toHaveLength(0);
  });

  it("should resolve a transitive reference", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    // spacing.large = {spacing.base} * 2 = 16
    const result = resolver.resolveValue({ value: "{spacing.large}" });

    expect(result.resolved?.toString()).toBe("16");
    expect(result.issues).toHaveLength(0);
  });

  it("should return null with no issues for empty string", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: "" });

    expect(result.resolved).toBeNull();
    expect(result.issues).toHaveLength(0);
  });

  it("should return null with no issues for null", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: null });

    expect(result.resolved).toBeNull();
    expect(result.issues).toHaveLength(0);
  });

  it("should return null with no issues for undefined", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: undefined });

    expect(result.resolved).toBeNull();
    expect(result.issues).toHaveLength(0);
  });

  it("should return issue for missing reference", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: "{nonexistent}" });

    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("should return issue for syntax errors", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: "1 + + +" });

    expect(result.resolved).toBeNull();
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("should coerce non-string values to string", () => {
    const { resolver } = new TokenResolver().build(baseTokens);
    const result = resolver.resolveValue({ value: 42 });

    expect(result.resolved?.toString()).toBe("42");
    expect(result.issues).toHaveLength(0);
  });

  it("should throw when called before build()", () => {
    const resolver = new TokenResolver();

    expect(() => {
      resolver.resolveValue({ value: "10" });
    }).toThrow("PROC_RESOLVER_NOT_INITIALIZED");
  });

  it("should not mutate resolver state", () => {
    const { resolver } = new TokenResolver().build(baseTokens);

    // Resolve a preview value
    resolver.resolveValue({ value: "999" });

    // Existing token should still resolve correctly
    const result = resolver.updateToken({
      tokenPath: "spacing.base",
      tokenData: { $value: "8", $type: "dimension" },
    });
    expect(result.resolved?.toString()).toBe("8");
  });

  it("should reflect state after updateToken", () => {
    const { resolver } = new TokenResolver().build(baseTokens);

    // Update spacing.base from 8 to 20
    resolver.updateToken({
      tokenPath: "spacing.base",
      tokenData: { $value: "20", $type: "dimension" },
    });

    // resolveValue should now see the updated cache
    const result = resolver.resolveValue({ value: "{spacing.base}" });
    expect(result.resolved?.toString()).toBe("20");
  });

  it("should reflect state after createToken", () => {
    const { resolver } = new TokenResolver().build(baseTokens);

    resolver.createToken({
      tokenPath: "spacing.small",
      tokenData: { $value: "4", $type: "dimension" },
    });

    const result = resolver.resolveValue({ value: "{spacing.small}" });
    expect(result.resolved?.toString()).toBe("4");
  });

  it("should reflect state after deleteToken", () => {
    const { resolver } = new TokenResolver().build(baseTokens);

    resolver.deleteToken({ tokenPath: "spacing.base" });

    // Reference to deleted token should produce an issue
    const result = resolver.resolveValue({ value: "{spacing.base}" });
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

// Inline schema for testing - actual schemas are proprietary
const borderRadiusSchema = {
  name: "borderRadius",
  type: "token",
  description: "Represents a border radius value. Supports px, rem, em, %.",
  validation: {
    type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
    script: `
variable test_values: List;

if (is_list({input})) [
  test_values = {input};
] else [
  test_values.append({input});
]

variable count: Number = test_values.length();

if (count > 4) [
  return "INVALID_BORDER_RADIUS_TOO_MANY_VALUES";
];

if (count == 0) [
  return "INVALID_BORDER_RADIUS_EMPTY";
];

variable i: Number = 0;
variable item_type: String;
while (i < count) [
  if (is_number(test_values.get(i))) [
    if (test_values.get(i) < 0) [
      return "INVALID_BORDER_RADIUS_NEGATIVE";
    ];
    if (test_values.get(i) != 0) [
      return "INVALID_BORDER_RADIUS_REQUIRES_UNIT";
    ];
  ] else [
    item_type = type(test_values.get(i));
    if (item_type == "px" || item_type == "em" || item_type == "rem" || item_type == "%" || item_type == "vw" || item_type == "vh" || item_type == "pt" || item_type == "cm" || item_type == "mm" || item_type == "in") [
      if (test_values.get(i).value < 0) [
        return "INVALID_BORDER_RADIUS_NEGATIVE";
      ];
    ] else [
      return "INVALID_BORDER_RADIUS_TYPE";
    ];
  ];
  i = i + 1;
];

return true;
`,
  },
};

describe("TokenResolver.resolveValue with validate", () => {
  let config: Config;

  beforeEach(() => {
    config = new Config();
    config.tokenManager.register("css/border-radius", borderRadiusSchema as any);
  });

  const baseTokens = new Map<string, TokenData>([
    ["color.primary", { $value: "#FF0000", $type: "color" }],
    ["radius.base", { $value: "4px", $type: "borderRadius" }],
  ]);

  it("should not validate when validate is not set", () => {
    const { resolver } = new TokenResolver().build(baseTokens, config);
    const result = resolver.resolveValue({ value: "10", type: "borderRadius" });

    expect(result.resolved?.toString()).toBe("10");
    expect(result.issues).toHaveLength(0);
  });

  it("should not validate when validate is false", () => {
    const { resolver } = new TokenResolver().build(baseTokens, config);
    const result = resolver.resolveValue({ value: "10", type: "borderRadius", validate: false });

    expect(result.resolved?.toString()).toBe("10");
    expect(result.issues).toHaveLength(0);
  });

  it("should validate when validate is true and produce issues for invalid values", () => {
    const { resolver } = new TokenResolver().build(baseTokens, config);
    const result = resolver.resolveValue({ value: "10", type: "borderRadius", validate: true });

    expect(result.resolved?.toString()).toBe("10");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toBe("INVALID_BORDER_RADIUS_REQUIRES_UNIT");
    expect("severity" in result.issues[0] && result.issues[0].severity).toBe(ValidationSeverity.WARNING);
  });

  it("should produce no validation issues for valid values", () => {
    const { resolver } = new TokenResolver().build(baseTokens, config);
    const result = resolver.resolveValue({ value: "4px", type: "borderRadius", validate: true });

    expect(result.resolved?.toString()).toBe("4px");
    expect(result.issues).toHaveLength(0);
  });

  it("should validate negative values", () => {
    const { resolver } = new TokenResolver().build(baseTokens, config);
    const result = resolver.resolveValue({ value: "-5px", type: "borderRadius", validate: true });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toBe("INVALID_BORDER_RADIUS_NEGATIVE");
  });

  it("should skip validation for types without a registered spec", () => {
    const { resolver } = new TokenResolver().build(baseTokens, config);
    const result = resolver.resolveValue({ value: "#FF0000", type: "color", validate: true });

    expect(result.resolved?.toString()).toBe("#FF0000");
    expect(result.issues).toHaveLength(0);
  });

  it("should skip validation when type is not provided", () => {
    const { resolver } = new TokenResolver().build(baseTokens, config);
    const result = resolver.resolveValue({ value: "10", validate: true });

    expect(result.resolved?.toString()).toBe("10");
    expect(result.issues).toHaveLength(0);
  });

  it("should still resolve correctly even when validation fails", () => {
    const { resolver } = new TokenResolver().build(baseTokens, config);
    const result = resolver.resolveValue({ value: "10", type: "borderRadius", validate: true });

    // Value resolves successfully
    expect(result.resolved?.toString()).toBe("10");
    // But validation issue is reported
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("should validate referenced token values", () => {
    const { resolver } = new TokenResolver().build(baseTokens, config);
    const result = resolver.resolveValue({ value: "{radius.base}", type: "borderRadius", validate: true });

    expect(result.resolved?.toString()).toBe("4px");
    expect(result.issues).toHaveLength(0);
  });
});
