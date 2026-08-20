import { route } from '../shared/routing/route';

const ADMIN_COMMENTS = '/admin/comments';

export const CommentRoutes = {
  create: route<['slug']>('/post/:slug/comments'),
  remove: route<['id']>('/comments/:id/delete'),
} as const;

export const CommentAdminRoutes = {
  list: route(ADMIN_COMMENTS),
  hide: route<['id']>(`${ADMIN_COMMENTS}/:id/hide`),
  show: route<['id']>(`${ADMIN_COMMENTS}/:id/show`),
  remove: route<['id']>(`${ADMIN_COMMENTS}/:id/delete`),
} as const;
