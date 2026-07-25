export const ADMIN_CHROME_STYLES = `
  .page-title { font-family: var(--serif); font-size: 1.9rem; letter-spacing: -0.02em; }
  .back-link { font-size: 0.84rem; color: var(--ink-3); display: inline-block; margin-bottom: 0.4rem; }
  .back-link:hover { color: var(--accent); }
  .toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .toolbar .spacer { flex: 1; }
  .subtitle { font-size: 0.86rem; color: var(--ink-3); }
  .inline-form { display: inline; }
`;

export const ADMIN_HERO_STYLES = `
  .admin-hero {
    background: linear-gradient(180deg, var(--surface-2), color-mix(in srgb, var(--surface-2) 55%, var(--bg)));
    border: 1px solid var(--border); border-radius: 16px;
    padding: 1.5rem 1.75rem 1.6rem; margin-bottom: 1.9rem;
  }
  .admin-hero .back-link { margin-bottom: 0.55rem; }
  .admin-hero .page-title { margin-bottom: 0.4rem; }
  .admin-hero-row { display: flex; align-items: flex-end; gap: 1rem; flex-wrap: wrap; }
  .admin-hero-sub { font-size: 0.9rem; color: var(--ink-3); line-height: 1.6; }
  .admin-hero-sub a { color: var(--accent); font-weight: 600; }
  .admin-hero-sub a:hover { text-decoration: underline; }
  .hero-count {
    display: inline-flex; align-items: center; vertical-align: 0.05em;
    font-size: 0.76rem; font-weight: 700; letter-spacing: 0.01em;
    color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    padding: 0.15rem 0.6rem; border-radius: 100px; margin-right: 0.35rem;
  }
  .admin-hero-actions { margin-left: auto; display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .admin-hero .admin-search { margin: 1.25rem 0 0; }
  .admin-hero .admin-search input { background: var(--bg); }
  @media (max-width: 640px) {
    .admin-hero { padding: 1.25rem 1.15rem 1.35rem; border-radius: 14px; }
    .admin-hero-row { align-items: stretch; }
    .admin-hero-actions { margin-left: 0; width: 100%; }
    .admin-hero-actions form, .admin-hero-actions .btn { flex: 1; }
    .admin-hero-actions .btn { justify-content: center; width: 100%; }
  }
`;

export const ADMIN_PANEL_STYLES = `
  .panel {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.1rem; margin-bottom: 1.1rem;
  }
  .panel h3 {
    font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--ink-3); margin-bottom: 0.85rem;
  }
  .field { margin-bottom: 1rem; }
  .field:last-child { margin-bottom: 0; }
  .field label { display: block; font-size: 0.82rem; margin-bottom: 0.3rem; color: var(--ink-2); }
  .hint { font-size: 0.76rem; color: var(--ink-3); margin-top: 0.3rem; }
  .form-grid { display: grid; grid-template-columns: 1fr 300px; gap: 1.5rem; align-items: start; }
  @media (max-width: 860px) { .form-grid { grid-template-columns: 1fr; } }

  /* A number with its unit beside it, and a plain-language readout under both. */
  .input-unit { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .input-unit input { flex: 1; min-width: 5rem; }
  .input-unit .unit { font-size: 0.82rem; color: var(--ink-3); }
  .input-unit .unit-readout {
    flex-basis: 100%; font-size: 0.76rem; color: var(--ink-3);
  }
`;

export const ADMIN_ROW_STYLES = `
  .admin-row {
    display: flex; align-items: center; gap: 0.9rem;
    border: 1px solid var(--border); border-radius: 12px;
    padding: 0.9rem 1.1rem; margin-bottom: 0.6rem; background: var(--surface-2);
  }
  .admin-row .icon { font-size: 1.4rem; flex: none; }
  .admin-row .num {
    flex: none; width: 1.8rem; height: 1.8rem; border-radius: 100px;
    display: grid; place-items: center; font-size: 0.78rem;
    border: 1px solid var(--border); color: var(--ink-3);
  }
  .admin-row .info { flex: 1; min-width: 0; }
  .admin-row .info b { display: block; font-size: 0.96rem; }
  .admin-row .info span { font-size: 0.79rem; color: var(--ink-3); }
  .admin-row .actions { display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center; }

  .move {
    border: 1px solid var(--border); background: transparent; cursor: pointer;
    border-radius: 7px; width: 1.9rem; height: 1.9rem; line-height: 1;
    color: var(--ink-3); font-size: 0.85rem; font-family: inherit;
  }
  .move:hover { border-color: var(--accent); color: var(--accent); }
  .move[disabled] { opacity: 0.3; cursor: not-allowed; }
`;

export const ADMIN_STYLES = [
  ADMIN_CHROME_STYLES,
  ADMIN_PANEL_STYLES,
  ADMIN_ROW_STYLES,
].join('\n');
