import { SiteSettings } from '../settings/settings.model';

export const MANIFEST_THEME_COLOR = '#0f766e';
export const MANIFEST_BACKGROUND_COLOR = '#f5f7fb';
export const APP_ICON_SIZES = [192, 512] as const;
export const APPLE_TOUCH_ICON_SIZE = 180;
export const APP_NAME = 'Team Sober';

export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose: 'any' | 'maskable';
}

export interface WebAppManifest {
  id: string;
  name: string;
  short_name: string;
  description: string;
  lang: string;
  start_url: string;
  scope: string;
  display: string;
  background_color: string;
  theme_color: string;
  icons: ManifestIcon[];
}

export function buildManifest(settings: SiteSettings): WebAppManifest {
  return {
    id: '/',
    name: APP_NAME,
    short_name: APP_NAME,
    description:
      settings.siteTagline || settings.shareIntro || settings.authorBio,
    lang: 'en',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: MANIFEST_BACKGROUND_COLOR,
    theme_color: MANIFEST_THEME_COLOR,
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      ...APP_ICON_SIZES.map((size): ManifestIcon => ({
        src: `/icons/icon-${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose: 'any',
      })),
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
