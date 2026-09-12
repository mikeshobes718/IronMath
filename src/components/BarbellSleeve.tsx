import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import {
  eachSideCopy,
  plateById,
  plateColor,
  plateLabelMinWidth,
  plateLabelText,
  plateSize,
  type PlateStackItem,
  type PlateTheme,
} from '../engine';
import { tick } from '../haptics/feedback';
import { useThemeColors } from '../theme/ThemeRoot';

type Disk = { plateId: string; index: number; weight: number };

type Props = {
  plates: PlateStackItem[];
  plateTheme: PlateTheme;
  onPlatePress?: (index: number, plateId: string) => void;
  emptyLabel?: string;
  compact?: boolean;
};

export function BarbellSleeve({
  plates,
  plateTheme,
  onPlatePress,
  emptyLabel = 'Empty bar',
  compact = false,
}: Props) {
  const theme = useThemeColors();
  const [trackWidth, setTrackWidth] = useState(0);
  const disks: Disk[] = [];
  plates.forEach((item) => {
    for (let i = 0; i < item.count; i += 1) {
      disks.push({ plateId: item.plateId, index: disks.length, weight: item.weight });
    }
  });

  const rawSleeve = disks.reduce((sum, disk) => {
    const spec = plateById(disk.plateId);
    if (!spec) {
      return sum;
    }
    const size = plateSize(spec);
    return sum + Math.max(size.width, plateLabelMinWidth(disk.weight)) + GAP;
  }, 0);
  const usable = trackWidth > 0 ? Math.max(48, (trackWidth - SHAFT) / 2 - COLLAR - TIP - 8) : 160;
  const scale = rawSleeve > 0 ? Math.min(1, usable / rawSleeve) : 1;

  const onTrack = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      style={[
        styles.stage,
        compact && styles.stageCompact,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
      onLayout={onTrack}
    >
      <View style={styles.bar}>
        <SleeveSide
          disks={disks}
          plateTheme={plateTheme}
          scale={scale}
          side="left"
          onPlatePress={onPlatePress}
        />
        <View style={styles.shaft}>
          <View style={styles.knurl} />
        </View>
        <SleeveSide
          disks={disks}
          plateTheme={plateTheme}
          scale={scale}
          side="right"
          onPlatePress={onPlatePress}
        />
      </View>
      {disks.length === 0 ? (
        <Text style={[styles.empty, { color: theme.dim }]}>{emptyLabel}</Text>
      ) : (
        <Text style={[styles.caption, { color: theme.text }]}>{eachSideCopy(plates)}</Text>
      )}
    </View>
  );
}

function SleeveSide({
  disks,
  plateTheme,
  scale,
  side,
  onPlatePress,
}: {
  disks: Disk[];
  plateTheme: PlateTheme;
  scale: number;
  side: 'left' | 'right';
  onPlatePress?: (index: number, plateId: string) => void;
}) {
  return (
    <View style={[styles.sleeve, side === 'left' ? styles.sleeveLeft : styles.sleeveRight]}>
      <View style={styles.collar} />
      {disks.map((disk) => {
        const spec = plateById(disk.plateId);
        if (!spec) {
          return null;
        }
        const color = plateColor(spec, plateTheme);
        const size = plateSize(spec);
        const text = plateLabelText(disk.weight);
        const minW = plateLabelMinWidth(disk.weight);
        const width = Math.max(8, Math.round(Math.max(size.width, minW) * scale));
        const height = Math.max(28, Math.round(size.height * (0.82 + 0.18 * scale)));
        const fontSize = badgeFontSize(text, width);
        return (
          <Animated.View
            key={`${side}-${disk.plateId}-${disk.index}`}
            entering={FadeIn.duration(140)}
            exiting={FadeOut.duration(100)}
            layout={LinearTransition.duration(160)}
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
                  height,
                  width,
                  backgroundColor: color.fill,
                  borderColor: color.stroke,
                },
              ]}
            >
              <View
                style={[
                  styles.lip,
                  side === 'left' ? styles.lipRight : styles.lipLeft,
                  { backgroundColor: color.stroke },
                ]}
              />
              <Text
                style={[styles.badge, { color: color.text, fontSize }]}
                allowFontScaling={false}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.55}
              >
                {text}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
      <View style={styles.tip} />
    </View>
  );
}

function badgeFontSize(text: string, width: number): number {
  const charW = text.includes('.') ? 0.62 : 0.58;
  const fit = Math.floor((width - 4) / Math.max(1, text.length * charW));
  const cap = text.length >= 4 ? 10 : text.includes('.') || text.length === 3 ? 11 : text.length === 2 ? 13 : 14;
  return Math.max(8, Math.min(cap, fit));
}

const SHAFT = 72;
const COLLAR = 7;
const TIP = 8;
const GAP = 3;

const styles = StyleSheet.create({
  stage: {
    minHeight: 116,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  stageCompact: {
    minHeight: 78,
    paddingVertical: 6,
    borderRadius: 14,
  },
  bar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sleeve: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sleeveLeft: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  sleeveRight: {
    justifyContent: 'flex-start',
  },
  collar: {
    width: COLLAR,
    height: 26,
    borderRadius: 2,
    backgroundColor: '#A1A1AA',
  },
  shaft: {
    width: SHAFT,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#8A8A93',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  knurl: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 2,
    bottom: 2,
    backgroundColor: '#52525B',
    borderRadius: 2,
  },
  tip: {
    width: TIP,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#71717A',
  },
  plate: {
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
    overflow: 'visible',
  },
  lip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    opacity: 0.4,
  },
  lipLeft: {
    left: 0,
  },
  lipRight: {
    right: 0,
  },
  badge: {
    fontWeight: '800',
  },
  empty: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  caption: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
});
