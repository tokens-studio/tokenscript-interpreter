import {
  fetchTokenScriptSchema as originalFetchTokenScriptSchema,
  type SchemaFetcherOptions,
  type TokenScriptSchemaResponse,
} from "@src/utils/schema-fetcher";

/**
 * Local wrapper for schema fetching that handles CORS issues in development
 * and production deployment by using appropriate proxies
 */
export async function fetchTokenScriptSchema(
  schemaUri: string,
  options: SchemaFetcherOptions = {},
): Promise<TokenScriptSchemaResponse> {
  const isDevelopment = import.meta.env.DEV;
  const isLocalhost =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  // Use proxy in development (Vite proxy) or production (nginx proxy)
  // Only skip proxy for file:// URLs or when explicitly configured to use direct URLs
  const shouldUseProxy = isDevelopment || !schemaUri.startsWith("file://");

  if (shouldUseProxy) {
    // Transform external URLs to use our proxy
    let proxiedUrl = schemaUri;

    // Handle common schema URLs that need proxying
    if (schemaUri.startsWith("https://schema.tokenscript.dev.gcp.tokens.studio/")) {
      proxiedUrl = schemaUri.replace(
        "https://schema.tokenscript.dev.gcp.tokens.studio/",
        "/api/schema/",
      );
    } else if (schemaUri.startsWith("https://schemas.tokens.studio/")) {
      proxiedUrl = schemaUri.replace("https://schemas.tokens.studio/", "/api/schema/");
    } else if (schemaUri.startsWith("http://") || schemaUri.startsWith("https://")) {
      // For other external URLs that might have CORS issues, warn but still try direct
      if (isDevelopment && isLocalhost) {
        console.warn("Schema URL might have CORS issues:", schemaUri);
      }
      // In production, we assume the nginx proxy will handle CORS for external URLs
      // but we don't rewrite them unless they match our known patterns
    }

    // Use the proxied URL for the fetch
    return originalFetchTokenScriptSchema(proxiedUrl, {
      ...options,
      headers: {
        ...options.headers,
        // Remove CORS-sensitive headers when using proxy
      },
    });
  }

  // Direct URL (for file:// or when proxy is disabled)
  return originalFetchTokenScriptSchema(schemaUri, options);
}

// Re-export types for convenience
export type { SchemaFetcherOptions, TokenScriptSchemaResponse } from "@src/utils/schema-fetcher";
