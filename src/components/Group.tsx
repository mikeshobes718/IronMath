import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { cardShadow, radius } from '../theme';
import { useThemeColors } from '../theme/ThemeRoot';
import { useThemedStyles } from '../theme/useThemedStyles';

export function GroupHeader({ children }: { children: ReactNode }) {
  const styles = useThemedStyles((theme) => ({
    header: {
      color: theme.dim,
      fontSize: 12,
      fontWeight: '800' as const,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
      marginTop: 10,
      marginLeft: 6,
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
      marginHorizontal: 6,
    },
  }));
  return <Text style={styles.footer}>{children}</Text>;
}

export function Group({ children }: { children: ReactNode }) {
  const theme = useThemeColors();
  const styles = useThemedStyles((t) => ({
    group: {
      backgroundColor: t.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: t.border,
      overflow: 'hidden' as const,
    },
  }));
  return <View style={[styles.group, cardShadow(theme.bg, 0.4)]}>{children}</View>;
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
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
  }));
  return <View style={[styles.row, last && styles.rowLast]}>{children}</View>;
}
