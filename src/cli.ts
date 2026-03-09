#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

import { MastodonAdapter } from './adapters/mastodon-adapter.js';
import { BlueskyAdapter } from './adapters/bluesky-adapter.js';
import { embedAltTextIfPossible, generateAltText, writeAltTextSidecar } from './core/alt-text.js';
import { optionalProp } from './core/helpers.js';
import { renderPostImage, writeRenderedImage } from './core/render.js';
import { loadTheme } from './core/theme.js';
import type {
  AspectRatioPreset,
  OutputFormat,
  RenderConfig,
  SocialPostData,
  SupportedNetwork,
} from './core/types.js';

interface CliValues {
  config?: string;
  theme?: string;
  output?: string;
  format?: string;
  width?: string;
  height?: string;
  ratio?: string;
  network?: string;
  background?: string;
  'embed-alt-text'?: boolean;
  'no-embed-alt-text'?: boolean;
  'alt-file'?: boolean;
  'no-alt-file'?: boolean;
  'debug-html'?: boolean;
  'debug-data'?: boolean;
  'dry-run'?: boolean;
  verbose?: boolean;
  help?: boolean;
}

interface ConfigFileData {
  themeName?: string;
  outputFormat?: OutputFormat;
  width?: number;
  height?: number;
  aspectRatio?: AspectRatioPreset;
  network?: SupportedNetwork;
  backgroundOverride?: string;
  embedAltText?: boolean;
  generateAltTextFile?: boolean;
  debugHtml?: boolean;
  debugData?: boolean;
  dryRun?: boolean;
  themeRoot?: string;
  outputDirectory?: string;
}

interface ResolvedOptions {
  url: string;
  configPath?: string;
  themeName: string;
  outputPath: string;
  outputFormat: OutputFormat;
  width: number;
  height: number;
  aspectRatio?: AspectRatioPreset;
  network: SupportedNetwork;
  backgroundOverride?: string;
  embedAltText: boolean;
  generateAltTextFile: boolean;
  debugHtml: boolean;
  debugData: boolean;
  dryRun: boolean;
  verbose: boolean;
  themeRoot: string;
}

interface SocialAdapter {
  detect(url: string): boolean;
  fetchPost(url: string): Promise<SocialPostData>;
}

const DEFAULT_THEME_NAME = 'default';
const DEFAULT_OUTPUT_FORMAT: OutputFormat = 'jpg';
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 675;
const DEFAULT_EMBED_ALT_TEXT = true;
const DEFAULT_GENERATE_ALT_FILE = true;
const DEFAULT_DEBUG_HTML = false;
const DEFAULT_DEBUG_DATA = false;
const DEFAULT_DRY_RUN = false;
const DEFAULT_VERBOSE = false;
const DEFAULT_THEME_ROOT = path.resolve(process.cwd(), 'themes');
const DEFAULT_OUTPUT_DIRECTORY = process.cwd();

const SUPPORTED_OUTPUT_FORMATS = new Set<OutputFormat>(['png', 'jpg', 'webp']);
const SUPPORTED_NETWORKS = new Set<SupportedNetwork>(['mastodon', 'bluesky']);
const SUPPORTED_ASPECT_RATIOS = new Set<AspectRatioPreset>(['1:1', '4:5', '16:9', '9:16', '3:2']);

function printHelp(): void {
  const commandName = path.basename(process.argv[1] ?? 'postshot');

  console.log(`
${commandName} - Turn social posts into clean shareable images

Usage:
  ${commandName} <url> [options]

Options:
  --config <file>             Path to JSON config file
  --theme <name>              Theme name (default: ${DEFAULT_THEME_NAME})
  --output <file>             Output file path
  --format <format>           png | jpg | webp (default: ${DEFAULT_OUTPUT_FORMAT})
  --width <px>                Output width in pixels (default: ${DEFAULT_WIDTH})
  --height <px>               Output height in pixels (default: ${DEFAULT_HEIGHT})
  --ratio <ratio>             1:1 | 4:5 | 16:9 | 9:16 | 3:2
  --network <name>            mastodon | bluesky
  --background <css>          CSS background override
  --embed-alt-text            Embed ALT text when supported
  --no-embed-alt-text         Disable ALT text embedding
  --alt-file                  Write .alt.txt sidecar
  --no-alt-file               Do not write .alt.txt sidecar
  --debug-html                Write debug HTML next to output
  --debug-data                Write fetched post data as JSON next to output
  --dry-run                   Resolve config and fetch post without rendering
  --verbose                   Enable verbose logging
  --help                      Show this help

Notes:
  * CLI options override config file values.
  * PNG supports embedded ALT text in this version.
  * JPG/WEBP currently use sidecar ALT text files as fallback.
`.trim());
}

function logVerbose(enabled: boolean, message: string): void {
  if (enabled) {
    console.log(`[postshot] ${message}`);
  }
}

function fail(message: string): never {
  throw new Error(message);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseOutputFormat(value: unknown): OutputFormat | undefined {
  if (!isNonEmptyString(value)) {
    return undefined;
  }

  const normalised = value.trim().toLowerCase();

  if (SUPPORTED_OUTPUT_FORMATS.has(normalised as OutputFormat)) {
    return normalised as OutputFormat;
  }

  return undefined;
}

function parseSupportedNetwork(value: unknown): SupportedNetwork | undefined {
  if (!isNonEmptyString(value)) {
    return undefined;
  }

  const normalised = value.trim().toLowerCase();

  if (SUPPORTED_NETWORKS.has(normalised as SupportedNetwork)) {
    return normalised as SupportedNetwork;
  }

  return undefined;
}

function parseAspectRatio(value: unknown): AspectRatioPreset | undefined {
  if (!isNonEmptyString(value)) {
    return undefined;
  }

  const normalised = value.trim() as AspectRatioPreset;

  if (SUPPORTED_ASPECT_RATIOS.has(normalised)) {
    return normalised;
  }

  return undefined;
}

function parsePositiveInteger(value: unknown, label: string): number | undefined {
  if (!isNonEmptyString(value)) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    fail(`Invalid ${label}: ${String(value)}`);
  }

  return parsed;
}

function parseBooleanOverride(
  positiveValue: boolean | undefined,
  negativeValue: boolean | undefined,
  defaultValue: boolean
): boolean {
  if (positiveValue === true && negativeValue === true) {
    fail('Conflicting boolean flags were provided.');
  }

  if (negativeValue === true) {
    return false;
  }

  if (positiveValue === true) {
    return true;
  }

  return defaultValue;
}

function getDefaultExtension(format: OutputFormat): string {
  return format;
}

function inferNetworkFromUrl(url: string, adapters: ReadonlyMap<SupportedNetwork, SocialAdapter>): SupportedNetwork {
  for (const [network, adapter] of adapters.entries()) {
    if (adapter.detect(url)) {
      return network;
    }
  }

  fail(`Could not infer network from URL: ${url}`);
}

function buildDefaultOutputPath(
  outputDirectory: string,
  network: SupportedNetwork,
  outputFormat: OutputFormat
): string {
  const timestamp = new Date().toISOString().replaceAll(':', '-');
  const fileName = `postshot-${network}-${timestamp}.${getDefaultExtension(outputFormat)}`;

  return path.resolve(outputDirectory, fileName);
}

function resolveOutputPath(defaultOutputPath: string, outputOption: string | undefined): string {
  if (typeof outputOption === 'string' && outputOption.trim().length > 0) {
    return path.resolve(process.cwd(), outputOption);
  }

  return defaultOutputPath;
}

async function readConfigFile(configPath: string | undefined, verbose: boolean): Promise<ConfigFileData> {
  if (!configPath) {
    return {};
  }

  const absoluteConfigPath = path.resolve(process.cwd(), configPath);
  logVerbose(verbose, `Reading config file: ${absoluteConfigPath}`);

  const fileContent = await fs.readFile(absoluteConfigPath, 'utf8');
  const parsed = JSON.parse(fileContent) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail(`Config file must contain a JSON object: ${absoluteConfigPath}`);
  }

  return parsed as ConfigFileData;
}

async function writeDebugData(outputPath: string, data: SocialPostData): Promise<void> {
  const debugPath = `${outputPath}.debug.json`;
  await fs.writeFile(debugPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function buildRenderConfig(options: ResolvedOptions): RenderConfig {
  return {
    url: options.url,
    network: options.network,
    outputPath: options.outputPath,
    outputFormat: options.outputFormat,
    width: options.width,
    height: options.height,
    themeName: options.themeName,
    embedAltText: options.embedAltText,
    generateAltTextFile: options.generateAltTextFile,
    debugHtml: options.debugHtml,
    debugData: options.debugData,
    dryRun: options.dryRun,
    ...optionalProp('aspectRatio', options.aspectRatio),
    ...optionalProp('backgroundOverride', options.backgroundOverride),
  };
}

function resolveOptions(
  url: string,
  cliValues: CliValues,
  configFile: ConfigFileData,
  adapters: ReadonlyMap<SupportedNetwork, SocialAdapter>
): ResolvedOptions {
  const verbose = cliValues.verbose ?? DEFAULT_VERBOSE;

  const outputFormat =
    parseOutputFormat(cliValues.format) ??
    configFile.outputFormat ??
    DEFAULT_OUTPUT_FORMAT;

  if (cliValues.format && !parseOutputFormat(cliValues.format)) {
    fail(`Unsupported output format: ${cliValues.format}`);
  }

  const aspectRatio =
    parseAspectRatio(cliValues.ratio) ??
    configFile.aspectRatio;

  if (cliValues.ratio && !parseAspectRatio(cliValues.ratio)) {
    fail(`Unsupported aspect ratio: ${cliValues.ratio}`);
  }

  const network =
    parseSupportedNetwork(cliValues.network) ??
    configFile.network ??
    inferNetworkFromUrl(url, adapters);

  if (cliValues.network && !parseSupportedNetwork(cliValues.network)) {
    fail(`Unsupported network: ${cliValues.network}`);
  }

  const width =
    parsePositiveInteger(cliValues.width, 'width') ??
    configFile.width ??
    DEFAULT_WIDTH;

  const height =
    parsePositiveInteger(cliValues.height, 'height') ??
    configFile.height ??
    DEFAULT_HEIGHT;

  const themeName =
    (isNonEmptyString(cliValues.theme) ? cliValues.theme.trim() : undefined) ??
    configFile.themeName ??
    DEFAULT_THEME_NAME;

  const backgroundOverride =
    (isNonEmptyString(cliValues.background) ? cliValues.background.trim() : undefined) ??
    configFile.backgroundOverride;

  const embedAltText = parseBooleanOverride(
    cliValues['embed-alt-text'],
    cliValues['no-embed-alt-text'],
    configFile.embedAltText ?? DEFAULT_EMBED_ALT_TEXT
  );

  const generateAltTextFile = parseBooleanOverride(
    cliValues['alt-file'],
    cliValues['no-alt-file'],
    configFile.generateAltTextFile ?? DEFAULT_GENERATE_ALT_FILE
  );

  const debugHtml = cliValues['debug-html'] ?? configFile.debugHtml ?? DEFAULT_DEBUG_HTML;
  const debugData = cliValues['debug-data'] ?? configFile.debugData ?? DEFAULT_DEBUG_DATA;
  const dryRun = cliValues['dry-run'] ?? configFile.dryRun ?? DEFAULT_DRY_RUN;

  const themeRoot =
    (isNonEmptyString(configFile.themeRoot) ? path.resolve(process.cwd(), configFile.themeRoot) : undefined) ??
    DEFAULT_THEME_ROOT;

  const outputDirectory =
    (isNonEmptyString(configFile.outputDirectory)
      ? path.resolve(process.cwd(), configFile.outputDirectory)
      : undefined) ??
    DEFAULT_OUTPUT_DIRECTORY;

  const defaultOutputPath = buildDefaultOutputPath(outputDirectory, network, outputFormat);
  const outputPath = resolveOutputPath(defaultOutputPath, cliValues.output);

  return {
    url,
    ...optionalProp('configPath', cliValues.config),
    themeName,
    outputPath,
    outputFormat,
    width,
    height,
    network,
    ...optionalProp('aspectRatio', aspectRatio),
    ...optionalProp('backgroundOverride', backgroundOverride),
    embedAltText,
    generateAltTextFile,
    debugHtml,
    debugData,
    dryRun,
    verbose,
    themeRoot,
  };
}

function parseCliArguments(argv: string[]): { values: CliValues; positionals: string[] } {
  const parsed = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      config: { type: 'string' },
      theme: { type: 'string' },
      output: { type: 'string' },
      format: { type: 'string' },
      width: { type: 'string' },
      height: { type: 'string' },
      ratio: { type: 'string' },
      network: { type: 'string' },
      background: { type: 'string' },
      'embed-alt-text': { type: 'boolean' },
      'no-embed-alt-text': { type: 'boolean' },
      'alt-file': { type: 'boolean' },
      'no-alt-file': { type: 'boolean' },
      'debug-html': { type: 'boolean' },
      'debug-data': { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      verbose: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  return {
    values: parsed.values as CliValues,
    positionals: parsed.positionals,
  };
}

async function main(): Promise<void> {
  const { values, positionals } = parseCliArguments(process.argv.slice(2));

  if (values.help) {
    printHelp();
    return;
  }

  if (positionals.length === 0) {
    printHelp();
    fail('Missing required URL argument.');
  }

  const url = positionals[0];
  if (!isNonEmptyString(url)) {
    fail('URL must be a non-empty string.');
  }

  const adapters = new Map<SupportedNetwork, SocialAdapter>([
    ['mastodon', new MastodonAdapter()],
    ['bluesky', new BlueskyAdapter()],
  ]);

  const configFile = await readConfigFile(values.config, values.verbose ?? DEFAULT_VERBOSE);
  const options = resolveOptions(url, values, configFile, adapters);

  logVerbose(options.verbose, `Resolved network: ${options.network}`);
  logVerbose(options.verbose, `Resolved theme: ${options.themeName}`);
  logVerbose(options.verbose, `Resolved output path: ${options.outputPath}`);

  const adapter = adapters.get(options.network);
  if (!adapter) {
    fail(`No adapter registered for network: ${options.network}`);
  }

  logVerbose(options.verbose, `Fetching post data from ${options.url}`);
  const post = await adapter.fetchPost(options.url);

  if (options.debugData) {
    logVerbose(options.verbose, 'Writing debug JSON');
    await writeDebugData(options.outputPath, post);
  }

  const altText = generateAltText(post);

  if (options.dryRun) {
    console.log(JSON.stringify(
      {
        url: options.url,
        network: options.network,
        themeName: options.themeName,
        outputPath: options.outputPath,
        outputFormat: options.outputFormat,
        width: options.width,
        height: options.height,
        aspectRatio: options.aspectRatio,
        altText,
      },
      null,
      2
    ));
    return;
  }

  logVerbose(options.verbose, `Loading theme from ${options.themeRoot}`);
  const theme = await loadTheme(options.themeRoot, options.themeName);

  const renderConfig = buildRenderConfig(options);

  logVerbose(options.verbose, 'Rendering image');
  const imageBuffer = await renderPostImage(renderConfig, post, theme);

  let finalBuffer = imageBuffer;

  if (options.embedAltText) {
    logVerbose(options.verbose, 'Embedding ALT text where supported');
    finalBuffer = await embedAltTextIfPossible(
      options.outputPath,
      options.outputFormat,
      imageBuffer,
      altText
    );
  }

  logVerbose(options.verbose, `Writing output file: ${options.outputPath}`);
  await writeRenderedImage(renderConfig, finalBuffer);

  if (options.generateAltTextFile) {
    logVerbose(options.verbose, 'Writing ALT text sidecar');
    await writeAltTextSidecar(options.outputPath, altText);
  }

  console.log(options.outputPath);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[postshot] ${message}`);
  process.exitCode = 1;
});
