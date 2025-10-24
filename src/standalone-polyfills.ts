// Polyfills for QuickJS compatibility

// Ensure Symbol.iterator exists
if (typeof Symbol === "undefined" || !Symbol.iterator) {
  if (typeof Symbol === "undefined") {
    (globalThis as any).Symbol = {
      iterator: "__iterator__",
      toStringTag: "__toStringTag__",
      hasInstance: "__hasInstance__",
      isConcatSpreadable: "__isConcatSpreadable__",
    };
  } else if (!Symbol.iterator) {
    (Symbol as any).iterator = "__iterator__";
  }
}

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

// Patch Set.prototype[Symbol.iterator] if it's missing
if (typeof Set !== "undefined" && Set.prototype) {
  const setProto = Set.prototype as any;
  
  // Ensure Set has Symbol.iterator
  if (!setProto[Symbol.iterator]) {
    setProto[Symbol.iterator] = function() {
      return this.values();
    };
  }
  
  // Ensure values() returns a proper iterator
  const originalValues = setProto.values;
  if (originalValues) {
    setProto.values = function() {
      const iterator = originalValues.call(this);
      // Make sure the iterator has Symbol.iterator
      if (!iterator[Symbol.iterator]) {
        iterator[Symbol.iterator] = function() { return this; };
      }
      return iterator;
    };
  }
}

// Ensure Set is available (QuickJS has Set, but in case it's not loaded)
if (typeof Set === "undefined") {
  (globalThis as any).Set = class Set<T = any> {
    private items: T[] = [];

    constructor(iterable?: Iterable<T>) {
      if (iterable) {
        for (const item of iterable) {
          this.add(item);
        }
      }
    }

    add(value: T): this {
      if (!this.has(value)) {
        this.items.push(value);
      }
      return this;
    }

    has(value: T): boolean {
      return this.items.indexOf(value) !== -1;
    }

    delete(value: T): boolean {
      const index = this.items.indexOf(value);
      if (index !== -1) {
        this.items.splice(index, 1);
        return true;
      }
      return false;
    }

    clear(): void {
      this.items = [];
    }

    get size(): number {
      return this.items.length;
    }

    forEach(callback: (value: T, key: T, set: this) => void, thisArg?: any): void {
      for (const item of this.items) {
        callback.call(thisArg, item, item, this);
      }
    }

    [Symbol.iterator](): Iterator<T> {
      let index = 0;
      const items = this.items;
      return {
        next(): IteratorResult<T> {
          if (index < items.length) {
            return { value: items[index++], done: false };
          }
          return { value: undefined as any, done: true };
        }
      };
    }

    values(): Iterator<T> {
      return this[Symbol.iterator]();
    }

    keys(): Iterator<T> {
      return this[Symbol.iterator]();
    }

    entries(): Iterator<[T, T]> {
      let index = 0;
      const items = this.items;
      return {
        next(): IteratorResult<[T, T]> {
          if (index < items.length) {
            const value = items[index++];
            return { value: [value, value], done: false };
          }
          return { value: undefined as any, done: true };
        }
      };
    }
  };
}

// Ensure WeakMap is available
if (typeof WeakMap === "undefined") {
  (globalThis as any).WeakMap = class WeakMap<K extends object = object, V = any> {
    private items: Array<{ key: K; value: V }> = [];

    constructor() {}

    set(key: K, value: V): this {
      const existing = this.items.find(item => item.key === key);
      if (existing) {
        existing.value = value;
      } else {
        this.items.push({ key, value });
      }
      return this;
    }

    get(key: K): V | undefined {
      const item = this.items.find(item => item.key === key);
      return item ? item.value : undefined;
    }

    has(key: K): boolean {
      return this.items.some(item => item.key === key);
    }

    delete(key: K): boolean {
      const index = this.items.findIndex(item => item.key === key);
      if (index !== -1) {
        this.items.splice(index, 1);
        return true;
      }
      return false;
    }
  };
}

// Patch Map.prototype[Symbol.iterator] if it's missing
if (typeof Map !== "undefined" && Map.prototype) {
  const mapProto = Map.prototype as any;
  
  // Ensure Map has Symbol.iterator
  if (!mapProto[Symbol.iterator]) {
    mapProto[Symbol.iterator] = function() {
      return this.entries();
    };
  }
  
  // Ensure entries() returns a proper iterator
  const originalEntries = mapProto.entries;
  if (originalEntries) {
    mapProto.entries = function() {
      const iterator = originalEntries.call(this);
      // Make sure the iterator has Symbol.iterator
      if (!iterator[Symbol.iterator]) {
        iterator[Symbol.iterator] = function() { return this; };
      }
      return iterator;
    };
  }
}

// Ensure Map is available
if (typeof Map === "undefined") {
  (globalThis as any).Map = class Map<K = any, V = any> {
    private items: Array<{ key: K; value: V }> = [];

    constructor(iterable?: Iterable<[K, V]>) {
      if (iterable) {
        for (const [key, value] of iterable) {
          this.set(key, value);
        }
      }
    }

    set(key: K, value: V): this {
      const existing = this.items.find(item => item.key === key);
      if (existing) {
        existing.value = value;
      } else {
        this.items.push({ key, value });
      }
      return this;
    }

    get(key: K): V | undefined {
      const item = this.items.find(item => item.key === key);
      return item ? item.value : undefined;
    }

    has(key: K): boolean {
      return this.items.some(item => item.key === key);
    }

    delete(key: K): boolean {
      const index = this.items.findIndex(item => item.key === key);
      if (index !== -1) {
        this.items.splice(index, 1);
        return true;
      }
      return false;
    }

    clear(): void {
      this.items = [];
    }

    get size(): number {
      return this.items.length;
    }

    forEach(callback: (value: V, key: K, map: this) => void, thisArg?: any): void {
      for (const item of this.items) {
        callback.call(thisArg, item.value, item.key, this);
      }
    }

    [Symbol.iterator](): Iterator<[K, V]> {
      return this.entries();
    }

    entries(): Iterator<[K, V]> {
      let index = 0;
      const items = this.items;
      return {
        next(): IteratorResult<[K, V]> {
          if (index < items.length) {
            const item = items[index++];
            return { value: [item.key, item.value], done: false };
          }
          return { value: undefined as any, done: true };
        }
      };
    }

    keys(): Iterator<K> {
      let index = 0;
      const items = this.items;
      return {
        next(): IteratorResult<K> {
          if (index < items.length) {
            return { value: items[index++].key, done: false };
          }
          return { value: undefined as any, done: true };
        }
      };
    }

    values(): Iterator<V> {
      let index = 0;
      const items = this.items;
      return {
        next(): IteratorResult<V> {
          if (index < items.length) {
            return { value: items[index++].value, done: false };
          }
          return { value: undefined as any, done: true };
        }
      };
    }
  };
}

// Ensure console.error exists for compatibility
if (typeof console !== "undefined" && !console.error) {
  console.error = console.log;
}
