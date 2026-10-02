export const SHARE_SUMMARY_WORDS = 40;

export function clipWords(
  text: string,
  maxWords = SHARE_SUMMARY_WORDS,
): string {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');

  return `${words
    .slice(0, maxWords)
    .join(' ')
    .replace(/[\s.,;:!?…—–-]+$/, '')}…`;
}

export function shareHeadline(
  title: string,
  summary?: string,
  maxWords = SHARE_SUMMARY_WORDS,
): string {
  const plain = (summary ?? '').replace(/\*\*|__|[*`]/g, '');
  const short = clipWords(plain, maxWords);
  if (!short || short.toLowerCase() === title.trim().toLowerCase())
    return title;

  return `${title} — ${short}`;
}

export function shareMeta(parts: (string | undefined | false)[]): string {
  return parts.filter(Boolean).join(' · ');
}
