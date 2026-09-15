import { Text, View } from 'react-native';
import { useThemedStyles } from '../theme/useThemedStyles';

type Props = {
  values: number[];
  label?: string;
  accessibilityLabel?: string;
};

/**
 * A bar per session, tallest is the best day. Plain views, no chart library:
 * the shape is the whole message and it has to render on a cold start.
 */
export function Sparkline({ values, label, accessibilityLabel }: Props) {
  const styles = useThemedStyles((theme) => ({
    wrap: { gap: 6 },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      gap: 3,
      height: 44,
    },
    bar: {
      flexGrow: 1,
      flexBasis: 0,
      minWidth: 3,
      borderRadius: 2,
      backgroundColor: theme.border,
    },
    barLast: { backgroundColor: theme.accent },
    label: { color: theme.dim, fontSize: 12, fontWeight: '600' as const },
  }));

  if (values.length < 2) {
    return null;
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min;

  return (
    <View style={styles.wrap} accessible accessibilityLabel={accessibilityLabel ?? label}>
      <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {values.map((value, index) => {
          // A flat run should read as flat, not as noise: with no span at all
          // every bar sits at full height.
          const ratio = span <= 0 ? 1 : (value - min) / span;
          return (
            <View
              key={`${index}-${value}`}
              style={[styles.bar, { height: 8 + ratio * 36 }, index === values.length - 1 && styles.barLast]}
            />
          );
        })}
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}
