import {
  type ColorSpecification,
  ColorSpecificationSchema,
  type FunctionSpecification,
  FunctionSpecificationSchema,
} from "@tokens-studio/tokenscript-interpreter";
import { type } from "arktype";
import { useCallback, useState } from "react";
import type { ValidationError } from "../components/MonacoEditor";

export function useSchemaValidation() {
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const findJsonPathPosition = useCallback(
    (jsonString: string, path: (string | number)[]): { line: number; column: number } | null => {
      if (path.length === 0) return { line: 1, column: 1 };

      const lines = jsonString.split("\n");

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const lineNumber = lineIndex + 1;

        for (const pathPart of path) {
          const keyPattern =
            typeof pathPart === "string"
              ? new RegExp(`"${pathPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:`, "g")
              : null;

          if (keyPattern && typeof pathPart === "string") {
            let match: RegExpExecArray | null;
            while (true) {
              match = keyPattern.exec(line);
              if (match === null) break;
              const beforeMatch = jsonString.substring(
                0,
                jsonString.split("\n").slice(0, lineIndex).join("\n").length +
                  (lineIndex > 0 ? 1 : 0) +
                  match.index,
              );

              const openBraces = (beforeMatch.match(/{/g) || []).length;
              const closeBraces = (beforeMatch.match(/}/g) || []).length;
              const netBraces = openBraces - closeBraces;

              if (netBraces >= path.length - 1) {
                return { line: lineNumber, column: match.index + 1 };
              }
            }
          }
        }
      }

      return { line: 1, column: 1 };
    },
    [],
  );

  const validateSchema = useCallback(
    (jsonString: string): ColorSpecification | FunctionSpecification | null => {
      setValidationErrors([]);

      if (!jsonString.trim()) {
        const errorMsg = "Schema cannot be empty";
        setValidationErrors([{ message: errorMsg, line: 1, column: 1 }]);
        return null;
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(jsonString);
      } catch (err) {
        const errorMsg = `Invalid JSON: ${err instanceof Error ? err.message : "Unknown error"}`;
        const lineMatch = err instanceof Error ? err.message.match(/line (\d+)/i) : null;
        const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;
        setValidationErrors([{ message: errorMsg, line, column: 1 }]);
        return null;
      }

      const schemaType = (parsedJson as any)?.type;

      let result: any;
      switch (schemaType) {
        case "color":
          result = ColorSpecificationSchema(parsedJson);
          break;
        case "function":
          result = FunctionSpecificationSchema(parsedJson);
          break;
      }

      if (result instanceof type.errors) {
        const errors: ValidationError[] = [];
        for (const issue of result.issues) {
          const position = findJsonPathPosition(jsonString, issue.path || []);
          const pathStr = issue.path && issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";

          errors.push({
            message: `${pathStr}${issue.message}`,
            path: issue.path?.join(".") || "",
            line: position?.line || 1,
            column: position?.column || 1,
          });
        }

        setValidationErrors(errors);
        return null;
      }

      return result;
    },
    [findJsonPathPosition],
  );

  return {
    validationErrors,
    validateSchema,
    setValidationErrors,
  };
}
