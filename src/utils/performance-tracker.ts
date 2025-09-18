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
    endTime: number,
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
      current.tokensPerSecond > fastest.tokensPerSecond ? current : fastest,
    );
    const slowestTheme = this.timingData.reduce((slowest, current) =>
      current.tokensPerSecond < slowest.tokensPerSecond ? current : slowest,
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

    console.log(`\n${"=".repeat(80)}`);
    console.log("🚀 PERFORMANCE SUMMARY");
    console.log("=".repeat(80));

    // Table header
    console.log(
      "Theme".padEnd(30) +
        "Input".padStart(12) +
        "Output".padStart(12) +
        "Time (s)".padStart(12) +
        "Tokens/s".padStart(14),
    );
    console.log("-".repeat(80));

    // Table rows
    for (const data of summary.timingData) {
      const name = data.name.length > 29 ? `${data.name.substring(0, 26)}...` : data.name;
      const tokensPerSec =
        data.tokensPerSecond > 999999 ? "∞" : Math.round(data.tokensPerSecond).toLocaleString();

      console.log(
        name.padEnd(30) +
          data.inputTokens.toLocaleString().padStart(12) +
          data.outputTokens.toLocaleString().padStart(12) +
          data.duration.toFixed(3).padStart(12) +
          tokensPerSec.padStart(14),
      );
    }

    console.log("-".repeat(80));

    // Summary statistics

    console.log(
      "TOTAL".padEnd(30) +
        summary.totalInputTokens.toLocaleString().padStart(12) +
        summary.totalOutputTokens.toLocaleString().padStart(12) +
        summary.totalDuration.toFixed(3).padStart(12) +
        Math.round(summary.averageTokensPerSecond).toLocaleString().padStart(14),
    );

    console.log("\n📊 Summary:");
    console.log(`   • Total themes processed: ${summary.timingData.length}`);
    console.log(`   • Total tokens resolved: ${summary.totalOutputTokens.toLocaleString()}`);
    console.log(`   • Total processing time: ${summary.totalDuration.toFixed(3)}s`);
    console.log(
      `   • Average throughput: ${Math.round(summary.averageTokensPerSecond).toLocaleString()} tokens/second`,
    );
    console.log(
      `   • Fastest theme: ${summary.fastestTheme.name} (${Math.round(summary.fastestTheme.tokensPerSecond).toLocaleString()} tokens/s)`,
    );
    console.log(
      `   • Slowest theme: ${summary.slowestTheme.name} (${Math.round(summary.slowestTheme.tokensPerSecond).toLocaleString()} tokens/s)`,
    );
    console.log("=".repeat(80));
  }

  /**
   * Reset the tracker for a new session
   */
  public reset(): void {
    this.timingData = [];
    this.overallStartTime = 0;
  }

  /**
   * Save performance summary to a JSON file
   */
  public saveToFile(filePath: string): void {
    const summary = this.getSummary();
    const fs = require("node:fs");
    const path = require("node:path");

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(summary, null, 2));
    console.log(`✅ Performance data saved to ${filePath}`);
  }
}

/**
 * Utility function to create and use a performance tracker for a simple operation
 */
export function trackPerformance<T>(
  operation: () => T,
  name: string,
  inputCount: number = 0,
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
