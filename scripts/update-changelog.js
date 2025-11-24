#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const version = process.argv[2];

if (!version) {
  console.error("Error: Version number required");
  console.error("Usage: node update-changelog.js <version>");
  process.exit(1);
}

const changelogPath = join(__dirname, "..", "CHANGELOG.md");

try {
  const changelog = readFileSync(changelogPath, "utf8");
  const today = new Date().toISOString().split("T")[0];

  // Count UNRELEASED sections
  const unreleasedMatches = changelog.match(/## UNRELEASED - \d{4}-\d{2}-\d{2}/g);
  const unreleasedCount = unreleasedMatches ? unreleasedMatches.length : 0;

  // Replace only the first occurrence of UNRELEASED with the version and date
  const updated = changelog.replace(
    /## UNRELEASED - \d{4}-\d{2}-\d{2}/,
    `## [${version}] - ${today}`,
  );

  if (changelog === updated) {
    console.warn("Warning: No UNRELEASED section found in CHANGELOG.md");
  } else {
    writeFileSync(changelogPath, updated, "utf8");
    console.log(`✓ Updated CHANGELOG.md: UNRELEASED → ${version}`);
    if (unreleasedCount > 1) {
      console.log(`  (${unreleasedCount - 1} other UNRELEASED section(s) remain)`);
    }
  }
} catch (error) {
  console.error("Error updating changelog:", error.message);
  process.exit(1);
}
