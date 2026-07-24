
export const PROSE_STYLES = `
  .prose { font-family: var(--serif); font-size: 1.13rem; line-height: 1.75; color: var(--ink-2); }
  .prose > * + * { margin-top: 1.4rem; }
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
    display: flex; align-items: center; justify-content: center;
    padding: 2rem; cursor: zoom-out;
  }
  .lightbox img {
    max-width: 100%; max-height: 100%;
    border-radius: 6px; border: 0; margin: 0; cursor: default;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  .lightbox-close {
    position: absolute; top: 1rem; right: 1.25rem;
    background: transparent; border: 0; color: #fff;
    font-size: 2rem; line-height: 1; cursor: pointer; opacity: 0.8;
    font-family: inherit;
  }
  .lightbox-close:hover { opacity: 1; }
  .lightbox-hint {
    position: absolute; bottom: 1.25rem; left: 0; right: 0;
    text-align: center; color: rgba(255, 255, 255, 0.6); font-size: 0.82rem;
  }
`;

export const PROSE_BUNDLE = [
  PROSE_STYLES,
  MD_COLUMN_STYLES,
  LIGHTBOX_STYLES,
].join('\n');
