# Diet Dashboard Improvements — Design Document

**Date:** 2026-03-24
**Status:** Approved

## Goals

1. Allow any user to connect their own Supabase instance
2. Guided macro questionnaire for personalized nutrient targets
3. Interactive charts with tooltips, drill-down, zoom/pan, and date range filtering
4. Draggable/resizable chart grid layout
5. Consolidated settings modal
6. Supabase setup guide for easy backend provisioning
7. Optional active calorie burn tracking

---

## 1. Project Structure & Build

Migrate from a single `index.html` to a Vite + Vanilla JS modular architecture. End users still just open a URL or HTML file — the build step is developer-only.

### Dependencies
- `chart.js` — charts
- `chartjs-plugin-zoom` — zoom/pan on charts
- `gridstack` — drag-and-resize grid layout

### File Structure
```
diet-dashboard/
├── index.html              # Shell HTML (minimal)
├── vite.config.js
├── package.json
├── src/
│   ├── main.js             # Entry point, init logic
│   ├── api.js              # Supabase fetch logic
│   ├── state.js            # localStorage read/write for all settings
│   ├── charts/
│   │   ├── factory.js      # Chart.js creation helpers, shared config
│   │   ├── overview.js     # Overview tab charts
│   │   ├── trends.js       # Trend tab charts
│   │   └── plugins.js      # Custom Chart.js plugins (refLabelPlugin, etc.)
│   ├── ui/
│   │   ├── tabs.js         # Tab switching logic
│   │   ├── today.js        # Today view rendering
│   │   ├── scorecard.js    # Scorecard view rendering
│   │   ├── grid.js         # Gridstack layout management
│   │   └── daterange.js    # Date range filter controls
│   ├── settings/
│   │   ├── modal.js        # Settings modal open/close, tabs within modal
│   │   ├── questionnaire.js # Macro questionnaire logic & formulas
│   │   └── targets.js      # Manual target editing
│   └── styles/
│       ├── main.css        # Base styles, layout
│       ├── palettes.css    # All 12 palette definitions
│       ├── settings.css    # Settings modal & questionnaire styles
│       └── grid.css        # Gridstack overrides
├── docs/
│   └── supabase-setup.md   # Supabase schema & edge function guide
├── dist/                   # Built output (deployable)
```

---

## 2. First-Run Setup & Settings

### First-Run Splash Screen
On first visit (no `dashboard-config` in localStorage), a full-screen setup flow appears:

1. **Welcome screen** — Brief intro, button to begin
2. **Supabase connection** — Text input for Edge Function URL with "Test Connection" button that validates the response format
3. **Macro questionnaire** — Step-by-step questions (see Section 3)
4. **Active calorie burn toggle** — Yes/No for whether user tracks active calories burned
5. **Palette selection** — Visual palette preview cards
6. **Done** — Summary of all settings, "Launch Dashboard" button

### Settings Modal
Gear icon in header replaces the current palette dots. Modal has tabs:

- **Connection** — Edit Supabase URL, test connection, connection status
- **Targets** — View/edit all macro targets directly (calories, protein, carbs, fat, fiber, sugar, sodium). "Retake Questionnaire" button to rerun the guided flow. Active calorie burn toggle.
- **Appearance** — Palette selector (moved from header)
- **Layout** — "Reset Layout" button to restore default chart positions/sizes

### Data Persistence
All config in localStorage as `dashboard-config`:
```json
{
  "apiUrl": "https://xyz.supabase.co/functions/v1/dashboard-data",
  "targets": {
    "calories": 2000,
    "protein": 150,
    "carbs": 200,
    "fat": 65,
    "fiber": 30,
    "sugar": 50,
    "sodium": 2300
  },
  "trackActiveBurn": true,
  "palette": "cream",
  "gridLayout": {
    "overview": [{ "id": "calC", "x": 0, "y": 0, "w": 6, "h": 2 }],
    "trends": [{ "id": "calT", "x": 0, "y": 0, "w": 12, "h": 2 }]
  },
  "dateRange": "14d"
}
```

---

## 3. Macro Questionnaire

### Questions (one per step)
1. **Sex** — Male / Female
2. **Age** — Number input
3. **Height** — Input with unit toggle (ft/in or cm)
4. **Weight** — Input with unit toggle (lbs or kg)
5. **Activity level** — Sedentary / Lightly active / Moderately active / Very active / Extra active
6. **Goal** — Lose weight / Maintain / Gain weight
7. **Dietary preference** — Balanced / High-protein / Low-carb / Keto

### Calculation Logic

**BMR** (Mifflin-St Jeor):
- Male: `10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161 + 166`
- Female: `10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161`

**TDEE** = BMR × activity multiplier:
- Sedentary: 1.2 | Light: 1.375 | Moderate: 1.55 | Very: 1.725 | Extra: 1.9

**Calorie target** based on goal:
- Lose: TDEE - 500 | Maintain: TDEE | Gain: TDEE + 300

**Macro split** based on dietary preference:

| Preference   | Protein | Carbs | Fat |
|-------------|---------|-------|-----|
| Balanced     | 30%     | 40%   | 30% |
| High-protein | 40%     | 30%   | 30% |
| Low-carb     | 30%     | 20%   | 50% |
| Keto         | 25%     | 5%    | 70% |

Conversion: protein & carbs = 4 cal/g, fat = 9 cal/g.

**Remaining targets** (fixed defaults):
- Fiber: 30g | Sugar: 50g | Sodium: 2300mg

### UX
- Progress bar at top showing current step
- Back/Next buttons on each step
- Final step shows summary card of all calculated targets with option to adjust before confirming

---

## 4. Interactive Charts

### Enhanced Tooltips
On hover, tooltips show:
- Day's value for the nutrient
- % of target (e.g., "1850 kcal — 92% of 2000 target")
- Delta from target (e.g., "-150 kcal under")

### Click-to-Drill-Down
Clicking a bar/point expands a detail panel below the chart showing:
- All meals logged that day, grouped by meal type
- Per-meal macro breakdown
- Uses `recent_meals` data from the API

### Zoom & Pan
Using `chartjs-plugin-zoom`:
- Scroll to zoom (mouse wheel / pinch on mobile)
- Drag to pan when zoomed
- Reset zoom button appears in chart top-right when zoomed
- X-axis (time) only — Y-axis auto-scales

### Date Range Filter
Filter bar above chart tabs with pill buttons:
- **7d | 14d (default) | 30d | 90d | All**
- Applies globally across Overview and Trends tabs
- Filters data client-side from full API response
- Selected range persisted to localStorage

---

## 5. Draggable Grid Layout

### Grid System
Using `gridstack.js` with 12-column grid:
- Drag handle (grip icon) in top-left of each chart
- Minimum size: 4 columns wide, 2 rows tall
- Chart.js redraws on resize

### Default Layouts
- **Overview:** Cumulative balance full-width top, nutrient bar charts in 3-column grid below
- **Trends:** Calorie trend full-width, remaining trends in 2-column pairs

### Persistence
- Grid positions/sizes saved to localStorage per tab on drag/resize completion
- "Reset Layout" in settings restores defaults

### Mobile Behavior (< 768px)
- Grid collapses to single-column stack
- Drag-and-resize disabled
- Always uses stacked default layout

### Non-Grid Tabs
Today and Scorecard tabs keep their current fixed layouts.

---

## 6. Active Calorie Burn Toggle

Stored as `trackActiveBurn` in config (default: true).

**When disabled:**
- Burn target line hidden on Calories chart (becomes intake-only)
- Cumulative balance uses calorie target only (no burn offset)
- Burn-related labels/metrics hidden in Today and Scorecard views
- `active_cal` field from API is ignored

**When enabled:** Current behavior — burn data displayed and factored into calculations.

---

## 7. Supabase Setup Guide

A file at `docs/supabase-setup.md` designed to be copy-pasted to Claude or any LLM for backend provisioning. Contents:

- Full SQL `CREATE TABLE` statements for required tables
- Recommended Row-Level Security policies
- Complete Edge Function TypeScript code for `dashboard-data`
- JSON schema documenting the expected `{ daily, recent_meals, today_date }` response
- Deployment steps for Supabase CLI or dashboard UI

The setup screen's Connection step references this guide.

---

## 8. Migration & Backwards Compatibility

- If `dashboard-palette` exists in localStorage (old format), migrate to `dashboard-config.palette` and delete old key
- Hardcoded API URL removed — first-run setup appears if no config exists
- No Supabase data migration needed — all data lives server-side
- Edge Function response contract unchanged
