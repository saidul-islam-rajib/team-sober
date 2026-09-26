/*
 * Full-size image viewer. Opens for article images (.prose img) and for any
 * image marked data-zoom (the author avatar), showing data-zoom's URL when it
 * points at a larger original. Clicking the picture toggles between fitting
 * the screen and its real size (scrollable); anything else closes it.
 * Needs LIGHTBOX_STYLES on the page.
 */
export const LIGHTBOX_SCRIPT = `
<script>
(function () {
  if (window.__lightbox) return;
  window.__lightbox = true;

  var open = null;
  var opener = null;

  function close() {
    if (!open) return;
    open.remove();
    open = null;
    document.body.style.overflow = '';
    if (opener && opener.focus) opener.focus();
    opener = null;
  }

  function fitsAlready(full) {
    return full.naturalWidth <= full.clientWidth + 1 &&
      full.naturalHeight <= full.clientHeight + 1;
  }

  function show(img) {
    if (open) return;
    opener = img;

    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', img.alt || 'Image');

    var full = document.createElement('img');
    full.className = 'lightbox-img';
    full.src = img.getAttribute('data-zoom') || img.currentSrc || img.src;
    full.alt = img.alt || '';
    box.appendChild(full);

    var closeBtn = document.createElement('button');
    closeBtn.className = 'lightbox-close';
    closeBtn.type = 'button';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close');
    box.appendChild(closeBtn);

    var hint = document.createElement('div');
    hint.className = 'lightbox-hint';
    hint.textContent = 'Click anywhere or press Esc to close';
    box.appendChild(hint);

    // Only offer real-size zoom when the picture is bigger than the screen.
    full.addEventListener('load', function () {
      if (fitsAlready(full)) return;
      full.classList.add('can-zoom');
      hint.textContent = 'Click the image to see it full size · Esc to close';
    });

    full.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (!full.classList.contains('can-zoom')) return;
      var actual = full.classList.toggle('is-actual');
      box.classList.toggle('is-actual', actual);
      hint.textContent = actual
        ? 'Scroll to look around · click the image to fit the screen'
        : 'Click the image to see it full size · Esc to close';
      if (actual) {
        // Start centred on the picture rather than its top-left corner.
        box.scrollLeft = (box.scrollWidth - box.clientWidth) / 2;
        box.scrollTop = (box.scrollHeight - box.clientHeight) / 2;
      }
    });

    document.body.appendChild(box);
    document.body.style.overflow = 'hidden';
    open = box;
    closeBtn.focus({ preventScroll: true });
  }

  document.addEventListener('click', function (ev) {
    var img =
      ev.target.closest('.prose img') || ev.target.closest('img[data-zoom]');

    if (img && !open) {
      show(img);
      return;
    }

    // Any click outside the image itself dismisses it.
    if (open && !ev.target.closest('.lightbox-img')) close();
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { close(); return; }

    var img = ev.target.closest && ev.target.closest('img[data-zoom]');
    if (img && !open && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();
      show(img);
    }
  });
})();
</script>`;
