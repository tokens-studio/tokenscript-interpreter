import { languages } from "monaco-editor";
import type { editor, Position } from "monaco-editor";
import { ColorManager } from "@tokens-studio/tokenscript-interpreter";
import hslSpec from "../../../../data/specifications/colors/hsl.json";
import lrgbSpec from "../../../../data/specifications/colors/lrgb.json";
import rgbSpec from "../../../../data/specifications/colors/rgb.json";
import rgbaSpec from "../../../../data/specifications/colors/rgba.json";
import srgbSpec from "../../../../data/specifications/colors/srgb.json";

interface VariableInfo {
  name: string;
  type: string;
  line: number;
}

interface ColorAttribute {
  name: string;
  type: string;
  description?: string;
}

/**
 * TokenScript completion provider that offers attribute completions for variables
 */
export class TokenScriptCompletionProvider {
  private colorManager: ColorManager;

  constructor() {
    this.colorManager = new ColorManager();
    this.setupColorManager();
  }

  private setupColorManager(): void {
    this.colorManager.register(
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgb-color/0/",
      rgbSpec as any,
    );
    this.colorManager.register(
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0/",
      hslSpec as any,
    );
    this.colorManager.register(
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0/",
      srgbSpec as any,
    );
    this.colorManager.register(
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/rgba-color/0/",
      rgbaSpec as any,
    );
    this.colorManager.register(
      "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/lrgb-color/0/",
      lrgbSpec as any,
    );
  }

  /**
   * Extract variable declarations from the code
   */
  private extractVariables(code: string): VariableInfo[] {
    const variables: VariableInfo[] = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match variable declarations like: variable name: Type = value;
      const variableMatch = line.match(/^\s*variable\s+(\w+)\s*:\s*([\w.]+)/);
      if (variableMatch) {
        variables.push({
          name: variableMatch[1],
          type: variableMatch[2],
          line: i + 1
        });
      }
    }
    
    return variables;
  }

  /**
   * Get color attributes from the schema based on the color type
   */
  private getColorAttributes(colorType: string): ColorAttribute[] {
    const attributes: ColorAttribute[] = [];
    
    // Parse color type like "Color.Hsl" -> "Hsl"
    const typeMatch = colorType.match(/^Color\.(\w+)$/);
    if (!typeMatch) {
      return attributes;
    }
    
    const subType = typeMatch[1];
    const spec = this.colorManager.getSpecByType(subType);
    
    if (!spec?.schema?.properties) {
      return attributes;
    }
    
    // Extract attributes from the schema
    for (const [key, value] of Object.entries(spec.schema.properties)) {
      let description = value.description || `${key} property of ${subType} color`;
      
      // Add more helpful descriptions for common color properties
      if (subType.toLowerCase() === 'hsl') {
        switch (key) {
          case 'h': description = 'Hue value (0-360 degrees)'; break;
          case 's': description = 'Saturation value (0-100%)'; break;
          case 'l': description = 'Lightness value (0-100%)'; break;
        }
      } else if (subType.toLowerCase() === 'rgb' || subType.toLowerCase() === 'srgb') {
        switch (key) {
          case 'r': description = 'Red component (0-255)'; break;
          case 'g': description = 'Green component (0-255)'; break;
          case 'b': description = 'Blue component (0-255)'; break;
        }
      } else if (subType.toLowerCase() === 'rgba') {
        switch (key) {
          case 'r': description = 'Red component (0-255)'; break;
          case 'g': description = 'Green component (0-255)'; break;
          case 'b': description = 'Blue component (0-255)'; break;
          case 'a': description = 'Alpha/transparency (0-1)'; break;
        }
      } else if (subType.toLowerCase() === 'hex') {
        switch (key) {
          case 'value': description = 'Hexadecimal color value (e.g., #ff0000)'; break;
        }
      }
      
      attributes.push({
        name: key,
        type: value.type || 'unknown',
        description
      });
    }
    
    return attributes;
  }

  /**
   * Get the word at the current position, including the preceding variable name
   */
  private getWordAtPosition(model: editor.ITextModel, position: Position): {
    word: string;
    range: editor.IRange;
    isAttributeAccess: boolean;
    variableName?: string;
  } {
    const lineContent = model.getLineContent(position.lineNumber);
    const wordStart = position.column - 1;
    
    // Look for pattern: variableName. or variableName.partialAttribute
    const beforeCursor = lineContent.substring(0, wordStart);
    const attributeMatch = beforeCursor.match(/(\w+)\s*\.\s*(\w*)$/);
    
    if (attributeMatch) {
      const variableName = attributeMatch[1];
      const partialAttribute = attributeMatch[2];
      const start = Math.max(1, position.column - partialAttribute.length);
      
      return {
        word: partialAttribute,
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: start,
          endColumn: position.column,
        },
        isAttributeAccess: true,
        variableName,
      };
    }
    
    // Check if we're right after a dot (for immediate completion)
    const dotMatch = beforeCursor.match(/(\w+)\s*\.\s*$/);
    if (dotMatch) {
      const variableName = dotMatch[1];
      
      return {
        word: '',
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column,
          endColumn: position.column,
        },
        isAttributeAccess: true,
        variableName,
      };
    }
    
    // Default word extraction
    const wordRegex = /[a-zA-Z_$][\w$]*/g;
    const matches = [...lineContent.matchAll(wordRegex)];
    
    for (const match of matches) {
      if (match.index !== undefined) {
        const start = match.index + 1; // Monaco uses 1-based indexing
        const end = start + match[0].length;
        
        if (start <= position.column && position.column <= end) {
          return {
            word: match[0],
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: start,
              endColumn: end,
            },
            isAttributeAccess: false,
          };
        }
      }
    }
    
    return {
      word: '',
      range: {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column,
        endColumn: position.column,
      },
      isAttributeAccess: false,
    };
  }

  /**
   * Create completion items for color attributes and methods
   */
  private createAttributeCompletions(
    attributes: ColorAttribute[],
    range: editor.IRange,
    colorType: string
  ): languages.CompletionItem[] {
    const completions: languages.CompletionItem[] = [];
    
    // Add attributes
    attributes.forEach((attr) => {
      completions.push({
        label: attr.name,
        kind: languages.CompletionItemKind.Property,
        detail: `${attr.type} property`,
        documentation: attr.description || `Access the ${attr.name} property`,
        insertText: attr.name,
        range,
        sortText: `0_${attr.name}`, // Prioritize attribute completions
      });
    });
    
    // Add common color methods
    const colorMethods = [
      {
        name: 'toString',
        detail: 'string toString()',
        description: 'Convert color to string representation',
        insertText: 'toString()'
      },
    ];
    
    colorMethods.forEach((method) => {
      completions.push({
        label: method.name,
        kind: languages.CompletionItemKind.Method,
        detail: method.detail,
        documentation: method.description,
        insertText: method.insertText,
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        sortText: `1_${method.name}`,
      });
    });
    
    return completions;
  }

  /**
   * Create variable completions from defined variables
   */
  private createVariableCompletions(variables: VariableInfo[], range: editor.IRange): languages.CompletionItem[] {
    return variables.map(variable => ({
      label: variable.name,
      kind: languages.CompletionItemKind.Variable,
      insertText: variable.name,
      detail: `${variable.type} variable`,
      documentation: `Variable '${variable.name}' of type ${variable.type} (defined on line ${variable.line})`,
      range,
      sortText: `0_${variable.name}`, // Prioritize variables
    }));
  }

  /**
   * Create basic TokenScript completions (keywords, functions, etc.)
   */
  private createBasicCompletions(range: editor.IRange, variables?: VariableInfo[]): languages.CompletionItem[] {
    const completions: languages.CompletionItem[] = [];
    
    // Add variable completions if available
    if (variables && variables.length > 0) {
      completions.push(...this.createVariableCompletions(variables, range));
    }
    
    // TokenScript keywords
    const keywords = ['variable', 'return', 'if', 'else', 'for', 'in', 'while', 'do'];
    keywords.forEach(keyword => {
      completions.push({
        label: keyword,
        kind: languages.CompletionItemKind.Keyword,
        insertText: keyword,
        range,
        sortText: `1_${keyword}`,
      });
    });
    
    // Color types - match the registered specs
    const colorTypes = ['Color.Hex', 'Color.Rgb', 'Color.Hsl', 'Color.Srgb', 'Color.Rgba', 'Color.Lrgb'];
    colorTypes.forEach(type => {
      completions.push({
        label: type,
        kind: languages.CompletionItemKind.Class,
        insertText: type,
        detail: 'Color type',
        range,
        sortText: `2_${type}`,
      });
    });
    
    // Color functions
    const colorFunctions = [
      { name: 'rgb', params: 'r, g, b', desc: 'Create RGB color' },
      { name: 'rgba', params: 'r, g, b, a', desc: 'Create RGBA color' },
      { name: 'hsl', params: 'h, s, l', desc: 'Create HSL color' },
      { name: 'srgb', params: 'r, g, b', desc: 'Create sRGB color' },
      { name: 'lrgb', params: 'r, g, b', desc: 'Create linear RGB color' },
      { name: 'hex', params: 'value', desc: 'Create hex color' },
    ];
    
    colorFunctions.forEach(func => {
      completions.push({
        label: func.name,
        kind: languages.CompletionItemKind.Function,
        insertText: `${func.name}($1)`,
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: `${func.name}(${func.params})`,
        documentation: func.desc,
        range,
        sortText: `3_${func.name}`,
      });
    });
    
    return completions;
  }

  /**
   * Main completion provider function
   */
  public provideCompletionItems(
    model: editor.ITextModel,
    position: Position
  ): languages.ProviderResult<languages.CompletionList> {
    const code = model.getValue();
    const wordInfo = this.getWordAtPosition(model, position);
    const variables = this.extractVariables(code);
    
    // If we're accessing an attribute (e.g., "variable.")
    if (wordInfo.isAttributeAccess && wordInfo.variableName) {
      const variable = variables.find(v => v.name === wordInfo.variableName);
      
      if (variable) {
        // Check if it's a color type
        if (variable.type.startsWith('Color.')) {
          const attributes = this.getColorAttributes(variable.type);
          const completions = this.createAttributeCompletions(attributes, wordInfo.range, variable.type);
          
          return {
            suggestions: completions,
            incomplete: false,
          };
        }
      }
    }
    
    // Provide basic completions including variables for other cases
    const basicCompletions = this.createBasicCompletions(wordInfo.range, variables);
    
    return {
      suggestions: basicCompletions,
      incomplete: false,
    };
  }
}