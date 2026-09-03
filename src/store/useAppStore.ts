import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  BAR_PRESETS,
  defaultGyms,
  platesForUnit,
  type CollarId,
  type GymProfile,
  type PlateTheme,
  type Rounding,
  type Unit,
} from '../engine';

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
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      unit: 'lb',
      barId: 'oly',
      customBar: 45,
      collarId: 'none',
      plateTheme: 'bumper',
      rounding: 1,
      hapticsEnabled: true,
      audioEnabled: true,
      activeGymId: 'commercial',
      gyms: defaultGyms(),
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
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
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
  const gym = useActiveGym();
  return unit === 'lb' ? gym.inventoryLb : gym.inventoryKg;
}

export function useVisiblePlates() {
  const unit = useAppStore((state) => state.unit);
  const inventory = useInventory();
  return platesForUnit(unit).filter((plate) => (inventory[plate.id] ?? 0) > 0);
}
