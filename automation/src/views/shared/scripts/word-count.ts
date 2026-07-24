import { esc } from '../layout';

export function wordCounter(forId: string): string {
  return `<span class="word-count" data-for="${esc(forId)}"></span>`;
}

export const WORD_COUNT_SCRIPT = `
<script>
(function () {
  // Live word count against the server-side cap. The server trims rather
  // than rejecting, so this is guidance, not validation.
  document.querySelectorAll('textarea[data-limit]').forEach(function (area) {
    var limit = parseInt(area.getAttribute('data-limit'), 10);
    var label = document.querySelector('.word-count[data-for="' + area.id + '"]');
    if (!label) return;

    function update() {
      var words = area.value.trim().split(/\\s+/).filter(Boolean).length;
      label.textContent = words + ' / ' + limit + ' words';
      label.classList.toggle('near', words > limit * 0.8 && words <= limit);
      label.classList.toggle('over', words > limit);
    }

    area.addEventListener('input', update);
    update();
  });
})();
</script>`;
