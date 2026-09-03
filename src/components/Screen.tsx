import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
};

export function Screen({ title, subtitle, right, children, footer, scroll = true }: Props) {
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={styles.fill}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {body}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: theme.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: theme.muted,
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  fill: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
