export const DEFAULT_PROJECT_COVER = '/project-default.svg';

export const COVER_FALLBACK = `onerror="if(this.src.indexOf('${DEFAULT_PROJECT_COVER}')<0)this.src='${DEFAULT_PROJECT_COVER}'"`;

export function coverSrc(url?: string): string {
  return url || DEFAULT_PROJECT_COVER;
}
