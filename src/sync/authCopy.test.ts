import { describe, expect, it } from 'vitest';
import {
  accountEntryMode,
  RESET_SENT_COPY,
  applyCodeDigits,
  codeExpiryCopy,
  codeRemainingSec,
  passwordChecks,
  passwordIsAcceptable,
  passwordsMatch,
} from './authCopy';
import { BerthError, friendlyAuthError } from './berthClient';

describe('code expiry copy', () => {
  it('counts down and never says 0 seconds', () => {
    const issued = 1_000_000;
    expect(codeRemainingSec(issued, issued + 9_000, 600)).toBe(591);
    expect(codeExpiryCopy(591)).toBe('Code expires in 9:51');
    expect(codeRemainingSec(issued, issued + 600_000, 600)).toBe(0);
    expect(codeExpiryCopy(0)).toBe('That code expired. Request a new one.');
    expect(codeExpiryCopy(0)).not.toMatch(/0 seconds/);
  });
});

describe('password rules', () => {
  it('requires length, upper, lower, and a number', () => {
    expect(passwordIsAcceptable('short')).toBe(false);
    expect(passwordIsAcceptable('alllowercase1')).toBe(false);
    expect(passwordChecks('IronMath1').score).toBeGreaterThanOrEqual(3);
    expect(passwordIsAcceptable('IronMath1')).toBe(true);
    expect(passwordIsAcceptable('x'.repeat(201) + 'A1')).toBe(false);
  });

  it('checks confirmation match', () => {
    expect(passwordsMatch('IronMath1', 'IronMath1')).toBe(true);
    expect(passwordsMatch('IronMath1', 'IronMath2')).toBe(false);
    expect(passwordsMatch('', '')).toBe(false);
  });
});

describe('code boxes', () => {
  it('pastes a full code and advances one digit at a time', () => {
    const pasted = applyCodeDigits('', 0, '123456');
    expect(pasted).toEqual({ code: '123456', focusIndex: null, complete: true });

    const one = applyCodeDigits('', 0, '9');
    expect(one.code).toBe('9');
    expect(one.focusIndex).toBe(1);
    expect(one.complete).toBe(false);

    const next = applyCodeDigits('9', 1, '8');
    expect(next.code).toBe('98');
    expect(next.focusIndex).toBe(2);
  });
});

describe('account entry', () => {
  it('does not open sign-in when already signed in', () => {
    expect(accountEntryMode(true, 'signup')).toBe('signed-in');
    expect(accountEntryMode(true, null)).toBe('signed-in');
    expect(accountEntryMode(false, 'signup')).toBe('signup');
    expect(accountEntryMode(false, null)).toBe('menu');
    expect(RESET_SENT_COPY.toLowerCase()).not.toMatch(/does not exist|no account|unknown email/);
    expect(RESET_SENT_COPY).toContain('If that email has an account');
  });
});

describe('auth errors', () => {
  it('maps duplicate email and prefers code copy over password copy', () => {
    expect(friendlyAuthError(new BerthError('taken', 409, 'conflict'))).toContain('already has an account');
    expect(
      friendlyAuthError(new BerthError('That code is wrong or expired. Ask for a new one.', 401, 'unauthorized'))
    ).toContain('code');
    expect(friendlyAuthError(new BerthError('bad pass', 401, 'unauthorized'))).toContain('password');
  });
});
