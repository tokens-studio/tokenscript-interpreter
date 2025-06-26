import { describe, it, expect } from 'vitest';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';
import { Interpreter } from '../interpreter/interpreter';
import { TokenSetResolver, processThemes, buildThemeTree } from '../tokenset-processor';

describe('CLI Functionality', () => {
  describe('Expression Interpretation', () => {
    it('should interpret simple mathematical expressions', () => {
      const code = '5 + 12';
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(true);
      
      expect(ast).toBeTruthy();
      
      const interpreter = new Interpreter(ast!, {});
      const result = interpreter.interpret();
      
      expect(result?.toString()).toBe('17');
    });

    it('should interpret expressions with units', () => {
      const code = '10 * 2px';
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(true);
      
      expect(ast).toBeTruthy();
      
      const interpreter = new Interpreter(ast!, {});
      const result = interpreter.interpret();
      
      expect(result?.toString()).toBe('20px');
    });

    it('should interpret expressions with references', () => {
      const code = '{base} * 2px';
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(true);
      
      expect(ast).toBeTruthy();
      
      const interpreter = new Interpreter(ast!, { base: 16 });
      const result = interpreter.interpret();
      
      expect(result?.toString()).toBe('32px');
    });

    it('should handle complex expressions', () => {
      const code = 'min(10px, 20px, 5px)';
      const lexer = new Lexer(code);
      const parser = new Parser(lexer);
      const ast = parser.parse(true);

      expect(ast).toBeTruthy();

      const interpreter = new Interpreter(ast!, {});
      const result = interpreter.interpret();

      // Note: min function currently returns just the number, not with unit
      expect(result?.toString()).toBe('5');
    });
  });

  describe('TokenSetResolver', () => {
    it('should resolve simple tokens', () => {
      const tokens = {
        'simple.token': '16px',
        'another.token': '24px'
      };

      const resolver = new TokenSetResolver(tokens);
      const resolved = resolver.resolve();

      expect(resolved['simple.token']?.toString()).toBe('16px');
      expect(resolved['another.token']?.toString()).toBe('24px');
    });

    it('should resolve token dependencies', () => {
      const tokens = {
        'base': '16',
        'derived': '{base} * 2px'
      };

      const resolver = new TokenSetResolver(tokens);
      const resolved = resolver.resolve();

      expect(resolved['base']?.toString()).toBe('16');
      expect(resolved['derived']?.toString()).toBe('32px');
    });

    it('should handle complex token dependencies', () => {
      const tokens = {
        'base.spacing': '8',
        'scale': '2',
        'small': '{base.spacing}px',
        'medium': '{base.spacing} * {scale}px',
        'large': '{medium} + {small}'
      };

      const resolver = new TokenSetResolver(tokens);
      const resolved = resolver.resolve();

      expect(resolved['base.spacing']?.toString()).toBe('8');
      expect(resolved['scale']?.toString()).toBe('2');
      expect(resolved['small']?.toString()).toBe('8px');
      expect(resolved['medium']?.toString()).toBe('16px');
      // Addition of 16px + 8px = 24px (mathematical addition)
      expect(resolved['large']?.toString()).toBe('24px');
    });

    it('should handle composition tokens with $value references', () => {
      const tokens = {
        'base.color': '#FF0000',
        'base.spacing': '8',
        'semantic.color.primary': '{base.color}',
        'semantic.spacing.small': '{base.spacing}px',
        'composite.button': {
          '$type': 'typography',
          '$value': {
            'color': '{semantic.color.primary}',
            'padding': '{semantic.spacing.small}',
            'fontSize': '16px'
          }
        }
      };

      const resolver = new TokenSetResolver(tokens);
      const resolved = resolver.resolve();

      expect(resolved['base.color']?.toString()).toBe('#FF0000');
      expect(resolved['base.spacing']?.toString()).toBe('8');
      expect(resolved['semantic.color.primary']?.toString()).toBe('#FF0000');
      expect(resolved['semantic.spacing.small']?.toString()).toBe('8px');

      const compositeButton = resolved['composite.button'];
      expect(compositeButton).toBeDefined();
      expect(compositeButton.$type).toBe('typography');
      expect(compositeButton.$value.color?.toString()).toBe('#FF0000');
      expect(compositeButton.$value.padding?.toString()).toBe('8px');
      expect(compositeButton.$value.fontSize?.toString()).toBe('16px');
    });

    it('should handle nested composition token references', () => {
      const tokens = {
        'base.size': '16',
        'semantic.size.large': '{base.size} * 1.5',
        'composite.text': {
          '$type': 'typography',
          '$value': {
            'fontSize': '{semantic.size.large}px',
            'lineHeight': '{semantic.size.large} * 1.2px'
          }
        }
      };

      const resolver = new TokenSetResolver(tokens);
      const resolved = resolver.resolve();

      expect(resolved['base.size']?.toString()).toBe('16');
      expect(resolved['semantic.size.large']?.toString()).toBe('24');

      const compositeText = resolved['composite.text'];
      expect(compositeText).toBeDefined();
      expect(compositeText.$type).toBe('typography');
      expect(compositeText.$value.fontSize?.toString()).toBe('24px');
      // Handle floating-point precision issues
      const lineHeight = compositeText.$value.lineHeight?.toString();
      const numericValue = parseFloat(lineHeight.replace('px', ''));
      expect(numericValue).toBeCloseTo(28.8, 1);
    });

    it('should handle composition tokens with array values containing references', () => {
      const tokens = {
        'shadow.x': '2',
        'shadow.y': '4',
        'shadow.blur': '8',
        'shadow.color': '#000000',
        'composite.shadow': {
          '$type': 'boxShadow',
          '$value': [
            {
              'x': '{shadow.x}px',
              'y': '{shadow.y}px',
              'blur': '{shadow.blur}px',
              'color': '{shadow.color}',
              'type': 'dropShadow'
            }
          ]
        }
      };

      const resolver = new TokenSetResolver(tokens);
      const resolved = resolver.resolve();

      const compositeShadow = resolved['composite.shadow'];
      expect(compositeShadow).toBeDefined();
      expect(compositeShadow.$type).toBe('boxShadow');
      expect(Array.isArray(compositeShadow.$value)).toBe(true);
      expect(compositeShadow.$value[0].x?.toString()).toBe('2px');
      expect(compositeShadow.$value[0].y?.toString()).toBe('4px');
      expect(compositeShadow.$value[0].blur?.toString()).toBe('8px');
      expect(compositeShadow.$value[0].color?.toString()).toBe('#000000');
      expect(compositeShadow.$value[0].type).toBe('dropShadow');
    });
  });

  describe('Theme Processing', () => {
    it('should process simple themes', async () => {
      const themes = {
        'Light': {
          'color.primary': '#3B82F6',
          'color.secondary': '#1E40AF'
        },
        'Dark': {
          'color.primary': '#60A5FA',
          'color.secondary': '#3B82F6'
        }
      };

      const result = await processThemes(themes);

      expect(result).toHaveProperty('Light');
      expect(result).toHaveProperty('Dark');
      expect(result.Light['color.primary']?.toString()).toBe('#3B82F6');
      expect(result.Dark['color.primary']?.toString()).toBe('#60A5FA');
    });

    it('should resolve theme token dependencies', async () => {
      const themes = {
        'Theme1': {
          'base': '16',
          'derived': '{base} * 1.5px'
        }
      };

      const result = await processThemes(themes);

      expect(result.Theme1['base']?.toString()).toBe('16');
      expect(result.Theme1['derived']?.toString()).toBe('24px');
    });
  });

  describe('Theme Tree Building', () => {
    it('should build theme tree from tokensets', () => {
      const tokensets = {
        '$themes': [
          {
            name: 'Light',
            group: 'Mode',
            selectedTokenSets: {
              'core': 'enabled',
              'semantic': 'enabled'
            }
          },
          {
            name: 'Dark',
            group: 'Mode',
            selectedTokenSets: {
              'core': 'enabled',
              'semantic-dark': 'enabled'
            }
          }
        ],
        'core': {
          'spacing': {
            'base': { '$value': '16px' }
          }
        },
        'semantic': {
          'color': {
            'primary': { '$value': '#3B82F6' }
          }
        },
        'semantic-dark': {
          'color': {
            'primary': { '$value': '#60A5FA' }
          }
        }
      };

      const themeTree = buildThemeTree(tokensets);

      expect(themeTree).toHaveProperty('Mode');
      expect(themeTree.Mode).toHaveProperty('Light');
      expect(themeTree.Mode).toHaveProperty('Dark');
      expect(themeTree.Mode.Light).toHaveProperty('spacing.base');
      expect(themeTree.Mode.Light).toHaveProperty('color.primary');
    });
  });
});
