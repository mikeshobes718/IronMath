export const BERTH_APP_URL = 'https://api.atberth.com/v1/apps/ironmath';

/** Publishable key: Berth's docs say to ship it in phone builds. It can only sign users in; every table is owner only. */
export const BERTH_PUBLISHABLE_KEY = 'bpk_7e_sRBhN39Fvmb0BINNPcYsN76TQQcvIROfkATlZKXc';

/** Berth emails one code per minute per address. Client cooldown matches that. */
export const CODE_RESEND_COOLDOWN_SEC = 60;

/** Berth codes are valid for 10 minutes. */
export const CODE_TTL_SEC = 10 * 60;

export const PASSWORD_MIN_LENGTH = 8;

/** Berth rejects passwords longer than 200 characters. */
export const PASSWORD_MAX_LENGTH = 200;
