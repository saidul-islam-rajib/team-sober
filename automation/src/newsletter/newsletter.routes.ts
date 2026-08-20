import { route } from '../shared/routing/route';

const ADMIN_NEWSLETTER = '/admin/newsletter';

export const NewsletterRoutes = {
  subscribe: route('/subscribe'),
  confirm: route('/subscribe/confirm'),
  unsubscribe: route('/unsubscribe'),
} as const;

export const NewsletterAdminRoutes = {
  index: route(ADMIN_NEWSLETTER),
  send: route(`${ADMIN_NEWSLETTER}/send`),
} as const;
