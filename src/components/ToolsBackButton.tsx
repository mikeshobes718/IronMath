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
      // iOS 26 wraps any custom header-bar view in its own Liquid Glass
      // capsule, sized to whatever box we hand it — react-native-screens has
      // no prop to opt out of or resize that (confirmed: no
      // headerLeftContainerStyle or glass-related API in this version). A
      // touch-friendly padded box here becomes an oversized capsule there, so
      // the content box stays tight to the label and hitSlop alone covers the
      // touch target.
      hitSlop={20}
      onPress={() => {
        router.navigate('/(tabs)/tools');
      }}
      style={styles.row}
    >
      <FontAwesome name="chevron-left" size={14} color={theme.accent} />
      <Text style={[styles.label, { color: theme.accent }]}>Tools</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
  },
});
