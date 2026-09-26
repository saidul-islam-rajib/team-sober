import katex from 'katex';

// Pinned to the installed katex so server markup and CSS always match.
const KATEX_CSS = `https://cdn.jsdelivr.net/npm/katex@${katex.version}/dist/katex.min.css`;

const MERMAID_JS =
  'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

/*
 * Browser side of renderMarkdown: heading "#" links, copy buttons on code
 * blocks and Mermaid diagrams. window.enhanceMarkdown(root) is exposed so the
 * editor preview can run it again after swapping in new HTML.
 */
export const MARKDOWN_SCRIPT = `
<script>
(function () {
  var mermaidReady = null;

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      area.remove();
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  function anchors(root) {
    root.querySelectorAll('.prose :is(h2, h3, h4)[id]').forEach(function (h) {
      if (h.id === 'footnotes-label' || h.querySelector('.heading-anchor')) return;
      var a = document.createElement('a');
      a.className = 'heading-anchor';
      a.href = '#' + encodeURIComponent(h.id);
      a.setAttribute('aria-label', 'Link to this section');
      a.textContent = '#';
      h.appendChild(a);
    });
  }

  function copyButtons(root) {
    root.querySelectorAll('.prose pre.code-block').forEach(function (pre) {
      if (pre.querySelector('.copy-code')) return;
      var code = pre.querySelector('code');
      if (!code) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-code';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code');
      btn.addEventListener('click', function () {
        copyText(code.textContent).then(
          function () { flash(btn, 'Copied'); },
          function () { flash(btn, 'Press Ctrl+C'); }
        );
      });
      pre.appendChild(btn);
    });
  }

  function flash(btn, label) {
    btn.textContent = label;
    btn.classList.add('done');
    window.setTimeout(function () {
      btn.textContent = 'Copy';
      btn.classList.remove('done');
    }, 1600);
  }

  function diagrams(root) {
    var nodes = root.querySelectorAll('pre.mermaid:not([data-processed])');
    if (!nodes.length) return;
    if (!mermaidReady) {
      var dark = window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      mermaidReady = import('${MERMAID_JS}').then(function (mod) {
        mod.default.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: dark ? 'dark' : 'default',
        });
        return mod.default;
      });
    }
    mermaidReady
      .then(function (mermaid) { return mermaid.run({ nodes: nodes }); })
      .catch(function (err) { console.error('Mermaid failed to render', err); });
  }

  window.enhanceMarkdown = function (root) {
    root = root || document;
    anchors(root);
    copyButtons(root);
    diagrams(root);
  };

  window.enhanceMarkdown(document);
})();
</script>
`;

export const KATEX_STYLESHEET = `<link rel="stylesheet" href="${KATEX_CSS}" crossorigin="anonymous" />`;

// Page assets for rendered markdown; KaTeX's CSS only when there is math.
export function markdownAssets(html: string): string {
  return (
    (html.includes('class="katex') ? KATEX_STYLESHEET : '') + MARKDOWN_SCRIPT
  );
}
