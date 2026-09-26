// Renders ```mermaid fences (emitted by renderMarkdown as <pre class="mermaid">).
// Mermaid is large, so it is only fetched on pages that actually contain a diagram.
export const MERMAID_SCRIPT = `
<script>
(function () {
  if (!document.querySelector('pre.mermaid')) return;

  var dark =
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs')
    .then(function (mod) {
      var mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: dark ? 'dark' : 'default',
      });
      return mermaid.run({ querySelector: 'pre.mermaid' });
    })
    .catch(function (err) {
      console.error('Mermaid failed to render', err);
    });
})();
</script>
<style>
  .prose pre.mermaid {
    background: none; border: 0; padding: 0; text-align: center;
    font-family: inherit; white-space: pre-wrap; overflow-x: auto;
  }
  .prose pre.mermaid svg { max-width: 100%; height: auto; }
</style>
`;
