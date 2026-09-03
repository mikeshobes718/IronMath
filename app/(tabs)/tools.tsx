import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { tick } from '../../src/haptics/feedback';
import { theme } from '../../src/theme';

const TOOLS: Array<{
  href: '/convert' | '/onerm' | '/rpe' | '/dots' | '/attempts';
  title: string;
  detail: string;
  icon: ComponentProps<typeof FontAwesome>['name'];
}> = [
  { href: '/convert', title: 'LB / KG', detail: 'Instant bidirectional converter', icon: 'exchange' },
  { href: '/onerm', title: '1RM / e1RM', detail: 'Brzycki and Epley live estimate', icon: 'trophy' },
  { href: '/rpe', title: 'RPE / RIR', detail: 'Percent of 1RM by reps and effort', icon: 'sliders' },
  { href: '/dots', title: 'DOTS / IPF GL', detail: 'Bodyweight-adjusted meet points', icon: 'bar-chart' },
  { href: '/attempts', title: 'Meet Attempts', detail: 'Opener, second, and third', icon: 'flag' },
];

export default function ToolsScreen() {
  return (
    <Screen title="Tools" subtitle="Strength and competition math">
      <View style={styles.grid}>
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} asChild>
            <Pressable
              onPress={() => {
                void tick('light');
              }}
              style={styles.card}
            >
              <FontAwesome name={tool.icon} size={20} color={theme.accent} />
              <Text style={styles.title}>{tool.title}</Text>
              <Text style={styles.detail}>{tool.detail}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    minWidth: 150,
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  title: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  detail: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
