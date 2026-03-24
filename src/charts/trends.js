/**
 * Trends tab charts
 */

import Chart from 'chart.js/auto';
import { refLabelPlugin, refDS } from './plugins.js';
import { getColors, targetTooltip } from './factory.js';

/**
 * Render Trends tab HTML
 * @param {Object} data - Processed data
 * @param {Object} config - Dashboard config
 * @returns {string} HTML
 */
export function renderTrendsHTML(data, config) {
  const { days, macros } = data;

  let h = '';
  h += '<div class="vw a" id="vw-trends">';
  h += '<div class="row2"><div class="sec"><h3>Calorie Trend</h3><canvas id="calT" height="140"></canvas></div><div class="sec"><h3>Sodium Trend</h3><canvas id="sodT" height="140"></canvas></div></div>';
  h += '<div class="row3">';
  macros.forEach(mc => {
    h += '<div class="sec"><h3>' + mc.l + '</h3><canvas id="tr_' + mc.k + '" height="120"></canvas></div>';
  });
  h += '</div></div>';

  return h;
}

/**
 * Create Trends charts
 * @param {Object} data - Processed data
 * @param {Object} config - Dashboard config
 * @returns {Array} Array of Chart instances
 */
export function createTrendsCharts(data, config) {
  const { days, macros, colors } = data;
  const charts = [];

  // Grid options
  const gO = { color: colors.border + '80' };

  const HIGHER_GOOD = new Set(['protein', 'fiber']);

  // Helper function to create trend chart
  function trendChart(id, k, co, ry, hg, metricName) {
    const u = k === 'cal' ? ' kcal' : k === 'sodium' ? 'mg' : 'g';
    const tlb = days.map(d => d.date);

    const ds = [
      {
        label: 'Daily',
        data: days.map(d => d[k]),
        borderColor: co,
        backgroundColor: co + '25',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        borderWidth: 2,
        order: 1
      }
    ];

    if (ry) {
      ds.push(refDS(tlb, ry, ry.toLocaleString() + u, colors.sub));
    }

    charts.push(new Chart(document.getElementById(id), {
      type: 'line',
      data: {
        labels: tlb,
        datasets: ds
      },
      plugins: [refLabelPlugin],
      options: {
        responsive: true,
        onClick: (event, elements) => {
          if (!elements.length) return;
          const idx = elements[0].index;
          const dayDate = days[idx]?.raw;
          if (!dayDate) return;
          const meals = (window._mealsByDate || {})[dayDate] || [];
          toggleDrillDown(event.native.target.parentElement, dayDate, meals, colors);
        },
        plugins: {
          legend: { display: false },
          tooltip: ry ? targetTooltip(ry, u, metricName) : {}
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.sub, maxTicksLimit: 10 }
          },
          y: {
            suggestedMax: ry ? Math.round(ry * 1.3) : undefined,
            grid: gO,
            ticks: { color: colors.sub }
          }
        }
      }
    }));
  }

  // Calorie trend
  trendChart('calT', 'cal', colors.cCal, config.targets.calories, false, 'Calories');

  // Sodium trend
  trendChart('sodT', 'sodium', colors.cSodium, config.targets.sodium, false, 'Sodium');

  // Macro trends
  macros.forEach(mc => {
    trendChart('tr_' + mc.k, mc.k, mc.c, mc.t, HIGHER_GOOD.has(mc.k), mc.l);
  });

  return charts;
}

/**
 * Toggle drill-down panel visibility for a chart
 */
function toggleDrillDown(containerEl, dayDate, meals, colors) {
  const existing = containerEl.querySelector('.drill-down');
  if (existing) {
    existing.remove();
    return;
  }

  // Create drill-down panel
  const panel = document.createElement('div');
  panel.className = 'drill-down';

  // Format date
  const d = new Date(dayDate + 'T12:00:00');
  const dateStr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ', ' +
                  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' +
                  d.getDate();

  let html = '<div style="margin-bottom:10px"><strong style="font-size:12px">' + dateStr + '</strong></div>';

  if (meals.length === 0) {
    html += '<p style="font-size:11px;color:var(--sub)">No meals recorded</p>';
  } else {
    // Group meals by type
    const byType = {};
    meals.forEach(m => {
      const type = m.meal_type || 'other';
      if (!byType[type]) byType[type] = [];
      byType[type].push(m);
    });

    Object.entries(byType).forEach(([type, typeMeals]) => {
      typeMeals.forEach(m => {
        html += '<div class="meal-card">';
        html += '<h4 style="text-transform:capitalize">' + (m.meal_name || type) + '</h4>';
        if (m.description) html += '<div class="desc">' + m.description + '</div>';
        if (m.created_at) {
          const t = new Date(m.created_at);
          const timeStr = t.toLocaleTimeString('en-US', {timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true});
          html += '<div class="time">' + timeStr + '</div>';
        }
        html += '<div class="meal-macros">';
        if (m.calories_kcal) html += '<span style="background:' + colors.cCal + '20;color:' + colors.cCal + '">' + Math.round(m.calories_kcal) + ' kcal</span>';
        if (m.protein_g) html += '<span style="background:' + colors.cProtein + '20;color:' + colors.cProtein + '">' + Math.round(m.protein_g) + 'g P</span>';
        if (m.carbs_g) html += '<span style="background:' + colors.cCarbs + '20;color:' + colors.cCarbs + '">' + Math.round(m.carbs_g) + 'g C</span>';
        if (m.fat_g) html += '<span style="background:' + colors.cFat + '20;color:' + colors.cFat + '">' + Math.round(m.fat_g) + 'g F</span>';
        html += '</div>';
        html += '</div>';
      });
    });
  }

  panel.innerHTML = html;
  containerEl.appendChild(panel);
}
