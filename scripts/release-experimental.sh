set -e

npm version prerelease --preid=experimental --no-git-tag-version
npm run build
npm run build:schemas
npm publish --tag experimental
