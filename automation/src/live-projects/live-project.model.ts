import { safeUrl } from '../settings/settings.model';
import { limitWords, SHORT_WORD_LIMIT } from '../projects/project.model';

export interface LiveProject {
  id: string;
  slug: string;
  title: string;
  url: string;
  description: string;
  images: string[];
  previewImage: string;
  favicon: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LiveProjectInput {
  title?: string;
  url?: string;
  description?: string;
  images?: string;
  previewImage?: string;
  favicon?: string;
  featured?: string | boolean;
}

export interface PreviewMeta {
  title: string;
  description: string;
  image: string;
  favicon: string;
}

export function parseImages(value?: string, cap = 20): string[] {
  if (!value) return [];

  return [
    ...new Set(
      value
        .split('\n')
        .map((u) => safeUrl(u.trim()))
        .filter(Boolean)
        .slice(0, cap),
    ),
  ];
}

function metaContent(html: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function resolveUrl(candidate: string, baseUrl: string): string {
  if (!candidate) return '';

  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return '';
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

/**
 * Dependency-free HTML <head> scrape: og:* tags first, then the plain
 * fallbacks browsers themselves fall back to. Good enough for the vast
 * majority of real sites without pulling in an HTML parser.
 */
export function extractPreview(html: string, baseUrl: string): PreviewMeta {
  const ogImage = metaContent(html, [
    /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i,
  ]);
  const twitterImage = metaContent(html, [
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  ]);

  const ogTitle = metaContent(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
  ]);
  const docTitle = metaContent(html, [/<title[^>]*>([^<]+)<\/title>/i]);

  const ogDescription = metaContent(html, [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
  ]);
  const metaDescription = metaContent(html, [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
  ]);

  const iconHref = metaContent(html, [
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i,
  ]);

  return {
    title: decodeEntities(ogTitle || docTitle),
    description: decodeEntities(ogDescription || metaDescription),
    image: resolveUrl(ogImage || twitterImage, baseUrl),
    favicon:
      resolveUrl(iconHref, baseUrl) || resolveUrl('/favicon.ico', baseUrl),
  };
}

export function sanitiseInput(
  input: LiveProjectInput,
): Omit<LiveProject, 'id' | 'slug' | 'createdAt' | 'updatedAt'> {
  return {
    title: (input.title ?? '').trim() || 'Untitled site',
    url: safeUrl(input.url ?? ''),
    description: limitWords((input.description ?? '').trim(), SHORT_WORD_LIMIT),
    images: parseImages(input.images),
    previewImage: safeUrl(input.previewImage ?? ''),
    favicon: safeUrl(input.favicon ?? ''),
    featured: input.featured === true || input.featured === 'on',
  };
}
