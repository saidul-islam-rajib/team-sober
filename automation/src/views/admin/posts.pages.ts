import {
  Post,
  formatDate,
  isScheduled,
  readingMinutes,
  toLocalInput,
} from '../../posts/post.model';
import { IMAGE_SKELETON, adminNav, esc, layout } from '../shared/layout';
import { CHIP_CSS, CHIP_JS } from '../shared/scripts/chip-input';
import {
  MARKDOWN_EDITOR_SCRIPT,
  MARKDOWN_EDITOR_STYLES,
  markdownEditor,
} from '../shared/components/markdown-editor';
import {
  DATETIME_FIELD_SCRIPT,
  DATETIME_FIELD_STYLES,
  dateTimeField,
} from '../shared/components/datetime-field';

const ADMIN_CSS = `
<style>
  .kpi-row {
    display: grid; gap: 0.85rem; margin-bottom: 2.5rem;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  .kpi {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.05rem 1.15rem;
  }
  .kpi .l {
    font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--ink-3); margin-bottom: 0.4rem; font-weight: 600;
  }
  .kpi .v { font-size: 1.75rem; font-weight: 700; color: var(--ink); line-height: 1.1; }
  .kpi .m { font-size: 0.76rem; color: var(--ink-3); margin-top: 0.2rem; }

  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th {
    text-align: left; font-size: 0.72rem; text-transform: uppercase;
    letter-spacing: 0.07em; color: var(--ink-3); font-weight: 700;
    padding: 0.6rem 0.7rem; border-bottom: 1px solid var(--border);
  }
  td { padding: 0.85rem 0.7rem; border-bottom: 1px solid var(--border); vertical-align: top; }
  tr:hover td { background: var(--surface-2); }
  td .t { color: var(--ink); font-weight: 600; display: block; margin-bottom: 0.2rem; }
  td .s { font-size: 0.8rem; color: var(--ink-3); }
  .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; }
  .pill {
    font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em;
    padding: 0.15rem 0.5rem; border-radius: 100px; font-weight: 700;
    border: 1px solid currentColor; white-space: nowrap;
  }
  .pill.pub { color: var(--good); }
  .pill.draft { color: var(--warn); }
  .pill.sched { color: var(--accent); }
  .actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
  @media (max-width: 600px) {
    .kpi-row { grid-template-columns: 1fr 1fr; }
    .toolbar > div:last-child { width: 100%; }
    .toolbar > div:last-child .btn { flex: 1; justify-content: center; }
    /* The table stays wide and scrolls; squashing it makes rows unreadable. */
    .table-wrap table { min-width: 640px; }
  }
  .editor-grid { display: grid; grid-template-columns: 1fr 280px; gap: 1.75rem; align-items: start; }
  @media (max-width: 860px) { .editor-grid { grid-template-columns: 1fr; } }
  .panel {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.1rem;
  }
  .panel h3 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--ink-3); margin-bottom: 0.9rem; }

  /* ---------- related post picker ---------- */
  /*
   * Capped and scrolled in place: with fifty posts this list would otherwise
   * push the save button so far down the sidebar it left the screen.
   */
  .related-picker {
    max-height: 260px; overflow-y: auto;
    border: 1px solid var(--border); border-radius: 10px;
    background: var(--surface);
  }
  .related-option {
    display: flex; gap: 0.6rem; align-items: flex-start;
    padding: 0.55rem 0.7rem; cursor: pointer;
    border-bottom: 1px solid var(--border);
  }
  .related-option:last-child { border-bottom: 0; }
  .related-option:hover { background: var(--surface-2); }
  .related-option input { width: auto; margin: 0.15rem 0 0; flex: none; }
  .related-option span { display: block; min-width: 0; }
  .related-option strong {
    display: block; font-size: 0.85rem; font-weight: 600; color: var(--ink);
    line-height: 1.35;
  }
  .related-option em { font-style: normal; font-size: 0.72rem; color: var(--ink-3); }

${MARKDOWN_EDITOR_STYLES}
${DATETIME_FIELD_STYLES}
${CHIP_CSS}

  .admin-search { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .admin-search input { flex: 1; min-width: 200px; border-radius: 100px; padding-left: 1rem; }
  .search-note { font-size: 0.85rem; color: var(--ink-3); margin-bottom: 0.85rem; }

  .pager {
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap;
  }
  .pager .count { font-size: 0.82rem; color: var(--ink-3); }
  .pager-links { display: flex; gap: 0.35rem; flex-wrap: wrap; }
  .pager-links a, .pager-links span {
    min-width: 34px; text-align: center;
    padding: 0.35rem 0.6rem; border-radius: 8px;
    border: 1px solid var(--border); font-size: 0.84rem; color: var(--ink-2);
  }
  .pager-links a:hover { border-color: var(--accent); color: var(--accent); }
  .pager-links .current {
    background: var(--accent); color: var(--accent-ink); border-color: var(--accent);
    font-weight: 700;
  }
  .pager-links .disabled { opacity: 0.4; }

  .back-link {
    display: inline-block; font-size: 0.83rem; color: var(--ink-3);
    margin-bottom: 0.35rem;
  }
  .back-link:hover { color: var(--accent); }
</style>`;

export function postRows(posts: Post[]): string {
  return posts
    .map(
      (p) => `<tr>
        <td>
          <span class="t">${esc(p.title)}</span>
          <span class="s">${esc(p.subtitle || '—')} · ${readingMinutes(p.content)} min</span>
        </td>
        <td><span class="pill ${isScheduled(p) ? 'sched' : p.status === 'published' ? 'pub' : 'draft'}">${isScheduled(p) ? 'scheduled' : p.status}</span></td>
        <td><div class="tag-row">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('') || '<span class="s">—</span>'}</div></td>
        <td>${p.views}</td>
        <td class="s">${esc(formatDate(p.publishedAt))}</td>
        <td>
          <div class="actions">
            ${p.status === 'published' ? `<a class="btn btn-ghost btn-sm" href="/post/${esc(p.slug)}">View</a>` : ''}
            <a class="btn btn-ghost btn-sm" href="/admin/posts/${esc(p.id)}/edit">Edit</a>
            <form method="post" action="/admin/posts/${esc(p.id)}/delete"
                  onsubmit="return confirm('Delete “${esc(p.title).replace(/'/g, '&#39;')}”? This cannot be undone.')">
              <button class="btn btn-danger btn-sm" type="submit">Delete</button>
            </form>
          </div>
        </td>
      </tr>`,
    )
    .join('');
}

export function dashboardPage(opts: {
  posts: Post[];
  stats: {
    total: number;
    published: number;
    drafts: number;
    scheduled: number;
    tags: number;
    views: number;
    words: number;
    readingMinutes: number;
  };
  tags: { tag: string; count: number }[];
  flash?: { kind: 'ok' | 'err'; text: string };
  query?: string;
  page?: number;
  pageCount?: number;
  total?: number;
}): string {
  const {
    posts,
    stats,
    tags,
    flash,
    query = '',
    page = 1,
    pageCount = 1,
    total = posts.length,
  } = opts;

  const href = (n: number): string =>
    `/admin?page=${n}${query ? `&q=${encodeURIComponent(query)}` : ''}`;

  const windowStart = Math.max(1, Math.min(page - 2, pageCount - 4));
  const windowEnd = Math.min(pageCount, Math.max(page + 2, 5));
  const numbers: string[] = [];

  for (let n = windowStart; n <= windowEnd; n++) {
    numbers.push(
      n === page
        ? `<span class="current" aria-current="page">${n}</span>`
        : `<a href="${href(n)}">${n}</a>`,
    );
  }

  const body = `
${ADMIN_CSS}
  ${flash ? `<div class="flash ${flash.kind}">${esc(flash.text)}</div>` : ''}

  <div class="toolbar">
    <div>
      <a class="back-link" href="/">← Back to site</a>
      <h1 class="page-title" style="margin-bottom:.15rem">Dashboard</h1>
      <p style="color:var(--ink-3);font-size:.9rem">Manage posts, drafts and tags.</p>
    </div>
    <div style="margin-left:auto;display:flex;gap:.5rem;flex-wrap:wrap">
      <form method="post" action="/admin/import-starters"
            onsubmit="return confirm('Add the 10 starter posts? Existing posts are left untouched, and any already present are skipped.')">
        <button class="btn btn-ghost" type="submit" title="Add starter posts that are not already here">
          ↓ Import starter posts
        </button>
      </form>
      <a class="btn" href="/admin/posts/new">＋ New post</a>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi"><div class="l">Published</div><div class="v">${stats.published}</div><div class="m">live on the blog</div></div>
    <div class="kpi"><div class="l">Drafts</div><div class="v">${stats.drafts}</div><div class="m">not visible publicly</div></div>
    <div class="kpi"><div class="l">Scheduled</div><div class="v">${stats.scheduled}</div><div class="m">go live later</div></div>
    <div class="kpi"><div class="l">Tags</div><div class="v">${stats.tags}</div><div class="m">in use</div></div>
    <div class="kpi"><div class="l">Views</div><div class="v">${stats.views}</div><div class="m">all time</div></div>
    <div class="kpi"><div class="l">Words</div><div class="v">${stats.words.toLocaleString()}</div><div class="m">${stats.readingMinutes} min of reading</div></div>
  </div>

  <div class="section-label">Key highlights</div>
  <div class="tag-row" style="margin-bottom:2.5rem">
    ${
      tags.length
        ? tags
            .map(
              ({ tag, count }) =>
                `<a class="tag" href="/tag/${esc(tag)}">${esc(tag)} <span style="opacity:.6">${count}</span></a>`,
            )
            .join('')
        : '<span class="hint">No tags yet — add some when you write a post.</span>'
    }
  </div>

  <div class="section-label">All posts</div>

  <form class="admin-search" action="/admin" method="get" role="search">
    <input type="search" name="q" value="${esc(query)}"
           placeholder="Search titles, tags, content or status…" aria-label="Search posts" />
    <button class="btn" type="submit">Search</button>
    ${query ? '<a class="btn btn-ghost" href="/admin">Clear</a>' : ''}
  </form>

  ${
    query
      ? `<p class="search-note">${total} result${total === 1 ? '' : 's'} for “${esc(query)}”</p>`
      : ''
  }

  ${
    posts.length
      ? `<div class="table-wrap"><table>
    <thead><tr>
      <th>Title</th><th>Status</th><th>Tags</th><th>Views</th><th>Updated</th><th></th>
    </tr></thead>
    <tbody id="post-rows">
      ${postRows(posts)}
    </tbody>
  </table></div>
  ${
    pageCount > 1
      ? `<div class="pager">
    <span class="count">Page ${page} of ${pageCount} · ${total} post${total === 1 ? '' : 's'}</span>
    <div class="pager-links">
      ${page > 1 ? `<a href="${href(page - 1)}">← Prev</a>` : '<span class="disabled">← Prev</span>'}
      ${windowStart > 1 ? `<a href="${href(1)}">1</a><span class="disabled">…</span>` : ''}
      ${numbers.join('')}
      ${windowEnd < pageCount ? `<span class="disabled">…</span><a href="${href(pageCount)}">${pageCount}</a>` : ''}
      ${page < pageCount ? `<a href="${href(page + 1)}">Next →</a>` : '<span class="disabled">Next →</span>'}
    </div>
  </div>`
      : ''
  }`
      : `<div class="empty">
      <p>${query ? `Nothing matches “${esc(query)}”.` : 'No posts yet.'}</p>
      <p style="margin-top:1.25rem">
        ${query ? '<a class="btn btn-ghost" href="/admin">Clear search</a>' : '<a class="btn" href="/admin/posts/new">Write your first post</a>'}
      </p>
    </div>`
  }`;

  return layout({
    title: 'Dashboard — Saidul Islam Rajib',
    body,
    nav: adminNav('/admin'),
    variant: 'admin',
  });
}

function relatedPicker(post: Post | undefined, all: Post[]): string {
  const chosen = new Set(post?.relatedIds ?? []);
  const options = all.filter((p) => p.id !== post?.id);

  if (!options.length) {
    return `<p class="hint" style="margin:0">
      Nothing to link to yet. Write a second post and it will appear here.
    </p>`;
  }

  return `<div class="related-picker">
    ${options
      .map(
        (p) => `<label class="related-option">
      <input type="checkbox" name="relatedIds" value="${esc(p.id)}"
             ${chosen.has(p.id) ? 'checked' : ''} />
      <span>
        <strong>${esc(p.title)}</strong>
        <em>${esc(formatDate(p.publishedAt))}${p.status === 'draft' ? ' · draft' : ''}</em>
      </span>
    </label>`,
      )
      .join('')}
  </div>
  <p class="hint">
    Tick the posts to show under <strong>More like this</strong>. Leave them
    all unticked and posts sharing a tag are suggested automatically.
    A draft stays hidden there until it is published.
  </p>`;
}

export function editorPage(post?: Post, all: Post[] = []): string {
  const editing = Boolean(post);
  const action = editing
    ? `/admin/posts/${esc(post!.id)}/edit`
    : '/admin/posts/new';

  const body = `
${ADMIN_CSS}
  <div class="toolbar">
    <div>
      <h1 class="page-title" style="margin-bottom:.15rem">${editing ? 'Edit post' : 'New post'}</h1>
      <p style="color:var(--ink-3);font-size:.9rem">Body supports Markdown — headings, lists, links, and fenced code blocks.</p>
    </div>
    <a class="btn btn-ghost" href="/admin" style="margin-left:auto">Cancel</a>
  </div>

  <form method="post" action="${action}">
    <div class="editor-grid">
      <div>
        <div class="field">
          <label for="title">Title</label>
          <input type="text" id="title" name="title" required
                 value="${esc(post?.title ?? '')}" placeholder="What is this post about?" />
        </div>

        <div class="field">
          <label for="subtitle">Subtitle</label>
          <input type="text" id="subtitle" name="subtitle"
                 value="${esc(post?.subtitle ?? '')}" placeholder="One line of context" />
        </div>

        <div class="field">
          <label for="highlight-box">Key highlights</label>
          <div class="chip-input" id="highlight-box" data-target="highlight" data-sep="newline" data-max="6">
            <input type="text" placeholder="Type and press Enter…" aria-label="Add a key highlight" />
          </div>
          <input type="hidden" id="highlight" name="highlight" value="${esc(post?.highlight ?? '')}" />
          <p class="hint">
            Press <strong>Enter</strong> after each one, <strong>×</strong> to remove.
            Short entries render as highlight chips on the post; full sentences
            render as a “Key takeaways” list. <span class="chip-count"></span>
          </p>
        </div>

        <div class="field">
          ${markdownEditor({
            id: 'content',
            label: 'Body',
            value: post?.content ?? '',
            rows: 24,
          })}
        </div>
      </div>

      <aside>
        <div class="panel" style="margin-bottom:1rem">
          <h3>Publish</h3>
          <div class="field">
            <label for="status">Status</label>
            <select id="status" name="status">
              <option value="draft" ${post?.status !== 'published' ? 'selected' : ''}>Draft</option>
              <option value="published" ${post?.status === 'published' ? 'selected' : ''}>Published</option>
            </select>
            <p class="hint">Drafts are hidden from the public blog.</p>
          </div>

          ${dateTimeField({
            name: 'publishedAt',
            label: 'Publish date and time',
            value: toLocalInput(post?.publishedAt ?? new Date().toISOString()),
            futureLabel: 'Scheduled',
            pastLabel: 'Live',
            hintId: 'schedule-hint',
            hint: `Backdate it, or set a future time to schedule it. A published post
              stays hidden until this moment arrives.`,
          })}
          <button class="btn" type="submit" style="width:100%;justify-content:center">
            ${editing ? 'Save changes' : 'Create post'}
          </button>
        </div>

        <div class="panel">
          <h3>Tags</h3>
          <div class="field" style="margin-bottom:0">
            <div class="chip-input" id="tags-box" data-target="tags" data-sep="comma" data-max="8">
              <input type="text" placeholder="Add a tag…" aria-label="Add a tag" />
            </div>
            <input type="hidden" id="tags" name="tags" value="${esc(post?.tags.join(', ') ?? '')}" />
            <p class="hint">
              Enter or comma to add, × to remove. Lowercased automatically.
              <span class="chip-count"></span>
            </p>
          </div>
        </div>

        <div class="panel">
          <h3>More like this</h3>
          ${relatedPicker(post, all)}
        </div>
      </aside>
    </div>
  </form>
${MARKDOWN_EDITOR_SCRIPT}
${DATETIME_FIELD_SCRIPT}
${CHIP_JS}
${IMAGE_SKELETON}
<script>
(function () {
  var field = document.getElementById('publishedAt');
  var hint = document.getElementById('schedule-hint');
  var status = document.getElementById('status');
  if (!field || !hint) return;

  var original = hint.textContent;

  function update() {
    var chosen = new Date(field.value);
    if (isNaN(chosen.getTime())) { hint.textContent = original; return; }

    if (chosen.getTime() > Date.now()) {
      hint.textContent = status && status.value === 'published'
        ? 'Scheduled — this goes live on ' + chosen.toLocaleString() + '.'
        : 'Future date set. Switch status to Published to schedule it.';
    } else {
      hint.textContent = original;
    }
  }

  // The date and time field fires change on its hidden input as it updates.
  field.addEventListener('change', update);
  if (status) status.addEventListener('change', update);
  update();
})();
</script>`;

  return layout({
    title: `${editing ? 'Edit' : 'New'} post — Saidul Islam Rajib`,
    body,
    nav: adminNav('/admin/posts'),
    variant: 'admin',
  });
}

export function loginPage(error?: string, notice?: string): string {
  const body = `
<style>
  .login-wrap { max-width: 380px; margin: 3rem auto; }
  .login-card {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 14px; padding: 2rem 1.75rem;
  }
</style>
  <div class="login-wrap">
    <div class="login-card">
      <h1 class="page-title" style="font-size:1.4rem;margin-bottom:.35rem">Sign in</h1>
      <p style="color:var(--ink-3);font-size:.88rem;margin-bottom:1.5rem">
        Admin access for writing and managing posts.
      </p>

      ${error ? `<div class="flash err">${esc(error)}</div>` : ''}
      ${notice ? `<div class="flash">${esc(notice)}</div>` : ''}

      <form method="post" action="/login">
        <div class="field">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" autocomplete="username" autofocus
                 placeholder="Leave blank to use the site password" />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required
                 placeholder="••••••••" />
        </div>
        <button class="btn" type="submit" style="width:100%;justify-content:center">Sign in</button>
      </form>

      <p class="hint" style="margin-top:1.25rem;text-align:center">
        <a href="/" style="color:var(--accent)">← Back to the blog</a>
      </p>
    </div>
  </div>`;

  return layout({
    title: 'Sign in — Saidul Islam Rajib',
    body,
    nav: '<a href="/">Home</a>',
  });
}
