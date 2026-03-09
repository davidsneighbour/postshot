import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, '..');
const assetDirectories = [
  ['themes', 'themes'],
  ['examples', 'examples'],
];

for (const [sourceName, destinationName] of assetDirectories) {
  const sourceDirectory = path.join(projectRoot, sourceName);
  const destinationDirectory = path.join(projectRoot, 'dist', destinationName);

  await mkdir(destinationDirectory, { recursive: true });
  await cp(sourceDirectory, destinationDirectory, { recursive: true, force: true });
}
