/**
 * Trends tab charts
 */

import Chart from 'chart.js/auto';
import { refLabelPlugin, refDS } from './plugins.js';
import { getColors, targetTooltip, zoomConfig, HIGHER_GOOD } from './factory.js';
import { toggleDrillDown } from './drilldown.js';

/**
 * Render Trends tab HTML
 * @param {Object} data - Processed data
 * @param {Object} config - Dashboard config
 * @returns {string} HTML
 */
export function renderTrendsHTML(data, config) {
  const { days, macros } = data;

  let h = '';
  h += '<div class="vw a" id="vw-trends"><div class="grid-stack">';

  // Calorie trend (x:0, y:0, w:12, h:3) — full-width per spec
  h += '<div class="grid-stack-item" gs-id="calT" gs-x="0" gs-y="0" gs-w="12" gs-h="3" gs-min-w="4" gs-min-h="2"><div class="grid-stack-item-content"><span class="gs-drag-handle">⋮</span><h3>Calorie Trend</h3><canvas id="calT" height="160"></canvas></div></div>';

  // Sodium trend (x:0, y:3, w:6, h:3) — first of 2-column pairs
  h += '<div class="grid-stack-item" gs-id="sodT" gs-x="0" gs-y="3" gs-w="6" gs-h="3" gs-min-w="4" gs-min-h="2"><div class="grid-stack-item-content"><span class="gs-drag-handle">⋮</span><h3>Sodium Trend</h3><canvas id="sodT" height="160"></canvas></div></div>';

  // Macro trends — 2-column pairs
  const positions = [
    { x: 6, y: 3 },
    { x: 0, y: 6 },
    { x: 6, y: 6 },
    { x: 0, y: 9 },
    { x: 6, y: 9 }
  ];
  macros.forEach((mc, idx) => {
    const pos = positions[idx];
    h += '<div class="grid-stack-item" gs-id="tr_' + mc.k + '" gs-x="' + pos.x + '" gs-y="' + pos.y + '" gs-w="6" gs-h="3" gs-min-w="3" gs-min-h="2"><div class="grid-stack-item-content"><span class="gs-drag-handle">⋮</span><h3>' + mc.l + '</h3><canvas id="tr_' + mc.k + '" height="160"></canvas></div></div>';
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
          tooltip: ry ? targetTooltip(ry, u, metricName) : {},
          zoom: zoomConfig()
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

    // Add reset zoom button for trend chart
    const chartInstance = charts[charts.length - 1];
    const resetBtn = document.createElement('button');
    resetBtn.className = 'reset-zoom rf m';
    resetBtn.textContent = 'Reset Zoom';
    resetBtn.style.display = 'none';
    resetBtn.onclick = () => {
      chartInstance.resetZoom();
      resetBtn.style.display = 'none';
    };
    const canvasEl = document.getElementById(id);
    canvasEl.parentElement.appendChild(resetBtn);

    // Set up zoom handler for trend chart
    const zoomPluginInstance = chartInstance.options.plugins.zoom;
    zoomPluginInstance.zoom.onZoom = ({ chart }) => {
      resetBtn.style.display = 'block';
    };
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

