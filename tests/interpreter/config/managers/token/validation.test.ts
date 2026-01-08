import { TokenManager } from "@interpreter/config/managers/token/manager";
import { ListSymbol, NumberSymbol, NumberWithUnitSymbol, StringSymbol } from "@interpreter/symbols";
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

describe("Token Validation with TokenScript", () => {
  describe("TokenManager validation registration", () => {
    let manager: TokenManager;

    beforeEach(() => {
      manager = new TokenManager();
    });

    it("should register and retrieve validation script", () => {
      const script = "true";
      manager.registerValidation("border-radius", script);
      expect(manager.getValidation("border-radius")).toBe(script);
    });

    it("should be case-insensitive", () => {
      const script = "true";
      manager.registerValidation("Border-Radius", script);
      expect(manager.getValidation("border-radius")).toBe(script);
      expect(manager.getValidation("BORDER-RADIUS")).toBe(script);
    });

    it("should return valid for script that returns true", () => {
      manager.registerValidation("test-type", "true");
      const results = manager.validate("test-type", new NumberSymbol(10));
      expect(results[0].valid).toBe(true);
      expect(results[0].error).toBeUndefined();
    });

    it("should return error for script that returns string", () => {
      manager.registerValidation("test-type", '"INVALID_VALUE"');
      const results = manager.validate("test-type", new NumberSymbol(10));
      expect(results[0].valid).toBe(false);
      expect(results[0].error).toBe("INVALID_VALUE");
    });

    it("should return valid for unregistered token type", () => {
      const results = manager.validate("unknown-type", new NumberSymbol(10));
      expect(results[0].valid).toBe(true);
    });

    it("should clone with validation scripts", () => {
      manager.registerValidation("test-type", "true");
      const clone = manager.clone();
      expect(clone.getValidation("test-type")).toBe("true");
    });

    it("should invalidate cached AST when re-registering validation", () => {
      // Register initial validation that returns true
      manager.registerValidation("test-type", "true");
      const results1 = manager.validate("test-type", new NumberSymbol(10));
      expect(results1[0].valid).toBe(true);

      // Re-register with validation that returns error
      manager.registerValidation("test-type", '"NEW_ERROR"');
      const results2 = manager.validate("test-type", new NumberSymbol(10));
      expect(results2[0].valid).toBe(false);
      expect(results2[0].error).toBe("NEW_ERROR");
    });

    it("should auto-register validation when registering spec with validation field", () => {
      manager.register("css/border-radius", borderRadiusSchema as any);
      expect(manager.getValidation("borderRadius")).toBeDefined();
    });
  });

  describe("border-radius validation from schema", () => {
    let manager: TokenManager;

    beforeEach(() => {
      manager = new TokenManager();
      // Register the schema which auto-registers the validation
      manager.register("css/border-radius", borderRadiusSchema as any);
    });

    describe("single value - valid cases", () => {
      it("should accept 0 (unitless zero)", () => {
        const results = manager.validate("borderRadius", new NumberSymbol(0));
        expect(results[0].valid).toBe(true);
      });

      it("should accept px units", () => {
        const results = manager.validate("borderRadius", new NumberWithUnitSymbol(10, "px"));
        expect(results[0].valid).toBe(true);
      });

      it("should accept em units", () => {
        const results = manager.validate("borderRadius", new NumberWithUnitSymbol(1.5, "em"));
        expect(results[0].valid).toBe(true);
      });

      it("should accept rem units", () => {
        const results = manager.validate("borderRadius", new NumberWithUnitSymbol(2, "rem"));
        expect(results[0].valid).toBe(true);
      });

      it("should accept percentage", () => {
        const results = manager.validate("borderRadius", new NumberWithUnitSymbol(50, "%"));
        expect(results[0].valid).toBe(true);
      });
    });

    describe("multi-value - valid cases", () => {
      it("should accept list with 2 values", () => {
        const list = new ListSymbol([new NumberWithUnitSymbol(10, "px"), new NumberWithUnitSymbol(20, "px")]);
        const results = manager.validate("borderRadius", list);
        expect(results[0].valid).toBe(true);
      });

      it("should accept list with 3 values", () => {
        const list = new ListSymbol([new NumberWithUnitSymbol(10, "px"), new NumberWithUnitSymbol(20, "px"), new NumberWithUnitSymbol(30, "px")]);
        const results = manager.validate("borderRadius", list);
        expect(results[0].valid).toBe(true);
      });

      it("should accept list with 4 values", () => {
        const list = new ListSymbol([
          new NumberWithUnitSymbol(10, "px"),
          new NumberWithUnitSymbol(20, "px"),
          new NumberWithUnitSymbol(30, "px"),
          new NumberWithUnitSymbol(40, "px"),
        ]);
        const results = manager.validate("borderRadius", list);
        expect(results[0].valid).toBe(true);
      });

      it("should accept list with mixed valid units", () => {
        const list = new ListSymbol([new NumberWithUnitSymbol(10, "px"), new NumberWithUnitSymbol(2, "em"), new NumberWithUnitSymbol(50, "%")]);
        const results = manager.validate("borderRadius", list);
        expect(results[0].valid).toBe(true);
      });

      it("should accept list with single unitless zero", () => {
        const list = new ListSymbol([new NumberSymbol(0)]);
        const results = manager.validate("borderRadius", list);
        expect(results[0].valid).toBe(true);
      });

      it("should reject list with more than 4 values", () => {
        const list = new ListSymbol([
          new NumberWithUnitSymbol(10, "px"),
          new NumberWithUnitSymbol(20, "px"),
          new NumberWithUnitSymbol(30, "px"),
          new NumberWithUnitSymbol(40, "px"),
          new NumberWithUnitSymbol(50, "px"),
        ]);
        const results = manager.validate("borderRadius", list);
        expect(results[0].valid).toBe(false);
        expect(results[0].error).toBe("INVALID_BORDER_RADIUS_TOO_MANY_VALUES");
      });
    });

    describe("invalid cases - type errors", () => {
      it("should reject non-zero unitless numbers", () => {
        const results = manager.validate("borderRadius", new NumberSymbol(10));
        expect(results[0].valid).toBe(false);
        expect(results[0].error).toBe("INVALID_BORDER_RADIUS_REQUIRES_UNIT");
      });

      it("should reject strings", () => {
        const results = manager.validate("borderRadius", new StringSymbol("10px"));
        expect(results[0].valid).toBe(false);
        expect(results[0].error).toBe("INVALID_BORDER_RADIUS_TYPE");
      });

      it("should reject invalid item in list", () => {
        const list = new ListSymbol([new NumberWithUnitSymbol(10, "px"), new StringSymbol("invalid")]);
        const results = manager.validate("borderRadius", list);
        expect(results[0].valid).toBe(false);
        expect(results[0].error).toBe("INVALID_BORDER_RADIUS_TYPE");
      });

      it("should reject list with non-zero unitless number", () => {
        const list = new ListSymbol([new NumberWithUnitSymbol(10, "px"), new NumberSymbol(5)]);
        const results = manager.validate("borderRadius", list);
        expect(results[0].valid).toBe(false);
        expect(results[0].error).toBe("INVALID_BORDER_RADIUS_REQUIRES_UNIT");
      });
    });

    describe("invalid cases - negative values", () => {
      it("should reject negative px value", () => {
        const results = manager.validate("borderRadius", new NumberWithUnitSymbol(-10, "px"));
        expect(results[0].valid).toBe(false);
        expect(results[0].error).toBe("INVALID_BORDER_RADIUS_NEGATIVE");
      });

      it("should reject negative number value", () => {
        const results = manager.validate("borderRadius", new NumberSymbol(-5));
        expect(results[0].valid).toBe(false);
        expect(results[0].error).toBe("INVALID_BORDER_RADIUS_NEGATIVE");
      });

      it("should reject list with negative value", () => {
        const list = new ListSymbol([new NumberWithUnitSymbol(10, "px"), new NumberWithUnitSymbol(-5, "px")]);
        const results = manager.validate("borderRadius", list);
        expect(results[0].valid).toBe(false);
        expect(results[0].error).toBe("INVALID_BORDER_RADIUS_NEGATIVE");
      });

      it("should reject list with negative unitless number", () => {
        const list = new ListSymbol([new NumberSymbol(-1)]);
        const results = manager.validate("borderRadius", list);
        expect(results[0].valid).toBe(false);
        expect(results[0].error).toBe("INVALID_BORDER_RADIUS_NEGATIVE");
      });
    });
  });

  describe("validationErrorTypes", () => {
    let manager: TokenManager;

    beforeEach(() => {
      manager = new TokenManager();
    });

    it("should extract error codes from validation script", () => {
      manager.registerValidation(
        "test-type",
        `
        if (type({input}) != "number") [
          return "INVALID_TYPE";
        ];
        if ({input} < 0) [
          return "NEGATIVE_VALUE";
        ];
        return true;
      `,
      );

      const errors = manager.validationErrorTypes("test-type");
      expect(errors).toContain("INVALID_TYPE");
      expect(errors).toContain("NEGATIVE_VALUE");
      expect(errors).toHaveLength(2);
    });

    it("should return empty array for unregistered type", () => {
      const errors = manager.validationErrorTypes("unknown-type");
      expect(errors).toEqual([]);
    });

    it("should return all error types when no type specified", () => {
      manager.registerValidation("type-a", 'return "ERROR_A";');
      manager.registerValidation("type-b", 'return "ERROR_B";');

      const errors = manager.validationErrorTypes();
      expect(errors).toContain("ERROR_A");
      expect(errors).toContain("ERROR_B");
    });

    it("should deduplicate error codes when getting all types", () => {
      manager.registerValidation("type-a", 'return "SHARED_ERROR";');
      manager.registerValidation("type-b", 'return "SHARED_ERROR";');

      const errors = manager.validationErrorTypes();
      expect(errors.filter((e) => e === "SHARED_ERROR")).toHaveLength(1);
    });

    it("should extract errors from border-radius schema", () => {
      manager.register("css/border-radius", borderRadiusSchema as any);

      const errors = manager.validationErrorTypes("borderRadius");
      expect(errors).toContain("INVALID_BORDER_RADIUS_NEGATIVE");
      expect(errors).toContain("INVALID_BORDER_RADIUS_TYPE");
      expect(errors).toContain("INVALID_BORDER_RADIUS_REQUIRES_UNIT");
      expect(errors).toContain("INVALID_BORDER_RADIUS_TOO_MANY_VALUES");
    });

    it("should use cached AST", () => {
      manager.registerValidation("test-type", 'return "ERROR";');

      // First call parses and caches
      const errors1 = manager.validationErrorTypes("test-type");
      // Second call uses cache
      const errors2 = manager.validationErrorTypes("test-type");

      expect(errors1).toEqual(errors2);
    });
  });
});
