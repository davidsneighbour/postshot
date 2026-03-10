#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

function run(command, options = {}) {
  console.log(`\n$ ${command}`);
  execSync(command, { stdio: 'inherit', ...options });
}

const token = process.env.NPM_TOKEN ?? process.env.NODE_AUTH_TOKEN;
if (!token) {
  console.error('Missing npm authentication token. Set NPM_TOKEN (or NODE_AUTH_TOKEN) before publishing.');
  process.exit(1);
}

const originalUserConfig = process.env.NPM_CONFIG_USERCONFIG;
const tempUserConfig = join(process.cwd(), '.npmrc.publish');

try {
  if (!originalUserConfig) {
    process.env.NPM_CONFIG_USERCONFIG = tempUserConfig;
  }

  run(`npm config set //registry.npmjs.org/:_authToken=${token}`);
  run('npm whoami');
  run('npm run build');
  run('npm publish --access public');
} finally {
  if (!originalUserConfig) {
    if (existsSync(tempUserConfig)) {
      rmSync(tempUserConfig);
    }
    delete process.env.NPM_CONFIG_USERCONFIG;
  }
}
