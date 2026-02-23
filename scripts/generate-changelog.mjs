#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const version = packageJson.version;
const changelogPath = new URL('../CHANGELOG.md', import.meta.url);

const run = (command) => {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

const latestTag = run("git tag --list 'v*' --sort=-creatordate | head -n 1");
const range = latestTag ? `${latestTag}..HEAD` : 'HEAD';
const rawLog = run(`git log ${range} --pretty=format:%s`);

if (!rawLog) {
  console.log('No commits found for changelog generation.');
  process.exit(0);
}

const groups = {
  feat: [],
  fix: [],
  docs: [],
  refactor: [],
  test: [],
  ci: [],
  chore: [],
  other: []
};

for (const line of rawLog.split('\n').filter(Boolean)) {
  const normalized = line.trim();
  const match = /^(feat|fix|docs|refactor|test|ci|chore)(\(.+\))?:\s+(.+)$/i.exec(normalized);
  if (match) {
    groups[match[1].toLowerCase()].push(match[3]);
  } else {
    groups.other.push(normalized);
  }
}

const date = new Date().toISOString().slice(0, 10);
const sectionLines = [`## [${version}] - ${date}`];

const labels = {
  feat: 'Features',
  fix: 'Fixes',
  docs: 'Documentation',
  refactor: 'Refactoring',
  test: 'Tests',
  ci: 'CI',
  chore: 'Chores',
  other: 'Other'
};

for (const key of Object.keys(groups)) {
  if (groups[key].length === 0) continue;
  sectionLines.push(`\n### ${labels[key]}`);
  for (const item of groups[key]) {
    sectionLines.push(`- ${item}`);
  }
}
sectionLines.push('');

const baseContent = existsSync(changelogPath)
  ? readFileSync(changelogPath, 'utf8')
  : '# Changelog\n\nAll notable changes to this project are documented in this file.\n';

if (baseContent.includes(`## [${version}]`)) {
  console.log(`Changelog for version ${version} already exists.`);
  process.exit(0);
}

const newContent = `${baseContent.trimEnd()}\n\n${sectionLines.join('\n')}\n`;
writeFileSync(changelogPath, newContent, 'utf8');
console.log(`Changelog updated: version ${version}`);
