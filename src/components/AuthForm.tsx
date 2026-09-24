import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
  type TextInputProps,
} from 'react-native';
import { applyCodeDigits, passwordChecks } from '../sync/authCopy';
import { CODE_RESEND_COOLDOWN_SEC } from '../sync/config';
import { radius } from '../theme';
import { useThemeColors } from '../theme/ThemeRoot';
import { useThemedStyles } from '../theme/useThemedStyles';

export function AuthField({
  label,
  error,
  right,
  ...props
}: TextInputProps & { label: string; error?: string | null; right?: React.ReactNode }) {
  const styles = useAuthStyles();
  const theme = useThemeColors();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, props.editable === false && styles.inputDisabled]}>
        <TextInput
          {...props}
          placeholderTextColor={theme.dim}
          style={[styles.input, props.style, right ? styles.inputWithRight : null]}
          autoCorrect={false}
          autoCapitalize={props.autoCapitalize ?? 'none'}
        />
        {right}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function PasswordField({
  label,
  value,
  onChangeText,
  onSubmitEditing,
  returnKeyType,
  error,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: () => void;
  returnKeyType?: TextInputProps['returnKeyType'];
  error?: string | null;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const theme = useThemeColors();
  const styles = useAuthStyles();
  return (
    <AuthField
      label={label}
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
      returnKeyType={returnKeyType}
      error={error}
      autoFocus={autoFocus}
      secureTextEntry={!visible}
      textContentType="password"
      autoComplete="password"
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={10}
          onPress={() => setVisible((v) => !v)}
          style={styles.eye}
        >
          <FontAwesome name={visible ? 'eye-slash' : 'eye'} size={16} color={theme.muted} />
        </Pressable>
      }
    />
  );
}

export function PasswordStrength({ password }: { password: string }) {
  const styles = useAuthStyles();
  const theme = useThemeColors();
  if (!password) {
    return null;
  }
  const checks = passwordChecks(password);
  const fill = (checks.score / 4) * 100;
  const color = checks.score <= 1 ? theme.danger : checks.score === 2 ? theme.accent : theme.success;
  return (
    <View style={styles.strength}>
      <View style={styles.strengthTrack}>
        <View style={[styles.strengthFill, { width: `${fill}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.strengthLabel, { color }]}>{checks.label} password</Text>
      <View style={styles.reqBox}>
        <Text style={styles.reqTitle}>Password must have at least:</Text>
        <Req ok={checks.length} text="8 to 200 characters" />
        <Req ok={checks.upper} text="1 uppercase letter" />
        <Req ok={checks.lower} text="1 lowercase letter" />
        <Req ok={checks.number} text="1 number" />
      </View>
    </View>
  );
}

function Req({ ok, text }: { ok: boolean; text: string }) {
  const styles = useAuthStyles();
  const theme = useThemeColors();
  return (
    <Text style={[styles.reqLine, { color: ok ? theme.success : theme.muted }]}>
      {ok ? '✓' : '•'} {text}
    </Text>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const styles = useAuthStyles();
  const blocked = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: Boolean(busy) }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [styles.primary, blocked && styles.primaryOff, pressed && !blocked && styles.pressed]}
    >
      <Text style={styles.primaryText}>{busy ? 'Working...' : label}</Text>
    </Pressable>
  );
}

export function LinkButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const styles = useAuthStyles();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.linkWrap, (pressed || disabled) && styles.pressed]}
    >
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

export function CodeBoxes({
  value,
  onChange,
  onComplete,
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
}) {
  const styles = useAuthStyles();
  const theme = useThemeColors();
  const digits = value.replace(/\D/g, '').slice(0, 6).split('');
  while (digits.length < 6) {
    digits.push('');
  }
  const refs = useRef<Array<TextInput | null>>([null, null, null, null, null, null]);

  const setAt = (index: number, text: string) => {
    const result = applyCodeDigits(value, index, text);
    onChange(result.code);
    if (result.complete) {
      onComplete?.(result.code.slice(0, 6));
      refs.current[5]?.blur();
      return;
    }
    if (result.focusIndex !== null) {
      refs.current[result.focusIndex]?.focus();
    }
  };

  const onKey = (index: number, event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (event.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.codeRow}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={digit}
          editable={!disabled}
          onChangeText={(text) => setAt(index, text)}
          onKeyPress={(event) => onKey(index, event)}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={index === 0 ? 6 : 1}
          selectTextOnFocus
          style={[styles.codeBox, digit ? styles.codeBoxFilled : null]}
          placeholderTextColor={theme.dim}
          accessibilityLabel={`Digit ${index + 1} of 6`}
        />
      ))}
    </View>
  );
}

export function useResendCooldown(seconds = CODE_RESEND_COOLDOWN_SEC) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (remaining <= 0) {
      return;
    }
    const id = setTimeout(() => setRemaining((n) => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(id);
  }, [remaining]);
  return {
    remaining,
    cooling: remaining > 0,
    start: (override = seconds) => setRemaining(override),
  };
}

export function ResendRow({
  remaining,
  onResend,
  busy,
}: {
  remaining: number;
  onResend: () => void;
  busy?: boolean;
}) {
  const styles = useAuthStyles();
  if (remaining > 0) {
    return (
      <Text style={styles.cooldown}>
        Resend code in {remaining} {remaining === 1 ? 'second' : 'seconds'}
      </Text>
    );
  }
  return <LinkButton label={busy ? 'Sending...' : 'Resend code'} onPress={onResend} disabled={busy} />;
}

export function AuthMessage({ text, tone = 'error' }: { text: string | null; tone?: 'error' | 'ok' }) {
  const styles = useAuthStyles();
  if (!text) {
    return null;
  }
  return <Text style={tone === 'ok' ? styles.ok : styles.error}>{text}</Text>;
}

function useAuthStyles() {
  return useThemedStyles((theme) => ({
    field: { gap: 6 },
    label: { color: theme.muted, fontSize: 13, fontWeight: '700' as const },
    inputWrap: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      backgroundColor: theme.surface,
      borderRadius: radius.md,
      minHeight: 52,
      paddingHorizontal: 14,
    },
    inputDisabled: { opacity: 0.55 },
    input: {
      flex: 1,
      color: theme.text,
      fontSize: 16,
      fontWeight: '600' as const,
      paddingVertical: 12,
    },
    inputWithRight: { paddingRight: 8 },
    eye: { padding: 6 },
    fieldError: { color: theme.danger, fontSize: 13, fontWeight: '600' as const },
    strength: { gap: 8 },
    strengthTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: theme.card,
      overflow: 'hidden' as const,
    },
    strengthFill: { height: 6, borderRadius: 999 },
    strengthLabel: { fontSize: 13, fontWeight: '700' as const },
    reqBox: {
      backgroundColor: theme.accentSoft,
      borderRadius: radius.md,
      padding: 12,
      gap: 4,
    },
    reqTitle: { color: theme.muted, fontSize: 13, fontWeight: '700' as const, marginBottom: 2 },
    reqLine: { fontSize: 13, fontWeight: '600' as const },
    primary: {
      minHeight: 52,
      borderRadius: radius.md,
      backgroundColor: theme.accent,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    primaryOff: { opacity: 0.45 },
    primaryText: { color: theme.accentText, fontSize: 17, fontWeight: '800' as const },
    pressed: { opacity: 0.7 },
    linkWrap: { alignSelf: 'center' as const, paddingVertical: 8 },
    link: {
      color: theme.muted,
      fontSize: 14,
      fontWeight: '600' as const,
      textDecorationLine: 'underline' as const,
    },
    codeRow: { flexDirection: 'row' as const, gap: 8, justifyContent: 'center' as const },
    codeBox: {
      flex: 1,
      maxWidth: 52,
      height: 56,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      backgroundColor: theme.surface,
      color: theme.text,
      fontSize: 24,
      fontWeight: '800' as const,
      textAlign: 'center' as const,
    },
    codeBoxFilled: { borderColor: theme.accent },
    cooldown: {
      color: theme.muted,
      fontSize: 14,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    },
    error: { color: theme.danger, fontSize: 14, fontWeight: '600' as const },
    ok: { color: theme.success, fontSize: 14, fontWeight: '600' as const },
  }));
}
