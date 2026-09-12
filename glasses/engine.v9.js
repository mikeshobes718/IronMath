"use strict";
var IronMath = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/wearables/glassesMath.ts
  var glassesMath_exports = {};
  __export(glassesMath_exports, {
    hudFromSearch: () => hudFromSearch2,
    parseGlassesSearch: () => parseGlassesSearch,
    warmupLine: () => warmupLine
  });

  // src/engine/units.ts
  var KG_PER_LB = 0.45359237;
  var LB_PER_KG = 2.2046226218;
  function toHundredths(value) {
    return Math.round(value * 100);
  }
  function lbToKg(lb) {
    return lb * KG_PER_LB;
  }
  function kgToLb(kg) {
    return kg * LB_PER_KG;
  }
  function convertWeight(value, from, to) {
    if (from === to) {
      return value;
    }
    return from === "lb" ? lbToKg(value) : kgToLb(value);
  }
  function roundTo(value, places) {
    const factor = 10 ** places;
    return Math.round(value * factor) / factor;
  }
  function formatWeight(value, unit, places = 1) {
    const rounded = roundTo(value, places);
    const text = places === 0 ? String(Math.round(rounded)) : rounded.toFixed(places);
    const trimmed = places === 0 ? text : text.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
    return `${trimmed} ${unit === "lb" ? "LB" : "KG"}`;
  }
  function parseKeypad(raw) {
    if (!raw || raw === "." || raw === "-") {
      return 0;
    }
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  }

  // src/engine/catalog.ts
  var LB_PLATES = [
    { id: "lb-55", unit: "lb", weight: 55, kind: "main" },
    { id: "lb-45", unit: "lb", weight: 45, kind: "main" },
    { id: "lb-35", unit: "lb", weight: 35, kind: "main" },
    { id: "lb-25", unit: "lb", weight: 25, kind: "main" },
    { id: "lb-10", unit: "lb", weight: 10, kind: "main" },
    { id: "lb-5", unit: "lb", weight: 5, kind: "change" },
    { id: "lb-2.5", unit: "lb", weight: 2.5, kind: "change" },
    { id: "lb-1.25", unit: "lb", weight: 1.25, kind: "micro" },
    { id: "lb-1", unit: "lb", weight: 1, kind: "micro" },
    { id: "lb-0.75", unit: "lb", weight: 0.75, kind: "micro" },
    { id: "lb-0.5", unit: "lb", weight: 0.5, kind: "micro" },
    { id: "lb-0.25", unit: "lb", weight: 0.25, kind: "micro" }
  ];
  var KG_PLATES = [
    { id: "kg-25", unit: "kg", weight: 25, kind: "main" },
    { id: "kg-20", unit: "kg", weight: 20, kind: "main" },
    { id: "kg-15", unit: "kg", weight: 15, kind: "main" },
    { id: "kg-10", unit: "kg", weight: 10, kind: "main" },
    { id: "kg-5", unit: "kg", weight: 5, kind: "change" },
    { id: "kg-2.5", unit: "kg", weight: 2.5, kind: "change" },
    { id: "kg-1.25", unit: "kg", weight: 1.25, kind: "micro" },
    { id: "kg-1", unit: "kg", weight: 1, kind: "micro" },
    { id: "kg-0.5", unit: "kg", weight: 0.5, kind: "micro" },
    { id: "kg-0.25", unit: "kg", weight: 0.25, kind: "micro" }
  ];
  var ALL_PLATES = [...LB_PLATES, ...KG_PLATES];
  function platesForUnit(unit) {
    return unit === "lb" ? LB_PLATES : KG_PLATES;
  }
  function plateById(id) {
    return ALL_PLATES.find((plate) => plate.id === id);
  }

  // src/engine/defaults.ts
  function fill(ids, values, fallback) {
    const counts = {};
    for (const id of ids) {
      counts[id] = values[id] ?? fallback;
    }
    return counts;
  }
  var LB_IDS = LB_PLATES.map((plate) => plate.id);
  var KG_IDS = KG_PLATES.map((plate) => plate.id);
  function commercialGym() {
    return {
      id: "commercial",
      name: "Commercial Gym",
      kind: "commercial",
      collarId: "clips",
      inventoryLb: fill(LB_IDS, {
        "lb-55": 2,
        "lb-45": 99,
        "lb-35": 2,
        "lb-25": 2,
        "lb-10": 4,
        "lb-5": 2,
        "lb-2.5": 2,
        "lb-1.25": 0,
        "lb-1": 0,
        "lb-0.75": 0,
        "lb-0.5": 0,
        "lb-0.25": 0
      }, 0),
      inventoryKg: fill(KG_IDS, {
        "kg-25": 99,
        "kg-20": 4,
        "kg-15": 2,
        "kg-10": 2,
        "kg-5": 2,
        "kg-2.5": 2,
        "kg-1.25": 1,
        "kg-1": 0,
        "kg-0.5": 0,
        "kg-0.25": 0
      }, 0)
    };
  }

  // src/engine/solve.ts
  function emptySolution(target, bar, collars, unit) {
    const loaded = bar + collars;
    return {
      target,
      loaded,
      bar,
      collars,
      perSleeve: 0,
      plates: [],
      exact: Math.abs(loaded - target) < 1e-3,
      delta: loaded - target,
      unit
    };
  }
  function solveLoad(input) {
    const { target, bar, collars, unit, inventory } = input;
    const available = availablePlates(unit, inventory);
    const sleeveTarget = toHundredths((target - bar - collars) / 2);
    if (sleeveTarget <= 0 || available.length === 0) {
      return emptySolution(target, bar, collars, unit);
    }
    const combo = closestSleeve(sleeveTarget, available);
    return finalize(target, bar, collars, unit, combo);
  }
  function availablePlates(unit, inventory) {
    return platesForUnit(unit).map((plate) => ({ ...plate, pairs: Math.max(0, Math.floor(inventory[plate.id] ?? 0)) })).filter((plate) => plate.pairs > 0).sort((a, b) => plateRank(a) - plateRank(b));
  }
  function plateRank(spec) {
    const order = spec.unit === "lb" ? [45, 25, 10, 5, 2.5, 35, 55, 1.25, 1, 0.75, 0.5, 0.25] : [20, 25, 15, 10, 5, 2.5, 1.25, 1, 0.5, 0.25];
    const index = order.indexOf(spec.weight);
    return index === -1 ? 80 + spec.weight : index;
  }
  function closestSleeve(targetHundredths, plates) {
    const goal = Math.max(0, Math.round(targetHundredths));
    const items = [];
    for (const plate of plates) {
      const units = toHundredths(plate.weight);
      if (units <= 0) {
        continue;
      }
      const max = Math.min(plate.pairs, Math.floor(goal / units) + 1);
      for (let i = 0; i < max; i += 1) {
        items.push({ id: plate.id, units });
      }
    }
    if (items.length === 0) {
      return /* @__PURE__ */ new Map();
    }
    const heaviest = items.reduce((max, item) => Math.max(max, item.units), 0);
    const limit = goal + heaviest;
    const can = new Uint8Array(limit + 1);
    const parent = new Int32Array(limit + 1);
    const plateAt = Array.from({ length: limit + 1 }, () => null);
    can[0] = 1;
    parent.fill(-1);
    for (const item of items) {
      for (let sum = limit; sum >= item.units; sum -= 1) {
        if (can[sum] === 0 && can[sum - item.units] === 1) {
          can[sum] = 1;
          parent[sum] = sum - item.units;
          plateAt[sum] = item.id;
        }
      }
    }
    let best = 0;
    let bestDiff = goal;
    for (let sum = 0; sum <= limit; sum += 1) {
      if (can[sum] === 0) {
        continue;
      }
      const diff = Math.abs(sum - goal);
      if (diff < bestDiff || diff === bestDiff && sum <= goal && best > goal) {
        best = sum;
        bestDiff = diff;
      }
    }
    return reconstruct(best, parent, plateAt);
  }
  function reconstruct(sum, parent, plateAt) {
    const counts = /* @__PURE__ */ new Map();
    let current = sum;
    while (current > 0) {
      const id = plateAt[current];
      const prev = parent[current];
      if (!id || prev < 0) {
        break;
      }
      counts.set(id, (counts.get(id) ?? 0) + 1);
      current = prev;
    }
    return counts;
  }
  function finalize(target, bar, collars, unit, counts) {
    const plates = [];
    let sleeve = 0;
    const ordered = [...counts.entries()].sort((a, b) => {
      const left = plateById(a[0])?.weight ?? 0;
      const right = plateById(b[0])?.weight ?? 0;
      return right - left;
    });
    for (const [plateId, count] of ordered) {
      if (count <= 0) {
        continue;
      }
      const spec = plateById(plateId);
      if (!spec) {
        continue;
      }
      plates.push({ plateId, weight: spec.weight, count });
      sleeve += spec.weight * count;
    }
    const loaded = bar + collars + sleeve * 2;
    const delta = loaded - target;
    return {
      target,
      loaded,
      bar,
      collars,
      perSleeve: sleeve,
      plates,
      exact: Math.abs(delta) < 1e-3,
      delta,
      unit
    };
  }

  // src/engine/fitbod.ts
  function solveTargetLoad(input) {
    const targetGym = convertWeight(input.target, input.inputUnit, input.gymUnit);
    const solution = solveLoad({
      target: targetGym,
      bar: input.bar,
      collars: input.collars,
      unit: input.gymUnit,
      inventory: input.inventory
    });
    const loadedLb = convertWeight(solution.loaded, input.gymUnit, "lb");
    const loadedKg = convertWeight(solution.loaded, input.gymUnit, "kg");
    const loadedInput = convertWeight(solution.loaded, input.gymUnit, input.inputUnit);
    return {
      target: input.target,
      inputUnit: input.inputUnit,
      targetGym,
      gymUnit: input.gymUnit,
      solution,
      loadedLb,
      loadedKg,
      deltaInput: loadedInput - input.target
    };
  }
  function missInputCopy(delta, unit) {
    if (Math.abs(delta) < 0.05) {
      return "Exact";
    }
    const abs = Math.abs(delta);
    const text = String(Number(abs.toFixed(1)));
    const label = unit === "kg" ? "kg" : "lb";
    return delta < 0 ? `${text} ${label} light` : `${text} ${label} heavy`;
  }

  // src/engine/breakdown.ts
  function trim(value) {
    return String(Number(value.toFixed(2)));
  }
  function eachSideCopy(plates) {
    const weights = [];
    for (const item of plates) {
      const text = trim(item.weight);
      for (let i = 0; i < item.count; i += 1) {
        weights.push(text);
      }
    }
    if (weights.length === 0) {
      return "No plates on the bar yet.";
    }
    return `Each side: ${weights.join(" + ")}`;
  }

  // src/engine/warmup.ts
  var WARMUP_PERCENTS = [0, 0.4, 0.6, 0.75, 0.85, 1];

  // src/engine/glance.ts
  var GYM_STEP = 2.5;
  function buildGlanceHud(input) {
    const target = parseKeypad(input.targetRaw);
    const result = solveTargetLoad({
      target,
      inputUnit: input.inputUnit,
      gymUnit: input.gymUnit,
      bar: input.bar,
      collars: input.collars,
      inventory: input.inventory
    });
    const otherUnit = input.gymUnit === "kg" ? "lb" : "kg";
    const otherLoaded = input.gymUnit === "kg" ? result.loadedLb : result.loadedKg;
    const loadedLabel = formatWeight(result.solution.loaded, input.gymUnit, input.rounding);
    const otherLoadedLabel = formatWeight(otherLoaded, otherUnit, input.rounding);
    const eachSide = eachSideCopy(result.solution.plates);
    const miss = missInputCopy(result.deltaInput, input.inputUnit);
    const convertValue = parseKeypad(input.convertRaw);
    const convertLb = formatWeight(convertWeight(convertValue, input.convertFrom, "lb"), "lb", input.rounding);
    const convertKg = formatWeight(convertWeight(convertValue, input.convertFrom, "kg"), "kg", input.rounding);
    const targetLabel = formatWeight(target, input.inputUnit, input.rounding);
    const islandPlates = eachSide.startsWith("Each side: ") ? eachSide.slice("Each side: ".length) : eachSide;
    return {
      targetRaw: input.targetRaw,
      inputUnit: input.inputUnit,
      targetLabel,
      loadedLabel,
      otherLoadedLabel,
      eachSide,
      miss,
      exact: result.solution.exact,
      convertLb,
      convertKg,
      plates: result.solution.plates,
      lockTitle: loadedLabel,
      lockSubtitle: `${eachSide}. ${convertLb} / ${convertKg}`,
      islandTitle: loadedLabel,
      islandSubtitle: islandPlates,
      bumpStep: String(GYM_STEP)
    };
  }

  // src/wearables/glassesQuery.ts
  var GLASSES_WEB_APP_ORIGIN = "https://ironmath-glasses.vercel.app";
  function isUnit(value) {
    return value === "lb" || value === "kg";
  }
  function decodeGymInventory(raw) {
    const counts = {};
    if (!raw) {
      return counts;
    }
    for (const part of raw.split(",")) {
      const cut = part.lastIndexOf(":");
      if (cut <= 0) {
        continue;
      }
      const id = part.slice(0, cut);
      const count = Number(part.slice(cut + 1));
      if (id && Number.isFinite(count) && count > 0) {
        counts[id] = count;
      }
    }
    return counts;
  }
  var GLASSES_HUD_API = `${GLASSES_WEB_APP_ORIGIN}/api/hud`;
  function parseGlassesSearch(search) {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const gymParam = params.get("gu");
    const inputParam = params.get("iu");
    const convertParam = params.get("cf");
    const gymUnit = isUnit(gymParam) ? gymParam : "kg";
    const decoded = decodeGymInventory(params.get("inv") ?? "");
    const gym = commercialGym();
    const fallback = gymUnit === "lb" ? gym.inventoryLb : gym.inventoryKg;
    const roundingRaw = Number(params.get("r") ?? "1");
    const rounding = roundingRaw === 0 || roundingRaw === 2 ? roundingRaw : 1;
    return {
      view: params.get("view") === "convert" ? "convert" : "load",
      targetRaw: params.get("t") ?? "",
      inputUnit: isUnit(inputParam) ? inputParam : "lb",
      gymUnit,
      bar: Number(params.get("bar") ?? (gymUnit === "lb" ? 45 : 20)),
      collars: Number(params.get("col") ?? 0),
      inventory: Object.keys(decoded).length > 0 ? decoded : fallback,
      rounding,
      convertRaw: params.get("c") ?? "",
      convertFrom: isUnit(convertParam) ? convertParam : "lb"
    };
  }
  function hudFromSearch(search) {
    const input = parseGlassesSearch(search);
    return { hud: buildGlanceHud(input), view: input.view };
  }

  // src/wearables/glassesMath.ts
  function warmupLine(input) {
    const working = parseKeypad(input.targetRaw);
    if (working <= 0) {
      return "";
    }
    const parts = [];
    for (const percent of WARMUP_PERCENTS) {
      const rawTarget = percent === 0 ? input.bar + input.collars : working * percent;
      const target = Math.max(input.bar + input.collars, rawTarget);
      const solution = solveLoad({
        target,
        bar: input.bar,
        collars: input.collars,
        unit: input.gymUnit,
        inventory: input.inventory
      });
      const label = formatWeight(solution.loaded, input.gymUnit, 0).replace(/ (LB|KG)$/, "");
      if (parts[parts.length - 1] !== label) {
        parts.push(label);
      }
    }
    return parts.join(" / ");
  }
  function hudFromSearch2(search) {
    const input = parseGlassesSearch(search);
    const base = hudFromSearch(search);
    return { hud: { ...base.hud, warmup: warmupLine(input) }, view: base.view };
  }
  return __toCommonJS(glassesMath_exports);
})();
if (typeof module === 'object' && module.exports) { module.exports = IronMath; }
