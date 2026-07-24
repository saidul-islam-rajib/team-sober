import { esc } from '../layout';
import { FIELD_HEAD_STYLES } from '../styles/components.styles';
import { MD_COLUMN_STYLES, PROSE_STYLES } from '../styles/prose.styles';
import { wordCounter } from '../scripts/word-count';

const TOOLBAR_STYLES = `
  .md-editor { display: block; }
  .md-toolbar {
    display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--border); border-bottom: 0;
    border-radius: 8px 8px 0 0; background: var(--surface-2);
  }
  .md-toolbar button {
    background: transparent; border: 1px solid transparent; border-radius: 6px;
    color: var(--ink-2); font-family: inherit; font-size: 0.84rem;
    padding: 0.3rem 0.55rem; cursor: pointer; line-height: 1.2;
  }
  .md-toolbar button:hover { background: var(--bg); border-color: var(--border); color: var(--ink); }
  .md-toolbar button.active { background: var(--accent); color: var(--accent-ink); }
  .md-toolbar .tb-sep { width: 1px; height: 18px; background: var(--border); margin: 0 0.25rem; }
  .md-toolbar .tb-right { margin-left: auto; }
  .md-editor textarea { border-radius: 0 0 8px 8px; }
  .md-editor textarea.dragover { outline: 2px dashed var(--accent); outline-offset: -4px; }

  .md-preview {
    border: 1px solid var(--border); border-top: 0; border-radius: 0 0 8px 8px;
    padding: 1.25rem 1.35rem; min-height: 220px; background: var(--surface);
  }
  /* The preview shows published sizes at editor scale, not article scale. */
  .md-preview.prose { font-size: 1.02rem; }
  .md-preview.prose > *:first-child { margin-top: 0; }
  .md-preview.prose img { margin: 1.25rem auto; cursor: default; }
  .md-preview.prose img.skel:not(.is-loaded) { min-height: 160px; }
  .md-preview.prose h2 { margin-top: 1.75rem; }
  .md-preview.prose h3 { margin-top: 1.4rem; }
  .md-preview.prose .md-columns img { max-height: 220px; margin: 0; }
  .md-preview-empty { color: var(--ink-3); font-family: var(--sans); font-size: 0.88rem; }

  .md-status { min-height: 1.2em; }
  .md-readout { font-size: 0.74rem; color: var(--ink-3); font-variant-numeric: tabular-nums; }

  .md-help { margin-top: 0.9rem; }
  .md-help summary { cursor: pointer; font-size: 0.82rem; color: var(--ink-3); }
  .md-help summary:hover { color: var(--ink); }
  .md-table { margin-top: 0.7rem; font-size: 0.82rem; width: 100%; }
  .md-table td { padding: 0.3rem 0.6rem 0.3rem 0; border: 0; color: var(--ink-3); }
  .md-table td:first-child { white-space: nowrap; }
`;

export const MARKDOWN_EDITOR_STYLES = [
  FIELD_HEAD_STYLES,
  TOOLBAR_STYLES,
  PROSE_STYLES,
  MD_COLUMN_STYLES,
].join('\n');

export interface MarkdownEditorOptions {
  id: string;
  name?: string;
  label: string;
  value?: string;
  rows?: number;
  placeholder?: string;
  hint?: string;
  limit?: number;
  required?: boolean;
  help?: boolean;
}

const HELP = `
  <details class="md-help">
    <summary>Markdown reference</summary>
    <table class="md-table">
      <tr><td><code># H1</code> · <code>## H2</code> · <code>### H3</code></td><td>Headings — these control text size</td></tr>
      <tr><td><code>**bold**</code> · <code>*italic*</code></td><td>Emphasis</td></tr>
      <tr><td><code>==highlight==</code></td><td>Highlighted text</td></tr>
      <tr><td><code>[text](https://url)</code></td><td>Link</td></tr>
      <tr><td><code>![alt](/uploads/x.png)</code></td><td>Image</td></tr>
      <tr><td><code>\`code\`</code></td><td>Inline code</td></tr>
      <tr><td><code>\`\`\`cpp … \`\`\`</code></td><td>Code block with language</td></tr>
      <tr><td><code>&gt; quote</code></td><td>Blockquote</td></tr>
      <tr><td><code>- item</code> · <code>1. item</code></td><td>Lists</td></tr>
      <tr><td><code>---</code></td><td>Divider</td></tr>
      <tr><td><code>| a | b |</code></td><td>Tables (GitHub style)</td></tr>
      <tr>
        <td><code>:::columns</code> … <code>|||</code> … <code>:::</code></td>
        <td>Side-by-side columns — cells split on <code>|||</code></td>
      </tr>
    </table>
    <p class="hint">
      Drop or paste an image straight into the box to upload it. Columns stack
      vertically on phones automatically, and readers can click any image to
      view it full size.
    </p>
    <p class="hint">
      Fonts and colours come from the site theme, so everything looks consistent —
      that is deliberate. Use headings for size rather than styling text directly.
    </p>
  </details>`;

function toolbar(): string {
  return `<div class="md-toolbar" role="toolbar" aria-label="Formatting">
    <button type="button" data-md="bold" title="Bold (Ctrl+B)"><strong>B</strong></button>
    <button type="button" data-md="italic" title="Italic (Ctrl+I)"><em>I</em></button>
    <button type="button" data-md="highlight" title="Highlight">▨</button>
    <span class="tb-sep"></span>
    <button type="button" data-md="h2" title="Heading">H2</button>
    <button type="button" data-md="h3" title="Sub-heading">H3</button>
    <span class="tb-sep"></span>
    <button type="button" data-md="link" title="Link (Ctrl+K)">🔗</button>
    <button type="button" data-md="code" title="Inline code">&lt;/&gt;</button>
    <button type="button" data-md="codeblock" title="Code block">{ }</button>
    <button type="button" data-md="quote" title="Quote">❝</button>
    <button type="button" data-md="ul" title="Bullet list">•</button>
    <button type="button" data-md="ol" title="Numbered list">1.</button>
    <button type="button" data-md="hr" title="Divider">—</button>
    <span class="tb-sep"></span>
    <button type="button" data-md-image title="Upload an image">🖼 Image</button>
    <button type="button" data-md="cols2" title="Two columns (image + text, or image + image)">▮▮</button>
    <button type="button" data-md="cols3" title="Three columns">▮▮▮</button>
    <button type="button" data-md-preview-toggle class="tb-right">Preview</button>
  </div>`;
}

export function markdownEditor({
  id,
  name,
  label,
  value = '',
  rows = 22,
  placeholder = 'Write in Markdown…',
  hint,
  limit,
  required = false,
  help = true,
}: MarkdownEditorOptions): string {
  const readout = limit
    ? wordCounter(id)
    : '<span class="md-readout" data-md-readout></span>';

  return `<div class="md-editor" data-md-editor>
    <div class="field-head">
      <label for="${esc(id)}">${esc(label)}</label>
      ${readout}
    </div>

    ${toolbar()}

    <input type="file" accept="image/*" hidden data-md-file />

    <textarea id="${esc(id)}" name="${esc(name ?? id)}" class="mono" rows="${rows}"
              ${limit ? `data-limit="${limit}"` : ''} ${required ? 'required' : ''}
              data-md-input
              placeholder="${esc(placeholder)}">${esc(value)}</textarea>

    <div class="md-preview prose" data-md-preview hidden></div>

    <p class="hint md-status" data-md-status></p>
    ${hint ? `<p class="hint">${hint}</p>` : ''}
    ${help ? HELP : ''}
  </div>`;
}

export const MARKDOWN_EDITOR_SCRIPT = `
<script>
(function () {
  var UPLOAD_URL = '/admin/uploads';
  var PREVIEW_URL = '/admin/preview';

  function bind(root) {
    var ta = root.querySelector('[data-md-input]');
    if (!ta) return;

    var preview = root.querySelector('[data-md-preview]');
    var status = root.querySelector('[data-md-status]');
    var readout = root.querySelector('[data-md-readout]');
    var fileInput = root.querySelector('[data-md-file]');
    var imageBtn = root.querySelector('[data-md-image]');
    var previewBtn = root.querySelector('[data-md-preview-toggle]');

    function say(text) { if (status) status.textContent = text; }

    function surround(before, after) {
      var s = ta.selectionStart, e = ta.selectionEnd;
      var sel = ta.value.slice(s, e);
      ta.value = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
      ta.focus();
      if (sel) ta.setSelectionRange(s + before.length, e + before.length);
      else ta.setSelectionRange(s + before.length, s + before.length);
      count();
    }

    function prefixLines(prefix) {
      var s = ta.selectionStart, e = ta.selectionEnd;
      var startOfLine = ta.value.lastIndexOf('\\n', s - 1) + 1;
      var block = ta.value.slice(startOfLine, e) || '';
      var n = 0;
      var out = block.split('\\n').map(function (line) {
        n++;
        return (prefix === '1. ' ? n + '. ' : prefix) + line;
      }).join('\\n');
      ta.value = ta.value.slice(0, startOfLine) + out + ta.value.slice(e);
      ta.focus();
      ta.setSelectionRange(startOfLine, startOfLine + out.length);
      count();
    }

    function insert(text) {
      var s = ta.selectionStart;
      ta.value = ta.value.slice(0, s) + text + ta.value.slice(ta.selectionEnd);
      ta.focus();
      ta.setSelectionRange(s + text.length, s + text.length);
      count();
    }

    var actions = {
      bold: function () { surround('**', '**'); },
      italic: function () { surround('*', '*'); },
      highlight: function () { surround('==', '=='); },
      h2: function () { prefixLines('## '); },
      h3: function () { prefixLines('### '); },
      quote: function () { prefixLines('> '); },
      ul: function () { prefixLines('- '); },
      ol: function () { prefixLines('1. '); },
      code: function () { surround('\\\`', '\\\`'); },
      codeblock: function () { surround('\\n\\\`\\\`\\\`\\n', '\\n\\\`\\\`\\\`\\n'); },
      hr: function () { insert('\\n\\n---\\n\\n'); },
      cols2: function () {
        insert('\\n:::columns\\nLeft column — drop an image here\\n|||\\nRight column — text or another image\\n:::\\n');
      },
      cols3: function () {
        insert('\\n:::columns\\nFirst\\n|||\\nSecond\\n|||\\nThird\\n:::\\n');
      },
      link: function () {
        var url = prompt('Link URL:', 'https://');
        if (url) surround('[', '](' + url + ')');
      }
    };

    root.querySelectorAll('[data-md]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var fn = actions[btn.getAttribute('data-md')];
        if (fn) fn();
      });
    });

    ta.addEventListener('keydown', function (ev) {
      if (!(ev.ctrlKey || ev.metaKey)) return;
      var k = ev.key.toLowerCase();
      if (k === 'b') { ev.preventDefault(); actions.bold(); }
      if (k === 'i') { ev.preventDefault(); actions.italic(); }
      if (k === 'k') { ev.preventDefault(); actions.link(); }
    });

    // ---------- words and reading time ----------
    function count() {
      if (!readout) return;
      var words = ta.value.trim().split(/\\s+/).filter(Boolean).length;
      var mins = Math.max(1, Math.ceil(words / 200));
      readout.textContent = words
        ? words + (words === 1 ? ' word · ' : ' words · ') + mins + ' min read'
        : '';
    }

    ta.addEventListener('input', count);
    count();

    // ---------- image upload ----------
    function upload(file) {
      if (!file) return;
      say('Uploading ' + file.name + '…');

      var data = new FormData();
      data.append('file', file);

      fetch(UPLOAD_URL, { method: 'POST', body: data, credentials: 'same-origin' })
        .then(function (r) {
          if (!r.ok) return r.json().then(function (j) { throw new Error(j.message || 'Upload failed'); });
          return r.json();
        })
        .then(function (j) {
          insert('\\n' + j.markdown + '\\n');
          say('Inserted ' + j.name + ' (' + Math.round(j.size / 1024) + ' KB)');
        })
        .catch(function (err) { say('Upload failed: ' + err.message); });
    }

    if (imageBtn && fileInput) {
      imageBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        upload(fileInput.files[0]);
        fileInput.value = '';
      });
    }

    // drag and drop, plus paste from clipboard
    ta.addEventListener('dragover', function (ev) { ev.preventDefault(); ta.classList.add('dragover'); });
    ta.addEventListener('dragleave', function () { ta.classList.remove('dragover'); });
    ta.addEventListener('drop', function (ev) {
      ev.preventDefault();
      ta.classList.remove('dragover');
      if (ev.dataTransfer.files.length) upload(ev.dataTransfer.files[0]);
    });
    ta.addEventListener('paste', function (ev) {
      var items = ev.clipboardData && ev.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') === 0) {
          ev.preventDefault();
          upload(items[i].getAsFile());
          return;
        }
      }
    });

    // ---------- preview ----------
    if (!previewBtn || !preview) return;

    function edit() {
      preview.hidden = true;
      ta.hidden = false;
      previewBtn.classList.remove('active');
      previewBtn.textContent = 'Preview';
    }

    previewBtn.addEventListener('click', function () {
      if (!preview.hidden) { edit(); return; }

      if (!ta.value.trim()) {
        preview.innerHTML = '<p class="md-preview-empty">Nothing to preview yet.</p>';
        preview.hidden = false;
        ta.hidden = true;
        previewBtn.classList.add('active');
        previewBtn.textContent = 'Edit';
        return;
      }

      previewBtn.textContent = 'Rendering…';

      fetch(PREVIEW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'same-origin',
        body: 'content=' + encodeURIComponent(ta.value)
      })
        .then(function (r) {
          if (!r.ok) throw new Error('Preview failed');
          return r.text();
        })
        .then(function (html) {
          preview.innerHTML = html;
          preview.hidden = false;
          ta.hidden = true;
          previewBtn.classList.add('active');
          previewBtn.textContent = 'Edit';
        })
        .catch(function (err) {
          previewBtn.textContent = 'Preview';
          say(err.message);
        });
    });

    // A hidden textarea cannot be validated or submitted sensibly.
    var form = ta.closest('form');
    if (form) form.addEventListener('submit', function () { edit(); });
  }

  document.querySelectorAll('[data-md-editor]').forEach(bind);
})();
</script>`;
