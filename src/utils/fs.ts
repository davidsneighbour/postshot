import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function ensureParentDirectory(filePath: string): Promise<void> {
  const parentDirectory = path.dirname(filePath);
  await mkdir(parentDirectory, { recursive: true });
}

export async function readUtf8File(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}

export async function writeUtf8File(filePath: string, contents: string): Promise<void> {
  await ensureParentDirectory(filePath);
  await writeFile(filePath, contents, 'utf8');
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const contents = await readUtf8File(filePath);
  return JSON.parse(contents) as T;
}
