import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Share, Text, View } from 'react-native';
import { Group, GroupHeader } from '../../src/components/Group';
import { Screen } from '../../src/components/Screen';
import { Sparkline } from '../../src/components/Sparkline';
import {
  dayKey,
  entryLine,
  formatWeight,
  groupSessions,
  liftStats,
  LIFT_LIST,
  liftTitle,
  logToCsv,
  oneRmTrend,
  safeDateLabel,
  safeTimeLabel,
  type LiftId,
  type SetEntry,
} from '../../src/engine';
import { tick } from '../../src/haptics/feedback';
import { useAppStore } from '../../src/store/useAppStore';
import { useThemeColors } from '../../src/theme/ThemeRoot';
import { useThemedStyles } from '../../src/theme/useThemedStyles';

const DAY_MS = 86400000;

function sessionTitle(key: string, ts: number): string {
  const today = dayKey(Date.now());
  if (key === today) {
    return 'Today';
  }
  if (key === dayKey(Date.now() - DAY_MS)) {
    return 'Yesterday';
  }
  return safeDateLabel(ts, { weekday: 'short', month: 'short', day: 'numeric' });
}

function clockLabel(ts: number): string {
  return safeTimeLabel(ts);
}

export default function LogScreen() {
  const theme = useThemeColors();
  const unit = useAppStore((state) => state.unit);
  const rounding = useAppStore((state) => state.rounding);
  const log = useAppStore((state) => state.log);
  const deleteLoggedSet = useAppStore((state) => state.deleteLoggedSet);
  const [filter, setFilter] = useState<LiftId | 'all'>('all');

  const visible = useMemo(
    () => (filter === 'all' ? log : log.filter((entry) => entry.liftId === filter)),
    [log, filter]
  );
  const sessions = useMemo(() => groupSessions(visible, unit), [visible, unit]);
  const week = useMemo(() => {
    const cutoff = Date.now() - 7 * DAY_MS;
    const recent = log.filter((entry) => entry.ts >= cutoff);
    return {
      sets: recent.length,
      volume: groupSessions(recent, unit).reduce((sum, day) => sum + day.volume, 0),
      days: new Set(recent.map((entry) => dayKey(entry.ts))).size,
    };
  }, [log, unit]);
  const bests = useMemo(
    () => LIFT_LIST.map((lift) => liftStats(log, lift.id, unit)).filter((stats) => stats.sets > 0),
    [log, unit]
  );
  const trend = useMemo(
    () => (filter === 'all' ? [] : oneRmTrend(log, filter, unit).map((point) => point.oneRm)),
    [log, filter, unit]
  );

  const styles = useThemedStyles((colors) => ({
    summary: {
      flexDirection: 'row' as const,
      gap: 10,
      marginBottom: 4,
    },
    stat: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 2,
    },
    statValue: {
      color: colors.accent,
      fontSize: 24,
      fontWeight: '800' as const,
      letterSpacing: -0.6,
    },
    statLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' as const },
    filters: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 36,
      justifyContent: 'center' as const,
    },
    chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' as const },
    chipLabelOn: { color: colors.accentText },
    bestRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    rowLast: { borderBottomWidth: 0 },
    bestLift: { color: colors.text, fontSize: 16, fontWeight: '800' as const },
    bestMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
    bestValue: { color: colors.accent, fontSize: 17, fontWeight: '800' as const, textAlign: 'right' as const },
    bestValueLabel: { color: colors.dim, fontSize: 11, fontWeight: '700' as const, textAlign: 'right' as const },
    sessionHead: {
      flexDirection: 'row' as const,
      alignItems: 'baseline' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 12,
    },
    sessionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' as const },
    sessionMeta: { color: colors.muted, fontSize: 13, fontWeight: '600' as const },
    entry: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
      minHeight: 56,
    },
    entryCopy: { flex: 1, gap: 2 },
    entryLift: { color: colors.text, fontSize: 15, fontWeight: '700' as const },
    entrySet: { color: colors.accent, fontSize: 17, fontWeight: '800' as const },
    entryTime: { color: colors.dim, fontSize: 12, fontWeight: '600' as const },
    trend: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
    },
    trendTitle: { color: colors.muted, fontSize: 13, fontWeight: '800' as const, letterSpacing: 0.6, textTransform: 'uppercase' as const },
    empty: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      gap: 8,
    },
    emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '800' as const },
    emptyCopy: { color: colors.muted, fontSize: 14, lineHeight: 20 },
    share: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      minHeight: 50,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 4,
    },
    shareLabel: { color: colors.text, fontSize: 16, fontWeight: '700' as const },
  }));

  const confirmDelete = (entry: SetEntry) => {
    void tick('warn');
    Alert.alert('Delete this set?', `${liftTitle(entry.liftId)} ${entryLine(entry, rounding)}`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteLoggedSet(entry.id) },
    ]);
  };

  const exportLog = () => {
    void tick('medium');
    void Share.share({
      title: 'IronMath log',
      message: logToCsv(log, liftTitle),
    }).catch(() => undefined);
  };

  if (log.length === 0) {
    return (
      <Screen title="Log" subtitle="Your sets" hint="Every set you log lands here, grouped by day.">
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing logged yet</Text>
          <Text style={styles.emptyCopy}>
            On Load, put a weight on the bar and tap Log set. It takes two taps and it stays on this
            phone. We track your heaviest single and your best estimated max for each lift.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Log" subtitle={`${log.length} sets`} hint="Tap a set to delete it.">
      <View style={styles.summary}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{week.sets}</Text>
          <Text style={styles.statLabel}>Sets, 7 days</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{week.days}</Text>
          <Text style={styles.statLabel}>Days trained</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{Math.round(week.volume).toLocaleString()}</Text>
          <Text style={styles.statLabel}>{unit === 'lb' ? 'LB lifted' : 'KG lifted'}</Text>
        </View>
      </View>

      {bests.length > 0 ? (
        <>
          <GroupHeader>Best ever</GroupHeader>
          <Group>
            {bests.map((stats, index) => (
              <View key={stats.liftId} style={[styles.bestRow, index === bests.length - 1 && styles.rowLast]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bestLift}>{liftTitle(stats.liftId)}</Text>
                  <Text style={styles.bestMeta}>
                    {stats.heaviestEntry ? `Heaviest ${entryLine(stats.heaviestEntry, rounding)}` : ''}
                  </Text>
                </View>
                <View>
                  <Text style={styles.bestValue}>{formatWeight(stats.bestOneRm, unit, rounding)}</Text>
                  <Text style={styles.bestValueLabel}>EST. MAX</Text>
                </View>
              </View>
            ))}
          </Group>
        </>
      ) : null}

      <GroupHeader>Filter</GroupHeader>
      <View style={styles.filters}>
        {[{ id: 'all' as const, title: 'All lifts' }, ...LIFT_LIST.map((lift) => ({ id: lift.id, title: lift.title }))].map(
          (option) => {
            const active = option.id === filter;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={option.title}
                onPress={() => {
                  void tick('light');
                  setFilter(option.id);
                }}
                style={[styles.chip, active && styles.chipOn]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelOn]}>{option.title}</Text>
              </Pressable>
            );
          }
        )}
      </View>

      {trend.length >= 2 ? (
        <View style={styles.trend}>
          <Text style={styles.trendTitle}>Estimated max by session</Text>
          <Sparkline
            values={trend}
            label={`${formatWeight(trend[0], unit, rounding)} then to ${formatWeight(
              trend[trend.length - 1],
              unit,
              rounding
            )}`}
            accessibilityLabel={`Estimated max went from ${formatWeight(trend[0], unit, rounding)} to ${formatWeight(
              trend[trend.length - 1],
              unit,
              rounding
            )} over ${trend.length} sessions.`}
          />
        </View>
      ) : null}

      <GroupHeader>Sessions</GroupHeader>
      {sessions.map((session) => (
        <Group key={session.key}>
          <View style={styles.sessionHead}>
            <Text style={styles.sessionTitle}>{sessionTitle(session.key, session.ts)}</Text>
            <Text style={styles.sessionMeta}>
              {session.sets} {session.sets === 1 ? 'set' : 'sets'} · {Math.round(session.volume).toLocaleString()}{' '}
              {unit === 'lb' ? 'LB' : 'KG'}
            </Text>
          </View>
          {session.entries.map((entry) => (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={`${liftTitle(entry.liftId)} ${entryLine(entry, rounding)}. Tap to delete.`}
              onPress={() => confirmDelete(entry)}
              style={styles.entry}
            >
              <View style={styles.entryCopy}>
                <Text style={styles.entryLift}>{liftTitle(entry.liftId)}</Text>
                <Text style={styles.entrySet}>{entryLine(entry, rounding)}</Text>
              </View>
              <Text style={styles.entryTime}>{clockLabel(entry.ts)}</Text>
              <FontAwesome name="chevron-right" size={12} color={theme.dim} />
            </Pressable>
          ))}
        </Group>
      ))}

      <Pressable accessibilityRole="button" accessibilityLabel="Share your log as a spreadsheet" onPress={exportLog} style={styles.share}>
        <FontAwesome name="share" size={14} color={theme.text} />
        <Text style={styles.shareLabel}>Export as CSV</Text>
      </Pressable>
    </Screen>
  );
}
