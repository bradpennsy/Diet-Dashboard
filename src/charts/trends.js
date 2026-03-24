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
