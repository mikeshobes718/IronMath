import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { plateById, plateColor, plateSize, type PlateTheme } from '../engine';
import { tick } from '../haptics/feedback';
import { theme } from '../theme';
import type { PlateStackItem } from '../engine';

type Props = {
  plates: PlateStackItem[];
  plateTheme: PlateTheme;
  onPlatePress?: (index: number, plateId: string) => void;
  emptyLabel?: string;
};

export function BarbellSleeve({ plates, plateTheme, onPlatePress, emptyLabel = 'Empty sleeve' }: Props) {
  const disks: Array<{ plateId: string; index: number; weight: number }> = [];
  plates.forEach((item) => {
    for (let i = 0; i < item.count; i += 1) {
      disks.push({ plateId: item.plateId, index: disks.length, weight: item.weight });
    }
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.barEnd} />
      <View style={styles.collar} />
      <View style={styles.sleeve}>
        {disks.length === 0 ? (
          <Text style={styles.empty}>{emptyLabel}</Text>
        ) : (
          disks.map((disk) => {
            const spec = plateById(disk.plateId);
            if (!spec) {
              return null;
            }
            const color = plateColor(spec, plateTheme);
            const size = plateSize(spec);
            return (
              <Animated.View
                key={`${disk.plateId}-${disk.index}`}
                entering={FadeIn.duration(160)}
                exiting={FadeOut.duration(120)}
                layout={LinearTransition.duration(180)}
              >
                <Pressable
                  onPress={() => {
                    if (onPlatePress) {
                      void tick('medium');
                      onPlatePress(disk.index, disk.plateId);
                    }
                  }}
                  style={[
                    styles.plate,
                    {
                      height: size.height,
                      width: size.width,
                      backgroundColor: color.fill,
                      borderColor: color.stroke,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badge,
                      { color: color.text, fontSize: spec.kind === 'micro' ? 8 : 10 },
                    ]}
                    numberOfLines={1}
                  >
                    {label(disk.weight)}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })
        )}
      </View>
      <View style={styles.tip} />
    </View>
  );
}

function label(weight: number): string {
  return String(Number(weight.toFixed(2)));
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 92,
    paddingHorizontal: 8,
  },
  barEnd: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#52525B',
  },
  collar: {
    width: 10,
    height: 34,
    borderRadius: 3,
    backgroundColor: '#71717A',
    marginRight: 2,
  },
  sleeve: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 18,
    backgroundColor: '#3F3F46',
    borderRadius: 2,
    paddingVertical: 4,
    paddingLeft: 2,
    gap: 2,
  },
  tip: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#52525B',
    marginLeft: 2,
  },
  plate: {
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    fontWeight: '800',
  },
  empty: {
    color: theme.dim,
    fontSize: 13,
    paddingLeft: 10,
  },
});
