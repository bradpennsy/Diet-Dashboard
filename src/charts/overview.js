/**
 * Overview tab charts
 */

import Chart from 'chart.js/auto';
import { refLabelPlugin, refDS } from './plugins.js';
import { barColor, getColors } from './factory.js';

/**
 * Render Overview tab HTML
 * @param {Object} data - Processed data
 * @param {Object} config - Dashboard config
 * @returns {string} HTML
 */
export function renderOverviewHTML(data, config) {
  const { allDays, days, macros } = data;
  const colors = getColors();

  let h = '';
  h += '<div class="vw a" id="vw-overview">';
  h += '<div class="sec"><h3>Cumulative Balance <span style="font-size:9px;font-weight:400;text-transform:none;color:var(--sub)">(' + days.length + ' days)</span></h3><div style="padding:0 4px 6px">';

  const calorieBudget = config.trackActiveBurn ? config.targets.calories : config.targets.calories;
  const cumT = days.reduce((a, d) => {
    const dayBudget = config.trackActiveBurn ? calorieBudget + (d.ac || 0) : calorieBudget;
    return a + (dayBudget - d.cal);
  }, 0);
  const cr = Math.round(cumT);
  const isDef = cr >= 0;
  const lbs = (Math.abs(cr) / 3500).toFixed(2);

  // Calculate gauge position
  let run = 0;
  const cumD = days.map(d => {
    const dayBudget = config.trackActiveBurn ? (config.targets.calories + (d.ac || 0)) : config.targets.calories;
    run += dayBudget - d.cal;
    return { date: d.date, cum: Math.round(run) };
  });

  const mxA = Math.max(Math.abs(Math.min(...cumD.map(d => d.cum))), Math.abs(Math.max(...cumD.map(d => d.cum))), 1000);
  const gMx = Math.max(mxA, Math.abs(cr)) * 1.2;
  const gP = Math.max(5, Math.min(95, 50 + (cr / gMx) * 50));

  h += '<div style="text-align:center;margin-bottom:12px"><p class="m" style="font-size:26px;font-weight:700;color:' + (isDef ? colors.green : colors.red) + '">' + (isDef ? '−' : '+') + Math.abs(cr).toLocaleString() + ' kcal</p>';
  h += '<p style="margin-top:3px;font-size:12px;color:var(--sub)">' + (isDef ? 'deficit' : 'surplus') + ' &middot; ≈ ' + lbs + ' lb</p></div>';
  h += '<div class="gb"><div class="gc"></div>';
  if (isDef) {
    h += '<div class="gf" style="left:50%;width:' + (gP - 50) + '%;border-radius:0 12px 12px 0;background:linear-gradient(90deg,' + colors.green + '90,' + colors.green + ')"></div>';
  } else {
    h += '<div class="gf" style="right:50%;width:' + (50 - gP) + '%;border-radius:12px 0 0 12px;background:linear-gradient(270deg,' + colors.red + '90,' + colors.red + ')"></div>';
  }
  h += '<div class="gd" style="left:' + gP + '%;background:' + (isDef ? colors.green : colors.red) + '"></div></div>';
  h += '<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--sub);padding:0 4px" class="m"><span>← surplus</span><span>0</span><span>deficit →</span></div>';
  h += '<div style="margin-top:12px"><canvas id="cumC" height="100"></canvas></div></div></div>';

  h += '<div class="row2"><div class="sec"><h3>Calories vs Burn Target</h3><canvas id="calC" height="160"></canvas>';
  h += '<div class="lg"><div><div style="width:10px;height:10px;border-radius:2px;background:' + colors.green + '"></div>On target</div><div><div style="width:20px;height:10px;border-radius:2px;background:linear-gradient(90deg,' + colors.sub + ',' + colors.red + ')"></div>Over target</div><div><div style="width:14px;height:2px;background:' + colors.cBurn + '"></div>Burn</div></div></div>';
  h += '<div class="sec"><h3>Sodium vs ' + config.targets.sodium + 'mg</h3><canvas id="sodC" height="160"></canvas></div></div>';

  h += '<div class="row3">';
  macros.forEach(mc => {
    h += '<div class="sec"><h3>' + mc.l + ' (' + mc.u + ')</h3><canvas id="ov_' + mc.k + '" height="130"></canvas></div>';
  });
  h += '</div></div>';

  return h;
}

/**
 * Create Overview charts
 * @param {Object} data - Processed data
 * @param {Object} config - Dashboard config
 * @returns {Array} Array of Chart instances
 */
export function createOverviewCharts(data, config) {
  const { allDays, days, macros, colors } = data;
  const charts = [];

  // Grid options
  const gO = { color: colors.border + '80' };

  // Cumulative balance chart
  const calorieBudget = config.trackActiveBurn ? config.targets.calories : config.targets.calories;
  let run = 0;
  const cumD = days.map(d => {
    const dayBudget = config.trackActiveBurn ? (config.targets.calories + (d.ac || 0)) : config.targets.calories;
    run += dayBudget - d.cal;
    return { date: d.date, cum: Math.round(run) };
  });
  const cr = cumD.length ? cumD[cumD.length - 1].cum : 0;
  const isDef = cr >= 0;

  charts.push(new Chart(document.getElementById('cumC'), {
    type: 'line',
    data: {
      labels: cumD.map(d => d.date),
      datasets: [
        {
          data: cumD.map(d => d.cum),
          borderColor: isDef ? colors.green : colors.red,
          backgroundColor: (isDef ? colors.green : colors.red) + '30',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colors.sub, maxTicksLimit: 10 }
        },
        y: {
          grid: gO,
          ticks: { color: colors.sub, callback: v => v.toLocaleString() }
        }
      }
    }
  }));

  // Calories vs burn
  const calLabels = allDays.map(d => d.date);
  const ce = allDays.map(d => d.cal);
  const ct = allDays.map(d => config.trackActiveBurn ? config.targets.calories + (d.ac || 0) : config.targets.calories);

  charts.push(new Chart(document.getElementById('calC'), {
    type: 'bar',
    data: {
      labels: calLabels,
      datasets: [
        {
          label: 'Eaten',
          data: ce,
          backgroundColor: allDays.map((d, i) => d.inProgress ? colors.gray + '70' : barColor(ce[i], ct[i], false)),
          borderRadius: 3,
          barPercentage: 0.7,
          order: 2
        },
        {
          label: 'Burn target',
          data: ct,
          type: 'line',
          borderColor: colors.cBurn,
          backgroundColor: 'transparent',
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.1,
          order: 1
        },
        refDS(calLabels, config.targets.calories, config.targets.calories.toLocaleString() + ' kcal', colors.sub)
      ]
    },
    plugins: [refLabelPlugin],
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            font: { size: 8 },
            filter: i => i.text !== 'Eaten' && !i.text.includes('kcal')
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colors.sub, maxTicksLimit: 10 }
        },
        y: {
          min: 0,
          suggestedMax: Math.max(...ct) * 1.1,
          grid: gO,
          ticks: { color: colors.sub }
        }
      }
    }
  }));

  // Sodium
  const sodLabels = allDays.map(d => d.date);
  charts.push(new Chart(document.getElementById('sodC'), {
    type: 'bar',
    data: {
      labels: sodLabels,
      datasets: [
        {
          label: 'Sodium',
          data: allDays.map(d => d.sodium),
          backgroundColor: allDays.map(d => d.inProgress ? colors.gray + '70' : barColor(d.sodium, config.targets.sodium, false)),
          borderRadius: 3,
          barPercentage: 0.7,
          order: 1
        },
        refDS(sodLabels, config.targets.sodium, config.targets.sodium.toLocaleString() + 'mg', colors.sub)
      ]
    },
    plugins: [refLabelPlugin],
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colors.sub, maxTicksLimit: 10 }
        },
        y: {
          min: 0,
          suggestedMax: config.targets.sodium * 1.15,
          grid: gO,
          ticks: { color: colors.sub }
        }
      }
    }
  }));

  // Macro bars
  const HIGHER_GOOD = new Set(['protein', 'fiber']);
  macros.forEach(mc => {
    const hg = HIGHER_GOOD.has(mc.k);
    const mLabels = allDays.map(d => d.date);
    charts.push(new Chart(document.getElementById('ov_' + mc.k), {
      type: 'bar',
      data: {
        labels: mLabels,
        datasets: [
          {
            label: mc.l,
            data: allDays.map(d => d[mc.k]),
            backgroundColor: allDays.map(d => d.inProgress ? colors.gray + '70' : barColor(d[mc.k], mc.t, hg)),
            borderRadius: 2,
            barPercentage: 0.7,
            order: 1
          },
          refDS(mLabels, mc.t, mc.t + mc.u, colors.sub)
        ]
      },
      plugins: [refLabelPlugin],
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.sub, maxTicksLimit: 8 }
          },
          y: {
            min: 0,
            suggestedMax: Math.round(mc.t * 1.3),
            grid: gO,
            ticks: { color: colors.sub }
          }
        }
      }
    }));
  });

  return charts;
}
