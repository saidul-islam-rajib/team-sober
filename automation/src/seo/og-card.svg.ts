/*
 * A 1200×630 social-share card, built as an SVG and rendered to PNG by sharp —
 * the same approach the completion certificate uses. Facebook, LinkedIn,
 * WhatsApp and Slack all read the og:image, and a page with no photo of its own
 * (the tutorials index, the home feed) would otherwise fall back to a small
 * round avatar that previews poorly. This gives those pages a branded card that
 * actually shows what they contain.
 *
 * Fonts are DejaVu, which the container installs (ttf-dejavu). Emoji are
 * deliberately avoided — DejaVu has no colour emoji glyphs, so they would
 * render as empty boxes in the PNG.
 */
export const OG_CARD_WIDTH = 1200;
export const OG_CARD_HEIGHT = 630;

export interface OgCardRow {
  label: string;
  meta?: string;
}

export interface OgCardFields {
  eyebrow: string;
  title: string;
  subtitle: string;
  rows?: OgCardRow[];
  brand: string;
}

function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function fitText(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

const SANS = 'DejaVu Sans, Verdana, sans-serif';
const SERIF = 'DejaVu Serif, Georgia, serif';

export function ogCardSvg(fields: OgCardFields): string {
  const pad = 90;
  const right = OG_CARD_WIDTH - pad;
  const rows = (fields.rows ?? []).slice(0, 5);

  const rowStart = 372;
  const rowGap = 62;

  const rowMarkup = rows
    .map((row, index) => {
      const y = rowStart + index * rowGap;
      const meta = row.meta
        ? `<text x="${right}" y="${y}" text-anchor="end" font-family="${SANS}" font-size="30" fill="#8a92a3">${xml(row.meta)}</text>`
        : '';

      return `<circle cx="${pad + 7}" cy="${y - 10}" r="7" fill="#2dd4bf"/>
    <text x="${pad + 34}" y="${y}" font-family="${SANS}" font-size="34" fill="#e5e7eb">${xml(fitText(row.label, 34))}</text>
    ${meta}`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_CARD_WIDTH}" height="${OG_CARD_HEIGHT}" viewBox="0 0 ${OG_CARD_WIDTH} ${OG_CARD_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#12151b"/>
      <stop offset="1" stop-color="#0c0e13"/>
    </linearGradient>
  </defs>

  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="0" y="0" width="14" height="${OG_CARD_HEIGHT}" fill="#2dd4bf"/>

  <text x="${pad}" y="150" font-family="${SANS}" font-size="30" letter-spacing="9" fill="#2dd4bf" font-weight="bold">${xml(fitText(fields.eyebrow.toUpperCase(), 28))}</text>

  <text x="${pad}" y="236" font-family="${SERIF}" font-size="70" fill="#f2f4f7">${xml(fitText(fields.title, 30))}</text>

  <text x="${pad}" y="296" font-family="${SANS}" font-size="31" fill="#8a92a3">${xml(fitText(fields.subtitle, 66))}</text>

  <line x1="${pad}" y1="330" x2="${right}" y2="330" stroke="#2a2f3a" stroke-width="2"/>

  ${rowMarkup}

  <text x="${pad}" y="568" font-family="${SANS}" font-size="27" fill="#6b7280">${xml(fitText(fields.brand, 70))}</text>
</svg>`;
}
