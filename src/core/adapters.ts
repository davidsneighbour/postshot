import type { SocialNetworkAdapter } from './types.js';
import { CliError } from './errors.js';
import { MastodonAdapter } from '../adapters/mastodon-adapter.js';

const adapters: SocialNetworkAdapter[] = [
  new MastodonAdapter(),
];

export function resolveAdapter(inputUrl: URL): SocialNetworkAdapter {
  const adapter = adapters.find((candidate) => candidate.detect(inputUrl.toString()));

  if (!adapter) {
    throw new CliError(`No adapter is available for URL: ${inputUrl.toString()}`);
  }

  return adapter;
}
