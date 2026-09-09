import type { ReactNode } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemedStyles } from '../theme/useThemedStyles';

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
}: Props) {
  const styles = useThemedStyles((theme) => ({
    safe: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 6,
      paddingBottom: 12,
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
      color: theme.text,
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -0.8,
    },
    subtitle: {
      color: theme.muted,
      fontSize: 14,
      marginTop: 3,
    },
    hint: {
      color: theme.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 28,
      gap: 14,
    },
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
      contentContainerStyle={styles.content}
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
