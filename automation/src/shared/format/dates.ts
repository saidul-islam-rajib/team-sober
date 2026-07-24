export function formatDay(iso?: string): string {
  const at = new Date(iso ?? '');

  return Number.isNaN(at.getTime())
    ? ''
    : at.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
}

export function formatStamp(value?: string): string {
  const at = new Date(value ?? '');

  if (Number.isNaN(at.getTime())) return '';

  return at.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatMoment(iso?: string): string {
  const at = new Date(iso ?? '');

  return Number.isNaN(at.getTime())
    ? ''
    : `${formatDay(iso)} at ${at.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
}
