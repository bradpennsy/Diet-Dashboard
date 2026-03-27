import './styles/main.css';
import './styles/settings.css';
import './styles/grid.css';
import { loadConfig, saveConfig, isFirstRun, DEFAULTS } from './state.js';
import { fetchDashboardData } from './api.js';
import { renderSetup } from './settings/setup.js';
import { renderSettingsGearButton, renderSettingsModal, setModalConfig } from './settings/modal.js';
import { renderToday } from './ui/today.js';
import { renderScorecard } from './ui/scorecard.js';
import { renderOverviewHTML, createOverviewCharts } from './charts/overview.js';
import { renderTrendsHTML, createTrendsCharts } from './charts/trends.js';
import { initTabs } from './ui/tabs.js';
import { renderDateRangeBar, filterByRange } from './ui/daterange.js';
import { initGrid, getGridLayout, onLayoutChange } from './ui/grid.js';
import { getColors, fm, dn, todayStr, localHour, fmtTime, cumulativeAtHour, esc, HIGHER_GOOD } from './charts/factory.js';

const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function main() {
  let config = loadConfig();

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

  // Load dashboard
  try {
    const raw = await fetchDashboardData(config.apiUrl);
    render(raw, config);
  } catch (e) {
    const loader = document.getElementById('loader');
    loader.innerHTML = '<div class="err-box"><p style="color:var(--red);font-weight:700;font-size:16px;margin-bottom:8px">Failed to load</p><p style="color:var(--sub);font-size:12px;margin-bottom:12px">' + esc(e.message) + '</p><button class="rf m" onclick="location.reload()">&#8635; Retry</button></div>';
  }
}

function render(raw, config) {
  // Clean up old charts
  if (window._charts) {
    window._charts.forEach(c => c.destroy());
  }
  window._charts = [];

  const loader = document.getElementById('loader');
  const app = document.getElementById('app');
  loader.style.display = 'none';
  app.style.display = 'block';

  // Initialize date range from config or default to '14d'
  const selectedRange = config.dateRange || '14d';

  const colors = getColors();
  const today = raw.today_date || todayStr();
  const recentMeals = raw.recent_meals || raw.today_meals || [];
  const RAW = raw.daily || raw;

  // Process days data
  const allDays = RAW.map(r => ({
    date: fm(r.log_date),
    raw: r.log_date,
    day: dn(r.log_date),
    cal: +r.calories_kcal || 0,
    protein: +r.protein_g || 0,
    carbs: +r.carbs_g || 0,
    fat: +r.fat_g || 0,
    fiber: +r.fiber_g || 0,
    sodium: +r.sodium_mg || 0,
    sugar: +r.sugar_g || 0,
    ac: Math.round(+r.active_cal || 0),
    inProgress: r.log_date === today
  }));

  // Filter days by selected range (but keep today if in progress)
  const allDaysExcludingToday = allDays.filter(d => !d.inProgress);
  const filteredDays = filterByRange(allDaysExcludingToday, selectedRange);
  const days = filteredDays;
  const hasIP = allDays.some(d => d.inProgress);
  const todayData = allDays.find(d => d.inProgress);

  // Process meals
  const mealsByDate = {};
  recentMeals.forEach(m => {
    if (!mealsByDate[m.log_date]) mealsByDate[m.log_date] = [];
    mealsByDate[m.log_date].push(m);
  });
  window._mealsByDate = mealsByDate; // Make available to drill-down handlers
  const todayMeals = mealsByDate[today] || [];

  // Calculate pace metrics
  const currentHour = localHour(new Date().toISOString());
  const past7Dates = days.slice(-7).map(d => d.raw);
  const macroKeys = ['cal', 'protein', 'carbs', 'fat', 'fiber', 'sodium', 'sugar'];
  const keyMap = {
    cal: 'calories_kcal',
    protein: 'protein_g',
    carbs: 'carbs_g',
    fat: 'fat_g',
    fiber: 'fiber_g',
    sodium: 'sodium_mg',
    sugar: 'sugar_g'
  };

  const paceAtHour = {};
  macroKeys.forEach(k => paceAtHour[k] = []);
  let daysWithTimestamps = 0;

  past7Dates.forEach(ds => {
    const dm = mealsByDate[ds] || [];
    const ts = dm.map(m => m.created_at);
    if (ts.length > 1 && new Set(ts).size > 1) {
      daysWithTimestamps++;
      macroKeys.forEach(k => {
        paceAtHour[k].push(cumulativeAtHour(dm, currentHour, keyMap[k]));
      });
    }
  });

  const avgPace = {};
  macroKeys.forEach(k => {
    const v = paceAtHour[k];
    avgPace[k] = v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  });

  // Build metrics array
  const macros = [
    { k: 'protein', l: 'Protein', u: 'g', c: colors.cProtein, t: config.targets.protein },
    { k: 'carbs', l: 'Carbs', u: 'g', c: colors.cCarbs, t: config.targets.carbs },
    { k: 'fat', l: 'Fat', u: 'g', c: colors.cFat, t: config.targets.fat },
    { k: 'fiber', l: 'Fiber', u: 'g', c: colors.cFiber, t: config.targets.fiber },
    { k: 'sugar', l: 'Sugar', u: 'g', c: colors.cSugar, t: config.targets.sugar }
  ];

  const allMets = [
    { k: 'cal', l: 'Calories', u: 'kcal', c: colors.cCal, t: config.targets.calories },
    { k: 'sodium', l: 'Sodium', u: 'mg', c: colors.cSodium, t: config.targets.sodium },
    ...macros
  ];

  // Averages
  const last7 = days.slice(-7);
  const avg7 = k => last7.length ? Math.round(last7.reduce((s, d) => s + d[k], 0) / last7.length) : 0;
  const av = k => days.length ? Math.round(days.reduce((s, d) => s + d[k], 0) / days.length) : 0;

  const avgCal = av('cal');
  const avgSod = av('sodium');
  const avgFat = av('fat');
  const bSod = days.length ? Math.min(...days.map(d => d.sodium)) : 0;
  const bDay = days.find(d => d.sodium === bSod) || {};
  const uSod = days.filter(d => d.sodium <= config.targets.sodium).length;
  const uCal = days.filter(d => d.cal <= config.targets.calories).length;

  const calorieAvgDef = days.length
    ? (config.trackActiveBurn
      ? days.reduce((s, d) => s + (config.targets.calories + (d.ac || 0) - d.cal), 0) / days.length
      : days.reduce((s, d) => s + (config.targets.calories - d.cal), 0) / days.length)
    : 0;
  const avgDef = Math.round(calorieAvgDef);

  const currentTimeStr = new Date().toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const todayLabel = today ? (() => {
    const d = new Date(today + 'T12:00:00');
    return DN[d.getDay()] + ', ' + MN[d.getMonth()] + ' ' + d.getDate();
  })() : 'Today';

  // Build HTML
  let h = '';

  // Header
  h += '<div class="hdr"><div><h1 style="font-size:20px;font-weight:700">Diet Progress Dashboard</h1>';
  const dateRangeStr = allDays.length
    ? ' &middot; ' + allDays[0].date + ' – ' + allDays[allDays.length - 1].date
    : '';
  h += '<p style="color:var(--sub);margin-top:3px;font-size:12px">' + days.length + ' completed days' + (hasIP ? ' + 1 in progress' : '') + dateRangeStr + ' <span style="margin-left:6px;font-size:10px;color:' + colors.green + '">&middot; ✓ live</span></p></div>';
  h += '<div class="hdr-right" id="hdr-right"></div></div>';

  // Summary cards
  h += '<div class="cs">';
  const summaryCards = [
    { i: '🔥', l: 'Avg Cal', v: avgCal, s: uCal + '/' + days.length + ' on target', c: avgCal > config.targets.calories ? colors.accent : colors.green },
    { i: '🧂', l: 'Avg Na', v: avgSod + 'mg', s: uSod + '/' + days.length + ' under', c: avgSod > config.targets.sodium ? colors.accent : colors.green },
    { i: '📈', l: 'Avg Deficit', v: (avgDef > 0 ? '+' : '') + avgDef, s: avgDef > 0 ? 'In deficit' : 'In surplus', c: avgDef > 0 ? colors.green : colors.red },
    { i: '⭐', l: 'Best Na', v: bSod + 'mg', s: (bDay.date || '') + ' (' + (bDay.day || '') + ')', c: colors.green }
  ];
  summaryCards.forEach(c => {
    h += '<div class="c"><p class="l m">' + c.i + ' ' + c.l + '</p><p class="v m" style="color:' + c.c + '">' + c.v + '</p><p class="s">' + c.s + '</p></div>';
  });
  h += '</div>';

  // Date range filter
  h += renderDateRangeBar(selectedRange);

  // Tab buttons
  h += '<div class="ts">';
  [{ k: 'today', l: 'Today' }, { k: 'overview', l: 'Overview' }, { k: 'trends', l: 'Trends' }, { k: 'scorecard', l: 'Scorecard' }].forEach(v => {
    h += '<button class="t' + (window._activeTab === v.k ? ' a' : '') + '" data-v="' + v.k + '">'+v.l+'</button>';
  });
  h += '</div>';

  // View HTML
  const todayViewData = {
    todayData,
    todayMeals,
    allMets,
    currentHour,
    daysWithTimestamps,
    avgPace,
    avg7,
    currentTimeStr,
    todayLabel,
    hasPace: daysWithTimestamps >= 2,
    colors
  };
  h += renderToday(todayViewData, config);

  const overviewData = {
    allDays,
    days,
    macros,
    colors
  };
  h += renderOverviewHTML(overviewData, config);

  const trendsData = {
    days,
    macros,
    colors
  };
  h += renderTrendsHTML(trendsData, config);

  const scorecardData = {
    days,
    allMets,
    colors,
    bSod,
    bDay,
    uSod,
    avgCal,
    avgDef,
    avgFat
  };
  h += renderScorecard(scorecardData, config);

  app.innerHTML = h;

  // Wire date range filter buttons
  document.querySelectorAll('[data-range]').forEach(btn => {
    btn.addEventListener('click', () => {
      config.dateRange = btn.dataset.range;
      saveConfig(config);
      render(raw, config);
    });
  });

  // Add settings gear button with event listener
  const hdrRight = document.getElementById('hdr-right');
  if (hdrRight) {
    hdrRight.appendChild(renderSettingsGearButton());
  }

  // Create charts
  window._charts = [];
  window._charts.push(...createOverviewCharts(overviewData, config));
  window._charts.push(...createTrendsCharts(trendsData, config));

  // Initialize tabs
  initTabs();

  // Inject settings modal
  const modalElement = renderSettingsModal();
  app.appendChild(modalElement);
  setModalConfig(config);

  // Set default active tab
  if (!window._activeTab) {
    window._activeTab = 'today';
    document.querySelector('[data-v="today"]').classList.add('a');
    document.getElementById('vw-today').classList.add('a');
  }

  // Initialize grid for overview and trends tabs
  const initializeGrid = (tabName) => {
    // Destroy old grid
    if (window._grid) {
      window._grid.destroy(false);
      window._grid = null;
    }

    if (window._gridResizeObserver) {
      window._gridResizeObserver.disconnect();
      window._gridResizeObserver = null;
    }

    // Only initialize grid for overview and trends
    if (tabName === 'overview' || tabName === 'trends') {
      const viewEl = document.getElementById('vw-' + tabName);
      if (viewEl) {
        const savedLayout = config.gridLayout?.[tabName];
        window._grid = initGrid(viewEl, tabName, savedLayout);

        if (window._grid) {
          // Save layout changes
          onLayoutChange(window._grid, (layout) => {
            if (!config.gridLayout) config.gridLayout = {};
            config.gridLayout[tabName] = layout;
            saveConfig(config);
          });

          // Add ResizeObserver to redraw charts on grid resize
          window._gridResizeObserver = new ResizeObserver(() => {
            window._charts.forEach(c => c.resize());
          });
          viewEl.querySelectorAll('canvas').forEach(canvas => {
            window._gridResizeObserver.observe(canvas.parentElement);
          });
        }
      }
    }
  };

  // Initialize grid for current tab
  initializeGrid(window._activeTab);

  // Re-initialize grid on tab change
  document.querySelectorAll('[data-v]').forEach(btn => {
    btn.addEventListener('click', () => {
      const newTab = btn.getAttribute('data-v');
      if (newTab !== window._activeTab) {
        window._activeTab = newTab;
        initializeGrid(newTab);
      }
    });
  });
}

main();
