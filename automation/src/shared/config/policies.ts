import { configNumber, configText } from './config.store';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const SecurityPolicy = {
  get maxLoginAttempts(): number {
    return configNumber('security.maxLoginAttempts');
  },
  get lockoutMs(): number {
    return configNumber('security.lockoutMinutes') * MINUTE;
  },
  get windowMs(): number {
    return configNumber('security.attemptWindowMinutes') * MINUTE;
  },
  get sessionMs(): number {
    return configNumber('security.sessionDays') * DAY;
  },
};

export const RecoveryPolicy = {
  get resetLinkMinutes(): number {
    return configNumber('recovery.resetLinkMinutes');
  },
  get resetLinkMs(): number {
    return configNumber('recovery.resetLinkMinutes') * MINUTE;
  },
  get resetHistoryDepth(): number {
    return configNumber('recovery.resetHistoryDepth');
  },
  get codeGroups(): number {
    return configNumber('recovery.codeGroups');
  },
  get codeGroupLength(): number {
    return configNumber('recovery.codeGroupLength');
  },
  get codeLength(): number {
    return (
      configNumber('recovery.codeGroups') *
      configNumber('recovery.codeGroupLength')
    );
  },
  get minPasswordLength(): number {
    return configNumber('recovery.minPasswordLength');
  },
};

export const ContentPolicy = {
  get adminPageSize(): number {
    return configNumber('content.adminPageSize');
  },
  get sidebarTagLimit(): number {
    return configNumber('content.sidebarTagLimit');
  },
};

function imageCacheSeconds(): number {
  return Math.round((configNumber('media.imageCacheDays') * DAY) / 1000);
}

export const ImagePolicy = {
  get cacheDays(): number {
    return configNumber('media.imageCacheDays');
  },

  get cacheSeconds(): number {
    return imageCacheSeconds();
  },

  get cacheControl(): string {
    return `public, max-age=${imageCacheSeconds()}, immutable`;
  },
};

export const SupportPolicy = {
  get channelUrl(): string {
    return configText('support.channelUrl');
  },
  get channelLabel(): string {
    return configText('support.channelLabel');
  },
  get requestQueueLimit(): number {
    return configNumber('support.requestQueueLimit');
  },
};
