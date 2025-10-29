import { useCallback, useState } from "react";
import { fetchTokenScriptSchema } from "../utils/schema-fetcher";

type FetchState =
  | { status: "idle" }
  | { status: "loading"; controller: AbortController }
  | { status: "success" }
  | { status: "error"; error: string };

export function useSchemaFetch() {
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });

  const fetchSchema = useCallback(async (url: string) => {
    if (!url || !url.trim()) {
      setFetchState({ status: "error", error: "Schema URL is required" });
      return null;
    }

    const controller = new AbortController();
    setFetchState({ status: "loading", controller });

    try {
      const resp = await fetchTokenScriptSchema(url.trim(), {
        signal: controller.signal,
      });
      setFetchState({ status: "success" });
      return resp.content;
    } catch (e) {
      if (controller.signal.aborted) {
        setFetchState({ status: "error", error: "Schema fetch aborted" });
      } else {
        setFetchState({
          status: "error",
          error: e instanceof Error ? e.message : String(e),
        });
      }
      return null;
    }
  }, []);

  const abortFetch = useCallback(() => {
    if (fetchState.status === "loading") {
      fetchState.controller.abort();
    }
  }, [fetchState]);

  const resetFetchState = useCallback(() => {
    setFetchState({ status: "idle" });
  }, []);

  return {
    fetchState,
    fetchSchema,
    abortFetch,
    resetFetchState,
  };
}
