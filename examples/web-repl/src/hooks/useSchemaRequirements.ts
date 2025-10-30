import type {
  ColorSpecification,
  FunctionSpecification,
} from "@tokens-studio/tokenscript-interpreter";
import { useCallback, useState } from "react";
import { fetchTokenScriptSchema } from "../utils/schema-fetcher";

type RequirementsState = {
  colors: Map<string, ColorSpecification>;
  functions: Map<string, FunctionSpecification>;
};

export function useSchemaRequirements() {
  const [requirements, setRequirements] = useState<RequirementsState>({
    colors: new Map(),
    functions: new Map(),
  });
  const [loading, setLoading] = useState(false);

  const loadRequirements = useCallback(async (requirementUrls: string[] | undefined) => {
    if (!requirementUrls || requirementUrls.length === 0) {
      setRequirements({ colors: new Map(), functions: new Map() });
      return;
    }

    setLoading(true);
    const colorSchemas = new Map<string, ColorSpecification>();
    const functionSchemas = new Map<string, FunctionSpecification>();

    try {
      const results = await Promise.all(
        requirementUrls.map(async (reqUrl) => {
          try {
            const response = await fetchTokenScriptSchema(reqUrl);
            return { url: reqUrl, spec: response.content };
          } catch (err) {
            console.error(`Failed to load requirement ${reqUrl}:`, err);
            return null;
          }
        }),
      );

      for (const result of results) {
        if (!result) continue;
        if (result.spec.type === "function") {
          functionSchemas.set(result.url, result.spec as FunctionSpecification);
        } else {
          colorSchemas.set(result.url, result.spec as ColorSpecification);
        }
      }

      setRequirements({ colors: colorSchemas, functions: functionSchemas });
    } catch (err) {
      console.error("Failed to load requirements:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    requirements,
    loading,
    loadRequirements,
  };
}
