/**
 * Social media handle parser, URL builder and input sanitizer for Taaa.
 * Handles messy user inputs such as:
 * - https://www.tiktok.com/@username
 * - https://tiktok.com/@username?lang=en
 * - @username
 * - username
 * And extracts clean handle, uniform display text, and canonical URL.
 */

export interface CleanSocial {
  /** Clean handle without '@', protocols, or URLs (e.g. "Trench.yaro") */
  handle: string;
  /** Formatted handle for display with '@' where customary (e.g. "@Trench.yaro") */
  display: string;
  /** Valid clickable web URL */
  url: string;
}

export type SocialPlatform = 'instagram' | 'tiktok' | 'facebook' | 'twitter';

export function parseSocialLink(platform: SocialPlatform, rawInput?: string): CleanSocial | null {
  if (!rawInput) return null;
  let val = rawInput.trim();
  if (!val) return null;

  // Strip query parameters and hash
  val = val.split('?')[0].split('#')[0].trim();

  let handle = val;

  if (platform === 'tiktok') {
    handle = handle
      .replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, '')
      .replace(/^tiktok\.com\/@?/i, '');
  } else if (platform === 'instagram') {
    handle = handle
      .replace(/^https?:\/\/(www\.)?instagram\.com\/?/i, '')
      .replace(/^instagram\.com\/?/i, '');
  } else if (platform === 'twitter') {
    handle = handle
      .replace(/^https?:\/\/(www\.)?(twitter|x)\.com\/?/i, '')
      .replace(/^(twitter|x)\.com\/?/i, '');
  } else if (platform === 'facebook') {
    handle = handle
      .replace(/^https?:\/\/(www\.)?facebook\.com\/?/i, '')
      .replace(/^facebook\.com\/?/i, '');
  }

  // Remove leading @ symbols and trailing slashes
  handle = handle.replace(/^@+/, '').replace(/\/+$/, '').trim();

  if (!handle) return null;

  let url = '';
  let display = `@${handle}`;

  switch (platform) {
    case 'tiktok':
      url = `https://tiktok.com/@${handle}`;
      display = `@${handle}`;
      break;
    case 'instagram':
      url = `https://instagram.com/${handle}`;
      display = `@${handle}`;
      break;
    case 'twitter':
      url = `https://x.com/${handle}`;
      display = `@${handle}`;
      break;
    case 'facebook':
      url = `https://facebook.com/${handle}`;
      display = handle;
      break;
  }

  return { handle, display, url };
}

/**
 * Sanitizes input typed or pasted into form fields so only the raw handle is stored.
 */
export function sanitizeSocialInput(platform: SocialPlatform, raw: string): string {
  const parsed = parseSocialLink(platform, raw);
  return parsed ? parsed.handle : raw.replace(/^@+/, '').trim();
}
