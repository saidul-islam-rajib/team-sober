import { route } from '../shared/routing/route';

const ADMIN_ADMINS = '/admin/admins';

export const AdminsRoutes = {
  list: route(ADMIN_ADMINS),
  detail: route<['id']>(`${ADMIN_ADMINS}/:id`),
  resetPassword: route<['id']>(`${ADMIN_ADMINS}/:id/reset`),
  changeEmail: route<['id']>(`${ADMIN_ADMINS}/:id/email`),
  remove: route<['id']>(`${ADMIN_ADMINS}/:id/delete`),
} as const;
