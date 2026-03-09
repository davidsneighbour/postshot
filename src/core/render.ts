import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';
import type {
  OutputFormat,
  RenderConfig,
  SocialPostData,
  TemplateRenderData,
  ThemeConfig,
} from './types.js';
import {
  buildFontCss,
  buildVariableCss,
  loadStylesheet,
  renderTemplate,
} from './template-engine.js';

function buildBackgroundCss(config: RenderConfig, theme: ThemeConfig): string {
  if (config.backgroundOverride) {
    return config.backgroundOverride;
  }

  if (theme.background.type === 'gradient') {
    return `linear-gradient(${theme.background.gradientAngle}deg, ${theme.background.gradientFrom}, ${theme.background.gradientTo})`;
  }

  return theme.background.color;
}

function mapScreenshotType(format: OutputFormat): 'png' | 'jpeg' {
  return format === 'jpg' ? 'jpeg' : 'png';
}

async function ensureDirectoryForFile(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function convertBufferForFormat(
  screenshotBuffer: Buffer,
  outputFormat: OutputFormat
): Promise<Buffer> {
  if (outputFormat === 'png') {
    return screenshotBuffer;
  }

  if (outputFormat === 'jpg') {
    return sharp(screenshotBuffer).jpeg({ quality: 92 }).toBuffer();
  }

  if (outputFormat === 'webp') {
    return sharp(screenshotBuffer).webp({ quality: 92 }).toBuffer();
  }

  throw new Error(`Unsupported output format: ${String(outputFormat)}`);
}

export async function renderPostImage(
  config: RenderConfig,
  post: SocialPostData,
  theme: ThemeConfig
): Promise<Buffer> {
  const inlineCss = await loadStylesheet(theme.stylesheetPath);

  const templateData: TemplateRenderData = {
    config,
    post,
    nowIso: new Date().toISOString(),
    backgroundCss: buildBackgroundCss(config, theme),
    inlineCss,
    themeFontCss: buildFontCss(theme.fonts),
    themeVariableCss: buildVariableCss(theme.variables),
  };

  const html = await renderTemplate(theme.templatePath, templateData);

  if (config.debugHtml) {
    const htmlPath = `${config.outputPath}.debug.html`;
    await ensureDirectoryForFile(htmlPath);
    await fs.writeFile(htmlPath, html, 'utf8');
  }

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage({
      viewport: {
        width: config.width,
        height: config.height,
      },
      deviceScaleFactor: 2,
    });

    await page.setContent(html, {
      waitUntil: 'networkidle',
    });

    const screenshotBuffer = await page.screenshot({
      type: mapScreenshotType(config.outputFormat),
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: config.width,
        height: config.height,
      },
    });

    return convertBufferForFormat(screenshotBuffer, config.outputFormat);
  } finally {
    await browser.close();
  }
}

export async function writeRenderedImage(
  config: RenderConfig,
  buffer: Buffer
): Promise<void> {
  await ensureDirectoryForFile(config.outputPath);
  await fs.writeFile(config.outputPath, buffer);
}
