import { CliError } from '../core/errors.js';
import type { SocialNetworkAdapter, SocialPostData } from '../core/types.js';

/**
 * Scaffold adapter for future Bluesky support.
 */
export class BlueskyAdapter implements SocialNetworkAdapter {
  public readonly network = 'bluesky' as const;

  public canHandleUrl(url: URL): boolean {
    return url.hostname === 'bsky.app' || url.hostname.endsWith('.bsky.app');
  }

  public async fetchPostData(_url: URL): Promise<SocialPostData> {
    throw new CliError(
      'Bluesky URL detected, but the Bluesky adapter is currently a scaffold only. Add AT Protocol fetching in this adapter to enable Bluesky rendering.',
    );
  }
}
