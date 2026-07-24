import { ImagePolicy } from './policies';
import { CONFIG_DEFAULTS } from './config.schema';
import { getConfig, setConfig } from './config.store';

describe('ImagePolicy', () => {
  const original = getConfig();

  afterEach(() => setConfig(original));

  it('defaults image caching to at least a week', () => {
    setConfig({ ...CONFIG_DEFAULTS });

    expect(ImagePolicy.cacheDays).toBeGreaterThanOrEqual(7);
  });

  it('turns the configured days into a Cache-Control header', () => {
    setConfig({ ...CONFIG_DEFAULTS, 'media.imageCacheDays': 7 });

    expect(ImagePolicy.cacheSeconds).toBe(7 * 24 * 60 * 60);
    expect(ImagePolicy.cacheControl).toBe('public, max-age=604800, immutable');
  });

  it('tracks a changed setting without a restart', () => {
    setConfig({ ...CONFIG_DEFAULTS, 'media.imageCacheDays': 30 });

    expect(ImagePolicy.cacheSeconds).toBe(30 * 24 * 60 * 60);
    expect(ImagePolicy.cacheControl).toContain('max-age=2592000');
  });
});
