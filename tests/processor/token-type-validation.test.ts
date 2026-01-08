import { Config } from "@interpreter/config";
import { processTokens } from "@src/processor/process";
import type { TokenData } from "@src/processor/utils/tokens";
import { beforeEach, describe, expect, it } from "vitest";

// Inline schema for testing - actual schemas are proprietary
const borderRadiusSchema = {
  name: "borderRadius",
  type: "token",
  description: "Represents a border radius value. Supports px, rem, em, %.",
  validation: {
    type: "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/core/tokenscript/0/",
    script: `// Validation for border-radius values.
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

describe("Token Type Validation in Processor", () => {
  let config: Config;

  beforeEach(() => {
    config = new Config();
    // Register the border-radius token spec (which includes validation)
    config.tokenManager.register("css/border-radius", borderRadiusSchema as any);
  });

  describe("valid border-radius tokens", () => {
    it("should pass validation for 0 (unitless zero)", () => {
      const tokens = new Map<string, TokenData>([["radius.none", { $value: "0", $type: "borderRadius" }]]);

      const result = processTokens(tokens, { config });

      expect(result.issues?.get("radius.none")).toBeUndefined();
    });

    it("should pass validation for px values", () => {
      const tokens = new Map<string, TokenData>([["radius.small", { $value: "4px", $type: "borderRadius" }]]);

      const result = processTokens(tokens, { config });

      expect(result.issues?.get("radius.small")).toBeUndefined();
    });

    it("should pass validation for em values", () => {
      const tokens = new Map<string, TokenData>([["radius.medium", { $value: "0.5em", $type: "borderRadius" }]]);

      const result = processTokens(tokens, { config });

      expect(result.issues?.get("radius.medium")).toBeUndefined();
    });

    it("should pass validation for percentage values", () => {
      const tokens = new Map<string, TokenData>([["radius.round", { $value: "50%", $type: "borderRadius" }]]);

      const result = processTokens(tokens, { config });

      expect(result.issues?.get("radius.round")).toBeUndefined();
    });
  });

  describe("invalid border-radius tokens", () => {
    it("should fail validation for non-zero unitless numbers", () => {
      const tokens = new Map<string, TokenData>([["radius.invalid", { $value: "10", $type: "borderRadius" }]]);

      const result = processTokens(tokens, { config });

      const issues = result.issues?.get("radius.invalid");
      expect(issues).toBeDefined();
      expect(issues?.length).toBeGreaterThan(0);
      expect(issues?.[0].code).toBe("INVALID_BORDER_RADIUS_REQUIRES_UNIT");
    });

    it("should fail validation for string values", () => {
      const tokens = new Map<string, TokenData>([["radius.invalid", { $value: '"not-a-number"', $type: "borderRadius" }]]);

      const result = processTokens(tokens, { config });

      const issues = result.issues?.get("radius.invalid");
      expect(issues).toBeDefined();
      expect(issues?.length).toBeGreaterThan(0);
      expect(issues?.[0].code).toBe("INVALID_BORDER_RADIUS_TYPE");
    });
  });

  describe("tokens without validation", () => {
    it("should not produce validation errors for types without registered validation", () => {
      const tokens = new Map<string, TokenData>([["color.primary", { $value: "#ff0000", $type: "color" }]]);

      const result = processTokens(tokens, { config });

      expect(result.issues?.get("color.primary")).toBeUndefined();
    });
  });

  describe("mixed tokens", () => {
    it("should validate only tokens with registered type validation", () => {
      const tokens = new Map<string, TokenData>([
        ["radius.valid", { $value: "8px", $type: "borderRadius" }],
        ["radius.invalid", { $value: "10", $type: "borderRadius" }],
        ["color.primary", { $value: "#ff0000", $type: "color" }],
      ]);

      const result = processTokens(tokens, { config });

      // Valid radius should have no issues
      expect(result.issues?.get("radius.valid")).toBeUndefined();

      // Invalid radius should have validation error
      const invalidIssues = result.issues?.get("radius.invalid");
      expect(invalidIssues).toBeDefined();
      expect(invalidIssues?.[0].code).toBe("INVALID_BORDER_RADIUS_REQUIRES_UNIT");

      // Color should have no issues (no validation registered)
      expect(result.issues?.get("color.primary")).toBeUndefined();
    });
  });
});
