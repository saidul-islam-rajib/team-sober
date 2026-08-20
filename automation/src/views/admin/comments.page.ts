import { Comment } from '../../comments/comment.model';
import { CommentAdminRoutes } from '../../comments/comments.routes';
import { css, js } from '../../shared/assets/asset.store';
import { UI_BUNDLE } from '../../shared/assets/assets.bootstrap';
import { formatDay } from '../../shared/format/dates';
import {
  Column,
  panel,
  pill,
  submitButton,
  table,
  toolbar,
} from '../../shared/view/components';
import { SafeHtml, html, toHtml } from '../../shared/view/html';
import { adminNav, layout } from '../shared/layout';

const STYLES = [css(UI_BUNDLE)];
const SCRIPTS = [js(UI_BUNDLE)];

function render(title: string, body: SafeHtml): string {
  return layout({
    title,
    body: toHtml(body),
    nav: adminNav(CommentAdminRoutes.list.template),
    variant: 'admin',
    styles: STYLES,
    scripts: SCRIPTS,
    noindex: true,
  });
}

function excerpt(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

export interface CommentsAdminState {
  comments: Comment[];
}

export function commentsAdminPage({ comments }: CommentsAdminState): string {
  const visible = comments.filter((c) => !c.hiddenAt).length;

  const columns: Column<Comment>[] = [
    {
      header: 'Post',
      cell: (c) =>
        html`<a href="/post/${c.postSlug}#comments">${c.postSlug}</a>`,
    },
    {
      header: 'Author',
      cell: (c) => html`<span class="t">${c.authorName}</span>`,
    },
    {
      header: 'Comment',
      cell: (c) => html`<span class="s">${excerpt(c.body)}</span>`,
    },
    {
      header: 'Posted',
      cell: (c) => html`<span class="s">${formatDay(c.createdAt)}</span>`,
    },
    {
      header: 'Status',
      cell: (c) =>
        c.hiddenAt
          ? pill({ label: 'Hidden', tone: 'warn' })
          : pill({ label: 'Visible', tone: 'good' }),
    },
    {
      header: '',
      align: 'end',
      cell: (
        c,
      ) => html`<div style="display:flex;gap:.4rem;justify-content:flex-end">
        <form
          method="post"
          action="${
            c.hiddenAt
              ? CommentAdminRoutes.show.path({ id: c.id })
              : CommentAdminRoutes.hide.path({ id: c.id })
          }"
        >
          ${submitButton({
            label: c.hiddenAt ? 'Show' : 'Hide',
            variant: 'ghost',
            attrs: { class: 'btn btn-ghost btn-sm' },
          })}
        </form>
        <form
          method="post"
          action="${CommentAdminRoutes.remove.path({ id: c.id })}"
          onsubmit="return confirm('Delete this comment? This cannot be undone.')"
        >
          ${submitButton({
            label: 'Delete',
            variant: 'danger',
            attrs: { class: 'btn btn-danger btn-sm' },
          })}
        </form>
      </div>`,
    },
  ];

  const body = html`${toolbar({
    title: 'Comments',
    subtitle: `${comments.length} comment${comments.length === 1 ? '' : 's'} total, ${visible} visible`,
    back: { href: '/admin', label: '← Back to dashboard' },
  })}
    ${panel({
      body: table({ columns, rows: comments, empty: 'No comments yet.' }),
    })}`;

  return render('Comments', body);
}
