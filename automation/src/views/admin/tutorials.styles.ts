import { ADMIN_STYLES } from '../shared/styles/admin.styles';
import {
  BADGE_STYLES,
  EMPTY_STATE_STYLES,
} from '../shared/styles/components.styles';
import { MARKDOWN_EDITOR_STYLES } from '../shared/components/markdown-editor';
import { CHIP_CSS } from '../shared/scripts/chip-input';

const SUBJECT_ROW_STYLES = `
  .subj-row {
    display: flex; align-items: center; gap: 0.9rem;
    border: 1px solid var(--border); border-radius: 12px;
    padding: 0.9rem 1.1rem; margin-bottom: 0.6rem; background: var(--surface-2);
  }
  .subj-row .icon { font-size: 1.4rem; flex: none; }
  .subj-row .info { flex: 1; min-width: 0; }
  .subj-row .info b { display: block; font-size: 0.98rem; }
  .subj-row .info span { font-size: 0.8rem; color: var(--ink-3); }
  .subj-row .actions { display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center; }

  .lesson-row {
    display: flex; align-items: center; gap: 0.9rem;
    border: 1px solid var(--border); border-radius: 10px;
    padding: 0.75rem 0.9rem; margin-bottom: 0.5rem; background: var(--surface-2);
  }
  .lesson-row .num {
    flex: none; width: 1.8rem; height: 1.8rem; border-radius: 100px;
    display: grid; place-items: center; font-size: 0.78rem;
    border: 1px solid var(--border); color: var(--ink-3);
  }
  .lesson-row .info { flex: 1; min-width: 0; }
  .lesson-row .info b { display: block; font-size: 0.92rem; }
  .lesson-row .info span { font-size: 0.78rem; color: var(--ink-3); }
  .lesson-row .actions { display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center; }

  /* Only what can start a drag says so — a chapter is picked up by its bar. */
  [data-sort-id][draggable="true"], [data-sort-handle] { cursor: grab; }
  [data-sort-id][draggable="true"]:active, [data-sort-handle]:active { cursor: grabbing; }
  [data-sort-id].dragging { opacity: 0.45; border-style: dashed; border-color: var(--accent); }
  [data-sort-id] a, [data-sort-id] button { cursor: pointer; }

  /* A chapter block has no border of its own, so it needs its own drag state. */
  .chapter-block.dragging {
    opacity: 0.5;
    outline: 2px dashed var(--accent);
    outline-offset: 4px;
    border-radius: 10px;
  }
  .chapter-bar[data-sort-handle]:hover { background: var(--surface-2); border-radius: 0 8px 8px 0; }

  .grip {
    flex: none; color: var(--ink-3); font-size: 1rem; line-height: 1;
    letter-spacing: -2px; user-select: none;
  }
  .grip:hover { color: var(--accent); }

  .sort-hint { font-size: 0.78rem; color: var(--ink-3); margin-bottom: 0.75rem; }

  .chapter-block { margin-bottom: 1.5rem; }
  .chapter-bar {
    display: flex; align-items: center; gap: 0.9rem;
    padding: 0.6rem 0.9rem; margin-bottom: 0.6rem;
    border-left: 3px solid var(--accent); background: transparent;
  }
  .chapter-bar.loose { border-left-color: var(--border); }
  .chapter-bar .info { flex: 1; min-width: 0; }
  .chapter-bar .info b {
    display: block; font-size: 0.8rem; text-transform: uppercase;
    letter-spacing: 0.07em; color: var(--ink);
  }
  .chapter-bar .info span { font-size: 0.78rem; color: var(--ink-3); }
  .chapter-bar .actions { display: flex; gap: 0.35rem; align-items: center; }
  .chapter-block .lesson-row { margin-left: 1.1rem; }

  /* ---------- lessons inside the chapter editor ---------- */
  .chapter-lessons {
    border: 1px solid var(--border); border-radius: 12px;
    background: var(--surface); margin-bottom: 1.5rem;
  }
  .chapter-lessons > summary {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.85rem 1.1rem; cursor: pointer; list-style: none;
    font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--ink-3); font-weight: 700;
  }
  .chapter-lessons > summary::-webkit-details-marker { display: none; }
  /* A rotating caret reads as open or closed without needing the native marker. */
  .chapter-lessons > summary::before {
    content: "›"; font-size: 1.1rem; line-height: 1;
    transition: transform .18s; color: var(--ink-3);
  }
  .chapter-lessons[open] > summary::before { transform: rotate(90deg); }
  .chapter-lessons > summary:hover { color: var(--ink); }
  .chapter-lessons > summary .count {
    margin-left: auto; font-variant-numeric: tabular-nums;
    border: 1px solid var(--border); border-radius: 100px;
    padding: 0.05rem 0.55rem; color: var(--ink-3);
  }
  .chapter-lessons-body { padding: 0 1.1rem 1.1rem; }
  .chapter-lessons .lesson-row { margin-left: 0; background: var(--surface-2); }

  .quick-add {
    border-top: 1px dashed var(--border); margin-top: 1rem; padding-top: 1rem;
  }
  .quick-add-row {
    display: flex; gap: 0.6rem; align-items: flex-end; flex-wrap: wrap;
  }
  .quick-add-row .btn { height: 2.55rem; }
  @media (max-width: 600px) {
    .quick-add-row > * { width: 100%; }
    .quick-add-row .btn { justify-content: center; }
  }


`;

export const TUTORIALS_ADMIN_STYLES = `
<style>
${ADMIN_STYLES}
${BADGE_STYLES}
${EMPTY_STATE_STYLES}
${SUBJECT_ROW_STYLES}
${MARKDOWN_EDITOR_STYLES}
${CHIP_CSS}
</style>`;
