import fs from 'node:fs/promises';
import Handlebars from 'handlebars';
import moment from 'moment';
import type { HelperOptions } from 'handlebars';
import type { TemplateRenderData } from './types.js';

Handlebars.registerHelper('ifDefined', function ifDefined(this: unknown, value: unknown, options: HelperOptions) {
  if (value !== undefined && value !== null) {
    return options.fn(this);
  }

  return options.inverse(this);
});

Handlebars.registerHelper('dateFormat', function dateFormat(this: unknown, context: unknown, options: HelperOptions) {
  const format = (options && (options.hash as any)?.format) || 'MMM DD, YYYY';
  try {
    const m = moment(context as any);
    return (m && typeof m.isValid === 'function' && m.isValid()) ? m.format(format) : String(context ?? '');
  } catch (err) {
    return String(context ?? '');
  }
});

export async function loadTemplate(templatePath: string): Promise<HandlebarsTemplateDelegate> {
  const source = await fs.readFile(templatePath, 'utf8');
  return Handlebars.compile(source);
}

export async function loadStylesheet(stylesheetPath: string): Promise<string> {
  return fs.readFile(stylesheetPath, 'utf8');
}

export function buildFontCss(fonts: {
  body: string;
  heading: string;
  monospace: string;
}): string {
  return [
    `--postshot-font-body: ${fonts.body};`,
    `--postshot-font-heading: ${fonts.heading};`,
    `--postshot-font-monospace: ${fonts.monospace};`,
  ].join('\n');
}

export function buildVariableCss(variables: Record<string, string>): string {
  return Object.entries(variables)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n');
}

export async function renderTemplate(
  templatePath: string,
  data: TemplateRenderData
): Promise<string> {
  const template = await loadTemplate(templatePath);
  return template(data);
}
