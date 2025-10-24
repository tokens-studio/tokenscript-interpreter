// Polyfills for QuickJS compatibility

// Ensure Symbol.iterator exists
if (typeof Symbol === "undefined" || !Symbol.iterator) {
  if (typeof Symbol === "undefined") {
    globalThis.Symbol = {
      iterator: "__iterator__",
      toStringTag: "__toStringTag__",
      hasInstance: "__hasInstance__",
      isConcatSpreadable: "__isConcatSpreadable__",
    };
  } else if (!Symbol.iterator) {
    Symbol.iterator = "__iterator__";
  }
}

// Simple URL validation that doesn't rely on Node.js URL API
if (typeof URL === "undefined") {
  globalThis.URL = class URL {
    constructor(url) {
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

    toString() {
      return this.href;
    }
  };
}

// Patch Map.prototype[Symbol.iterator] if it's missing
if (typeof Map !== "undefined" && Map.prototype) {
  const mapProto = Map.prototype;
  
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
  globalThis.Map = class Map {
    constructor(iterable) {
      this.items = [];
      if (iterable) {
        for (const [key, value] of iterable) {
          this.set(key, value);
        }
      }
    }

    set(key, value) {
      const existing = this.items.find(item => item.key === key);
      if (existing) {
        existing.value = value;
      } else {
        this.items.push({ key, value });
      }
      return this;
    }

    get(key) {
      const item = this.items.find(item => item.key === key);
      return item ? item.value : undefined;
    }

    has(key) {
      return this.items.some(item => item.key === key);
    }

    delete(key) {
      const index = this.items.findIndex(item => item.key === key);
      if (index !== -1) {
        this.items.splice(index, 1);
        return true;
      }
      return false;
    }

    clear() {
      this.items = [];
    }

    get size() {
      return this.items.length;
    }

    forEach(callback, thisArg) {
      for (const item of this.items) {
        callback.call(thisArg, item.value, item.key, this);
      }
    }

    [Symbol.iterator]() {
      return this.entries();
    }

    entries() {
      let index = 0;
      const items = this.items;
      return {
        next() {
          if (index < items.length) {
            const item = items[index++];
            return { value: [item.key, item.value], done: false };
          }
          return { value: undefined, done: true };
        },
        [Symbol.iterator]() { return this; }
      };
    }

    keys() {
      let index = 0;
      const items = this.items;
      return {
        next() {
          if (index < items.length) {
            return { value: items[index++].key, done: false };
          }
          return { value: undefined, done: true };
        },
        [Symbol.iterator]() { return this; }
      };
    }

    values() {
      let index = 0;
      const items = this.items;
      return {
        next() {
          if (index < items.length) {
            return { value: items[index++].value, done: false };
          }
          return { value: undefined, done: true };
        },
        [Symbol.iterator]() { return this; }
      };
    }
  };
}

// Patch Set.prototype[Symbol.iterator] if it's missing
if (typeof Set !== "undefined" && Set.prototype) {
  const setProto = Set.prototype;
  
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
  globalThis.Set = class Set {
    constructor(iterable) {
      this.items = [];
      if (iterable) {
        for (const item of iterable) {
          this.add(item);
        }
      }
    }

    add(value) {
      if (!this.has(value)) {
        this.items.push(value);
      }
      return this;
    }

    has(value) {
      return this.items.indexOf(value) !== -1;
    }

    delete(value) {
      const index = this.items.indexOf(value);
      if (index !== -1) {
        this.items.splice(index, 1);
        return true;
      }
      return false;
    }

    clear() {
      this.items = [];
    }

    get size() {
      return this.items.length;
    }

    forEach(callback, thisArg) {
      for (const item of this.items) {
        callback.call(thisArg, item, item, this);
      }
    }

    [Symbol.iterator]() {
      let index = 0;
      const items = this.items;
      return {
        next() {
          if (index < items.length) {
            return { value: items[index++], done: false };
          }
          return { value: undefined, done: true };
        },
        [Symbol.iterator]() { return this; }
      };
    }

    values() {
      return this[Symbol.iterator]();
    }

    keys() {
      return this[Symbol.iterator]();
    }

    entries() {
      let index = 0;
      const items = this.items;
      return {
        next() {
          if (index < items.length) {
            const value = items[index++];
            return { value: [value, value], done: false };
          }
          return { value: undefined, done: true };
        },
        [Symbol.iterator]() { return this; }
      };
    }
  };
}

// Ensure WeakMap is available
if (typeof WeakMap === "undefined") {
  globalThis.WeakMap = class WeakMap {
    constructor() {
      this.items = [];
    }

    set(key, value) {
      const existing = this.items.find(item => item.key === key);
      if (existing) {
        existing.value = value;
      } else {
        this.items.push({ key, value });
      }
      return this;
    }

    get(key) {
      const item = this.items.find(item => item.key === key);
      return item ? item.value : undefined;
    }

    has(key) {
      return this.items.some(item => item.key === key);
    }

    delete(key) {
      const index = this.items.findIndex(item => item.key === key);
      if (index !== -1) {
        this.items.splice(index, 1);
        return true;
      }
      return false;
    }
  };
}

// Ensure console.error exists for compatibility
if (typeof console !== "undefined" && !console.error) {
  console.error = console.log;
}
