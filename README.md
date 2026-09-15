# IronMath

Offline-first barbell plate calculator and set log for iPhone and Android. Imperial (LB) is the default. A 45 lb Olympic bar is pre-selected.

## Tabs

- **Load**: target weight to sleeve solution, dual LB/KG readout, +/- 2.5 steppers, the next loadable weight up and down, bar and collar presets, and one-tap set logging
- **Reverse**: tap plates onto an empty sleeve, read the live total, log it
- **Warm-Up**: Quick, Standard, or Thorough ramp with reps and keep / strip / add hints
- **Log**: every set you log, grouped by day, with per-lift bests, an estimated-max trend, and CSV export
- **Tools**: 1RM, RPE/RIR, percentage chart, DOTS + IPF GL, meet attempts, LB/KG converter, rest timer, gym glance
- **Settings**: gym profiles, pair inventory, rounding bias, warm-up ramp, haptics, bumper vs black iron

## Number entry

There is no persistent keypad chrome anywhere. Tapping a number slides a pad up
over the content with Clear and Done; Done, a tap outside, or a scroll sends it
away. `Numpad` also supports an `inline` mode that docks permanently, for any
screen where the pad is the primary interface rather than a transient editor.

The pad is a tinted blur rather than clear glass — without the tint, accent
glows behind it fight the key labels.

## How the solver picks plates

`solveLoad` is a subset-sum over one sleeve, stepped by the greatest common divisor of the
plates that gym actually owns. That keeps the table small enough to re-solve on every
keystroke even with quarter-pound micro plates on the rack.

When the target does not land on a loadable weight, **Rounding bias** in Settings decides:

- **Closest** (default): whichever bar is nearer. Exact ties go to the lighter one.
- **Never go over**: always round down.
- **Never come in light**: always round up, falling back to the heaviest the gym can build.

The bias applies to Load, Warm-Up, the percentage chart, and the glasses HUD.

## The set log

Log a set from Load, Reverse, or any lift screen: pick the lift, tap the reps, optionally
an RPE. IronMath calls out a personal record on the spot, saves the set, and starts your
rest timer. The Log tab groups sets by day and tracks your heaviest single and best
estimated max per lift. Everything stays on the phone; CSV export is a share sheet away.

## Run

```
npm start
```

Open in Expo Go (SDK 54) or `npm run ios` / `npm run web`.

```
npm test        # Vitest over src/engine
npm run typecheck
```

Math lives in `src/engine` and is covered by Vitest. Preferences and the set log persist
locally with Zustand + AsyncStorage.

## The lens is not a phone

`glasses/` is a separately deployed static web app for Meta Ray-Ban Display. It
carries its own prebuilt copy of the engine (`engine.v10.js`) and is not rebuilt
by `npm` scripts; `styles.v11.css` is the current HUD skin.

The lens deliberately inverts the phone's design language:

- **No accent colour.** The bronze that reads as premium on OLED is the dimmest
  thing on a see-through waveguide. The HUD is white, with green and red kept
  only for exact/miss because both sit high on the luminance scale.
- **No mid-greys.** Anything below roughly `#B0B0B0` disappears against a bright
  gym, so secondary text is white at reduced opacity instead.
- **LOAD leads, TARGET follows.** At the rack you need the answer, not the number
  you already typed. v10 had that ordering backwards.

## Privacy

IronMath is offline. It does not track you. See [PRIVACY.md](PRIVACY.md).
