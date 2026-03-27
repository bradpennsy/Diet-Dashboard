/**
 * Overview tab charts
 */

import Chart from 'chart.js/auto';
import { refLabelPlugin, refDS } from './plugins.js';
import { barColor, getColors, targetTooltip, zoomConfig, HIGHER_GOOD } from './factory.js';
import { toggleDrillDown } from './drilldown.js';

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
  h += '<div class="grid-stack">';

  // Cumulative Balance Chart - 12w x 3h
  const calorieBudget = config.targets.calories; // active burn added per-day in dayBudget below
  const cumT = days.reduce((a, d) => {
    const dayBudget = config.trackActiveBurn ? calorieBudget + (d.ac || 0) : calorieBudget;
    return a + (dayBudget - d.cal);
  }, 0);
  const cr = Math.round(cumT);
  const isDef = cr >= 0;
  const lbs = (Math.abs(cr) / 3500).toFixed(2);

  let run = 0;
  const cumD = days.map(d => {
    const dayBudget = config.trackActiveBurn ? (config.targets.calories + (d.ac || 0)) : config.targets.calories;
    run += dayBudget - d.cal;
    return { date: d.date, cum: Math.round(run) };
  });

  const mxA = Math.max(Math.abs(Math.min(...cumD.map(d => d.cum))), Math.abs(Math.max(...cumD.map(d => d.cum))), 1000);
  const gMx = Math.max(mxA, Math.abs(cr)) * 1.2;
  const gP = Math.max(5, Math.min(95, 50 + (cr / gMx) * 50));

  h += '<div class="grid-stack-item" gs-id="cumC" gs-x="0" gs-y="0" gs-w="12" gs-h="3" gs-min-w="4" gs-min-h="2">';
  h += '<div class="grid-stack-item-content">';
  h += '<span class="gs-drag-handle">⋮</span>';
  h += '<h3>Cumulative Balance <span style="font-size:9px;font-weight:400;text-transform:none;color:var(--sub)">(' + days.length + ' days)</span></h3>';
  h += '<div style="padding:0 4px 6px">';
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
  h += '<div style="margin-top:12px"><canvas id="cumC" height="100"></canvas></div>';
  h += '</div></div></div>';

  // Calories Chart - 6w x 3h
  h += '<div class="grid-stack-item" gs-id="calC" gs-x="0" gs-y="3" gs-w="6" gs-h="3" gs-min-w="4" gs-min-h="2">';
  h += '<div class="grid-stack-item-content">';
  h += '<span class="gs-drag-handle">⋮</span>';
  h += '<h3>Calories vs Burn Target</h3>';
  h += '<canvas id="calC" height="160"></canvas>';
  h += '<div class="lg"><div><div style="width:10px;height:10px;border-radius:2px;background:' + colors.green + '"></div>On target</div><div><div style="width:20px;height:10px;border-radius:2px;background:linear-gradient(90deg,' + colors.sub + ',' + colors.red + ')"></div>Over target</div><div><div style="width:14px;height:2px;background:' + colors.cBurn + '"></div>Burn</div></div>';
  h += '</div></div></div>';

  // Sodium Chart - 6w x 3h
  h += '<div class="grid-stack-item" gs-id="sodC" gs-x="6" gs-y="3" gs-w="6" gs-h="3" gs-min-w="4" gs-min-h="2">';
  h += '<div class="grid-stack-item-content">';
  h += '<span class="gs-drag-handle">⋮</span>';
  h += '<h3>Sodium vs ' + config.targets.sodium + 'mg</h3>';
  h += '<canvas id="sodC" height="160"></canvas>';
  h += '</div></div></div>';

  // Macro Charts - 4w x 3h each
  macros.forEach((mc, idx) => {
    const x = (idx % 3) * 4;
    const y = 6 + Math.floor(idx / 3) * 3;
    h += '<div class="grid-stack-item" gs-id="ov_' + mc.k + '" gs-x="' + x + '" gs-y="' + y + '" gs-w="4" gs-h="3" gs-min-w="4" gs-min-h="2">';
    h += '<div class="grid-stack-item-content">';
    h += '<span class="gs-drag-handle">⋮</span>';
    h += '<h3>' + mc.l + ' (' + mc.u + ')</h3>';
    h += '<canvas id="ov_' + mc.k + '" height="130"></canvas>';
    h += '</div></div></div>';
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
  const calorieBudget = config.targets.calories; // active burn added per-day in dayBudget below
  let run = 0;
  const cumD = days.map(d => {
    const dayBudget = config.trackActiveBurn ? (config.targets.calories + (d.ac || 0)) : config.targets.calories;
    run += dayBudget - d.cal;
    return { date: d.date, raw: d.raw, cum: Math.round(run) };
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
      onClick: (event, elements) => {
        if (!elements.length) return;
        const idx = elements[0].index;
        const dayDate = cumD[idx]?.raw ?? null;
        if (!dayDate) return;
        const meals = (window._mealsByDate || {})[dayDate] || [];
        toggleDrillDown(event.native.target.parentElement, dayDate, meals, colors);
      },
      plugins: {
        legend: { display: false },
        tooltip: targetTooltip(0, ' kcal', 'Cumulative Balance'),
        zoom: zoomConfig()
      },
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

  // Add reset zoom button for cumulative chart
  const cumChart = charts[charts.length - 1];
  const cumResetBtn = document.createElement('button');
  cumResetBtn.className = 'reset-zoom rf m';
  cumResetBtn.textContent = 'Reset Zoom';
  cumResetBtn.style.display = 'none';
  cumResetBtn.onclick = () => {
    cumChart.resetZoom();
    cumResetBtn.style.display = 'none';
  };
  document.getElementById('cumC').parentElement.appendChild(cumResetBtn);

  // Set up zoom handler for cumulative chart
  const cumZoomPlugin = cumChart.options.plugins.zoom;
  cumZoomPlugin.zoom.onZoom = ({ chart }) => {
    cumResetBtn.style.display = 'block';
  };

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
      onClick: (event, elements) => {
        if (!elements.length) return;
        const idx = elements[0].index;
        const dayDate = allDays[idx]?.raw;
        if (!dayDate) return;
        const meals = (window._mealsByDate || {})[dayDate] || [];
        toggleDrillDown(event.native.target.parentElement, dayDate, meals, colors);
      },
      plugins: {
        legend: {
          labels: {
            font: { size: 8 },
            filter: i => i.text !== 'Eaten' && !i.text.includes('kcal')
          }
        },
        tooltip: targetTooltip(config.targets.calories, ' kcal', 'Calories'),
        zoom: zoomConfig()
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

  // Add reset zoom button for calories chart
  const calChart = charts[charts.length - 1];
  const calResetBtn = document.createElement('button');
  calResetBtn.className = 'reset-zoom rf m';
  calResetBtn.textContent = 'Reset Zoom';
  calResetBtn.style.display = 'none';
  calResetBtn.onclick = () => {
    calChart.resetZoom();
    calResetBtn.style.display = 'none';
  };
  document.getElementById('calC').parentElement.appendChild(calResetBtn);

  // Set up zoom handler for calories chart
  const calZoomPlugin = calChart.options.plugins.zoom;
  calZoomPlugin.zoom.onZoom = ({ chart }) => {
    calResetBtn.style.display = 'block';
  };

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
      onClick: (event, elements) => {
        if (!elements.length) return;
        const idx = elements[0].index;
        const dayDate = allDays[idx]?.raw;
        if (!dayDate) return;
        const meals = (window._mealsByDate || {})[dayDate] || [];
        toggleDrillDown(event.native.target.parentElement, dayDate, meals, colors);
      },
      plugins: {
        legend: { display: false },
        tooltip: targetTooltip(config.targets.sodium, 'mg', 'Sodium'),
        zoom: zoomConfig()
      },
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

  // Add reset zoom button for sodium chart
  const sodChart = charts[charts.length - 1];
  const sodResetBtn = document.createElement('button');
  sodResetBtn.className = 'reset-zoom rf m';
  sodResetBtn.textContent = 'Reset Zoom';
  sodResetBtn.style.display = 'none';
  sodResetBtn.onclick = () => {
    sodChart.resetZoom();
    sodResetBtn.style.display = 'none';
  };
  document.getElementById('sodC').parentElement.appendChild(sodResetBtn);

  // Set up zoom handler for sodium chart
  const sodZoomPlugin = sodChart.options.plugins.zoom;
  sodZoomPlugin.zoom.onZoom = ({ chart }) => {
    sodResetBtn.style.display = 'block';
  };

  // Macro bars
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
        onClick: (event, elements) => {
          if (!elements.length) return;
          const idx = elements[0].index;
          const dayDate = allDays[idx]?.raw;
          if (!dayDate) return;
          const meals = (window._mealsByDate || {})[dayDate] || [];
          toggleDrillDown(event.native.target.parentElement, dayDate, meals, colors);
        },
        plugins: {
          legend: { display: false },
          tooltip: targetTooltip(mc.t, mc.u, mc.l),
          zoom: zoomConfig()
        },
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

    // Add reset zoom button for macro chart
    const macroChart = charts[charts.length - 1];
    const macroResetBtn = document.createElement('button');
    macroResetBtn.className = 'reset-zoom rf m';
    macroResetBtn.textContent = 'Reset Zoom';
    macroResetBtn.style.display = 'none';
    macroResetBtn.onclick = () => {
      macroChart.resetZoom();
      macroResetBtn.style.display = 'none';
    };
    const canvasEl = document.getElementById('ov_' + mc.k);
    canvasEl.parentElement.appendChild(macroResetBtn);

    // Set up zoom handler for macro chart
    const macroZoomPlugin = macroChart.options.plugins.zoom;
    macroZoomPlugin.zoom.onZoom = ({ chart }) => {
      macroResetBtn.style.display = 'block';
    };
  });

  return charts;
}

