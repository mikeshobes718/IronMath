import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  applyCustomRest,
  BAR_PRESETS,
  clampRestDuration,
  customRestLooksComplete,
  DEFAULT_CUSTOM_REST_SEC,
  DEFAULT_REST_SEC,
  defaultGyms,
  defaultWorking,
  formatRestClock,
  isRestPreset,
  platesForUnit,
  remainingFromEnd,
  type CollarId,
  type GymProfile,
  type LiftId,
  type PlateTheme,
  type Rounding,
  type Unit,
} from '../engine';
import type { AppearanceMode } from '../theme';

export type LiftEntry = {
  working: string;
  unit: Unit;
  reps: string;
};

export type ClubEntry = {
  squat: string;
  bench: string;
  deadlift: string;
  unit: Unit;
};

const defaultLifts = (): Record<LiftId, LiftEntry> => ({
  squat: { working: defaultWorking('squat', 'lb'), unit: 'lb', reps: '5' },
  bench: { working: defaultWorking('bench', 'lb'), unit: 'lb', reps: '5' },
  deadlift: { working: defaultWorking('deadlift', 'lb'), unit: 'lb', reps: '5' },
  ohp: { working: defaultWorking('ohp', 'lb'), unit: 'lb', reps: '5' },
  row: { working: defaultWorking('row', 'lb'), unit: 'lb', reps: '5' },
});

export interface AppState {
  hydrated: boolean;
  unit: Unit;
  barId: string;
  customBar: number;
  collarId: CollarId;
  plateTheme: PlateTheme;
  rounding: Rounding;
  hapticsEnabled: boolean;
  audioEnabled: boolean;
  activeGymId: string;
  gyms: GymProfile[];
  appearance: AppearanceMode;
  lifts: Record<LiftId, LiftEntry>;
  club: ClubEntry;
  percentRaw: string;
  percentUnit: Unit;
  remainHave: string;
  remainWant: string;
  remainUnit: Unit;
  warmupSeed: { raw: string; unit: Unit } | null;
  loadTargetRaw: string;
  loadInputUnit: Unit;
  convertRaw: string;
  convertFrom: Unit;
  gymHudPinned: boolean;
  restDurationSec: number;
  restRunning: boolean;
  restEndTs: number | null;
  restRemainingSec: number;
  restUsingCustom: boolean;
  restCustomRaw: string;
  setUnit: (unit: Unit) => void;
  setBarId: (barId: string) => void;
  setCustomBar: (weight: number) => void;
  setCollarId: (collarId: CollarId) => void;
  setPlateTheme: (theme: PlateTheme) => void;
  setRounding: (rounding: Rounding) => void;
  setHaptics: (on: boolean) => void;
  setAudio: (on: boolean) => void;
  setActiveGym: (id: string) => void;
  setPairCount: (plateId: string, count: number) => void;
  renameGym: (id: string, name: string) => void;
  resetGyms: () => void;
  setAppearance: (appearance: AppearanceMode) => void;
  setLiftWorking: (id: LiftId, working: string) => void;
  setLiftUnit: (id: LiftId, unit: Unit) => void;
  setLiftReps: (id: LiftId, reps: string) => void;
  setClubField: (field: 'squat' | 'bench' | 'deadlift', value: string) => void;
  setClubUnit: (unit: Unit) => void;
  setPercentRaw: (percentRaw: string) => void;
  setPercentUnit: (percentUnit: Unit) => void;
  setRemainHave: (remainHave: string) => void;
  setRemainWant: (remainWant: string) => void;
  setRemainUnit: (remainUnit: Unit) => void;
  setWarmupSeed: (warmupSeed: { raw: string; unit: Unit } | null) => void;
  setLoadTargetRaw: (loadTargetRaw: string) => void;
  setLoadInputUnit: (loadInputUnit: Unit) => void;
  setConvertRaw: (convertRaw: string) => void;
  setConvertFrom: (convertFrom: Unit) => void;
  setGymHudPinned: (gymHudPinned: boolean) => void;
  setRestDuration: (sec: number) => void;
  selectRestPreset: (sec: number) => void;
  beginCustomRest: () => void;
  setRestCustomRaw: (raw: string) => void;
  startRest: () => void;
  pauseRest: () => void;
  resetRest: () => void;
  finishRest: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: true,
      unit: 'kg',
      barId: 'oly',
      customBar: 20,
      collarId: 'none',
      plateTheme: 'bumper',
      rounding: 1,
      hapticsEnabled: true,
      audioEnabled: true,
      activeGymId: 'commercial',
      gyms: defaultGyms(),
      appearance: 'system',
      lifts: defaultLifts(),
      club: { squat: '315', bench: '225', deadlift: '405', unit: 'lb' },
      percentRaw: '315',
      percentUnit: 'lb',
      remainHave: '945',
      remainWant: '1000',
      remainUnit: 'lb',
      warmupSeed: null,
      loadTargetRaw: '225',
      loadInputUnit: 'lb',
      convertRaw: '315',
      convertFrom: 'lb',
      gymHudPinned: false,
      restDurationSec: DEFAULT_REST_SEC,
      restRunning: false,
      restEndTs: null,
      restRemainingSec: DEFAULT_REST_SEC,
      restUsingCustom: false,
      restCustomRaw: formatRestClock(DEFAULT_CUSTOM_REST_SEC),
      setUnit: (unit) => {
        const current = get();
        if (unit === current.unit) {
          return;
        }
        const preset = BAR_PRESETS.find((item) => item.id === current.barId);
        const nextCustom = unit === 'lb'
          ? Number((current.customBar * 2.2046226218).toFixed(2))
          : Number((current.customBar * 0.45359237).toFixed(2));
        set({
          unit,
          customBar: current.barId === 'custom' ? nextCustom : preset ? (unit === 'lb' ? preset.lb : preset.kg) : nextCustom,
        });
      },
      setBarId: (barId) => {
        const preset = BAR_PRESETS.find((item) => item.id === barId);
        const unit = get().unit;
        set({
          barId,
          customBar: preset ? (unit === 'lb' ? preset.lb : preset.kg) : get().customBar,
        });
      },
      setCustomBar: (weight) => set({ customBar: Math.max(0, weight), barId: 'custom' }),
      setCollarId: (collarId) => set({ collarId }),
      setPlateTheme: (plateTheme) => set({ plateTheme }),
      setRounding: (rounding) => set({ rounding }),
      setHaptics: (hapticsEnabled) => set({ hapticsEnabled }),
      setAudio: (audioEnabled) => set({ audioEnabled }),
      setActiveGym: (activeGymId) => set({ activeGymId }),
      setPairCount: (plateId, count) => {
        const { activeGymId, gyms, unit } = get();
        const key = unit === 'lb' ? 'inventoryLb' : 'inventoryKg';
        set({
          gyms: gyms.map((gym) =>
            gym.id === activeGymId
              ? { ...gym, [key]: { ...gym[key], [plateId]: Math.max(0, Math.min(99, Math.round(count))) } }
              : gym
          ),
        });
      },
      renameGym: (id, name) => {
        set({
          gyms: get().gyms.map((gym) => (gym.id === id ? { ...gym, name: name.trim() || gym.name } : gym)),
        });
      },
      resetGyms: () => set({ gyms: defaultGyms(), activeGymId: 'commercial' }),
      setAppearance: (appearance) => set({ appearance }),
      setLiftWorking: (id, working) =>
        set({ lifts: { ...get().lifts, [id]: { ...get().lifts[id], working } } }),
      setLiftUnit: (id, unit) =>
        set({ lifts: { ...get().lifts, [id]: { ...get().lifts[id], unit } } }),
      setLiftReps: (id, reps) =>
        set({ lifts: { ...get().lifts, [id]: { ...get().lifts[id], reps } } }),
      setClubField: (field, value) => set({ club: { ...get().club, [field]: value } }),
      setClubUnit: (unit) => set({ club: { ...get().club, unit } }),
      setPercentRaw: (percentRaw) => set({ percentRaw }),
      setPercentUnit: (percentUnit) => set({ percentUnit }),
      setRemainHave: (remainHave) => set({ remainHave }),
      setRemainWant: (remainWant) => set({ remainWant }),
      setRemainUnit: (remainUnit) => set({ remainUnit }),
      setWarmupSeed: (warmupSeed) => set({ warmupSeed }),
      setLoadTargetRaw: (loadTargetRaw) => set({ loadTargetRaw }),
      setLoadInputUnit: (loadInputUnit) => set({ loadInputUnit }),
      setConvertRaw: (convertRaw) => set({ convertRaw }),
      setConvertFrom: (convertFrom) => set({ convertFrom }),
      setGymHudPinned: (gymHudPinned) => set({ gymHudPinned }),
      setRestDuration: (sec) => {
        const restDurationSec = clampRestDuration(sec);
        set({ restDurationSec, restRunning: false, restEndTs: null, restRemainingSec: restDurationSec });
      },
      selectRestPreset: (sec) => {
        const restDurationSec = clampRestDuration(sec);
        set({
          restUsingCustom: false,
          restDurationSec,
          restRunning: false,
          restEndTs: null,
          restRemainingSec: restDurationSec,
        });
      },
      beginCustomRest: () => {
        const raw = get().restCustomRaw.trim()
          ? get().restCustomRaw
          : formatRestClock(DEFAULT_CUSTOM_REST_SEC);
        const applied = applyCustomRest(raw) ?? clampRestDuration(DEFAULT_CUSTOM_REST_SEC);
        set({
          restUsingCustom: true,
          restCustomRaw: raw,
          restDurationSec: applied,
          restRunning: false,
          restEndTs: null,
          restRemainingSec: applied,
        });
      },
      setRestCustomRaw: (restCustomRaw) => {
        const next: Partial<AppState> = { restCustomRaw, restUsingCustom: true };
        if (customRestLooksComplete(restCustomRaw)) {
          const applied = applyCustomRest(restCustomRaw);
          if (applied !== null) {
            next.restDurationSec = applied;
            next.restRunning = false;
            next.restEndTs = null;
            next.restRemainingSec = applied;
          }
        }
        set(next);
      },
      startRest: () => {
        const { restRemainingSec, restDurationSec } = get();
        const remaining = restRemainingSec > 0 ? restRemainingSec : restDurationSec;
        set({ restRunning: true, restEndTs: Date.now() + remaining * 1000, restRemainingSec: remaining });
      },
      pauseRest: () => {
        const { restRunning, restEndTs } = get();
        if (!restRunning || !restEndTs) {
          return;
        }
        set({ restRunning: false, restEndTs: null, restRemainingSec: remainingFromEnd(restEndTs, Date.now()) });
      },
      resetRest: () => {
        const { restDurationSec } = get();
        set({ restRunning: false, restEndTs: null, restRemainingSec: restDurationSec });
      },
      finishRest: () => set({ restRunning: false, restEndTs: null, restRemainingSec: 0 }),
    }),
    {
      name: 'ironmath-prefs-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        unit: state.unit,
        barId: state.barId,
        customBar: state.customBar,
        collarId: state.collarId,
        plateTheme: state.plateTheme,
        rounding: state.rounding,
        hapticsEnabled: state.hapticsEnabled,
        audioEnabled: state.audioEnabled,
        activeGymId: state.activeGymId,
        gyms: state.gyms,
        appearance: state.appearance,
        lifts: state.lifts,
        club: state.club,
        percentRaw: state.percentRaw,
        percentUnit: state.percentUnit,
        remainHave: state.remainHave,
        remainWant: state.remainWant,
        remainUnit: state.remainUnit,
        loadTargetRaw: state.loadTargetRaw,
        loadInputUnit: state.loadInputUnit,
        convertRaw: state.convertRaw,
        convertFrom: state.convertFrom,
        gymHudPinned: state.gymHudPinned,
        restDurationSec: state.restDurationSec,
        restRunning: state.restRunning,
        restEndTs: state.restEndTs,
        restRemainingSec: state.restRemainingSec,
        restUsingCustom: state.restUsingCustom,
        restCustomRaw: state.restCustomRaw,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
          const fallbackClub: ClubEntry = { squat: '315', bench: '225', deadlift: '405', unit: 'lb' };
          state.lifts = { ...defaultLifts(), ...state.lifts };
          state.club = { ...fallbackClub, ...state.club };
          if (!state.loadTargetRaw) {
            state.loadTargetRaw = '225';
          }
          if (state.loadInputUnit !== 'lb' && state.loadInputUnit !== 'kg') {
            state.loadInputUnit = 'lb';
          }
          if (!state.convertRaw) {
            state.convertRaw = '315';
          }
          if (state.convertFrom !== 'kg' && state.convertFrom !== 'lb') {
            state.convertFrom = 'lb';
          }
          state.gymHudPinned = Boolean(state.gymHudPinned);
          state.restDurationSec = clampRestDuration(Number(state.restDurationSec));
          if (typeof state.restCustomRaw !== 'string' || !state.restCustomRaw.trim()) {
            state.restCustomRaw = formatRestClock(
              state.restUsingCustom ? state.restDurationSec : DEFAULT_CUSTOM_REST_SEC
            );
          }
          if (typeof state.restUsingCustom !== 'boolean') {
            state.restUsingCustom = false;
          }
          if (!isRestPreset(state.restDurationSec) && !state.restUsingCustom) {
            state.restUsingCustom = true;
            state.restCustomRaw = formatRestClock(state.restDurationSec);
          } else if (state.restUsingCustom) {
            const custom = applyCustomRest(state.restCustomRaw);
            if (custom !== null) {
              state.restDurationSec = custom;
            }
          }
          if (!Number.isFinite(Number(state.restRemainingSec)) || Number(state.restRemainingSec) < 0) {
            state.restRemainingSec = state.restDurationSec;
          }
          state.restRemainingSec = Math.min(Math.round(Number(state.restRemainingSec)), state.restDurationSec);
          if (state.restRunning) {
            const end = typeof state.restEndTs === 'number' ? state.restEndTs : 0;
            if (end > Date.now()) {
              state.restEndTs = end;
            } else if (end > 0) {
              state.restRunning = false;
              state.restEndTs = null;
              state.restRemainingSec = 0;
            } else {
              state.restRunning = false;
              state.restEndTs = null;
              state.restRemainingSec = state.restDurationSec;
            }
          } else {
            state.restEndTs = null;
          }
        }
      },
    }
  )
);

export function useActiveGym(): GymProfile {
  const gyms = useAppStore((state) => state.gyms);
  const activeGymId = useAppStore((state) => state.activeGymId);
  return gyms.find((gym) => gym.id === activeGymId) ?? gyms[0];
}

export function useInventory() {
  const unit = useAppStore((state) => state.unit);
  return useInventoryFor(unit);
}

export function useInventoryFor(unit: Unit) {
  const gym = useActiveGym();
  return unit === 'lb' ? gym.inventoryLb : gym.inventoryKg;
}

export function useUnitSeed(lbDefault: string, kgDefault: string) {
  const unit = useAppStore((state) => state.unit);
  const [raw, setRaw] = useState(unit === 'lb' ? lbDefault : kgDefault);
  const previous = useRef(unit);

  useEffect(() => {
    if (previous.current === unit) {
      return;
    }
    previous.current = unit;
    setRaw(unit === 'lb' ? lbDefault : kgDefault);
  }, [unit, lbDefault, kgDefault]);

  return [raw, setRaw] as const;
}

export function useVisiblePlates() {
  const unit = useAppStore((state) => state.unit);
  const inventory = useInventory();
  return platesForUnit(unit).filter((plate) => (inventory[plate.id] ?? 0) > 0);
}
