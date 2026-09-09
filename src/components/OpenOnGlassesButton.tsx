import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { tick } from '../haptics/feedback';
import { useThemedStyles } from '../theme/useThemedStyles';
import type { GlassesView } from '../wearables/glassesQuery';
import { openIronMathOnGlasses } from '../wearables/openOnGlasses';

export function OpenOnGlassesButton({
  view,
  filled = false,
  onOpen,
}: {
  view: GlassesView;
  filled?: boolean;
  onOpen?: () => void;
}) {
  const [note, setNote] = useState('');
  const styles = useThemedStyles((theme) => ({
    action: {
      minHeight: 54,
      borderRadius: 14,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: theme.accent,
      marginTop: 16,
      marginBottom: 10,
      paddingHorizontal: 14,
    },
    ghost: {
      minHeight: 54,
      borderRadius: 14,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      marginTop: 16,
      marginBottom: 10,
      paddingHorizontal: 14,
    },
    actionLabel: { color: theme.accentText, fontSize: 17, fontWeight: '800' as const },
    ghostLabel: { color: theme.text, fontSize: 17, fontWeight: '800' as const },
    note: { color: theme.muted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  }));

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open on glasses"
        onPress={() => {
          void tick('medium');
          onOpen?.();
          setNote('Sending to glasses...');
          void openIronMathOnGlasses(view)
            .then((message) => setNote(message))
            .catch((error: unknown) => {
              setNote(error instanceof Error ? error.message : 'Could not open on glasses.');
            });
        }}
        style={filled ? styles.action : styles.ghost}
      >
        <Text style={filled ? styles.actionLabel : styles.ghostLabel}>Open on glasses</Text>
      </Pressable>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </>
  );
}
