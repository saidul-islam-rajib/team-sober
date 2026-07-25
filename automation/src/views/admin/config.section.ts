import {
  CONFIG_GROUPS,
  ConfigField,
  ConfigValues,
} from '../../shared/config/config.schema';
import { attributes } from '../../shared/view/attributes';
import { SafeHtml, html, join } from '../../shared/view/html';
import { submitButton } from '../../shared/view/components';

interface ConfigRow {
  field: ConfigField;
  group: string;
  value: number | string;
}

function flattenRows(values: ConfigValues): ConfigRow[] {
  return CONFIG_GROUPS.flatMap((group) =>
    group.fields.map((field) => ({
      field,
      group: group.title,
      value: values[field.key],
    })),
  );
}

function valueInput(field: ConfigField, value: number | string): SafeHtml {
  const id = `cfg-${field.key}`;

  const input =
    field.kind === 'number'
      ? html`<input${attributes({
          type: 'number',
          id,
          name: field.key,
          value: String(value),
          min: field.min,
          max: field.max,
          step: 1,
          required: true,
        })} />`
      : html`<input${attributes({
          type: 'text',
          id,
          name: field.key,
          value: String(value),
          maxlength: field.maxLength,
        })} />`;

  const unit = field.kind === 'number' && field.unit ? field.unit : '';

  return html`<div class="cfg-input">
    ${input} ${unit ? html`<span class="cfg-unit">${unit}</span>` : ''}
  </div>`;
}

function defaultLabel(field: ConfigField): string {
  if (field.kind === 'number') {
    return `${field.default}${field.unit ? ` ${field.unit}` : ''}`;
  }

  return String(field.default);
}

function rangeLabel(field: ConfigField): string {
  return field.kind === 'number' ? `${field.min}–${field.max}` : '';
}

export function configSection(values: ConfigValues): SafeHtml {
  const rows = flattenRows(values);

  return html`<div class="cfg-search-card">
      <div class="cfg-search-head">
        <span class="cfg-search-icon" aria-hidden="true"></span> Search
      </div>
      <div class="cfg-search-grid">
        <div class="cfg-search-field">
          <label for="cfg-filter-name">Name</label>
          <input
            type="search"
            id="cfg-filter-name"
            data-cfg-filter="name"
            placeholder="Filter by setting name"
            autocomplete="off"
          />
        </div>
        <div class="cfg-search-field">
          <label for="cfg-filter-value">Value</label>
          <input
            type="search"
            id="cfg-filter-value"
            data-cfg-filter="value"
            placeholder="Filter by value"
            autocomplete="off"
          />
        </div>
      </div>
    </div>

    <form method="post" action="/admin/settings/config" id="config">
      <div class="cfg-table-wrap">
        <table class="cfg-table">
          <thead>
            <tr>
              <th>Setting name</th>
              <th>Group</th>
              <th>Value</th>
              <th>Default</th>
            </tr>
          </thead>
          <tbody data-cfg-rows>
            ${join(
              rows.map(
                (row) => html`<tr
                  class="cfg-row"
                  data-name="${`${row.field.key} ${row.field.label}`}"
                  data-value="${String(row.value)}"
                >
                  <td class="cfg-name">
                    <code>${row.field.key}</code>
                    <span class="cfg-label">${row.field.label}</span>
                    <span class="cfg-hint">${row.field.hint}</span>
                  </td>
                  <td class="cfg-group">
                    <span class="cfg-group-pill">${row.group}</span>
                  </td>
                  <td class="cfg-value">${valueInput(row.field, row.value)}</td>
                  <td class="cfg-default">
                    <span class="cfg-default-value"
                      >${defaultLabel(row.field)}</span
                    >
                    ${
                      rangeLabel(row.field)
                        ? html`<span class="cfg-range"
                          >range ${rangeLabel(row.field)}</span
                        >`
                        : ''
                    }
                    <button
                      type="button"
                      class="cfg-reset"
                      data-cfg-reset="cfg-${row.field.key}"
                      data-default="${String(row.field.default)}"
                    >
                      Reset
                    </button>
                  </td>
                </tr>`,
              ),
            )}
          </tbody>
        </table>
        <p class="cfg-empty" data-cfg-empty hidden>
          No settings match your search.
        </p>
      </div>
      <div class="cfg-save">${submitButton({ label: 'Save configuration' })}</div>
    </form>`;
}

export const CONFIG_SECTION_SCRIPT = `
<script>
(function () {
  var nameFilter = document.querySelector('[data-cfg-filter="name"]');
  var valueFilter = document.querySelector('[data-cfg-filter="value"]');
  var rows = Array.prototype.slice.call(document.querySelectorAll('.cfg-row'));
  var empty = document.querySelector('[data-cfg-empty]');
  if (!rows.length) return;

  function apply() {
    var name = ((nameFilter && nameFilter.value) || '').trim().toLowerCase();
    var value = ((valueFilter && valueFilter.value) || '').trim().toLowerCase();
    var shown = 0;

    rows.forEach(function (row) {
      var haystack = (row.getAttribute('data-name') || '').toLowerCase();
      var input = row.querySelector('input[name]');
      var current = (input ? input.value : row.getAttribute('data-value') || '').toLowerCase();
      var match =
        (!name || haystack.indexOf(name) >= 0) &&
        (!value || current.indexOf(value) >= 0);

      row.hidden = !match;
      if (match) shown++;
    });

    if (empty) empty.hidden = shown > 0;
  }

  if (nameFilter) nameFilter.addEventListener('input', apply);
  if (valueFilter) valueFilter.addEventListener('input', apply);

  document.querySelectorAll('[data-cfg-reset]').forEach(function (button) {
    button.addEventListener('click', function () {
      var target = document.getElementById(button.getAttribute('data-cfg-reset'));
      if (!target) return;

      target.value = button.getAttribute('data-default');
      target.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
})();
</script>`;

export const CONFIG_SECTION_CSS = `
.cfg-search-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; padding: 1.15rem 1.3rem; margin-bottom: 1.25rem;
}
.cfg-search-head {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 1rem; font-weight: 700; color: var(--ink); margin-bottom: 0.95rem;
}
.cfg-search-icon {
  width: 15px; height: 15px; border-radius: 50%;
  border: 2px solid var(--ink-3); position: relative; flex: none;
}
.cfg-search-icon::after {
  content: ""; position: absolute; right: -4px; bottom: -3px;
  width: 6px; height: 2px; background: var(--ink-3);
  transform: rotate(45deg); border-radius: 2px;
}
.cfg-search-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem 1.5rem; }
@media (max-width: 640px) { .cfg-search-grid { grid-template-columns: 1fr; } }
.cfg-search-field label {
  display: block; font-size: 0.8rem; font-weight: 600;
  color: var(--ink-2); margin-bottom: 0.3rem;
}
.cfg-search-field input { width: 100%; border-radius: 8px; }

.cfg-table-wrap {
  border: 1px solid var(--border); border-radius: 12px; overflow-x: auto;
}
.cfg-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.cfg-table th {
  text-align: left; font-size: 0.72rem; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--ink-3); font-weight: 700;
  padding: 0.75rem 0.95rem; white-space: nowrap;
  background: var(--surface-2); border-bottom: 1px solid var(--border);
}
.cfg-table td {
  padding: 0.8rem 0.95rem; border-bottom: 1px solid var(--border);
  vertical-align: top;
}
.cfg-table tbody tr:last-child td { border-bottom: 0; }
.cfg-table tbody tr:hover td { background: var(--surface-2); }
.cfg-name code {
  font-family: var(--mono); font-size: 0.82rem; color: var(--ink);
  background: var(--surface-2); border: 1px solid var(--border);
  padding: 0.05rem 0.4rem; border-radius: 5px;
}
.cfg-name .cfg-label {
  display: block; font-weight: 600; color: var(--ink); margin-top: 0.35rem;
}
.cfg-name .cfg-hint {
  display: block; font-size: 0.78rem; color: var(--ink-3);
  margin-top: 0.15rem; max-width: 46ch; line-height: 1.45;
}
.cfg-group-pill {
  display: inline-block; font-size: 0.72rem; font-weight: 600;
  color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
  padding: 0.12rem 0.55rem; border-radius: 100px; white-space: nowrap;
}
.cfg-value { min-width: 9rem; }
.cfg-input { display: flex; align-items: center; gap: 0.5rem; }
.cfg-input input[type="number"] { width: 6.5rem; }
.cfg-input input[type="text"] { width: 100%; min-width: 11rem; }
.cfg-unit { font-size: 0.8rem; color: var(--ink-3); white-space: nowrap; }
.cfg-default { white-space: nowrap; }
.cfg-default-value { display: block; font-weight: 600; color: var(--ink-2); font-size: 0.86rem; }
.cfg-range { display: block; font-size: 0.74rem; color: var(--ink-3); margin-top: 0.15rem; }
.cfg-reset {
  display: inline-block; margin-top: 0.5rem;
  background: transparent; border: 1px solid var(--border); border-radius: 7px;
  color: var(--ink-3); cursor: pointer; font-family: inherit;
  font-size: 0.74rem; padding: 0.2rem 0.6rem;
}
.cfg-reset:hover { border-color: var(--accent); color: var(--accent); }
.cfg-row[hidden] { display: none; }
.cfg-empty { padding: 1.75rem; text-align: center; color: var(--ink-3); font-size: 0.9rem; }
.cfg-save { margin-top: 1.35rem; }
`;
