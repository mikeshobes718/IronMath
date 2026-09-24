import { CODE_TTL_SEC, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './config';

export type PasswordChecks = {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
};

export function passwordChecks(password: string): PasswordChecks {
  const length = password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;
  const upper = /[A-Z]/.test(password);
  const lower = /[a-z]/.test(password);
  const number = /\d/.test(password);
  const special = /[^A-Za-z0-9]/.test(password);
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (upper && lower) score += 1;
  if (number) score += 1;
  if (special || password.length >= 12) score += 1;
  const label = score <= 1 ? 'Weak' : score === 2 ? 'Okay' : score === 3 ? 'Strong' : 'Very strong';
  return { length, upper, lower, number, score: score as PasswordChecks['score'], label };
}

export function passwordIsAcceptable(password: string): boolean {
  const checks = passwordChecks(password);
  return checks.length && checks.upper && checks.lower && checks.number;
}

export function passwordsMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Seconds left on a code. Never negative. */
export function codeRemainingSec(issuedAt: number, now: number, ttlSec = CODE_TTL_SEC): number {
  return Math.max(0, ttlSec - Math.floor((now - issuedAt) / 1000));
}

/** Clock copy. A finished code says it expired, never "0 seconds". */
export function codeExpiryCopy(remaining: number): string {
  if (remaining <= 0) {
    return 'That code expired. Request a new one.';
  }
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `Code expires in ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Pure code-box update: paste of many digits fills the row; one digit advances.
 * focusIndex is where the caret should go next (0-5), or null when complete.
 */
export function applyCodeDigits(
  current: string,
  index: number,
  text: string
): { code: string; focusIndex: number | null; complete: boolean } {
  const digits = current.replace(/\D/g, '').slice(0, 6).split('');
  while (digits.length < 6) {
    digits.push('');
  }
  const cleaned = text.replace(/\D/g, '');
  if (cleaned.length > 1) {
    const next = cleaned.slice(0, 6);
    const complete = next.length >= 6;
    return {
      code: next,
      focusIndex: complete ? null : Math.min(next.length, 5),
      complete,
    };
  }
  digits[index] = cleaned.slice(-1);
  const joined = digits.join('').replace(/\D/g, '').slice(0, 6);
  const complete = joined.length === 6;
  let focusIndex: number | null = null;
  if (!complete && cleaned && index < 5) {
    focusIndex = index + 1;
  } else if (!complete) {
    focusIndex = Math.min(joined.length, 5);
  }
  return { code: joined, focusIndex, complete };
}

/** Same sentence for a real inbox and a missing one. */
export const RESET_SENT_COPY = 'If that email has an account, a code is on the way.';

/** Signed-in users land on the account screen, not sign-in or signup. */
export function accountEntryMode(
  signedIn: boolean,
  param?: string | null
): 'signed-in' | 'signup' | 'menu' {
  if (signedIn) {
    return 'signed-in';
  }
  if (param === 'signup') {
    return 'signup';
  }
  return 'menu';
}
