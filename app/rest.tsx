import { Text } from 'react-native';
import { RestDurationKeypad, RestTimerCard } from '../src/components/RestTimerCard';
import { Screen } from '../src/components/Screen';
import { useKeypad } from '../src/components/useKeypad';
import { useThemedStyles } from '../src/theme/useThemedStyles';

export default function RestScreen() {
  const keypad = useKeypad();
  const styles = useThemedStyles((colors) => ({
    note: { color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  }));

  return (
    <Screen
      title="Rest"
      subtitle="Timer between sets"
      hint="Pick a preset or Custom, then Start. Custom is minutes and seconds. The countdown keeps going on your lock screen, the Dynamic Island, and your glasses."
      onDismiss={keypad.hide}
      footer={<RestDurationKeypad keypad={keypad} />}
    >
      <RestTimerCard keypad={keypad} />
      <Text style={styles.note}>
        Tap the island or the lock screen card to come back here. Pause ends the lock screen timer. Start again to resume.
      </Text>
    </Screen>
  );
}
