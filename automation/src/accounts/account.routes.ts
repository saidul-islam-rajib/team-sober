import { QueryValue, route, withQuery } from '../shared/routing/route';

const ACCOUNT = '/account';
const ADMIN_ACCOUNTS = '/admin/accounts';

export const AccountRoutes = {
  home: route(ACCOUNT),
  register: route(`${ACCOUNT}/register`),
  signIn: route(`${ACCOUNT}/sign-in`),
  signOut: route(`${ACCOUNT}/sign-out`),
  recover: route(`${ACCOUNT}/recover`),
  recoverRequest: route(`${ACCOUNT}/recover-request`),
  setPassword: route(`${ACCOUNT}/set-password`),
  passwordLink: route(`${ACCOUNT}/password-link`),
  reset: route(`${ACCOUNT}/reset`),
} as const;

export const AccountAdminRoutes = {
  list: route(ADMIN_ACCOUNTS),
  detail: route<['id']>(`${ADMIN_ACCOUNTS}/:id`),
  issueReset: route<['id']>(`${ADMIN_ACCOUNTS}/:id/reset`),
  revokeReset: route<['id']>(`${ADMIN_ACCOUNTS}/:id/revoke`),
  handleRequest: route<['id']>(`${ADMIN_ACCOUNTS}/requests/:id/handle`),
  dismissRequest: route<['id']>(`${ADMIN_ACCOUNTS}/requests/:id/dismiss`),
} as const;

export function accountUrl(
  path: string,
  query: Record<string, QueryValue> = {},
): string {
  return withQuery(path, query);
}
