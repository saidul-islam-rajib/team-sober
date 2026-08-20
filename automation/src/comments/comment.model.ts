export interface Comment {
  id: string;
  postId: string;
  postSlug: string;
  accountId: string;
  authorName: string;
  body: string;
  createdAt: string;
  hiddenAt: string;
}

export interface CommentInput {
  postId: string;
  postSlug: string;
  accountId: string;
  authorName: string;
  body: string;
}

export type CommentResult =
  { ok: true; comment: Comment } | { ok: false; problem: string };
