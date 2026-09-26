import { marked } from 'marked';

function attr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const renderer = new marked.Renderer();

renderer.image = (href: string | null, title: string | null, text: string) =>
  [
    `<img class="skel" src="${attr(href ?? '')}"`,
    `alt="${attr(text ?? '')}"`,
    title ? `title="${attr(title)}"` : '',
    'loading="lazy" decoding="async" />',
  ]
    .filter(Boolean)
    .join(' ');

// Mermaid fences become <pre class="mermaid">, which the page-level loader
// (MERMAID_SCRIPT) turns into diagrams in the browser.
const plain = new marked.Renderer();

renderer.code = (
  code: string,
  infostring: string | undefined,
  escaped: boolean,
) =>
  (infostring ?? '').trim().split(/\s+/)[0].toLowerCase() === 'mermaid'
    ? `<pre class="mermaid">${attr(code)}</pre>\n`
    : plain.code(code, infostring, escaped);

marked.setOptions({ gfm: true, breaks: true, renderer });

const COLUMN_BLOCK = /^:::columns[ \t]*\n([\s\S]*?)^:::[ \t]*$/gm;

const HIGHLIGHT = /==([^=\n]+)==/g;

const FENCE = /^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t\r]*$/gm;

// ==text== highlighting must not reach inside code fences, where `==` is
// ordinary syntax (e.g. Mermaid's thick arrows `A ==> B ==> C`).
function highlightOutsideFences(source: string): string {
  let out = '';
  let last = 0;
  for (const match of source.matchAll(FENCE)) {
    const start = match.index ?? 0;
    out += source.slice(last, start).replace(HIGHLIGHT, '<mark>$1</mark>');
    out += match[0];
    last = start + match[0].length;
  }
  return out + source.slice(last).replace(HIGHLIGHT, '<mark>$1</mark>');
}

export function renderMarkdown(source: string): string {
  const withHighlights = highlightOutsideFences(source ?? '');

  const withColumns = withHighlights.replace(
    COLUMN_BLOCK,
    (_match, body: string) => {
      const cells = String(body)
        .split(/^\|\|\|[ \t]*$/m)
        .map((cell) => marked.parse(cell.trim()));

      if (cells.length < 2) return cells.join('');

      const inner = cells
        .map((html) => `<div class="md-col">${html}</div>`)
        .join('');
      return `<div class="md-columns" data-cols="${cells.length}">${inner}</div>`;
    },
  );

  return marked.parse(withColumns);
}
