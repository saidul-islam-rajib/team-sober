/*
 * Drag to reorder, for any number of lists on one page.
 *
 * Markup contract:
 *   <form data-sortable-form="lessons" …><input data-sortable-order /></form>
 *   <div data-sortable="lessons">
 *     <div data-sort-id="…" draggable="true">…<span data-sort-number></span></div>
 *   </div>
 *
 * Lists sharing a name post one combined order, so lessons split across several
 * chapter blocks still submit as a single sequence. An item may nominate a
 * handle with data-sort-handle — the chapter bar does, so dragging a lesson
 * inside a chapter does not pick the whole chapter up.
 *
 * A drag stays inside the list it began in: a lesson reorders within its
 * chapter, a chapter reorders among chapters. Moving a lesson to a different
 * chapter is a different operation, and the lesson editor owns it.
 */
export const SORTABLE_SCRIPT = `
<script>
(function () {
  var containers = Array.prototype.slice.call(document.querySelectorAll('[data-sortable]'));
  if (!containers.length || typeof document.body.closest !== 'function') return;

  var dragged = null;
  var origin = null;

  function groupOf(container) {
    return container.getAttribute('data-sortable') || '';
  }

  function itemsIn(container) {
    return Array.prototype.slice.call(container.children).filter(function (child) {
      return child.nodeType === 1 && child.hasAttribute('data-sort-id');
    });
  }

  function itemFrom(container, node) {
    while (node && node !== container) {
      if (node.nodeType === 1 && node.parentNode === container && node.hasAttribute('data-sort-id')) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  // The nearest enclosing list, so a lesson row resolves to its own list
  // rather than to the chapter block that happens to contain it.
  function ownerOf(node) {
    var container = node && node.closest ? node.closest('[data-sortable]') : null;
    if (!container) return null;

    var item = itemFrom(container, node);
    return item ? { container: container, item: item } : null;
  }

  function renumber(group) {
    var counter = 0;

    containers.forEach(function (container) {
      if (groupOf(container) !== group) return;

      itemsIn(container).forEach(function (item) {
        counter++;
        var badge = item.querySelector('[data-sort-number]');
        if (badge) badge.textContent = String(counter);
      });
    });
  }

  function persist(group) {
    var form = document.querySelector('[data-sortable-form="' + group + '"]');
    var field = form ? form.querySelector('[data-sortable-order]') : null;
    if (!form || !field) return;

    var ids = [];

    containers.forEach(function (container) {
      if (groupOf(container) !== group) return;

      itemsIn(container).forEach(function (item) {
        ids.push(item.getAttribute('data-sort-id'));
      });
    });

    field.value = ids.join(',');
    form.submit();
  }

  document.addEventListener('dragstart', function (e) {
    var handle = e.target.closest ? e.target.closest('[data-sort-handle]') : null;
    var owner = ownerOf(handle || e.target);
    if (!owner) return;

    // With a handle present, only the handle starts the drag.
    if (owner.item.querySelector('[data-sort-handle]') && !handle) return;

    dragged = owner.item;
    origin = owner.container;
    dragged.classList.add('dragging');

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', dragged.getAttribute('data-sort-id'));
      } catch (err) {
        return;
      }
    }
  });

  document.addEventListener('dragover', function (e) {
    if (!dragged) return;

    var owner = ownerOf(e.target);
    if (!owner || owner.container !== origin) return;   // stay in the list we started in

    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

    if (owner.item === dragged) return;

    var box = owner.item.getBoundingClientRect();
    var below = e.clientY - box.top > box.height / 2;

    origin.insertBefore(dragged, below ? owner.item.nextSibling : owner.item);
    renumber(groupOf(origin));
  });

  document.addEventListener('drop', function (e) {
    if (dragged) e.preventDefault();
  });

  document.addEventListener('dragend', function () {
    if (!dragged) return;

    var group = groupOf(origin);

    dragged.classList.remove('dragging');
    dragged = null;
    origin = null;

    renumber(group);
    persist(group);
  });
})();
</script>`;
