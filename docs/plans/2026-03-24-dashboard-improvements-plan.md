# Diet Dashboard Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the single-file Diet Dashboard into a modular Vite app with user-configurable Supabase, a macro questionnaire, interactive charts, and a draggable grid layout.

**Architecture:** Vanilla JS + Vite build system. Chart.js for charts, chartjs-plugin-zoom for zoom/pan, gridstack.js for drag-and-resize layout. All user config persisted to localStorage as a single `dashboard-config` JSON object.

**Tech Stack:** Vite, Chart.js 4.x, chartjs-plugin-zoom, gridstack.js, vanilla JS ES modules, CSS custom properties for theming.

---

## Task 1: Scaffold Vite Project

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Modify: `index.html` (strip to shell)
- Create: `src/main.js`

**Step 1: Initialize package.json**

```bash
cd "/Users/bradpennsy/Projects/Claude Code Projects/Diet Dashboard"
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install chart.js chartjs-plugin-zoom gridstack
npm install -D vite
```

**Step 3: Create vite.config.js**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
});
```

**Step 4: Update package.json scripts**

Add to `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

**Step 5: Create minimal src/main.js**

```js
// Entry point — will be built out in subsequent tasks
console.log('Diet Dashboard loaded');
```

**Step 6: Strip index.html to Vite shell**

Replace the entire `index.html` with a minimal shell that loads `src/main.js` via `<script type="module">`. Remove all inline `<style>` and `<script>` content. Keep only:
- The `<head>` meta tags, title, and favicon
- Google Fonts link
- A `<div class="w">` with `#loader` and `#app`
- `<script type="module" src="/src/main.js"></script>`

Remove the CDN `<script src="chart.js">` tag — Chart.js will now be imported via ES modules.

**Step 7: Add dist/ and node_modules/ to .gitignore**

Append to `.gitignore`:
```
node_modules/
dist/
```

**Step 8: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts, browser shows the loader div, console logs "Diet Dashboard loaded".

**Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.js src/main.js index.html .gitignore
git commit -m "feat: scaffold Vite project structure"
```

---

## Task 2: Extract Styles into CSS Modules

**Files:**
- Create: `src/styles/main.css`
- Create: `src/styles/palettes.css`
- Modify: `src/main.js` (import CSS)

**Step 1: Create src/styles/palettes.css**

Extract all 12 palette `[data-palette="..."]` rule blocks from the original `index.html` lines 11-22 into this file. Include the `:root` defaults. Copy them exactly — do not modify any color values.

**Step 2: Create src/styles/main.css**

Extract all remaining CSS from the original `index.html` lines 24-82 (everything after the palette definitions and before `</style>`). Copy exactly.

Add at the top:
```css
@import './palettes.css';
```

**Step 3: Import CSS in main.js**

```js
import './styles/main.css';
```

**Step 4: Verify styles load**

```bash
npm run dev
```

Expected: Page renders with the loader spinner styled correctly. Palette CSS variables are applied.

**Step 5: Commit**

```bash
git add src/styles/
git commit -m "feat: extract styles into CSS modules"
```

---

## Task 3: Extract State Management

**Files:**
- Create: `src/state.js`

**Step 1: Create src/state.js**

This module manages all localStorage config. It handles reading, writing, and migrating from the old `dashboard-palette` key.

```js
const CONFIG_KEY = 'dashboard-config';
const OLD_PALETTE_KEY = 'dashboard-palette';

const DEFAULTS = {
  apiUrl: '',
  targets: {
    calories: 2000,
    protein: 75,
    carbs: 200,
    fat: 75,
    fiber: 30,
    sugar: 50,
    sodium: 2300,
  },
  trackActiveBurn: true,
  palette: 'cream',
  gridLayout: null,
  dateRange: '14d',
};

export function loadConfig() {
  const raw = localStorage.getItem(CONFIG_KEY);
  let config = raw ? JSON.parse(raw) : null;

  // Migrate old palette key
  if (!config) {
    const oldPalette = localStorage.getItem(OLD_PALETTE_KEY);
    if (oldPalette) {
      config = { ...DEFAULTS, palette: oldPalette };
      saveConfig(config);
      localStorage.removeItem(OLD_PALETTE_KEY);
      return config;
    }
    return null; // No config = first run
  }

  return { ...DEFAULTS, ...config };
}

export function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function isFirstRun() {
  return !localStorage.getItem(CONFIG_KEY) && !localStorage.getItem(OLD_PALETTE_KEY);
}

export function getTargets(config) {
  return config?.targets ?? DEFAULTS.targets;
}

export { DEFAULTS };
```

**Step 2: Commit**

```bash
git add src/state.js
git commit -m "feat: add state management module"
```

---

## Task 4: Extract API Module

**Files:**
- Create: `src/api.js`

**Step 1: Create src/api.js**

```js
export async function fetchDashboardData(apiUrl) {
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const raw = await res.json();
  if (raw.error) throw new Error(raw.error);

  // Normalize response shape
  if (Array.isArray(raw)) {
    const today = new Date();
    const todayStr = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');
    return { daily: raw, recent_meals: [], today_date: todayStr };
  }

  return raw;
}

export async function testConnection(apiUrl) {
  try {
    const data = await fetchDashboardData(apiUrl);
    // Validate shape
    if (!data.daily || !Array.isArray(data.daily)) {
      return { ok: false, error: 'Response missing "daily" array' };
    }
    if (data.daily.length > 0) {
      const first = data.daily[0];
      const required = ['log_date', 'calories_kcal', 'protein_g', 'carbs_g', 'fat_g'];
      const missing = required.filter(k => !(k in first));
      if (missing.length) {
        return { ok: false, error: 'Missing fields: ' + missing.join(', ') };
      }
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
```

**Step 2: Commit**

```bash
git add src/api.js
git commit -m "feat: add API module with connection testing"
```

---

## Task 5: Build the Questionnaire

**Files:**
- Create: `src/settings/questionnaire.js`
- Create: `src/styles/settings.css`

**Step 1: Create src/styles/settings.css**

Styles for the setup flow and settings modal. Style the multi-step questionnaire with:
- Full-screen overlay for first-run setup
- Progress bar at top (colored segments for each step)
- Card-style step containers centered on screen
- Large, tappable option buttons for multiple-choice steps (sex, activity, goal, preference)
- Number inputs with unit toggle buttons (ft/in vs cm, lbs vs kg)
- Back/Next navigation buttons at bottom
- Summary card with editable values on final step
- All using CSS variables from the palette system for theme consistency

**Step 2: Create src/settings/questionnaire.js**

This module renders a step-by-step questionnaire and returns calculated macro targets.

It must export:
- `renderQuestionnaire(container, onComplete)` — Renders the full questionnaire flow into the given DOM element. `onComplete` is called with the calculated targets object when the user finishes.

Questions (one per step, each rendered individually with Back/Next buttons):
1. Sex — two large buttons: Male / Female
2. Age — number input with +/- buttons
3. Height — input with unit toggle (ft/in fields or single cm field)
4. Weight — input with unit toggle (lbs or kg)
5. Activity level — 5 stacked buttons: Sedentary / Lightly active / Moderately active / Very active / Extra active
6. Goal — 3 buttons: Lose weight / Maintain / Gain weight
7. Dietary preference — 4 buttons: Balanced / High-protein / Low-carb / Keto

Calculation logic (runs after step 7, displayed on summary step 8):

```js
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

const MACRO_SPLITS = {
  balanced:      { protein: 0.30, carbs: 0.40, fat: 0.30 },
  'high-protein': { protein: 0.40, carbs: 0.30, fat: 0.30 },
  'low-carb':    { protein: 0.30, carbs: 0.20, fat: 0.50 },
  keto:          { protein: 0.25, carbs: 0.05, fat: 0.70 },
};

function calculateTargets(answers) {
  // Convert units to metric
  const weightKg = answers.weightUnit === 'lbs'
    ? answers.weight * 0.453592
    : answers.weight;
  const heightCm = answers.heightUnit === 'ftin'
    ? (answers.heightFt * 30.48) + (answers.heightIn * 2.54)
    : answers.heightCm;

  // BMR (Mifflin-St Jeor)
  const bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * answers.age)
    + (answers.sex === 'male' ? 5 : -161);

  // TDEE
  const tdee = bmr * ACTIVITY_MULTIPLIERS[answers.activity];

  // Calorie target
  const calorieAdjust = { lose: -500, maintain: 0, gain: 300 };
  const calories = Math.round(tdee + calorieAdjust[answers.goal]);

  // Macro split
  const split = MACRO_SPLITS[answers.preference];
  const protein = Math.round((calories * split.protein) / 4);
  const carbs = Math.round((calories * split.carbs) / 4);
  const fat = Math.round((calories * split.fat) / 9);

  return {
    calories,
    protein,
    carbs,
    fat,
    fiber: 30,
    sugar: 50,
    sodium: 2300,
  };
}
```

Summary step (step 8): Show all calculated targets in a card with editable number inputs for each value. User can adjust any value before confirming. "Confirm" button calls `onComplete(targets)`.

**Step 3: Verify questionnaire renders**

Temporarily call `renderQuestionnaire` from `main.js` into the `#app` div. Click through all steps, verify calculations match expected values for a sample input (e.g., Male, 30, 5'10", 180 lbs, Moderately active, Lose weight, Balanced → ~1,800 cal, ~135g protein, ~180g carbs, ~60g fat).

**Step 4: Commit**

```bash
git add src/settings/questionnaire.js src/styles/settings.css
git commit -m "feat: add macro questionnaire with TDEE calculation"
```

---

## Task 6: Build the First-Run Setup Flow

**Files:**
- Create: `src/settings/setup.js`
- Modify: `src/main.js`
- Modify: `src/styles/settings.css`

**Step 1: Create src/settings/setup.js**

This module orchestrates the first-run setup flow with these screens:

1. **Welcome** — Title "Set up your personal diet dashboard", brief description, "Get Started" button
2. **Connection** — Supabase Edge Function URL input, "Test Connection" button, success/error feedback. "Need to set up your Supabase backend? See docs/supabase-setup.md" note. Proceeds only on successful test.
3. **Questionnaire** — Embeds the questionnaire from Task 5
4. **Active Burn** — Toggle: "Do you track active calorie burn?" with Yes/No buttons and explanation text
5. **Palette** — Grid of palette preview cards (small colored rectangles showing bg + accent for each). Click to select, shows checkmark on selected.
6. **Done** — Summary of all settings: URL (masked), targets, burn toggle status, palette name. "Launch Dashboard" button.

Export: `renderSetup(container, onComplete)` — `onComplete` is called with the complete config object.

**Step 2: Wire setup into main.js**

```js
import './styles/main.css';
import { loadConfig, saveConfig, isFirstRun } from './state.js';
import { renderSetup } from './settings/setup.js';

function main() {
  const config = loadConfig();

  if (!config || !config.apiUrl) {
    // First run — show setup
    const app = document.getElementById('app');
    const loader = document.getElementById('loader');
    loader.style.display = 'none';
    app.style.display = 'block';
    renderSetup(app, (newConfig) => {
      saveConfig(newConfig);
      location.reload(); // Reload to start dashboard with config
    });
    return;
  }

  // Apply palette
  document.documentElement.setAttribute('data-palette', config.palette);

  // TODO: Load dashboard (Task 8+)
}

main();
```

**Step 3: Verify first-run flow**

```bash
npm run dev
```

Clear localStorage. Expected: Setup flow appears. Complete all steps. Verify config is saved to localStorage with correct shape. Page reloads and shows loader (dashboard not wired yet).

**Step 4: Commit**

```bash
git add src/settings/setup.js src/main.js src/styles/settings.css
git commit -m "feat: add first-run setup flow"
```

---

## Task 7: Build the Settings Modal

**Files:**
- Create: `src/settings/modal.js`
- Create: `src/settings/targets.js`
- Modify: `src/styles/settings.css`

**Step 1: Create src/settings/targets.js**

A simple module that renders editable number inputs for all 7 targets (calories, protein, carbs, fat, fiber, sugar, sodium).

Export: `renderTargetEditor(container, targets, onChange)` — renders inputs, calls `onChange(updatedTargets)` on any change.

**Step 2: Create src/settings/modal.js**

The settings modal with 4 tabs:

- **Connection** — Same as setup: URL input, test button, connection status
- **Targets** — Uses `renderTargetEditor` for direct editing. "Retake Questionnaire" button opens the questionnaire flow in the modal body, replacing targets on completion. Active calorie burn toggle (Yes/No).
- **Appearance** — Palette selector: grid of palette dots (same as original header dots, but larger with labels)
- **Layout** — "Reset Layout" button (clears `gridLayout` from config and reloads)

Export:
- `renderSettingsModal()` — Returns the modal DOM element
- `openSettings()` / `closeSettings()` — Show/hide the modal
- `renderSettingsGearButton()` — Returns the gear icon button element for the header

Modal behavior:
- Overlay with backdrop click to close
- Close (X) button in top-right
- Changes save to config immediately on each change
- Palette change applies live (calls `setPalette`)
- URL change requires "Test & Save" button

**Step 3: Verify settings modal**

Wire a gear button into the header. Open modal, change palette (verify live update), edit a target value, close modal, reopen (verify persistence).

**Step 4: Commit**

```bash
git add src/settings/modal.js src/settings/targets.js src/styles/settings.css
git commit -m "feat: add settings modal with tabs"
```

---

## Task 8: Extract Chart Plugins and Factory

**Files:**
- Create: `src/charts/plugins.js`
- Create: `src/charts/factory.js`

**Step 1: Create src/charts/plugins.js**

Extract the `refLabelPlugin` from the original `index.html` lines 335-351 and the `refDS` helper function from lines 354-358.

```js
export const refLabelPlugin = {
  id: 'refLabel',
  afterDatasetsDraw(chart) {
    // ... exact same logic from original
  },
};

export function refDS(labels, val, label, subColor) {
  return {
    label: label || val.toLocaleString(),
    data: Array(labels.length).fill(val),
    type: 'line',
    borderColor: subColor,
    borderDash: [6, 3],
    borderWidth: 1.5,
    pointRadius: 0,
    fill: false,
    order: 0,
    tension: 0,
    _refLabel: label || val.toLocaleString(),
  };
}
```

**Step 2: Create src/charts/factory.js**

Extract all shared chart utilities from the original:
- `hexToRGB` (line 124)
- `gradientColor` (lines 125-133)
- `paceScore` (lines 136-144)
- `barColor` (lines 150-173)
- `cv()` — get computed CSS variable (line 96)
- `getC()` — get all theme colors (lines 98-99)
- Common chart options builder function

Also extract date formatting helpers:
- `fm()` (line 93) — format date to M/D
- `dn()` (line 94) — get day name
- `todayStr()` (line 95) — get today's date string
- `localHour()` (line 120)
- `fmtTime()` (line 121)
- `cumulativeAtHour()` (line 122)

Export: `getColors`, `barColor`, `gradientColor`, `paceScore`, `hexToRGB`, `refDS`, `refLabelPlugin`, `fm`, `dn`, `todayStr`, `localHour`, `fmtTime`, `cumulativeAtHour`, `cv`

Make all target values come from config (passed as parameter) instead of being hardcoded. For example, `barColor(val, target, hg)` already takes target as a parameter — good. But `refDS(labels, 2000, '2,000 kcal')` calls in the chart code need to use `config.targets.calories` instead of `2000`.

**Step 3: Commit**

```bash
git add src/charts/plugins.js src/charts/factory.js
git commit -m "feat: extract chart plugins and factory utilities"
```

---

## Task 9: Extract Dashboard Rendering — Today & Scorecard Views

**Files:**
- Create: `src/ui/today.js`
- Create: `src/ui/scorecard.js`

**Step 1: Create src/ui/today.js**

Extract the Today view rendering from original `index.html` lines 228-285. This function takes the processed data and config and returns an HTML string.

Export: `renderToday(data, config)` — returns HTML string.

`data` is an object containing: `{ todayData, todayMeals, allMets, currentHour, daysWithTimestamps, avgPace, avg7, currentTimeStr, todayLabel, hasPace, colors }`

All hardcoded target values (75g protein, 2000 cal, etc.) must be replaced with values from `config.targets`.

When `config.trackActiveBurn` is `false`:
- In the Remaining Budget section, do not factor active calories into the calorie budget
- In Today's Insights, show deficit/surplus based on calorie target only (no `+ td.ac`), and hide the "(X active)" text
- Hide any burn-related pace metrics

**Step 2: Create src/ui/scorecard.js**

Extract the Scorecard view rendering from original lines 309-325.

Export: `renderScorecard(data, config)` — returns HTML string.

`data` is: `{ days, allMets, colors, bSod, bDay, uSod, avgCal, avgDef, avgFat }`

Replace all hardcoded targets with `config.targets`.

**Step 3: Commit**

```bash
git add src/ui/today.js src/ui/scorecard.js
git commit -m "feat: extract Today and Scorecard view renderers"
```

---

## Task 10: Extract Dashboard Rendering — Overview & Trends Charts

**Files:**
- Create: `src/charts/overview.js`
- Create: `src/charts/trends.js`

**Step 1: Create src/charts/overview.js**

Extract the Overview tab chart creation from original lines 287-301 (HTML) and 361-386 (Chart.js instantiation).

Export: `renderOverviewHTML(data, config)` — returns HTML string with canvas elements.
Export: `createOverviewCharts(data, config)` — creates and returns Chart.js instances array.

Must use `config.targets` for all reference lines and bar coloring. When `config.trackActiveBurn` is false:
- Calories chart: burn target line hidden, reference line is just the calorie target
- Cumulative balance: calculated without active calories (`2000 + (d.ac || 0)` becomes just `config.targets.calories`)

**Step 2: Create src/charts/trends.js**

Extract the Trends tab chart creation from original lines 303-306 (HTML) and 389-396 (Chart.js).

Export: `renderTrendsHTML(data, config)` — returns HTML string with canvas elements.
Export: `createTrendsCharts(data, config)` — creates and returns Chart.js instances array.

Must use `config.targets` for all reference lines.

**Step 3: Commit**

```bash
git add src/charts/overview.js src/charts/trends.js
git commit -m "feat: extract Overview and Trends chart modules"
```

---

## Task 11: Wire Up Main Render Function

**Files:**
- Modify: `src/main.js`
- Create: `src/ui/tabs.js`

**Step 1: Create src/ui/tabs.js**

Extract tab switching logic. Export: `initTabs()` — attaches click handlers, manages active tab state.

**Step 2: Update src/main.js with full render pipeline**

Wire together all extracted modules:

```js
import './styles/main.css';
import { loadConfig, saveConfig } from './state.js';
import { fetchDashboardData } from './api.js';
import { renderSetup } from './settings/setup.js';
import { renderSettingsGearButton, renderSettingsModal } from './settings/modal.js';
import { renderToday } from './ui/today.js';
import { renderScorecard } from './ui/scorecard.js';
import { renderOverviewHTML, createOverviewCharts } from './charts/overview.js';
import { renderTrendsHTML, createTrendsCharts } from './charts/trends.js';
import { initTabs } from './ui/tabs.js';
import { getColors, fm, dn, todayStr, localHour, fmtTime, cumulativeAtHour } from './charts/factory.js';

// ... full init/render logic ported from original, using modules
```

The `render()` function should:
1. Process raw API data into the `data` object (same logic as original lines 186-207)
2. Build header HTML with gear button (no more palette dots in header)
3. Build summary cards (lines 220-223)
4. Build tab buttons
5. Call each view renderer to get HTML
6. Set `app.innerHTML`
7. Create all Chart.js instances
8. Init tabs
9. Inject settings modal into DOM

All hardcoded targets replaced with `config.targets`.
All `2000 + (d.ac || 0)` calculations must check `config.trackActiveBurn`.

**Step 3: Verify full dashboard renders**

```bash
npm run dev
```

Set up config via the setup flow (or manually in localStorage). Expected: Dashboard looks identical to the original single-file version, but targets come from config and burn toggle works.

**Step 4: Commit**

```bash
git add src/main.js src/ui/tabs.js
git commit -m "feat: wire up modular render pipeline"
```

---

## Task 12: Add Date Range Filter

**Files:**
- Create: `src/ui/daterange.js`
- Modify: `src/main.js`

**Step 1: Create src/ui/daterange.js**

Export: `renderDateRangeBar(selectedRange, onChange)` — returns HTML string for a pill-button filter bar.

Ranges: `['7d', '14d', '30d', '90d', 'all']`
Default: `'14d'`

Export: `filterByRange(allDays, range)` — filters an array of day objects by date range relative to today. Returns the filtered array.

```js
export function filterByRange(allDays, range) {
  if (range === 'all') return allDays;
  const days = parseInt(range);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return allDays.filter(d => d.raw >= cutoffStr);
}
```

**Step 2: Wire into main.js**

- Render date range bar above tab buttons
- On range change: save to config, re-render charts with filtered data
- Overview and Trends views use filtered data; Today and Scorecard use full data

**Step 3: Verify date range filtering**

Click each pill. Charts should update to show only the selected range. Verify 14d is selected by default.

**Step 4: Commit**

```bash
git add src/ui/daterange.js src/main.js
git commit -m "feat: add date range filter with pill buttons"
```

---

## Task 13: Add Enhanced Tooltips

**Files:**
- Modify: `src/charts/factory.js`
- Modify: `src/charts/overview.js`
- Modify: `src/charts/trends.js`

**Step 1: Create a shared tooltip config builder in factory.js**

```js
export function targetTooltip(target, unit, metricName) {
  return {
    callbacks: {
      label(ctx) {
        const val = ctx.parsed.y;
        if (ctx.dataset._refLabel) return null; // Hide tooltip for reference lines
        const pct = Math.round((val / target) * 100);
        const delta = Math.round(val - target);
        const sign = delta >= 0 ? '+' : '';
        return [
          `${metricName}: ${val.toLocaleString()}${unit}`,
          `${pct}% of ${target.toLocaleString()}${unit} target`,
          `${sign}${delta}${unit} ${delta >= 0 ? 'over' : 'under'}`,
        ];
      },
    },
  };
}
```

**Step 2: Apply tooltip config to all charts in overview.js and trends.js**

For each chart, add the tooltip config in `options.plugins.tooltip` using the appropriate target from config.

**Step 3: Verify tooltips**

Hover over bars/points. Should see value, % of target, and delta.

**Step 4: Commit**

```bash
git add src/charts/factory.js src/charts/overview.js src/charts/trends.js
git commit -m "feat: add enhanced tooltips with target comparison"
```

---

## Task 14: Add Click-to-Drill-Down

**Files:**
- Modify: `src/charts/overview.js`
- Modify: `src/charts/trends.js`
- Modify: `src/styles/main.css`

**Step 1: Add drill-down panel rendering**

When a bar/point is clicked, expand a detail panel below the chart showing that day's meals. Use the `recent_meals` data.

Add an `onClick` handler to each chart:

```js
onClick(event, elements, chart) {
  if (!elements.length) return;
  const idx = elements[0].index;
  const dayDate = data.allDays[idx].raw;
  const meals = data.mealsByDate[dayDate] || [];
  toggleDrillDown(chart.canvas.parentElement, dayDate, meals, config);
}
```

`toggleDrillDown` function: If a drill-down panel already exists for this day below the chart, remove it (toggle off). Otherwise, create a panel showing:
- Date header
- Each meal grouped by type, with name, description, time, and macro values
- Styled like the Today view's meal cards

**Step 2: Add CSS for drill-down panel**

```css
.drill-down {
  margin-top: 8px;
  padding: 12px;
  background: var(--cream);
  border: 1px solid var(--border);
  border-radius: 8px;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 500px; }
}
```

**Step 3: Verify drill-down**

Click a bar. Panel appears below chart with that day's meals. Click again to dismiss. Click a different bar to switch.

**Step 4: Commit**

```bash
git add src/charts/overview.js src/charts/trends.js src/styles/main.css
git commit -m "feat: add click-to-drill-down meal detail panels"
```

---

## Task 15: Add Zoom and Pan

**Files:**
- Modify: `src/charts/factory.js`
- Modify: `src/charts/overview.js`
- Modify: `src/charts/trends.js`

**Step 1: Register chartjs-plugin-zoom in factory.js**

```js
import zoomPlugin from 'chartjs-plugin-zoom';
import { Chart } from 'chart.js';

Chart.register(zoomPlugin);
```

**Step 2: Create shared zoom config in factory.js**

```js
export function zoomConfig() {
  return {
    zoom: {
      wheel: { enabled: true },
      pinch: { enabled: true },
      mode: 'x',
    },
    pan: {
      enabled: true,
      mode: 'x',
    },
  };
}
```

**Step 3: Apply zoom config to all charts**

In both `overview.js` and `trends.js`, add to each chart's `options.plugins`:

```js
plugins: {
  zoom: zoomConfig(),
}
```

**Step 4: Add reset zoom button**

After each chart canvas, add a "Reset Zoom" button that is hidden by default. Show it when the chart is zoomed (listen to the zoom plugin's `onZoom` callback). On click, call `chart.resetZoom()`.

```js
// In zoom config:
zoom: {
  onZoom: ({ chart }) => {
    const btn = chart.canvas.parentElement.querySelector('.reset-zoom');
    if (btn) btn.style.display = 'block';
  },
},

// After chart creation:
const resetBtn = document.createElement('button');
resetBtn.className = 'reset-zoom rf m';
resetBtn.textContent = 'Reset Zoom';
resetBtn.style.display = 'none';
resetBtn.onclick = () => {
  chart.resetZoom();
  resetBtn.style.display = 'none';
};
chart.canvas.parentElement.appendChild(resetBtn);
```

**Step 5: Verify zoom and pan**

Scroll-wheel on a chart to zoom in. Drag to pan. Click "Reset Zoom" to restore. Verify pinch works on touch devices.

**Step 6: Commit**

```bash
git add src/charts/factory.js src/charts/overview.js src/charts/trends.js
git commit -m "feat: add zoom and pan to all charts"
```

---

## Task 16: Add Gridstack Draggable Layout

**Files:**
- Create: `src/ui/grid.js`
- Create: `src/styles/grid.css`
- Modify: `src/charts/overview.js`
- Modify: `src/charts/trends.js`
- Modify: `src/main.js`

**Step 1: Create src/styles/grid.css**

```css
@import 'gridstack/dist/gridstack.min.css';

.grid-stack {
  /* Override gridstack defaults for our theme */
}

.grid-stack-item-content {
  background: var(--card);
  border-radius: 12px;
  border: 1px solid var(--border);
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.gs-drag-handle {
  cursor: grab;
  color: var(--gray);
  font-size: 14px;
  padding: 2px 6px;
}

.gs-drag-handle:active {
  cursor: grabbing;
}

/* Mobile: disable grid, stack vertically */
@media (max-width: 768px) {
  .grid-stack > .grid-stack-item {
    width: 100% !important;
    position: relative !important;
    left: 0 !important;
  }
}
```

**Step 2: Create src/ui/grid.js**

```js
import { GridStack } from 'gridstack';

const DEFAULT_LAYOUTS = {
  overview: [
    { id: 'cumC', x: 0, y: 0, w: 12, h: 3 },
    { id: 'calC', x: 0, y: 3, w: 6, h: 3 },
    { id: 'sodC', x: 6, y: 3, w: 6, h: 3 },
    { id: 'ov_protein', x: 0, y: 6, w: 4, h: 3 },
    { id: 'ov_carbs', x: 4, y: 6, w: 4, h: 3 },
    { id: 'ov_fat', x: 8, y: 6, w: 4, h: 3 },
    { id: 'ov_fiber', x: 0, y: 9, w: 4, h: 3 },
    { id: 'ov_sugar', x: 4, y: 9, w: 4, h: 3 },
  ],
  trends: [
    { id: 'calT', x: 0, y: 0, w: 6, h: 3 },
    { id: 'sodT', x: 6, y: 0, w: 6, h: 3 },
    { id: 'tr_protein', x: 0, y: 3, w: 4, h: 3 },
    { id: 'tr_carbs', x: 4, y: 3, w: 4, h: 3 },
    { id: 'tr_fat', x: 8, y: 3, w: 4, h: 3 },
    { id: 'tr_fiber', x: 0, y: 6, w: 4, h: 3 },
    { id: 'tr_sugar', x: 4, y: 6, w: 4, h: 3 },
  ],
};

export function initGrid(containerEl, tab, savedLayout) {
  const layout = savedLayout || DEFAULT_LAYOUTS[tab];
  if (!layout) return null;

  const isMobile = window.innerWidth < 768;

  const grid = GridStack.init({
    column: 12,
    cellHeight: 80,
    minRow: 1,
    disableDrag: isMobile,
    disableResize: isMobile,
    handle: '.gs-drag-handle',
    animate: true,
    float: false,
  }, containerEl);

  return grid;
}

export function getGridLayout(grid) {
  return grid.engine.nodes.map(n => ({
    id: n.el?.querySelector('canvas')?.id || n.id,
    x: n.x, y: n.y, w: n.w, h: n.h,
  }));
}

export function onLayoutChange(grid, callback) {
  grid.on('change', () => {
    callback(getGridLayout(grid));
  });
}

export { DEFAULT_LAYOUTS };
```

**Step 3: Modify overview.js and trends.js to use grid items**

Instead of rendering charts into `.sec` divs inside `.row2`/`.row3` grids, render each chart as a gridstack item:

```html
<div class="grid-stack-item" gs-x="0" gs-y="0" gs-w="12" gs-h="3" gs-min-w="4" gs-min-h="2">
  <div class="grid-stack-item-content">
    <span class="gs-drag-handle">&#9776;</span>
    <h3>Chart Title</h3>
    <canvas id="chartId"></canvas>
  </div>
</div>
```

**Step 4: Wire grid into main.js**

After charts are created, initialize gridstack for the active tab. On layout change, save to `config.gridLayout[tab]`. On tab switch, destroy old grid and init new one.

Add a `ResizeObserver` or listen to gridstack's `resizestop` event to call `chart.resize()` on the contained Chart.js instance so charts redraw correctly after resize.

**Step 5: Verify drag and resize**

Drag a chart by its handle. Resize by dragging the edge. Verify charts redraw correctly. Reload page — layout persists. Switch tabs — each tab has its own layout.

**Step 6: Commit**

```bash
git add src/ui/grid.js src/styles/grid.css src/charts/overview.js src/charts/trends.js src/main.js
git commit -m "feat: add draggable grid layout with gridstack"
```

---

## Task 17: Write Supabase Setup Guide

**Files:**
- Create: `docs/supabase-setup.md`

**Step 1: Create docs/supabase-setup.md**

Write the complete guide. This is designed to be pasted to Claude or any LLM for backend provisioning.

Content structure:

```markdown
# Diet Dashboard — Supabase Setup Guide

> Copy this entire document and paste it to Claude (or any AI assistant) to set up your Supabase backend.

## Overview
This guide sets up the database schema and Edge Function needed for the Diet Dashboard.

## Prerequisites
- A Supabase project (create at supabase.com)
- Supabase CLI installed (optional, for Edge Function deployment)

## Database Schema

### Table: food_logs
```sql
CREATE TABLE food_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  meal_name TEXT NOT NULL,
  description TEXT,
  calories_kcal NUMERIC(7,1) NOT NULL DEFAULT 0,
  protein_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  carbs_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  fat_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  fiber_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  sodium_mg NUMERIC(7,1) NOT NULL DEFAULT 0,
  sugar_g NUMERIC(6,1) NOT NULL DEFAULT 0
);
```

### Table: active_calories
```sql
CREATE TABLE active_calories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active_cal NUMERIC(7,1) NOT NULL DEFAULT 0,
  source TEXT, -- e.g., 'apple_watch', 'fitbit', 'manual'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);
```

### Row-Level Security
```sql
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_calories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own food_logs" ON food_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own food_logs" ON food_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users see own active_calories" ON active_calories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own active_calories" ON active_calories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Indexes
```sql
CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, log_date);
CREATE INDEX idx_active_calories_user_date ON active_calories(user_id, log_date);
```

## Edge Function: dashboard-data

Create file: `supabase/functions/dashboard-data/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const today = new Date().toISOString().slice(0, 10);

  // Get daily aggregates
  const { data: daily, error: dailyErr } = await supabase
    .from("food_logs")
    .select("log_date, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g")
    .order("log_date", { ascending: true });

  if (dailyErr) {
    return new Response(JSON.stringify({ error: dailyErr.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  // Aggregate by date
  const byDate: Record<string, any> = {};
  for (const row of daily || []) {
    const d = row.log_date;
    if (!byDate[d]) {
      byDate[d] = {
        log_date: d, calories_kcal: 0, protein_g: 0, carbs_g: 0,
        fat_g: 0, fiber_g: 0, sodium_mg: 0, sugar_g: 0, active_cal: 0,
      };
    }
    byDate[d].calories_kcal += +row.calories_kcal || 0;
    byDate[d].protein_g += +row.protein_g || 0;
    byDate[d].carbs_g += +row.carbs_g || 0;
    byDate[d].fat_g += +row.fat_g || 0;
    byDate[d].fiber_g += +row.fiber_g || 0;
    byDate[d].sodium_mg += +row.sodium_mg || 0;
    byDate[d].sugar_g += +row.sugar_g || 0;
  }

  // Get active calories
  const { data: activeCals } = await supabase
    .from("active_calories")
    .select("log_date, active_cal");

  for (const row of activeCals || []) {
    if (byDate[row.log_date]) {
      byDate[row.log_date].active_cal = +row.active_cal || 0;
    }
  }

  // Get recent meals (last 14 days) for drill-down
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const cutoff = fourteenDaysAgo.toISOString().slice(0, 10);

  const { data: recentMeals } = await supabase
    .from("food_logs")
    .select("log_date, created_at, meal_type, meal_name, description, calories_kcal, protein_g, carbs_g, fat_g, sodium_mg")
    .gte("log_date", cutoff)
    .order("created_at", { ascending: true });

  const result = {
    daily: Object.values(byDate).sort((a: any, b: any) => a.log_date.localeCompare(b.log_date)),
    recent_meals: recentMeals || [],
    today_date: today,
  };

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

## Expected Response Shape

```json
{
  "daily": [
    {
      "log_date": "2026-03-01",
      "calories_kcal": 1850,
      "protein_g": 95,
      "carbs_g": 180,
      "fat_g": 62,
      "fiber_g": 28,
      "sodium_mg": 2100,
      "sugar_g": 45,
      "active_cal": 350
    }
  ],
  "recent_meals": [
    {
      "log_date": "2026-03-24",
      "created_at": "2026-03-24T12:30:00Z",
      "meal_type": "lunch",
      "meal_name": "Grilled Chicken Salad",
      "description": "Mixed greens, grilled chicken, vinaigrette",
      "calories_kcal": 450,
      "protein_g": 35,
      "carbs_g": 20,
      "fat_g": 22,
      "sodium_mg": 680
    }
  ],
  "today_date": "2026-03-24"
}
```

## Deployment

### Option A: Supabase Dashboard
1. Go to your Supabase project → SQL Editor
2. Run the CREATE TABLE and RLS statements above
3. Go to Edge Functions → Create New
4. Paste the Edge Function code
5. Deploy

### Option B: Supabase CLI
```bash
supabase init
supabase db push  # Runs migrations
supabase functions deploy dashboard-data
```

## Dashboard Connection
After deploying, your Edge Function URL will be:
`https://<your-project-id>.supabase.co/functions/v1/dashboard-data`

Enter this URL in the Diet Dashboard setup screen.
```

**Step 2: Commit**

```bash
git add docs/supabase-setup.md
git commit -m "docs: add Supabase setup guide for backend provisioning"
```

---

## Task 18: Final Integration and Polish

**Files:**
- Modify: `src/main.js`
- Modify: `src/styles/main.css`

**Step 1: Verify full flow end-to-end**

1. Clear localStorage
2. `npm run dev`
3. First-run setup appears → complete all steps
4. Dashboard loads with custom targets
5. Date range filter works
6. Charts have enhanced tooltips
7. Click-to-drill-down works
8. Zoom/pan works with reset button
9. Grid drag-and-resize works, persists on reload
10. Settings modal opens, all tabs work
11. Retake questionnaire from settings
12. Toggle active burn — verify charts/views update
13. Change palette from settings
14. Reset layout from settings

**Step 2: Production build test**

```bash
npm run build
npm run preview
```

Expected: Built dashboard works identically to dev mode.

**Step 3: Update .gitignore if needed**

Ensure `node_modules/` and `dist/` are ignored.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete dashboard improvements integration"
```

---

## Execution Notes

- **PALETTES array and HIGHER_GOOD set** must be extracted to a shared constants file or kept in `factory.js` — they're referenced by multiple modules.
- **Chart.js registration**: Chart.js auto-registers controllers in UMD builds but needs explicit registration with ES modules. Add this in `factory.js`:
  ```js
  import { Chart, registerables } from 'chart.js';
  Chart.register(...registerables);
  ```
- **CSS import order matters**: `palettes.css` must load before `main.css` to establish CSS variable defaults.
- **The `render()` function destroys and recreates all charts** (same pattern as original). This is fine for the current scale but means gridstack needs to re-init after re-render too.
