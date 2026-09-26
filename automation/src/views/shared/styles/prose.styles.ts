export const PROSE_STYLES = `
  .prose { font-family: var(--serif); font-size: 1.13rem; line-height: 1.75; color: var(--ink-2); }
  .prose > * + * { margin-top: 1.4rem; }
  .prose p, .prose li {
    text-align: justify;
    hyphens: auto; -webkit-hyphens: auto;
    text-wrap: pretty;
  }
  .prose h2 { font-size: 1.5rem; margin-top: 2.4rem; }
  .prose h3 { font-size: 1.22rem; margin-top: 2rem; }
  .prose ul, .prose ol { padding-left: 1.4rem; }
  .prose li + li { margin-top: 0.4rem; }
  .prose a { color: var(--accent); text-decoration: underline; }
  .prose strong { color: var(--ink); }
  .prose mark {
    background: color-mix(in srgb, var(--accent) 22%, transparent);
    color: inherit; padding: 0.05em 0.25em; border-radius: 3px;
  }
  .prose code {
    font-family: var(--mono); font-size: 0.86em;
    background: var(--surface-2); border: 1px solid var(--border);
    padding: 0.1em 0.38em; border-radius: 5px; color: var(--ink);
  }
  .prose pre {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 10px; padding: 1rem 1.1rem; overflow-x: auto;
    font-size: 0.92rem;
  }
  .prose pre code { background: none; border: 0; padding: 0; font-size: 0.88rem; }
  .prose blockquote {
    border-left: 3px solid var(--border); padding-left: 1.1rem; color: var(--ink-3);
  }
  .prose img {
    max-width: 100%; height: auto; border-radius: 10px;
    border: 1px solid var(--border); display: block; margin: 2rem auto;
    cursor: zoom-in;
  }
  /*
   * Markdown carries no dimensions, so an article image has no height until
   * it arrives and the skeleton would have nothing to fill. This gives it an
   * area to occupy; the image replaces it at whatever height it really is.
   */
  .prose img.skel:not(.is-loaded) { min-height: 220px; width: 100%; }
  /* Portrait shots would otherwise run the full column height. */
  .prose > p > img, .prose > img { max-height: 520px; width: auto; }
  .prose table { width: 100%; border-collapse: collapse; font-family: var(--sans); font-size: 0.95rem; }
  .prose th, .prose td { padding: 0.55rem 0.7rem; border-bottom: 1px solid var(--border); text-align: left; }
  .prose th { color: var(--ink); font-weight: 600; }
  .prose hr { border: 0; border-top: 1px solid var(--border); margin: 2.5rem 0; }
  .prose h4 { font-size: 1.05rem; margin-top: 1.6rem; }
  .prose li > ul, .prose li > ol { margin-top: 0.4rem; }
  .prose [id] { scroll-margin-top: 5.5rem; }

  .prose .heading-anchor {
    margin-left: 0.4rem; color: var(--ink-3); text-decoration: none;
    font-family: var(--sans); font-weight: 400; opacity: 0;
    transition: opacity 0.15s;
  }
  .prose :is(h2, h3, h4):hover .heading-anchor,
  .prose .heading-anchor:focus-visible { opacity: 1; }
  @media (hover: none) { .prose .heading-anchor { opacity: 0.45; } }

  .prose .table-wrap {
    overflow-x: auto; -webkit-overflow-scrolling: touch;
    border: 1px solid var(--border); border-radius: 10px;
  }
  .prose .table-wrap table { margin: 0; }
  .prose th { background: var(--surface-2); }
  .prose tr:last-child td { border-bottom: 0; }
  .prose td code, .prose th code { white-space: nowrap; }

  .prose li:has(> input[type="checkbox"]) { list-style: none; margin-left: -1.3rem; }
  .prose li > input[type="checkbox"] {
    width: 1rem; height: 1rem; margin-right: 0.45rem;
    vertical-align: -0.12em; accent-color: var(--accent);
  }

  .prose .callout {
    border: 1px solid var(--border); border-left-width: 4px; border-radius: 10px;
    padding: 0.85rem 1.1rem; font-size: 1.02rem;
  }
  .prose .callout > * + * { margin-top: 0.6rem; }
  .prose .callout-title {
    font-family: var(--sans); font-weight: 700; font-size: 0.92rem; text-align: left;
  }
  .prose .callout-note { border-color: color-mix(in srgb, #2f6feb 35%, var(--border)); border-left-color: #2f6feb; background: color-mix(in srgb, #2f6feb 7%, transparent); }
  .prose .callout-note .callout-title { color: #2f6feb; }
  .prose .callout-tip { border-color: color-mix(in srgb, #1a7f37 35%, var(--border)); border-left-color: #1a7f37; background: color-mix(in srgb, #1a7f37 7%, transparent); }
  .prose .callout-tip .callout-title { color: #1a7f37; }
  .prose .callout-important { border-color: color-mix(in srgb, #8250df 35%, var(--border)); border-left-color: #8250df; background: color-mix(in srgb, #8250df 7%, transparent); }
  .prose .callout-important .callout-title { color: #8250df; }
  .prose .callout-warning { border-color: color-mix(in srgb, #b54708 35%, var(--border)); border-left-color: #b54708; background: color-mix(in srgb, #b54708 7%, transparent); }
  .prose .callout-warning .callout-title { color: #b54708; }
  .prose .callout-caution { border-color: color-mix(in srgb, #cf222e 35%, var(--border)); border-left-color: #cf222e; background: color-mix(in srgb, #cf222e 7%, transparent); }
  .prose .callout-caution .callout-title { color: #cf222e; }
  @media (prefers-color-scheme: dark) {
    .prose .callout-note { border-color: color-mix(in srgb, #58a6ff 35%, var(--border)); border-left-color: #58a6ff; background: color-mix(in srgb, #58a6ff 7%, transparent); }
    .prose .callout-note .callout-title { color: #58a6ff; }
    .prose .callout-tip { border-color: color-mix(in srgb, #3fb950 35%, var(--border)); border-left-color: #3fb950; background: color-mix(in srgb, #3fb950 7%, transparent); }
    .prose .callout-tip .callout-title { color: #3fb950; }
    .prose .callout-important { border-color: color-mix(in srgb, #a371f7 35%, var(--border)); border-left-color: #a371f7; background: color-mix(in srgb, #a371f7 7%, transparent); }
    .prose .callout-important .callout-title { color: #a371f7; }
    .prose .callout-warning { border-color: color-mix(in srgb, #fdb022 35%, var(--border)); border-left-color: #fdb022; background: color-mix(in srgb, #fdb022 7%, transparent); }
    .prose .callout-warning .callout-title { color: #fdb022; }
    .prose .callout-caution { border-color: color-mix(in srgb, #f85149 35%, var(--border)); border-left-color: #f85149; background: color-mix(in srgb, #f85149 7%, transparent); }
    .prose .callout-caution .callout-title { color: #f85149; }
  }

  .prose details {
    border: 1px solid var(--border); border-radius: 10px;
    padding: 0.7rem 1rem; background: var(--surface);
  }
  .prose details > summary { cursor: pointer; font-family: var(--sans); font-weight: 600; color: var(--ink); }
  .prose details[open] > summary { margin-bottom: 0.6rem; }
  .prose kbd {
    font-family: var(--mono); font-size: 0.8em; color: var(--ink);
    background: var(--surface); border: 1px solid var(--border);
    border-bottom-width: 2px; border-radius: 5px; padding: 0.08em 0.4em;
  }

  .prose .code-figure { margin-left: 0; margin-right: 0; }
  .prose .code-figure figcaption {
    font-family: var(--mono); font-size: 0.8rem; color: var(--ink-3);
    background: var(--surface-2); border: 1px solid var(--border); border-bottom: 0;
    border-radius: 10px 10px 0 0; padding: 0.4rem 1.1rem;
  }
  .prose .code-figure pre { margin: 0; border-top-left-radius: 0; border-top-right-radius: 0; }
  .prose pre.code-block { position: relative; line-height: 1.55; }
  .prose .copy-code {
    position: absolute; top: 0.5rem; right: 0.5rem;
    font: 600 0.72rem var(--sans); color: var(--ink-3);
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 6px; padding: 0.25rem 0.55rem; cursor: pointer;
    opacity: 0; transition: opacity 0.15s;
  }
  .prose pre.code-block:hover .copy-code,
  .prose .copy-code:focus-visible, .prose .copy-code.done { opacity: 1; }
  @media (hover: none) { .prose .copy-code { opacity: 0.85; } }
  .prose .copy-code:hover { color: var(--ink); }

  .prose .hljs { color: var(--ink); }
  .prose .hljs-comment, .prose .hljs-quote { color: #6a737d; font-style: italic; }
  .prose .hljs-keyword, .prose .hljs-selector-tag, .prose .hljs-literal,
  .prose .hljs-doctag, .prose .hljs-meta .hljs-keyword { color: #cf222e; }
  .prose .hljs-string, .prose .hljs-regexp, .prose .hljs-meta .hljs-string { color: #0a3069; }
  .prose .hljs-number, .prose .hljs-attr, .prose .hljs-attribute,
  .prose .hljs-variable, .prose .hljs-template-variable, .prose .hljs-operator,
  .prose .hljs-selector-attr, .prose .hljs-selector-class, .prose .hljs-selector-id { color: #0550ae; }
  .prose .hljs-title, .prose .hljs-title.function_, .prose .hljs-section { color: #8250df; }
  .prose .hljs-type, .prose .hljs-built_in, .prose .hljs-title.class_,
  .prose .hljs-params { color: #953800; }
  .prose .hljs-name, .prose .hljs-tag, .prose .hljs-symbol, .prose .hljs-bullet { color: #116329; }
  .prose .hljs-meta { color: #57606a; }
  .prose .hljs-addition { color: #116329; background: #dafbe1; }
  .prose .hljs-deletion { color: #82071e; background: #ffebe9; }
  .prose .hljs-emphasis { font-style: italic; }
  .prose .hljs-strong { font-weight: 700; }
  @media (prefers-color-scheme: dark) {
    .prose .hljs-comment, .prose .hljs-quote { color: #8b949e; }
    .prose .hljs-keyword, .prose .hljs-selector-tag, .prose .hljs-literal,
    .prose .hljs-doctag, .prose .hljs-meta .hljs-keyword { color: #ff7b72; }
    .prose .hljs-string, .prose .hljs-regexp, .prose .hljs-meta .hljs-string { color: #a5d6ff; }
    .prose .hljs-number, .prose .hljs-attr, .prose .hljs-attribute,
    .prose .hljs-variable, .prose .hljs-template-variable, .prose .hljs-operator,
    .prose .hljs-selector-attr, .prose .hljs-selector-class, .prose .hljs-selector-id { color: #79c0ff; }
    .prose .hljs-title, .prose .hljs-title.function_, .prose .hljs-section { color: #d2a8ff; }
    .prose .hljs-type, .prose .hljs-built_in, .prose .hljs-title.class_,
    .prose .hljs-params { color: #ffa657; }
    .prose .hljs-name, .prose .hljs-tag, .prose .hljs-symbol, .prose .hljs-bullet { color: #7ee787; }
    .prose .hljs-meta { color: #8b949e; }
    .prose .hljs-addition { color: #aff5b4; background: #033a16; }
    .prose .hljs-deletion { color: #ffdcd7; background: #67060c; }
  }

  .prose pre.mermaid {
    background: none; border: 0; padding: 0; text-align: center;
    font-family: var(--mono); white-space: pre-wrap; overflow-x: auto;
  }
  .prose pre.mermaid svg { max-width: 100%; height: auto; }
  .prose .math-block { overflow-x: auto; overflow-y: hidden; padding: 0.25rem 0; }
  .prose .katex { font-size: 1.05em; }

  .prose .toc {
    border: 1px solid var(--border); border-radius: 10px;
    background: var(--surface); padding: 0.9rem 1.2rem; font-family: var(--sans);
  }
  .prose .toc-title { font-weight: 700; color: var(--ink); font-size: 0.95rem; }
  .prose .toc ul { list-style: none; padding-left: 0; margin-top: 0.5rem; }
  .prose .toc li { text-align: left; font-size: 0.95rem; margin-top: 0.25rem; }
  .prose .toc .toc-h3 { padding-left: 1.1rem; font-size: 0.9rem; }
  .prose .toc a { text-decoration: none; }
  .prose .toc a:hover { text-decoration: underline; }

  .prose .fnref { font-family: var(--sans); font-size: 0.72em; line-height: 0; }
  .prose .fnref a { text-decoration: none; padding: 0 0.1em; }
  .prose .footnotes {
    margin-top: 3rem; padding-top: 1.2rem; border-top: 1px solid var(--border);
    font-size: 0.95rem; color: var(--ink-3);
  }
  .prose .footnotes ol { padding-left: 1.4rem; }
  .prose .fn-back { text-decoration: none; font-family: var(--sans); }
  .prose .sr-only {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
  }
`;

export const MD_COLUMN_STYLES = `
  .md-columns {
    display: grid; gap: 1.25rem; margin: 2rem 0;
    grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr));
    align-items: start;
  }
  .md-columns[data-cols="3"] { --cols: 3; }
  .md-columns .md-col > *:first-child { margin-top: 0; }
  .md-columns .md-col > * + * { margin-top: 0.9rem; }
  .md-columns img {
    margin: 0; width: 100%; max-height: 340px; object-fit: cover;
  }
  .md-columns p { font-size: 1rem; line-height: 1.65; }
  @media (max-width: 640px) {
    .md-columns { grid-template-columns: 1fr; gap: 1rem; }
    .md-columns img { max-height: 260px; }
  }
`;

export const LIGHTBOX_STYLES = `
  .lightbox {
    position: fixed; inset: 0; z-index: 100;
    background: rgba(0, 0, 0, 0.9);
    display: flex; overflow: auto; overscroll-behavior: contain;
    padding: 2rem; cursor: zoom-out;
  }
  .lightbox img {
    max-width: 100%; max-height: 100%;
    border-radius: 6px; border: 0; margin: auto; cursor: default;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  .lightbox img.can-zoom { cursor: zoom-in; }
  .lightbox img.is-actual { max-width: none; max-height: none; cursor: zoom-out; }
  .lightbox-close {
    position: fixed; top: 1rem; right: 1.25rem; z-index: 1;
    background: transparent; border: 0; color: #fff;
    font-size: 2rem; line-height: 1; cursor: pointer; opacity: 0.8;
    font-family: inherit;
  }
  .lightbox-close:hover { opacity: 1; }
  .lightbox-hint {
    position: fixed; bottom: 1.25rem; left: 50%; transform: translateX(-50%);
    max-width: calc(100% - 2rem); pointer-events: none;
    text-align: center; color: rgba(255, 255, 255, 0.85); font-size: 0.82rem;
    background: rgba(0, 0, 0, 0.55); padding: 0.3rem 0.8rem; border-radius: 999px;
  }
  img.avatar-img[data-zoom] { cursor: zoom-in; }
  img.avatar-img[data-zoom]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
`;

export const PROSE_BUNDLE = [
  PROSE_STYLES,
  MD_COLUMN_STYLES,
  LIGHTBOX_STYLES,
].join('\n');
