import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius } from '../theme';
import { useResolvedScheme, useThemeColors } from '../theme/ThemeRoot';
import { useThemedStyles } from '../theme/useThemedStyles';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

/** The glass card that slides up from the bottom. Shared by every sheet. */
export function BottomSheet({ visible, title, subtitle, onClose, children }: Props) {
  const theme = useThemeColors();
  const scheme = useResolvedScheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles((colors) => ({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end' as const,
    },
    sheet: {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderTopWidth: 1,
      borderColor: colors.borderStrong,
      overflow: 'hidden' as const,
      maxHeight: '88%' as const,
    },
    sheetInner: {
      paddingHorizontal: 20,
      paddingTop: 14,
      backgroundColor: scheme === 'dark' ? 'rgba(20,19,22,0.62)' : 'rgba(255,255,255,0.72)',
    },
    grabber: {
      alignSelf: 'center' as const,
      width: 36,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.borderStrong,
      marginBottom: 12,
    },
    head: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      justifyContent: 'space-between' as const,
      gap: 12,
      marginBottom: 14,
    },
    title: { color: colors.text, fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.4 },
    subtitle: { color: colors.accent, fontSize: 13, fontWeight: '700' as const, marginTop: 4 },
    close: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.card,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    body: { gap: 16 },
  }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} accessibilityLabel="Close" onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <BlurView
            intensity={80}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={styles.sheetInner}
          >
            <View style={styles.grabber} />
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
                <FontAwesome name="times" size={16} color={theme.muted} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={[styles.body, { paddingBottom: Math.max(24, insets.bottom + 12) }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
