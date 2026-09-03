# IronMath

Offline-first barbell plate calculator for iPhone and Android. Imperial (LB) is the default. A 45 lb Olympic bar is pre-selected.

## Tabs

- **Load**: target weight to sleeve solution, dual LB/KG readout, bar and collar presets
- **Reverse**: tap plates onto an empty sleeve and read the live total
- **Warm-Up**: 6-set ramp with keep / strip / add hints
- **Tools**: 1RM, RPE/RIR, DOTS + IPF GL, meet attempts, LB/KG converter
- **Settings**: gym profiles, pair inventory, haptics, bumper vs black iron

## Run

```
npm start
```

Open in Expo Go (SDK 54) or `npm run ios` / `npm run web`.

```
npm test
```

Math lives in `src/engine` and is covered by Vitest. Preferences persist locally with Zustand + AsyncStorage.
