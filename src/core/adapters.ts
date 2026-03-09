import type { SocialNetworkAdapter } from './types.js';
import { CliError } from './errors.js';
import { MastodonAdapter } from '../adapters/mastodon-adapter.js';
import { BlueskyAdapter } from '../adapters/bluesky-adapter.js';

const adapters: SocialNetworkAdapter[] = [
  new MastodonAdapter(),
  new BlueskyAdapter(),
];

export function resolveAdapter(inputUrl: URL): SocialNetworkAdapter {
  const adapter = adapters.find((candidate) => candidate.canHandleUrl(inputUrl));

  if (!adapter) {
    throw new CliError(`No adapter is available for URL: ${inputUrl.toString()}`);
  }

  return adapter;
}
