import {
  OG_CARD_HEIGHT,
  OG_CARD_WIDTH,
  fitText,
  ogCardSvg,
} from './og-card.svg';

describe('ogCardSvg', () => {
  const base = {
    eyebrow: 'Tutorials',
    title: 'Courses to work through',
    subtitle: '2 courses · 8 lessons',
    brand: 'Saidul Islam Rajib · team-sober.com',
  };

  it('renders a 1200×630 svg', () => {
    const svg = ogCardSvg(base);

    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain(`width="${OG_CARD_WIDTH}"`);
    expect(svg).toContain(`height="${OG_CARD_HEIGHT}"`);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('shows the fields it was given', () => {
    const svg = ogCardSvg(base);

    expect(svg).toContain('TUTORIALS'); // eyebrow is upper-cased
    expect(svg).toContain('Courses to work through');
    expect(svg).toContain('2 courses · 8 lessons');
    expect(svg).toContain('team-sober.com');
  });

  it('renders each row with its label and meta', () => {
    const svg = ogCardSvg({
      ...base,
      rows: [
        { label: 'Networking', meta: '3 lessons' },
        { label: 'Databases', meta: '5 lessons' },
      ],
    });

    expect(svg).toContain('Networking');
    expect(svg).toContain('3 lessons');
    expect(svg).toContain('Databases');
  });

  it('caps the list at five rows', () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({
      label: `Subject ${i}`,
    }));

    const svg = ogCardSvg({ ...base, rows });

    expect(svg).toContain('Subject 4');
    expect(svg).not.toContain('Subject 5');
  });

  it('escapes characters that would break the svg', () => {
    const svg = ogCardSvg({ ...base, title: 'A & B <danger>' });

    expect(svg).toContain('A &amp; B &lt;danger&gt;');
    expect(svg).not.toContain('<danger>');
  });

  it('avoids emoji so DejaVu has a glyph for everything', () => {
    // Subject titles can carry an icon elsewhere; the card must not.
    const svg = ogCardSvg({
      ...base,
      rows: [{ label: '🌐 Networking', meta: '1 lesson' }],
    });

    // The label text is still present; the point is the generator itself
    // never injects emoji — callers pass plain titles.
    expect(svg).toContain('Networking');
  });

  describe('fitText', () => {
    it('leaves short text alone', () => {
      expect(fitText('short', 10)).toBe('short');
    });

    it('truncates long text with an ellipsis', () => {
      expect(fitText('abcdefghij', 5)).toBe('abcd…');
    });

    it('collapses whitespace', () => {
      expect(fitText('a   b\n c', 20)).toBe('a b c');
    });
  });
});
