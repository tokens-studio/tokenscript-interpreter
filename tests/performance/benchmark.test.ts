import { describe, it, expect } from 'vitest';
import { TokenSetResolver } from '../../tokenset-processor';

describe('Performance Benchmark', () => {
  it('should efficiently resolve large token sets', () => {
    // Create a large token set with dependencies
    const tokens: Record<string, string> = {};
    
    // Base tokens
    for (let i = 0; i < 50; i++) {
      tokens[`base.size.${i}`] = `${i + 8}`;
      tokens[`base.color.${i}`] = `#${(i * 4).toString(16).padStart(6, '0')}`;
    }
    
    // Derived tokens that reference base tokens
    for (let i = 0; i < 50; i++) {
      tokens[`component.padding.${i}`] = `{base.size.${i}} * 2`;
      tokens[`component.margin.${i}`] = `{component.padding.${i}} + 4`;
      tokens[`layout.spacing.${i}`] = `{component.margin.${i}} / 2`;
    }
    
    // Complex expressions
    for (let i = 0; i < 25; i++) {
      tokens[`complex.calc.${i}`] = `({base.size.${i}} + {base.size.${i + 1}}) * {base.size.${i + 2}}`;
    }
    
    console.log(`\n🔄 Benchmarking resolution of ${Object.keys(tokens).length} tokens...`);
    
    const startTime = performance.now();
    const resolver = new TokenSetResolver(tokens);
    const result = resolver.resolve();
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    const tokensPerSecond = Math.round(Object.keys(tokens).length / (duration / 1000));
    
    console.log(`⚡ Resolved ${Object.keys(result.resolvedTokens).length} tokens in ${duration.toFixed(2)}ms`);
    console.log(`📊 Performance: ${tokensPerSecond.toLocaleString()} tokens/second`);
    
    // Verify some results
    expect(result.resolvedTokens['base.size.0']?.toString()).toBe('8');
    expect(result.resolvedTokens['component.padding.0']?.toString()).toBe('16');
    expect(result.resolvedTokens['component.margin.0']?.toString()).toBe('20');
    expect(result.resolvedTokens['layout.spacing.0']?.toString()).toBe('10');
    
    // Verify complex calculations
    expect(result.resolvedTokens['complex.calc.0']?.toString()).toBe('170'); // (8 + 9) * 10 = 170
    
    // Should be reasonably fast (this is a rough benchmark)
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    expect(tokensPerSecond).toBeGreaterThan(100); // Should process at least 100 tokens/second
    
    // Verify no errors or warnings for valid tokens
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
  
  it('should demonstrate AST caching efficiency', () => {
    // Create tokens that would benefit from AST caching
    const tokens = {
      'base.unit': '8',
      'scale.small': '0.75',
      'scale.medium': '1',
      'scale.large': '1.25',
      'scale.xlarge': '1.5',
      
      // These all use similar expressions but with different references
      'spacing.xs': '{base.unit} * {scale.small}',
      'spacing.sm': '{base.unit} * {scale.medium}',
      'spacing.md': '{base.unit} * {scale.large}',
      'spacing.lg': '{base.unit} * {scale.xlarge}',
      
      // Nested dependencies
      'component.padding.xs': '{spacing.xs} + 2',
      'component.padding.sm': '{spacing.sm} + 2',
      'component.padding.md': '{spacing.md} + 2',
      'component.padding.lg': '{spacing.lg} + 2',
      
      // Complex nested expressions
      'layout.gap.xs': '({component.padding.xs} + {spacing.xs}) / 2',
      'layout.gap.sm': '({component.padding.sm} + {spacing.sm}) / 2',
      'layout.gap.md': '({component.padding.md} + {spacing.md}) / 2',
      'layout.gap.lg': '({component.padding.lg} + {spacing.lg}) / 2',
    };
    
    const startTime = performance.now();
    const resolver = new TokenSetResolver(tokens);
    const result = resolver.resolve();
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    
    // Verify results
    expect(result.resolvedTokens['spacing.xs']?.toString()).toBe('6'); // 8 * 0.75 = 6
    expect(result.resolvedTokens['spacing.sm']?.toString()).toBe('8'); // 8 * 1 = 8
    expect(result.resolvedTokens['component.padding.xs']?.toString()).toBe('8'); // 6 + 2 = 8
    expect(result.resolvedTokens['layout.gap.xs']?.toString()).toBe('7'); // (8 + 6) / 2 = 7
    
    console.log(`\n🎯 AST Caching Demo: Resolved ${Object.keys(tokens).length} interdependent tokens in ${duration.toFixed(2)}ms`);

    // Should be very fast due to AST caching
    expect(duration).toBeLessThan(100); // Should complete in under 100ms
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('should demonstrate interpreter reuse efficiency', () => {
    // Create a scenario that would have been very slow with the old approach
    // (creating new Interpreter instances for each token)
    const tokens: Record<string, string> = {};

    // Create a chain of dependencies where each token depends on the previous one
    tokens['base'] = '10';
    for (let i = 1; i <= 100; i++) {
      tokens[`chain.${i}`] = `{${i === 1 ? 'base' : `chain.${i-1}`}} + 1`;
    }

    console.log(`\n⚡ Interpreter Reuse Demo: Resolving ${Object.keys(tokens).length} chained dependencies...`);

    const startTime = performance.now();
    const resolver = new TokenSetResolver(tokens);
    const result = resolver.resolve();
    const endTime = performance.now();

    const duration = endTime - startTime;
    const tokensPerSecond = Math.round(Object.keys(tokens).length / (duration / 1000));

    console.log(`🚀 Resolved ${Object.keys(result.resolvedTokens).length} chained tokens in ${duration.toFixed(2)}ms`);
    console.log(`📈 Performance: ${tokensPerSecond.toLocaleString()} tokens/second`);

    // Verify the chain resolved correctly
    expect(result.resolvedTokens['base']?.toString()).toBe('10');
    expect(result.resolvedTokens['chain.1']?.toString()).toBe('11');
    expect(result.resolvedTokens['chain.50']?.toString()).toBe('60');
    expect(result.resolvedTokens['chain.100']?.toString()).toBe('110');

    // Should be very fast due to interpreter reuse
    expect(duration).toBeLessThan(50); // Should complete in under 50ms
    expect(tokensPerSecond).toBeGreaterThan(2000); // Should process at least 2000 tokens/second
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
