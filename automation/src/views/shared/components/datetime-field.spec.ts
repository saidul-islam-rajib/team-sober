import { JSDOM } from 'jsdom';
import { DATETIME_FIELD_SCRIPT, dateTimeField } from './datetime-field';

function mount(html: string) {
  const dom = new JSDOM(`<body>${html}${DATETIME_FIELD_SCRIPT}</body>`, {
    runScripts: 'dangerously',
  });
  const d = dom.window.document;
  const q = (sel: string) => d.querySelector<HTMLInputElement>(sel)!;

  return {
    dom,
    hidden: q('[data-datetime-value]'),
    date: q('[data-datetime-date]'),
    time: q('[data-datetime-time]'),
    click: (key: string) =>
      d
        .querySelector<HTMLButtonElement>(`[data-datetime-preset="${key}"]`)!
        .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })),
  };
}

function local(at: Date): { date: string; time: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`,
    time: `${pad(at.getHours())}:${pad(at.getMinutes())}`,
  };
}

describe('date and time field in the browser', () => {
  it('shows the stored moment in the browser timezone', () => {
    const iso = '2026-09-26T10:09:00.000Z';
    const field = mount(
      dateTimeField({
        name: 'publishedAt',
        label: 'Publish',
        value: '2026-09-26T10:09',
        iso,
      }),
    );

    expect(field.date.value).toBe(local(new Date(iso)).date);
    expect(field.time.value).toBe(local(new Date(iso)).time);
    expect(field.hidden.value).toBe(iso);
  });

  it('posts an exact UTC instant, not a zoneless local time', () => {
    const field = mount(
      dateTimeField({ name: 'publishedAt', label: 'Publish', value: '' }),
    );

    field.date.value = '2026-09-26';
    field.time.value = '16:09';
    field.time.dispatchEvent(new field.dom.window.Event('change'));

    expect(field.hidden.value).toMatch(/Z$/);
    expect(field.hidden.value).toBe(new Date('2026-09-26T16:09').toISOString());
  });

  it('"Now" posts a moment that is not in the future', () => {
    const field = mount(
      dateTimeField({ name: 'publishedAt', label: 'Publish', value: '' }),
    );

    field.click('now');

    const posted = Date.parse(field.hidden.value);
    expect(field.hidden.value).toMatch(/Z$/);
    expect(posted).toBeLessThanOrEqual(Date.now());
    expect(Date.now() - posted).toBeLessThan(60_000);
  });

  it('renders no data-iso when none is given', () => {
    expect(
      dateTimeField({ name: 'a', label: 'A', value: '2026-01-01T00:00' }),
    ).not.toContain('data-iso');
  });
});
