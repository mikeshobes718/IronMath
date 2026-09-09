import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Group, GroupFooter, GroupHeader } from '../../src/components/Group';
import { Screen } from '../../src/components/Screen';
import { LIFT_LIST, type LiftId } from '../../src/engine';
import { tick } from '../../src/haptics/feedback';
import { useThemeColors } from '../../src/theme/ThemeRoot';
import { useThemedStyles } from '../../src/theme/useThemedStyles';

type ToolHref = '/lift' | '/club' | '/percent' | '/remaining' | '/convert' | '/dots' | '/attempts' | '/glance' | '/rest';

const LIFT_ICONS: Record<LiftId, ComponentProps<typeof FontAwesome>['name']> = {
  squat: 'male',
  bench: 'heart',
  deadlift: 'bolt',
  ohp: 'arrow-up',
  row: 'exchange',
};

const GOALS: Array<{
  href: ToolHref;
  title: string;
  detail: string;
  icon: ComponentProps<typeof FontAwesome>['name'];
}> = [
  {
    href: '/club',
    title: '1000 lb Club',
    detail: 'Squat, bench, and deadlift. How far from 1000 LB or 500 KG.',
    icon: 'trophy',
  },
  {
    href: '/percent',
    title: 'Percentage chart',
    detail: 'Type a max. See 50 to 100 percent in 5 percent steps.',
    icon: 'percent',
  },
  {
    href: '/remaining',
    title: 'How much more',
    detail: 'What you have now, what you want, and the gap.',
    icon: 'plus-circle',
  },
];

const MATH: Array<{
  href: ToolHref;
  title: string;
  detail: string;
  icon: ComponentProps<typeof FontAwesome>['name'];
}> = [
  {
    href: '/glance',
    title: 'Gym glance',
    detail: 'Huge Load and Convert for the rack, lock screen, and Meta Display glasses.',
    icon: 'eye',
  },
  {
    href: '/rest',
    title: 'Rest timer',
    detail: '60 to 300 seconds. Counts down on the lock screen, Dynamic Island, and glasses.',
    icon: 'clock-o',
  },
  {
    href: '/convert',
    title: 'Convert LB and KG',
    detail: 'When the plates and the program use different units.',
    icon: 'exchange',
  },
  {
    href: '/dots',
    title: 'Meet score',
    detail: 'DOTS and IPF GL from bodyweight and total.',
    icon: 'bar-chart',
  },
  {
    href: '/attempts',
    title: 'Plan three attempts',
    detail: 'Opener, second, and third for a meet.',
    icon: 'flag',
  },
];

export default function ToolsScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const styles = useThemedStyles((colors) => ({
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 14,
      paddingVertical: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      minHeight: 76,
      width: '100%',
    },
    rowLast: { borderBottomWidth: 0 },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.card,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    copy: { flex: 1, gap: 3 },
    chevron: { width: 18, alignItems: 'flex-end' as const, justifyContent: 'center' as const },
    title: { color: colors.text, fontSize: 17, fontWeight: '800' as const },
    detail: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  }));

  const open = (href: ToolHref, lift?: LiftId) => {
    void tick('light');
    if (href === '/lift' && lift) {
      router.push(`/lift?id=${lift}` as Href);
      return;
    }
    router.push(href as Href);
  };

  return (
    <Screen
      title="Tools"
      subtitle="By lift and goal"
      hint="Pick a lift for plates, warm-up, 1RM, and RPE. Your numbers stay after you close the app."
    >
      <GroupHeader>By lift</GroupHeader>
      <Group>
        {LIFT_LIST.map((lift, index) => (
          <Pressable
            key={lift.id}
            accessibilityRole="button"
            accessibilityLabel={`${lift.title}. ${lift.detail}`}
            onPress={() => open('/lift', lift.id)}
            style={[styles.row, index === LIFT_LIST.length - 1 && styles.rowLast]}
          >
            <View style={styles.iconWrap}>
              <FontAwesome name={LIFT_ICONS[lift.id]} size={16} color={theme.accent} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{lift.title}</Text>
              <Text style={styles.detail}>{lift.detail}</Text>
            </View>
            <View style={styles.chevron}>
              <FontAwesome name="chevron-right" size={12} color={theme.dim} />
            </View>
          </Pressable>
        ))}
      </Group>
      <GroupFooter>Same plate math as Load. We just start from that lift.</GroupFooter>

      <GroupHeader>Goals</GroupHeader>
      <Group>
        {GOALS.map((tool, index) => (
          <Pressable
            key={tool.href}
            accessibilityRole="button"
            accessibilityLabel={`${tool.title}. ${tool.detail}`}
            onPress={() => open(tool.href)}
            style={[styles.row, index === GOALS.length - 1 && styles.rowLast]}
          >
            <View style={styles.iconWrap}>
              <FontAwesome name={tool.icon} size={16} color={theme.accent} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{tool.title}</Text>
              <Text style={styles.detail}>{tool.detail}</Text>
            </View>
            <View style={styles.chevron}>
              <FontAwesome name="chevron-right" size={12} color={theme.dim} />
            </View>
          </Pressable>
        ))}
      </Group>

      <GroupHeader>Meet and math</GroupHeader>
      <Group>
        {MATH.map((tool, index) => (
          <Pressable
            key={tool.href}
            accessibilityRole="button"
            accessibilityLabel={`${tool.title}. ${tool.detail}`}
            onPress={() => open(tool.href)}
            style={[styles.row, index === MATH.length - 1 && styles.rowLast]}
          >
            <View style={styles.iconWrap}>
              <FontAwesome name={tool.icon} size={16} color={theme.accent} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{tool.title}</Text>
              <Text style={styles.detail}>{tool.detail}</Text>
            </View>
            <View style={styles.chevron}>
              <FontAwesome name="chevron-right" size={12} color={theme.dim} />
            </View>
          </Pressable>
        ))}
      </Group>
    </Screen>
  );
}
