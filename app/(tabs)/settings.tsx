import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Segmented } from '../../src/components/Segmented';
import { platesForUnit, type Rounding } from '../../src/engine';
import { tick } from '../../src/haptics/feedback';
import { useActiveGym, useAppStore, useInventory } from '../../src/store/useAppStore';
import { theme } from '../../src/theme';

export default function SettingsScreen() {
  const unit = useAppStore((s) => s.unit);
  const rounding = useAppStore((s) => s.rounding);
  const plateTheme = useAppStore((s) => s.plateTheme);
  const hapticsEnabled = useAppStore((s) => s.hapticsEnabled);
  const audioEnabled = useAppStore((s) => s.audioEnabled);
  const customBar = useAppStore((s) => s.customBar);
  const gyms = useAppStore((s) => s.gyms);
  const activeGymId = useAppStore((s) => s.activeGymId);
  const gym = useActiveGym();
  const inventory = useInventory();
  const setUnit = useAppStore((s) => s.setUnit);
  const setRounding = useAppStore((s) => s.setRounding);
  const setPlateTheme = useAppStore((s) => s.setPlateTheme);
  const setHaptics = useAppStore((s) => s.setHaptics);
  const setAudio = useAppStore((s) => s.setAudio);
  const setActiveGym = useAppStore((s) => s.setActiveGym);
  const setPairCount = useAppStore((s) => s.setPairCount);
  const setCustomBar = useAppStore((s) => s.setCustomBar);
  const resetGyms = useAppStore((s) => s.resetGyms);
  const plates = platesForUnit(unit);

  return (
    <Screen title="Settings" subtitle="Gyms, plates, and feel">
      <Text style={styles.section}>Units</Text>
      <Segmented
        value={unit}
        options={[
          { value: 'lb', label: 'LB' },
          { value: 'kg', label: 'KG' },
        ]}
        onChange={setUnit}
      />
      <Text style={styles.section}>Rounding</Text>
      <Segmented
        value={String(rounding)}
        options={[
          { value: '0', label: '0' },
          { value: '1', label: '0.0' },
          { value: '2', label: '0.00' },
        ]}
        onChange={(value) => setRounding(Number(value) as Rounding)}
      />
      <Text style={styles.section}>Plate colors</Text>
      <Segmented
        value={plateTheme}
        options={[
          { value: 'bumper', label: 'Bumper' },
          { value: 'iron', label: 'Black iron' },
        ]}
        onChange={setPlateTheme}
      />
      <Text style={styles.section}>Feedback</Text>
      <View style={styles.row}>
        <Toggle label="Haptics" on={hapticsEnabled} onPress={() => setHaptics(!hapticsEnabled)} />
        <Toggle label="Audio ticks" on={audioEnabled} onPress={() => setAudio(!audioEnabled)} />
      </View>

      <Text style={styles.section}>Custom bar ({unit === 'lb' ? 'lb' : 'kg'})</Text>
      <TextInput
        keyboardType="decimal-pad"
        value={String(customBar)}
        onChangeText={(text) => {
          const n = Number(text);
          if (Number.isFinite(n)) setCustomBar(n);
        }}
        style={styles.input}
        placeholderTextColor={theme.dim}
      />

      <Text style={styles.section}>Gym profile</Text>
      {gyms.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => {
            void tick('light');
            setActiveGym(item.id);
          }}
          style={[styles.gym, item.id === activeGymId && styles.gymActive]}
        >
          <Text style={styles.gymName}>{item.name}</Text>
          <Text style={styles.gymMeta}>{item.kind === 'commercial' ? 'Unlimited 45s' : item.kind}</Text>
        </Pressable>
      ))}

      <Text style={styles.section}>{gym.name} plate pairs</Text>
      {plates.map((plate) => {
        const count = inventory[plate.id] ?? 0;
        return (
          <View key={plate.id} style={styles.pairRow}>
            <Text style={styles.pairLabel}>{plate.weight}</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => {
                  void tick('light');
                  setPairCount(plate.id, count - 1);
                }}
                style={styles.step}
              >
                <Text style={styles.stepText}>-</Text>
              </Pressable>
              <Text style={styles.count}>{count === 99 ? '∞' : count}</Text>
              <Pressable
                onPress={() => {
                  void tick('light');
                  setPairCount(plate.id, count + 1);
                }}
                style={styles.step}
              >
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Pressable
        onPress={() => {
          void tick('warn');
          resetGyms();
        }}
        style={styles.reset}
      >
        <Text style={styles.resetText}>Reset gym presets</Text>
      </Pressable>
    </Screen>
  );
}

function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        void tick('light');
        onPress();
      }}
      style={[styles.toggle, on && styles.toggleOn]}
    >
      <Text style={[styles.toggleText, on && styles.toggleTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  row: { flexDirection: 'row', gap: 8 },
  toggle: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  toggleOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  toggleText: { color: theme.muted, fontWeight: '700' },
  toggleTextOn: { color: theme.accentText },
  input: {
    backgroundColor: theme.surface,
    color: theme.text,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
  },
  gym: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  gymActive: { borderColor: theme.accent },
  gymName: { color: theme.text, fontWeight: '800', fontSize: 16 },
  gymMeta: { color: theme.muted, marginTop: 2 },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pairLabel: { color: theme.text, fontWeight: '800', fontSize: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  step: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: theme.text, fontSize: 20, fontWeight: '700' },
  count: { color: theme.accent, fontWeight: '800', width: 28, textAlign: 'center' },
  reset: { alignSelf: 'center', padding: 12 },
  resetText: { color: theme.danger, fontWeight: '700' },
});
