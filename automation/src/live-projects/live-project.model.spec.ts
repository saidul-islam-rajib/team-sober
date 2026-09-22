import {
  extractPreview,
  parseImages,
  sanitiseInput,
} from './live-project.model';

describe('live-project.model', () => {
  describe('parseImages', () => {
    it('splits by newline, sanitises and dedupes', () => {
      expect(
        parseImages(
          '/uploads/a.png\nhttps://x.com/b.png\n/uploads/a.png\n\njavascript:alert(1)',
        ),
      ).toEqual(['/uploads/a.png', 'https://x.com/b.png']);
    });

    it('returns an empty list for nothing', () => {
      expect(parseImages(undefined)).toEqual([]);
      expect(parseImages('')).toEqual([]);
    });
  });

  describe('sanitiseInput', () => {
    it('fills sensible defaults', () => {
      const fields = sanitiseInput({});
      expect(fields.title).toBe('Untitled site');
      expect(fields.url).toBe('');
      expect(fields.images).toEqual([]);
      expect(fields.featured).toBe(false);
    });

    it('trims and normalises real input', () => {
      const fields = sanitiseInput({
        title: '  My Site  ',
        url: 'https://example.com',
        description: '  A short blurb.  ',
        images: '/uploads/one.png\n/uploads/two.png',
        previewImage: '/uploads/preview.png',
        favicon: '/uploads/favicon.ico',
        featured: 'on',
      });

      expect(fields.title).toBe('My Site');
      expect(fields.url).toBe('https://example.com');
      expect(fields.description).toBe('A short blurb.');
      expect(fields.images).toEqual(['/uploads/one.png', '/uploads/two.png']);
      expect(fields.previewImage).toBe('/uploads/preview.png');
      expect(fields.favicon).toBe('/uploads/favicon.ico');
      expect(fields.featured).toBe(true);
    });

    it('rejects unsafe URLs', () => {
      const fields = sanitiseInput({
        url: 'javascript:alert(1)',
        previewImage: 'data:text/html,evil',
      });
      expect(fields.url).toBe('');
      expect(fields.previewImage).toBe('');
    });
  });

  describe('extractPreview', () => {
    it('prefers og:image and og:title/description', () => {
      const html = `<html><head>
        <title>Doc Title</title>
        <meta name="description" content="Doc description" />
        <meta property="og:title" content="OG Title" />
        <meta property="og:description" content="OG description" />
        <meta property="og:image" content="/social.png" />
        <link rel="icon" href="/icon.png" />
      </head></html>`;

      const meta = extractPreview(html, 'https://example.com/page');

      expect(meta.title).toBe('OG Title');
      expect(meta.description).toBe('OG description');
      expect(meta.image).toBe('https://example.com/social.png');
      expect(meta.favicon).toBe('https://example.com/icon.png');
    });

    it('falls back to twitter:image and <title>/meta description', () => {
      const html = `<html><head>
        <title>Fallback Title</title>
        <meta name="description" content="Fallback description" />
        <meta name="twitter:image" content="https://cdn.example.com/tw.png" />
      </head></html>`;

      const meta = extractPreview(html, 'https://example.com/');

      expect(meta.title).toBe('Fallback Title');
      expect(meta.description).toBe('Fallback description');
      expect(meta.image).toBe('https://cdn.example.com/tw.png');
      expect(meta.favicon).toBe('https://example.com/favicon.ico');
    });

    it('resolves relative image URLs against the base URL', () => {
      const html = '<meta property="og:image" content="images/cover.jpg" />';
      const meta = extractPreview(html, 'https://example.com/site/index.html');
      expect(meta.image).toBe('https://example.com/site/images/cover.jpg');
    });

    it('falls back to /favicon.ico when no icon link is present', () => {
      const meta = extractPreview(
        '<html><head></head></html>',
        'https://example.com',
      );
      expect(meta.title).toBe('');
      expect(meta.description).toBe('');
      expect(meta.image).toBe('');
      expect(meta.favicon).toBe('https://example.com/favicon.ico');
    });

    it('decodes HTML entities in text fields', () => {
      const html = '<meta property="og:title" content="Fish &amp; Chips" />';
      const meta = extractPreview(html, 'https://example.com');
      expect(meta.title).toBe('Fish & Chips');
    });
  });
});
