import { esc, layout } from '../shared/layout';

function resultPage(opts: {
  title: string;
  message: string;
  extra?: string;
}): string {
  return layout({
    title: opts.title,
    body: `<div class="empty">
      <h1 class="page-title">${esc(opts.title)}</h1>
      <p>${esc(opts.message)}</p>
      ${opts.extra ?? ''}
      <p style="margin-top:1.25rem"><a class="btn" href="/">Back to the blog</a></p>
    </div>`,
    noindex: true,
  });
}

export function subscribeResultPage({
  ok,
  message,
}: {
  ok: boolean;
  message: string;
}): string {
  return resultPage({
    title: ok ? 'Almost there' : 'Something went wrong',
    message,
  });
}

export function confirmResultPage({
  ok,
  message,
  unsubscribeUrl,
}: {
  ok: boolean;
  message: string;
  unsubscribeUrl?: string;
}): string {
  return resultPage({
    title: ok ? 'Subscribed' : 'Link invalid',
    message,
    extra: unsubscribeUrl
      ? `<p class="hint">Changed your mind? <a href="${esc(unsubscribeUrl)}">Unsubscribe</a> any time.</p>`
      : undefined,
  });
}

export function unsubscribeResultPage({
  ok,
  message,
}: {
  ok: boolean;
  message: string;
}): string {
  return resultPage({ title: ok ? 'Unsubscribed' : 'Link invalid', message });
}
