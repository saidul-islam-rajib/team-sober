import { LiveProject } from '../../live-projects/live-project.model';
import { SHORT_WORD_LIMIT } from '../../projects/project.model';
import { hostOf } from '../../settings/settings.model';
import { IMAGE_SKELETON, adminNav, esc, layout } from '../shared/layout';
import { ADMIN_HERO_STYLES } from '../shared/styles/admin.styles';
import { WORD_COUNT_SCRIPT, wordCounter } from '../shared/scripts/word-count';

const CSS = `
<style>
  .lp-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; }
  .lp-thumb {
    width: 76px; height: 44px; object-fit: cover; display: block;
    border-radius: 6px; border: 1px solid var(--border); background: var(--surface-2);
  }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  th {
    text-align: left; font-size: 0.72rem; text-transform: uppercase;
    letter-spacing: 0.07em; color: var(--ink-3); font-weight: 700;
    padding: 0.6rem 0.7rem; border-bottom: 1px solid var(--border);
  }
  td { padding: 0.8rem 0.7rem; border-bottom: 1px solid var(--border); vertical-align: top; }
  tr:hover td { background: var(--surface-2); }
  td .t { color: var(--ink); font-weight: 600; display: block; margin-bottom: 0.2rem; }
  td .s { font-size: 0.8rem; color: var(--ink-3); display: block; line-height: 1.45; }
  .col-thumb { width: 90px; }
  .col-actions { width: 1%; white-space: nowrap; }
  .actions { display: flex; gap: 0.35rem; flex-wrap: nowrap; }
${ADMIN_HERO_STYLES}

  .form-grid { display: grid; grid-template-columns: 1fr 300px; gap: 1.75rem; align-items: start; }
  @media (max-width: 880px) { .form-grid { grid-template-columns: 1fr; } }
  .panel {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 12px; padding: 1.15rem; margin-bottom: 1.15rem;
  }
  .panel h3 {
    font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.07em;
    color: var(--ink-3); margin-bottom: 0.9rem;
  }
  .cover-preview {
    width: 100%; aspect-ratio: 2/1; object-fit: cover;
    border-radius: 10px; border: 1px solid var(--border);
    background: var(--surface); margin-bottom: 0.7rem;
  }
  .check-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; }
  .check-row input { width: auto; }
  .btn-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }

  .shot-thumbs { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.7rem; }
  .shot-thumb { position: relative; display: inline-block; }
  .shot-thumb img {
    width: 84px; height: 64px; object-fit: cover;
    border-radius: 8px; border: 1px solid var(--border); display: block;
  }
  .drop-shot {
    position: absolute; top: -6px; right: -6px;
    width: 20px; height: 20px; border-radius: 50%;
    border: 1px solid var(--border); background: var(--bg);
    color: var(--ink-3); cursor: pointer; font-size: 0.9rem; line-height: 1;
    font-family: inherit; padding: 0;
  }
  .drop-shot:hover { color: var(--danger); border-color: var(--danger); }
  .upload-zone {
    border: 1px dashed var(--border); border-radius: 10px;
    padding: 1.1rem; text-align: center; color: var(--ink-3);
    font-size: 0.86rem; cursor: pointer; margin-bottom: 0.75rem;
  }
  .upload-zone:hover, .upload-zone.dragover { border-color: var(--accent); color: var(--accent); }
</style>`;

export function liveProjectsAdminPage(opts: {
  projects: LiveProject[];
  flash?: { kind: 'ok' | 'err'; text: string };
}): string {
  const { projects, flash } = opts;

  const body = `
${CSS}
  ${flash ? `<div class="flash ${flash.kind}">${esc(flash.text)}</div>` : ''}

  <div class="admin-hero">
    <a class="back-link" href="/admin">← Back to dashboard</a>
    <div class="admin-hero-row">
      <div>
        <h1 class="page-title">Live projects</h1>
        <p class="admin-hero-sub">
          <span class="hero-count">${projects.length} project${projects.length === 1 ? '' : 's'}</span>
          <a href="/about">View on About →</a>
        </p>
      </div>
      <div class="admin-hero-actions">
        <a class="btn" href="/admin/live-projects/new">＋ New live project</a>
      </div>
    </div>
  </div>

  ${
    projects.length
      ? `<div class="lp-table-wrap"><table>
    <thead><tr>
      <th class="col-thumb"></th><th>Project</th><th>URL</th><th class="col-actions"></th>
    </tr></thead>
    <tbody>
      ${projects
        .map((p) => {
          const thumb = p.images[0] || p.previewImage;
          return `<tr>
        <td class="col-thumb">${thumb ? `<img class="lp-thumb" src="${esc(thumb)}" alt="" loading="lazy" />` : '<div class="lp-thumb"></div>'}</td>
        <td>
          <span class="t">${esc(p.title)}${p.featured ? ' ★' : ''}</span>
          <span class="s">${esc(p.description.slice(0, 90) || '—')}</span>
        </td>
        <td class="s">${p.url ? esc(hostOf(p.url)) : '—'}</td>
        <td class="col-actions">
          <div class="actions">
            <a class="btn btn-ghost btn-sm" href="/live/${esc(p.slug)}">View</a>
            <a class="btn btn-ghost btn-sm" href="/admin/live-projects/${esc(p.id)}/edit">Edit</a>
            <form method="post" action="/admin/live-projects/${esc(p.id)}/delete"
                  onsubmit="return confirm('Delete “${esc(p.title).replace(/'/g, '&#39;')}”?')">
              <button class="btn btn-danger btn-sm" type="submit">Delete</button>
            </form>
          </div>
        </td>
      </tr>`;
        })
        .join('')}
    </tbody>
  </table></div>`
      : `<div class="empty">
      <p>No live projects yet.</p>
      <p style="margin-top:1.25rem"><a class="btn" href="/admin/live-projects/new">Add your first live project</a></p>
    </div>`
  }`;

  return layout({
    title: 'Live projects — admin',
    body,
    nav: adminNav('/admin/live-projects'),
    variant: 'admin',
    noindex: true,
  });
}

export function liveProjectEditorPage(project?: LiveProject): string {
  const editing = Boolean(project);
  const action = editing
    ? `/admin/live-projects/${esc(project!.id)}/edit`
    : '/admin/live-projects/new';

  const v = (value?: string) => esc(value ?? '');
  const images = project?.images ?? [];

  const body = `
${CSS}
  <div class="toolbar">
    <div>
      <a class="back-link" href="/admin/live-projects">← Back to live projects</a>
      <h1 class="page-title" style="margin-bottom:.15rem">${editing ? 'Edit live project' : 'New live project'}</h1>
    </div>
  </div>

  <form method="post" action="${action}">
    <div class="form-grid">
      <div>
        <div class="panel">
          <h3>Basics</h3>
          <div class="field">
            <label for="title">Title</label>
            <input type="text" id="title" name="title" required value="${v(project?.title)}" />
          </div>
          <div class="field" style="margin-bottom:0">
            <div class="field-head">
              <label for="description">Short description</label>
              ${wordCounter('description')}
            </div>
            <textarea id="description" name="description" rows="3"
                      data-limit="${SHORT_WORD_LIMIT}"
                      placeholder="One or two sentences. Shown on the About page and the detail page.">${v(project?.description)}</textarea>
          </div>
        </div>

        <div class="panel">
          <h3>Live URL</h3>
          <div class="field" style="margin-bottom:.6rem">
            <label for="url">Site URL</label>
            <input type="text" id="url" name="url" value="${v(project?.url)}"
                   placeholder="https://example.com" />
            <p class="hint" id="fetch-status">A preview image is fetched automatically from this URL when saved, if none is set below.</p>
          </div>
          <div class="btn-row">
            <button type="button" class="btn btn-ghost btn-sm" id="fetch-preview-btn">Fetch preview</button>
          </div>
        </div>

        <div class="panel">
          <h3>Images</h3>
          <div class="shot-thumbs" id="image-thumbs">
            ${images.map((u) => imageThumb(u)).join('')}
          </div>
          <div class="upload-zone" id="image-zone">
            Click to upload, or drag images here
            <input type="file" id="image-input" accept="image/*" multiple hidden />
          </div>
          <input type="hidden" id="images" name="images" value="${v(images.join('\n'))}" />
          <p class="hint" id="image-status">At least one image is recommended for the gallery on the detail page.</p>
        </div>
      </div>

      <aside>
        <div class="panel">
          <h3>Preview image</h3>
          <img class="cover-preview" id="cover-preview" src="${v(project?.previewImage)}" alt="" />
          <input type="hidden" id="previewImage" name="previewImage" value="${v(project?.previewImage)}" />
          <input type="hidden" id="favicon" name="favicon" value="${v(project?.favicon)}" />
          <input type="file" id="cover-file" accept="image/*" hidden />
          <div class="btn-row">
            <button type="button" class="btn btn-ghost btn-sm" id="cover-btn">Upload image</button>
          </div>
          <p class="hint" id="cover-status">Leave empty to auto-fetch from the site URL on save.</p>
        </div>

        <div class="panel">
          <label class="check-row">
            <input type="checkbox" name="featured" ${project?.featured ? 'checked' : ''} />
            Feature this project
          </label>
        </div>

        <div class="panel">
          <h3>Save</h3>
          <button class="btn" type="submit" style="width:100%;justify-content:center">
            ${editing ? 'Save changes' : 'Create live project'}
          </button>
        </div>
      </aside>
    </div>
  </form>

<script>
(function () {
  var urlInput = document.getElementById('url');
  var titleInput = document.getElementById('title');
  var descInput = document.getElementById('description');
  var previewHidden = document.getElementById('previewImage');
  var faviconHidden = document.getElementById('favicon');
  var preview = document.getElementById('cover-preview');
  var fetchStatus = document.getElementById('fetch-status');
  var coverStatus = document.getElementById('cover-status');
  var coverFile = document.getElementById('cover-file');

  document.getElementById('fetch-preview-btn').addEventListener('click', function () {
    var url = urlInput.value.trim();
    if (!url) { fetchStatus.textContent = 'Enter a site URL first.'; return; }

    fetchStatus.textContent = 'Fetching preview…';

    fetch('/admin/live-projects/fetch-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ url: url })
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.error) { fetchStatus.textContent = j.error; return; }

        if (j.image) {
          previewHidden.value = j.image;
          preview.src = j.image;
        }
        if (j.favicon) faviconHidden.value = j.favicon;
        if (j.title && !titleInput.value.trim()) titleInput.value = j.title;
        if (j.description && !descInput.value.trim()) descInput.value = j.description;

        fetchStatus.textContent = j.image ? 'Preview fetched.' : 'No preview image found on that page.';
      })
      .catch(function (err) { fetchStatus.textContent = 'Could not fetch preview: ' + err.message; });
  });

  document.getElementById('cover-btn').addEventListener('click', function () { coverFile.click(); });

  coverFile.addEventListener('change', function () {
    if (!coverFile.files[0]) return;
    coverStatus.textContent = 'Uploading…';
    var data = new FormData();
    data.append('file', coverFile.files[0]);

    fetch('/admin/uploads', { method: 'POST', body: data, credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (j) { throw new Error(j.message || 'Upload failed'); });
        return r.json();
      })
      .then(function (j) {
        previewHidden.value = j.url;
        preview.src = j.url;
        coverStatus.textContent = 'Uploaded.';
      })
      .catch(function (err) { coverStatus.textContent = 'Upload failed: ' + err.message; });
  });

  // ---------- images gallery ----------
  var zone = document.getElementById('image-zone');
  var input = document.getElementById('image-input');
  var status = document.getElementById('image-status');
  var thumbs = document.getElementById('image-thumbs');
  var imagesHidden = document.getElementById('images');

  function thumbHtml(url) {
    return '<span class="shot-thumb" data-url="' + url + '">' +
      '<img src="' + url + '" alt="" loading="lazy" decoding="async" />' +
      '<button type="button" class="drop-shot" aria-label="Remove image">&times;</button>' +
      '</span>';
  }

  function syncImages() {
    var urls = [];
    thumbs.querySelectorAll('.shot-thumb').forEach(function (chip) {
      urls.push(chip.getAttribute('data-url'));
    });
    imagesHidden.value = urls.join(String.fromCharCode(10));
  }

  function uploadFiles(files) {
    if (!files || !files.length) return;

    var remaining = files.length;
    status.textContent = 'Uploading ' + remaining + ' image(s)…';

    Array.prototype.forEach.call(files, function (file) {
      var data = new FormData();
      data.append('file', file);

      fetch('/admin/uploads', { method: 'POST', body: data, credentials: 'same-origin' })
        .then(function (r) {
          if (!r.ok) return r.json().then(function (j) { throw new Error(j.message || 'Upload failed'); });
          return r.json();
        })
        .then(function (j) {
          thumbs.insertAdjacentHTML('beforeend', thumbHtml(j.url));
          syncImages();
          remaining--;
          status.textContent = remaining > 0 ? 'Uploading ' + remaining + ' more…' : 'Uploaded.';
        })
        .catch(function (err) {
          remaining--;
          status.textContent = 'Upload failed: ' + err.message;
        });
    });
  }

  zone.addEventListener('click', function () { input.click(); });
  input.addEventListener('change', function () {
    uploadFiles(input.files);
    input.value = '';
  });
  zone.addEventListener('dragover', function (ev) { ev.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', function () { zone.classList.remove('dragover'); });
  zone.addEventListener('drop', function (ev) {
    ev.preventDefault();
    zone.classList.remove('dragover');
    uploadFiles(ev.dataTransfer.files);
  });

  thumbs.addEventListener('click', function (ev) {
    var drop = ev.target.closest('.drop-shot');
    if (!drop) return;
    drop.closest('.shot-thumb').remove();
    syncImages();
  });
})();
</script>
${WORD_COUNT_SCRIPT}
${IMAGE_SKELETON}`;

  return layout({
    title: `${editing ? 'Edit' : 'New'} live project — admin`,
    body,
    nav: adminNav('/admin/live-projects'),
    variant: 'admin',
    noindex: true,
  });
}

function imageThumb(url: string): string {
  return `<span class="shot-thumb" data-url="${esc(url)}">
    <img src="${esc(url)}" alt="" loading="lazy" decoding="async" />
    <button type="button" class="drop-shot" aria-label="Remove image">&times;</button>
  </span>`;
}
