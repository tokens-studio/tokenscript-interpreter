import {
  fetchTokenScriptSchema as originalFetchTokenScriptSchema,
  type SchemaFetcherOptions,
  type TokenScriptSchemaResponse,
} from "@src/utils/schema-fetcher";

/**
 * Local wrapper for schema fetching that handles CORS issues in development
 * by using Vite's proxy when running on localhost
 */
export async function fetchTokenScriptSchema(
  schemaUri: string,
  options: SchemaFetcherOptions = {},
): Promise<TokenScriptSchemaResponse> {
  // Check if we're running in development on localhost
  const isDevelopment = import.meta.env.DEV;
  const isLocalhost =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  if (isDevelopment && isLocalhost) {
    // Transform external URLs to use our Vite proxy
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
      // For other external URLs, we'll still try the proxy but with a generic path
      // You can extend this logic for other domains as needed
      console.warn("Schema URL might have CORS issues:", schemaUri);
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

  // In production or non-localhost environments, use the original URL
  return originalFetchTokenScriptSchema(schemaUri, options);
}

// Re-export types for convenience
export type { SchemaFetcherOptions, TokenScriptSchemaResponse } from "@src/utils/schema-fetcher";
