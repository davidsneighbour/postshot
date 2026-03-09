import { CliError } from '../core/errors.js';
import type { SocialNetworkAdapter, SocialPostData } from '../core/types.js';

/**
 * Scaffold adapter for future Bluesky support.
 */
export class BlueskyAdapter implements SocialNetworkAdapter {
  public readonly network = 'bluesky' as const;

  public detect(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'bsky.app' || parsed.hostname.endsWith('.bsky.app');
    } catch {
      return false;
    }
  }

  public async fetchPost(_url: string): Promise<SocialPostData> {
    throw new CliError(
      'Bluesky URL detected, but the Bluesky adapter is currently a scaffold only. Add AT Protocol fetching in this adapter to enable Bluesky rendering.',
    );
  }
}
