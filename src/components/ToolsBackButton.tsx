import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useThemeColors } from '../theme/ThemeRoot';

export function ToolsBackButton() {
  const router = useRouter();
  const theme = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to Tools"
      hitSlop={16}
      onPress={() => {
        router.navigate('/(tabs)/tools');
      }}
      style={styles.row}
    >
      <FontAwesome name="chevron-left" size={15} color={theme.accent} />
      <Text style={[styles.label, { color: theme.accent }]}>Tools</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 10,
    minHeight: 44,
    gap: 4,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
  },
});
