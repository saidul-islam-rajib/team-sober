export interface AccountBenefit {
  icon: string;
  title: string;
  detail: string;
}

export const ACCOUNT_BENEFITS: AccountBenefit[] = [
  {
    icon: '✓',
    title: 'Progress that follows you',
    detail:
      'Lessons you finish are kept on your account, not in one browser, so you can carry on from any device.',
  },
  {
    icon: '★',
    title: 'One certificate per course',
    detail:
      'A certificate is issued to you rather than to a browser, with a reference that never changes.',
  },
  {
    icon: '⚿',
    title: 'One account, every service',
    detail:
      'The same sign-in works across Team Sober. Register once and the other services know you already.',
  },
];

export interface AccountStep {
  title: string;
  detail: string;
}

export const REGISTRATION_STEPS: AccountStep[] = [
  {
    title: 'Tell us your name and address',
    detail: 'That is the whole form — no password to think of yet.',
  },
  {
    title: 'Open the link we email you',
    detail:
      'It works once, and choosing a password is what proves the address is yours.',
  },
  {
    title: 'Start learning',
    detail:
      'Setting the password signs you in, and you stay signed in as long as your session lasts.',
  },
];

export const SETUP_LINK_STEPS: AccountStep[] = [
  {
    title: 'We just sent an email',
    detail: 'A one-time link to set your password is on its way to your inbox.',
  },
  {
    title: 'Open it from your inbox',
    detail:
      'The link only works once, so use it directly rather than forwarding it.',
  },
  {
    title: 'Choose a password',
    detail:
      'Setting one confirms the address is yours and finishes creating your account.',
  },
  {
    title: 'Start learning',
    detail:
      'From there your progress and certificates follow your account, not this browser.',
  },
];

export const RESET_LINK_STEPS: AccountStep[] = [
  {
    title: 'We just sent an email',
    detail:
      'A one-time link to choose a new password is on its way to your inbox.',
  },
  {
    title: 'Open it from your inbox',
    detail:
      'The link only works once, so use it directly rather than forwarding it.',
  },
  {
    title: 'Choose a new password',
    detail: 'Your current password keeps working until the link is used.',
  },
  {
    title: 'Sign back in',
    detail: 'Use your new password the next time you sign in.',
  },
];
