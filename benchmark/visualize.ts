#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import { BenchmarkResult } from './benchmark';

const program = new Command();

program
  .name('benchmark-visualize')
  .description('Visualize benchmark results')
  .version('1.0.0');

program
  .command('show')
  .description('Display benchmark results from JSON files')
  .requiredOption('--files <paths...>', 'Paths to benchmark result JSON files')
  .option('--format <format>', 'Output format (table, chart)', 'table')
  .action(async (options) => {
    try {
      console.log(chalk.cyan('📊 Benchmark Results Visualization'));
      console.log(chalk.cyan('='.repeat(60)));
      
      const results: BenchmarkResult[] = [];
      
      // Load all result files
      for (const filePath of options.files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
          results.push(data);
          console.log(chalk.green(`✅ Loaded results from ${filePath}`));
        } catch (error) {
          console.error(chalk.red(`❌ Error loading ${filePath}: ${error.message}`));
        }
      }
      
      if (results.length === 0) {
        console.error(chalk.red('❌ No valid result files found'));
        process.exit(1);
      }
      
      // Display results based on format
      if (options.format === 'table') {
        displayResultsTable(results);
      } else if (options.format === 'chart') {
        console.log(chalk.yellow('⚠️ Chart visualization requires a terminal that supports Unicode box drawing'));
        displayResultsChart(results);
      } else {
        console.error(chalk.red(`❌ Unknown format: ${options.format}`));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error visualizing results:'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * Display benchmark results as a formatted table
 */
function displayResultsTable(results: BenchmarkResult[]): void {
  console.log('\n' + chalk.cyan('📋 Benchmark Results Table'));
  console.log(chalk.cyan('='.repeat(100)));
  
  // Table header
  console.log(
    chalk.bold(
      'Name'.padEnd(40) +
      'Tokens'.padStart(10) +
      'Avg Time'.padStart(12) +
      'Min Time'.padStart(12) +
      'Max Time'.padStart(12) +
      'Tokens/s'.padStart(14)
    )
  );
  console.log(chalk.gray('-'.repeat(100)));
  
  // Sort results by tokens per second (descending)
  results.sort((a, b) => b.tokensPerSecond - a.tokensPerSecond);
  
  // Table rows
  for (const result of results) {
    const name = result.name.length > 39 ? `${result.name.substring(0, 36)}...` : result.name;
    
    console.log(
      chalk.cyan(name.padEnd(40)) +
      chalk.blue(result.tokenCount.toLocaleString().padStart(10)) +
      chalk.yellow(result.averageTime.toFixed(2).padStart(12)) +
      chalk.green(result.minTime.toFixed(2).padStart(12)) +
      chalk.red(result.maxTime.toFixed(2).padStart(12)) +
      chalk.magenta(result.tokensPerSecond.toLocaleString().padStart(14))
    );
  }
  
  console.log(chalk.gray('-'.repeat(100)));
  
  // Summary
  console.log(chalk.cyan('\n📊 Comparison Summary:'));
  
  if (results.length > 1) {
    const fastest = results[0];
    const slowest = results[results.length - 1];
    const speedup = fastest.tokensPerSecond / slowest.tokensPerSecond;
    
    console.log(chalk.white('   • Fastest: ') + chalk.green(fastest.name));
    console.log(chalk.white('   • Slowest: ') + chalk.red(slowest.name));
    console.log(chalk.white('   • Speed difference: ') + chalk.yellow(`${speedup.toFixed(2)}x`));
  }
  
  console.log(chalk.cyan('='.repeat(100)));
}

/**
 * Display benchmark results as a simple ASCII/Unicode chart
 */
function displayResultsChart(results: BenchmarkResult[]): void {
  console.log('\n' + chalk.cyan('📊 Benchmark Results Chart'));
  console.log(chalk.cyan('='.repeat(100)));
  
  // Sort results by tokens per second (descending)
  results.sort((a, b) => b.tokensPerSecond - a.tokensPerSecond);
  
  // Find the maximum tokens per second for scaling
  const maxTokensPerSecond = Math.max(...results.map(r => r.tokensPerSecond));
  const chartWidth = 50; // Width of the chart in characters
  
  // Display each result as a bar
  for (const result of results) {
    const name = result.name.length > 25 ? `${result.name.substring(0, 22)}...` : result.name.padEnd(25);
    const barLength = Math.round((result.tokensPerSecond / maxTokensPerSecond) * chartWidth);
    const bar = '█'.repeat(barLength);
    
    console.log(
      chalk.cyan(name) + ' ' +
      chalk.yellow(bar) + ' ' +
      chalk.green(`${result.tokensPerSecond.toLocaleString()} tokens/s`)
    );
  }
  
  console.log(chalk.cyan('='.repeat(100)));
}

program.parse();
