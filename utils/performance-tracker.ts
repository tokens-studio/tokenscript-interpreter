import chalk from "chalk";

export interface PerformanceData {
  name: string;
  inputTokens: number;
  outputTokens: number;
  duration: number; // in seconds
  tokensPerSecond: number;
}

export interface PerformanceSummary {
  timingData: PerformanceData[];
  totalDuration: number; // in seconds
  totalInputTokens: number;
  totalOutputTokens: number;
  averageTokensPerSecond: number;
  fastestTheme: PerformanceData;
  slowestTheme: PerformanceData;
}

export class PerformanceTracker {
  private timingData: PerformanceData[] = [];
  private overallStartTime: number = 0;

  /**
   * Start tracking overall performance
   */
  public startTracking(): void {
    this.overallStartTime = Date.now();
    this.timingData = [];
  }

  /**
   * Add performance data for a single operation
   */
  public addEntry(
    name: string,
    inputTokens: number,
    outputTokens: number,
    startTime: number,
    endTime: number
  ): void {
    const duration = (endTime - startTime) / 1000;
    const tokensPerSecond = outputTokens / Math.max(duration, 0.001); // Avoid division by zero

    this.timingData.push({
      name,
      inputTokens,
      outputTokens,
      duration,
      tokensPerSecond,
    });
  }

  /**
   * Get performance summary data
   */
  public getSummary(): PerformanceSummary {
    const totalDuration = (Date.now() - this.overallStartTime) / 1000;
    const totalInputTokens = this.timingData.reduce((sum, d) => sum + d.inputTokens, 0);
    const totalOutputTokens = this.timingData.reduce((sum, d) => sum + d.outputTokens, 0);
    const averageTokensPerSecond = totalOutputTokens / Math.max(totalDuration, 0.001);

    const fastestTheme = this.timingData.reduce((fastest, current) =>
      current.tokensPerSecond > fastest.tokensPerSecond ? current : fastest
    );
    const slowestTheme = this.timingData.reduce((slowest, current) =>
      current.tokensPerSecond < slowest.tokensPerSecond ? current : slowest
    );

    return {
      timingData: [...this.timingData],
      totalDuration,
      totalInputTokens,
      totalOutputTokens,
      averageTokensPerSecond,
      fastestTheme,
      slowestTheme,
    };
  }

  /**
   * Display formatted performance summary to console
   */
  public displaySummary(): void {
    const summary = this.getSummary();

    console.log(`\n${chalk.cyan("=".repeat(80))}`);
    console.log(chalk.cyan.bold("🚀 PERFORMANCE SUMMARY"));
    console.log(chalk.cyan("=".repeat(80)));

    // Table header
    console.log(
      chalk.bold(
        "Theme".padEnd(30) +
          "Input".padStart(12) +
          "Output".padStart(12) +
          "Time (s)".padStart(12) +
          "Tokens/s".padStart(14)
      )
    );
    console.log(chalk.gray("-".repeat(80)));

    // Table rows
    for (const data of summary.timingData) {
      const name = data.name.length > 29 ? `${data.name.substring(0, 26)}...` : data.name;
      const tokensPerSec =
        data.tokensPerSecond > 999999 ? "∞" : Math.round(data.tokensPerSecond).toLocaleString();

      // Color code based on performance
      const speedColor = this.getSpeedColor(data.tokensPerSecond);

      console.log(
        chalk.cyan(name.padEnd(30)) +
          chalk.blue(data.inputTokens.toLocaleString().padStart(12)) +
          chalk.green(data.outputTokens.toLocaleString().padStart(12)) +
          chalk.yellow(data.duration.toFixed(3).padStart(12)) +
          speedColor(tokensPerSec.padStart(14))
      );
    }

    console.log(chalk.gray("-".repeat(80)));

    // Summary statistics
    const totalSpeedColor = this.getSpeedColor(summary.averageTokensPerSecond);

    console.log(
      chalk.bold("TOTAL".padEnd(30)) +
        chalk.blue(summary.totalInputTokens.toLocaleString().padStart(12)) +
        chalk.green(summary.totalOutputTokens.toLocaleString().padStart(12)) +
        chalk.yellow(summary.totalDuration.toFixed(3).padStart(12)) +
        totalSpeedColor(Math.round(summary.averageTokensPerSecond).toLocaleString().padStart(14))
    );

    console.log(chalk.cyan("\n📊 Summary:"));
    console.log(
      chalk.white("   • Total themes processed: ") + chalk.cyan(summary.timingData.length)
    );
    console.log(
      chalk.white("   • Total tokens resolved: ") +
        chalk.green(summary.totalOutputTokens.toLocaleString())
    );
    console.log(
      chalk.white("   • Total processing time: ") +
        chalk.yellow(`${summary.totalDuration.toFixed(3)}s`)
    );
    console.log(
      chalk.white("   • Average throughput: ") +
        totalSpeedColor(
          `${Math.round(summary.averageTokensPerSecond).toLocaleString()} tokens/second`
        )
    );

    console.log(
      chalk.white("   • Fastest theme: ") +
        chalk.green(summary.fastestTheme.name) +
        chalk.gray(
          ` (${Math.round(summary.fastestTheme.tokensPerSecond).toLocaleString()} tokens/s)`
        )
    );
    console.log(
      chalk.white("   • Slowest theme: ") +
        chalk.red(summary.slowestTheme.name) +
        chalk.gray(
          ` (${Math.round(summary.slowestTheme.tokensPerSecond).toLocaleString()} tokens/s)`
        )
    );
    console.log(chalk.cyan("=".repeat(80)));
  }

  /**
   * Get color function based on performance speed
   */
  private getSpeedColor(tokensPerSecond: number): typeof chalk.green {
    return tokensPerSecond > 20000
      ? chalk.green
      : tokensPerSecond > 10000
        ? chalk.yellow
        : chalk.red;
  }

  /**
   * Reset the tracker for a new session
   */
  public reset(): void {
    this.timingData = [];
    this.overallStartTime = 0;
  }
}

/**
 * Utility function to create and use a performance tracker for a simple operation
 */
export function trackPerformance<T>(
  operation: () => T,
  name: string,
  inputCount: number = 0
): { result: T; performanceData: PerformanceData } {
  const startTime = Date.now();
  const result = operation();
  const endTime = Date.now();

  const duration = (endTime - startTime) / 1000;
  const outputCount =
    typeof result === "object" && result !== null ? Object.keys(result).length : 1;
  const tokensPerSecond = outputCount / Math.max(duration, 0.001);

  const performanceData: PerformanceData = {
    name,
    inputTokens: inputCount,
    outputTokens: outputCount,
    duration,
    tokensPerSecond,
  };

  return { result, performanceData };
}
