#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RELEASE_TYPES = ["patch", "minor", "major"];

function log(message, prefix = "ℹ") {
  console.log(`${prefix} ${message}`);
}

function error(message) {
  console.error(`✗ ${message}`);
}

function success(message) {
  console.log(`✓ ${message}`);
}

function exec(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: "utf8",
      stdio: options.silent ? "pipe" : "inherit",
      ...options,
    });
    return result?.trim();
  } catch (err) {
    if (options.allowError) {
      return null;
    }
    throw err;
  }
}

function hasUncommittedChanges() {
  const status = exec("git status --porcelain", { silent: true });
  return status.length > 0;
}

function calculateNextVersion(releaseType) {
  const currentVersion = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf8"),
  ).version;
  const [major, minor, patch] = currentVersion.split(".").map(Number);

  if (releaseType === "major") return `${major + 1}.0.0`;
  if (releaseType === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function updateChangelog(version) {
  const changelogPath = join(__dirname, "..", "CHANGELOG.md");
  const changelog = readFileSync(changelogPath, "utf8");
  const today = new Date().toISOString().split("T")[0];

  if (!changelog.includes("## [Unreleased]")) {
    error("No [Unreleased] section found in CHANGELOG.md");
    process.exit(1);
  }

  const updated = changelog.replace(
    /## \[Unreleased\]/i,
    `## [Unreleased]\n\n## [${version}] - ${today}`,
  );

  writeFileSync(changelogPath, updated, "utf8");
  success(`Updated CHANGELOG.md with version ${version}`);
}

function main() {
  const releaseType = process.argv[2];
  const isDryRun = process.argv.includes("--dry-run");

  if (!releaseType || !RELEASE_TYPES.includes(releaseType)) {
    error(`Invalid release type: ${releaseType || "(none)"}`);
    log(`Usage: npm run release <patch|minor|major> [--dry-run]`);
    process.exit(1);
  }

  if (isDryRun) {
    log("DRY RUN MODE - No changes will be made");
    log("");
  }

  log(`Starting ${releaseType} release...`);
  log("");

  if (hasUncommittedChanges()) {
    error("You have uncommitted changes. Please commit or stash them first.");
    process.exit(1);
  }

  const currentBranch = exec("git branch --show-current", { silent: true });
  if (currentBranch !== "main") {
    error(`You must be on the main branch to release (currently on: ${currentBranch})`);
    process.exit(1);
  }

  const newVersion = calculateNextVersion(releaseType);
  log(`Calculated next version: ${newVersion}`);
  log("");

  log("1/6 Updating CHANGELOG...");
  if (isDryRun) {
    log(`  [DRY RUN] Would update CHANGELOG.md with version ${newVersion}`);
    log("  [DRY RUN] Would commit CHANGELOG.md");
  } else {
    updateChangelog(newVersion);
    exec("git add CHANGELOG.md");
    exec('git commit -m "chore: update CHANGELOG for release"');
    success("CHANGELOG committed");
  }
  log("");

  log("2/6 Running tests...");
  if (isDryRun) {
    log("  [DRY RUN] Would run: npm test");
  } else {
    exec("npm test");
    success("Tests passed");
  }
  log("");

  log("3/6 Building project...");
  if (isDryRun) {
    log("  [DRY RUN] Would run: npm run build");
  } else {
    exec("npm run build");
    success("Build completed");
  }
  log("");

  log("4/6 Creating version bump and git tag...");
  if (isDryRun) {
    log(`  [DRY RUN] Would run: npm version ${releaseType}`);
  } else {
    exec(`npm version ${releaseType} -m "chore: release v%s"`);
    success(`Version bumped to ${newVersion}`);
  }
  log("");

  log("5/6 Publishing to npm...");
  if (isDryRun) {
    log("  [DRY RUN] Would run: npm publish");
  } else {
    exec("npm publish");
    success("Published to npm");
  }
  log("");

  log("6/6 Pushing to remote...");
  if (isDryRun) {
    log("  [DRY RUN] Would run: git push --follow-tags");
  } else {
    exec("git push --follow-tags");
    success("Pushed commits and tags to remote");
  }
  log("");

  if (isDryRun) {
    success(`Dry run completed! No changes were made.`);
    log("");
    log("To perform the actual release, run:");
    log(`  npm run release ${releaseType}`);
  } else {
    success(`Release v${newVersion} completed successfully! 🎉`);
    log("");
    log("Next steps:");
    log("  - GitHub will automatically create a release from the tag");
    log(
      `  - Check: https://github.com/tokens-studio/tokenscript-interpreter/releases/tag/v${newVersion}`,
    );
  }
}

main();
