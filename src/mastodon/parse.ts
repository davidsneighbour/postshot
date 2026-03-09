import { CliError } from '../core/errors.js';

export interface ParsedMastodonStatusUrl {
  instanceOrigin: string;
  statusId: string;
}

/**
 * Parse a Mastodon status URL into the instance origin and status identifier.
 */
export function parseMastodonStatusUrl(url: URL): ParsedMastodonStatusUrl {
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const statusId = pathSegments.at(-1);

  if (!statusId || !/^\d+$/u.test(statusId)) {
    throw new CliError(`Could not extract a Mastodon status id from URL: ${url.toString()}`);
  }

  const instanceOrigin = `${url.protocol}//${url.host}`;
  return { instanceOrigin, statusId };
}
