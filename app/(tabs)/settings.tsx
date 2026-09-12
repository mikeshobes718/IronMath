import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { Group, GroupFooter, GroupHeader, GroupRow } from '../../src/components/Group';
import { NumpadDoneBar, numpadAccessoryProps } from '../../src/components/NumpadDoneBar';
import { Screen } from '../../src/components/Screen';
import { platesForUnit } from '../../src/engine';
import { tick } from '../../src/haptics/feedback';
import { useActiveGym, useAppStore, useInventory } from '../../src/store/useAppStore';
import { useThemeColors } from '../../src/theme/ThemeRoot';
import { useThemedStyles } from '../../src/theme/useThemedStyles';
import { addIronMathWebApp } from '../../src/wearables/openOnGlasses';

export default function SettingsScreen() {
  const unit = useAppStore((state) => state.unit);
  const rounding = useAppStore((state) => state.rounding);
  const plateTheme = useAppStore((state) => state.plateTheme);
  const hapticsEnabled = useAppStore((state) => state.hapticsEnabled);
  const audioEnabled = useAppStore((state) => state.audioEnabled);
  const customBar = useAppStore((state) => state.customBar);
  const gyms = useAppStore((state) => state.gyms);
  const activeGymId = useAppStore((state) => state.activeGymId);
  const gym = useActiveGym();
  const setUnit = useAppStore((state) => state.setUnit);
  const setRounding = useAppStore((state) => state.setRounding);
  const setPlateTheme = useAppStore((state) => state.setPlateTheme);
  const setHaptics = useAppStore((state) => state.setHaptics);
  const setAudio = useAppStore((state) => state.setAudio);
  const setActiveGym = useAppStore((state) => state.setActiveGym);
  const setCustomBar = useAppStore((state) => state.setCustomBar);
  const resetGyms = useAppStore((state) => state.resetGyms);
  const appearance = useAppStore((state) => state.appearance);
  const setAppearance = useAppStore((state) => state.setAppearance);
  const plates = platesForUnit(unit);
  const styles = useSettingsStyles();
  const theme = useThemeColors();

  const [barDraft, setBarDraft] = useState(String(customBar));
  const [barFocused, setBarFocused] = useState(false);
  const [showPairs, setShowPairs] = useState(false);
  const [glassesNote, setGlassesNote] = useState('');

  useEffect(() => {
    if (!barFocused) {
      setBarDraft(String(customBar));
    }
  }, [customBar, barFocused]);

  const commitBar = (text: string) => {
    const next = Number(text);
    if (Number.isFinite(next)) {
      setCustomBar(next);
      setBarDraft(String(next));
      return;
    }
    setBarDraft(String(customBar));
  };

  return (
    <Screen
      title="Settings"
      subtitle="Gyms, plates, and feel"
      hint="Gym plates, how the app looks, and feel. Load matches any target to these plates."
    >
      <GroupHeader>Appearance</GroupHeader>
      <Group>
        <Choice
          label="System"
          detail="Follow the phone. Light by day, dark at night if your phone does that."
          selected={appearance === 'system'}
          onPress={() => setAppearance('system')}
        />
        <Choice label="Light" detail="Always light." selected={appearance === 'light'} onPress={() => setAppearance('light')} />
        <Choice label="Dark" detail="Always dark." selected={appearance === 'dark'} onPress={() => setAppearance('dark')} last />
      </Group>
      <GroupFooter>System is the default. The window chrome needs a TestFlight build to fully match the phone.</GroupFooter>

      <GroupHeader>Gym plates</GroupHeader>
      <Group>
        <Choice label="Kilograms" detail="Kilo plates. Most commercial gyms." selected={unit === 'kg'} onPress={() => setUnit('kg')} />
        <Choice label="Pounds" detail="US pound plates on the gym floor." selected={unit === 'lb'} onPress={() => setUnit('lb')} last />
      </Group>
      <GroupFooter>This is the plates on the floor. On Load you type a target in pounds or kilos.</GroupFooter>

      <GroupHeader>Rounding</GroupHeader>
      <Group>
        <Choice label="Whole" detail="315" selected={rounding === 0} onPress={() => setRounding(0)} />
        <Choice label="Tenth" detail="315.0" selected={rounding === 1} onPress={() => setRounding(1)} />
        <Choice label="Hundredth" detail="315.00" selected={rounding === 2} onPress={() => setRounding(2)} last />
      </Group>
      <GroupFooter>How many digits after the decimal on weight labels. The solver still uses exact plate math.</GroupFooter>

      <GroupHeader>Plate colors</GroupHeader>
      <Group>
        <Choice
          label="Bumper"
          detail="IWF color code (blue 20 kg / 45 lb)"
          selected={plateTheme === 'bumper'}
          onPress={() => setPlateTheme('bumper')}
        />
        <Choice
          label="Black iron"
          detail="Plain gym plates"
          selected={plateTheme === 'iron'}
          onPress={() => setPlateTheme('iron')}
          last
        />
      </Group>

      <GroupHeader>Feedback</GroupHeader>
      <Group>
        <ToggleRow label="Haptics" detail="Tap vibration on keys and switches" on={hapticsEnabled} onChange={setHaptics} />
        <ToggleRow label="Audio ticks" detail="Extra click on web, extra tap on phone" on={audioEnabled} onChange={setAudio} last />
      </Group>

      <GroupHeader>Custom bar ({unit === 'lb' ? 'LB' : 'KG'})</GroupHeader>
      <Group>
        <GroupRow last>
          <TextInput
            keyboardType="decimal-pad"
            returnKeyType="done"
            blurOnSubmit
            {...numpadAccessoryProps}
            value={barDraft}
            onFocus={() => {
              setBarFocused(true);
              setBarDraft(String(customBar));
            }}
            onChangeText={setBarDraft}
            onBlur={() => {
              setBarFocused(false);
              commitBar(barDraft);
            }}
            onSubmitEditing={() => commitBar(barDraft)}
            style={styles.input}
            placeholderTextColor={theme.dim}
            accessibilityLabel="Custom bar weight"
          />
        </GroupRow>
      </Group>
      <GroupFooter>Typing here switches Load to a custom bar weight for specialty bars.</GroupFooter>

      <GroupHeader>Gym profile</GroupHeader>
      <Group>
        {gyms.map((item, index) => (
          <Choice
            key={item.id}
            label={item.name}
            detail={item.kind === 'commercial' ? 'Packed plate tree. 99 pairs means unlimited.' : item.kind}
            selected={item.id === activeGymId}
            onPress={() => setActiveGym(item.id)}
            last={index === gyms.length - 1}
          />
        ))}
      </Group>
      <GroupFooter>Pick the gym that matches the plates you actually have. This changes what Load can put on the bar.</GroupFooter>

      <GroupHeader>Ray-Ban Display</GroupHeader>
      <Group>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add IronMath in Meta AI"
          onPress={() => {
            Keyboard.dismiss();
            void tick('medium');
            setGlassesNote('Opening Meta AI...');
            void addIronMathWebApp()
              .then((message) => setGlassesNote(message))
              .catch((error: unknown) => {
                setGlassesNote(error instanceof Error ? error.message : 'Could not open Meta AI.');
              });
          }}
        >
          <GroupRow last>
            <View style={styles.choiceCopy}>
              <Text style={styles.choiceLabel}>Add IronMath in Meta AI</Text>
              <Text style={styles.choiceDetail}>One time. Connect, then go back to Load.</Text>
            </View>
          </GroupRow>
        </Pressable>
      </Group>
      <GroupFooter>
        Open on glasses on Load saves the current set. Keep IronMath open on the glasses to see it. Meta AI is only for connecting. The phone cannot bring that page to the front.
      </GroupFooter>
      {glassesNote ? <Text style={styles.choiceDetail}>{glassesNote}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${gym.name} plate pairs`}
        onPress={() => {
          void tick('light');
          setShowPairs((open) => !open);
        }}
        style={styles.pairsToggle}
      >
        <View style={styles.choiceCopy}>
          <Text style={styles.choiceLabel}>{gym.name} plate pairs</Text>
          <Text style={styles.choiceDetail}>
            {showPairs ? 'How many pairs of each plate you have.' : 'Tap to set how many plates this gym has.'}
          </Text>
        </View>
        <FontAwesome name={showPairs ? 'chevron-up' : 'chevron-down'} size={12} color={theme.dim} />
      </Pressable>
      {showPairs ? (
        <>
          <Group>
            {plates.map((plate, index) => (
              <GroupRow key={plate.id} last={index === plates.length - 1}>
                <View style={styles.pairRow}>
                  <Text style={styles.pairLabel}>{plate.weight}</Text>
                  <PairCountControl plateId={plate.id} />
                </View>
              </GroupRow>
            ))}
          </Group>
          <GroupFooter>
            Pairs means one plate on each side. 99 shows as infinity and means unlimited.
          </GroupFooter>
        </>
      ) : null}

      <Pressable
        onPress={() => {
          Keyboard.dismiss();
          void tick('warn');
          resetGyms();
        }}
        style={styles.reset}
      >
        <Text style={styles.resetText}>Reset gym presets</Text>
      </Pressable>
      <NumpadDoneBar />
    </Screen>
  );
}

function PairCountControl({ plateId }: { plateId: string }) {
  const styles = useSettingsStyles();
  const setPairCount = useAppStore((state) => state.setPairCount);
  const inventory = useInventory();
  const count = inventory[plateId] ?? 0;
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(String(count));

  useEffect(() => {
    if (!focused) {
      setDraft(String(count));
    }
  }, [count, focused]);

  const commit = (text: string) => {
    const digits = text.replace(/[^\d]/g, '');
    if (digits === '') {
      setPairCount(plateId, 0);
      setDraft('0');
      return;
    }
    const next = Math.max(0, Math.min(99, parseInt(digits, 10)));
    setPairCount(plateId, next);
    setDraft(String(next));
  };

  const stepBy = (delta: number) => {
    const next = Math.max(0, Math.min(99, count + delta));
    void tick('light');
    setPairCount(plateId, next);
    setDraft(String(next));
  };

  const display = focused ? draft : count === 99 ? '∞' : String(count);

  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease pair count"
        hitSlop={10}
        disabled={count <= 0}
        onPress={() => stepBy(-1)}
        style={[styles.step, count <= 0 && styles.stepOff]}
      >
        <Text style={styles.stepText}>-</Text>
      </Pressable>
      <TextInput
        accessibilityLabel="Pair count"
        keyboardType="number-pad"
        returnKeyType="done"
        blurOnSubmit
        {...numpadAccessoryProps}
        selectTextOnFocus
        maxLength={focused ? 2 : 3}
        value={display}
        onFocus={() => {
          setFocused(true);
          setDraft(String(count));
        }}
        onChangeText={(text) => {
          const digits = text.replace(/[^\d]/g, '').slice(0, 2);
          setDraft(digits);
          if (digits !== '') {
            const parsed = parseInt(digits, 10);
            if (Number.isFinite(parsed)) {
              setPairCount(plateId, Math.max(0, Math.min(99, parsed)));
            }
          }
        }}
        onBlur={() => {
          setFocused(false);
          commit(draft);
        }}
        onSubmitEditing={() => commit(draft)}
        style={styles.countInput}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase pair count"
        hitSlop={10}
        disabled={count >= 99}
        onPress={() => stepBy(1)}
        style={[styles.step, count >= 99 && styles.stepOff]}
      >
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  );
}

function Choice({
  label,
  detail,
  selected,
  onPress,
  last,
}: {
  label: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  const styles = useSettingsStyles();
  return (
    <Pressable
      onPress={() => {
        Keyboard.dismiss();
        void tick('light');
        onPress();
      }}
    >
      <GroupRow last={last}>
        <View style={styles.choice}>
          <View style={styles.choiceCopy}>
            <Text style={styles.choiceLabel}>{label}</Text>
            <Text style={styles.choiceDetail}>{detail}</Text>
          </View>
          <Text style={[styles.check, selected && styles.checkOn]}>{selected ? '✓' : ''}</Text>
        </View>
      </GroupRow>
    </Pressable>
  );
}

function ToggleRow({
  label,
  detail,
  on,
  onChange,
  last,
}: {
  label: string;
  detail: string;
  on: boolean;
  onChange: (value: boolean) => void;
  last?: boolean;
}) {
  const styles = useSettingsStyles();
  const theme = useThemeColors();
  return (
    <Pressable
      onPress={() => {
        Keyboard.dismiss();
        void tick('light');
        onChange(!on);
      }}
    >
      <GroupRow last={last}>
        <View style={styles.choice}>
          <View style={styles.choiceCopy}>
            <Text style={styles.choiceLabel}>{label}</Text>
            <Text style={styles.choiceDetail}>{detail}</Text>
          </View>
          <Switch
            pointerEvents="none"
            value={on}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor="#FAFAFA"
            ios_backgroundColor={theme.border}
          />
        </View>
      </GroupRow>
    </Pressable>
  );
}

function useSettingsStyles() {
  return useThemedStyles((theme) => ({
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  choiceCopy: {
    flex: 1,
    paddingRight: 8,
  },
  choiceLabel: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
  },
  choiceDetail: {
    color: theme.muted,
    fontSize: 13,
    marginTop: 2,
  },
  check: {
    color: theme.accent,
    fontSize: 18,
    fontWeight: '800',
    minWidth: 22,
    textAlign: 'right',
  },
  checkOn: {
    color: theme.accent,
  },
  input: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '800',
    padding: 0,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pairLabel: {
    color: theme.text,
    fontWeight: '800',
    fontSize: 16,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  step: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepOff: {
    opacity: 0.35,
  },
  stepText: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '700',
  },
  countInput: {
    color: theme.accent,
    fontWeight: '800',
    fontSize: 18,
    minWidth: 44,
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  pairsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  reset: {
    alignSelf: 'center',
    padding: 12,
  },
  resetText: {
    color: theme.danger,
    fontWeight: '700',
  },
  }));
}
