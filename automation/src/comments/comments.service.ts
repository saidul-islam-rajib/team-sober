import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JsonCollection } from '../shared/persistence/json-collection';
import { CommentPolicy } from '../shared/config/policies';
import { Comment, CommentInput, CommentResult } from './comment.model';

@Injectable()
export class CommentsService {
  private readonly store = new JsonCollection<Comment>({
    file: 'comments.json',
    key: 'comments',
    label: 'comment(s)',
  });

  private lastByAccount(accountId: string): Comment | undefined {
    return this.store
      .filter((comment) => comment.accountId === accountId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  }

  add(input: CommentInput, now = Date.now()): CommentResult {
    const body = input.body.trim();

    if (!body) {
      return { ok: false, problem: 'Write something before posting.' };
    }

    if (body.length > CommentPolicy.maxLength) {
      return {
        ok: false,
        problem: `Keep it under ${CommentPolicy.maxLength} characters.`,
      };
    }

    const last = this.lastByAccount(input.accountId);

    if (last && now - Date.parse(last.createdAt) < CommentPolicy.cooldownMs) {
      return {
        ok: false,
        problem:
          'You are commenting too quickly — wait a moment and try again.',
      };
    }

    const comment: Comment = {
      id: randomUUID(),
      postId: input.postId,
      postSlug: input.postSlug,
      accountId: input.accountId,
      authorName: input.authorName,
      body,
      createdAt: new Date(now).toISOString(),
      hiddenAt: '',
    };

    this.store.add(comment);

    return { ok: true, comment };
  }

  forPost(postSlug: string): Comment[] {
    return this.store
      .filter((comment) => comment.postSlug === postSlug && !comment.hiddenAt)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }

  countForPost(postSlug: string): number {
    return this.forPost(postSlug).length;
  }

  all(): Comment[] {
    return [...this.store.all()].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  }

  findById(id: string): Comment | undefined {
    return this.store.find((comment) => comment.id === id);
  }

  setHidden(id: string, hidden: boolean): void {
    const comment = this.findById(id);
    if (!comment) return;

    comment.hiddenAt = hidden ? new Date().toISOString() : '';
    this.store.persist();
  }

  remove(id: string): void {
    this.store.replaceAll(
      this.store.all().filter((comment) => comment.id !== id),
    );
  }

  get count(): number {
    return this.store.size;
  }
}
