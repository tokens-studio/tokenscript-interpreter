#!/usr/bin/env tsx
/**
 * Script to run TokenScript compliance suite
 * This is NOT exposed to CLI users - it's for internal testing only
 */

import { evaluateStandardCompliance } from "../src/compliance-suite";

interface CliOptions {
  testDir?: string;
  testFile?: string;
  output?: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === "--test-dir" && nextArg) {
      options.testDir = nextArg;
      i++;
    } else if (arg === "--test-file" && nextArg) {
      options.testFile = nextArg;
      i++;
    } else if (arg === "--output" && nextArg) {
      options.output = nextArg;
      i++;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  console.log("🧪 Running TokenScript Compliance Suite...\n");

  const report = await evaluateStandardCompliance({
    dir: options.testDir,
    file: options.testFile,
    output: options.output,
  });

  console.log(`\n✅ Passed: ${report.passed}`);
  console.log(`❌ Failed: ${report.failed}`);
  console.log(`📊 Total: ${report.passed + report.failed}`);

  if (options.output) {
    console.log(`\n📝 Full report written to ${options.output}`);
  } else {
    console.log("\nDetailed Results:");
    report.results.forEach((result, index) => {
      const status = result.status === "passed" ? "✅ PASSED" : "❌ FAILED";
      console.log(`\n${index + 1}. ${status} - ${result.name}`);
      console.log(`   Path: ${result.path}`);
      console.log(`   Expected: ${result.expectedOutput} (${result.expectedOutputType})`);
      console.log(`   Actual: ${result.actualOutput} (${result.actualOutputType})`);
      if (result.expectedErrorCode || result.actualErrorCode) {
        console.log(`   Expected Error Code: ${result.expectedErrorCode ?? "—"}`);
        console.log(`   Actual Error Code:   ${result.actualErrorCode ?? "—"}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
  }

  // Exit with error code if any tests failed
  if (report.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Error running compliance suite:", error);
  process.exit(1);
});
