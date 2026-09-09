import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../theme/useThemedStyles';

export function GroupHeader({ children }: { children: ReactNode }) {
  const styles = useThemedStyles((theme) => ({
    header: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: '800' as const,
      letterSpacing: 0.7,
      textTransform: 'uppercase' as const,
      marginTop: 8,
      marginLeft: 4,
    },
  }));
  return <Text style={styles.header}>{children}</Text>;
}

export function GroupFooter({ children }: { children: ReactNode }) {
  const styles = useThemedStyles((theme) => ({
    footer: {
      color: theme.dim,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 8,
      marginBottom: 4,
      marginHorizontal: 4,
    },
  }));
  return <Text style={styles.footer}>{children}</Text>;
}

export function Group({ children }: { children: ReactNode }) {
  const styles = useThemedStyles((theme) => ({
    group: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden' as const,
    },
  }));
  return <View style={styles.group}>{children}</View>;
}

export function GroupRow({
  children,
  last,
}: {
  children: ReactNode;
  last?: boolean;
}) {
  const styles = useThemedStyles((theme) => ({
    row: {
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
  }));
  return <View style={[styles.row, last && styles.rowLast]}>{children}</View>;
}
