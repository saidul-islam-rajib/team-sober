import { LiveProject } from '../../live-projects/live-project.model';
import { hostOf } from '../../settings/settings.model';
import { getSettings } from '../../settings/settings.store';
import { esc, IMAGE_SKELETON, layout } from '../shared/layout';
import { PROSE_BUNDLE } from '../shared/styles/prose.styles';
import { LIGHTBOX_SCRIPT } from '../shared/scripts/lightbox';

export const LIVE_PROJECTS_CSS = `
<style>
  .live-grid { display: grid; gap: 1.1rem; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); }
  .live-card {
    border: 1px solid var(--border); border-radius: 14px; overflow: hidden;
    background: var(--surface); display: flex; flex-direction: column;
    transition: border-color .18s, transform .18s;
  }
  .live-card:hover { border-color: var(--accent); transform: translateY(-2px); }
  .live-cover {
    display: block; width: 100%; aspect-ratio: 2 / 1; object-fit: cover;
    border-bottom: 1px solid var(--border);
  }
  .live-cover-fallback {
    display: grid; place-items: center; aspect-ratio: 2 / 1;
    background: linear-gradient(135deg, var(--surface-2), var(--bg));
    border-bottom: 1px solid var(--border);
    font-family: var(--serif); font-size: 1.5rem; color: var(--ink-3);
  }
  .live-body { padding: 1rem 1.1rem 1.15rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
  .live-title { font-size: 1.08rem; line-height: 1.3; }
  .live-card:hover .live-title { color: var(--accent); }
  .live-desc { font-size: 0.88rem; color: var(--ink-3); line-height: 1.55; flex: 1; }
  .live-host {
    display: inline-flex; align-items: center; gap: 0.35rem;
    font-size: 0.78rem; color: var(--ink-3);
  }
  .live-host img { width: 14px; height: 14px; border-radius: 3px; }

  /* ---------- detail ---------- */
  .live-detail-cover {
    width: 100%; border-radius: 14px; border: 1px solid var(--border);
    margin-bottom: 1.75rem; display: block; aspect-ratio: 2 / 1; object-fit: cover;
  }
  .live-detail-head h1 {
    font-family: var(--serif); font-size: clamp(1.9rem, 5vw, 2.6rem);
    line-height: 1.12; letter-spacing: -0.03em; margin-bottom: 0.6rem;
  }
  .live-detail-head .lead { font-size: 1.06rem; color: var(--ink-2); line-height: 1.65; max-width: 40em; }
  .live-detail-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; margin: 1.5rem 0 2rem; align-items: center; }
  .live-gallery {
    display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    margin-top: 0.5rem;
  }
  .live-gallery img { margin: 0 !important; aspect-ratio: 4 / 3; object-fit: cover; }

  @media (max-width: 600px) {
    .live-grid { grid-template-columns: 1fr; }
    .live-detail-actions .btn { width: 100%; justify-content: center; }
  }

${PROSE_BUNDLE}
</style>`;

function cover(project: LiveProject, cls = 'live-cover'): string {
  const src = project.images[0] || project.previewImage;
  return src
    ? `<img class="${cls} skel" src="${esc(src)}" alt="${esc(project.title)}" loading="lazy" />`
    : `<div class="live-cover-fallback">${esc(project.title.slice(0, 2).toUpperCase())}</div>`;
}

function hostChip(project: LiveProject): string {
  if (!project.url) return '';

  return `<span class="live-host">
    ${project.favicon ? `<img src="${esc(project.favicon)}" alt="" loading="lazy" />` : ''}
    ${esc(hostOf(project.url))}
  </span>`;
}

export function liveProjectCard(project: LiveProject): string {
  return `
  <article class="live-card">
    <a href="/live/${esc(project.slug)}">${cover(project)}</a>
    <div class="live-body">
      ${hostChip(project)}
      <a href="/live/${esc(project.slug)}"><h3 class="live-title">${esc(project.title)}</h3></a>
      ${project.description ? `<p class="live-desc">${esc(project.description)}</p>` : ''}
    </div>
  </article>`;
}

export function liveProjectDetailPage(project: LiveProject): string {
  const s = getSettings();

  const body = `
${LIVE_PROJECTS_CSS}
${IMAGE_SKELETON}
  <a href="/about" style="font-size:.86rem;color:var(--ink-3)">← Back to About</a>

  <div style="margin-top:1.25rem">
    <header class="live-detail-head">
      <h1>${esc(project.title)}</h1>
      ${project.description ? `<p class="lead">${esc(project.description)}</p>` : ''}
    </header>

    <div class="live-detail-actions">
      ${project.url ? `<a class="btn" href="${esc(project.url)}" target="_blank" rel="noopener noreferrer">Visit live site ↗</a>` : ''}
      ${hostChip(project)}
    </div>

    ${project.previewImage ? `<img class="live-detail-cover skel" src="${esc(project.previewImage)}" alt="${esc(project.title)}" />` : ''}

    ${
      project.images.length
        ? `<div class="prose">
      <div class="live-gallery">
        ${project.images
          .map(
            (url) =>
              `<img class="skel" src="${esc(url)}" alt="${esc(project.title)}" loading="lazy" decoding="async" />`,
          )
          .join('')}
      </div>
    </div>`
        : ''
    }
  </div>`;

  return layout({
    title: `${project.title} — ${s.siteTitle}`,
    description:
      project.description ||
      `${project.title}, a live project by ${s.siteTitle}.`,
    body: body + LIGHTBOX_SCRIPT,
    path: `/live/${project.slug}`,
    image: project.previewImage || project.images[0],
    ogType: 'website',
    publishedAt: project.createdAt,
  });
}

export function liveProjectNotFoundPage(): string {
  const s = getSettings();

  return layout({
    title: `Not found — ${s.siteTitle}`,
    description: 'That live project could not be found.',
    body: `
  <div class="empty">
    <p>That live project could not be found.</p>
    <p style="margin-top:1.25rem"><a class="btn btn-ghost" href="/about">Back to About</a></p>
  </div>`,
    path: '/live',
    noindex: true,
  });
}
