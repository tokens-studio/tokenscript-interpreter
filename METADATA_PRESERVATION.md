# DTCG Metadata Preservation

## Overview

The TokenScript interpreter now preserves DTCG (Design Token Community Group) metadata such as `$description`, `$type`, and `$extensions` alongside computed token values. This enhancement maintains full compatibility with existing code while providing richer output for applications that need access to token metadata.

## Key Features

### ✅ Preserved Metadata
- **`$description`**: Human-readable descriptions of tokens
- **`$type`**: Token type information (color, dimension, etc.)
- **`$extensions`**: Custom extension data (e.g., Figma scopes)
- **All custom `$*` properties**: Any additional metadata fields

### ✅ Enhanced Processing
- **Expression evaluation**: `{spacing.small} * 2` → `"16px"`
- **Reference resolution**: Cross-token dependencies work perfectly
- **Metadata inheritance**: Computed tokens preserve original metadata
- **Theme support**: Multi-theme token sets maintain metadata per theme

## APIs

### Standard API (Enhanced)
The existing `interpretTokens()` function now includes metadata in a flat structure:

```javascript
import { interpretTokens } from '@tokens-studio/tokenscript-interpreter';

const tokens = {
  spacing: {
    medium: {
      $value: "{spacing.small} * 2",
      $type: "dimension",
      $description: "Medium spacing, twice the small spacing"
    }
  }
};

const result = interpretTokens(tokens);
console.log(result["spacing.medium"]);             // "16px"
console.log(result["spacing.medium.$description"]); // "Medium spacing, twice the small spacing"
console.log(result["spacing.medium.$type"]);       // "dimension"
```

### Enhanced API (Structured)
The new `interpretTokensWithMetadata()` function provides structured access to metadata:

```javascript
import { interpretTokensWithMetadata } from '@tokens-studio/tokenscript-interpreter';

const result = interpretTokensWithMetadata(tokens);

// Computed values
console.log(result.tokens["spacing.medium"]); // "16px"

// Structured metadata
console.log(result.metadata["spacing.medium"]); 
// { $type: "dimension", $description: "Medium spacing, twice the small spacing" }

// Also available in flat format for compatibility
console.log(result.tokens["spacing.medium.$description"]); // "Medium spacing..."
```

## Examples

### Basic DTCG Token Processing
```javascript
const dtcgTokens = {
  colors: {
    primary: {
      $value: "#3b82f6",
      $type: "color",
      $description: "Primary brand color used for buttons and links"
    }
  },
  spacing: {
    medium: {
      $value: "{spacing.small} * 2",
      $type: "dimension", 
      $description: "Medium spacing computed from base"
    }
  }
};

// Both APIs preserve metadata
const standardResult = interpretTokens(dtcgTokens);
const enhancedResult = interpretTokensWithMetadata(dtcgTokens);
```

### Multi-Theme Processing
```javascript
const themeTokens = {
  core: {
    colors: {
      blue: { 
        $value: "#3b82f6", 
        $type: "color",
        $description: "Core blue color" 
      }
    }
  },
  light: {
    semantic: {
      primary: { 
        $value: "{colors.blue}", 
        $type: "color",
        $description: "Primary color in light theme" 
      }
    }
  },
  $themes: [
    {
      id: "light",
      name: "Light Theme", 
      selectedTokenSets: [
        { id: "core", status: "source" },
        { id: "light", status: "enabled" }
      ]
    }
  ]
};

// Metadata preserved across theme processing
const result = interpretTokens(themeTokens);
console.log(result["Light Theme"]["semantic.primary.$description"]);
// "Primary color in light theme"
```

## Benefits

### 🔄 **Backward Compatibility**
Existing code continues to work unchanged, now with enhanced output that includes metadata.

### 📋 **Rich Metadata Support** 
Access to complete DTCG metadata enables building more sophisticated design tools and documentation.

### ⚡ **Performance Optimized**
Metadata processing adds minimal overhead while maintaining the interpreter's high performance.

### 🎯 **Standards Compliant**
Full support for DTCG specification including themes, token sets, and metadata fields.

### 🔗 **Reference-Aware**
Computed tokens that reference other tokens maintain their own metadata while resolving dependencies.

## Use Cases

### Design System Documentation
Access token descriptions and types to automatically generate design system documentation.

### Tool Integration
Preserve Figma extensions and other tool-specific metadata through the processing pipeline.

### Token Validation
Use `$type` information to validate token usage and catch type mismatches.

### Enhanced Debugging
Access original metadata context when troubleshooting token resolution issues.

## Migration

### From Existing Code
No changes required! Your existing `interpretTokens()` calls now return enhanced output with metadata.

### To Structured Metadata
Opt-in to the new `interpretTokensWithMetadata()` API for structured access to metadata alongside computed values.

```javascript
// Before (still works, now enhanced)
const tokens = interpretTokens(dtcgInput);

// After (for structured access)  
const { tokens, metadata } = interpretTokensWithMetadata(dtcgInput);
```

The metadata preservation feature makes TokenScript a more complete solution for design system tooling while maintaining its core strength of efficient token computation and reference resolution.