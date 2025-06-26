#!/usr/bin/env node

/**
 * Error Handling Demo
 * 
 * This example demonstrates the new error handling features in the TokenScript interpreter.
 * When token resolution fails, the DTCG output now includes:
 * - $error: structured error data with detailed information about the failure
 *
 * The presence of the $error property indicates resolution failure.
 * Successful tokens will not have an $error property.
 */

import { interpretTokensWithMetadata } from '../dist/tokenset-processor.js';

console.log('🔧 TokenScript Error Handling Demo\n');

// Example 1: Simple tokens with missing references
console.log('📝 Example 1: Simple tokens with missing references');
const simpleTokens = {
  "color.primary": {
    "$type": "color",
    "$value": "rgb({color.base.red}, {color.base.green}, {color.base.blue})",
    "$description": "Primary color using RGB composition"
  },
  "color.base.red": {
    "$type": "number", 
    "$value": "255"
  },
  "color.base.green": {
    "$type": "number",
    "$value": "128"
  },
  // Missing color.base.blue - this will cause an error
  "color.valid": {
    "$type": "color", 
    "$value": "#ff0000",
    "$description": "A valid color that resolves successfully"
  }
};

try {
  const result = interpretTokensWithMetadata(simpleTokens);
  
  console.log('\n📊 Results:');
  for (const [tokenName, tokenData] of Object.entries(result)) {
    console.log(`\n🎯 ${tokenName}:`);
    console.log(`   $value: ${tokenData.$value}`);
    console.log(`   Status: ${tokenData.$error ? '❌ Failed' : '✅ Success'}`);
    if (tokenData.$error) {
      console.log(`   $error: 📊 ${JSON.stringify(tokenData.$error, null, 6)}`);
    }
    if (tokenData.$description) {
      console.log(`   $description: ${tokenData.$description}`);
    }
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}

// Example 2: Themed tokens with errors
console.log('\n\n📝 Example 2: Themed tokens with error handling');
const themedTokens = {
  "$themes": [
    {
      "name": "light",
      "selectedTokenSets": [
        { "id": "core", "status": "enabled" },
        { "id": "light-theme", "status": "enabled" }
      ]
    }
  ],
  "core": {
    "color": {
      "base": {
        "$type": "color",
        "$value": "#000000"
      }
    }
  },
  "light-theme": {
    "color": {
      "primary": {
        "$type": "color",
        "$value": "lighten({color.base}, {color.lightness})",
        "$description": "Primary color for light theme"
      }
    }
    // Missing color.lightness - this will cause an error
  }
};

try {
  const themedResult = interpretTokensWithMetadata(themedTokens);
  
  console.log('\n📊 Themed Results:');
  for (const [themeName, themeTokens] of Object.entries(themedResult)) {
    console.log(`\n🎨 Theme: ${themeName}`);
    for (const [tokenName, tokenData] of Object.entries(themeTokens)) {
      console.log(`\n  🎯 ${tokenName}:`);
      console.log(`     $value: ${tokenData.$value}`);
      console.log(`     Status: ${tokenData.$error ? '❌ Failed' : '✅ Success'}`);
      if (tokenData.$error) {
        console.log(`     $error: 📊 ${JSON.stringify(tokenData.$error, null, 8)}`);
      }
      if (tokenData.$description) {
        console.log(`     $description: ${tokenData.$description}`);
      }
    }
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}

console.log('\n✨ Demo completed! The new error handling provides detailed information about token resolution failures.');
