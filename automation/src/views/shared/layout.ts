export function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface LayoutOptions {
  title: string;
  description?: string;
  body: string;
  nav?: string;
  variant?: 'default' | 'article' | 'admin';
  path?: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  ogType?: 'website' | 'article' | 'profile';
  publishedAt?: string;
  head?: string;
  styles?: AssetRef[];
  scripts?: AssetRef[];
  noindex?: boolean;
}

import {
  APPLE_TOUCH_ICON_SIZE,
  MANIFEST_THEME_COLOR,
} from '../../seo/manifest.model';
import { initials } from '../../settings/settings.model';
import { getSettings } from '../../settings/settings.store';
import { AssetRef, assetHref } from '../../shared/assets/asset.store';
import { CARD_HEIGHT, CARD_WIDTH } from '../../uploads/images.service';

function styleLinks(refs: AssetRef[] = []): string {
  return refs
    .map((ref) => assetHref(ref))
    .filter(Boolean)
    .map((href) => `<link rel="stylesheet" href="${esc(href)}" />`)
    .join('\n');
}

function scriptTags(refs: AssetRef[] = []): string {
  return refs
    .map((ref) => assetHref(ref))
    .filter(Boolean)
    .map((href) => `<script src="${esc(href)}" defer></script>`)
    .join('\n');
}

export function footerLogo(): string {
  return `
    <svg viewBox="0 0 64 64" width="24" height="24" role="img" aria-label="Team Sober logo" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:0.5rem;">
      <rect width="64" height="64" rx="15" fill="#0f172a" />
      <path d="M48.5 33.5 A17 17 0 1 1 30.5 15.05" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" />
      <path d="M36.4 27.6 L36.4 16.4 A11.2 11.2 0 0 1 47.6 27.6 Z" fill="#f59e0b" stroke="#f59e0b" stroke-width="3.2" stroke-linejoin="round" />
    </svg>
  `;
}

export function avatarMark(
  avatarUrl: string,
  name: string,
  cls = 'mark',
): string {
  if (!avatarUrl) {
    return `<span class="${cls}">${esc(initials(name))}</span>`;
  }

  const src = avatarUrl.startsWith('/uploads/')
    ? `/img/${avatarUrl.slice('/uploads/'.length)}?w=200`
    : avatarUrl;

  return `<img class="${cls} avatar-img" src="${esc(src)}" alt="${esc(name)}"
    width="200" height="200" decoding="async" fetchpriority="high" />`;
}

export const HTML_CACHE_CONTROL = 'no-cache, must-revalidate';

export const IMAGE_SKELETON = `
<style>
  .skel {
    background-color: var(--surface-2);
    background-image: linear-gradient(
      100deg,
      transparent 25%,
      color-mix(in srgb, var(--ink-3) 14%, transparent) 45%,
      transparent 65%
    );
    background-size: 220% 100%;
    background-repeat: no-repeat;
    animation: skel-sweep 1.25s ease-in-out infinite;
  }
  /*
   * Loaded: drop the sweep so it is not animating for the rest of the visit
   * behind a picture nobody can see it through, and fade the image in. The
   * fade is a one-shot keyframe applied only here, so opacity is never held
   * at zero waiting for an event that might not come.
   */
  .skel.is-loaded {
    background-image: none;
    animation: skel-in .3s ease-out;
  }
  /* A broken image keeps the tint but stops pretending it is still coming. */
  .skel.is-error { background-image: none; animation: none; }

  @keyframes skel-sweep {
    from { background-position: 180% 0; }
    to { background-position: -80% 0; }
  }
  @keyframes skel-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* A sweeping gradient is exactly the motion this setting asks us to drop. */
  @media (prefers-reduced-motion: reduce) {
    .skel, .skel.is-loaded { animation: none; }
  }
</style>
<script>
(function () {
  function settle(target, state) {
    if (target && target.tagName === 'IMG' && target.classList.contains('skel')) {
      target.classList.add(state);
    }
  }

  // load and error do not bubble, so these listen in the capture phase.
  // One pair then covers every skeleton image on the page, including the
  // ones the slider reveals later and the one the modal swaps its src on.
  document.addEventListener('load', function (ev) {
    settle(ev.target, 'is-loaded');
  }, true);
  document.addEventListener('error', function (ev) {
    settle(ev.target, 'is-error');
  }, true);

  // An image already in cache can finish before this runs, and its load
  // event is then long gone. Catch those by asking rather than waiting.
  document.querySelectorAll('img.skel').forEach(function (img) {
    if (img.complete && img.naturalWidth > 0) img.classList.add('is-loaded');
  });
})();
</script>`;

export function layout({
  title,
  description,
  body,
  nav,
  variant = 'default',
  path = '/',
  image,
  imageWidth,
  imageHeight,
  ogType = 'website',
  publishedAt,
  head = '',
  styles = [],
  scripts = [],
  noindex = false,
}: LayoutOptions): string {
  const s = getSettings();
  const navigation = nav ?? defaultNav(path);
  const base = (s.siteUrl || '').replace(/\/+$/, '');
  const absolute = (target: string): string =>
    /^https?:\/\//i.test(target)
      ? target
      : `${base}${target.startsWith('/') ? '' : '/'}${target}`;

  const canonical = absolute(path);

  const preview = image ?? (s.avatarUrl || '');

  const cardName =
    preview.startsWith('/uploads/') && !/\.(svg|gif)(\?|$)/i.test(preview)
      ? preview.slice('/uploads/'.length)
      : '';

  const previewUrl = preview
    ? absolute(cardName ? `/img/og/${cardName}` : preview)
    : '';

  const previewType = cardName
    ? 'image/jpeg'
    : /\.png(\?|$)/i.test(previewUrl)
      ? 'image/png'
      : /\.(jpe?g)(\?|$)/i.test(previewUrl)
        ? 'image/jpeg'
        : /\.webp(\?|$)/i.test(previewUrl)
          ? 'image/webp'
          : '';

  const summary = description || s.shareIntro || s.authorBio || s.siteTagline;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(summary)}" />
<meta name="theme-color" content="${MANIFEST_THEME_COLOR}" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="${esc(s.siteTitle)}" />
<link rel="canonical" href="${esc(canonical)}" />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" sizes="${APPLE_TOUCH_ICON_SIZE}x${APPLE_TOUCH_ICON_SIZE}" href="/icons/apple-touch-icon.png" />
<link rel="alternate" type="application/rss+xml" title="${esc(s.siteTitle)}" href="${esc(absolute('/feed.xml'))}" />
${noindex ? '<meta name="robots" content="noindex, nofollow" />' : '<meta name="robots" content="index, follow" />'}

<!-- Open Graph: Facebook, LinkedIn, WhatsApp, Slack -->
  <meta property="og:site_name" content="${esc(s.siteTitle)}" />
<meta property="og:type" content="${esc(ogType)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(summary)}" />
<meta property="og:url" content="${esc(canonical)}" />
<meta property="og:locale" content="en_US" />
${
  previewUrl
    ? [
        `<meta property="og:image" content="${esc(previewUrl)}" />`,
        ...(cardName
          ? [
              `<meta property="og:image:width" content="${CARD_WIDTH}" />`,
              `<meta property="og:image:height" content="${CARD_HEIGHT}" />`,
            ]
          : imageWidth && imageHeight
            ? [
                `<meta property="og:image:width" content="${imageWidth}" />`,
                `<meta property="og:image:height" content="${imageHeight}" />`,
              ]
            : []),
        previewType
          ? `<meta property="og:image:type" content="${previewType}" />`
          : '',
        previewUrl.startsWith('https://')
          ? `<meta property="og:image:secure_url" content="${esc(previewUrl)}" />`
          : '',
        `<meta property="og:image:alt" content="${esc(title)}" />`,
      ]
        .filter(Boolean)
        .join('\n')
    : ''
}
${
  publishedAt
    ? `<meta property="article:published_time" content="${esc(publishedAt)}" />
  <meta property="article:author" content="${esc(s.siteTitle)}" />`
    : ''
}

<!-- Twitter / X -->
<meta name="twitter:card" content="${previewUrl ? 'summary_large_image' : 'summary'}" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(summary)}" />
${previewUrl ? `<meta name="twitter:image" content="${esc(previewUrl)}" />` : ''}
${styleLinks(styles)}
${head}
<style>
  :root {
    --bg: #f5f7fb;
    --surface: #ffffff;
    --surface-2: #eef2f7;
    --border: #dfe6ee;
    --ink: #0f172a;
    --ink-2: #334155;
    --ink-3: #64748b;
    --accent: #0f766e;
    --accent-ink: #ffffff;
    --danger: #b42318;
    --good: #067647;
    --warn: #b54708;
    --serif: "Iowan Old Style", "Palatino Linotype", "Source Serif Pro", Georgia, serif;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", sans-serif;
    --mono: ui-monospace, SFMono-Regular, "Cascadia Code", Menlo, monospace;
    --measure: 760px;
    --radius: 20px;
    --shadow-soft: 0 16px 40px rgba(15, 23, 42, 0.08);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f1115;
      --surface: #161920;
      --surface-2: #1c2029;
      --border: #2a2f3a;
      --ink: #f2f4f7;
      --ink-2: #c3c8d2;
      --ink-3: #8a92a3;
      --accent: #2dd4bf;
      --accent-ink: #06251f;
      --danger: #f97066;
      --good: #4ade80;
      --warn: #fdb022;
    }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
  body {
    min-height: 100vh;
    background: linear-gradient(180deg, var(--bg) 0%, color-mix(in srgb, var(--surface-2) 70%, var(--bg)) 100%);
    color: var(--ink-2);
    font-family: var(--sans);
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
    padding-bottom: env(safe-area-inset-bottom);
  }
  a { color: inherit; text-decoration: none; }
  img { max-width: 100%; }

  /* ---------- header ---------- */
  .site-header {
    position: sticky; top: 0; z-index: 20;
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    backdrop-filter: saturate(180%) blur(12px);
    border-bottom: 1px solid var(--border);
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
  }
  .header-inner {
    max-width: 1100px; margin: 0 auto;
    padding: 0.8rem clamp(1rem, 2.4vw, 1.45rem);
    display: flex; align-items: center; gap: 1rem;
    min-height: 68px;
  }
  .wordmark {
    display: flex; align-items: center; gap: 0.6rem;
    font-weight: 700; color: var(--ink); letter-spacing: -0.02em;
    font-size: 1.02rem; white-space: nowrap;
  }
  .mark {
    width: 30px; height: 30px; border-radius: 50%;
    background: var(--accent); color: var(--accent-ink);
    display: grid; place-items: center;
    font-size: 0.8rem; font-weight: 800; flex-shrink: 0;
  }
  .avatar-img { object-fit: cover; padding: 0; }
  /* ---------- navigation ---------- */
  .nav { margin-left: auto; display: flex; align-items: center; gap: 1rem; font-size: 0.92rem; }
  .nav a { color: var(--ink-3); position: relative; padding: 0.2rem 0; white-space: nowrap; font-weight: 600; }
  .nav a:hover { color: var(--ink); }
  .nav a.active:not(.btn) { color: var(--ink); font-weight: 600; }
  .nav a.active:not(.btn)::after {
    content: ""; position: absolute; left: 0; right: 0; bottom: -3px;
    height: 2px; background: var(--accent); border-radius: 2px;
  }

  .nav-group { position: relative; display: inline-flex; align-items: center; }
  .nav-group-toggle { position: absolute; opacity: 0; pointer-events: none; }
  .nav-group-label {
    display: inline-block; line-height: inherit;
    color: var(--ink-3); font-weight: 600; cursor: pointer;
    padding: 0.2rem 0; white-space: nowrap; user-select: none;
  }
  .nav-group-label:hover { color: var(--ink); }
  .nav-group-label.active { color: var(--ink); }
  .nav-group-toggle:focus-visible ~ .nav-group-label {
    outline: 2px solid var(--accent); outline-offset: 2px;
  }

  .nav-group-menu {
    position: absolute; top: calc(100% + 0.2rem); left: 0; z-index: 30;
    display: flex; flex-direction: column; gap: 0.15rem; min-width: 160px;
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    padding: 0.4rem; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.14);
    opacity: 0; visibility: hidden; transform: translateY(-4px);
    transition: opacity .16s, transform .16s, visibility .16s;
  }
  .nav-group-toggle:checked ~ .nav-group-menu {
    opacity: 1; visibility: visible; transform: translateY(0);
  }
  .nav-group-menu a { padding: 0.5rem 0.6rem; border-radius: 8px; }
  .nav-group-menu a:hover { background: var(--surface-2); }
  .nav-group-menu a.active { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
  .nav-group-menu a.active::after { display: none; }

  @media (hover: hover) and (pointer: fine) {
    .nav-group:hover .nav-group-menu,
    .nav-group:focus-within .nav-group-menu {
      opacity: 1; visibility: visible; transform: translateY(0);
    }
  }

  .nav-profile { margin-left: 0.3rem; }
  .nav-profile-link { display: flex; align-items: center; }
  .nav-profile .mark { width: 32px; height: 32px; font-size: 0.82rem; }
  .nav-profile-name { display: none; }
  .nav-profile-menu { right: 0; left: auto; min-width: 200px; }
  .nav-profile-who { padding: 0.55rem 0.6rem 0.7rem; border-bottom: 1px solid var(--border); margin-bottom: 0.3rem; }
  .nav-profile-who b { display: block; font-size: 0.86rem; color: var(--ink); }
  .nav-profile-who span { font-size: 0.76rem; color: var(--ink-3); }
  .nav-profile-menu .nav-profile-signout { border-top: 1px solid var(--border); margin-top: 0.3rem; padding-top: 0.45rem; }

  .nav-head, .nav-overlay { display: none; }

  /*
   * A hidden checkbox drives the drawer, so it opens with scripting
   * disabled. Script only closes it on tap, Escape or outside click.
   */
  .nav-toggle { position: absolute; opacity: 0; pointer-events: none; }
  .nav-burger {
    display: none; cursor: pointer;
    width: 42px; height: 42px; border-radius: 10px; margin-right: 0.15rem;
    align-items: center; justify-content: center; flex-direction: column; gap: 4px;
  }
  .nav-burger:hover { background: var(--surface-2); }
  .nav-burger span {
    display: block; width: 18px; height: 2px; border-radius: 2px;
    background: var(--ink); transition: transform .2s, opacity .2s;
  }
  .nav-toggle:focus-visible + .nav-burger {
    outline: 2px solid var(--accent); outline-offset: 2px;
  }

  /* Tablet: tighten before collapsing. */
  @media (max-width: 1040px) {
    .nav { gap: 0.85rem; font-size: 0.86rem; }
  }

  @media (max-width: 860px) {
    /*
     * backdrop-filter makes the header a containing block for fixed-position
     * descendants, which pinned the drawer to the header's height and clipped
     * every link. Dropping it restores the viewport as the containing block.
     */
    .site-header { backdrop-filter: none; background: var(--bg); }

    /* Burger sits first, so it lands on the left of the header. */
    .nav-burger { display: flex; order: -1; }
    .wordmark { font-size: 0.98rem; }

    .nav-overlay {
      display: block; position: fixed; inset: 0; z-index: 40;
      background: rgba(0, 0, 0, 0.45);
      opacity: 0; visibility: hidden; transition: opacity .22s;
    }
    .nav-toggle:checked ~ .nav-overlay { opacity: 1; visibility: visible; }

    .nav {
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 50;
      width: 82%; max-width: 320px;
      margin: 0; gap: 0; font-size: 1rem;
      flex-direction: column; align-items: stretch;
      background: var(--bg); border-right: 1px solid var(--border);
      box-shadow: 4px 0 24px rgba(0, 0, 0, 0.18);
      transform: translateX(-100%);
      transition: transform .24s ease;
      overflow-y: auto;
    }
    .nav-toggle:checked ~ .nav { transform: translateX(0); }

    .nav-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.1rem; background: var(--accent); color: var(--accent-ink);
      font-weight: 700; font-size: 0.95rem; flex-shrink: 0;
    }
    .nav-close {
      cursor: pointer; font-size: 1.5rem; line-height: 1;
      color: var(--accent-ink); padding: 0 0.2rem;
    }

    .nav a {
      padding: 0.95rem 1.1rem; color: var(--ink-2);
      border-bottom: 1px solid var(--border);
    }
    .nav a:hover { background: var(--surface-2); color: var(--ink); }
    /* A full-width row needs a bar, not an underline, to read as current. */
    .nav a.active:not(.btn)::after { display: none; }
    .nav a.active:not(.btn) {
      color: var(--accent); background: var(--surface-2);
      box-shadow: inset 3px 0 0 var(--accent);
    }

    .nav-group-label {
      width: 100%; padding: 0.95rem 1.1rem; color: var(--ink-2);
      border-bottom: 1px solid var(--border); justify-content: space-between;
    }
    .nav-group-label:hover { background: var(--surface-2); color: var(--ink); }
    .nav-group-label.active { color: var(--accent); }
    .nav-group-menu {
      position: static; opacity: 1; visibility: visible; transform: none;
      max-height: 0; overflow: hidden; border: 0; box-shadow: none;
      border-radius: 0; padding: 0; gap: 0; background: var(--surface-2);
      transition: max-height .2s ease;
    }
    .nav-group-toggle:checked ~ .nav-group-menu { max-height: 20rem; }
    .nav-group-menu a {
      padding: 0.8rem 1.1rem 0.8rem 1.8rem; border-radius: 0;
      border-bottom: 1px solid var(--border);
    }

    .nav-profile { width: 100%; margin-left: 0; border-bottom: 1px solid var(--border); }
    .nav-profile-link { flex: 1; padding: 0.95rem 1.1rem; gap: 0.7rem; color: var(--ink-2); }
    .nav-profile-link:hover { background: var(--surface-2); color: var(--ink); }
    .nav-profile-link.active { color: var(--accent); box-shadow: inset 3px 0 0 var(--accent); }
    .nav-profile-name { display: inline-block; font-size: 0.96rem; }
    .nav-profile-menu { min-width: 0; }
  }

  /* Freeze the page behind an open drawer. */
  @media (max-width: 860px) {
    html:has(.nav-toggle:checked) { overflow: hidden; }
  }

  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
    padding: 0.6rem 1rem; border-radius: 999px;
    background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 78%, #111827));
    color: var(--accent-ink) !important;
    font-weight: 700; font-size: 0.9rem; border: 0; cursor: pointer;
    font-family: inherit; box-shadow: 0 10px 24px rgba(15, 118, 110, 0.2);
  }
  .btn:hover { opacity: 0.9; }
  .btn-ghost {
    background: transparent; color: var(--ink-2) !important;
    border: 1px solid var(--border);
  }
  .btn-danger { background: var(--danger); color: #fff !important; }
  .btn-sm { padding: 0.32rem 0.7rem; font-size: 0.8rem; }

  /* ---------- shell ---------- */
  .shell { max-width: 1100px; margin: 0 auto; padding: clamp(1.25rem, 3vw, 2.2rem) clamp(1rem, 2.4vw, 1.45rem) 4.5rem; }
  .shell.article { max-width: var(--measure); }
  .shell.admin { max-width: 1100px; }
  .shell:not(.admin) :where(article, section, .flash, .empty) {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: var(--shadow-soft);
    padding: 1.15rem;
  }
  .shell:not(.admin) :where(article, section, .flash, .empty) + :where(article, section, .flash, .empty) {
    margin-top: 1rem;
  }

  /* ---------- typography ---------- */
  h1, h2, h3, h4 { color: var(--ink); letter-spacing: -0.022em; line-height: 1.25; }
  .page-title { font-size: 2rem; margin-bottom: 0.4rem; }
  .page-sub { color: var(--ink-3); margin-bottom: 2rem; }
  .section-label {
    font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--ink-3); font-weight: 700;
    padding-bottom: 0.65rem; margin-bottom: 1.1rem;
    border-bottom: 1px solid var(--border);
  }

  /* ---------- tags ---------- */
  .tag {
    display: inline-block;
    font-size: 0.76rem; padding: 0.25rem 0.7rem; border-radius: 100px;
    background: var(--surface-2); color: var(--ink-2);
    border: 1px solid var(--border);
  }
  .tag:hover { border-color: var(--accent); color: var(--ink); }
  .tag-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }

  /* ---------- forms ---------- */
  label { display: block; font-size: 0.82rem; font-weight: 600; color: var(--ink-2); margin-bottom: 0.4rem; }
  input[type="text"], input[type="password"], input[type="search"],
  input[type="email"], input[type="url"], input[type="number"],
  input[type="date"], textarea, select {
    width: 100%; padding: 0.65rem 0.8rem;
    background: var(--surface); color: var(--ink);
    border: 1px solid var(--border); border-radius: 8px;
    font-size: 0.94rem; font-family: inherit;
  }
  textarea { resize: vertical; line-height: 1.6; }
  textarea.mono { font-family: var(--mono); font-size: 0.88rem; }
  input:focus, textarea:focus, select:focus {
    outline: none; border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
  }
  .field { margin-bottom: 1.1rem; }
  .hint { font-size: 0.78rem; color: var(--ink-3); margin-top: 0.35rem; }

  /* ---------- flash ---------- */
  .flash {
    padding: 0.7rem 0.95rem; border-radius: 8px; margin-bottom: 1.5rem;
    font-size: 0.89rem; border: 1px solid var(--border); background: var(--surface-2);
  }
  .flash.ok { border-color: color-mix(in srgb, var(--good) 45%, var(--border)); color: var(--good); }
  .flash.err { border-color: color-mix(in srgb, var(--danger) 45%, var(--border)); color: var(--danger); }

  .empty {
    text-align: center; padding: 3.5rem 1rem;
    color: var(--ink-3); border: 1px dashed var(--border); border-radius: 12px;
  }

  footer.site-footer {
    border-top: 1px solid var(--border);
    padding: 2rem 1.25rem 3rem; margin-top: 3rem;
    color: var(--ink-3); font-size: 0.9rem;
    background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--surface-2) 60%, transparent));
  }
  .footer-inner {
    max-width: 1100px; margin: 0 auto;
    display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  }
  .footer-inner a { color: var(--accent); }
  .footer-inner a:hover { text-decoration: underline; }

  .footer-subscribe {
    max-width: 1100px; margin: 0 auto 1.5rem;
    padding: 0 clamp(1rem, 2.4vw, 1.45rem);
  }
  .footer-subscribe label {
    font-size: 0.8rem; font-weight: 600; color: var(--ink-2); margin-bottom: 0.5rem;
  }
  .footer-subscribe-row { display: flex; gap: 0.5rem; max-width: 380px; }
  .footer-subscribe-row input { flex: 1; }

  .pwa-toast {
    position: fixed; left: 1rem; right: 1rem; bottom: 1rem; z-index: 60;
    max-width: 420px; margin: 0 auto;
    display: flex; align-items: center; gap: 0.75rem;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; padding: 0.85rem 1rem;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
    font-size: 0.88rem; color: var(--ink-2);
  }
  .pwa-toast[hidden] { display: none; }
  .pwa-toast span:first-child { flex: 1; }
  .pwa-toast-dismiss {
    background: transparent; border: 0; cursor: pointer; color: var(--ink-3);
    font-size: 1.2rem; line-height: 1; padding: 0.2rem; flex-shrink: 0;
  }
  .pwa-toast-dismiss:hover { color: var(--ink); }

  @media (max-width: 640px) {
    .page-title { font-size: 1.6rem; }
    .header-inner { min-height: 60px; padding: 0.7rem 0.9rem; }
    .nav { gap: 0.75rem; font-size: 0.85rem; }
    .shell { padding: 1rem 0.9rem 3.25rem; }
    .shell:not(.admin) :where(article, section, .flash, .empty) { padding: 1rem; border-radius: 16px; }
    .footer-inner { flex-direction: column; gap: 0.75rem; }
  }
</style>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Open menu" />
      <label for="nav-toggle" class="nav-burger" aria-hidden="true">
        <span></span><span></span><span></span>
      </label>
      <a class="wordmark" href="/">${footerLogo()} <span class="site-title">${esc(s.siteTitle)}</span></a>
      <label for="nav-toggle" class="nav-overlay" aria-hidden="true"></label>
      <nav class="nav" id="site-nav">
        <div class="nav-head">
          <span>Menu</span>
          <label for="nav-toggle" class="nav-close" aria-hidden="true">&times;</label>
        </div>
        ${navigation}
      </nav>
    </div>
  </header>

  <main class="shell ${variant}">
${body}
  </main>

  <footer class="site-footer">
    <div class="footer-subscribe">
      <form method="post" action="/subscribe">
        <label for="footer-email">Get new posts by email</label>
        <div class="footer-subscribe-row">
          <input type="email" id="footer-email" name="email" placeholder="you@example.com" required />
          <button class="btn btn-sm" type="submit">Subscribe</button>
        </div>
      </form>
    </div>
    <div class="footer-inner">
      <span>
        ${footerLogo()}
        © ${new Date().getFullYear()}.
        ${
          s.footerOwner
            ? s.footerOwnerUrl
              ? `<a href="${esc(s.footerOwnerUrl)}" target="_blank" rel="noopener noreferrer">${esc(s.footerOwner)}</a>.`
              : `${esc(s.footerOwner)}.`
            : ''
        }
        ${esc(s.footerSuffix)}
      </span>
      <span>
        ${s.footerLinks
          .map((link) =>
            link.url.startsWith('/')
              ? `<a href="${esc(link.url)}">${esc(link.label)}</a>`
              : `<a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)}</a>`,
          )
          .join(' · ')}
      </span>
    </div>
  </footer>

  <div class="pwa-toast" id="pwa-toast" hidden role="status">
    <span id="pwa-toast-text"></span>
    <button type="button" class="btn btn-sm" id="pwa-toast-action"></button>
    <button type="button" class="pwa-toast-dismiss" id="pwa-toast-dismiss" aria-label="Dismiss">&times;</button>
  </div>
<script>
(function () {
  var toggle = document.getElementById('nav-toggle');
  if (!toggle) return;

  var groupToggles = document.querySelectorAll('.nav-group-toggle');

  function closeGroups() {
    groupToggles.forEach(function (box) { box.checked = false; });
  }

  groupToggles.forEach(function (box) {
    box.addEventListener('change', function () {
      if (!box.checked) return;
      groupToggles.forEach(function (other) {
        if (other !== box) other.checked = false;
      });
    });
  });

  document.getElementById('site-nav').addEventListener('click', function (ev) {
    if (ev.target.tagName === 'A') toggle.checked = false;
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    toggle.checked = false;
    closeGroups();
  });

  document.addEventListener('click', function (ev) {
    // The overlay is inside the header, so an outside click means the page.
    if (!ev.target.closest('.site-header')) toggle.checked = false;
    if (!ev.target.closest('.nav-group')) closeGroups();
  });

  // Scroll lock for browsers without :has() support.
  function syncLock() {
    document.documentElement.style.overflow =
      toggle.checked && window.matchMedia('(max-width: 860px)').matches
        ? 'hidden'
        : '';
  }

  toggle.addEventListener('change', syncLock);
  window.addEventListener('resize', syncLock);
  syncLock();
})();
</script>
<script>
(function () {
  var toast = document.getElementById('pwa-toast');
  var text = document.getElementById('pwa-toast-text');
  var action = document.getElementById('pwa-toast-action');
  var dismiss = document.getElementById('pwa-toast-dismiss');
  if (!toast) return;

  var current = null;
  var currentDismiss = null;

  function show(message, actionLabel, onAction, onDismiss) {
    if (current) return;
    current = onAction;
    currentDismiss = onDismiss;
    text.textContent = message;
    action.textContent = actionLabel;
    toast.hidden = false;
  }

  function hide() {
    current = null;
    currentDismiss = null;
    toast.hidden = true;
  }

  action.addEventListener('click', function () {
    var handler = current;
    hide();
    if (handler) handler();
  });

  dismiss.addEventListener('click', function () {
    var handler = currentDismiss;
    hide();
    if (handler) handler();
  });

  var deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function (ev) {
    ev.preventDefault();
    deferredPrompt = ev;
    show('Install this app for quick access?', 'Install', function () {
      var prompted = deferredPrompt;
      deferredPrompt = null;
      if (prompted) prompted.prompt();
    });
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    hide();
  });

  function iosInstallHintDismissed() {
    try {
      return localStorage.getItem('pwa-ios-hint-dismissed') === '1';
    } catch (error) {
      return false;
    }
  }

  function dismissIosInstallHint() {
    try {
      localStorage.setItem('pwa-ios-hint-dismissed', '1');
    } catch (error) {
      // Private browsing can refuse localStorage; the hint just reappears.
    }
  }

  var isStandalone =
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;

  var isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS && !isStandalone && !iosInstallHintDismissed()) {
    show(
      'Install this app: tap Share, then "Add to Home Screen".',
      'Got it',
      dismissIosInstallHint,
      dismissIosInstallHint,
    );
  }

  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/service-worker.js').then(function (reg) {
      reg.addEventListener('updatefound', function () {
        if (!reg.active) return;
        var installing = reg.installing;
        if (!installing) return;

        installing.addEventListener('statechange', function () {
          if (installing.state === 'activated') {
            show('A new version is available.', 'Reload', function () {
              window.location.reload();
            });
          }
        });
      });
    }).catch(function (error) {
      console.warn('Service worker registration failed', error);
    });
  });
})();
</script>
${scriptTags(scripts)}
</body>
</html>`;
}

function navLink(
  href: string,
  label: string,
  path: string,
  target = href,
): string {
  const active =
    href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);

  return `<a href="${target}" class="${active ? 'active' : ''}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
}

export function defaultNav(path = '/'): string {
  return [
    navLink('/', 'Home', path),
    navLink('/tutorials', 'Tutorials', path),
    navLink('/projects', 'Projects', path),
    navLink('/about', 'About', path),
    navLink('/tags', 'Tags', path),
    navLink('/account', 'Account', path),
    navLink('/admin', 'Dashboard', path),
  ].join('');
}

function navGroup(
  id: string,
  label: string,
  items: [string, string][],
  path: string,
): string {
  const active = items.some(
    ([href]) => path === href || path.startsWith(`${href}/`),
  );

  return `<div class="nav-group">
    <input type="checkbox" id="${id}" class="nav-group-toggle"${active ? ' checked' : ''} />
    <label for="${id}" class="nav-group-label${active ? ' active' : ''}">${label}</label>
    <div class="nav-group-menu">
      ${items.map(([href, text]) => navLink(href, text, path)).join('')}
    </div>
  </div>`;
}

const ADMIN_NAV_GROUPS: [string, string, [string, string][]][] = [
  [
    'nav-content',
    'Content',
    [
      ['/admin/projects', 'Projects'],
      ['/admin/tutorials', 'Tutorials'],
      ['/admin/about', 'About'],
    ],
  ],
  [
    'nav-people',
    'People',
    [
      ['/admin/accounts', 'Accounts'],
      ['/admin/admins', 'Admins'],
    ],
  ],
  [
    'nav-engagement',
    'Engagement',
    [
      ['/admin/comments', 'Comments'],
      ['/admin/newsletter', 'Newsletter'],
    ],
  ],
];

const ACCOUNT_HUB_PATH = '/admin/account';

function profileMenu(path: string): string {
  const s = getSettings();
  const active =
    path === ACCOUNT_HUB_PATH ||
    path.startsWith('/admin/settings') ||
    path.startsWith('/admin/system');

  return `<div class="nav-group nav-profile">
    <a href="${ACCOUNT_HUB_PATH}" class="nav-profile-link${active ? ' active' : ''}" aria-label="Account">
      ${avatarMark(s.avatarUrl, s.authorName)}
      <span class="nav-profile-name">${esc(s.authorName)}</span>
    </a>
    <div class="nav-group-menu nav-profile-menu">
      <div class="nav-profile-who"><b>${esc(s.authorName)}</b><span>${esc(s.authorRole)}</span></div>
      ${navLink(ACCOUNT_HUB_PATH, 'Account', path)}
      ${navLink('/admin/settings', 'Settings', path)}
      ${navLink('/admin/system', 'System', path)}
      <div class="nav-profile-signout"><a href="/logout">Sign out</a></div>
    </div>
  </div>`;
}

export function adminNav(path = '/admin'): string {
  return [
    '<a href="/">View site</a>',
    `<a href="/admin" class="${path === '/admin' ? 'active' : ''}">Dashboard</a>`,
    navLink('/admin/posts', 'Write', path, '/admin/posts/new'),
    ...ADMIN_NAV_GROUPS.map(([id, label, items]) =>
      navGroup(id, label, items, path),
    ),
    profileMenu(path),
  ].join('');
}
