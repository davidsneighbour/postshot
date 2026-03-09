import fs from 'node:fs/promises';
import path from 'node:path';
import type { ThemeConfig } from './types.js';
import { optionalProp } from './helpers.js';

interface ThemeFileConfig {
  postClassName?: string;
  bodyClassName?: string;
  background?: {
    type?: 'solid' | 'gradient';
    color?: string;
    gradientFrom?: string;
    gradientTo?: string;
    gradientAngle?: number;
  };
  fonts?: {
    body?: string;
    heading?: string;
    monospace?: string;
  };
  variables?: Record<string, string>;
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function loadTheme(themeRoot: string, themeName: string): Promise<ThemeConfig> {
  const themeDirectory = path.join(themeRoot, themeName);
  const templatePath = path.join(themeDirectory, 'post.hbs');
  const stylesheetPath = path.join(themeDirectory, 'post.css');
  const configPath = path.join(themeDirectory, 'theme.json');
  const assetsDirectoryCandidate = path.join(themeDirectory, 'assets');

  const [hasTemplate, hasStylesheet, hasConfig, hasAssetsDirectory] = await Promise.all([
    exists(templatePath),
    exists(stylesheetPath),
    exists(configPath),
    exists(assetsDirectoryCandidate),
  ]);

  if (!hasTemplate) {
    throw new Error(`Theme template not found: ${templatePath}`);
  }

  if (!hasStylesheet) {
    throw new Error(`Theme stylesheet not found: ${stylesheetPath}`);
  }

  const fileConfig: ThemeFileConfig = hasConfig
    ? (JSON.parse(await fs.readFile(configPath, 'utf8')) as ThemeFileConfig)
    : {};

  return {
    name: themeName,
    themeDirectory,
    templatePath,
    stylesheetPath,
    ...optionalProp('assetsDirectory', hasAssetsDirectory ? assetsDirectoryCandidate : undefined),
    postClassName: fileConfig.postClassName ?? 'postshot-post',
    bodyClassName: fileConfig.bodyClassName ?? 'postshot-body',
    background: {
      type: fileConfig.background?.type ?? 'solid',
      color: fileConfig.background?.color ?? '#111111',
      gradientFrom: fileConfig.background?.gradientFrom ?? '#111111',
      gradientTo: fileConfig.background?.gradientTo ?? '#333333',
      gradientAngle: fileConfig.background?.gradientAngle ?? 135,
    },
    fonts: {
      body: fileConfig.fonts?.body ?? 'Inter, system-ui, sans-serif',
      heading: fileConfig.fonts?.heading ?? 'Inter, system-ui, sans-serif',
      monospace: fileConfig.fonts?.monospace ?? 'ui-monospace, SFMono-Regular, monospace',
    },
    variables: fileConfig.variables ?? {},
  };
}
