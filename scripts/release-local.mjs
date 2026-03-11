#!/usr/bin/env node
import { execSync } from 'node:child_process';

function run(command, options = {}) {
  console.log(`\n$ ${command}`);
  execSync(command, { stdio: 'inherit', ...options });
}

function isCleanWorkingTree() {
  try {
    execSync('git diff --quiet && git diff --cached --quiet', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const cleanTree = isCleanWorkingTree();
const commitMode = process.env.RELEASE_COMMIT ?? 'auto';

const shouldCommit =
  commitMode === 'always' ||
  (commitMode === 'auto' && cleanTree);

if (!shouldCommit) {
  console.log('Skipping release commit/tag because the working tree is not clean (or RELEASE_COMMIT=never).');
}

const releaseCommand = [
  'npx release-it',
  '--config .release-it.local.json',
  ...(shouldCommit ? [] : ['--no-git.commit', '--no-git.tag']),
  ...process.argv.slice(2)
].join(' ');

run(releaseCommand);
