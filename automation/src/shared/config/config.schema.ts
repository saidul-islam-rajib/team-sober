export type ConfigFieldKind = 'number' | 'text';

export interface NumberField {
  key: string;
  kind: 'number';
  label: string;
  hint: string;
  default: number;
  min: number;
  max: number;
  unit?: string;
}

export interface TextField {
  key: string;
  kind: 'text';
  label: string;
  hint: string;
  default: string;
  maxLength: number;
}

export type ConfigField = NumberField | TextField;

export interface ConfigGroup {
  id: string;
  title: string;
  description: string;
  fields: ConfigField[];
}

export const CONFIG_GROUPS: ConfigGroup[] = [
  {
    id: 'security',
    title: 'Security & rate limiting',
    description:
      'How sign-in is protected and how long a session lasts. Applies to the admin and to learner accounts.',
    fields: [
      {
        key: 'security.maxLoginAttempts',
        kind: 'number',
        label: 'Failed attempts before lockout',
        hint: 'Wrong passwords from one address before it is locked out.',
        default: 5,
        min: 1,
        max: 50,
        unit: 'attempts',
      },
      {
        key: 'security.lockoutMinutes',
        kind: 'number',
        label: 'Lockout length',
        hint: 'How long a locked-out address must wait.',
        default: 15,
        min: 1,
        max: 1440,
        unit: 'minutes',
      },
      {
        key: 'security.attemptWindowMinutes',
        kind: 'number',
        label: 'Attempt window',
        hint: 'Failures older than this are forgotten.',
        default: 15,
        min: 1,
        max: 1440,
        unit: 'minutes',
      },
      {
        key: 'security.sessionDays',
        kind: 'number',
        label: 'Learner session length',
        hint: 'How long a signed-in learner stays signed in.',
        default: 30,
        min: 1,
        max: 365,
        unit: 'days',
      },
    ],
  },
  {
    id: 'accounts',
    title: 'Registration & password links',
    description:
      'Registering emails a one-time link to choose a password, which is also what proves the address is real. The same link is used for “forgot password”.',
    fields: [
      {
        key: 'accounts.passwordLinkMinutes',
        kind: 'number',
        label: 'Password link lifetime',
        hint: 'How long an emailed set-password or reset link stays usable.',
        default: 1440,
        min: 15,
        max: 10_080,
        unit: 'minutes',
      },
    ],
  },
  {
    id: 'recovery',
    title: 'Account recovery',
    description:
      'The one-time reset the owner can issue by hand when a learner can no longer receive email at the address on their account.',
    fields: [
      {
        key: 'recovery.resetLinkMinutes',
        kind: 'number',
        label: 'Reset link lifetime',
        hint: 'How long an owner-issued reset code stays usable.',
        default: 60,
        min: 5,
        max: 1440,
        unit: 'minutes',
      },
      {
        key: 'recovery.resetHistoryDepth',
        kind: 'number',
        label: 'Reset history kept',
        hint: 'How many past resets to keep per account for the audit trail.',
        default: 10,
        min: 1,
        max: 100,
        unit: 'entries',
      },
      {
        key: 'recovery.codeGroups',
        kind: 'number',
        label: 'Recovery code groups',
        hint: 'Number of dash-separated groups in a recovery code.',
        default: 4,
        min: 2,
        max: 8,
        unit: 'groups',
      },
      {
        key: 'recovery.codeGroupLength',
        kind: 'number',
        label: 'Characters per group',
        hint: 'Length of each group in a recovery code.',
        default: 5,
        min: 3,
        max: 8,
        unit: 'characters',
      },
      {
        key: 'recovery.minPasswordLength',
        kind: 'number',
        label: 'Minimum password length',
        hint: 'Shortest password a learner may choose.',
        default: 8,
        min: 6,
        max: 128,
        unit: 'characters',
      },
    ],
  },
  {
    id: 'content',
    title: 'Content limits',
    description:
      'Pagination and listing sizes across the admin and public pages.',
    fields: [
      {
        key: 'content.adminPageSize',
        kind: 'number',
        label: 'Admin listing page size',
        hint: 'Rows per page in the posts and projects admin tables.',
        default: 10,
        min: 5,
        max: 100,
        unit: 'rows',
      },
      {
        key: 'content.sidebarTagLimit',
        kind: 'number',
        label: 'Sidebar tag limit',
        hint: 'Most-used tags shown in the home sidebar before “see all”.',
        default: 20,
        min: 5,
        max: 100,
        unit: 'tags',
      },
    ],
  },
  {
    id: 'media',
    title: 'Images & caching',
    description:
      'How long browsers keep uploaded images before checking for a new copy. Uploads get a unique filename, so a long duration is safe — a changed image is a new file with a new URL.',
    fields: [
      {
        key: 'media.imageCacheDays',
        kind: 'number',
        label: 'Image cache retention',
        hint: 'How long a browser reuses a downloaded image without re-requesting it. Longer means faster repeat visits and less bandwidth.',
        default: 7,
        min: 1,
        max: 365,
        unit: 'days',
      },
    ],
  },
  {
    id: 'comments',
    title: 'Comments',
    description:
      'Signed-in learners can leave a comment on any post — there is no anonymous posting, so every comment is already tied to an account manageable from Accounts.',
    fields: [
      {
        key: 'comments.maxLength',
        kind: 'number',
        label: 'Maximum comment length',
        hint: 'Longest a single comment may be.',
        default: 1000,
        min: 100,
        max: 5000,
        unit: 'characters',
      },
      {
        key: 'comments.cooldownSeconds',
        kind: 'number',
        label: 'Cooldown between comments',
        hint: 'How long one account must wait between posting comments.',
        default: 20,
        min: 0,
        max: 3600,
        unit: 'seconds',
      },
    ],
  },
  {
    id: 'newsletter',
    title: 'Newsletter',
    description:
      'Double opt-in email updates. Subscribing emails a confirmation link, and nothing is added to the list until that link is followed.',
    fields: [
      {
        key: 'newsletter.confirmLinkMinutes',
        kind: 'number',
        label: 'Confirmation link lifetime',
        hint: 'How long an emailed subscribe-confirmation link stays usable.',
        default: 1440,
        min: 15,
        max: 10_080,
        unit: 'minutes',
      },
    ],
  },
  {
    id: 'support',
    title: 'Support & contact',
    description:
      'Where a learner who is locked out, or has lost both password and code, is sent to reach a human.',
    fields: [
      {
        key: 'support.channelUrl',
        kind: 'text',
        label: 'Support link',
        hint: 'Where “ask for a reset” and locked-out messages point. A /path or full URL.',
        default: '/about',
        maxLength: 300,
      },
      {
        key: 'support.channelLabel',
        kind: 'text',
        label: 'Support link text',
        hint: 'The wording of that link.',
        default: 'the about page',
        maxLength: 80,
      },
      {
        key: 'support.requestQueueLimit',
        kind: 'number',
        label: 'Recovery request queue size',
        hint: 'How many recovery requests to keep before the oldest resolved ones are dropped.',
        default: 50,
        min: 10,
        max: 500,
        unit: 'requests',
      },
    ],
  },
];

export type ConfigValues = Record<string, number | string>;

export const CONFIG_FIELDS: ConfigField[] = CONFIG_GROUPS.flatMap(
  (group) => group.fields,
);

export const CONFIG_DEFAULTS: ConfigValues = Object.fromEntries(
  CONFIG_FIELDS.map((f) => [f.key, f.default]),
);

export function coerceField(field: ConfigField, raw: unknown): number | string {
  if (field.kind === 'number') {
    const value = Number(raw);
    if (!Number.isFinite(value)) return field.default;

    return Math.min(field.max, Math.max(field.min, Math.round(value)));
  }

  const text = (typeof raw === 'string' ? raw : '').trim();

  return text ? text.slice(0, field.maxLength) : field.default;
}

export function normaliseConfig(input: Partial<ConfigValues>): ConfigValues {
  return Object.fromEntries(
    CONFIG_FIELDS.map((field) => [
      field.key,
      coerceField(field, input[field.key] ?? field.default),
    ]),
  );
}
