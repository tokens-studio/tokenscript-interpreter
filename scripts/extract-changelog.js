#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const version = process.argv[2];

if (!version) {
  console.error("Usage: node extract-changelog.js <version>");
  process.exit(1);
}

const changelogPath = join(__dirname, "..", "CHANGELOG.md");
const changelog = readFileSync(changelogPath, "utf8");

const lines = changelog.split("\n");
let inSection = false;
const content = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.match(new RegExp(`^## \\[${version.replace(/\./g, "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}`))) {
    inSection = true;
    continue;
  }

  if (inSection) {
    if (line.match(/^## /)) {
      break;
    }
    content.push(line);
  }
}

if (content.length === 0) {
  console.log(
    `Release version ${version}\n\nSee [CHANGELOG.md](https://github.com/tokens-studio/tokenscript-interpreter/blob/main/CHANGELOG.md) for details.`,
  );
} else {
  console.log(content.join("\n").trim());
}
