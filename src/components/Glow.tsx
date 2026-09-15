import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { useResolvedScheme } from '../theme/ThemeRoot';

type Props = {
  color: string;
  size?: number;
  top?: number;
  opacity?: number;
  align?: 'center' | 'left' | 'right';
};

/**
 * A soft radial-feeling glow behind a hero element — the accent-color haze
 * you see behind big numbers in Oura, WHOOP, and Apple Fitness. Built from a
 * linear gradient inside a large blurred-looking circle rather than a true
 * radial gradient (RN has no native radial-gradient primitive worth the extra
 * dependency here).
 *
 * "Glow" only reads as light on a dark backdrop — the same warm haze over a
 * light theme looks like a stain, not illumination, so this renders nothing
 * in light mode rather than trying to tune its way around that.
 */
export function Glow({ color, size = 260, top = -60, opacity = 0.35, align = 'center' }: Props) {
  const scheme = useResolvedScheme();
  const offset = align === 'center' ? -size / 2 : 0;
  if (scheme !== 'dark') {
    return null;
  }
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        { alignItems: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end', overflow: 'hidden' },
      ]}
    >
      <LinearGradient
        colors={[`${color}00`, color, `${color}00`]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: 'absolute',
          top,
          left: align === 'center' ? '50%' : offset,
          marginLeft: align === 'center' ? -size / 2 : 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
        }}
      />
    </View>
  );
}
