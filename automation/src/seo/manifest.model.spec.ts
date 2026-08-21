import { DEFAULT_SETTINGS, SiteSettings } from '../settings/settings.model';
import {
  APP_ICON_SIZES,
  APP_NAME,
  MANIFEST_BACKGROUND_COLOR,
  MANIFEST_THEME_COLOR,
  buildManifest,
} from './manifest.model';

function settings(overrides: Partial<SiteSettings> = {}): SiteSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe('buildManifest', () => {
  it('names the installed app a fixed string, regardless of the editable site title', () => {
    const manifest = buildManifest(settings({ siteTitle: 'Custom Title' }));

    expect(manifest.name).toBe(APP_NAME);
    expect(manifest.short_name).toBe(APP_NAME);
  });

  it('prefers the tagline for the description', () => {
    const manifest = buildManifest(
      settings({
        siteTagline: 'The tagline',
        shareIntro: 'The intro',
        authorBio: 'The bio',
      }),
    );

    expect(manifest.description).toBe('The tagline');
  });

  it('falls back to the share intro, then the author bio', () => {
    expect(
      buildManifest(
        settings({
          siteTagline: '',
          shareIntro: 'The intro',
          authorBio: 'The bio',
        }),
      ).description,
    ).toBe('The intro');

    expect(
      buildManifest(
        settings({ siteTagline: '', shareIntro: '', authorBio: 'The bio' }),
      ).description,
    ).toBe('The bio');
  });

  it('scopes the app to the whole site from its root', () => {
    const manifest = buildManifest(settings());

    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
  });

  it('uses the shared brand colours', () => {
    const manifest = buildManifest(settings());

    expect(manifest.theme_color).toBe(MANIFEST_THEME_COLOR);
    expect(manifest.background_color).toBe(MANIFEST_BACKGROUND_COLOR);
  });

  it('lists a scalable icon plus a raster icon for every declared size', () => {
    const manifest = buildManifest(settings());

    expect(manifest.icons).toContainEqual({
      src: '/icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any',
    });

    for (const size of APP_ICON_SIZES) {
      expect(manifest.icons).toContainEqual({
        src: `/icons/icon-${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose: 'any',
      });
    }
  });

  it('includes a maskable icon for Android adaptive launchers', () => {
    const manifest = buildManifest(settings());

    expect(manifest.icons).toContainEqual({
      src: '/icons/icon-512-maskable.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    });
  });

  it('serialises to valid JSON', () => {
    expect(() => JSON.stringify(buildManifest(settings()))).not.toThrow();
  });
});
