import path from 'node:path';
import { existsSync } from 'node:fs';
import type { AppConfigFile } from '../core/types.js';
import { CliError } from '../core/errors.js';
import { readJsonFile } from '../utils/fs.js';

export function findDefaultConfigPath(): string | undefined {
  const candidates = [
    path.resolve(process.cwd(), 'postshot.config.json'),
    path.resolve(process.cwd(), '.postshot.json'),
    path.resolve(process.cwd(), 'social-post-shot.config.json'),
    path.resolve(process.cwd(), '.social-post-shot.json'),
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

export async function loadConfigFile(configPath?: string): Promise<{ path?: string; config: AppConfigFile }> {
  if (!configPath) {
    const foundPath = findDefaultConfigPath();
    if (!foundPath) {
      return { config: {} };
    }

    return {
      path: foundPath,
      config: await readJsonFile<AppConfigFile>(foundPath),
    };
  }

  const absolutePath = path.resolve(process.cwd(), configPath);

  if (!existsSync(absolutePath)) {
    throw new CliError(`Config file was not found: ${absolutePath}`);
  }

  return {
    path: absolutePath,
    config: await readJsonFile<AppConfigFile>(absolutePath),
  };
}
