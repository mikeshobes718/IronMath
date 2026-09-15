import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { useThemeColors } from '../../src/theme/ThemeRoot';

/**
 * The system tab bar, not a drawing of one.
 *
 * On iOS 26 UIKit renders this as the floating Liquid Glass pill — the same
 * shape, material, shadow, and scroll-edge behaviour as the system apps — and
 * derives its look from the content behind it, so there is nothing to style
 * beyond the tint. A React-drawn bar could be measured into the right
 * geometry but never the right material, and it showed.
 *
 * Five tabs, not six: UITabBar on iPhone folds anything past five into a
 * "More" tab. Settings lives in Tools now.
 *
 * Content insets are UIKit's job too. Each tab's view controller reports the
 * bar in its bottom safe area, which Screen picks up through a nested
 * SafeAreaProvider, and scroll views inset themselves with
 * contentInsetAdjustmentBehavior="automatic".
 */
export default function TabLayout() {
  const theme = useThemeColors();
  return (
    <NativeTabs tintColor={theme.accent}>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'dumbbell', selected: 'dumbbell.fill' }} />
        <Label>Load</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reverse">
        <Icon sf="arrow.left.arrow.right" />
        <Label>Reverse</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="warmup">
        <Icon sf={{ default: 'flame', selected: 'flame.fill' }} />
        <Label>Warmup</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="log">
        <Icon sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }} />
        <Label>Log</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tools">
        <Icon sf={{ default: 'wrench.and.screwdriver', selected: 'wrench.and.screwdriver.fill' }} />
        <Label>Tools</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
