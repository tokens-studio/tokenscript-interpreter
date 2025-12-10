# Scripts

This directory contains automation scripts for the project.

## Release Scripts

### `release.js`

The main release script that handles the complete release workflow.

**Usage:**

```bash
npm run release patch   # For bug fixes (0.0.x)
npm run release minor   # For new features (0.x.0)
npm run release major   # For breaking changes (x.0.0)

# Dry run to preview changes without executing
npm run release patch -- --dry-run
```

**What it does:**

1. **Validation**: Checks for uncommitted changes and ensures you're on the `main` branch
2. **CHANGELOG**: Adds timestamp to the `[Unreleased]` section
3. **Tests**: Runs the full test suite
4. **Build**: Builds the project
5. **Version bump**: Updates version in `package.json` and creates a git tag
6. **Publish**: Publishes to npm registry
7. **Push**: Pushes commits and tags to GitHub

**Requirements:**

- Clean git working directory (no uncommitted changes)
- Must be on `main` branch
- Must have an `[Unreleased]` section in `CHANGELOG.md`
- Must have npm publish credentials configured

### `update-changelog.js`

Legacy script used by npm version hooks (deprecated in favor of `release.js`).

Converts `UNRELEASED` sections to versioned releases with timestamps.

### `extract-changelog.js`

Extracts changelog content for a specific version. Used by the GitHub Actions release workflow.

**Usage:**

```bash
node scripts/extract-changelog.js 1.2.3
```

## GitHub Actions Release Workflow

When you push a tag (via `npm run release`), GitHub Actions automatically:

1. Extracts changelog notes for the version
2. Creates a GitHub Release with the extracted notes
3. Attaches auto-generated release notes from commits

See `.github/workflows/release.yml` for details.

## CHANGELOG Format

The scripts expect the following CHANGELOG format:

```markdown
# Changelog

## [Unreleased]

### Added
- New feature

### Changed
- Modified behavior

## UNRELEASED - 2024-01-15

### Added
- Previous feature

...
```

When you run `npm run release`, the `[Unreleased]` section gets a timestamp added and becomes `## UNRELEASED - YYYY-MM-DD`.
