import { InputAccessoryView, Keyboard, Platform, Pressable, Text, View } from 'react-native';
import { useThemedStyles } from '../theme/useThemedStyles';

export const NUMPAD_ACCESSORY_ID = 'ironmath-numpad-done';

export const numpadAccessoryProps =
  Platform.OS === 'ios' ? { inputAccessoryViewID: NUMPAD_ACCESSORY_ID } : {};

export function NumpadDoneBar() {
  const styles = useThemedStyles((theme) => ({
    bar: {
      flexDirection: 'row' as const,
      justifyContent: 'flex-end' as const,
      alignItems: 'center' as const,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    done: {
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    doneText: {
      color: theme.accent,
      fontSize: 17,
      fontWeight: '700' as const,
    },
  }));
  if (Platform.OS !== 'ios') {
    return null;
  }
  return (
    <InputAccessoryView nativeID={NUMPAD_ACCESSORY_ID}>
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={() => Keyboard.dismiss()}
          hitSlop={8}
          style={styles.done}
        >
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}
