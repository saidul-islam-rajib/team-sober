import hljs from 'highlight.js';
import katex from 'katex';
import { marked } from 'marked';

function attr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function math(tex: string, displayMode: boolean): string {
  return katex.renderToString(tex.trim(), {
    displayMode,
    throwOnError: false,
    strict: 'ignore',
  });
}

let footnotes = new Map<string, string>();

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

renderer.code = (code: string, infostring: string | undefined) => {
  const info = (infostring ?? '').trim();
  const lang = info.split(/\s+/)[0].toLowerCase();

  if (lang === 'mermaid') return `<pre class="mermaid">${attr(code)}</pre>\n`;
  if (lang === 'math' || lang === 'latex' || lang === 'katex') {
    return `<div class="math-block">${math(code, true)}</div>\n`;
  }

  const known = lang && hljs.getLanguage(lang) ? lang : '';
  const body = known
    ? hljs.highlight(code, { language: known, ignoreIllegals: true }).value
    : attr(code);
  const title = /\btitle=(?:"([^"]*)"|'([^']*)'|(\S+))/.exec(info);
  const name = title ? (title[1] ?? title[2] ?? title[3]) : '';

  const cls = known ? `hljs language-${attr(known)}` : 'hljs';
  const pre = `<pre class="code-block"${lang ? ` data-lang="${attr(lang)}"` : ''}><code class="${cls}">${body}</code></pre>`;

  return name
    ? `<figure class="code-figure"><figcaption>${attr(name)}</figcaption>${pre}</figure>\n`
    : `${pre}\n`;
};

renderer.table = (header: string, body: string) =>
  `<div class="table-wrap"><table>\n<thead>\n${header}</thead>\n${body ? `<tbody>${body}</tbody>` : ''}</table></div>\n`;

const CALLOUTS: Record<string, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

const CALLOUT_HEAD =
  /^<p>\[!(note|tip|important|warning|caution)\][ \t]*((?:(?!<br>|\n|<\/p>).)*)(?:<br>\n?|\n)?/i;

renderer.blockquote = (quote: string) => {
  const head = CALLOUT_HEAD.exec(quote);
  if (!head) return `<blockquote>\n${quote}</blockquote>\n`;

  const kind = head[1].toLowerCase();
  const title = head[2].trim() || CALLOUTS[kind];
  const rest = `<p>${quote.slice(head[0].length)}`.replace(/^<p><\/p>\n?/, '');

  return `<div class="callout callout-${kind}" role="note"><p class="callout-title">${title}</p>\n${rest}</div>\n`;
};

interface TextToken {
  type: string;
  raw: string;
  text: string;
  tokens?: marked.Token[];
}

const highlight: marked.TokenizerAndRendererExtension = {
  name: 'highlight',
  level: 'inline',
  start: (src: string) => src.indexOf('=='),
  tokenizer(src: string) {
    const match = /^==(?!=)([^=\n]+?)==/.exec(src);
    if (!match) return undefined;
    return {
      type: 'highlight',
      raw: match[0],
      text: match[1],
      tokens: this.lexer.inlineTokens(match[1], []),
    };
  },
  renderer(token) {
    const { tokens = [] } = token as TextToken;
    return `<mark>${this.parser.parseInline(tokens)}</mark>`;
  },
};

const blockMath: marked.TokenizerAndRendererExtension = {
  name: 'blockMath',
  level: 'block',
  start: (src: string) => src.match(/^\$\$/m)?.index,
  tokenizer(src: string) {
    const match = /^\$\$([\s\S]+?)\$\$[ \t]*(?:\n+|$)/.exec(src);
    if (!match) return undefined;
    return { type: 'blockMath', raw: match[0], text: match[1] };
  },
  renderer: (token) =>
    `<div class="math-block">${math((token as TextToken).text, true)}</div>\n`,
};

const inlineMath: marked.TokenizerAndRendererExtension = {
  name: 'inlineMath',
  level: 'inline',
  start: (src: string) => src.indexOf('$'),
  tokenizer(src: string) {
    const match = /^\$(?!\s)((?:\\\$|[^$`\n])+?)(?<!\s)\$(?!\d)/.exec(src);
    if (!match) return undefined;
    return { type: 'inlineMath', raw: match[0], text: match[1] };
  },
  renderer: (token) => math((token as TextToken).text, false),
};

const footnoteDef: marked.TokenizerAndRendererExtension = {
  name: 'footnoteDef',
  level: 'block',
  start: (src: string) => src.match(/^\[\^/m)?.index,
  tokenizer(src: string) {
    const match =
      /^\[\^([^\]\s]+)\]:[ \t]*([^\n]*(?:\n(?: {2,}|\t)[^\n]*)*)(?:\n+|$)/.exec(
        src,
      );
    if (!match) return undefined;
    const text = match[2].replace(/\n(?: {2,}|\t)/g, '\n').trim();
    if (!footnotes.has(match[1])) footnotes.set(match[1], text);
    return { type: 'footnoteDef', raw: match[0], text };
  },
  renderer: () => '',
};

const footnoteRef: marked.TokenizerAndRendererExtension = {
  name: 'footnoteRef',
  level: 'inline',
  start: (src: string) => src.indexOf('[^'),
  tokenizer(src: string) {
    const match = /^\[\^([^\]\s]+)\]/.exec(src);
    if (!match) return undefined;
    return { type: 'footnoteRef', raw: match[0], text: match[1] };
  },
  renderer: (token) =>
    `<!--fnref:${encodeURIComponent((token as TextToken).text)}-->`,
};

const toc: marked.TokenizerAndRendererExtension = {
  name: 'toc',
  level: 'block',
  start: (src: string) => src.match(/^\[\[toc\]\]/im)?.index,
  tokenizer(src: string) {
    const match = /^\[\[toc\]\][ \t]*(?:\n+|$)/i.exec(src);
    if (!match) return undefined;
    return { type: 'toc', raw: match[0], text: '' };
  },
  renderer: () => '<!--toc-->',
};

marked.setOptions({ gfm: true, breaks: true, renderer });
marked.use({
  extensions: [highlight, blockMath, inlineMath, footnoteDef, footnoteRef, toc],
});

const COLUMN_BLOCK = /^:::columns[ \t]*\n([\s\S]*?)^:::[ \t]*$/gm;

const HEADING = /<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g;

function tableOfContents(html: string): string {
  const items = [...html.matchAll(HEADING)].map(([, level, id, inner]) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    return `<li class="toc-h${level}"><a href="#${id}">${text}</a></li>`;
  });
  return items.length
    ? `<nav class="toc" aria-label="Contents"><p class="toc-title">Contents</p><ul>${items.join('')}</ul></nav>`
    : '';
}

function fnId(id: string): string {
  return id.replace(/[^\w-]/g, '_');
}

function resolveFootnotes(html: string): string {
  const order: string[] = [];
  const seen = new Map<string, number>();

  const body = html.replace(/<!--fnref:([^>]*?)-->/g, (_m, encoded: string) => {
    const id = decodeURIComponent(encoded);
    if (!footnotes.has(id)) return `[^${attr(id)}]`;
    if (!order.includes(id)) order.push(id);
    const n = order.indexOf(id) + 1;
    const uses = (seen.get(id) ?? 0) + 1;
    seen.set(id, uses);
    const ref = uses === 1 ? `fnref-${fnId(id)}` : `fnref-${fnId(id)}-${uses}`;
    return `<sup class="fnref"><a id="${ref}" href="#fn-${fnId(id)}" aria-describedby="footnotes-label">${n}</a></sup>`;
  });

  if (!order.length) return body;

  const items = order
    .map((id) => {
      const note = String(marked.parseInline(footnotes.get(id) ?? ''));
      return `<li id="fn-${fnId(id)}">${note} <a class="fn-back" href="#fnref-${fnId(id)}" aria-label="Back to reference">↩</a></li>`;
    })
    .join('');

  return `${body}<section class="footnotes"><h2 id="footnotes-label" class="sr-only">Footnotes</h2><ol>${items}</ol></section>`;
}

export function renderMarkdown(source: string): string {
  footnotes = new Map();
  const text = (source ?? '').replace(/\r\n?/g, '\n');

  const withColumns = text.replace(COLUMN_BLOCK, (_match, body: string) => {
    const cells = String(body)
      .split(/^\|\|\|[ \t]*$/m)
      .map((cell) => marked.parse(cell.trim()));

    if (cells.length < 2) return cells.join('');

    const inner = cells
      .map((html) => `<div class="md-col">${html}</div>`)
      .join('');
    return `<div class="md-columns" data-cols="${cells.length}">${inner}</div>`;
  });

  const html = marked.parse(withColumns);
  const withToc = html.includes('<!--toc-->')
    ? html.replace(/<!--toc-->/g, tableOfContents(html))
    : html;

  return resolveFootnotes(withToc);
}
