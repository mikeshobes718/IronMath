import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Text, View } from 'react-native';
import {
  AuthField,
  AuthMessage,
  CodeBoxes,
  LinkButton,
  PasswordField,
  PasswordStrength,
  PrimaryButton,
  ResendRow,
  useResendCooldown,
} from '../src/components/AuthForm';
import { Screen } from '../src/components/Screen';
import { tick } from '../src/haptics/feedback';
import {
  changePassword,
  codeExpiryCopy,
  codeRemainingSec,
  normalizeEmail,
  passwordIsAcceptable,
  requestPasswordReset,
  requestSignInCode,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updateDisplayName,
  useAccount,
  verifySignInCode,
} from '../src/sync/account';
import { signInWithApple } from '../src/sync/appleAuth';
import { accountEntryMode } from '../src/sync/authCopy';
import { BerthError, friendlyAuthError } from '../src/sync/berthClient';
import { useThemedStyles } from '../src/theme/useThemedStyles';

type Mode = 'menu' | 'signin' | 'signup' | 'code' | 'reset' | 'new-password' | 'signed-in';

function leaveAccount() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/settings');
}

export default function AccountScreen() {
  const styles = useAccountStyles();
  const params = useLocalSearchParams<{ mode?: string }>();
  const signedIn = useAccount((state) => state.signedIn);
  const email = useAccount((state) => state.email);
  const displayName = useAccount((state) => state.displayName);

  const initial: Mode = accountEntryMode(signedIn, typeof params.mode === 'string' ? params.mode : null);
  const [mode, setMode] = useState<Mode>(initial);
  const [name, setName] = useState(displayName ?? '');
  const [mail, setMail] = useState(email ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [codePurpose, setCodePurpose] = useState<'signin' | 'reset'>('signin');
  const [codeIssuedAt, setCodeIssuedAt] = useState<number | null>(null);
  const [editingEmail, setEditingEmail] = useState(false);
  const [nextMail, setNextMail] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const cooldown = useResendCooldown();

  useEffect(() => {
    if (signedIn && mode !== 'signed-in') {
      setMode('signed-in');
    }
    if (!signedIn && mode === 'signed-in') {
      setMode('menu');
    }
  }, [signedIn, mode]);

  useEffect(() => {
    if (!codeIssuedAt) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [codeIssuedAt]);

  const codeLeft = codeIssuedAt ? codeRemainingSec(codeIssuedAt, now) : null;
  const codeExpired = codeLeft === 0;

  const run = async (work: () => Promise<void>) => {
    if (busy) {
      return;
    }
    Keyboard.dismiss();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await work();
      void tick('medium');
    } catch (err) {
      void tick('warn');
      if (err instanceof BerthError && err.retryAfterSec) {
        cooldown.start(err.retryAfterSec);
      }
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const go = (next: Mode) => {
    setError(null);
    setSuccess(null);
    setPassword('');
    setConfirm('');
    setCode('');
    setEditingEmail(false);
    setMode(next);
  };

  const issueCode = async (address: string) => {
    await requestSignInCode(address);
    setCodeIssuedAt(Date.now());
    cooldown.start();
    setSuccess('Code sent. Check your email (and spam).');
  };

  const create = async () => {
    if (password !== confirm) {
      throw new Error('Passwords do not match.');
    }
    if (!passwordIsAcceptable(password)) {
      throw new Error('Use a stronger password: at least 8 characters with upper, lower, and a number.');
    }
    const result = await signUpWithEmail(name, mail, password);
    if (result.verificationRequired) {
      setCodePurpose('signin');
      setCodeIssuedAt(Date.now());
      cooldown.start();
      setMode('code');
      setSuccess('Confirm your email. We sent a 6-digit code.');
      return;
    }
    leaveAccount();
  };

  const login = async () => {
    const result = await signInWithEmail(mail, password);
    if (result.verificationRequired) {
      setCodePurpose('signin');
      setCodeIssuedAt(Date.now());
      cooldown.start();
      setMode('code');
      setSuccess('Confirm your email. Enter the code we sent.');
      return;
    }
    leaveAccount();
  };

  if (mode === 'signed-in') {
    return (
      <Screen>
        <View style={styles.body}>
          <Text style={styles.title}>Account</Text>
          <Text style={styles.lede}>{email ?? 'Signed in'}</Text>
          <AuthField
            label="Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
            returnKeyType="done"
            onSubmitEditing={() =>
              void run(async () => {
                await updateDisplayName(name);
                setSuccess('Name saved.');
              })
            }
          />
          <PrimaryButton
            label="Save name"
            busy={busy}
            disabled={!name.trim() || name.trim() === (displayName ?? '')}
            onPress={() =>
              void run(async () => {
                await updateDisplayName(name);
                setSuccess('Name saved.');
              })
            }
          />
          <View style={styles.divider} />
          <Text style={styles.section}>Change password</Text>
          <PasswordField label="New password" value={password} onChangeText={setPassword} />
          <PasswordStrength password={password} />
          <PasswordField label="Confirm password" value={confirm} onChangeText={setConfirm} />
          <PrimaryButton
            label="Update password"
            busy={busy}
            disabled={!passwordIsAcceptable(password) || password !== confirm}
            onPress={() =>
              void run(async () => {
                if (password !== confirm) {
                  throw new Error('Passwords do not match.');
                }
                if (!passwordIsAcceptable(password)) {
                  throw new Error('Use a stronger password: at least 8 characters with upper, lower, and a number.');
                }
                await changePassword(password);
                setPassword('');
                setConfirm('');
                setSuccess('Password updated.');
              })
            }
          />
          <AuthMessage text={error} />
          <AuthMessage text={success} tone="ok" />
          <LinkButton
            label="Sign out"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                await signOut(false);
                go('menu');
              })
            }
          />
          <LinkButton
            label="Sign out everywhere"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                await signOut(true);
                go('menu');
              })
            }
          />
          <LinkButton label="Back to Settings" onPress={leaveAccount} />
        </View>
      </Screen>
    );
  }

  if (mode === 'signup') {
    return (
      <Screen>
        <View style={styles.body}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.lede}>
            Already have an account?{' '}
            <Text style={styles.inlineLink} onPress={() => go('signin')}>
              Sign in
            </Text>
          </Text>
          <AuthField
            label="Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
            returnKeyType="next"
          />
          <AuthField
            label="Email"
            value={mail}
            onChangeText={setMail}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="next"
          />
          <PasswordField label="Password" value={password} onChangeText={setPassword} returnKeyType="next" />
          <PasswordStrength password={password} />
          <PasswordField
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            returnKeyType="done"
            onSubmitEditing={() => void run(create)}
          />
          <PrimaryButton
            label="Create account"
            busy={busy}
            disabled={!normalizeEmail(mail) || !passwordIsAcceptable(password) || password !== confirm}
            onPress={() => void run(create)}
          />
          <AuthMessage text={error} />
          <Text style={styles.fine}>
            IronMath works without an account. Signing up backs up your log and settings to your email.
          </Text>
          <LinkButton label="Back" onPress={() => go('menu')} disabled={busy} />
        </View>
      </Screen>
    );
  }

  if (mode === 'signin') {
    return (
      <Screen>
        <View style={styles.body}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.lede}>Email and password, or a one-time code.</Text>
          <AuthField
            label="Email"
            value={mail}
            onChangeText={setMail}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="next"
            autoFocus
          />
          <PasswordField
            label="Password"
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={() => void run(login)}
          />
          <PrimaryButton
            label="Sign in"
            busy={busy}
            disabled={!normalizeEmail(mail) || password.length < 1}
            onPress={() => void run(login)}
          />
          <LinkButton
            label="Email me a sign-in code"
            disabled={busy || !normalizeEmail(mail)}
            onPress={() =>
              void run(async () => {
                await issueCode(mail);
                go('code');
              })
            }
          />
          <LinkButton label="Forgot password" disabled={busy} onPress={() => go('reset')} />
          <AuthMessage text={error} />
          <LinkButton label="Create an account" onPress={() => go('signup')} disabled={busy} />
          <LinkButton label="Back" onPress={() => go('menu')} disabled={busy} />
        </View>
      </Screen>
    );
  }

  if (mode === 'code') {
    return (
      <Screen>
        <View style={styles.body}>
          <Text style={styles.title}>Enter code</Text>
          <Text style={styles.lede}>
            We emailed a 6-digit code to {normalizeEmail(mail) || 'your inbox'}. Codes expire in 10 minutes.
          </Text>
          {codeLeft !== null ? <AuthMessage text={codeExpiryCopy(codeLeft)} tone={codeExpired ? 'error' : 'ok'} /> : null}
          <CodeBoxes
            value={code}
            disabled={busy}
            onChange={setCode}
            onComplete={(full) => {
              void run(async () => {
                if (codeExpired) {
                  throw new Error('That code expired. Request a new one.');
                }
                await verifySignInCode(mail, full);
                if (codePurpose === 'reset') {
                  setPassword('');
                  setConfirm('');
                  setMode('new-password');
                  setSuccess('Code accepted. Choose a new password.');
                  return;
                }
                leaveAccount();
              });
            }}
          />
          <PrimaryButton
            label="Verify code"
            busy={busy}
            disabled={code.length !== 6 || codeExpired}
            onPress={() =>
              void run(async () => {
                if (codeExpired) {
                  throw new Error('That code expired. Request a new one.');
                }
                await verifySignInCode(mail, code);
                if (codePurpose === 'reset') {
                  setPassword('');
                  setConfirm('');
                  setMode('new-password');
                  setSuccess('Code accepted. Choose a new password.');
                  return;
                }
                leaveAccount();
              })
            }
          />
          <ResendRow
            remaining={cooldown.remaining}
            busy={busy}
            onResend={() =>
              void run(async () => {
                await issueCode(mail);
              })
            }
          />
          {editingEmail ? (
            <>
              <AuthField
                label="Email"
                value={nextMail}
                onChangeText={setNextMail}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                autoCapitalize="none"
                returnKeyType="done"
              />
              <PrimaryButton
                label="Send code to this email"
                busy={busy}
                disabled={!normalizeEmail(nextMail)}
                onPress={() =>
                  void run(async () => {
                    const next = normalizeEmail(nextMail);
                    setMail(next);
                    setEditingEmail(false);
                    setCode('');
                    await issueCode(next);
                  })
                }
              />
              <LinkButton label="Cancel" disabled={busy} onPress={() => setEditingEmail(false)} />
            </>
          ) : (
            <LinkButton
              label="Use a different email"
              disabled={busy}
              onPress={() => {
                setNextMail(mail);
                setEditingEmail(true);
              }}
            />
          )}
          <AuthMessage text={error} />
          <AuthMessage text={success} tone="ok" />
          <LinkButton label="Back to sign in" onPress={() => go('signin')} disabled={busy} />
        </View>
      </Screen>
    );
  }

  if (mode === 'reset') {
    return (
      <Screen>
        <View style={styles.body}>
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.lede}>
            Enter your email. We send a reset code either way, so this screen will not say whether an account exists.
          </Text>
          <AuthField
            label="Email"
            value={mail}
            onChangeText={setMail}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            autoCapitalize="none"
            returnKeyType="done"
          />
          <PrimaryButton
            label="Send reset code"
            busy={busy}
            disabled={!normalizeEmail(mail)}
            onPress={() =>
              void run(async () => {
                const copy = await requestPasswordReset(mail);
                setCodePurpose('reset');
                setCode('');
                setCodeIssuedAt(Date.now());
                cooldown.start();
                setMode('code');
                setSuccess(copy);
              })
            }
          />
          <AuthMessage text={error} />
          <AuthMessage text={success} tone="ok" />
          <LinkButton label="Back to sign in" onPress={() => go('signin')} disabled={busy} />
        </View>
      </Screen>
    );
  }

  if (mode === 'new-password') {
    return (
      <Screen>
        <View style={styles.body}>
          <Text style={styles.title}>New password</Text>
          <Text style={styles.lede}>This replaces the password on your IronMath account.</Text>
          <PasswordField label="New password" value={password} onChangeText={setPassword} />
          <PasswordStrength password={password} />
          <PasswordField label="Confirm password" value={confirm} onChangeText={setConfirm} />
          <PrimaryButton
            label="Save password"
            busy={busy}
            disabled={!passwordIsAcceptable(password) || password !== confirm}
            onPress={() =>
              void run(async () => {
                if (password !== confirm) {
                  throw new Error('Passwords do not match.');
                }
                await changePassword(password);
                setPassword('');
                setConfirm('');
                leaveAccount();
              })
            }
          />
          <AuthMessage text={error} />
          <AuthMessage text={success} tone="ok" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.body}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.lede}>
          Back up your log, lifts, and gym setup. Sign in on a new phone and it all comes back.
        </Text>
        {Platform.OS === 'ios' ? (
          <PrimaryButton
            label="Sign in with Apple"
            busy={busy}
            onPress={() =>
              void run(async () => {
                await signInWithApple();
                leaveAccount();
              })
            }
          />
        ) : null}
        <PrimaryButton label="Sign in with email" onPress={() => go('signin')} />
        <PrimaryButton label="Create account" onPress={() => go('signup')} />
        <LinkButton
          label="Email me a sign-in code"
          onPress={() => {
            setCodePurpose('signin');
            go('signin');
          }}
        />
        <Text style={styles.fine}>
          Optional. IronMath works fully without an account, and your data always stays on this phone too. Delete your
          account any time in Settings.
        </Text>
      </View>
    </Screen>
  );
}

function useAccountStyles() {
  return useThemedStyles((theme) => ({
    body: {
      gap: 14,
      paddingTop: 8,
    },
    title: {
      color: theme.text,
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: -1,
    },
    lede: {
      color: theme.muted,
      fontSize: 15,
      lineHeight: 21,
      marginBottom: 4,
    },
    section: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '800',
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 8,
    },
    inlineLink: {
      color: theme.accent,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    fine: {
      color: theme.dim,
      fontSize: 12,
      lineHeight: 17,
      textAlign: 'center',
      marginTop: 8,
    },
  }));
}
