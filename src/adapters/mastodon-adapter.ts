import type {
  LinkCard,
  MediaAttachment,
  SocialMetrics,
  SocialPostData,
} from '../core/types.js';
import { optionalProp } from '../core/helpers.js';

interface MastodonAccount {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  url?: string | null;
  avatar?: string | null;
}

interface MastodonMediaAttachment {
  type?: string | null;
  url?: string | null;
  preview_url?: string | null;
  description?: string | null;
}

interface MastodonCard {
  title?: string | null;
  description?: string | null;
  url?: string | null;
  image?: string | null;
}

interface MastodonStatus {
  id: string;
  url: string;
  content: string;
  created_at: string;
  language?: string | null;
  sensitive?: boolean | null;
  spoiler_text?: string | null;
  replies_count?: number | null;
  reblogs_count?: number | null;
  favourites_count?: number | null;
  bookmarks_count?: number | null;
  media_attachments: MastodonMediaAttachment[];
  card?: MastodonCard | null;
  account: MastodonAccount;
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseStatusUrl(url: string): { apiUrl: string } {
  const parsed = new URL(url);

  const match = parsed.pathname.match(/\/@[^/]+(?:@[^/]+)?\/(\d+)$/);
  if (!match?.[1]) {
    throw new Error(`Unsupported Mastodon status URL: ${url}`);
  }

  const statusId = match[1];
  const apiUrl = `${parsed.protocol}//${parsed.host}/api/v1/statuses/${statusId}`;

  return { apiUrl };
}

function normaliseMediaType(type: string | null | undefined): MediaAttachment['type'] {
  if (type === 'image' || type === 'gifv' || type === 'video' || type === 'audio') {
    return type;
  }

  return 'unknown';
}

function buildMediaAttachment(attachment: MastodonMediaAttachment): MediaAttachment {
  return {
    type: normaliseMediaType(attachment.type),
    url: attachment.url ?? '',
    ...optionalProp('previewUrl', attachment.preview_url ?? undefined),
    ...optionalProp('description', attachment.description ?? undefined),
  };
}

function buildMetrics(status: MastodonStatus): SocialMetrics {
  return {
    ...optionalProp(
      'repliesCount',
      typeof status.replies_count === 'number' ? status.replies_count : undefined
    ),
    ...optionalProp(
      'reblogsCount',
      typeof status.reblogs_count === 'number' ? status.reblogs_count : undefined
    ),
    ...optionalProp(
      'favouritesCount',
      typeof status.favourites_count === 'number' ? status.favourites_count : undefined
    ),
    ...optionalProp(
      'bookmarksCount',
      typeof status.bookmarks_count === 'number' ? status.bookmarks_count : undefined
    ),
  };
}

function buildCard(card: MastodonCard | null | undefined): LinkCard | undefined {
  if (!card) {
    return undefined;
  }

  const result: LinkCard = {
    ...optionalProp('title', card.title ?? undefined),
    ...optionalProp('description', card.description ?? undefined),
    ...optionalProp('url', card.url ?? undefined),
    ...optionalProp('image', card.image ?? undefined),
  };

  return Object.keys(result).length > 0 ? result : undefined;
}

export class MastodonAdapter {
  public detect(url: string): boolean {
    try {
      const parsed = new URL(url);
      return /\/@[^/]+(?:@[^/]+)?\/\d+$/.test(parsed.pathname);
    } catch {
      return false;
    }
  }

  public async fetchPost(url: string): Promise<SocialPostData> {
    const { apiUrl } = parseStatusUrl(url);

    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'postshot/0.2.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Mastodon status: ${response.status} ${response.statusText}`);
    }

    const status = (await response.json()) as MastodonStatus;

    const media: MediaAttachment[] = status.media_attachments.map(buildMediaAttachment);
    const card = buildCard(status.card);

    return {
      network: 'mastodon',
      url: status.url,
      id: status.id,
      contentHtml: status.content,
      contentText: stripHtml(status.content),
      createdAt: status.created_at,
      ...optionalProp('language', status.language ?? undefined),
      ...optionalProp('sensitive', typeof status.sensitive === 'boolean' ? status.sensitive : undefined),
      ...optionalProp('spoilerText', status.spoiler_text ?? undefined),
      author: {
        displayName: status.account.display_name || status.account.username,
        handle: `@${status.account.acct}`,
        ...optionalProp('profileUrl', status.account.url ?? undefined),
        ...optionalProp('avatarUrl', status.account.avatar ?? undefined),
      },
      media,
      metrics: buildMetrics(status),
      ...optionalProp('card', card),
    };
  }
}
