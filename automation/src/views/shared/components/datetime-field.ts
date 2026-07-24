import { esc } from '../layout';
import { formatStamp } from '../../../shared/format/dates';

export const DATETIME_FIELD_STYLES = `
  .dt-card {
    border: 1px solid var(--border); border-radius: 10px;
    background: var(--surface); padding: 0.7rem 0.75rem 0.75rem;
  }
  .dt-card:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
  }
  .dt-head {
    display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
    margin-bottom: 0.6rem;
  }
  .dt-readout {
    font-size: 0.88rem; font-weight: 600; color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .dt-state {
    margin-left: auto; font-size: 0.68rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.05em;
    padding: 0.12rem 0.5rem; border-radius: 100px;
    border: 1px solid currentColor; white-space: nowrap; color: var(--ink-3);
  }
  .dt-state.is-future { color: var(--accent); }
  .dt-state.is-past { color: var(--good); }

  /*
   * auto-fit rather than two fixed columns: in a narrow sidebar panel the pair
   * stacks by itself, and a native date input never gets squeezed until it
   * clips its own year.
   */
  .dt-grid {
    display: grid; gap: 0.45rem;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
  .dt-input {
    display: flex; align-items: center; gap: 0.35rem;
    border: 1px solid var(--border); border-radius: 8px;
    background: var(--surface-2); padding: 0 0.5rem;
  }
  .dt-input .dt-ico { font-size: 0.82rem; opacity: 0.65; line-height: 1; }
  /*
   * The wrapper carries the border, so the input itself goes bare — and
   * color-scheme hands the native picker the right palette in dark mode.
   */
  .dt-input input {
    flex: 1; width: 100%; min-width: 0;
    border: 0; background: transparent; padding: 0.5rem 0;
    font-size: 0.88rem; font-variant-numeric: tabular-nums;
    color-scheme: light dark;
  }
  .dt-input input:focus { box-shadow: none; outline: none; }
  .dt-input:focus-within { border-color: var(--accent); }

  .dt-presets {
    display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.6rem;
  }
  .dt-preset {
    border: 1px solid var(--border); background: transparent;
    border-radius: 100px; cursor: pointer; font-family: inherit;
    font-size: 0.74rem; color: var(--ink-3); padding: 0.2rem 0.6rem;
  }
  .dt-preset:hover { border-color: var(--accent); color: var(--accent); }
`;

export interface DateTimeFieldOptions {
  name: string;
  label: string;
  value: string;
  futureLabel?: string;
  pastLabel?: string;
  hint?: string;
  hintId?: string;
}

const PRESETS: { key: string; label: string }[] = [
  { key: 'now', label: 'Now' },
  { key: 'tomorrow', label: 'Tomorrow 9 AM' },
  { key: 'monday', label: 'Next Monday 9 AM' },
  { key: 'week', label: 'In a week' },
];

export function dateTimeField({
  name,
  label,
  value,
  futureLabel = 'Upcoming',
  pastLabel = 'Passed',
  hint,
  hintId,
}: DateTimeFieldOptions): string {
  const [date = '', time = ''] = value.split('T');
  const stamp = formatStamp(value);

  return `<div class="field" data-datetime
       data-future-label="${esc(futureLabel)}" data-past-label="${esc(pastLabel)}">
    <label for="${esc(name)}-date">${esc(label)}</label>

    <input type="hidden" id="${esc(name)}" name="${esc(name)}"
           value="${esc(value)}" data-datetime-value />

    <div class="dt-card">
      <div class="dt-head">
        <span class="dt-readout" data-datetime-readout>${esc(stamp || 'No date set')}</span>
        <span class="dt-state" data-datetime-state hidden></span>
      </div>

      <div class="dt-grid">
        <span class="dt-input">
          <span class="dt-ico" aria-hidden="true">📅</span>
          <input type="date" id="${esc(name)}-date" value="${esc(date)}"
                 aria-label="${esc(label)} — date" data-datetime-date />
        </span>
        <span class="dt-input">
          <span class="dt-ico" aria-hidden="true">🕒</span>
          <input type="time" id="${esc(name)}-time" value="${esc(time)}"
                 aria-label="${esc(label)} — time" data-datetime-time />
        </span>
      </div>

      <div class="dt-presets">
        ${PRESETS.map(
          (preset) =>
            `<button type="button" class="dt-preset" data-datetime-preset="${preset.key}">${esc(preset.label)}</button>`,
        ).join('')}
      </div>
    </div>

    ${hint ? `<p class="hint"${hintId ? ` id="${esc(hintId)}"` : ''}>${hint}</p>` : ''}
  </div>`;
}

export const DATETIME_FIELD_SCRIPT = `
<script>
(function () {
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function distance(ms) {
    var ahead = ms > 0;
    var mins = Math.round(Math.abs(ms) / 60000);

    if (mins < 1) return 'right now';

    var value, unit;

    if (mins < 60) { value = mins; unit = 'minute'; }
    else if (mins < 1440) { value = Math.round(mins / 60); unit = 'hour'; }
    else if (mins < 43200) { value = Math.round(mins / 1440); unit = 'day'; }
    else { value = Math.round(mins / 43200); unit = 'month'; }

    var said = value + ' ' + unit + (value === 1 ? '' : 's');

    return ahead ? 'in ' + said : said + ' ago';
  }

  function bind(root) {
    var hidden = root.querySelector('[data-datetime-value]');
    var dateInput = root.querySelector('[data-datetime-date]');
    var timeInput = root.querySelector('[data-datetime-time]');
    var readout = root.querySelector('[data-datetime-readout]');
    var state = root.querySelector('[data-datetime-state]');

    if (!hidden || !dateInput || !timeInput) return;

    var futureLabel = root.getAttribute('data-future-label') || 'Upcoming';
    var pastLabel = root.getAttribute('data-past-label') || 'Passed';

    function chosen() {
      if (!dateInput.value) return null;
      var at = new Date(dateInput.value + 'T' + (timeInput.value || '00:00'));
      return isNaN(at.getTime()) ? null : at;
    }

    function sync() {
      var at = chosen();

      if (!at) {
        hidden.value = '';
        if (readout) readout.textContent = 'No date set';
        if (state) state.hidden = true;
      } else {
        // Keep the wire format the server already understands.
        hidden.value = dateInput.value + 'T' + (timeInput.value || '00:00');

        if (readout) {
          readout.textContent = at.toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit'
          });
        }

        if (state) {
          var ahead = at.getTime() - Date.now();
          var future = ahead > 60000;
          state.hidden = false;
          state.className = 'dt-state ' + (future ? 'is-future' : 'is-past');
          state.textContent = (future ? futureLabel : pastLabel) + ' · ' + distance(ahead);
        }
      }

      hidden.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function dayOf(at) {
      return at.getFullYear() + '-' + pad(at.getMonth() + 1) + '-' + pad(at.getDate());
    }

    function set(at) {
      dateInput.value = dayOf(at);
      timeInput.value = pad(at.getHours()) + ':' + pad(at.getMinutes());
      sync();
    }

    var presets = {
      now: function () { return new Date(); },
      tomorrow: function () {
        var at = new Date();
        at.setDate(at.getDate() + 1);
        at.setHours(9, 0, 0, 0);
        return at;
      },
      monday: function () {
        var at = new Date();
        // 8 - day lands on the Monday after this one when today is Monday.
        at.setDate(at.getDate() + ((8 - at.getDay()) % 7 || 7));
        at.setHours(9, 0, 0, 0);
        return at;
      },
      week: function () {
        var at = new Date();
        at.setDate(at.getDate() + 7);
        return at;
      }
    };

    root.querySelectorAll('[data-datetime-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var make = presets[btn.getAttribute('data-datetime-preset')];
        if (make) set(make());
      });
    });

    dateInput.addEventListener('change', sync);
    dateInput.addEventListener('input', sync);
    timeInput.addEventListener('change', sync);
    timeInput.addEventListener('input', sync);

    // A time with no date, or the reverse, would post an unparseable value.
    dateInput.addEventListener('blur', function () {
      if (dateInput.value && !timeInput.value) { timeInput.value = '00:00'; sync(); }
    });
    timeInput.addEventListener('blur', function () {
      // Keep the time that was just typed; today is the only sane date for it.
      if (timeInput.value && !dateInput.value) { dateInput.value = dayOf(new Date()); sync(); }
    });

    sync();
  }

  document.querySelectorAll('[data-datetime]').forEach(bind);
})();
</script>`;
