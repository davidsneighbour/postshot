import fs from 'node:fs/promises';
import extractChunks from 'png-chunks-extract';
import encodeChunks from 'png-chunks-encode';
import pngChunkText from 'png-chunk-text';
import type { OutputFormat, SocialPostData } from './types.js';
import { ensureParentDirectory } from '../utils/fs.js';

function normaliseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function generateAltText(post: SocialPostData): string {
  const parts: string[] = [];

  parts.push(`${post.author.displayName} (${post.author.handle}) on ${post.network}.`);

  if (post.contentText.length > 0) {
    parts.push(normaliseWhitespace(post.contentText));
  }

  const metricParts: string[] = [];

  if (typeof post.metrics.repliesCount === 'number') {
    metricParts.push(`${post.metrics.repliesCount} replies`);
  }

  if (typeof post.metrics.reblogsCount === 'number') {
    metricParts.push(`${post.metrics.reblogsCount} reposts`);
  }

  if (typeof post.metrics.favouritesCount === 'number') {
    metricParts.push(`${post.metrics.favouritesCount} likes`);
  }

  if (typeof post.metrics.bookmarksCount === 'number') {
    metricParts.push(`${post.metrics.bookmarksCount} bookmarks`);
  }

  if (metricParts.length > 0) {
    parts.push(`Metrics: ${metricParts.join(', ')}.`);
  }

  if (post.media.length > 0) {
    parts.push(`Contains ${post.media.length} media attachment${post.media.length === 1 ? '' : 's'}.`);
  }

  if (post.card?.title) {
    parts.push(`Linked card: ${post.card.title}.`);
  }

  return normaliseWhitespace(parts.join(' '));
}

export async function writeAltTextSidecar(outputPath: string, altText: string): Promise<void> {
  const altTextPath = `${outputPath}.alt.txt`;
  await ensureParentDirectory(altTextPath);
  await fs.writeFile(altTextPath, `${altText}\n`, 'utf8');
}

export function embedAltTextInPngBuffer(buffer: Buffer, altText: string): Buffer {
  const chunks = extractChunks(new Uint8Array(buffer));
  const textChunk = pngChunkText.encode('Description', altText);

  const iendIndex = chunks.findIndex((chunk) => chunk.name === 'IEND');
  const insertAt = iendIndex >= 0 ? iendIndex : chunks.length;

  const updatedChunks = [
    ...chunks.slice(0, insertAt),
    textChunk,
    ...chunks.slice(insertAt),
  ];

  return Buffer.from(encodeChunks(updatedChunks));
}

export async function embedAltTextIfPossible(
  outputPath: string,
  outputFormat: OutputFormat,
  imageBuffer: Buffer,
  altText: string
): Promise<Buffer> {
  if (outputFormat === 'png') {
    return embedAltTextInPngBuffer(imageBuffer, altText);
  }

  await writeAltTextSidecar(outputPath, altText);
  return imageBuffer;
}
