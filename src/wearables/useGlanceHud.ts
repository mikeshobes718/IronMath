import { useMemo } from 'react';
import { barWeight, buildGlanceHud, collarWeight, type GlanceHud } from '../engine';
import { useActiveGym, useAppStore, useInventory } from '../store/useAppStore';

export function useGlanceHud(): GlanceHud {
  const loadTargetRaw = useAppStore((state) => state.loadTargetRaw);
  const loadInputUnit = useAppStore((state) => state.loadInputUnit);
  const gymUnit = useAppStore((state) => state.unit);
  const barId = useAppStore((state) => state.barId);
  const customBar = useAppStore((state) => state.customBar);
  const collarId = useAppStore((state) => state.collarId);
  const rounding = useAppStore((state) => state.rounding);
  const convertRaw = useAppStore((state) => state.convertRaw);
  const convertFrom = useAppStore((state) => state.convertFrom);
  const inventory = useInventory();
  const gym = useActiveGym();
  const bar = barWeight(barId, gymUnit, customBar);
  const collars = collarWeight(collarId, gymUnit);

  return useMemo(
    () =>
      buildGlanceHud({
        targetRaw: loadTargetRaw,
        inputUnit: loadInputUnit,
        gymUnit,
        bar,
        collars,
        inventory,
        rounding,
        convertRaw,
        convertFrom,
      }),
    [loadTargetRaw, loadInputUnit, gymUnit, bar, collars, inventory, rounding, convertRaw, convertFrom, gym.id]
  );
}
