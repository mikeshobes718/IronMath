import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height of the floating tab bar capsule itself. */
export const FLOATING_TAB_BAR_HEIGHT = 58;

/** Gap between the bottom of the capsule and the bottom of the screen. */
export function floatingTabBarGap(safeBottom: number): number {
  return safeBottom > 0 ? safeBottom - 10 : 14;
}

/**
 * Total screen space the floating tab bar occupies, capsule plus the gap
 * beneath it.
 *
 * Derived here rather than read from BottomTabBarHeightContext because that
 * context reports only the capsule's own height — it knows nothing about the
 * gap we push it up by, so anything positioned against it lands *inside* the
 * bar.
 */
export function floatingTabBarSpace(safeBottom: number): number {
  return FLOATING_TAB_BAR_HEIGHT + floatingTabBarGap(safeBottom);
}

/**
 * Space to keep clear at the bottom of a screen for the floating tab bar.
 *
 * The bar is absolutely positioned so it reserves no layout space — content
 * would otherwise scroll underneath it and the last row would sit behind the
 * glass. The context is used only to tell whether a tab bar exists at all, so
 * this returns 0 on pushed screens instead of throwing the way
 * useBottomTabBarHeight() would.
 */
export function useTabBarInset(extra = 16): number {
  const height = useContext(BottomTabBarHeightContext) ?? 0;
  const insets = useSafeAreaInsets();
  return height > 0 ? floatingTabBarSpace(insets.bottom) + extra : 0;
}
