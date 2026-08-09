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
