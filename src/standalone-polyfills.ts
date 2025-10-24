// Polyfills for QuickJS compatibility

// Simple URL validation that doesn't rely on Node.js URL API
if (typeof URL === "undefined") {
  (globalThis as any).URL = class URL {
    href: string;
    protocol: string;
    hostname: string;
    pathname: string;
    search: string;
    hash: string;

    constructor(url: string) {
      this.href = url;
      // Simple parsing - just check if it looks like a URL
      const match = url.match(/^([a-z]+):\/\/([^\/]+)(\/[^?#]*)(\?[^#]*)?(#.*)?$/i);
      if (match) {
        this.protocol = match[1] + ":";
        this.hostname = match[2];
        this.pathname = match[3] || "/";
        this.search = match[4] || "";
        this.hash = match[5] || "";
      } else {
        // Not a valid URL format
        this.protocol = "";
        this.hostname = "";
        this.pathname = url;
        this.search = "";
        this.hash = "";
      }
    }

    toString(): string {
      return this.href;
    }
  };
}

// Ensure console.error exists for compatibility
if (typeof console !== "undefined" && !console.error) {
  console.error = console.log;
}
