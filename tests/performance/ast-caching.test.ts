import { describe, it, expect, vi } from 'vitest';
import { TokenSetResolver } from '../../tokenset-processor';
import { Parser } from '../../interpreter/parser';
import { Lexer } from '../../interpreter/lexer';

describe('AST Caching Performance', () => {
  it('should cache AST and reuse it during resolution', () => {
    const tokens = {
      'base.size': '16',
      'component.padding': '{base.size} * 2',
      'component.margin': '{component.padding} + 4',
      'layout.spacing': '{component.margin} / 2'
    };

    const resolver = new TokenSetResolver(tokens);

    // Access the private parsers cache to verify ASTs are stored
    const parsersCache = (resolver as any).parsers;

    const result = resolver.resolve();

    // Verify all tokens were resolved correctly
    expect(result.resolvedTokens['base.size']?.toString()).toBe('16');
    expect(result.resolvedTokens['component.padding']?.toString()).toBe('32');
    expect(result.resolvedTokens['component.margin']?.toString()).toBe('36');
    expect(result.resolvedTokens['layout.spacing']?.toString()).toBe('18');

    // Verify that ASTs are cached for all tokens that get parsed
    // All tokens get parsed and cached as ASTs (even literals like '16')
    expect(parsersCache['base.size']).toBeDefined(); // Even literals get parsed
    expect(parsersCache['component.padding']).toBeDefined(); // Has AST
    expect(parsersCache['component.margin']).toBeDefined(); // Has AST
    expect(parsersCache['layout.spacing']).toBeDefined(); // Has AST

    // Verify the ASTs are actual AST nodes with nodeType property
    expect(parsersCache['base.size']).toHaveProperty('nodeType');
    expect(parsersCache['component.padding']).toHaveProperty('nodeType');
    expect(parsersCache['component.margin']).toHaveProperty('nodeType');
    expect(parsersCache['layout.spacing']).toHaveProperty('nodeType');
  });

  it('should reuse interpreter instance for multiple token resolutions', () => {
    const tokens = {
      'color.primary': '#ff0000',
      'color.secondary': '{color.primary}',
      'color.tertiary': 'lighten({color.secondary}, 0.2)',
      'spacing.small': '8',
      'spacing.medium': '{spacing.small} * 2',
      'spacing.large': '{spacing.medium} * 1.5'
    };

    const resolver = new TokenSetResolver(tokens);
    
    // Access the private referenceCache to verify it's being reused
    const referenceCache = (resolver as any).referenceCache;
    const setAstSpy = vi.spyOn(referenceCache, 'setAst');
    const setReferencesSpy = vi.spyOn(referenceCache, 'setReferences');
    const interpretSpy = vi.spyOn(referenceCache, 'interpret');

    const result = resolver.resolve();

    // Verify tokens were resolved
    expect(result.resolvedTokens['color.primary']?.toString()).toBe('#ff0000');
    expect(result.resolvedTokens['color.secondary']?.toString()).toBe('#ff0000');
    expect(result.resolvedTokens['spacing.small']?.toString()).toBe('8');
    expect(result.resolvedTokens['spacing.medium']?.toString()).toBe('16');
    expect(result.resolvedTokens['spacing.large']?.toString()).toBe('24');

    // Verify the interpreter instance was reused
    // setAst should be called for each token that has an AST (not literals)
    expect(setAstSpy).toHaveBeenCalled();
    expect(setReferencesSpy).toHaveBeenCalled();
    expect(interpretSpy).toHaveBeenCalled();

    // The number of setAst calls should equal the number of tokens that have ASTs
    // All tokens except literals that don't need interpretation get parsed
    // color.primary and spacing.small are literals but still get parsed
    // So we expect 6 calls: all tokens get parsed and cached
    const allTokens = ['color.primary', 'color.secondary', 'color.tertiary', 'spacing.small', 'spacing.medium', 'spacing.large'];
    expect(setAstSpy).toHaveBeenCalledTimes(allTokens.length);

    setAstSpy.mockRestore();
    setReferencesSpy.mockRestore();
    interpretSpy.mockRestore();
  });
});
