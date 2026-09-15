import type { ReactNode } from 'react';
import { Keyboard, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/ThemeRoot';
import { useThemedStyles } from '../theme/useThemedStyles';
import { Glow } from './Glow';
import { useTabBarInset } from './useTabBarInset';

type Props = {
  title?: string;
  subtitle?: string;
  hint?: string;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  embedded?: boolean;
  onDismiss?: () => void;
  /** Show a soft accent glow behind the header — for the tab root screens. */
  glow?: boolean;
};

export function Screen({
  title,
  subtitle,
  hint,
  right,
  children,
  footer,
  scroll = true,
  embedded = false,
  onDismiss,
  glow = false,
}: Props) {
  const theme = useThemeColors();
  const bottomInset = useTabBarInset();
  const styles = useThemedStyles((t) => ({
    safe: {
      flex: 1,
      backgroundColor: t.bg,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 6,
      paddingBottom: 14,
      gap: 8,
    },
    headerEmbedded: {
      paddingTop: 8,
      paddingBottom: 8,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerText: {
      flex: 1,
    },
    title: {
      color: t.text,
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: -1,
    },
    subtitle: {
      color: t.muted,
      fontSize: 14,
      fontWeight: '600',
      marginTop: 3,
    },
    hint: {
      color: t.dim,
      fontSize: 13,
      lineHeight: 18,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 28,
      gap: 14,
    },
    contentInset: { paddingBottom: 28 + bottomInset },
    fill: {
      flex: 1,
      paddingHorizontal: 20,
    },
  }));
  const dismiss = () => {
    Keyboard.dismiss();
    onDismiss?.();
  };
  const showHeader = Boolean(title || subtitle || hint || right);
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, bottomInset > 0 && styles.contentInset]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollBeginDrag={dismiss}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.fill}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={embedded ? [] : ['top']}>
      {glow ? <Glow color={theme.accent} size={320} top={-140} opacity={0.22} /> : null}
      {showHeader ? (
        <Pressable onPress={dismiss} accessible={false}>
          <View style={[styles.header, embedded && styles.headerEmbedded]}>
            <View style={styles.headerTop}>
              <View style={styles.headerText}>
                {title ? <Text style={styles.title}>{title}</Text> : null}
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              {right}
            </View>
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          </View>
        </Pressable>
      ) : null}
      {body}
      {footer}
    </SafeAreaView>
  );
}
