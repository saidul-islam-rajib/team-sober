export const LIGHTBOX_SCRIPT = `
<script>
(function () {
  var open = null;

  function close() {
    if (!open) return;
    open.remove();
    open = null;
    document.body.style.overflow = '';
  }

  document.addEventListener('click', function (ev) {
    var img = ev.target.closest('.prose img');

    if (img) {
      if (open) return;
      var box = document.createElement('div');
      box.className = 'lightbox';

      var full = document.createElement('img');
      full.src = img.src;
      full.alt = img.alt || '';
      box.appendChild(full);

      var close_ = document.createElement('button');
      close_.className = 'lightbox-close';
      close_.type = 'button';
      close_.innerHTML = '&times;';
      close_.setAttribute('aria-label', 'Close');
      box.appendChild(close_);

      var hint = document.createElement('div');
      hint.className = 'lightbox-hint';
      hint.textContent = 'Click anywhere or press Esc to close';
      box.appendChild(hint);

      document.body.appendChild(box);
      document.body.style.overflow = 'hidden';
      open = box;
      return;
    }

    // Any click outside the image itself dismisses it.
    if (open && ev.target.tagName !== 'IMG') close();
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') close();
  });
})();
</script>`;
