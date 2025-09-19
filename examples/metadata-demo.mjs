#!/usr/bin/env node

/**
 * Metadata Preservation Demo
 * 
 * This script demonstrates the new metadata preservation feature
 * in the TokenScript interpreter.
 */

import { interpretTokens, interpretTokensWithMetadata } from '../dist/lib/index.js';

console.log('🎨 TokenScript Metadata Preservation Demo\n');

// Sample DTCG tokens with metadata
const sampleTokens = {
  colors: {
    primary: {
      $value: "#3b82f6",
      $type: "color",
      $description: "Primary brand color used for buttons and links",
      $extensions: {
        "com.figma": {
          scopes: ["fill", "stroke"]
        }
      }
    },
    secondary: {
      $value: "#6b7280", 
      $type: "color",
      $description: "Secondary color for subtle UI elements"
    }
  },
  spacing: {
    small: {
      $value: "8px",
      $type: "dimension", 
      $description: "Small spacing for tight layouts"
    },
    medium: {
      $value: "{spacing.small} * 2",
      $type: "dimension",
      $description: "Medium spacing, computed as twice the small spacing"
    },
    large: {
      $value: "{spacing.medium} + 8px", 
      $type: "dimension",
      $description: "Large spacing with additional padding"
    }
  }
};

console.log('📋 Original DTCG Token Structure:');
console.log(JSON.stringify(sampleTokens, null, 2));

console.log('\n🔄 Processing with standard API (values only)...\n');

// Standard API - values only (backward compatible)
const standardResult = interpretTokens(sampleTokens);
console.log('✅ Standard Result (values only for backward compatibility):');
console.log(JSON.stringify(standardResult, null, 2));

console.log('\n🔄 Processing with enhanced API (values + metadata)...\n');

// Enhanced API - values with preserved metadata
const enhancedResult = interpretTokensWithMetadata(sampleTokens);
console.log('✅ Enhanced Result:');
console.log('📊 Computed Values:');
Object.entries(enhancedResult.tokens).forEach(([key, value]) => {
  if (!key.includes('$')) {
    console.log(`  ${key}: ${value}`);
  }
});

console.log('\n📋 Preserved Metadata in Flat Structure:');
Object.entries(enhancedResult.tokens).forEach(([key, value]) => {
  if (key.includes('$')) {
    console.log(`  ${key}: ${JSON.stringify(value)}`);
  }
});

console.log('\n🔍 Metadata Object (structured):');
console.log(JSON.stringify(enhancedResult.metadata, null, 2));

console.log('\n✨ Key Benefits:');
console.log('  • 🔄 Expressions are computed: "{spacing.small} * 2" → "16px"');
console.log('  • 📋 Metadata is preserved: $description, $type, $extensions');
console.log('  • 🔗 References work: "{spacing.medium} + 8px" → "24px"');
console.log('  • 🔙 Backward compatible: existing code continues to work');
console.log('  • 🎯 Enhanced API: new interpretTokensWithMetadata() for rich output');

console.log('\n🚀 Usage Examples:');
console.log('```javascript');
console.log('// Standard API (backward compatible)');
console.log('const tokens = interpretTokens(dtcgTokens);');
console.log('console.log(tokens["spacing.medium"]); // "16px"');
console.log('');
console.log('// Enhanced API with metadata');
console.log('const result = interpretTokensWithMetadata(dtcgTokens);');
console.log('console.log(result.tokens["spacing.medium"]); // "16px"');
console.log('console.log(result.tokens["spacing.medium.$description"]); // "Medium spacing..."');
console.log('console.log(result.metadata["spacing.medium"]); // { $type: "dimension", ... }');
console.log('```');