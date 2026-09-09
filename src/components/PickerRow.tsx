import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { tick } from '../haptics/feedback';
import { useResolvedScheme, useThemeColors } from '../theme/ThemeRoot';
import { useThemedStyles } from '../theme/useThemedStyles';

export type PickerOption<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  label: string;
  value: string;
  options: Array<PickerOption<T>>;
  onSelect: (id: T) => void;
  last?: boolean;
};

export function pickFromSheet<T extends string>(
  title: string,
  options: Array<PickerOption<T>>,
  onSelect: (id: T) => void,
  scheme: 'light' | 'dark' = 'dark'
) {
  const labels = options.map((item) => item.label);
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...labels, 'Cancel'],
        cancelButtonIndex: labels.length,
        userInterfaceStyle: scheme,
      },
      (index) => {
        if (index === undefined || index >= labels.length) {
          return;
        }
        void tick('light');
        onSelect(options[index].id);
      }
    );
    return;
  }
  Alert.alert(title, undefined, [
    ...options.map((item) => ({
      text: item.label,
      onPress: () => {
        void tick('light');
        onSelect(item.id);
      },
    })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}

export function PickerRow<T extends string>({ label, value, options, onSelect, last }: Props<T>) {
  const theme = useThemeColors();
  const scheme = useResolvedScheme();
  const styles = useThemedStyles((colors) => ({
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      minHeight: 52,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    label: {
      color: colors.muted,
      fontSize: 15,
      fontWeight: '700' as const,
    },
    valueWrap: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'flex-end' as const,
      gap: 8,
    },
    value: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700' as const,
      flexShrink: 1,
      textAlign: 'right' as const,
    },
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}. Opens a list.`}
      onPress={() => {
        void tick('light');
        pickFromSheet(label, options, onSelect, scheme);
      }}
      style={[styles.row, last && styles.rowLast]}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueWrap}>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
        <FontAwesome name="chevron-right" size={11} color={theme.dim} />
      </View>
    </Pressable>
  );
}
