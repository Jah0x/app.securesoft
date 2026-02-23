#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const packageVersion = packageJson.version;

if (!semverRegex.test(packageVersion)) {
  console.error(`package.json version is not valid semver: ${packageVersion}`);
  process.exit(1);
}

const refType = process.env.GITHUB_REF_TYPE;
const refName = process.env.GITHUB_REF_NAME;

if (refType === 'tag') {
  const rawTag = refName ?? '';
  const normalizedTagVersion = rawTag.startsWith('v') ? rawTag.slice(1) : rawTag;

  if (!semverRegex.test(normalizedTagVersion)) {
    console.error(`Git tag is not valid semver: ${rawTag}`);
    process.exit(1);
  }

  if (normalizedTagVersion !== packageVersion) {
    console.error(
      `Release tag (${rawTag}) does not match package.json version (${packageVersion}).`
    );
    process.exit(1);
  }

  console.log(`Semver check passed for release tag ${rawTag}.`);
  process.exit(0);
}

console.log(
  `Semver check passed: package.json version ${packageVersion} is valid semver.`
);
